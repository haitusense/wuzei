const { onMounted, onUnmounted, ref } = window.Vue;
const { /* from */ /* fromEvent */ of, merge, partition,
  filter, first, delay, map, takeUntil, debounceTime, scan,
  bufferToggle, switchMap, mergeMap,  
  share, tap
} = window.rxjs;
const { from, fromEvent } = window.VueUse;

/*  <!-- 例えば、ターミナルエミュレータの設定で256色パレットではなく、
    16色パレットを使用している場合、\x1b[33mは茶色っぽく表示される可能性があります。 -->
 https://qiita.com/suzuki-navi/items/ac6de24a138f4a5fd585
 \x1b = \033 = \u001b = \U0000001b, \eはc系？
色	    標準の8色	明るい8色	 256色	 RGB
文字色	30～37	  90～97	  38;5;n	38;2;r;g;b
背景色	40～47	  100～107	48;5;n	48;2;r;g;b
 Erases the whole line	\x1B[2K
Goes back to the begining of the line	\r
*/
class ESC {
  // Erases the whole line	\x1B[2K
  // Goes back to the begining of the line	\r
  static hideCursor(n) { return `\x1b[?25l` }
  static showCursor(n) { return `\x1b[?25h` }
  static move(n) { return `\x1b[${n}G` }
  static moveLeft(n) { return n > 0 ? `\x1b[${n}D` : '' } /* もしくはhoge.repert(n) */
  static moveRight(n) { return n > 0 ? `\x1b[${n}C` : '' }
  static delAfterCursor() { return `\x1b[0K` }
  static delAfterN(n) { return `\x1b[${n}G\x1b[0K` }
  static eraseLine(n) { return `\x1b[2K` }
  static backSpace(n) { return `\b \b` }
}

String.prototype.insert = function (src, index) {
  const front = this.slice(0, index);
  const back = this.slice(index);
  return front + src + back;
};
String.prototype.overwrite = function (src, index) {
  const front = this.slice(0, index);
  const back = this.slice(index+1);
  return front + src + back;
};

/* helper methods */
function splitcom(src) {
  if(src){
    // A: const result = src.match(/"([^"]*?)"|'([^']*?)'|[^\s"']+/g);
    // B: const result = src.split(/(?:"([^"]+)"|'([^']*?)'|([^\s"']+)) ?/).filter(e => e)
    // return Array.from(src.matchAll(/"([^"]*?)"|'([^']*?)'|([^\s"']+)|([\s]+)/g)).map((n, index, arr) => {
    return Array.from(src.matchAll(/"([^"]*?)"|'([^']*?)'|([^\s"']+)|("[^"]*)$|('[^']*)$|([\s]+)/g)).map((n, index, arr) => {
      return { full:n[0], captured: n[1] || n[2] || n[3] || n[4] || n[5] || n[6], index: n.index };
    });
  }else{
    return []
  }
}

function commandlineParser(src){
  const matches = splitcom(src);
  const e = {
    type: matches.filter(n => n.captured)[0]?.captured,
    payload: matches.filter(n => n.captured).slice(1).map(n => n.captured).filter(n => n.trim() !== '')
  };
  return e;
}

