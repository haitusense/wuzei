#!/usr/bin/env rust-script

//! ```cargo
//! [dependencies]
//! serde = "1.0.197"
//! serde_json = "1.0.114"
//! hraw = { git = "https://github.com/haitusense/hraw/", features=["pixel"] }
//! ```
use std::env;
use hraw::pixel::*;

fn main() {
  let args: Vec<String> = env::args().collect();
  println!("hello, rust {:?}", args[1]);
  let dst: serde_json::Value = serde_json::from_str(args[1].as_str()).unwrap();
  println!("{:?}", dst);
  println!("width : {}", dst["width"].as_i64().unwrap());

  let mut src = vec![0i32;16*12];

  for y in 0..12 {
    for x in 0..16 {
      src[x + y * 16] = (x + y * 100) as i32;
    }
  }
  let mut pixel = src.to_pixel(16, 12);

  let dm = pixel.to_mat();
  println!("{}",dm);
}