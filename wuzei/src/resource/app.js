console.log("app.js")

/*
  fetch image/png > application/octet-stream : pngの方がサイズも小さい
  createImageData > getImageData             : getImageDataは都度バッファ作成してるので遅い
  drawImage       > putImageData             : らしいけど比較として意味が分からない（args image!=imageData）
*/

/*
raw 512x512 : color 18ms  trans 13.2m + read 4.7m + getimage 1.1m * putimage 0.12m / mono 9ms
  json : { type : "test", payload : 50 } 
  ctx  : canvasRef.value
png 512x512 : 4.5ms  trans 4.4m + read 0.6m + a
  json : { type : "test", payload : 50 } 
  ctx  : canvasRef.value
*/
// WindowsではカスタムURLスキームは使えず，サブドメインにプロトコル書くらしい．
class Wuzei {
  static { /* Class static initialization */ }
  static wuzei_url = "http://wuzei.localhost/data";

  static async init(path){

  }

  static async fetchGetBin() {
    let response = await fetch(this.wuzei_url, { method: "GET", cache: "no-store", })
    const reader = response.body.getReader();
    const chunk = await reader.read();
    console.log("fetch", chunk)
    return chunk;
  }

  static async fetchJson(obj) {
    let response = await fetch(this.wuzei_url, { 
      method: "POST", 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj) 
    });
    const dst = await response.json();
    return dst;
  }

  static async fetchRaw(canvas, json) {
    let response = await fetch(this.wuzei_url, { 
      method: "POST", 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json) 
    });
    const reader = response.body.getReader();
    const chunk = await reader.read(); /* Obj {done : bool, value : Uint8Array}*/
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true, });
    // const imageData = ctx.getImageData(0, 0, w, h); /* ImageData {data : Uint8ClampedArray, height, width}*/
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    imageData.data.set(chunk.value);
    ctx.putImageData(imageData, 0, 0);
  }

  static async fetchPng(canvas, json) {
    let response = await fetch(this.wuzei_url, { 
      method: "POST", 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json) 
    });
    const blob = await response.blob()
    const dataUrl = await this.readAsDataUrlAsync(blob);
    const image = await this.loadImageAsync(dataUrl);
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true, });
    ctx.drawImage(image, 0, 0);
    return {width: image.width, height:image.height};
  }

  static async readAsDataUrlAsync(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => { resolve(event.target.result); };
      reader.onerror = (error) => { reject(error); };
      reader.readAsDataURL(blob);
    });
  }

  static async loadImageAsync(path) {
    const image = new Image();
    return new Promise((resolve) => {
      image.onload = () => { resolve(image); };
      image.src = path;
    });
  }

  static async copyImageToClipboard(canvas, x, y, w, h) {
    const imageData = canvas.getContext('2d').getImageData(x, y, w, h);
    const temp = document.createElement('canvas');
    temp.width = w;
    temp.height = h;
    const ctx = temp.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    temp.toBlob(async (blob) => { await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]); }, 'image/png');
    console.log("clipboard")
  }
  
  // await navigator.clipboard.writeText("このテキストをクリップボードに書き込む");
}

class WuzeiTerm {
  constructor(){ }

  init(xterm, id) {
    let term = new xterm.Terminal();
    term.open(document.getElementById(id));
    this.command = '';
    
    if (term._initialized) { return; }
    term._initialized = true;

    term.prompt = () => { this.prompt(term) };

    this.welcome(term);

    term.onKey(async e => {
      switch(e.domEvent.key){
        case 'ArrowUp':
        case 'ArrowDown':
          console.log("Arrow")
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          console.log("Arrowreftright")
          break;
        case 'Enter':
          console.log(`(x,y) = (${term._core.buffer.x}, ${term._core.buffer.y}) : ${this.command}`);
          await this.enter();
          break;
        case 'Backspace':
          if (term._core.buffer.x > 2) {
            term.write('\b \b');
            this.command = this.command.slice(0, -1);
          }
          break;
        default:
          if(!e.domEvent.altKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey){
            term.write(e.key);
            this.command += e.key;
          }
      }
    });

    this.term = term;
  }

  welcome(term) {
    term.writeln('Welcome to xterm.js');
    term.prompt();
  }

  prompt(term) {
    term.write('\r\n> '); 
    this.command = '';
  }

  async enter() {
    this.term.write('\r\n');
    // let res = await Wuzei.fetchJson({ 
    //   type : "script", 
    //   payload : this.command
    // });
    // console.log(res)
    // this.term.write(res.code);

    window.ipc.postMessage(JSON.stringify({ 
      type : "process2", 
      payload : [this.command]
    }));

    this.term.prompt();
  }

  print(src) {
    this.term.write('\r\n' + src);
    this.term.prompt();
  }
  // term.reset()
}


/* リフレッシュレート使うなら */
// function animationFramePromise() {
//   return new Promise<number>((resolve) => {
//     globalThis.requestAnimationFrame(resolve);
//   });
// }
// function delay(ms) {
//   return new Promise<number>((resolve) => {
//     globalThis.setTimeout(resolve, ms);
//   });
// }
// var timer = Date.now();
// while (true) {
//   await delay(1000);
//   await animationFramePromise(); // この行で、次の更新タイミングまで待つ
//   console.log(timer - Date.now()); //経過時刻を取得
// }


