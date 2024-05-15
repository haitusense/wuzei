use std::io::{Read, BufRead};
use crate::debug;
// use std::ops::Index;

// メモリーマップにDLL書き込みたいけどどうしたらできるやろか
// LoadLibraryAでうまくごにょごにょできんか

/******** MemoryMappedFile impl ********/
pub type MemoryMappedFileHandle = winapi::shared::ntdef::HANDLE;
pub type LPCSTR = Vec<u16>;

mod native {
  use super::*;

  pub trait NativeConvetor {
    fn to_lpcwstr(&self) -> *const u16;
  }
  impl<T> NativeConvetor for T where T : AsRef<std::ffi::OsStr> + ?Sized {
    fn to_lpcwstr(&self) -> *const u16 {
      use std::os::windows::ffi::OsStrExt;
      let path = std::ffi::OsStr::new(self).encode_wide().chain(Some(0).into_iter()).collect::<Vec<_>>();
      path.as_ptr()
    }
  }

  /*
    dwMaximumSizeHigh : DWORD = u32
    dwMaximumSizeLow  : DWORD = u32
      0, 0の場合hFileで指定したファイルのサイズと等しくなる
    c# : MemoryMappedFile.CreateNew(string, Int64);
      なんでUint64ではない？
  */

  pub unsafe fn create_file_mapping(path:&str, size:usize) -> MemoryMappedFileHandle {
    winapi::um::memoryapi::CreateFileMappingW(
      winapi::um::handleapi::INVALID_HANDLE_VALUE, 
      std::ptr::null_mut(), 
      winapi::um::winnt::PAGE_READWRITE, 
      ((size >> 32) & 0xFFFFFFFF) as u32, (size & 0xFFFFFFFF) as u32, 
      path.to_lpcwstr()
    ) as MemoryMappedFileHandle
  }

  pub unsafe fn open_file_mapping(path:&str) -> MemoryMappedFileHandle {
    winapi::um::memoryapi::OpenFileMappingW(
      winapi::um::memoryapi::FILE_MAP_ALL_ACCESS,
      0, 
      path.to_lpcwstr()
    ) as MemoryMappedFileHandle
  }

}


pub struct MemoryMappedFileCreator {
  path : String,
	handle: MemoryMappedFileHandle,
}
unsafe impl Send for MemoryMappedFileCreator {}
unsafe impl Sync for MemoryMappedFileCreator {}
impl MemoryMappedFileCreator {

  /* create */
  pub fn new(path:&str, size:usize) -> anyhow::Result<MemoryMappedFileCreator> {
    let handle = unsafe { native::create_file_mapping(path, size) };
    if handle.is_null() { anyhow::bail!("cannt create mmf {:?} {} {}", handle, &path, size); };
    debug!("mmf new {:?} {} {}", handle, path, size);
    Ok(MemoryMappedFileCreator { path: path.to_string(), handle })
  }
  
  /* open */
  pub fn open(path:&str) -> anyhow::Result<MemoryMappedFileCreator> {
    let handle = unsafe { native::open_file_mapping(path) };
    if handle.is_null() { anyhow::bail!("cannt open mmf {:?} {}", handle, &path); }
    debug!("mmf open {:?} {}", handle, path);
    Ok(MemoryMappedFileCreator { path: path.to_string(), handle })
  }

  /* resize */
  pub fn resize(&mut self, size:usize) -> anyhow::Result<()> {
    debug!("mmf close {:?}", self.handle);
    unsafe { winapi::um::handleapi::CloseHandle(self.handle); }
    let handle = unsafe { native::create_file_mapping(&self.path, size) };
    if handle.is_null() { anyhow::bail!("cannt resize mmf {:?} {} {}", handle, &self.path, size); }
    self.handle = handle;
    debug!("mmf resize {:?} {} {}", self.handle, self.path, size);
    Ok(())
  }

  pub fn get_path(&self) -> &str{ self.path.as_str() }

}
impl Drop for MemoryMappedFileCreator {
	fn drop(&mut self) {
    debug!("mmf drop {:?} {}", self.handle, self.path);
    unsafe { winapi::um::handleapi::CloseHandle(self.handle); }
	}
}


