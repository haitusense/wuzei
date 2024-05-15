#!/usr/bin/env rust-script

//! ```cargo
//! [dependencies]
//! serde = "1.0.197"
//! serde_json = "1.0.114"
//! ```
use std::env;

fn main() {
  let args: Vec<String> = env::args().collect();
  println!("hello, rust {:?}", args[1]);
  let dst: serde_json::Value = serde_json::from_str(args[1].as_str()).unwrap();
  println!("{:?}", dst);
  println!("width : {}", dst["width"].as_i64().unwrap());
}