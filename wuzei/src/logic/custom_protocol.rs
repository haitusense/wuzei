use colored::*;
use std::sync::{Arc, Mutex};
use std::process::Stdio;
use tokio_util::codec::*;
use futures::prelude::*;
use std::str::FromStr;
use hraw::prelude::*;
use huazhi::custom_protocol::{response, response_400, ResContent};

#[derive(Debug, PartialEq, strum::EnumString)]
#[strum(serialize_all = "lowercase")]
pub enum TypeNames {
  Sleep,
  Resize,
  Refresh,
  GetPixel,
  // GetPath,
  Env,
  Cd,
  ReadRaw,
  ReadPng,
  Py1,
  Py,
  Ps,
  #[strum(serialize = "arabica")] 
  Arabica,
  Unknown
}

pub async fn async_custom_protocol_api(request: huazhi::wry::http::Request<Vec<u8>>, mutex: Arc<Mutex<huazhi::tao::event_loop::EventLoopProxy<huazhi::event_handler::UserEvent>>>) -> huazhi::wry::http::Response<Vec<u8>> {
  println!("{} api {:?}", "custom protocol".on_green(), request.uri().path());
  let body = String::from_utf8(request.body().to_owned()).unwrap();
  let value: serde_json::Value = serde_json::from_str(body.as_str()).unwrap();
  let type_name : String = serde_json::from_value(value["type"].clone()).unwrap_or("".to_string());
  let key = TypeNames::from_str(type_name.as_str()).unwrap_or(TypeNames::Unknown);
  println!("{} type : {:?}", "custom protocol".on_green(), type_name);
  let payload  = value["payload"].clone();

  match logic(key, payload, mutex).await {
    Ok(n) => n,
    Err(_e) => response(ResContent::TXT("err"))
  }
}