pub struct MemoryMappedFileAccessor<'a> {
  mmf: &'a mut MemoryMappedFileCreator,
  accessor : *const winapi::ctypes::c_void
}
impl<'a> MemoryMappedFileAccessor<'a> {

  /* C# : CreateViewAccessor(offset, 0) 0指定で全域指定 */
  pub fn new(mmf:&'a mut MemoryMappedFileCreator) -> anyhow::Result<MemoryMappedFileAccessor> { 
    /* open */
    let accessor = unsafe {
      winapi::um::memoryapi::MapViewOfFile(mmf.handle, winapi::um::memoryapi::FILE_MAP_ALL_ACCESS, 0, 0, 0) 
    };
    if accessor.is_null() { anyhow::bail!("cannt access mmf"); }
    debug!("accessor new {:?}", accessor);
    Ok(MemoryMappedFileAccessor { mmf, accessor })
  }
  
  pub fn info(&self) {
    // https://docs.rs/pelite/latest/src/pelite/mmap/windows.rs.html  
    // let mut mem_basic_info = mem::zeroed();
    // let vq_result = VirtualQuery(view, &mut mem_basic_info, mem::size_of_val(&mem_basic_info));
    // let bytes = ptr::slice_from_raw_parts_mut(view as *mut u8, mem_basic_info.RegionSize as usize);

    let mut info : winapi::um::winnt::MEMORY_BASIC_INFORMATION = unsafe { std::mem::zeroed() };
    let dst = unsafe { winapi::um::memoryapi::VirtualQuery(self.accessor, &mut info, std::mem::size_of::<winapi::um::winnt::MEMORY_BASIC_INFORMATION>()) };
    println!("Return value      {} fail : 0, success : default is MEMORY_BASIC_INFORMATION size = {}", dst, std::mem::size_of::<winapi::um::winnt::MEMORY_BASIC_INFORMATION>());
    println!("BaseAddress       {:?}", info.BaseAddress);
    println!("AllocationBase    {:?}", info.AllocationBase);
    println!("AllocationProtect {:?}", info.AllocationProtect);
    println!("RegionSize        {} [byte]", info.RegionSize); // 設定値とは一致しない。ページサイズがあるので4096区切り
    println!("State             {}", info.State); // 0x1000 : MEM_COMMIT, 0x10000 : MEM_FREE, 0x2000 : MEM_RESERVE
    println!("Protect           {}", info.Protect);
    println!("Type              {}", info.Type);
  }

  /* 容量を取得 C# : UnmanagedMemoryAccessor.Capacity */
  pub fn len(&self) -> usize {
    let mut info : winapi::um::winnt::MEMORY_BASIC_INFORMATION = unsafe { std::mem::zeroed() };
    let _dst = unsafe { winapi::um::memoryapi::VirtualQuery(self.accessor, &mut info, std::mem::size_of::<winapi::um::winnt::MEMORY_BASIC_INFORMATION>()) };
    info.RegionSize
    /* Fileじゃないのでこっちは使えない

      let mut large_integer: winapi::um::winnt::LARGE_INTEGER = unsafe { std::mem::zeroed() };
      let dst = unsafe { winapi::um::fileapi::GetFileSizeEx(self.handle, &mut large_integer) };

      let mut len_higher: u32 = 0;
      let len_lower = GetFileSize(file_handle, (&mut len_higher) as *mut u32);
    */
  }

}
impl<'a> Drop for MemoryMappedFileAccessor<'a> {
	fn drop(&mut self) {
    debug!("accessor drop {:?}", self.accessor);
    unsafe { winapi::um::memoryapi::UnmapViewOfFile(self.accessor); }
	}
}

// impl Index<usize> for MemoryMappedFileAccessor {
//   type Output = T;
//   fn index(&self, index:usize) -> T {
//     let dst_ptr = unsafe { (self.accessor as *const T).byte_add(index) };
//     let dst = unsafe { dst_ptr.read_unaligned() };
//     dst
//   }
// }

