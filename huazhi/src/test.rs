#![allow(dead_code, unused_variables)]
#[cfg(test)]

// use super::*;
// use serde_json::json;
// use tokio::io::AsyncReadExt;
// use std::{fmt::Debug, io::Read};

/*
  let mut a = std::env::current_dir().unwrap();
  a.push(r"..\u10_Ship_4K.zip");
  println!("{}", a.display());  
*/

mod memorymappedfile {
  use crate::memorymappedfile::*;

  #[tokio::test]
  async fn mmf_create_test() {
    let mut mmf = MemoryMappedFileCreator::new("test", 10).unwrap();
    let acc = MemoryMappedFileAccessor::new(&mut mmf).unwrap();
    acc.info();
    // drop(acc);
    // drop(mmf);
  }

  #[tokio::test]
  async fn mmf_open_test() {
    let mut mmf = MemoryMappedFileCreator::open("test").unwrap();
    let acc = MemoryMappedFileAccessor::new(&mut mmf).unwrap();
    acc.info();
    // drop(acc);
    // drop(mmf);
  }

  #[tokio::test]
  async fn mmf_test() {
    let mut mmf_server = MemoryMappedFileCreator::new("test", 10).unwrap();
    {
      let acc = MemoryMappedFileAccessor::new(&mut mmf_server).unwrap();
      let buf = acc.to_mut_slice::<i32>();
      buf[0] = 0x04_03_02_01;
      buf[buf.len() - 1] = 0x05_06_07_08;
      println!("addr = {:p} len = {}",buf, buf.len());
      // drop(acc);
    }
    {
      let mut mmf_client = MemoryMappedFileCreator::open("test").unwrap();
      let acc = MemoryMappedFileAccessor::new(&mut mmf_client).unwrap();
      let buf = acc.to_slice::<u8>();
      println!("addr = {:p} len = {}",buf, buf.len());
      println!("{:?} {:?}", &buf[0..5], &buf[buf.len()-5..buf.len()]);
      println!("{:?} {:?} {:?}", acc.read::<u8>(4094), acc.read::<u8>(4095), acc.read::<u8>(4096) );
      println!("{:?} {:?} {:?}", acc.read::<i32>(4092), acc.read::<i32>(4093), acc.read::<i32>(4094) );
      println!("{}", 0x05_06_07_08 );
      // drop(acc);
    }
    // drop(mmf_server);
  }


  #[tokio::test]
  async fn mmf_a_test() {
    // let mmf: MemoryMappedFileCreater = MemoryMappedFileCreater::new("test", 125*125);

    // let _ = COMPUTATION.set(FileMap::new("test2", 125*125));
    // // dropって出るけど、dropしてない、さすがにプロセス抜けると回収されてる

    // loop {
    //   tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    // }
    let handle_server = tokio::task::spawn(async {
      let mut mmf = MemoryMappedFileCreator::new("test", 10).unwrap();
      {
        let acc = mmf.to_accessor();
        println!("write");
        acc.write(0, 10i32);
      }
      tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    });

    let handle_client = tokio::task::spawn(async {
      tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
      let mut mmf = MemoryMappedFileCreator::open("test").unwrap();
      let acc = mmf.to_accessor();
      println!("read");
      let dst :i32 = acc.read(0).unwrap_or_default();
      println!("dst : {}", dst);
    });

    let (_r1, _r2) = (handle_server.await.unwrap(), handle_client.await.unwrap());
  }

  

