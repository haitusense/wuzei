//@ts-check

//@ts-ignore
const { onMounted, nextTick, onUnmounted, ref } = window.Vue;
//@ts-ignore
const { /* from */ /* fromEvent */ of, merge, filter, first, delay, switchMap } = window.rxjs;
//@ts-ignore
const { from, fromEvent } = window.VueUse;

/**
 * escape sequence
 * @class
 */
class ESC {
  /*
  以下は同じ意味 \x1b, \033, \u001b, \U0000001b, c系は\e？
  Erases the whole line	                \x1B[2K
  Goes back to the begining of the line	\r
  */
  static hideCursor() { return `\x1b[?25l` }
  static showCursor() { return `\x1b[?25h` }
  static move(n) { return `\x1b[${n}G` }
  static moveLeft(n) { return n > 0 ? `\x1b[${n}D` : '' } /* もしくはhoge.repert(n) */
  static moveRight(n) { return n > 0 ? `\x1b[${n}C` : '' }
  static delAfterCursor() { return `\x1b[0K` }
  static delAfterN(n) { return `\x1b[${n}G\x1b[0K` }
  static eraseLine() { return `\x1b[2K` }
  static backSpace() { return `\b \b` }

  /*
  ターミナルエミュレータのは256色パレットか16色パレットかで色味が違って見える（\x1b[33mは茶色っぽく表示されたり）
                   | 8-defaultcolor | 8-lightcolor | 256-color | RGB
  foreground-color | 30-37          | 90-97        | 38;5;n	   | 38;2;r;g;b
  background-color | 40-47          | 100-107      | 48;5;n    | 48;2;r;g;b
  */
  static def(n) { return `\x1b[0m` }
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

/*** helper methods ***/

/**
 * @param {string} src
 * @returns {Array}
 */
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

/**
 * @param {string} src
 * @returns {object}
 */
function commandlineParser(src){
  const matches = splitcom(src);
  const e = {
    type: matches.filter(n => n.captured)[0]?.captured,
    payload: matches.filter(n => n.captured).slice(1).map(n => n.captured).filter(n => n.trim() !== '')
  };
  return e;
}

/**
 * @param {string} src
 * @returns {string}
 */
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

/**
 * @param {string} prompt_str
 * @param {string} current_line
 * @param {number} pos
 * @returns {string}
 */
function newCurrentLine(prompt_str, current_line, pos){
  const len = pos + prompt_str.length + 1;
  const buf = syntaxHighlighting(current_line);
  return `${ESC.move(0)}${ESC.eraseLine()}${prompt_str}${buf}${ESC.move(len)}`;
}

/**
 * LineStorage
 * @class
 */
class LineStorage {
  /** @type {string} */
  #prefix
  /** @type {{date: number, prompt: string, result: string}} */
  #cur_data
  /** @type {*} */
  #storage
  /** @type {number} */
  #buffer_num
  /** @type {number} */
  #hist_num

  /**
   * @param {string} mode     - local / session
   * @param {string} prefix   - 
   * @param {number} [max=30] - 
   */
  constructor(mode, prefix, max = 30) {
    this.#prefix = prefix;
    this.#buffer_num = max;
    this.#hist_num = -1;

    switch(mode){
      case 'local':
        this.#storage = localStorage;
        break;
      case 'session':
        this.#storage = sessionStorage;
        break;
      default:
        this.#storage = sessionStorage;
        break;
    }

    // 状態復元
    const list = this.list()
    if(list.length < 1){
      this.#cur_data = {
        date: Date.now(),
        prompt : "",
        result : "" 
      }
    }else{
      this.#cur_data = JSON.parse(this.#storage.getItem(list[0]))
    }

  }

  /**
   * @param {string} src - log : 追記
   */
  log(src){
    this.#cur_data = { ...this.#cur_data, result : this.#cur_data.result + src }
    this.#storage.setItem(`${this.#prefix}${this.#cur_data.date}`, JSON.stringify(this.#cur_data));
  }
  /**
   * @param {string} src - prompt : それまでのlogとpromptを保存
   */
  regist(src) {
    // 空データはskip
    if(src.trim().length < 1){ return; }
    // cur_dataの初期化
    this.#cur_data = {
      date: Date.now(),
      prompt : src,
      result : "" 
    }
    this.#storage.setItem(`${this.#prefix}${this.#cur_data.date}`, JSON.stringify(this.#cur_data));
    this.del(this.#buffer_num);
    this.#hist_num = -1
  }

