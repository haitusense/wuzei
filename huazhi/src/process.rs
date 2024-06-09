use anyhow::Context;
use colored::*;
use tokio_util::codec::*;
use futures::prelude::*;

/*
Powershell 
Set-ExecutionPolicy
  -ExecutionPolicy <ExecutionPolicy> : Bypass/Unrestricted 
*/

pub fn powershell(args: serde_json::value::Value) {
  println!("{} {:?}", "sub process".green(), args);
  match serde_json::from_value::<Vec<String>>(args) {
    Err(e) => { println!("{} {:?}", "sub process".red(), e);},
    Ok(n) => {
      let _dst = std::process::Command::new("powershell")
        .args(&n)
        .spawn().unwrap();  // .expect("failed")wait().unwrap();
    }
  }
}

pub async fn async_powershell() -> anyhow::Result<std::process::ExitStatus> {
  let dst = tokio::process::Command::new("powershell")
    .kill_on_drop(true)
    .args(&["dotnet", "script ./wait.csx"])
    .spawn().unwrap().wait().await;
  dst.context("context")
}

pub async fn async_process() {
  let mut child = tokio::process::Command::new("powershell.exe")
  // .args(&["-Command ", "[Console]::OutputEncoding"])
  // .args(&["-Command ", "chcp 65001; [Console]::OutputEncoding"])
  // .args(&["-NoProfile", "-Command", "chcp 65001;"])
  // .arg("yt-dlp.exe --list-formats --color=always 'https://www.youtube.com/watch?v=whHNEb1ey1A'")
  .args(&["-NoProfile", "-Command", "chcp 65001;", "ls"])
  .stdout(std::process::Stdio::piped())
  .spawn()
  .expect("failed to start sleep");
  
  let stdout = child.stdout.take().unwrap();
  // let mut reader = FramedRead::new(stdout, LinesCodec::new());
  let mut reader = FramedRead::new(stdout, MyDecoder);

  while let Some(line) = reader.next().await {
    print!("{}", line.unwrap());
  }

  println!("{:?}",child);
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

#[allow(dead_code)]
fn run_powershell<F>(func: F) -> anyhow::Result<std::process::ExitStatus> where F: FnOnce(String) -> String {
  use std::io::Write;
  
  let temp = tempfile::tempdir().unwrap();
  let path = temp.path().to_string_lossy().into_owned();
  let file_path = format!(r"{path}\_temp.ps1");

  println!("{} {}", "create temp dir".green(), path);
  println!("{} {}", "create temp file".green(), file_path);
  {
    let mut buffer = std::fs::File::create(&file_path).unwrap();
    write!(&mut buffer, "{}", func(path)).unwrap();  
  }

  println!("{}", "run powershell process...".green());
  let dst = std::process::Command::new("powershell")
    .args(&["-ExecutionPolicy", "Bypass", "-File", file_path.as_str()])
    .spawn().unwrap()
    .wait().unwrap();
  println!("{} {:?}", "cleaning up temp dir".green(), temp);
  // std::fs::Fileから解放、wait()で待つをしないとロック or リリースされてしまう

  Ok(dst)
}

#[cfg(test)]
mod tests {

  #[tokio::test]
  async fn tokio_test() {
    use colored::*;
    let mut child = tokio::process::Command::new("powershell")
    .kill_on_drop(true)
    .args(&["dotnet", "script ../wait.csx"])
    .spawn().unwrap();
  
    let a = child.wait().await;

    tokio::spawn(async move {
      tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    });
    println!("{:?}",a);
    // for i in 1..5 {
    //   println!("{} {}", "cnt".red(), i);
    //   tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    // }
    // child.kill().await.unwrap();
    // drop(child);
    for i in 6..10 {
      println!("{} {}", "cnt".red(), i);
      tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
  }

  #[test]
  fn it_works() {
    let a = r##"["a", "b", "c"]"##;
    let _dst = serde_json::from_str::<Vec<String>>(a);

    let a = r##"["a", "b", "c"]"##;
    let dst = serde_json::from_str::<Vec<String>>(a);
    println!("{:?}", dst)
  }

  #[test]
  fn it_works2() {
    use colored::*;
    let path = std::env::current_dir().unwrap();
    println!("starting dir: {}", path.display());

    let mut child = tokio::process::Command::new("powershell")
    .kill_on_drop(true)
    .args(&["dotnet", "script ../wait.csx"])
    .spawn().unwrap();

    let rt = tokio::runtime::Runtime::new().unwrap();
    let future = async move {
      for i in 1..5 {
        println!("{} {}", "cnt".red(), i);
        std::thread::sleep(std::time::Duration::from_secs(1));
      }
      child.kill().await.unwrap();
      drop(child);
    };
    rt.block_on(future);

    for i in 1..5 {
      println!("{} {}", "cnt".red(), i);
      std::thread::sleep(std::time::Duration::from_secs(1));
    }
  }
}