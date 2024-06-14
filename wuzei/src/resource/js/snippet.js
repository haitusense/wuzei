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

async function loadJs(path) {
  const src = (() => {
    const json = JSON.parse(document.querySelector('script[type="importmap"]').textContent);
    Object.keys(json.scopes).forEach(scope=> {
      if (scope.indexOf(location.hostname) > 0 && json.scopes[scope][path]) { return json.scopes[scope][path]; }
    })
    return json.imports[path] ?? path;
  })();
  let element = null; 
  let target = null;
  switch(src.split('.').pop()) {
    case 'js':
      element = document.createElement('script');
      element.src = src;
      break;
    case 'css':
      element = document.createElement('link');
      element.href = src;
      element.rel = 'stylesheet';
      break;
  }
  const promise = new Promise((resolve) => { element.onload = () => { console.log("loaded", src); resolve(); };});
  document["head"].appendChild(element);
  await promise;
  return window;
}

// Termの古いコード
(function(){
  class LinelocalStorage {
    static prefix = "line";
    static buffer_num = 99;
    constructor() {
      this.num = -1;
      this.current_line = ''
    }
    list(){
      return Object.keys(localStorage).filter(key => key.startsWith(LinelocalStorage.prefix)).sort((a,b) => (a > b ? -1 : 1));
    }
    history(){
      const list = this.list();
      return list.map(n => `${n} : ${localStorage.getItem(n)}`);
    }
    back() {
      const list = this.list();
      this.num = this.num >= list.length - 1 ? list.length - 1 : this.num + 1;
      const dst = list[this.num];
      return localStorage.getItem(dst)
    }
    next() {
      const list = this.list();
      this.num = this.num <= -1 ? -1 : this.num - 1;
      if(this.num < 0){
        return "";
      }else{
        return localStorage.getItem(list[this.num]);
      }
    }
    regist(src){
      this.num = -1;
      if(src.trim().length > 0){
        localStorage.setItem(`${LinelocalStorage.prefix}${Date.now()}`, src);
      }
      const list = this.list();
      list.slice(LinelocalStorage.buffer_num).forEach(n=> localStorage.removeItem(n) );
    }
  }
  
  class Term {
  
    constructor() {
      this.action = {};
      this.prompt_str = '> ';
      this.history = 0;
      this.linestorage = new LinelocalStorage();
    }
  
    open() {
      console.log("xterm opened")
  
      /* ... */
      this.terminal.onKey(async e => {
        switch(`${e.domEvent.ctrlKey ? 'ctrl+' : ''}${e.domEvent.key}`){
          /* js側で処理したいkey actionはここで処理 */
          // case 'Enter':
          //   this.terminal.writeln('');
          //   await this.send(this.linestorage.current_line);
          //   this.prompt();
          //   break;
          // break;
          default:
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
                selection : this.terminal.getSelection() // evaluate_scriptからフォーカスはズレた後に参照するのか取れないので
              }
            }));
            break;
        }
      });
      // this.terminal.onData(e => { });
      // this.terminal.onCursorMove(e => { console.log("onCursorMove ", this.terminal.buffer) });
  
      this.writeln('welcome to wuzei');
      this.prompt();
    }
  
    cursor() { return this.terminal.buffer.active.cursorX - this.prompt_str.length; }
    prompt() {
      if(this.linestorage.current_line.length > 0){
        // this.terminal.writeln('\r\n');
      }
      this.terminal.write(this.prompt_str);
      this.terminal.scrollToBottom(); 
      this.linestorage.current_line = '';
    }
  
    async send(src) {
      this.linestorage.regist(src);
  
      const regex = /"([^"]*?)"|[^\s"]+/g;
      const result = src.match(regex);
      const len = result ? result.length : 0;
      const e = {
        type: result ? result[0] : null,
        payload: result ? result.slice(1) : null
      };
      const bubbling = await this.action(e);
      if(bubbling) {
        switch(e.type) {
        }
      }
      //       case 'test' : {
      //         let response = await fetch("http://wuzei.localhost/terminal", { 
      //           method: "POST", 
      //           headers: { 'Content-Type': 'application/json' },
      //           body: JSON.stringify({ 
      //             type: 'py', 
      //             payload: [indoc(`
      //               import sys;
      //               print(sys.version)
      //               sys.version
      //             `)] })
      //         });
      //         let dst = await response.text();
      //         this.terminal.write(`${dst}`);
      //         return;
      //       }
  
      //         return;
      //       }
    }
  
    log(src) {
      this.write(src);
    }
  
    input(src) {
      this.terminal.write(src);
      this.linestorage.current_line += src;
    }
    async inputln(src) {
      this.input(src + "\r\n");
      await this.send(this.current_line)
      this.prompt();
    }
    writeln(src){
      this.write(`${src}\r\n`);
    }
    write(src){
      this.terminal.write(src);
      this.linestorage.current_line += src;
      this.linestorage.current_line = this.linestorage.current_line.split('\n').at(-1);
      /*
        let len = this.terminal.buffer.alternate.cursorX;
        this.terminal.write("\b \b".repeat(len));
        はいまいち
      */
    }
  }
}());

