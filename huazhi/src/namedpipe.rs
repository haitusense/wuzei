#![allow(deprecated)]

use tokio::net::windows::named_pipe::{ServerOptions, NamedPipeServer};
use tokio::io::Interest;
use anyhow::bail;

pub async fn pipe(pipename:&str) -> anyhow::Result<String> {
  pipe_validate(pipename, |res| { Some(res.to_owned()) }).await
}

pub async fn pipe_validate<F: Fn(&str)-> Option<String>>(pipename:&str, func:F) -> anyhow::Result<String> {
  let server : NamedPipeServer = ServerOptions::new().create(format!(r##"\\.\pipe\{pipename}"##).as_str())?;
  let _ = server.connect().await?;
  let res = pipe_read(&server).await?;
  // success, fail, error
  match func(&res) {
    Some(e) => pipe_write(&server, format!(r##"{{ "status" : "success", "detail" : {e} }}"##).as_str()).await?,
    None => pipe_write(&server, r##"{ "status" : "fail" }"##).await?
  }
  let _ = pipe_read(&server).await?;
  server.disconnect()?;
  Ok(res)
}

async fn pipe_read(server: &NamedPipeServer) -> anyhow::Result<String> {
  let mut buf = vec![0; 1024];  
  loop {
    let _ready = server.ready(Interest::READABLE).await?;
    let dst = match server.try_read(&mut buf) {
      Ok(n) => { String::from_utf8_lossy(&buf[0..n]).into_owned().trim().to_string() }
      Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => { continue; }
      Err(e) if e.kind() == std::io::ErrorKind::BrokenPipe => { bail!(e) }
      Err(e) => bail!(e)
    };
    return Ok(dst);
  }
}

async fn pipe_write(server: &NamedPipeServer, val:&str) -> anyhow::Result<()> {
  loop {
    let _ready = server.ready(Interest::WRITABLE).await?;
    match server.try_write(format!("{val}\r\n").as_bytes()) {
      Ok(_) => { /* println!("write {} bytes", n);*/ }
      Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => { continue; }
      Err(e) => bail!(e)
    }
    return Ok(());
  }
}

/*
is_readable == false
  パイプが切断されてるか : ErrorKind::WouldBlock
  読むデータがないか     : ErrorKind::BrokenPipe
*/
#[deprecated]
pub enum ReturnEnum {
  Ok(String),
  // Err(String),
  Continue,
}

#[deprecated]
pub async fn old_pipe(pipename:&str) -> anyhow::Result<ReturnEnum> {
  old_pipe_validate(pipename, |res| { Some(&res) }).await
}

#[deprecated]
pub async fn old_pipe_validate<F: FnOnce(&str)-> Option<&str> >(pipename:&str, func:F) -> anyhow::Result<ReturnEnum> {
  let server : NamedPipeServer = ServerOptions::new().create(format!(r##"\\.\pipe\{pipename}"##).as_str())?;
  let _connected = server.connect().await?;
  println!("connect");
  let ready = server.ready(Interest::READABLE).await?;
  let mut dst = String::new();
  let mut buf = vec![0; 1024];
  if ready.is_readable() { 
    dst = match server.try_read(&mut buf) {
      Ok(n) => { String::from_utf8_lossy(&buf[0..n]).into_owned().trim().to_string() }
      Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => { return Ok(ReturnEnum::Continue); }
      Err(e) => bail!(e)
    }
  }
  let ready = server.ready(Interest::WRITABLE).await?;
  let res = func(&dst);
  if ready.is_writable() {
    match server.try_write(if res.is_some() { b"Ok\r\n" } else { b"Err\r\n" } ) {
      Ok(_) => { /* println!("write {} bytes", n);*/ }
      Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => { return Ok(ReturnEnum::Continue); }
      Err(e) => bail!(e)
    }
  }
  let start_time = tokio::time::Instant::now();
  loop {
    // 切るの早すぎて、c#側で受信待てないのでtry_readで0になるまで待機
    // If n is 0, then it can indicate one of two scenarios:
    //   1. The pipe’s read half is closed and will no longer yield data.
    //   2. The specified buffer was 0 bytes in length.
    let end_time = tokio::time::Instant::now();
    if end_time - start_time > tokio::time::Duration::from_millis(1) { break; }
    let ready = server.ready(Interest::READABLE).await?;
    if ready.is_readable() {
      match server.try_read(&mut buf) {
        Ok(n) => { println!("disconnect {n}"); break; }
        Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => { continue; }
        Err(e) => { println!("disconnect {:?}", e); break; }
      };
    }
  }
  server.disconnect()?;
  Ok(ReturnEnum::Ok(dst))
}


/* 別スレッド
  std::thread::spawn(move ||{})
  tokio::spawn(async move { back_ground_worker(&proxy_3); });
  let proxy = event_loop.create_proxy();
  tokio::spawn(async move { 
    back_ground_worker_pipe(&proxy, args.namedpipe).await.unwrap();
  });
*/

#[allow(dead_code)]
pub fn back_ground_worker(proxy:&wry::application::event_loop::EventLoopProxy<super::UserEvent>) {
  loop {
    let now = std::time::SystemTime::now()
      .duration_since(std::time::SystemTime::UNIX_EPOCH)
      .unwrap()
      .as_millis();
    if proxy.send_event(super::UserEvent::Message(format!("{now}"))).is_err() { break; }
    std::thread::sleep(std::time::Duration::from_secs(1));
  }
}