  #[tokio::test]
  async fn mmf_mappingtable_test() {
    use serde_json::json;

    let handle_server = tokio::task::spawn(async {
      let data = [0u8;256];
      let header = json!({ "size" : data.len() });
      let mut header_str = serde_json::to_string(&header).unwrap();
      header_str.push('\0');

      let mut map_size = 0usize;
      map_size += std::mem::size_of::<usize>() * 2;
      map_size += header_str.as_bytes().len();
      map_size += std::mem::size_of::<usize>() * 2;
      map_size += data.len();
      println!("{}", map_size);

      // let mmf = MemoryMappedFileCreater::new("test", map_size).unwrap();
      // access_mmf(&mmf, |ptr| {
      //   println!("write header");
      //   let mut index = 0usize;
      //   ptr_write(ptr, index, 0usize);
      //   index += std::mem::size_of::<usize>();
      //   ptr_write(ptr, index, header_str.as_bytes().len());
      //   index += std::mem::size_of::<usize>();

      //   ptr_write_array(ptr, index, &header_str.as_bytes().to_vec());
      //   index += header_str.as_bytes().len();

      //   ptr_write(ptr, index, 0usize);
      //   index += std::mem::size_of::<usize>();
      //   ptr_write(ptr, index, data.len());
      //   index += std::mem::size_of::<usize>();
      //   ptr_write_array(ptr, index, &data.to_vec());
      //   index += std::mem::size_of::<usize>();

      //   Ok(())
      // }).unwrap();
      loop{
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
      }
      // drop(mmf);
    });

    let handle_client = tokio::task::spawn(async {
      tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
      // open_mmf("test", |ptr| {
      //   println!("read");
      //   let dst :i32 = ptr_read(ptr, 0);
      //   println!("dst : {}", dst);
      //   Ok(())
      // }).unwrap();
    });

    let (_r1, _r2) = (handle_server.await.unwrap(), handle_client.await.unwrap());

  }


  #[tokio::test]
  async fn test() {

    struct PointTuple<T: Copy>(i32, std::marker::PhantomData<fn() -> T>);
    let point_tuple : PointTuple<f32> = PointTuple(12, std::marker::PhantomData);
    println!("{}", point_tuple.0);
    // T : 共変  派生 <: 基底 とすると、B <: A ならば I<B> <: I<A>
    // fn(T) -> T 非変 共変・反変・双変のどれでもない
    //   要は継承関係から独立させる。strcutの状態パラメータとして使うなら、独立させた方がいいよね
  }

}


mod phantomdata {
  
  #[tokio::test]
  async fn test() {

    struct PointTuple<T: Copy>(i32, std::marker::PhantomData<fn() -> T>);
    let point_tuple : PointTuple<f32> = PointTuple(12, std::marker::PhantomData);
    println!("{}", point_tuple.0);
    // T : 共変  派生 <: 基底 とすると、B <: A ならば I<B> <: I<A>
    // fn(T) -> T 非変 共変・反変・双変のどれでもない
    //   要は継承関係から独立させる。strcutの状態パラメータとして使うなら、独立させた方がいいよね
  }


  struct A1 {}
  struct A2 {}
  struct A3 {}
  struct A<T> {
    i:i32,
    phantom : std::marker::PhantomData<fn() -> T>
  }
  impl<T> A<T> {
    fn info(&self) { println!("{} {:x?}", std::any::type_name::<T>(), &&(self).as_raw_bytes()) }
  }
  trait AsRawBytes {
    fn as_raw_bytes<'a>(&'a self) -> &'a [u8];
  }
  impl<T> AsRawBytes for T where T : ?Sized {
    fn as_raw_bytes<'a>(&'a self) -> &'a [u8] {
      unsafe { std::slice::from_raw_parts( self as *const T as *const u8, std::mem::size_of_val(self)) }
    }
  }
  impl A<A1> {
    fn new(path: String) -> Self { Self { i:3, phantom : std::marker::PhantomData } }
    // fn info(&self) { println!("{}", std::any::type_name::<T>()) }
    fn to_a2(&self) -> A<A2> { A::<A2> { i:self.i, phantom: std::marker::PhantomData } }
  }

  impl A<A2> {
    fn to_a3(&self) -> A<A3> { A::<A3> { i:self.i, phantom: std::marker::PhantomData } }
  }


  #[test]
  fn phantom_test() {
    let a = A::<A1>::new("a".to_string());
    a.info();
    let b = a.to_a2();
    a.info();
    b.info();

    let c = b.to_a3();
    a.info();
    b.info();
    c.info();

  }
}