pub trait MemoryMappedFileCreaterExtention {
  fn to_accessor(&mut self) -> MemoryMappedFileAccessor;
}
impl MemoryMappedFileCreaterExtention for MemoryMappedFileCreator {
  fn to_accessor(&mut self) -> MemoryMappedFileAccessor {
    MemoryMappedFileAccessor::new(self).unwrap()
  }
}

/* OwnerShip : 
     len()で確保するサイズは RegionSizeで呼び出し時のサイズ 端数は切り捨て
  https://lo48576.gitlab.io/rust-custom-slice-book/introduction.html
    impl core::borrow::Borrow<MyStr> for MyString
    impl std::borrow::ToOwned for MyStr : to_owned/clone_into
    と区別する意味で、to_vec使用
*/
pub trait OwnerShip {
  fn to_slice<T>(&self) -> &[T];
  fn to_mut_slice<T>(&self) -> &mut [T];
  fn to_vec<T: Copy>(&self) -> Vec<T>;
  fn into_vec<T: Copy>(&self, target: &mut Vec<T>);
}

impl<'a> OwnerShip for MemoryMappedFileAccessor<'a> {

  #[inline]
  fn to_slice<T>(&self) -> &[T] {
    unsafe { std::slice::from_raw_parts(self.accessor as *const T, self.len() / std::mem::size_of::<T>()) }
  }

  #[inline]
  fn to_mut_slice<T>(&self) -> &mut [T] {
    unsafe { std::slice::from_raw_parts_mut(self.accessor as *mut T, self.len() / std::mem::size_of::<T>()) }
  }

  #[inline]
  fn to_vec<T: Copy>(&self) -> Vec<T> {
    self.to_slice().to_vec()
    /* ここまで書かなくても実現できる
      let ptr = unsafe { (self.accessor as *const T).byte_add(0) };
      let size = self.len() / std::mem::size_of::<T>();
      let mut dst = Vec::with_capacity(size);
      unsafe { std::ptr::copy(ptr, dst.as_mut_ptr(), dst.len()); }
      dst
    */
  }

  // 不必要な割り当てを避けるために a のリソースを再利用するようにオーバーライド
  #[inline]
  fn into_vec<T: Copy>(&self, target: &mut Vec<T>) {
    target.clone_from_slice(&self.to_slice());
  }

}

/* 
  境界チェックやOptionを実装しましょう
*/

pub trait ReadWrite {
  fn read<T: Copy>(&self, pos:usize) -> Option<T>;
  fn read_array<T: Copy>(&self, pos: usize, dst: &mut Vec<T>);
  fn write<T: Copy>(&self, pos: usize, val: T);
  fn write_array<T: Copy>(&self, pos: usize, src: &Vec<T>) ;
  fn read_string(&self) -> String;
  fn read_json(&self) -> serde_json::Value;
  fn write_string(&self, src:&str);
  fn write_json_auto(&mut self, value:serde_json::Value) -> anyhow::Result<()>;

  fn to_stream(&self) -> std::io::BufWriter<std::io::Cursor<&mut [u8]>>;
}
impl<'a> ReadWrite for MemoryMappedFileAccessor<'a> {
  /* addも内部的にはoffsetよんでるだけみたい */
  // repr(C)メモリレイアウトを使用する場合、
  // byte_addがstrcut内要素の最大値に限定されるので、 アライメントされてない読み込みにはrepr(packed)かread_unaligned
  #[inline]
  fn read<T: Copy>(&self, pos:usize) -> Option<T> {
    if pos + std::mem::size_of::<T>() > self.len() { return None; }
    unsafe { 
      let ptr = (self.accessor as *const T).byte_add(pos);
      Some(ptr.read_unaligned())
    }
  }

  #[inline]
  fn read_array<T: Copy>(&self, pos: usize, dst: &mut Vec<T>) {
    unsafe { 
      let ptr = (self.accessor as *const T).byte_add(pos);
      std::ptr::copy(ptr, dst.as_mut_ptr(), dst.len());
    }
    // for i in 0..dst.len() { dst[i] = unsafe { ptr.add(i).read_unaligned() }; }
  }
  
