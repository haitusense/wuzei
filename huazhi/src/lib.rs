pub extern crate wry;
pub mod namedpipe;
pub mod memorymappedfile;
pub mod process;
mod test;

use colored::*;
use anyhow::Context as _;
use serde::{Serialize, Deserialize};
use include_dir::Dir;
use serde_json::json;
use wry::{
  application::event_loop::EventLoop,
  webview::WebViewBuilder,
  http::{header::CONTENT_TYPE, StatusCode},
};

#[macro_export]
macro_rules! debug {
  ($fmt:expr, $($arg:tt)*) => { if cfg!(debug_assertions) { 
    use colored::*;
    println!("{}", format!($fmt, $($arg)*).on_blue()); 
  } }
}

pub mod console {

  pub unsafe fn alloc_console() {
    let _ = windows::Win32::System::Console::AllocConsole();
    let handle = windows::Win32::System::Console::GetStdHandle(windows::Win32::System::Console::STD_OUTPUT_HANDLE).unwrap();
    let mut lpmode : windows::Win32::System::Console::CONSOLE_MODE = Default::default();
    let _ = windows::Win32::System::Console::GetConsoleMode(handle, &mut lpmode);
    let _ = windows::Win32::System::Console::SetConsoleMode(handle, lpmode | windows::Win32::System::Console::ENABLE_VIRTUAL_TERMINAL_PROCESSING);
  }
  
  pub unsafe fn attach_console() {
    let _ = windows::Win32::System::Console::AttachConsole(u32::MAX);
  }

}

pub trait HuazhiDir {
  fn get_icon(&self, key: &str) -> Option<wry::application::window::Icon>;
  fn get_contents(&self, keys:Vec<String>) -> impl Iterator<Item=(String, &str)>;
  fn get_contents_from_json(&self, json:&str) -> impl Iterator<Item=(String, &str)>;
}

impl<'a> HuazhiDir for include_dir::Dir<'a> {
  fn get_icon(&self, key: &str) -> Option<wry::application::window::Icon> {
    // include_bytes!("image/icon.png")
    match image::load_from_memory(self.get_file(key)?.contents()) {
      Ok(rgba) => {
        let width = rgba.width();
        let height = rgba.height();
        wry::application::window::Icon::from_rgba(rgba.into_bytes(), width, height).ok()
      },
      Err(e) => {
        println!("{e:?}");
        None
      }
    }
  }
  fn get_contents(&self, keys:Vec<String>) -> impl Iterator<Item=(String, &str)> {
    let dst = keys.into_iter().map(|key| {
      let content = self.get_file(key.clone()).unwrap().contents_utf8().unwrap();
      (key.clone(), content)
    });
    dst
  }
  fn get_contents_from_json(&self, json:&str) -> impl Iterator<Item=(String, &str)> {
    let vec = serde_json::from_str::<Vec<String>>(json).unwrap_or(vec![]);
    self.get_contents(vec)
  }
}


#[derive(Serialize, Deserialize, Default, Debug)]
pub struct Message{
  #[serde(rename = "type")]
  pub type_name: String,
  pub payload: serde_json::Value
}

#[derive(Debug)]
pub enum UserEvent {
  Message(String),
  SubProcess(serde_json::Value),
  NewEvent(String, String)
}

pub trait HuazhiBuilder : Sized {

  fn resist_javascript<'a>(self, src:impl Iterator<Item=(String, &'a str)>) -> Self;

  fn resist_navigate(self, name:&str, working_dir:Option<String>, url:Option<String>) -> anyhow::Result<Self>;

  fn resist_handler(self, event_loop:&EventLoop<UserEvent>) -> Self;

  fn resist_pipe_handler(self, event_loop:&EventLoop<UserEvent>, pipename:&str) -> Self;

  fn resist_async_protocol(self) -> Self;

}

impl<'w> HuazhiBuilder for WebViewBuilder<'w> {
  