  /**
   * 降順一覧取得
   * @returns {string[]}
   */
  list(){
    return Object.keys(this.#storage).filter(key => key.startsWith(this.#prefix)).sort((a,b) => (a > b ? -1 : 1));
  }
  /**
   * prompt 降順一覧取得
   * @returns {{date: number, prompt: string, result: string}[]}
   */
  history(){
    const list = this.list();
    return list.map(n => JSON.parse(this.#storage.getItem(n)));
  }
  /**
   * 古いdataの削除
   * @param {number} num - 残す数 (0:全削除)
   */
  del(num) {
    const list = this.list();
    list.slice(num).forEach(n=> this.#storage.removeItem(n) );
  }

  /**
   * back
   * @returns {string}
   */
  back() {
    const list = this.list();
    this.#hist_num = this.#hist_num >= list.length - 1 ? list.length - 1 : this.#hist_num + 1;
    // console.log("back", this.#hist_num, list[this.#hist_num])
    const dst = JSON.parse(this.#storage.getItem(list[this.#hist_num]));
    return dst.prompt ?? ""
  }
  /**
   * next
   * @returns {string}
   */
  next() {
    const list = this.list();
    this.#hist_num = this.#hist_num <= -1 ? -1 : this.#hist_num - 1;
    // console.log("next", this.#hist_num, list[this.#hist_num])
    if(this.#hist_num < 0){
      return "";
    }else{
      const dst = JSON.parse(this.#storage.getItem(list[this.#hist_num]));
      return dst.prompt ?? ""
    }
  }

}

/**
 * WPty
 * @class
 */
class WPty {
  /** @type {boolean} */
  #isWaitCom = false;
  /** @type {string} */
  #prompt_str = '';
  /** @type {string} */
  #current_line = ''
  /** @type {number} */
  #pos = 0
  /** @type {LineStorage} */
  #storage

  /** @type {function(any): void} */
  #onData
  /** @type {function(any): void} */
  #onChange
  /** @type {function(any): void} */
  #onSubmit

  /**
   * @param {string} key
   */
  constructor(key){ this.#storage = new LineStorage("session", key, 30); }

  /**
   * @returns {boolean}
   */
  isBusy(){ return !this.#isWaitCom }
  /**
   * termへの書き出し設定
   * @param {function(any): void} func
   */
  onData(func){ this.#onData = func }
  /**
   * promptへの入力のリアルタイム監視
   * @param {function(any): void} func
   */
  onChange(func){ this.#onChange = func }
  /**
   * promptへの入力されたコマンドの処理
   * @param {function(any): void} func
   */
  onSubmit(func){ this.#onSubmit = func }

  /**
   * restore
   */
  restore() {
    console.log("restore")    
    const hist = this.#storage.history();
    if(hist.length > 0){
      hist.reverse();
      hist.forEach((e) => {
        this.#onData(`> ${e.prompt}\r\n`);
        this.#onData(e.result);
        this.#onData("\r\n");
      });
      this.#onData(`\x1B[48;5;025mHistory restored\x1B[0m\r\n`);
    }else{
      this.#onData(`\x1B[48;5;025mwelcome to wterm\x1B[0m\r\n`);
    }
  }
  /**
   * termへのlog書き出し
   * @param {string} e - コマンド受付してないときだけ出力します
   */
  log(e) {
    if(!this.#isWaitCom){ 
      this.#onData(e);
      this.#storage.log(e)
    }
  }
  /**
   * termへのkey入力
   * @param {string|object} e　- コマンド受付中だけ入力します
   * @param {boolean} [append=false] - true : append / false : insert 
   */
  write(e, append = false) {
    if(this.#isWaitCom){ 
      if (typeof e === 'string') {
        if(append) { 
          this.#onStr('append', e)
        }else{
          this.#onStr('insert', e)
        }
        this.#buildOutput();
      }
      else {
        this.#onKey(e);
      }
    }else{ // コマンド受付してない
      console.log('terminal is busy')
      return;
    }
  }
  /**
   * promptへの入力の上書き + enter
   * @param {string} e
   */
  overwrite(e) {
    if(this.#isWaitCom){
      this.#onStr('overwrite', e)
      this.#enter();
    }else{ // コマンド受付してない
      console.log('terminal is busy')
      return;
    }
  }

  /**
   * @param {string} e
   */
  #onStr(type, e){
    // this.#terminal.input(args); // -> onDataに入力
    switch(type){
      case 'insert':
        //@ts-ignore
        this.#current_line = this.#current_line.insert(e, this.#pos);
        this.#pos += e.length;
        this.#buildOutput();
        break;
      case 'append':
        this.#pos = this.#current_line.length;
        //@ts-ignore
        this.#current_line = this.#current_line.insert(e, this.#pos);
        this.#pos += e.length;
        this.#buildOutput();
        break;
      case 'overwrite':
        this.#current_line = e;
        this.#pos += e.length;
        this.#buildOutput();
        break;
      default:
        break;
    }
  }
  /**
   * @param {string|object} e
   */
  #onKey(e){
    const shift = e.domEvent.shiftKey ? 'shift+' : ''
    const ctrl = e.domEvent.ctrlKey ? 'ctrl+' : ''
    const alt = e.domEvent.altKey ? 'alt+' : ''
    const key = `${shift}${ctrl}${alt}${e.domEvent.key}`
    switch(key){

      /*** break -> this.#buildOutput() ***/
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
      case 'shift+ArrowUp': break;
      case 'shift+ArrowDown': break;
      case 'shift+ArrowLeft': break;
      case 'shift+ArrowRight': break;

      /*** ここからreturn ***/
      case 'Enter':
        this.#enter();
        // const bubbling = await this.onAsyncSubmit(json);
        // if(bubbling) { /* rustとの通信 */ this.prompt(); }
        /* this.#current_line初期化はpromptの中 */
        return; 
      default:
        if(!JSON.stringify(e.key).startsWith(String.raw`"\u001`)) {
          this.#onStr('insert', e.key)
        }else{

        }
        return;
    }
    this.#buildOutput();
  }

  /**
   * promptの表示のbuild
   */
  #buildOutput(){
    if(this.#pos < 0) this.#pos = 0;
    if(this.#pos > this.#current_line.length) this.#pos = this.#current_line.length;
    this.#onData(newCurrentLine(this.#prompt_str, this.#current_line, this.#pos));
    this.#onChange(this.#current_line)
  }

  /**
   * enter
   */
  #enter(){
    this.#isWaitCom = false;
    this.#onData(`\r\n`)
    this.#storage.regist(this.#current_line)
    const json = commandlineParser(this.#current_line);
    this.#onSubmit(json);
  }
  /**
   * 新たなプロンプトの表示
   * @param {string} args - プロンプトの頭
   */
  prompt(args){
    this.#prompt_str = args;
    if(this.#current_line.trim().length > 0){
      this.#onData('\r\n');
    }
    this.#current_line = '';
    this.#onData(this.#prompt_str);
    // this.terminal.scrollToBottom();
    this.#isWaitCom = true
  }
  /**
   * プロンプトを表示する
   */
  showprompt(){
    if(!this.#isWaitCom){
      this.#buildOutput();
      this.#isWaitCom = true;
    }
  }
  /**
   * プロンプトを隠す
   */
  hideprompt(){
    if(this.#isWaitCom){
      this.#onData(`${ESC.move(0)}${ESC.eraseLine()}`);
      this.#isWaitCom = false
    }
  }

  /* つかってないコード
  #cursorPos = () => this.#terminal.buffer.active.cursorX - this.#prompt_str.length

     log(src){
      this.write(`\x1b[0G\x1b[2K${src}\r\n`)
      this.#newCurrentLine(this.pty.current_line.length)
    }
  */  
  /*
  const pty = node_pty.spawn(shell, [], {...}); // 仮想ターミナルの作成
  pty.onData(recv => terminal.write(recv));     // 仮想ターミナルからの出力をターミナルに表示
  terminal.onData(send => pty.write(send));     // ターミナルの入力を仮想ターミナルに流す
  */
    
  /******** command ********/

  /** @type {Object.<string, { note:string, func:function(any, function(string):void): void}>} */
  #cmdlet = {
    'welcome' : { 'note': 'cmdlet', 'func':(e, callback) =>{
      console.log("welcome")
      callback("\x1b[38;5;027m\x1b[1m")
      callback("  ##  ##    ::  ::  ::::::  :::  ::::::  ::  ::\r\n")
      callback("##  ##  ##  ..  ::  ..  ::  ...    ::    ..  ::\r\n")
      callback("            ::::::  ::::::  :::    ::    ::  ::\r\n")
      callback("##  ##  ##  ::  ::  ::  ::  :::    ::    ::  ::\r\n")
      callback("  ##  ##    ::  ::  ::  ::  :::    ::    ::::::\r\n")
      callback("\x1b[0m")
    }},
    'echo' : { 'note': 'cmdlet', 'func':(e, callback) =>{
      callback(`${e.payload.join(' ')}`);
    }},
    'command-list' : { 'note': 'cmdlet', 'func':(e, callback) =>{
      callback(`  note     Name\r\n`);
      callback(`  ----     ----\r\n`);
      for (const i of Object.keys(this.#cmdlet)) {
        callback(`  ${this.#cmdlet[i].note.padEnd(8, ' ')} ${i}\r\n`);
      }
    }},
    'forecolor-list' : { 'note': 'cmdlet', 'func':(e, callback) =>{
      for (let j = 0; j < 32; j++) {
        for (let i = 0; i < 8; i++) {
          let k = i + j*8;
          callback(`\x1b[38;5;${k}m${('000'+k).slice(-3)} `)
        }
        callback(`\x1b[0m\r\n`)
      }
      callback(`end\r\n`)
    }},
    'backcolor-list' : { 'note': 'cmdlet', 'func':(e, callback) =>{
      for (let j = 0; j < 32; j++) {
        for (let i = 0; i < 8; i++) {
          let k = i + j*8;
          callback(`\x1b[48;5;${k}m${('000'+k).slice(-3)}\x1b[0m `)
        }
        callback(`\r\n`)
      }
      callback(`end\r\n`)
    }},
    'history' : { 'note': 'cmdlet', 'func':(e, callback) =>{
      callback(`\x1b[48;5;010m`);
      callback(`  Id     Duration CommandLine\r\n`);
      callback(`  --     -------- -----------\r\n`);
      callback(`\x1b[0m`);      
      const hist = this.#storage.history();
      hist.forEach(n=>{
        callback(`n.prompt`);
      });

    }},
  };

  /**
   * setCmd
   * @param {Object.<string, { note:string, func:function(any, function(string):void): void}>} obj
   */
  setCmd(obj){ this.#cmdlet = { ...this.#cmdlet, ...obj } }

  /**
   * setCmd
   * @param {any} e
   */
  async asyncCmd(e){
    const callback = (n)=> this.log(n);
    if (e.type in this.#cmdlet) {
      await this.#cmdlet[e.type].func(e, callback);
    } else {
      callback("\x1b[38;5;009m")
      callback(`The term '${e.type}' is not recognized as a name of a cmdlet, function, script file, or executable program.`)
      callback("\x1b[0m\r\n")
    }
  }

}

/*** wtermComponent ****/

const wtermComponent = {
  template: `<div id="terminal" ref="terminalRef" style="height: 100%; background-color:black; opacity:1"> </div>`,
  data() { return { /* count: 0 */ } },
  props: {
    beforeOnKey: { type: Function, }, /* asyncにしない */
    pty: { type: Object, default: new WPty("default"), required: false },
  },
  methods: {
    clear() { this.terminal.clear() },
  },
  /*
    emit: on-change, on-submit, on-mounted
    emitはasyncできないのでasyncでreturn欲しい場合はpropsでつなぐ
  */
  setup(props, { emit }) {
    console.log("setup term") /*毎回呼ばれる*/
    const terminalRef = ref(null);

    /******** terminal ********/
    const pty = props.pty;
    //@ts-ignore
    const terminal = new window.Terminal({
      fontSize: 12,
      fontFamily: "Consolas, 'Courier New', monospace",
      RendererType: 'canvas',
      theme: { /* foreground: 'yellow', */ }
    });
    //@ts-ignore
    const fitAddon = new window.FitAddon.FitAddon()
    
    // init term
    {
      terminal.loadAddon(fitAddon);
      if (terminal._initialized) { return; }
      terminal._initialized = true;

      // not use : terminal.prompt = () =>{ };
      // not use : terminal.onData(e => { });
      // not use : terminal.onCursorMove(e => { console.log("onCursorMove ", this.#terminal.buffer) });   
      terminal.onKey( e => { 
        /* asyncにするとgetSelection()が取れないことがあるので同期化 */
        if(pty.isBusy()) {
          console.log('terminal is busy')
          return;
        }
        // if( !props.beforeOnKey(e) ){ return; }
        const shift = e.domEvent.shiftKey ? 'shift+' : ''
        const ctrl = e.domEvent.ctrlKey ? 'ctrl+' : ''
        const alt = e.domEvent.altKey ? 'alt+' : ''
        const key = `${shift}${ctrl}${alt}${e.domEvent.key}`
        switch(key){
          case 'ctrl+v':
            navigator.clipboard.readText().then((n) => { pty.write(n) });
            break;
          case 'ctrl+c':
            navigator.clipboard.writeText(terminal.getSelection())
            break;
          case 'ctrl+l': clear(); break;
          default:
            pty.write(e)
            break;
        }
      });
   
    }
    
    // init pty
    {
      pty.onData((e)=>{ terminal.write(e); })
      pty.onChange((e) => { emit('on-change', e) });
      // pty.onSubmit((e) => { 
      //   // 通常はemit
      //   emit('on-submit', e)
      //   
      //   // formEventで拾う&bubblingしたいときはCustomEvent
      //   terminalRef.value.dispatchEvent(new CustomEvent('action', {
      //     bubbles: true,
      //     detail: e
      //   }));
      // });
    }

    /******** method ********/
    const open = (id)=> {
      const elem = document.getElementById(id);
      if(elem == undefined){
        console.error(`${id} not found`);
        return;
      }
      terminal.open(elem);
      const imageContainerObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          // console.log(entry.contentRect.height, entry.contentRect.width)
          fitAddon.fit();
          terminal.scrollToBottom();
        });
      });
      imageContainerObserver.observe(elem);
      fitAddon.fit();

      // restore
      terminal.clear();
      pty.restore();
      terminal.focus();
    }

    const close = () =>{
      console.log("release terminal/pty")
      // 入力時に書き込んでるのでterminalの内容を拾う必要ない
      // terminal.selectAll()
      // const buffer = terminal.getSelection().trim()
      terminal.dispose()

      pty.onData((e)=>{ console.log(e); })
      pty.onChange((e) => { });
    }

    const clear = () => { 
      // localStorage.removeItem('wterm_buffer')
      terminal.clear()
      terminal.scrollToBottom();
      pty.prompt()
    }

    /******** key event ********/
    /* fromEventは何が流れてくるのか分かりにくいので未使用 */
  
    /******** mouse event ********/

    /* mousedown */
    fromEvent(terminalRef, 'mousedown').pipe(filter(e=> e.buttons == 4)).subscribe(e => {
      // navigator.clipboard.readText().then((n) => term.input_append(n));
      e.preventDefault();
    });

    /* drop */
    {
      //@ts-ignore
      const wv = window.chrome.webview;

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
        // term.input_append(path)
        terminalRef.value.style.opacity = 1
      }
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
    }

    /******** onMounted ********/
    onMounted(() => {
      console.log('terminal mounted')
      open('terminal');
      nextTick(() => { emit('on-mounted', null); });
    }),
    onUnmounted(() => {
      console.log('terminal unmounted') // 常にlog書き込み -> windowclose時の検討不必要
      close()
    })
    return { terminalRef, terminal, pty }
  }
}

export { wtermComponent, WPty, commandlineParser };


