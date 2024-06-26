//@ts-check
console.log("lib.js")

/**
 * @param {number} msec
 * @returns {Promise}
 */
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));


/**
 * リフレッシュレート使うなら
 * @returns {Promise}
 */
const waitAnimationFrame = () => new Promise(resolve => globalThis.requestAnimationFrame(resolve));
/*
let start = Date.now();
for (let i=0;i<10;i++) {
  await waitAnimationFrame();         // この行で、次の更新タイミングまで待つ
  const millis = Date.now() - start;
  console.log(`time : ${millis} ms`); // 経過時刻を取得
}
*/


/**
 * @param {string} src
 * @returns {string}
 */
function indoc(src) {
  const match = src.match(/^[ \t]*(?=\S)/gm);
  if (!match) { return src; }
  const indent = Math.min(...match.map(el => el.length));
  const regexp = new RegExp(`^[ \\t]{${indent}}`, 'gm');
  return src.replace(regexp, '');
}

async function asyncCheckWebview() {
  //@ts-ignore
  const webview = window.chrome.webview;
  //@ts-ignore
  const ipc = window.ipc;
  console.log('window.chrome.webview', webview) // undefined
  console.log('window.ipc', ipc) // window.ipc.postMessage, undefined
  // try{
  //   const response = await fetch("http://wuzei.localhost/", { 
  //     method: "POST", 
  //     headers: { 'Content-Type': 'application/json' },
  //     body: "" 
  //   });
  //   console.log('fetch', response)
  // }catch(e){
  //   console.error('catch', e);
  // }
}

/**
 * @param {string} type
 * @param {any} payload
 */
function post(type, payload) {
  //@ts-ignore
  const ipc = window.ipc;
  if(ipc){
    ipc.postMessage(JSON.stringify({ type: type, payload: payload }));
  }else{
    console.error("window.ipc is undefined")
  }
}

/**
 * @param {any} obj
 */
function setState(obj) {
  //@ts-ignore
  const ipc = window.ipc;
  if(ipc){
    ipc.postMessage(JSON.stringify({ type: 'state', payload: obj }));
  }else{
    //@ts-ignore
    window.dummyState = obj;
  }
}


/**
 * @param {any} payload
 * @returns {Promise<any>}
 */
async function asyncPostJson(type, payload) {
  //@ts-ignore
  if(window.chrome.webview){
    const res = await asyncFetchWuzei(type, payload);
    return await res.json();
  }else{
    return undefined;
  }
}

/**
 * @param {string} path
 * @returns {Promise<string>}
 */
async function asyncGetTxt(path) {
  const res = await fetch(`http://wuzei.localhost/${path}`, { 
    method: "GET", 
    headers: { 'Content-Type': 'application/json' },
  });
  return await res.text();
}

/**
 * @param {any} payload
 * @returns {Promise<any>}
 */
async function asyncPostPixel(payload) {
  //@ts-ignore
  if(window.chrome.webview){ // try catchだと遅いので
    const res = await asyncFetchWuzei("getpixel", payload );
    return await res.json();
  }else{
    return { x: payload.x, y:payload.y, data:null }
  }
}

/**
 * @param {any} payload
 * @returns {Promise<HTMLImageElement>}
 */
async function asyncPostPng(payload) {
  //@ts-ignore
  if(window.chrome.webview){
    const res = await asyncFetchWuzei("refresh", payload);
    const blob = await res.blob()
    const dataUrl = await asyncReadAsDataUrl(blob);
    return await asyncLoadImage(dataUrl);
  }else{
    return new Image(320, 240)
  }
}

/**
 * @param {any} payload
 * @returns {Promise<any>}
 */
async function getRaw(canvas, type, payload) {
  //@ts-ignore
  if(window.chrome.webview){
    const res = await asyncFetchWuzei(type, payload);
    //@ts-ignore
    const reader = res.body.getReader();
    const chunk = await reader.read(); /* Obj {done : bool, value : Uint8Array}*/
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true, });
    // const imageData = ctx.getImageData(0, 0, w, h); /* ImageData {data : Uint8ClampedArray, height, width}*/
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    imageData.data.set(chunk.value);
    ctx.putImageData(imageData, 0, 0);
  }else{
    return undefined;
  }
}