  /*
    .with_initialization_script(&*include_str!("resource/rxjs.umd.min.js"))
      => include_dir::Dir -> impl Iterator<>
  */
  fn resist_javascript<'a>(self, src:impl Iterator<Item=(String, &'a str)>) -> Self {
    let dst = src.fold(self, |acc, (key, content)| { 
      println!("{} {}", "resist javascript".blue(), key);
      acc.with_initialization_script(&*content) 
    });
    dst
  } 
  
  /*
    cros対策でcustom_protocol通した遷移させた方がいい
  */
  fn resist_navigate(self, name:&str, working_dir:Option<String>, url:Option<String>) -> anyhow::Result<Self> {
    match working_dir {
      None => { },
      Some(n) => { std::env::set_current_dir(&n)?; }
    };
    let path = std::env::current_dir().context("context")?;
    println!("{} {}", "current dir".blue(), path.display());
    println!("{} {:?}", "start_url".blue(), url);
    let dst = match url {
      None => {
        // let html = include_str!("index_vue.html");
        // self.with_html(html)
        self.with_url(format!("http://{name}.localhost/resource/index.html").as_str())
      },
      Some(n) if n.starts_with("https://") || n.starts_with("http://") => {
        self.with_url(n.as_str())
      },
      Some(n) => {
        self.with_url(format!("http://{name}.localhost/resource/{n}").as_str())
        // let content = std::fs::read_to_string(&n).expect("could not read file");
        // self.with_html(content)
      }
    };
    Ok(dst.context("failed navigate")?)
  }
  
  /* 
    - wry0.35からWindowの引数がなくなりargのみ
    - with_file_drop_handlerはwith_new_window_req_handlerの発火を阻害するので使用できない
        .with_file_drop_handler(move |_window, event|{
          match event {
            wry::webview::FileDropEvent::Dropped { paths, position } => { println!("{paths:?} {position:?}"); },
            _=>{ }
          }
          false
        })
  */
  fn resist_handler(self, event_loop:&EventLoop<UserEvent>) -> Self {
    println!("{} {}", "resist".blue(), "handler");
    let proxy_req = event_loop.create_proxy();
    let proxy_ipc = event_loop.create_proxy();
    self
      .with_navigation_handler(move |url| {
        let dst = match url {
          n if n.starts_with("data:") => "raw html".to_string(),
          n if n.starts_with("http://") || n.starts_with("https://") => n,
          _=> "unknown".to_string()
        };
        println!("{} {}", "navigation".green(), dst);
        true
      })
      .with_new_window_req_handler(move |event|{
        let dst = serde_json::to_string(& match event {
          n if n.starts_with("http") => json!({"type" : "http", "payload": n}),
          n if n.starts_with("file") => {
            let path = urlencoding::decode(n.replace("file:///", "").as_str()).to_owned().unwrap().to_string();
            json!({"type" : "file", "payload": path })
          },
          _=> json!({"type" : "unknown", "payload": event })
        }).unwrap();
        let _ = proxy_req.send_event(UserEvent::NewEvent("newWindowReq".to_string(), dst)).unwrap();
        false // 後に続く動作を止める
      })
      .with_ipc_handler(move |_window, arg| {
        let src: Message = match serde_json::from_str::<Message>(&arg) {
          Ok(n) => n,
          Err(e) => {
            println!("err {e}");
            Message::default()
          }
        };
        match src.type_name.as_str() {
          "message" => { let _ = proxy_ipc.send_event(UserEvent::Message(format!("{:?}",src.payload))).unwrap(); },
          "process" => { let _ = proxy_ipc.send_event(UserEvent::SubProcess(src.payload)).unwrap(); },
          _ => println!("{src:?}")
        };
      })
  }
  
  fn resist_pipe_handler(self, event_loop:&EventLoop<UserEvent>, pipename:&str) -> Self {
    println!("{} {}", "resist pipe".blue(), pipename);
    let proxy = event_loop.create_proxy();
    let path = pipename.to_owned();
    tokio::spawn(async move {
      loop {
        match namedpipe::pipe(path.as_str()).await {
          Ok(namedpipe::ReturnEnum::Ok(n)) => {
            println!("{} {}","pipe received".green(), n);
            if proxy.send_event(UserEvent::NewEvent("namedPipe".to_string(), format!("{n}"))).is_err() { 
              // anyhow::bail!("proxy err") 
              // println!("");
              println!("{} {:?}", "error pipe".red(), "proxy");
              break;
            }
          },
          Ok(namedpipe::ReturnEnum::Continue) => { continue; },
          Err(e) => { 
            // anyhow::bail!(e)
            println!("{} {:?}", "error pipe".red(), e);
            break;
          }
        }
      }
      println!("{}", "exit pipe".blue())
    });
    self
  }

  /* 同期的ならwith_custom_protocolだけど
    .with_custom_protocol("wuzei".into(), move |request| {
      (match request.uri().path() {
        _=> {
          println!("custom protocol {:?} {:?}", StatusCode::NOT_FOUND, request.uri().path());
          huazhi::wry::http::Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Vec::new()) 
            .unwrap()
        }   
      }).map(Into::into)
    })
  */
  fn resist_async_protocol(self) -> Self {
    println!("{} {}", "resist".blue(), "async_custom_protocol");
    self.with_asynchronous_custom_protocol("wuzei".into(), move |request, responder| {
      tokio::spawn(async move {
        let res = match request.uri().path() {
          _=> {
            println!("custom protocol {:?} {:?}", StatusCode::NOT_FOUND, request.uri().path());
            wry::http::Response::builder()
              .status(StatusCode::NOT_FOUND)
              .body(Vec::new()) 
              .unwrap()
          }   
        };
        responder.respond(res);
      });
    })
  }
}


