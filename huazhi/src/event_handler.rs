use colored::Colorize;
use tao::{
  event_loop::ControlFlow,
  event::{Event, StartCause, WindowEvent}
};
use wry::WebView;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct Message{
  #[serde(rename = "type")]
  pub type_name: String,
  pub payload: serde_json::Value
}

#[derive(Debug)]
pub enum UserEvent {
  Title(serde_json::Value),
  Log(serde_json::Value),
  NewEvent(WebviewEvent, String),
  TerminalMessage(String),
  TerminalPrompt(),
  WindowMove(serde_json::Value),
  TerminalTest(serde_json::Value),
  State(serde_json::Value),
  Sleep(serde_json::Value),
  Unknown(Message),
}

#[derive(Debug, PartialEq, strum::EnumString, strum::Display)]
#[strum(serialize_all = "camelCase")]
pub enum WebviewEvent {
  Write,
  Prompt,
  Updated,
  NewWindowReq,
  NamedPipe
}

/*
  ipc_handler内でproxy_ipc.send_event(UserEvent::TerminalMessage();の繰り返し
    -> lockしてるのでUserEventは後でまとめて実行される
　event_handler内でraise_event!(webview, "write", i);
    -> うごく
　event_handler内でwebview.evaluate_script("console.log()") (コンソールにアタッチ済み)
    -> eventが被るので後でまとめて実行される
*/
pub fn ipc_handler(arg: wry::http::Request<String>, proxy_ipc: &tao::event_loop::EventLoopProxy<UserEvent>){
  let src: Message = match serde_json::from_str::<Message>(&arg.body()) {
    Ok(n) => n,
    Err(e) => {
      println!("{} {}", "ipc_handler err".red(), e);
      Message::default()
    }
  };
  match src.type_name.as_str() {
    "log" => { let _ = proxy_ipc.send_event(UserEvent::Log(src.payload)).unwrap(); },
    "title" => { let _ = proxy_ipc.send_event(UserEvent::Title(src.payload)).unwrap(); },
    "message" => { let _ = proxy_ipc.send_event(UserEvent::TerminalMessage(format!("{:?}", src.payload))).unwrap(); },
    "windowmove" => { let _ = proxy_ipc.send_event(UserEvent::WindowMove(src.payload)).unwrap(); },
    "key_test" => { let _ = proxy_ipc.send_event(UserEvent::TerminalTest(src.payload)).unwrap(); },
    "sleep" => { let _ = proxy_ipc.send_event(UserEvent::Sleep(src.payload)).unwrap(); },
    "state" => { let _ = proxy_ipc.send_event(UserEvent::State(src.payload)).unwrap(); },
    _ => { let _ = proxy_ipc.send_event(UserEvent::Unknown(src)).unwrap(); },
    // _ => println!("{} {:?}","unknown".red(), src)
  };
}

/* macro */

// raise_event!(wv, "aa", "{'object' : 3}");
// raise_event!(wv, "aa", "'string'");
// raise_event!(wv, key, 3);
// raise_event!(wv, key, true);

