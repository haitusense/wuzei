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


// console.log("terminal.js")

(function(){
  const { createApp, ref, onMounted, nextTick } = window.Vue;

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
  
      this.terminal = new window.Terminal({ 
        // rows: 3, 
        // cols: 3,
        fontSize: 12,
        fontFamily: "Consolas, 'Courier New', monospace",
        RendererType: 'canvas',
      });
      this.fitAddon = new window.FitAddon.FitAddon()
      this.terminal.loadAddon(this.fitAddon);
      // this.SearchAddon = new window.SearchAddon.SearchAddon()
      // this.terminal.loadAddon(this.SearchAddon);
  
      if (this.terminal._initialized) { return; }
      this.terminal._initialized = true;
      this.terminal.prompt = ()=>{
      
      };
      
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
  
    show(id) {
      this.terminal.open(document.getElementById(id));
      const imageContainerObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          // console.log(entry.contentRect.height, entry.contentRect.width)
          this.fitAddon.fit();
          this.terminal.scrollToBottom();
        });
      });
      imageContainerObserver.observe(document.getElementById(id));
      this.fitAddon.fit();
      this.terminal.scrollToBottom();
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
  
    // term.reset()
    async fetch(type, args) {
      const response = await fetch("http://wuzei.localhost/terminal", { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          { 
            type: type,
            payload: args
          }
        )
      });
      const dst = await response.text();
      return dst;
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
          case null:
            break;
          case 'echo':
            this.writeln(`${e.payload.join(' ')}`);
            break;
          case 'sleep':
            window.ipc.postMessage(JSON.stringify({ type: "sleep", payload:[] }));
            break;
          case 'clear':
            this.terminal.clear();
            break;
          case 'history':
            this.linestorage.history().forEach(n=>{
              this.writeln(n);
            });
            break;
          case 'cmd': {
            const dst = await this.fetch('cmd', result);
            this.writeln(`${dst}`);
            }
            break;
          case 'title':
            window.ipc.postMessage(JSON.stringify({ type: "title", payload: e.payload.join(' ') }));
            break;
          default:{
            // const dst = await this.fetch('ps', result);
            const dst = await this.fetch(result[0], result.slice(1));
            this.writeln(`${dst}`);
            // this.writeln(`The term '${e.type}' is not recognized as a name of a cmdlet, function, script file, or executable program.`);
            }
            break;
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

  
    app(obj) { return {
      template: `
        <div id="terminal" style="height: 100%;"> </div>
      `,
      data() {
        return {
          // count: 0
        }
      },
      setup() {
        onMounted(() => {
          obj.show('terminal')
          nextTick(() => { });
        })
        return {  }
      }
    }}
  }

  window.wterm = new Term();
}());


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