pub async fn async_custom_protocol_resource(resource: &Dir<'static>, url: &str) -> wry::http::Response<Vec<u8>> {
  println!("custom protocol resource path {:?}", url);
  let content = match resource.get_file(url){
    Some(n) => n.contents_utf8().unwrap(),
    None => {
      println!("{} {}", "get_file err".red(), url);
      ""
    }
  };
  let header = match url {
    n if n.ends_with(".js") => "text/javascript",
    n if n.ends_with(".html") => "text/html",
    n if n.ends_with(".css") => "text/css",
    _=> "text/plain"
  };
  
  wry::http::Response::builder()
    .header(CONTENT_TYPE, header)
    .body(content.to_string().as_bytes().to_vec())
    .unwrap()
}

pub async fn async_custom_protocol_local(url: &str) -> wry::http::Response<Vec<u8>> {
  println!("custom protocol local path {:?}", url);
  let content = std::fs::read_to_string(&url).expect("could not read file");
  wry::http::Response::builder()
    .header(CONTENT_TYPE, "text/html")
    .body(content.as_bytes().to_vec())
    .unwrap()
}

pub async fn async_custom_protocol_err(url: &str) -> wry::http::Response<Vec<u8>> {
  println!("custom protocol {:?} {:?}", StatusCode::NOT_FOUND, url);
  wry::http::Response::builder()
    .status(StatusCode::NOT_FOUND)
    .body(url.as_bytes().to_vec())
    .unwrap()
}


pub trait HuazhiRequestBuilder {
  fn respond_text(self, src: &str);
  fn respond_vec(self, src: Vec<u8>);
}

impl HuazhiRequestBuilder for wry::webview::RequestAsyncResponder {
  fn respond_text(self, src: &str) {
    let res = wry::http::Response::builder()
      .header(CONTENT_TYPE, "text/plain")
      .body(format!("{:?}", src).as_bytes().to_vec())
      .unwrap();
    self.respond(res);
  }
  fn respond_vec(self, src: Vec<u8>) {
    let res = wry::http::Response::builder()
      .header(CONTENT_TYPE, "application/octet-stream")
      .body(format!("{:?}", src).as_bytes().to_vec())
      .unwrap();
    self.respond(res);
  }
}


// "/async" => {
// println!("custom protocol {:?}", request.uri().path());
// let a = huazhi::process::async_powershell().await.unwrap();
// let dst = format!("{:?}",a);
// huazhi::wry::http::Response::builder()
//   .header(CONTENT_TYPE, "text/html")
//   .body(dst.as_bytes().to_vec())
//   .unwrap()