pub mod custom_protocol;
pub mod event_handler;
use colored::*;

// #![feature(async_closure)]
use std::sync::Mutex;
use huazhi::memorymappedfile::*;

static MMF: std::sync::OnceLock<std::sync::Mutex<huazhi::memorymappedfile::MemoryMappedFileCreator>> = std::sync::OnceLock::new();
fn get_mmf() -> &'static Mutex<huazhi::memorymappedfile::MemoryMappedFileCreator> {
  MMF.get_or_init(|| {
    let path = crate::get_args().lock().unwrap().memorymapped.clone().unwrap();
    let value = serde_json::json!({
      "path" : path,
      "size" : 320 * 240 * 4,
      "width" : 320,
      "height" : 240
    });
    let json = serde_json::to_string(&value).unwrap();
    Mutex::new(huazhi::memorymappedfile::MemoryMappedFileCreator::new(json.as_str()).unwrap())
  })
}

pub fn mmf_init(width:usize, height:usize){
  println!("{}", "init mmf".blue());
  // let json = json!({ "width" : width, "height": height });
  // let mut json_str = serde_json::to_string(&json).unwrap();
  // json_str.push('\0');
  // let mut header = get_header().lock().unwrap();
  // *header = json;

  let mut mmf_body = get_mmf().lock().unwrap();
  let path = mmf_body.get_path();
  let value = serde_json::json!({
    "path" : path,
    "size" : width * height * 4,
    "width" : width,
    "height" : height
  });
  let json = serde_json::to_string(&value).unwrap();
  mmf_body.resize(json.as_str()).unwrap();

  let mut src = vec![0i32; width*height];
  for y in 0..height {
    for x in 0..width {
      src[x + y * width] = x as i32;
    }
  }

  let acc = mmf_body.to_accessor();
  acc.write_array(0, &src);

}