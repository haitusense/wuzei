use colored::Colorize;
use huazhi::event_handler::Message;


#[derive(Debug, Clone, Copy)]
pub struct State {
  pub pos : usize
}

impl Default for State {
  #[inline]
  fn default() -> State {
    State {
      pos : 3
    }
  }
}

pub fn reducer(src: &mut State, val: Message) -> serde_json::Value {
  println!("{} {:?}", "reducer".on_green(), val);
  match val.type_name {
    _=> {}
  }
  src.pos += 1;

  return serde_json::json!({ "a" : src.pos });
}