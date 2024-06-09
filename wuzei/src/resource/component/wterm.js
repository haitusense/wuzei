//@ts-check

//@ts-ignore
const { onMounted, nextTick, onUnmounted, ref } = window.Vue;
//@ts-ignore
const { /* from */ /* fromEvent */ of, merge, filter, first, delay, switchMap } = window.rxjs;
//@ts-ignore
const { from, fromEvent } = window.VueUse;

class ESC {

  static hideCursor(n) { return `\x1b[?25l` }
  static showCursor(n) { return `\x1b[?25h` }
  static move(n) { return `\x1b[${n}G` }
  static moveLeft(n) { return n > 0 ? `\x1b[${n}D` : '' } /* もしくはhoge.repert(n) */
  static moveRight(n) { return n > 0 ? `\x1b[${n}C` : '' }
  static delAfterCursor() { return `\x1b[0K` }
  static delAfterN(n) { return `\x1b[${n}G\x1b[0K` }
  static eraseLine(n) { return `\x1b[2K` }
  static backSpace(n) { return `\b \b` }
  /*
  以下は同じ意味 \x1b, \033, \u001b, \U0000001b, c系は\e？
  ターミナルエミュレータのは256色パレットか16色パレットかで色味が違って見える（\x1b[33mは茶色っぽく表示されたり）
  Erases the whole line	                \x1B[2K
  Goes back to the begining of the line	\r
                   | 8-defaultcolor | 8-lightcolor | 256-color | RGB
  foreground-color | 30-37          | 90-97        | 38;5;n	   | 38;2;r;g;b
  background-color | 40-47          | 100-107      | 48;5;n    | 48;2;r;g;b
  */
}

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
  #prompt_str = '';
  /**
   * @param {any} n
   * @returns {boolean}
   */
  beforeOnKey = (n) => { return true; };
  /**
   * @param {any} n
   */
  onChange = (n) => {};
  /**
   * @param {any} n
   */
  onSubmit = (n) => { };

  #storage = new LineStorage();
  #current_line = ''
  #pos = 0
  #cursorPos = () => this.#terminal.buffer.active.cursorX - this.#prompt_str.length

  #isbusy = true;

  /*** init ***/
  constructor() {
    //@ts-ignore
    const Terminal = window.Terminal;
    //@ts-ignore
    const FitAddon = window.FitAddon;

    this.#terminal = new Terminal({
      fontSize: 12,
      fontFamily: "Consolas, 'Courier New', monospace",
      RendererType: 'canvas',
      theme: { /* foreground: 'yellow', */ }
    });
    this.#fitAddon = new FitAddon.FitAddon()
    this.#terminal.loadAddon(this.#fitAddon);

    if (this.#terminal._initialized) { return; }
    this.#terminal._initialized = true;

    this.#terminal.prompt = () =>{ this.#prompt() };
    this.#terminal.onKey( e => { this.#onKey(e) } )
    // this.#terminal.onData(e => { });
    // this.#terminal.onCursorMove(e => { console.log("onCursorMove ", this.#terminal.buffer) });
  }

  open(id) {
    const elem = document.getElementById(id);
    if(elem == undefined){
      console.error(`${id} not found`);
      return;
    }
    this.#terminal.open(elem);
    const imageContainerObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        // console.log(entry.contentRect.height, entry.contentRect.width)
        this.#fitAddon.fit();
        this.#terminal.scrollToBottom();
      });
    });
    imageContainerObserver.observe(elem);
    this.#fitAddon.fit();
    this.#terminal.clear();
    const buffer = localStorage.getItem('wterm_buffer')
    if (buffer) {
      this.#terminal.writeln(buffer)
      // this.#terminal.prompt()
    }else{
      this.#terminal.writeln("welcome to wterm")
      // this.#terminal.prompt()
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

  #onKey(e){
    /* asyncにするとgetSelection()が取れないことがあるので同期化 */
    if(this.#isbusy) {
      console.log('terminal is busy')
      return;
    }
    if( !this.beforeOnKey(e)){ return; }
    const shift = e.domEvent.shiftKey ? 'shift+' : ''
    const ctrl = e.domEvent.ctrlKey ? 'ctrl+' : ''
    const alt = e.domEvent.altKey ? 'alt+' : ''
    const key = `${shift}${ctrl}${alt}${e.domEvent.key}`

    if(key == 'Enter') { this.#enter(); return; }
    switch(key){
      case 'ArrowUp': this.#current_line = this.#storage.back(); this.#pos = this.#current_line.length; break;
      case 'ArrowDown': this.#current_line = this.#storage.next(); this.#pos = this.#current_line.length; break;
      case 'ArrowLeft': this.#pos -= 1; break;
      case 'ArrowRight': this.#pos += 1; break;
      case 'ctrl+ArrowLeft': this.#pos = 0; break;
      case 'Home': this.#pos = 0; break;
      case 'ctrl+ArrowRight': this.#pos = this.#current_line.length; break;
      case 'End': this.#pos = this.#current_line.length; break;
      //@ts-ignore
      case 'Delete': this.#current_line = this.#current_line.overwrite('', this.#pos); break;
      //@ts-ignore
      case 'Backspace': this.#pos -= 1; this.#current_line = this.#current_line.overwrite('', this.#pos); break;
      case 'ctrl+v':
        navigator.clipboard.readText().then((n) => this.input_append(n));
        break;
      case 'ctrl+c':
        navigator.clipboard.writeText(this.#terminal.getSelection())
        break;
      case 'ctrl+l': this.clear(); break;
      case 'shift+ArrowUp': break;
      case 'shift+ArrowDown': break;
      case 'shift+ArrowLeft': break;
      case 'shift+ArrowRight': break;
      default:
        if(!e.domEvent.altKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey) {
          //@ts-ignore
          this.#current_line = this.#current_line.insert(e.key, this.#pos);
          this.#pos += 1;
        }
        break;
    }
    this.#buildOutput();
  }
  #enter(){
    this.#isbusy = true;
    this.#storage.regist(this.#current_line);
    this.#terminal.writeln('');
    const json = commandlineParser(this.#current_line);
    this.onSubmit(json);
    // const bubbling = await this.onAsyncSubmit(json);
    // if(bubbling) {
    //   /* rustとの通信 */
    //   this.#terminal.prompt();
    // }

    /* this.#current_line初期化はpromptの中 */
  }

  /*** public method ***/
  log(src){
    this.#terminal.writeln(`\x1b[0G\x1b[2K${src}`);
    this.#newCurrentLine(this.#current_line.length)
  }
  write(args){
    this.#terminal.write(args);
  }
  clear(){ 
    localStorage.removeItem('wterm_buffer')
    this.#terminal.clear()
    this.#terminal.prompt()
  }
  input_append(args){
    // this.#terminal.input(args); // -> onDataに入力
    //@ts-ignore
    this.#current_line = this.#current_line.insert(args, this.#pos);
    this.#pos += args.length;
    this.#buildOutput();
  }
  input_insert(args){
    // this.#terminal.input(args); // -> onDataに入力
    //@ts-ignore
    this.#current_line = this.#current_line.insert(args, this.#pos);
    this.#pos += args.length;
    this.#buildOutput();
  }
  input_overwrite(args){
    this.#current_line = args;
    this.#pos += args.length;
    this.#buildOutput();
    this.#enter()
  }
  prompt(args){ 
    this.#prompt_str = args;
    this.#terminal.prompt() 
  }
}

/*
  emitはasyncできないのでpropsでsendにつなぐ
*/
const wtermComponent = {
  template: `<div id="terminal" ref="terminalRef" style="height: 100%; background-color:black; opacity:1"> </div>`,
  data() { return { /* count: 0 */ } },
  props: {
    beforeOnKey: { type: Function, }, /* asyncにしない */
  },
  methods: {
    log(args) { this.term.log(args) }, 
    write(args) { this.term.write(args) }, // プロンプトラインでは機能しない様にする？
    clear() { this.term.clear() },
    input_append(args) { this.term.input_append(args) },
    input_insert(args) { this.term.input_insert(args) },
    input_overwrite(args) { this.term.input_overwrite(args) },
    prompt(args) { this.term.prompt(args) },
  },
  /* 
    emit: on-change, on-submit, on-mounted
  */
  setup(props, { emit }) {
    console.log("setup term") /*毎回呼ばれる*/
    const terminalRef = ref(null);

    /******** terminal ********/
    const term = new Wterm();
    term.beforeOnKey = (e) => { return props.beforeOnKey(e) };
    term.onChange = (e) => { emit('on-change', e) };
    term.onSubmit = (e) => { emit('on-submit', e) };

    /******** key event ********/
    /* fromEventは何が流れてくるのか分かりにくいので未使用 */
  
    /******** mouse event ********/

    /* mousedown */
    fromEvent(terminalRef, 'mousedown').pipe(filter(e=> e.buttons == 4)).subscribe(e => {
      navigator.clipboard.readText().then((n) => term.input_append(n));
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
    //@ts-ignore
    const wv = window.chrome.webview;
    if(wv){
      fromEvent(terminalRef, 'drop').pipe(
        switchMap( e => merge( of(e).pipe(delay(100)), fromEvent(wv, 'newWindowReq')).pipe(first()) )
      ).subscribe( e => {
        drop(e.detail.payload)
      })
    }else{
      fromEvent(terminalRef, 'drop').subscribe(async e => {
        e.stopPropagation(); // 親への伝播をとめる
        e.preventDefault();  // イベントのキャンセル
        const file = e.dataTransfer.files[0].name;
        drop(file)
      })
    }

    /******** onMounted ********/
    onMounted(() => {
      console.log('terminal mounted')
      term.open('terminal');
      nextTick(() => { emit('on-mounted', null); });
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