  #[inline]
  fn write<T: Copy>(&self, pos: usize, val: T) {
    let ptr = unsafe { (self.accessor as *mut T).byte_add(pos) };
    unsafe { std::ptr::write_unaligned(ptr, val) };
  }

  #[inline]
  fn write_array<T: Copy>(&self, pos: usize, src: &Vec<T>) {
    let ptr = unsafe { (self.accessor as *mut T).byte_add(pos) };
    unsafe { std::ptr::copy(src.as_ptr(), ptr, src.len()); }
  }
  
  #[inline]
  fn read_string(&self) -> String {
    let cur = unsafe { std::io::Cursor::new(std::slice::from_raw_parts(self.accessor as *const u8, self.len())) };
    let mut reader = std::io::BufReader::new(cur);
    let mut buffer = Vec::<u8>::new();
    reader.read_until(b'\0', &mut buffer).unwrap();
    buffer.remove(buffer.len()-1);
    String::from_utf8(buffer).expect("Our bytes should be valid utf8")
  }

  #[inline]
  fn read_json(&self) -> serde_json::Value {
    let src = self.read_string();
    serde_json::from_str(&src).unwrap() // serde_yaml::from_str(&src).unwrap();
  }

  fn write_string(&self, src:&str) {
    let ptr = unsafe { (self.accessor as *mut u8).byte_add(0) };
    unsafe { std::ptr::copy(format!("{src}\0").as_ptr(), ptr, src.len() + 1); }
  }

  fn write_json_auto(&mut self, value:serde_json::Value) -> anyhow::Result<()> {
    let mut json_str = serde_json::to_string(&value).unwrap();
    json_str.push('\0');
    if json_str.len() > self.len() {
      self.mmf.resize(json_str.len())?;
    }
    self.write_string(json_str.as_str());
    Ok(())
  }

  /*
    zipの読み書き用 ptr -> from_raw_parts -> std::io::Cursor -> BufReader 流し込み。
  
    let writer = acc.to_stream_reader();
    use std::io::prelude::*;
    for _i in 0..3 {
      let mut buffer = [0; 4];
      reader.read_exact(&mut buffer).unwrap();
      let value = i32::from_le_bytes(buffer);
      println!("{}", value);  
    }
  */
  fn to_stream(&self) -> std::io::BufWriter<std::io::Cursor<&mut [u8]>> {
    let cur = unsafe { std::io::Cursor::new(std::slice::from_raw_parts_mut(self.accessor as *mut u8, self.len()) ) };
    let dst = std::io::BufWriter::new(cur);
    dst
  }
}


/******** functions with closure ********/
// to_accessorつくっちゃったってdorpあるので正直いらない
pub fn using_create_mmf<T, F: FnMut(&MemoryMappedFileAccessor) -> anyhow::Result<T>>(path:&str, size:usize, mut f: F) -> anyhow::Result<T> {
  let mut mmf = MemoryMappedFileCreator::new(path, size)?;
  let acc = MemoryMappedFileAccessor::new(&mut mmf)?;
  let dst = f(&acc);
  drop(acc);
  drop(mmf);
  dst
}


/******** raw ********/

pub fn read<T: Copy>(path: &str, pos: usize) -> anyhow::Result<T> {
  let mut mmf = MemoryMappedFileCreator::open(path)?;
  let acc = mmf.to_accessor();
  Ok(acc.read::<T>(pos).ok_or(anyhow::anyhow!("Value is None"))?)
}

pub fn read_array<T: Copy>(path: &str, pos: usize, dst: &mut Vec<T>) -> anyhow::Result<()> {
  let mut mmf = MemoryMappedFileCreator::open(path)?;
  let acc = mmf.to_accessor();
  acc.read_array(pos, dst);
  Ok(())
}

