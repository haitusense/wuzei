use colored::*;
use std::sync::{Arc, Mutex};
use std::process::Stdio;
use tokio_util::codec::*;
use futures::prelude::*;
use std::str::FromStr;

use huazhi::custom_protocol::{response, response_400, ResContent};

#[derive(Debug, PartialEq, strum::EnumString)]
#[strum(serialize_all = "lowercase")]
pub enum TypeNames {
  Sleep,
  Resize,
  Refresh,
  GetPixel,
  GetPath,

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
    TypeNames::Resize => {
      let _width = payload["width"].as_i64().unwrap_or(320) as usize;
      let _height = payload["height"].as_i64().unwrap_or(240) as usize;
      // crate::mmf_init(width, height);

      let dst = serde_json::json!({ "state": "successed" });
      response(ResContent::JSON(&dst))
    }
    TypeNames::Refresh => {
      use huazhi::memorymappedfile::*;
      let shift = payload["shift"].as_i64().unwrap_or(0) as i32;
      let color = payload["color"].as_i64().unwrap_or(0) as i32;

      let mut mmf = super::get_mmf().lock().unwrap();
      let value = mmf.get_value();
      let width = value["width"].as_u64().unwrap() as usize;
      let height = value["height"].as_u64().unwrap() as usize;

      let acc = mmf.to_accessor();
      response(ResContent::IMAGE(hraw::processing::slice_to_png(acc.to_slice::<i32>(), width, height, shift, color)))
    },
    TypeNames::GetPixel => {
      use huazhi::memorymappedfile::*;
      let mut mmf = super::get_mmf().lock().unwrap();

      let mmf_value = mmf.get_value();
      let width = mmf_value["width"].as_u64().unwrap() as i32;
      let height = mmf_value["height"].as_u64().unwrap() as i32;

      let x = payload["x"].as_i64().unwrap_or(0) as i32;
      let y = payload["y"].as_i64().unwrap_or(0) as i32;

      println!("{:?} {} {}", payload, x, y);

      let dst = if x < 0 || width - 1 < x || y < 0 || height - 1 < y {
        serde_json::json!({ "status": "failed", "x" : x, "y" : y, "data": null })
      } else {
        let pos = 4 * (x + y * width) as usize;
        let data = mmf.to_accessor().read::<i32>(pos);
        serde_json::json!({ "status": "successed", "x" : x, "y" : y, "data": data })
      };
      // let dst = serde_json::json!({ "state": "successed", "payload": path });
      response(ResContent::JSON(&dst))
    },
    TypeNames::GetPath => {
      let path = super::get_mmf().lock().unwrap().get_path();
      let dst = serde_json::json!({ "status": "successed", "payload": path });
      response(ResContent::JSON(&dst))
    },
    
    // py.eval_bound
    // py.run_bound(args.join("\r\n").as_str(),None, None)?;
    // py.from_code_bound
    TypeNames::Py1 => {
      use pyo3::prelude::*;
      let args = payload.as_str().unwrap_or("null");
      let e : Result<String, pyo3::PyErr> = Python::with_gil(|py: Python| {
        let sys = py.import_bound("sys")?;
        sys.setattr("stdout", LoggingStdout.into_py(py))?;
        let dst = py.eval_bound(args, None, None)?;
        // let _ = mutex.lock().unwrap().send_event(huazhi::event_handler::UserEvent::TerminalMessage(format!("{dst}\r\n")));
        Ok(format!("{dst}"))
      });
      match e {
        Ok(n) => response(ResContent::JSON(&serde_json::json!({ "status" : "succeeded", "data" : n }))),
        Err(_) => response(ResContent::JSON(&serde_json::json!({ "status" : "failed" }))),
      }
    },
    TypeNames::Py => {
      use pyo3::prelude::*;
      let code = payload["code"].as_str().unwrap_or("null");
      let entry = payload["entry"].as_str().unwrap_or("main");

      let e : Result<String, pyo3::PyErr> = Python::with_gil(|py| {
        let sys = py.import_bound("sys")?;
        sys.setattr("stdout", LoggingStdout.into_py(py))?;

        let module = PyModule::from_code_bound(py, code,"", "",)?;
        module.add("Pixel", Pixel)?;
        let func = module.getattr(entry)?;
        let args = py.eval_bound(payload["args"].as_str().unwrap_or("{}"), None, None)?;
        let dst = func.call1((args,))?; //.extract::<String>()?;
        Ok(format!("{dst}"))
      });
      match e {
        Ok(n) => response(ResContent::JSON(&serde_json::json!({ "status" : "succeeded", "data" : n }))),
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
      let mut reader = FramedRead::new(stdout, MyDecoder);

      while let Some(line) = reader.next().await {
        let a = line.unwrap();
        println!("{:?}", a);
        let _ = mutex.lock().unwrap().send_event(huazhi::event_handler::UserEvent::TerminalMessage(a.clone().replace("\n", "\r\n")));
      }
      response(ResContent::JSON(&serde_json::json!({ "status" : "succeeded"})))
    },
    _ => {
      response_400(ResContent::TXT("unknown"))
    }
  };
  Ok(dst)
}