// termの古いコード
{
  /**
   * @param {string} src
   * @returns {string}
   */
  function _syntaxHighlighting(src){
    const matches = splitcom(src);
    // if(matches[0]?.captured){
    //   return src.replace(matches[0].captured, `\x1B[38;5;226m${matches[0].captured}\x1B[0m`)
    // }

    let dst = "";
    let flag = false;
    for (const match of matches) {
      if(!flag && match.full.trim() === ""){
        dst += match.full
        continue;
      }else if(!flag && match.full.trim() !== ""){
        flag = true
        dst += `\x1B[38;5;226m${match.full}\x1B[0m`
        continue;
      }else if(match.full.startsWith('\"') || match.full.startsWith('\'')){
        dst += `\x1B[38;5;39m${match.full}\x1B[0m`
      }else if(match.full.startsWith('-')){
        dst += `\x1B[38;5;248m${match.full}\x1B[0m`
      }else{
        dst += match.full
      }
    }
    return dst;
  }
}

// 使いたい機能
{
      // Navigator.serial 使いたい
      // Navigator.storage 役立ちそう
      // Navigator.virtualKeyboard 役立ちそう
      // Navigator.windowControlsOverlay vscodeとかのタイトルバーみたい
      // callback(`${JSON.stringify(window.navigator.mimeTypes)}\r\n`)
      // Navigator.share ファイル共有とかデバイス間の情報送りとか？

      // 機能しない
      (async ()=>{
        console.log("hid")
        let devices = await navigator.hid.getDevices();
        devices.forEach((device) => {
          console.log(`HID: ${device.productName}`);
        });
      })();

      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          devices.forEach((device) => {
            console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
          });
        })
        .catch((err) => {
          console.error(`${err.name}: ${err.message}`);
        });

    

      if ("virtualKeyboard" in navigator) {
        const editor = document.getElementById("editor");
        const editButton = document.getElementById("edit-button");
        let isEditing = false;

        editButton.addEventListener("click", () => {
          if (isEditing) {
            navigator.virtualKeyboard.hide();
            editButton.textContent = "Edit";
          } else {
            editor.focus();
            navigator.virtualKeyboard.show();
            editButton.textContent = "Save changes";
          }

          isEditing = !isEditing;
        });
      }

      navigator.share({
        title: 'web.dev',
        text: 'Check out web.dev.',
        url: 'https://web.dev/',
      })
      .then(() => console.log('Successful share'))
      .catch((error) => console.log('Error sharing', error));

            //@ts-check　でエラーが出るので
      replaceAll("\n","\e\n") -> replace(/\n/g, '\r\n')
}
  /* つかってないコード
  #cursorPos = () => this.#terminal.buffer.active.cursorX - this.#prompt_str.length

     log(src){
      this.write(`\x1b[0G\x1b[2K${src}\r\n`)
      this.#newCurrentLine(this.pty.current_line.length)
    }

      const clear = () => { 
      // localStorage.removeItem('wterm_buffer')
      terminal.clear()
      terminal.scrollToBottom();
      pty.prompt()
    }
  */  
  /*
  const pty = node_pty.spawn(shell, [], {...}); // 仮想ターミナルの作成
  pty.onData(recv => terminal.write(recv));     // 仮想ターミナルからの出力をターミナルに表示
  terminal.onData(send => pty.write(send));     // ターミナルの入力を仮想ターミナルに流す
  */


/*
  <vue-split-pane horizontal v-on:resize="resize">..</vue-split-pane>

  function resize(event) {
    console.log("resize", event[1])
    window.wterm.resize();
  }
  fromEvent(window,'resize').subscribe(e => { window.wterm.resize(); });

*/

// from(paneShow).subscribe(async (e) => { 
//   await nextTick()
//   if(paneShow.value){
//     window.wterm.show('terminal')
//   }
// });

// this.terminal.open(document.getElementById(id));
// this.terminal.element.addEventListener("focus", function() {
//   console.log("onFocus")
//   this.terminal.clearSelection();
// }, true);