pub fn write<T: Copy>(path: &str, pos: usize, val: T) -> anyhow::Result<()> {
  let mut mmf = MemoryMappedFileCreator::open(path)?;
  let acc = mmf.to_accessor();
  acc.write(pos, val);
  Ok(())
}

pub fn write_array<T: Copy>(path: &str, pos: usize, src: &Vec<T>) -> anyhow::Result<()> {
  let mut mmf = MemoryMappedFileCreator::open(path)?;
  let acc = mmf.to_accessor();
  acc.write_array(pos, src);
  Ok(())
}

pub fn read_json(path: &str) -> anyhow::Result<serde_json::Value> {
  let mut mmf = MemoryMappedFileCreator::open(path)?;
  let acc = mmf.to_accessor();
  Ok(acc.read_json())
}



#[cfg(feature = "disable_feature")]
mod pixel {
  use crate::memorymappedfile::*;

  #[repr(C)]
  #[derive(Copy, Clone, Debug, Default, serde::Serialize)]
  pub struct Header {
    pub size : i32,
    pub typecode :i32,
    pub width: i32,
    pub height: i32,
    pub depth: i32,
  
    dummy1: i32,
    dummy2: i32,
    dummy3: i32,
  }

  pub fn header(path: &str) -> anyhow::Result<Header> {
    open_mmf(path, |ptr| {
      let head : Header = ptr_read(ptr, 0);
      Ok(head)
    })
  }

  pub fn get_pixel<T: Copy>(path: &str, index: usize) -> anyhow::Result<T> {
    open_mmf(path, |ptr| {
      let head : Header = ptr_read(ptr, 0);
      let offset = std::mem::size_of::<Header>() + index * head.depth as usize;
      let dst : T = ptr_read(ptr, offset);
      Ok(dst)
    })
  }

  pub fn get_pixels<T: Copy>(path: &str, index: usize, dst: &mut Vec<T>) -> anyhow::Result<()> {
    open_mmf(path, |ptr| {
      let head : Header = ptr_read(ptr, 0);
      let offset = std::mem::size_of::<Header>() + index * head.depth as usize;
      ptr_read_array(ptr, offset, dst);
      Ok(())
    })
  }
  
  pub fn set_pixel<T: Copy>(path: &str, index: usize, val: T) -> anyhow::Result<()> {
    open_mmf(path, |ptr| { 
      let head : Header = ptr_read(ptr, 0);
      let offset = std::mem::size_of::<Header>() + index * head.depth as usize;
      let dst_ptr = unsafe { (ptr as *mut T).byte_add(offset) };
      unsafe { std::ptr::write_unaligned(dst_ptr, val) };
      Ok(())
    })
  }
  
  pub fn set_pixels<T: Copy>(path: &str, index: usize, dst: &Vec<T>) -> anyhow::Result<()> {
    open_mmf(path, |ptr| {
      let head : Header = ptr_read(ptr, 0);
      let offset = std::mem::size_of::<Header>() + index * head.depth as usize;
      ptr_write_array(ptr, offset, dst);
      Ok(())
    })
  }

}


#[allow(dead_code)] 
mod experimental {

  // 同じマップ内で複数データを使用する場合
  // オートマッピングするわけでもないし面倒そうなのでペンディング
  #[repr(C)]
  #[derive(Copy, Clone, Debug, Default, serde::Serialize)]
  pub struct RawHeader {
    pub signature : u32,
    pub data_length :u32,
  }
}


/******** from file ********/

pub fn write_array_from_file(path: &str, file_path: &str) -> anyhow::Result<()> {
  let mut file = std::fs::File::open(file_path)?;
  let mut buffer = Vec::new();
  let _n = file.read_to_end(&mut buffer)?;
  write_array(path, 0, &buffer)
}

pub mod mmf_image {

  pub fn init_image(path:&str, width:usize, height:usize) {
    let mut src = vec![0i32; width*height];
    for y in 0..height {
      for x in 0..width {
        src[x + y * width] = x as i32;
      }
    }
    crate::memorymappedfile::write_array(path, 0, &mut src).unwrap();
  }

}
