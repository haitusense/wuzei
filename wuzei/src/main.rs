#![windows_subsystem = "windows"] // CLIを表示しない（アタッチされないので標準出力は出ない）
mod logic;
use logic::*;

use clap::Parser;
use serde::{Serialize, Deserialize};
use anyhow::Context;
use colored::*;
use include_dir::{include_dir, Dir};
use huazhi::wry::{
  application::{
    event_loop::{ControlFlow, EventLoopBuilder},
    window::WindowBuilder,
  },
  webview::WebViewBuilder,
};
use huazhi::{HuazhiDir, HuazhiBuilder};
use serde_json::json;

#[derive(clap::ValueEnum, Serialize, Deserialize, Clone, Debug)]
enum ConsoleType {
  AllocConsole,
  AttachConsole
}

#[derive(clap::Parser, Serialize, Deserialize, Debug, Clone)]
#[command(author, version, about, long_about = None)]
struct Args {
  #[arg(value_enum, short, long)]
  console_type: Option<ConsoleType>,

  #[arg(short, long)]
  working_dir: Option<String>,

  #[arg(short, long)]
  start_url: Option<String>,

  #[arg(short, long, default_value=r#"["app.js"]"#)]
  register_javascript: String,

  #[arg(short, long, default_value="wuzeiNamedPipe")]
  namedpipe: String,

  #[arg(short, long, default_value="wuzeiMemoryMapped")]
  memorymapped: String
}

impl Args {

  #[allow(dead_code)]
  pub fn to_value(&self) -> anyhow::Result<serde_json::Value> {
    Ok(serde_json::to_value(&self).context("err")?)
  }

  /* `--help` オプションが渡された場合コンソールをアタッチ */
  pub fn parse_with_attach_console() -> Self {
    if std::env::args().any(|arg| arg == "--help" || arg == "-h" || arg == "--version" || arg == "-V" ) {
      unsafe { huazhi::console::attach_console(); }
    }
    let args = Args::parse();

    match args.console_type {
      Some(ConsoleType::AllocConsole) => unsafe { huazhi::console::alloc_console(); },
      Some(ConsoleType::AttachConsole) => unsafe { huazhi::console::attach_console(); },
      _=>{ }
    };    

    args
  }
  
}

/* read resource */

static RESOURCE: Dir = include_dir!("$CARGO_MANIFEST_DIR/src/resource");

use std::sync::Mutex;
static ARGS: std::sync::OnceLock<Mutex<Args>> = std::sync::OnceLock::new();
fn get_args() -> &'static Mutex<Args> {
  ARGS.get_or_init(|| Mutex::new(Args::parse_with_attach_console()))
}
static HEADER: std::sync::OnceLock<std::sync::Mutex<serde_json::Value>> = std::sync::OnceLock::new();
fn get_header() -> &'static Mutex<serde_json::Value> {
  HEADER.get_or_init(|| Mutex::new(json!({ "width": 0, "height": 0 })))
}
static MMF: std::sync::OnceLock<std::sync::Mutex<huazhi::memorymappedfile::MemoryMappedFileCreator>> = std::sync::OnceLock::new();
fn get_mmf() -> &'static Mutex<huazhi::memorymappedfile::MemoryMappedFileCreator> {
  MMF.get_or_init(|| Mutex::new(huazhi::memorymappedfile::MemoryMappedFileCreator::new(get_args().lock().unwrap().memorymapped.as_str(), 320*240*4).unwrap()))
}

pub fn mmf_init(width:usize, height:usize){
  let json = json!({ "width" : width, "height": height });
  let mut json_str = serde_json::to_string(&json).unwrap();
  json_str.push('\0');
  
  let mut header = get_header().lock().unwrap();
  *header = json;

  let mut mmf_body = get_mmf().lock().unwrap();
  mmf_body.resize(width * height * 4).unwrap();
}


#[tokio::main]
async fn main() -> anyhow::Result<()> {
  let args = get_args().lock().unwrap().clone();

  /* setting */
  println!("{}", "set window".blue());
  let event_loop = EventLoopBuilder::<huazhi::UserEvent>::with_user_event().build();

  mmf_init(320, 240);
  huazhi::memorymappedfile::mmf_image::init_image(args.memorymapped.as_str(), 320, 240);

  let window = WindowBuilder::new()
    .with_title("wuzei")
    .with_window_icon(RESOURCE.get_icon("image/icon.png"))
    .build(&event_loop).context("err")?;

  {
    println!("{} {}", "resist pipe".blue(), args.namedpipe.as_str());
    let proxy = event_loop.create_proxy();
    let path = args.namedpipe.as_str().to_owned();
    tokio::spawn(async move {
      loop {
        match huazhi::namedpipe::pipe_validate(path.as_str(), |res| { 
          if serde_json::from_str::<serde_json::Value>(res).is_ok() {
            let hoge = get_header().lock().unwrap().clone();
            let json = serde_json::to_string(&hoge).unwrap();
            Some(json) 
          } else { 
            None 
          }
        }).await {
          Ok(n) => {
            println!("{} {}","pipe received".green(), n);
            if proxy.send_event(huazhi::UserEvent::NewEvent("namedPipe".to_string(), format!("{n}"))).is_err() { 
              println!("{} {:?}", "error pipe".red(), "proxy");
              break;
            }
          },
          Err(e) => { 
            println!("{} {:?}", "error pipe".red(), e);
            continue;
          }
        }
      }
      println!("{}", "exit pipe".blue())
    });
  }

  /* setting webview */
  let webview = WebViewBuilder::new(window).context("err")?
    .with_devtools(true)
    .with_hotkeys_zoom(true)
    .resist_javascript(RESOURCE.get_contents_from_json(args.register_javascript.as_str()))
    .resist_handler(&event_loop)
    .resist_navigate("wuzei", args.working_dir, args.start_url).context("err")?
    // .resist_pipe_handler(&event_loop, args.namedpipe.as_str())
    .with_asynchronous_custom_protocol("wuzei".into(), move |request: huazhi::wry::http::Request<Vec<u8>>, responder| {
      tokio::spawn(async move {
        let res = match request.uri().path() {
          n if n.starts_with("/resource") => huazhi::async_custom_protocol_resource(&RESOURCE, n.trim_start_matches("/resource/")).await,
          n if n.starts_with("/local") => huazhi::async_custom_protocol_local(n.trim_start_matches("/local/")).await,
          "/data" => logic::async_custom_protocol_data(request).await,
          _=> huazhi::async_custom_protocol_err(request.uri().path()).await  
        };
        responder.respond(res);
      });
    })
    .build().context("err")?;

  /* setting event_loop */
  println!("{}", "run event_loop".blue());
  event_loop.run(move |event, _, control_flow| {
    *control_flow = ControlFlow::Wait;
    event_handler(&webview, event, control_flow);
  });

}