use colored::*;
use include_dir::Dir;

pub enum ResContent<'a> {
  TXT(&'a str),
  JSON(&'a serde_json::Value),
  JAVASCRIPT(&'a str),
  HTML(&'a str),
  CSS(&'a str),
  BYTES(&'a [u8]),
  IMAGE(Vec<u8>),
}

impl<'a> ResContent<'a> {
  fn to_header(&self) -> &str {
    match self {
      ResContent::TXT(_) => "text/plain",
      ResContent::JSON(_) => "application/json",
      ResContent::JAVASCRIPT(_) => "text/javascript",
      ResContent::HTML(_) => "text/html",
      ResContent::CSS(_) => "text/css",
      ResContent::BYTES(_) => "application/octet-stream",
      ResContent::IMAGE(_) => "image/png"
    }
  }
  fn to_body(&self) -> Vec<u8> {
    match self {
      ResContent::TXT(n) => n.as_bytes().to_vec(),
      ResContent::JSON(n) => serde_json::to_string(&n).unwrap().as_bytes().to_vec(),
      ResContent::JAVASCRIPT(n) => n.as_bytes().to_vec(),
      ResContent::HTML(n) => n.as_bytes().to_vec(),
      ResContent::CSS(n) => n.as_bytes().to_vec(),
      ResContent::BYTES(n) => n.to_vec(),
      ResContent::IMAGE(n) => n.to_owned()
    }
  }
}


pub fn response(content:ResContent) -> wry::http::Response<Vec<u8>> {
  wry::http::Response::builder()
    .header(wry::http::header::CONTENT_TYPE, content.to_header())
    .status(wry::http::status::StatusCode::OK)
    .body(content.to_body())
    .unwrap()
}

pub fn response_400(content:ResContent) -> wry::http::Response<Vec<u8>> {
  wry::http::Response::builder()
    .header(wry::http::header::CONTENT_TYPE, content.to_header())
    .status(wry::http::status::StatusCode::BAD_REQUEST)
    .body(content.to_body())
    .unwrap()
}

pub fn response_500(content:ResContent) -> wry::http::Response<Vec<u8>> {
  wry::http::Response::builder()
    .header(wry::http::header::CONTENT_TYPE, content.to_header())
    .status(wry::http::status::StatusCode::INTERNAL_SERVER_ERROR)
    .body(content.to_body())
    .unwrap()
}

pub async fn async_custom_protocol_resource(resource: &Dir<'static>, url: &str) -> wry::http::Response<Vec<u8>> {
  println!("{} resource path {:?}", "custom protocol".on_green(), url);
  match resource.get_file(url) {
    Some(n) => {
      let content = n.contents_utf8().unwrap();
      let dst = match url {
        n if n.ends_with(".js") => ResContent::JAVASCRIPT(content),
        n if n.ends_with(".html") => ResContent::HTML(content),
        n if n.ends_with(".css") => ResContent::CSS(content),
        _=> ResContent::TXT(content)
      };
      response(dst)
    },
    None => {
      println!("{} {}", "get_file err".red(), url);
      wry::http::Response::builder()
      .status(wry::http::status::StatusCode::NOT_FOUND)
      .body(url.as_bytes().to_vec())
      .unwrap()
    }
  }
}

pub async fn async_custom_protocol_local(url: &str) -> wry::http::Response<Vec<u8>> {
  println!("{} local path {:?}", "custom protocol".on_green(), url);
  let content = std::fs::read_to_string(&url).expect("could not read file");
  let dst: ResContent = match url {
    n if n.ends_with(".js") => ResContent::JAVASCRIPT(content.as_str()),
    n if n.ends_with(".html") => ResContent::HTML(content.as_str()),
    n if n.ends_with(".css") => ResContent::CSS(content.as_str()),
    _=> ResContent::TXT(content.as_str())
  };
  response(dst)
}

pub async fn async_custom_protocol_err(url: &str) -> wry::http::Response<Vec<u8>> {
  println!("{} {:?} {:?}", "custom protocol".on_red(), wry::http::status::StatusCode::NOT_FOUND, url);
  wry::http::Response::builder()
    .status(wry::http::status::StatusCode::NOT_FOUND)
    .body(url.as_bytes().to_vec())
    .unwrap()
}

/*
HTTP 100番台 Informational（情報レスポンス）
 100 Continue	   リクエスト継続可能
 102 Processing	 処理中
 103 Early Hints 早期に予測されるヘッダを伝達
HTTP 200番台 Success（成功レスポンス）
 200 OK	                          リクエストが正常に処理できた
 201 Created	                      リクエストが成功してリソースの作成が完了
 202 Accepted                      リクエストを受け取ったが処理はされていない
 203 Non-Authoritative Information 元のサーバーの200(OK)レスポンスからペイロードが変更された
 204 No Content	                  リクエストに対して送信するコンテンツは無いがヘッダは有用である
 205 Reset Content	                クライアントにドキュメントビューをリセットするように指示
 206 Partial Content	              要求された範囲のデータやリソースの一部分だけのリクエストが成功
HTTP 400番台 Client Error（クライアントエラー）
 400 Bad Request                   一般的なクライアントエラー
 404 Not Found	                   Webページが見つからない
 405 Method Not Allowed	           送信するクライアント側のメソッドが許可されていない
 406 Not Acceptable	               サーバ側が受付不可能な値（ファイルの種類など）であり提供できない状態
 408 Request Timeout	             リクエスト送信後のやり取りに時間が長すぎるため時間切れ
HTTP 500番台 Server Error（サーバエラー）

200 : Okだけでいいかな。
3xx : リダイレクトしないので使用しない
400, 404 :
500 : CGI系のスクリプトで例外エラー
501　Not Implemented　【実装していない】
*/