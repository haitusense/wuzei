#[cfg(windows)]
extern crate windres;
use windres::Build;  

fn main() {  
  Build::new().compile("src/wuzei.rc").unwrap();  
}