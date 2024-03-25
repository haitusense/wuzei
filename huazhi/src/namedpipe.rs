use tokio::net::windows::named_pipe::{ServerOptions, NamedPipeServer};
use tokio::io::Interest;
use anyhow::bail;

pub enum ReturnEnum {
  Ok(String),
  Continue,
}

pub async fn pipe(pipename:&str) -> anyhow::Result<ReturnEnum> {
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
  if ready.is_writable() {
    match server.try_write(b"Ok\r\n") {
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