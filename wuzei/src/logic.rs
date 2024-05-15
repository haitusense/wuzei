// #![feature(async_closure)]

use colored::Colorize;
use huazhi::{ /* process::async_powershell memorymappedfile::mmf_image::init_image,*/ wry::{ 
  application::{
    event::{Event, StartCause, WindowEvent},
    event_loop::ControlFlow,
  }, http::header::CONTENT_TYPE, webview::WebView
}};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{get_args, get_header};
use huazhi::memorymappedfile::*;
use hraw::{buffer::FromHraw, *};

use hraw::{read_png_head, FromPng};

use tokio_util::codec::*;
use futures::prelude::*;

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct Message{
  #[serde(rename = "type")]
  pub type_name: String,
  pub payload: serde_json::Value
}

pub async fn async_custom_protocol_data(request: huazhi::wry::http::Request<Vec<u8>>) -> huazhi::wry::http::Response<Vec<u8>> {
  println!("custom protocol {:?}", request.uri().path());
  let body = String::from_utf8(request.body().to_owned()).unwrap();
  println!("custom protocol body {:?}", body);
  let value: serde_json::Value = serde_json::from_str(body.as_str()).unwrap();
  println!("custom protocol value {:?}", value);
  match value["type"].as_str() {
    Some("resize") => {
      let width = value["payload"]["width"].as_i64().unwrap_or(320) as usize;
      let height = value["payload"]["height"].as_i64().unwrap_or(240) as usize;
      crate::mmf_init(width, height);

      let json = json!({ "status" : "sucess", });
      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(serde_json::to_string(&json).unwrap().as_bytes().to_vec())
        .unwrap()
    },
    Some("get_state") => {

      let a = get_header().lock().unwrap().clone();
      let json = serde_json::to_string(&a).unwrap();

      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(serde_json::to_string(&json).unwrap().as_bytes().to_vec())
        .unwrap()
    },
    Some("read_file") => {
      let path = value["payload"]["path"].as_str().unwrap_or("");

      let mut hraw = hraw::Hraw::new(path).unwrap();
      hraw.info().unwrap();
      let size = hraw.header().to_size();
      
      crate::mmf_init(size.0, size.1);

      let mmf_path = get_args().lock().unwrap().memorymapped.to_owned();
      let mut mmf = MemoryMappedFileCreator::open(mmf_path.as_str()).unwrap();
      mmf.to_accessor().to_mut_slice::<i32>().from_hraw(path, "data.raw");

      let dst = json!({ "status" : true });

      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(serde_json::to_string(&dst).unwrap().as_bytes().to_vec())
        .unwrap()
    },
    Some("read_file_png") => {

      let path = value["payload"]["path"].as_str().unwrap_or("");
      let (width, height) = read_png_head(path);

      crate::mmf_init(width, height);

      let mmf_path = get_args().lock().unwrap().memorymapped.to_owned();
      let mut mmf = MemoryMappedFileCreator::open(mmf_path.as_str()).unwrap();
      mmf.to_accessor().to_mut_slice::<i32>().from_png(path);

      let dst = json!({ "status" : true });

      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(serde_json::to_string(&dst).unwrap().as_bytes().to_vec())
        .unwrap()
    },
    Some("refresh") => {
      let shift = value["payload"]["shift"].as_i64().unwrap_or(0) as i32;
      let color = value["payload"]["color"].as_i64().unwrap_or(0) as i32;
      
      let json = get_header().lock().unwrap().clone();
      let width = json["width"].as_u64().unwrap() as usize;
      let height = json["height"].as_u64().unwrap() as usize;

      let mmf_path = get_args().lock().unwrap().memorymapped.to_owned();
      let mut mmf = MemoryMappedFileCreator::open(mmf_path.as_str()).unwrap();
      let acc = mmf.to_accessor();
   
      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "image/png")
        .body(hraw::processing::slice_to_png(acc.to_slice::<i32>(), width, height, shift, color))
        .unwrap()
    },
    Some("get_pixel") => {
      let x = value["payload"]["x"].as_f64().unwrap_or(0f64) as i32;
      let y = value["payload"]["y"].as_f64().unwrap_or(0f64) as i32;

      let json = get_header().lock().unwrap().clone();
      let width = json["width"].as_u64().unwrap() as i32;
      let height = json["height"].as_u64().unwrap() as i32;

      let dst = if x < 0 || width - 1 < x || y < 0 || height - 1 < y {
        json!({ "x" : 0, "y" : 0, "data": 0 })
      } else {
        let mmf_path = get_args().lock().unwrap().memorymapped.to_owned();
        let p = huazhi::memorymappedfile::read(mmf_path.as_str(), 4 * (x + y * width) as usize).unwrap_or(-1);
        json!({ "x" : x, "y" : y, "data": p })
      };
      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(serde_json::to_string(&dst).unwrap().as_bytes().to_vec())
        .unwrap()
    },
    Some("test") => {
      let payload = value["payload"].as_i64().unwrap_or(100) as u8;
      let mut dst = vec![0u8; 512*512*4];
      for i in 0..512*512 {
        dst[i*4] = payload;
        dst[i*4 + 1] = payload;
        dst[i*4 + 2] = payload;
        dst[i*4 + 3] = 255;
      }
      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "application/octet-stream")
        .body(dst)
        .unwrap()
    },
    Some("process") => {
      async fn f(src:&Value) -> anyhow::Result<std::process::ExitStatus> {
        let payload: Vec<String> = serde_json::from_value(src.to_owned())?;
        let dst: std::process::ExitStatus = tokio::process::Command::new("powershell")
          .kill_on_drop(true)
          .args(&payload)
          .spawn()?.wait().await?;
        Ok(dst) 
      }
      let dst = match f(&value["payload"]).await {
        Ok(n) => json!({ "code" : n.code(), "success" : n.success() }),
        Err(e) => json!({ "code" : 1, "success" : false, "detail" : format!(r##" "{e:?}" "##) })
      };
      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(serde_json::to_string(&dst).unwrap().as_bytes().to_vec())
        .unwrap()
      /*
        sucess : code 0
        throw new Exception() : code 1
        Couldn't find file : code 1
      */
    },
    Some("script") => {
      async fn f(src:&Value) -> anyhow::Result<String> {
        let payload: String = serde_json::from_value(src.to_owned())?;

        use pyo3::prelude::*;
        let hoge = Python::with_gil(|py| {
          // let module = PyModule::from_code_bound(py, payload.as_str(),"", "",).unwrap();
          // module.add("src", src).unwrap();
          // let func = module.getattr("function").unwrap();
          // (0..width*height).for_each(|i|{ 
          //   dst[i] = func.call1((i,)).unwrap().extract::<i32>().unwrap();
          // });
          let a = py.eval_bound(payload.as_str(), None, None).unwrap();
          println!("python : {:?}", a);
          format!("python : {:?}", a)
        });
        Ok(hoge)
      }
      let dst = match f(&value["payload"]).await {
        Ok(n) => json!({ "code" : n, "success" : true }),
        Err(e) => json!({ "code" : 1, "success" : false, "detail" : format!(r##" "{e:?}" "##) })
      };
      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(serde_json::to_string(&dst).unwrap().as_bytes().to_vec())
        .unwrap()
      /*
        sucess : code 0
        throw new Exception() : code 1
        Couldn't find file : code 1
      */
    },
    _=> {
      huazhi::wry::http::Response::builder()
        .header(CONTENT_TYPE, "text/html")
        .body("a".as_bytes().to_vec())
        .unwrap()
    }
  }
}


pub fn event_handler(webview: &WebView, event:Event<'_, huazhi::UserEvent>, control_flow:&mut ControlFlow) {
  match event {
    Event::NewEvents(StartCause::Init) => {
      println!("{}","Init".green());
      println!("Init");
      /* reloadだと無視される */
      // let _ = webview.evaluate_script(&*include_str!("resource/app.js"));
    },
    Event::UserEvent(huazhi::UserEvent::Message(e)) => {
      let dst = format!("{} {}", "message".green(), e);
      println!("{dst}");
      let _ = webview.evaluate_script(&*format!("console.log('{dst}')"));
    },
    Event::UserEvent(huazhi::UserEvent::NewEvent(key, detail)) => {
      match key.as_str() {
        "get_state" => {

        },
        _=> {

        },
      }
      let dst = indoc::formatdoc! {r##"
        (()=>{{
          const raisedEvent = new CustomEvent('{key}', {{
            bubbles: false,
            cancelable: false,
            detail: {detail}
          }});
          window.chrome.webview.dispatchEvent(raisedEvent);
        }})();
      "##};
      let result = webview.evaluate_script(&*dst);
      println!("{result:?}");
      // webview.evaluate_script_with_callback(js, callback)
    },
    Event::UserEvent(huazhi::UserEvent::SubProcess(args)) => {
      println!("{} {:?}", "sub process".green(), args);
      match serde_json::from_value::<Vec<String>>(args) {
        Err(e) => { println!("{} {:?}", "sub process".red(), e);},
        Ok(n) => {
          let _dst = std::process::Command::new("powershell")
            .args(&n)
            .spawn().unwrap();
        },
      };
    },
    Event::UserEvent(huazhi::UserEvent::SubProcess2(args)) => {
      println!("{} {:?}", "sub process".green(), args);
      match serde_json::from_value::<Vec<String>>(args) {
        Err(e) => { println!("{} {:?}", "sub process".red(), e);},
        Ok(n) => {

          tokio::spawn(async move {
            let mut child = tokio::process::Command::new("powershell.exe")
            .args(&["-NoProfile", "-Command", "chcp 65001;", "ls"])
            .stdout( std::process::Stdio::piped())
            .spawn()
            .expect("failed to start sleep");

            let stdout = child.stdout.take().unwrap();
            let mut reader = FramedRead::new(stdout, MyDecoder);
          
            while let Some(line) = reader.next().await {
              let ret = line.unwrap();
              
            }
            println!("{:?}",child);
          });
        },
      };
    },
    Event::UserEvent(huazhi::UserEvent::Py(args)) => {
      println!("{} {:?}", "py".green(), args);
      match serde_json::from_value::<String>(args) {
        Err(e) => { println!("{} {:?}", "py".red(), e);},
        Ok(n) => {

          use pyo3::prelude::*;
          let _hoge = Python::with_gil(|py| {
            let sys = py.import_bound("sys").unwrap();
            sys.setattr("stdout", LoggingStdout.into_py(py)).unwrap();
            // sys.setattr("stdout", log.into_py(py)).unwrap();

            // let code = indoc::formatdoc! {r##"
            //   console.log({b});
            // "##};
            // let module = PyModule::from_code_bound(py, code.as_str(),"", "",).unwrap();
  
            let a = py.eval_bound(n.as_str(), None, None).unwrap();
            println!("python : {:?}", a);
            let b = format!("python : {:?}", a);
            let aaa = indoc::formatdoc! {r##"
              console.log({b});
            "##};
            let _result = webview.evaluate_script(&*aaa);
          });
        
        },
      };
    },
    Event::WindowEvent {
      event: WindowEvent::CloseRequested,
      ..
    } => {
      println!("{}","Exit".green());
      *control_flow = ControlFlow::Exit;
    },
    _ => {}
  }
}



#[pyo3::prelude::pyclass]
struct LoggingStdout;

#[pyo3::prelude::pymethods]
impl LoggingStdout {
  fn write(&self, data: &str) {
    println!("stdout from python: {:?}", data);
    // ipc
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