async fn logic(key: TypeNames, payload: serde_json::Value, mutex: Arc<Mutex<huazhi::tao::event_loop::EventLoopProxy<huazhi::event_handler::UserEvent>>>) -> anyhow::Result<huazhi::wry::http::Response<Vec<u8>>> {
  let dst = match key {
    TypeNames::Sleep => {
      use std::{thread, time};
      let t = time::Duration::from_secs(1);
      for i in 0..3 {
        println!("{}", i);
        let a = format!("{}", i);
        let _ = mutex.lock().unwrap().send_event(huazhi::event_handler::UserEvent::TerminalMessage(a));
        thread::sleep(t);
      }
      let dst = serde_json::json!({ "state": "successed", "payload": "" });
      response(ResContent::JSON(&dst))
    },
    TypeNames::Env => {
      let args = crate::get_args().lock().unwrap().clone();
      let dst = serde_json::json!({ 
        "status": "successed",
        "payload": {
          "current_dir": std::env::current_dir()?,
          "args": args
        }
      });
      response(ResContent::JSON(&dst))
    },
    TypeNames::Cd => {
      let root = payload.as_str().unwrap_or(".\\");
      let dst = match std::env::set_current_dir(&root){
        Ok(_) => "successed",
        Err(_) => "failed"
      };
      let dst = serde_json::json!({ 
        "status": dst,
        "payload": {
          "current_dir": std::env::current_dir()?, 
        }
      });
      response(ResContent::JSON(&dst))
    },
    TypeNames::Resize => {
      let width = payload["width"].as_i64().unwrap_or(320) as usize;
      let height = payload["height"].as_i64().unwrap_or(240) as usize;
      crate::pixel_init(width, height);
      let dst = serde_json::json!({ "state": "successed" });
      response(ResContent::JSON(&dst))
    }
    TypeNames::Refresh => {
      println!("{:?}", payload);
      let shift = payload["bitshift"].as_i64().unwrap_or(0) as i32;
      let color = payload["color"].as_i64().unwrap_or(0) as i32;
      let matrix = serde_json::from_value::<[[f64; 3]; 3]>(payload["matrix"].to_owned()).ok();

      let pixel = crate::get_pixel().lock().unwrap();
      let width = pixel.width;
      let height = pixel.height;
      response(ResContent::IMAGE(hraw::processing::slice_to_png(pixel.data.as_slice(), width, height, shift, matrix, color)))
    },
    TypeNames::GetPixel => {
      let pixel = crate::get_pixel().lock().unwrap();
      let width = pixel.width as i32;
      let height = pixel.height as i32;
      let x = payload["x"].as_i64().unwrap_or(0) as i32;
      let y = payload["y"].as_i64().unwrap_or(0) as i32;

      let dst = if x < 0 || width - 1 < x || y < 0 || height - 1 < y {
        serde_json::json!({ "status": "failed", "x" : x, "y" : y, "data": null })
      } else {
        let data = pixel.data[(x + y * width) as usize];
        serde_json::json!({ "status": "successed", "x" : x, "y" : y, "data": data })
      };
      // let dst = serde_json::json!({ "state": "successed", "payload": path });
      response(ResContent::JSON(&dst))
    },
    // TypeNames::GetPath => {
    //   let pixel = crate::get_pixel().lock().unwrap();
    //   let dst = serde_json::json!({ "status": "successed", "payload": pixel.path });
    //   response(ResContent::JSON(&dst))
    // },
    TypeNames::ReadRaw => {
      let path = payload["path"].as_str().unwrap_or("");
      let mut hraw = Hraw::new(path).unwrap();

      let (width, height, _) = hraw.header().to_size();
      let mut pixel = crate::get_pixel().lock().unwrap();

      // 数値か文字列か判断
      // (|| { 
      //   println!("test subpath : {} {:?}", payload["subpath"].is_number(), payload["subpath"]);
      //   if let Some(n) = payload["subpath"].as_i64() {
      //     mmf.to_accessor().to_mut_slice::<i32>().from_hraw(path, n as usize);
      //     return;
      //   }
      //   if let Some(n) = payload["subpath"].as_str() {
      //     mmf.to_accessor().to_mut_slice::<i32>().from_hraw(path, n);
      //     return;
      //   }
      // })();

      let _ = match payload["subpath"].as_i64() {
        Some(n)=> {
          pixel.width = width;
          pixel.height = height;
          pixel.data = hraw.to_vec_i32(n as usize).unwrap();
        },
        None => {
          let subpath = payload["subpath"].as_str().unwrap_or("data.raw");
          pixel.width = width;
          pixel.height = height;
          pixel.data = hraw.to_vec_i32(subpath).unwrap();
        }
      };

      let dst = serde_json::json!({ "status": "successed", "payload": path });
      response(ResContent::JSON(&dst))
    },
    TypeNames::ReadPng  => {
      let path = payload["path"].as_str().unwrap_or("");
      let (width, height, data) = read_png_i32(path).unwrap();

      let mut pixel = crate::get_pixel().lock().unwrap();
      pixel.width = width;
      pixel.width = height;
      pixel.data = data;

      let dst = serde_json::json!({ "status": "successed", "payload": "path" });
      response(ResContent::JSON(&dst))
    },
    TypeNames::Py1 => {
      let args = payload.as_str().unwrap_or("null");

      let stdout = PythonStdout::new(|msg:&str| {
        println!("{} {:?}", "stdout from python".magenta(), msg);
        let _ = crate::EVENT_LOOP.get().unwrap().lock().unwrap().send_event(huazhi::event_handler::UserEvent::TerminalMessage(msg.to_string().replace("\n", "\r\n")));    
      });
      match eval_py1(args, stdout) {
        Ok(n) => response(ResContent::JSON(&serde_json::json!({ "status" : "succeeded", "data" : n }))),
        Err(_) => response(ResContent::JSON(&serde_json::json!({ "status" : "failed" }))),
      }
    },
    TypeNames::Py => {
      let code = payload["code"].as_str().unwrap_or("null");
      let entry = payload["entry"].as_str().unwrap_or("main");
      let args : serde_json::Value = serde_json::from_str(payload["args"].as_str().unwrap_or("{}")).unwrap();
      let pixel = crate::get_pixel().clone();

      let py : anyhow::Result<serde_json::Value> = pixel.modify_with_py_stdout(entry, code, args, |msg|{  
        println!("{} {:?}", "stdout from python".magenta(), msg);
        let _ = crate::EVENT_LOOP.get().unwrap().lock().unwrap().send_event(huazhi::event_handler::UserEvent::TerminalMessage(msg.to_string().replace("\n", "\r\n")));    
      });
      match py {
        Ok(n) => response(ResContent::JSON(&serde_json::json!({ "status" : "succeeded", "detail" : n }))),
        Err(e) => response(ResContent::JSON(&serde_json::json!({ "status" : "failed", "detail" : format!("{e}") }))),
      }
    },
    TypeNames::Ps => {
      let args : Vec<String> = serde_json::from_value(payload).unwrap();
      let mut child = tokio::process::Command::new("powershell.exe")
        .args(&["-NoProfile", "-WindowStyle", "Hidden", "-Command", "chcp 65001;"])
        .args(args)
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to start sleep");

      let stdout = child.stdout.take().unwrap();
      let mut reader = FramedRead::new(stdout, super::MyDecoder);

      while let Some(line) = reader.next().await {
        let a = line.unwrap();
        println!("{:?}", a);
        let _ = mutex.lock().unwrap().send_event(huazhi::event_handler::UserEvent::TerminalMessage(a.clone().replace("\n", "\r\n")));
      }
      response(ResContent::JSON(&serde_json::json!({ "status" : "succeeded"})))
    },
    _ => { response_400(ResContent::TXT("unknown")) }
  };
  Ok(dst)
}