async function fetchGetBin() {
  let res = await fetch(this.wuzei_url, { method: "GET", cache: "no-store", })
  //@ts-ignore
  const reader = res.body.getReader();
  const chunk = await reader.read();
  console.log("fetch", chunk)
  return chunk;
}

/**
 * @param {string} type
 * @param {any} payload
 * @returns {Promise<Response>}
 */
async function asyncFetchWuzei(type, payload) {
  // WindowsではカスタムURLスキームは使えず，サブドメインにプロトコル書くらしい．
  return await fetch("http://wuzei.localhost/api", { 
    method: "POST", 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type : type, payload : payload }) 
  });
}

/**
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
async function asyncReadAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => { 
      if (event.target && typeof event.target.result === 'string') {
        resolve(event.target.result);
      } else {
        reject(new Error('FileReader event target is null or result is not a string'));
      }
    };
    reader.onerror = (error) => { reject(error); };
    reader.readAsDataURL(blob);
  });
}

/**
 * @param {string} path
 * @returns {Promise<HTMLImageElement>}
 */
function asyncLoadImage(path) {
  const image = new Image();
  return new Promise((resolve) => {
    image.onload = () => { resolve(image); };
    image.src = path;
  });
}

/*** method ***/

/**
 * @param {string} path
 * @param {string} subpath --内部でstring/intの判別あり
 */
const readFile = async (path, subpath) => {
  switch(path.split('.').pop()?.toLowerCase()){
    case 'hraw':
    case 'zip': {
      const json = { path: path, subpath: isNaN(Number(subpath)) ? subpath : Number(subpath) }
      const res = await asyncPostJson("readraw", json);
      console.log("read raw file", JSON.stringify(json));
    } break;
    case 'png':
    case 'bmp': {
      const json = { path: path }
      const res = await asyncPostJson("readpng", json);
      console.log("read png file", JSON.stringify(json));
    } break;
    default: {
      // const json = { path : e.path };
      // const res = await Wuzei.fetchJson({ type: "process", payload : ["dotnet", `script ./script.csx -- '${JSON.stringify(JSON.stringify(json))}'` ] });
      // console.log("read file use script", res);
    } break;
  }
}

/*** method for term ***/

function onKeySendWithIpc(e){
  // isTrustedしか流れないのでobject再構成
  //@ts-ignore
  window.ipc.postMessage(JSON.stringify({ 
    type: "test", 
    payload: {
      altKey : e.domEvent.altKey,
      ctrlKey : e.domEvent.ctrlKey,
      metaKey : e.domEvent.metaKey,
      shiftKey : e.domEvent.shiftKey,
      key : e.domEvent.key,
      charCode : e.domEvent.charCode,
      code : e.domEvent.code,
      keyCode : e.domEvent.keyCode,
    }
  }));
}

async function sendWithFetch(type, args){
  const response = await fetch("http://wuzei.localhost/terminal", { 
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: type,
      payload: args
    })
  });
  const dst = await response.text();
  return dst;
}

// 使用辞めた
function setStr(){
  //@ts-ignore
  String.prototype.insert = function (src, index) {
    const front = this.slice(0, index);
    const back = this.slice(index);
    return front + src + back;
  };
  //@ts-ignore
  String.prototype.overwrite = function (src, index) {
    const front = this.slice(0, index);
    const back = this.slice(index+1);
    return front + src + back;
  };
}

export { 
  sleep, waitAnimationFrame, indoc, asyncCheckWebview, 
  post, asyncGetTxt, asyncPostJson, asyncPostPixel, asyncPostPng, setState,
  readFile
};


/*
  fetch image/png > application/octet-stream : pngの方がサイズも小さい
  createImageData > getImageData             : getImageDataは都度バッファ作成してるので遅い
  drawImage       > putImageData             : らしいけど比較として意味が分からない（args image!=imageData）
*/
// axiosの構文
//   axios.post("/api/user", {name: "しゅう"})
//   axios.get("/api/user").then((response) => alert(`名前：${response.data.name}`))
// const fruits = await fetchWuzei().url('resource/test.py').get('json');


/*
raw 512x512 : color 18ms  trans 13.2m + read 4.7m + getimage 1.1m * putimage 0.12m / mono 9ms
  json : { type : "test", payload : 50 } 
  ctx  : canvasRef.value
png 512x512 : 4.5ms  trans 4.4m + read 0.6m + a
  json : { type : "test", payload : 50 } 
  ctx  : canvasRef.value
*/