pub async fn _async_custom_protocol_terminal(request: huazhi::wry::http::Request<Vec<u8>>, mutex: Arc<Mutex<huazhi::tao::event_loop::EventLoopProxy<huazhi::event_handler::UserEvent>>>) -> huazhi::wry::http::Response<Vec<u8>> {
  println!("{} {:?}", "custom protocol".on_green() , request.uri().path());
  let body = String::from_utf8(request.body().to_owned()).unwrap();
  let value: serde_json::Value = serde_json::from_str(body.as_str()).unwrap();
  let type_name : String = serde_json::from_value(value["type"].clone()).unwrap_or("".to_string());
  let args : Vec<String> = serde_json::from_value(value["payload"].clone()).unwrap();
  println!("{} type : {:?} payload : {:?}", "custom protocol".on_green() , type_name.as_str(), args);

  match type_name.as_str() {

    "getpath" => {
      let path = super::get_mmf().lock().unwrap().get_path();
      let dst = serde_json::json!({ "state": "successed", "payload": path });
      response(ResContent::JSON(&dst))
    },
    "getvalue" => {
      let path = super::get_mmf().lock().unwrap().get_value();
      response(ResContent::JSON(&path))
    },

    "ps" => {
      let mut child = tokio::process::Command::new("powershell.exe")
        .args(&["-NoProfile", "-WindowStyle", "Hidden", "-Command", "chcp 65001;"])
        .args(args)
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to start sleep");

      let stdout = child.stdout.take().unwrap();
      let mut reader = FramedRead::new(stdout, MyDecoder);

      while let Some(line) = reader.next().await {
        let a = line.unwrap();
        println!("{:?}", a);
        let _ = mutex.lock().unwrap().send_event(huazhi::event_handler::UserEvent::TerminalMessage(a.clone().replace("\n", "\r\n")));
      }
      response(ResContent::TXT("succeeded"))
    },

    "resize" => {

      // crate::mmf_init(width, height);
      let mut mmf = super::get_mmf().lock().unwrap();
      let path = mmf.get_path();
      let a = value["payload"].as_array().unwrap();
      let width = a[0].as_i64().unwrap_or(320) as usize;
      let height = a[1].as_i64().unwrap_or(240) as usize;

      let value = serde_json::json!({
        "path" : path,
        "width" : width,
        "height" : height,
        "size": width * height * 4
      });
      let json = serde_json::to_string(&value).unwrap();
      mmf.resize(json.as_str()).unwrap();

      response(ResContent::TXT("failed"))
    },
    _ => {
      response_400(ResContent::TXT("unknown"))
    }
  }

}


struct MyDecoder;

impl Decoder for MyDecoder {
  type Item = String;
  type Error = std::io::Error;

  fn decode(&mut self, src: &mut bytes::BytesMut) -> Result<Option<Self::Item>, Self::Error> {
    if let Some(i) = src.iter().position(|&b| b == b'\n') {
      let line = src.split_to(i + 1);
      Ok(Some(String::from_utf8_lossy(&line).to_string()))
    } else {
      Ok(None)
    }
  }
}

#[pyo3::prelude::pyclass]
struct LoggingStdout;

#[pyo3::prelude::pymethods]
impl LoggingStdout {
  fn write(&self, data: &str) {
    println!("{} {:?}", "stdout from python".magenta(), data);
    let _ = crate::PX.get().unwrap().lock().unwrap().send_event(huazhi::event_handler::UserEvent::TerminalMessage(data.to_string().replace("\n", "\r\n")));
  }
}

#[pyo3::prelude::pyclass]
struct Pixel;

#[pyo3::prelude::pymethods]
impl Pixel {
  fn get(&self, x:usize, y:usize) -> i32 {
    use huazhi::memorymappedfile::*;
    let mut mmf = super::get_mmf().lock().unwrap();
    let mmf_value = mmf.get_value();
    let width = mmf_value["width"].as_u64().unwrap() as usize;
    let dst = mmf.to_accessor().read::<i32>(4 * (x + y * width)).unwrap();
    dst
  }
  fn set(&self, x:usize, y:usize, src:i32) {
    use huazhi::memorymappedfile::*;
    let mut mmf = super::get_mmf().lock().unwrap();
    let mmf_value = mmf.get_value();
    let width = mmf_value["width"].as_u64().unwrap() as usize;
    mmf.to_accessor().write::<i32>(4 * (x + y * width), src);
  }
  fn to_array(&self) -> Vec<i32> {
    use huazhi::memorymappedfile::*;
    let mut mmf = super::get_mmf().lock().unwrap();
    let mmf_value = mmf.get_value();
    let width = mmf_value["width"].as_u64().unwrap() as usize;
    let height = mmf_value["height"].as_u64().unwrap() as usize;
    let mut dst = vec![0i32; width * height];
    mmf.to_accessor().read_array::<i32>(0, &mut dst);
    dst
  }
}