#[macro_export]
macro_rules! raise_event {
  ( $wv:expr, $key:expr, $detail:expr ) => {
    let _ = $wv.evaluate_script(&*indoc::formatdoc! { r###"
      (function (){{
        const raisedEvent = new CustomEvent('{}', {{
          bubbles: false,
          cancelable: false,
          detail: {}
        }});
        window.chrome.webview.dispatchEvent(raisedEvent);
      }}());
    "###, $key, $detail } );
  };
}

fn move_pos(window: &tao::window::Window, json: &serde_json::Value) -> anyhow::Result<()> {
  let x = json["x"].as_i64().expect("not found key") as i32;
  let y = json["y"].as_i64().expect("not found key") as i32;
  let width = json["width"].as_i64().expect("not found key") as i32;
  let height = json["height"].as_i64().expect("not found key") as i32;

  let pos = wry::dpi::PhysicalPosition::new(x, y);
  window.set_outer_position(wry::dpi::Position::Physical(pos));
  window.set_inner_size(wry::dpi::PhysicalSize::new(width, height));
  Ok(())
}
/*  */

pub fn event_handler<F>(webview: &WebView, window: &tao::window::Window, event: Event<'_, UserEvent>, control_flow: &mut ControlFlow, func: F)
where F: FnOnce(Message) -> serde_json::Value {
  match event {
    /* reloadだと無視される */
    Event::NewEvents(StartCause::Init) => {
      println!("{}","Init".green());
      let code = indoc::indoc! { r###"
        (function (){
          const src = localStorage.getItem("windowStartupLocation");
          console.log('init in event_loop', src);
          if(src){
            window.ipc.postMessage(JSON.stringify({ type: 'windowmove', payload: JSON.parse(src) }));
          }
        }());
      "###};
      let _ = webview.evaluate_script(&*code);
    },

    Event::WindowEvent { event: WindowEvent::CloseRequested, .. } => {
      let pos = window.outer_position().unwrap();
      let size = window.inner_size();
      let json = serde_json::to_string(&serde_json::json!({
        "x": pos.x,
        "y": pos.y,
        "width": size.width,
        "height": size.height
      })).unwrap();
      let code = format!(r#"localStorage.setItem("windowStartupLocation", '{}');"#, json);
      let _ = webview.evaluate_script(&*code);

      let _ = webview.evaluate_script_with_callback(&*indoc::formatdoc! {r###"

      "###}, |e|{
        println!("{} {}","Exit".green(), e);
      });

      // webview.clear_all_browsing_data() // クッキーやローカルストレージなど）

      println!("{} {}","Exit".green(), json);
      *control_flow = ControlFlow::Exit;
    },
    Event::WindowEvent { event: WindowEvent::Moved(_pos), .. } => {
    },
    Event::WindowEvent { event: WindowEvent::Resized(_size), .. } => {
    },

    Event::UserEvent(UserEvent::Title(e)) => {
      let src : String = serde_json::from_value(e).unwrap();
      window.set_title(src.as_str());
    },
    Event::UserEvent(UserEvent::Log(e)) => {
      let src : Vec<String> = serde_json::from_value(e).unwrap();
      println!("{} {}", src[0].magenta(), src[1]);
    },
    Event::UserEvent(UserEvent::TerminalMessage(e)) => {
      let json = serde_json::json!(e).to_string();
      raise_event!(webview, WebviewEvent::Write.to_string(), json);
    },
    Event::UserEvent(UserEvent::NewEvent(key, detail)) => {
      raise_event!(webview, key, detail);
      println!("NewEvent : {detail:?}");
    },
    Event::UserEvent(UserEvent::TerminalPrompt()) => { raise_event!(webview, WebviewEvent::Prompt.to_string(), "{}"); },
    Event::UserEvent(UserEvent::WindowMove(e)) => {
      match move_pos(window, &e) {
        Ok(()) => {},
        Err(e) => println!("{} {}", "err".red(), e)
      };
    },

    Event::UserEvent(UserEvent::TerminalTest(e)) => {
      let des: KeyEvent = serde_json::from_value::<KeyEvent>(e).unwrap();
      println!("{:?}", des);
      // let dst = key_event(des, term);
      // let _ = webview.evaluate_script(&*format!("window.wterm.write('{dst}')"));
    },
    Event::UserEvent(UserEvent::State(e)) => {
      /* ここでgrobalなValueの更新 */
      println!("state : {:?}", e);

      /* 結果の返却 */

      use std::{thread, time};
      let t = time::Duration::from_secs(1);
      for i in 0..3 {
        println!("{}", i);
        raise_event!(webview, WebviewEvent::Write.to_string(), i);
        thread::sleep(t);
      }
      raise_event!(webview, WebviewEvent::Prompt.to_string(), "{}");
    },
    Event::UserEvent(UserEvent::Sleep(e)) => {
      println!("sleep : {:?}", e);
      let _ = webview.evaluate_script_with_callback(indoc::indoc! {r###"
        (function(){ return { a: 1, b: 2 } }())
      "###}, |n|{ println!("callback test {}", n) }); // {"a":1,"b":2}
      use std::{thread, time};
      let t = time::Duration::from_secs(1);
      for i in 0..3 {
        println!("{}", i);
        // このなかのconsole.logからコンソールへのアタッチはeventが被ってるのでまとめて処理される
        // 直接 ```term.write```みたいにユーザー関数呼ぶより、eventにした方が依存方向として素直
        raise_event!(webview, WebviewEvent::Write.to_string(), i);
        thread::sleep(t);
      }
      raise_event!(webview, WebviewEvent::Prompt.to_string(), "{}");
    },
    Event::UserEvent(UserEvent::Unknown(e)) => {
      let _ = func(e);
      raise_event!(webview, WebviewEvent::Prompt.to_string(), "{}");
    },
    _ => {}
  }
}



#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct KeyEvent{
  altKey : bool,
  ctrlKey : bool,
  metaKey : bool,
  shiftKey : bool,
  key : String,
  charCode : i32,
  code : String,
  keyCode : i32,
  selection : String
}

pub struct Terminal{
  pub protcol : String,
  pub current_line: String,
  pub pos : usize
}

fn _key_event(e:KeyEvent, term:&mut Terminal) -> String {
  match (e.shiftKey,e.ctrlKey,e.altKey,e.key.as_str()) {
    (_,false,_,"ArrowLeft") => { if term.pos > 0 { term.pos -= 1 } },
    (_,false,_,"ArrowRight") =>{
      if term.pos < term.current_line.len() {
        term.pos += 1;
      }
    },
    (_,_,_,"Backspace") =>{
      if term.pos > 0 { 
        term.current_line.remove(term.pos - 1);
        term.pos -= 1;
      }
    },
    (_,_,_,"Home") | (_,true,_,"ArrowLeft") => { term.pos = 0; },
    (_,_,_,"End") | (_,true,_,"ArrowRight") => { term.pos = term.current_line.len(); }
    
    (_,true,_,"c") => {
      clipboard_win::set_clipboard_string(&e.selection).unwrap();
      // term.pos = term.current_line.len();
    }
    (_,true,_,"v") => { 
      let result: String = clipboard_win::get_clipboard(clipboard_win::formats::Unicode).unwrap();
      term.current_line.insert_str(term.pos, result.as_str());
      term.pos += result.len();
    },
    // (_,_,_,"Enter") => {
    //   let hoge = term.current_line.to_string();
    //   term.current_line = "".to_string();
    //   term.pos = 0;
    //   // let _ = webview.evaluate_script(&*format!("window.wterm.writeln('')"));
    //   // let _ = webview.evaluate_script(&*format!("window.wterm.send('{hoge}')"));
    // }
    (_,_,_,_)=>{
      term.current_line.insert_str(term.pos, e.key.as_str());
      term.pos += 1;
    }
  };

  // 構文解析
  let buf = match term.current_line.split_whitespace().next() {
    Some(n) => term.current_line.replacen(n, format!("\x1b[33m{}\x1b[0m", n).as_str(), 1),
    None => term.current_line.to_owned()
  };
  let dst = format!("\x1b[0G\x1b[2K{}{}\x1b[{}G", term.protcol, buf, term.pos + term.protcol.len() + 1);
  dst
  

}