function syntaxHighlighting(src){
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

function onKeySendWithIpc(e){
  // isTrustedしか流れないのでobject再構成
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


/* LineStorage */
class LineStorage {
  static prefix = "line";
  static buffer_num = 99;
  constructor(mode) {
    this.num = -1;
    this.current_line = ''
    switch(mode){
      case 'local':
        this.storage = localStorage;
        break;
      case 'session':
        this.storage = sessionStorage;
        break;
      default:
        this.storage = sessionStorage;
        break;
    }
    
  }
  list(){
    return Object.keys(this.storage).filter(key => key.startsWith(LineStorage.prefix)).sort((a,b) => (a > b ? -1 : 1));
  }
  history(){
    const list = this.list();
    return list.map(n => `${n} : ${this.storage.getItem(n)}`);
  }
  back() {
    const list = this.list();
    this.num = this.num >= list.length - 1 ? list.length - 1 : this.num + 1;
    const dst = list[this.num];
    return this.storage.getItem(dst) ?? ""
  }
  next() {
    const list = this.list();
    this.num = this.num <= -1 ? -1 : this.num - 1;
    if(this.num < 0){
      return "";
    }else{
      return this.storage.getItem(list[this.num]) ?? "";
    }
  }
  regist(src){
    this.num = -1;
    if(src.trim().length > 0){
      this.storage.setItem(`${LineStorage.prefix}${Date.now()}`, src);
    }
    const list = this.list();
    list.slice(LineStorage.buffer_num).forEach(n=> this.storage.removeItem(n) );
  }
}

class Wterm {
  #terminal
  #fitAddon
  #prompt_str = '> ';
  beforeOnKey = {};
  onChange = {};
  onAsyncSubmit =(e)=> { return false; };

  #storage = new LineStorage();
  #current_line = ''
  #pos = 0
  #cursorPos = () => this.#terminal.buffer.active.cursorX - this.#prompt_str.length

  #isbusy = false;

  /*** init ***/
  constructor() {
    this.#terminal = new window.Terminal({
      fontSize: 12,
      fontFamily: "Consolas, 'Courier New', monospace",
      RendererType: 'canvas',
      theme: { /* foreground: 'yellow', */ }
    });
    this.#fitAddon = new window.FitAddon.FitAddon()
    this.#terminal.loadAddon(this.#fitAddon);

    if (this.#terminal._initialized) { return; }
    this.#terminal._initialized = true;

    this.#terminal.prompt = () =>{ this.#prompt() };
    this.#terminal.onKey(async e => { await this.#onKey(e) })
    // this.#terminal.onData(e => { });
    // this.#terminal.onCursorMove(e => { console.log("onCursorMove ", this.#terminal.buffer) });
  }

  open(id) {
    this.#terminal.open(document.getElementById(id));
    const imageContainerObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        // console.log(entry.contentRect.height, entry.contentRect.width)
        this.#fitAddon.fit();
        this.#terminal.scrollToBottom();
      });
    });
    imageContainerObserver.observe(document.getElementById(id));
    this.#fitAddon.fit();
    this.#terminal.clear();
    const buffer = localStorage.getItem('wterm_buffer')
    if (buffer) {
      this.#terminal.writeln(buffer)
      this.#terminal.prompt()
    }else{
      this.#terminal.writeln("welcome to wterm")
      this.#terminal.prompt()
    }
    this.#terminal.focus();
  }

  close(){
    this.#terminal.selectAll()
    const buffer = this.#terminal.getSelection().trim()
    localStorage.setItem('wterm_buffer', buffer)
    this.#terminal.dispose()
  }

  /*** event ***/
  #prompt(){
    if(this.#current_line.trim().length > 0){
      this.#terminal.writeln('');
    }
    this.#current_line = '';
    this.#terminal.write(this.#prompt_str);
    this.#terminal.scrollToBottom(); 
    this.#isbusy = false
  }
  
  #buildOutput(){
    if(this.#pos < 0) this.#pos = 0;
    if(this.#pos > this.#current_line.length) this.#pos = this.#current_line.length;
    this.#newCurrentLine(this.#pos)
    this.onChange(this.#current_line)
  }
  #newCurrentLine(pos){
    const len = pos + this.#prompt_str.length + 1;
    const buf = syntaxHighlighting(this.#current_line);
    this.#terminal.write(`\x1b[0G\x1b[2K${this.#prompt_str}${buf}\x1b[${len}G`);
  }
  async #enter(){
    this.#isbusy = true
    this.#storage.regist(this.#current_line)
    this.#terminal.writeln('');
    const json = commandlineParser(this.#current_line)
    const bubbling = await this.onAsyncSubmit(json);
    if(bubbling) { 
      await this.#defaultAction(json) 
      this.#terminal.prompt();
    }
    /* this.#current_line初期化はpromptの中 */
  }
  async #onKey(e){
    if(this.#isbusy) return;
    const flag = await this.beforeOnKey(e);
    const shift = e.domEvent.shiftKey ? 'shift+' : ''
    const ctrl = e.domEvent.ctrlKey ? 'ctrl+' : ''
    const alt = e.domEvent.altKey ? 'alt+' : ''
    const key = `${shift}${ctrl}${alt}${e.domEvent.key}`

    if(key == 'Enter') { await this.#enter(); return; }
    switch(key){
      case 'ArrowUp': this.#current_line = this.#storage.back(); this.#pos = this.#current_line.length; break;
      case 'ArrowDown': this.#current_line = this.#storage.next(); this.#pos = this.#current_line.length; break;
      case 'ArrowLeft': this.#pos -= 1; break;
      case 'ArrowRight': this.#pos += 1; break;
      case 'ctrl+ArrowLeft': this.#pos = 0; break;
      case 'Home': this.#pos = 0; break;
      case 'ctrl+ArrowRight': this.#pos = this.#current_line.length; break;
      case 'End': this.#pos = this.#current_line.length; break;
      case 'Delete': this.#current_line = this.#current_line.overwrite('', this.#pos); break;
      case 'Backspace': this.#pos -= 1; this.#current_line = this.#current_line.overwrite('', this.#pos); break;
      case 'ctrl+v':
        this.paste();
        break;
      case 'ctrl+c':
        navigator.clipboard.writeText(this.#terminal.getSelection())
        break;
      case 'ctrl+l': this.clear(); break;
      default:
        if(!e.domEvent.altKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey) {
          this.#current_line = this.#current_line.insert(e.key, this.#pos);
          this.#pos += 1;
        }
        break;
    }
    this.#buildOutput();
  }

  async #defaultAction(json){
    /* rustとの通信 */
  }

  /*** public method ***/
  log(src){
    this.#terminal.writeln(`\x1b[0G\x1b[2K${src}`);
    this.#newCurrentLine(this.#current_line.length)
  }
  write(args){
    this.#terminal.write(args);
  }
  input_append(args){
    // this.#terminal.input(args); // -> onDataに入力
    this.#current_line = this.#current_line.insert(args, this.#pos);
    this.#pos += args.length;
    this.#buildOutput();
  }
  input_insert(args){
    // this.#terminal.input(args); // -> onDataに入力
    this.#current_line = this.#current_line.insert(args, this.#pos);
    this.#pos += args.length;
    this.#buildOutput();
  }
  async input_overwrite(args){
    this.#current_line = args;
    this.#pos += args.length;
    this.#buildOutput();
    await this.#enter()
  }
  paste(){
    navigator.clipboard
      .readText()
      .then((n) => this.input_append(n));
  }
  clear(){ 
    localStorage.removeItem('wterm_buffer')
    this.#terminal.clear()
    this.#terminal.prompt()
  }

  prompt(){ this.#terminal.prompt() }
}


/*
  emitはasyncできないのでpropsでsendにつなぐ
*/
const wtermComponent = {
  template: `
    <div id="terminal" ref="terminalRef" style="height: 100%; background-color:black; opacity:1"> </div>
  `,
  data() { return { /* count: 0 */ } },
  props: {
    onAsyncKey: { type: Function, },
    onAsyncSubmit: { type: Function, default: ()=>{ return false; }, required: false },
  },
  methods: {
    log(args) { this.term.log(args) }, 
    write(args) { this.term.write(args) }, // プロンプトラインでは機能しない様にする？
    prompt(args) { this.term.prompt() },
    input_append(args) { this.term.input_append(args) },
    input_insert(args) { this.term.input_insert(args) },
    input_overwrite(args) { this.term.input_overwrite(args) },
    clear(args) { this.term.clear() }
  },
  /* 
    emit: 
      on-change,
      on-submit
  */
  setup(props, { emit }) {
    console.log("setup term") /*毎回呼ばれる*/
    const terminalRef = ref(null);

    /******** terminal ********/

    const term = new Wterm();
    term.beforeOnKey = async (e) => { return props.onAsyncKey(e) };
    term.onChange = async (e) => { emit('on-change', e) };
    term.onAsyncSubmit = async (e) => { 
      emit('on-submit', e) // 戻り値を受けない
      return await props.onAsyncSubmit(e) // 戻り値を受ける
    };

    /******** mouse event ********/

    /* mousedown */
    fromEvent(terminalRef, 'mousedown').pipe(filter(e=> e.buttons == 4)).subscribe(e => {
      term.paste();
      e.preventDefault();
    });

    /* drop */
    fromEvent(terminalRef, 'dragenter').subscribe(e => {
      e.preventDefault();
      terminalRef.value.style.opacity = 0.65
    });
    fromEvent(terminalRef, 'dragleave').subscribe(e => {
      e.preventDefault();
      if (!e.currentTarget.contains(e.relatedTarget)) {
        terminalRef.value.style.opacity = 1
      }
    });
    fromEvent(terminalRef, 'dragover').subscribe(e => {
      e.stopPropagation();
      e.preventDefault();
    });

    // drop -> newWindowReqの順
    const drop = (path) =>{
      term.input_append(path)
      terminalRef.value.style.opacity = 1
    }
    if(window.chrome.webview){
      fromEvent(terminalRef, 'drop').pipe(
        switchMap((e) => merge( of(e).pipe(delay(100)), fromEvent(window.chrome.webview, 'newWindowReq')).pipe(first()) )
      ).subscribe(e => {
        drop(e.detail.payload)
      })
    }else{
      fromEvent(terminalRef, 'drop').subscribe(async e => {
        e.stopPropagation(); // 親への伝播をとめる
        e.preventDefault();  //イベントのキャンセル
        const file = e.dataTransfer.files[0].name;
        drop(file)
      })
    }

    /******** onMounted ********/
    onMounted(() => {
      console.log('terminal mounted')
      term.open('terminal');
    }),
    onUnmounted(() => {
      // windowclose時に呼ばれるように検討
      console.log('terminal unmounted')
      term.close()
    })
    return { term, terminalRef }
  }
}

export { wtermComponent, Wterm };

// ntegration issues / PTY bridge
// xterm.js is heavily tested against node-pty as it is shipped mostly with Node.js based solutions. With node-pty the integration is straight forward for most cases:
// const pty = node_pty.spawn(shell, [], {...});
// pty.onData(recv => terminal.write(recv));
// terminal.onData(send => pty.write(send));

  /*** key event ***/
  // #refreshLine(newStr) { 
  //   this.#terminal.write(`${ESC.delAfterN(this.#prompt_str.length + 1)}${newStr}`);
  //   this.#current_line = '';
  //   // this.#linestorage.current_line = '';
  // }
  // #moveStartOfLine() { this.#terminal.write(ESC.move(this.#prompt_str.length + 1)); }
  // #moveEndOfLine() { this.#terminal.write(ESC.move(this.#linestorage.current_line.length + this.#prompt_str.length + 1)); }
  // #insert(n) {
  //   const front = this.#linestorage.current_line.slice(0, this.#cursorPos());
  //   const back = this.#linestorage.current_line.slice(this.#cursorPos())
  //   this.#linestorage.current_line = front + n + back;
  //   this.#terminal.write(`${ESC.delAfterN(this.#prompt_str.length + 1)}${this.#linestorage.current_line}${ESC.moveLeft(back.length)}`);
  // }
  // #backSpace() { 
  //   if (this.#cursorPos() < 1) return;
  //   const front = this.#linestorage.current_line.slice(0, this.#cursorPos()).slice(0, -1);
  //   const back = this.#linestorage.current_line.slice(this.#cursorPos());
  //   this.#linestorage.current_line = front + back;
  //   this.#terminal.write(`${ESC.delAfterN(this.#prompt_str.length + 1)}${this.#linestorage.current_line}${ESC.moveLeft(back.length)}`);
  // }


//             async #onKey(e){
//               // console.log(e.domEvent)
//               switch(`${e.domEvent.ctrlKey ? 'ctrl+' : ''}${e.domEvent.key}`){
//                 case 'ArrowUp':
//                   this.#linestorage.current_line = this.#linestorage.back();
//                   this.#refreshLine(this.#linestorage.current_line)
//                   break;
//                 case 'ArrowDown':
//                   this.#linestorage.current_line = this.#linestorage.next();
//                   this.#refreshLine(this.#linestorage.current_line)
//                   break;
//                 case 'ArrowLeft':
//                   if(this.#cursorPos() > 0) {
//                     this.#terminal.write(e.key);
//                   }
//                   break;
//                 case 'ArrowRight':
//                   if(this.#cursorPos() < this.#linestorage.current_line.length){
//                     this.#terminal.write(e.key);
//                   }
//                   break;
//                 case 'Home': this.#moveStartOfLine(); break;
//                 case 'End': this.#moveEndOfLine(); break;
//                 case 'Delete': this.#refreshLine(); break;
//                 case 'Enter':
//                   this.#terminal.writeln('');
//                   await this.send(this.#linestorage.current_line);
//                   this.prompt();
//                   break;
//                 case 'Backspace': this.#backSpace(); break;
//                 case 'ctrl+c':
//                   navigator.clipboard.writeText(this.#terminal.getSelection())
//                   console.log("ctrl+c", this.#terminal.getSelection())
//                   break;
//                 default:
//                   if(!e.domEvent.altKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey) {
//                     this.#insert(e.key)
//                   }
//                   break;
//               }
//             }
          
//             /* 旧
//         switch(e.domEvent.key){
//           case 'ArrowUp':
//             this.terminal.write(`\x1b[${this.prompt_str.length + 1}G`);
//             this.terminal.write(`\x1b[0K`);
//             this.linestorage.current_line = '';
//             this.linestorage.current_line = this.linestorage.back();
//             this.terminal.write(this.linestorage.current_line);
//             break;
//           case 'ArrowDown':
//             this.terminal.write(`\x1b[${this.prompt_str.length + 1}G`);
//             this.terminal.write(`\x1b[0K`);
//             this.linestorage.current_line = '';
//             this.linestorage.current_line = this.linestorage.next();
//             this.terminal.write(this.linestorage.current_line);
//             break;
//           case 'ArrowLeft':
//             if(this.cursor() > 0) {
//               this.terminal.write(e.key);
//             }
//             break;
//           case 'ArrowRight':
//             if(this.cursor() < this.linestorage.current_line.length){
//               this.terminal.write(e.key);
//             }
//             break;
//           case 'Home':
//             this.terminal.write(`\x1b[${this.prompt_str.length + 1}G`);
//             break;
//           case 'Delete':
//             this.terminal.write(`\x1b[${this.prompt_str.length + 1}G`);
//             this.terminal.write(`\x1b[0K`);
//             this.linestorage.current_line = '';
//             break;
//           case 'End':
//             let a = this.linestorage.current_line.length
//             this.terminal.write(`\x1b[${a + this.prompt_str.length + 1}G`);
//             break;
//           case 'Enter':
//             this.terminal.writeln('');
//             await this.send(this.linestorage.current_line);
//             this.prompt();
//             break;
//           case 'Backspace':
//             if (this.cursor() > 0) {
//               this.terminal.write('\b \b');
//               this.linestorage.current_line = this.linestorage.current_line.slice(0, -1);
//             }
//             break;
//           default:

//             if(!e.domEvent.altKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey) {
//               const front = this.linestorage.current_line.slice(0, this.cursor());
//               const back = this.linestorage.current_line.slice(this.cursor());
//               this.terminal.write(e.key + back + '\x1b[D'.repeat(back.length));
//               this.linestorage.current_line = front + e.key + back;
//             }

//             window.ipc.postMessage(JSON.stringify({  ...  }));
//             break;
//         }


//             // term.reset()


//             appendTxt() {　 }
//             input(src) {
//               this.#terminal.write(src);
//               this.#linestorage.current_line += src;
//             }
//             async inputln(src) {
//               this.input(src + "\r\n");
//               await this.send(this.current_line)
//               this.prompt();
//             }
            
//             writeln(src){
//               this.write(`${src}\r\n`);
//             }
//             write(src){
//               this.#terminal.write(src);
//               // this.#linestorage.current_line += src;
//               // this.#linestorage.current_line = this.#linestorage.current_line.split('\n').at(-1);
//             }

//             /*** method ***/


//             history(n){
//               this.#linestorage.history().slice(0, n).forEach(m=>{
//                 this.writeln(m);
//               });
//             }
