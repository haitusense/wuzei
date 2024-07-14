pub mod custom_protocol;
pub mod event_handler;

// #![feature(async_closure)]

/* log out */

struct MyDecoder;

impl tokio_util::codec::Decoder for MyDecoder {
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

