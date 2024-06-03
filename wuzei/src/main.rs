#![windows_subsystem = "windows"] // CLIを表示しない（アタッチされないので標準出力は出ない）
mod logic;

use clap::Parser;
use serde::{Serialize, Deserialize};
use anyhow::Context;
use colored::*;
use include_dir::{include_dir, Dir};
use huazhi::{HuazhiDir, HuazhiBuilder};

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

static APPNAME: &str = "wuzei";
static RESOURCE: Dir = include_dir!("$CARGO_MANIFEST_DIR/src/resource");

use std::sync::Mutex;

static ARGS: std::sync::OnceLock<Mutex<Args>> = std::sync::OnceLock::new();
static PX: std::sync::OnceLock<Mutex<huazhi::tao::event_loop::EventLoopProxy<huazhi::event_handler::UserEvent>>> = std::sync::OnceLock::new();

fn get_args() -> &'static Mutex<Args> { ARGS.get_or_init(|| Mutex::new(Args::parse_with_attach_console())) }


#[tokio::main]
async fn main() -> anyhow::Result<()> {
  let args = get_args().lock().unwrap().clone();

  /* setting */
  println!("{}", "set window".blue());
  let event_loop = huazhi::tao::event_loop::EventLoopBuilder::<huazhi::event_handler::UserEvent>::with_user_event().build();
  let proxy_mutex = std::sync::Arc::new(std::sync::Mutex::new(event_loop.create_proxy()));
  PX.get_or_init(|| Mutex::new(event_loop.create_proxy()));

  let window = huazhi::tao::window::WindowBuilder::new()
    .with_title(APPNAME)
    .with_window_icon(RESOURCE.get_icon("image/icon.png"))
    .build(&event_loop).context("err")?;

  println!("{}", "set mmf".blue());
  logic::mmf_init(320, 240);

  println!("{}", "set namedpipe".blue());  
  huazhi::namedpipe::pipe_builder(args.namedpipe, event_loop.create_proxy(), |res| { 
    if serde_json::from_str::<serde_json::Value>(res).is_ok() {
      let hoge = get_args().lock().unwrap().clone();
      let json = serde_json::to_string(&hoge).unwrap();
      Some(json)
    } else { 
      None
    }
  }).unwrap();

  /* setting webview */
  let webview = huazhi::wry::WebViewBuilder::new(&window)
    .with_devtools(true)
    .with_hotkeys_zoom(true)
    .resist_javascript(RESOURCE.get_contents_from_json(args.register_javascript.as_str()))
    .resist_handler(&event_loop)
    .resist_navigate(APPNAME, args.working_dir, args.start_url).context("err")?
    .with_asynchronous_custom_protocol(APPNAME.into(), move |request: huazhi::wry::http::Request<Vec<u8>>, responder| {
      use logic::custom_protocol::*;
      let proxy_mutex_clone = proxy_mutex.clone();
      tokio::spawn(async move {
        let res = match request.uri().path() {
          n if n.starts_with("/resource") => huazhi::custom_protocol::async_custom_protocol_resource(&RESOURCE, n.trim_start_matches("/resource/")).await,
          n if n.starts_with("/local") => huazhi::custom_protocol::async_custom_protocol_local(n.trim_start_matches("/local/")).await,
          "/api" => async_custom_protocol_api(request, proxy_mutex_clone).await,
          _=> huazhi::custom_protocol::async_custom_protocol_err(request.uri().path()).await
        };
        responder.respond(res);
      });
    })
    .build().context("err")?;

  /* setting event_loop */
  println!("{}", "run event_loop".blue());
  let mut state: logic::event_handler::State = logic::event_handler::State::default();
  event_loop.run(move |event, _, control_flow| {
    *control_flow = huazhi::tao::event_loop::ControlFlow::Wait;
    huazhi::event_handler::event_handler(&webview, &window, event, control_flow, |e| {
      logic::event_handler::reducer(&mut state, e)
    });
  });

}