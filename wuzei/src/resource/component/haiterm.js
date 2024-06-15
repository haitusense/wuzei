/**
 * haiterm.js ver 0.1.0
 */
//@ts-check

//@ts-ignore
const [ Vue, rxjs, VueUse, Terminal, FitAddon ] = [ window.Vue, window.rxjs, window.VueUse, window.Terminal, window.FitAddon.FitAddon]
const { onMounted, nextTick, onUnmounted, ref } = Vue;
const { filter } = rxjs;
const { fromEvent } = VueUse;

/**************** ESC ****************/

/** @enum {string} */
const ESC = Object.freeze({
  /* \x1b = \033 = \u001b = \U0000001b, c系は\e？ */

  /* ターミナルエミュレータのは256色パレットか16色パレットかで色味が違って見える（\x1b[33mは茶色っぽく表示されたり）
                     | 8-defaultcolor | 8-lightcolor | 256-color | RGB
    foreground-color | 30-37          | 90-97        | 38;5;n	   | 38;2;r;g;b
    background-color | 40-47          | 100-107      | 48;5;n    | 48;2;r;g;b
  */
  DEF    : `\x1b[0m`,
  BOLD   : '\x1b[1m',
  rev    : '\x1b[7m',
  R      : '\x1b[38;5;009m',
  G      : '\x1b[38;5;041m',
  B      : '\x1b[38;5;032m', // haitu blue
  Y      : '\x1b[38;5;011m',
  // DEF    : `\x1b[?25l`,
  Cancel : `\x1b[0m`,
  Rb     : '\x1b[48;5;009m',
  Gb     : '\x1b[48;5;041m',
  Bb     : '\x1b[48;5;032m',
  Yb     : '\x1b[48;5;011m',
  SEL    : `\x1b[48;5;246m`, // '\x1b[7m'だとカーソルと区別しにくいのでBackFroundColor系を使用する

  Fore  : (n) => `\x1b[38;5;${n}m`,
  Back  : (n) => `\x1b[48;5;${n}m`,

  hideCursor : `\x1b[?25l`,
  showCursor : `\x1b[?25h`,
  move       : (n) => `\x1b[${n}G`, /* もしくはhoge.repert(n) */
  delAfterCursor : `\x1b[0K`,
  delAfterN  : (n) => `\x1b[${n}G\x1b[0K`,
  eraseLine  : `\x1b[2K`,  // Erases the whole line
  BS         : `\b \b`,           // BackSpace
  RL         : `\r`,           // Goes back to the begining of the line
})

/**************** LineStorage ****************/

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
      case 'local': { this.#storage = localStorage; } break;
      case 'session':
      default: { 
        this.#storage = sessionStorage; 
      } break;
    }

    // 状態復元
    const list = this.listKeys;
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
   * storage keyの一覧降順取得
   * @returns {string[]}
   */
  get listKeys(){ return Object.keys(this.#storage).filter(key => key.startsWith(this.#prefix)).sort((a,b) => (a > b ? -1 : 1)); }
  /**
   * Prompt historyの一覧降順取得 (重複削除)
   * @returns {string[]}
   */
  get listPrompts(){ return Array.from(new Set(this.listKeys.map((n) => JSON.parse(this.#storage.getItem(n)).prompt ))); }


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
   * prompt 降順一覧取得
   * @returns {{date: number, prompt: string, result: string}[]}
   */
  history(){ return this.listKeys.map(n => JSON.parse(this.#storage.getItem(n))); }

  /**
   * 古いdataの削除
   * @param {number} num - 残す数 (0:全削除)
   */
  del(num) { this.listKeys.slice(num).forEach(n=> this.#storage.removeItem(n) ); }

  /**
   * back
   * @returns {string}
   */
  back() {
    const list = this.listPrompts;
    this.#hist_num = this.#hist_num >= list.length - 1 ? list.length - 1 : this.#hist_num + 1;
    return list[this.#hist_num] ?? ""
  }
  /**
   * next
   * @returns {string}
   */
  next() {
    const list = this.listPrompts;
    this.#hist_num = this.#hist_num <= -1 ? -1 : this.#hist_num - 1;
    return this.#hist_num < 0 ? "" :  list[this.#hist_num]
  }

}

/**************** CurLineManager ****************/

/**
 * CursorManager
 * @class
 */
class CurLineManager {
  
  /******** private field ********/

  /** @type {string} */
  #line = ''
  /** @type {number} */
  #pos = 0
  /** @type {number} */
  #select = 0
  /** @type {number} */
  #mode = 0

  /******** property ********/

  /** @returns {number} */
  get length() { return this.#line.length; }

  /** @returns {string} */
  get str() { return this.#line; }
  /** @returns {Object} */
  get json() { return CurLineManager.CmdParser.parse(this.#line); }

  /** @returns {number} */
  get postion() { return this.#pos; }
  /** @returns {{start, end, length}} */
  get selected() {
    const start = this.#pos < this.#select ? this.#pos : this.#select;
    const end = (this.#pos < this.#select ? this.#select : this.#pos) + this.#mode;
    return {
      start : start ,
      end : end,
      length : end - start
    }
  }

  /******** method ********/

  /**
   * 
   * @param {string} str 
   */
  new(str){
    if(typeof str !== "string"){
      console.error("err in new()")
      return;
    }
    this.#line = str
    this.pos(str.length, false)
  }

  /**
   * set insert / overwite mode
   * @param {string} mode - default : insert
   */
  mode(mode){
    switch(mode){
      case 'overwrite': { this.#mode = 1; } break;
      case 'insert':
      default: { this.#mode = 0; } break;
    }
  }

  /**
   * set cur position
   * @param {number} n
   * @param {boolean} shift - select mode
   */
  pos(n, shift = false){
    const dst = n;
    this.#pos = dst < 0 ? 0 : this.#line.length < dst ? this.#line.length : dst;
    if(!shift){
      this.#select = this.#pos;
    }
  }

  /**
   * move cur position
   * @param {number} n      - +1 : increment  -1 : decrement
   * @param {boolean} shift - select mode
   */
  move(n, shift = false){
    const dst = this.#pos + n;
    this.#pos = dst < 0 ? 0 : this.#line.length < dst ? this.#line.length : dst;
    if(!shift){
      this.#select = this.#pos;
    }
  }

  /**
   * move cur position
   */
  getSelection(){ return this.#line.slice(this.selected.start, this.selected.end) }

  /**
   * insert string
   * @param {string} src
   */
  input(src){
    const front = this.#line.slice(0, this.selected.start);
    const back = this.#line.slice(this.selected.end);

    this.#line = front + src + back;
    this.move(src.length, false)
  }

  /**
   * @param {string} prompt_str
   */
  currentLine(prompt_str){
    const len = this.#pos + prompt_str.length + 1;
    const buf = CurLineManager.CmdParser.syntaxHighlighting(this.#line, this.selected.start, this.selected.length);
    return `${ESC.move(0)}${ESC.eraseLine}${prompt_str}${buf}${ESC.move(len)}`;
  }

  /******** commandline perser ********/

  static CmdParser = Object.freeze({
    /**
     * @param {string} src
     * @returns {{full:string, captured:string, index:number}[]}
     */
    splitcom : (src) =>{
      // A: const result = src.match(/"([^"]*?)"|'([^']*?)'|[^\s"']+/g);
      // B: const result = src.split(/(?:"([^"]+)"|'([^']*?)'|([^\s"']+)) ?/).filter(e => e)
      // return Array.from(src.matchAll(/"([^"]*?)"|'([^']*?)'|([^\s"']+)|([\s]+)/g)).map((n, index, arr) => {
      if(src){
        const matches = src.matchAll(/"([^"]*?)"|'([^']*?)'|([^\s"']+)|("[^"]*)$|('[^']*)$|([\s]+)/g);
        return Array.from(matches).map((n, _index, _arr) => {
          return { full:n[0], captured: n[1] || n[2] || n[3] || n[4] || n[5] || n[6], index: n.index };
        });
      }else{
        return []
      }
    },
    /**
     * @param {string} src
     * @returns {object}
     */
    parse : (src) => {
      const matches = CurLineManager.CmdParser.splitcom(src)
      const e = {
        type: matches.filter(n => n.captured)[0]?.captured,
        payload: matches.filter(n => n.captured).slice(1).map(n => n.captured).filter(n => n.trim() !== '')
      };
      return e;
    },
    /**
     * @param {string} src
     * @param {number} start  - select start
     * @param {number} length - select length
     * @returns {object}
     */
    syntaxHighlighting : (src, start, length) => { // 色付け
      let flag = false;
      let code = CurLineManager.CmdParser.splitcom(src).reduce((acc, match, index)=>{
        const c = (() => {
          if(match.full.trim() === ""){
            return ESC.DEF;
          }else if(!flag){
            flag = true;
            return ESC.Y;
          }else if(match.full.startsWith('\"') || match.full.startsWith('\'')){
            return ESC.G;
          }else if(match.full.startsWith('-')){
            return ESC.B;
          }else{
            return ESC.DEF;
          }
        })();
        return acc.concat(Array(match.full.length).fill(c));
      }, [ESC.DEF]);
  
      // select部の置き換え, 破壊関数+index '1' ずれなので注意
      code.splice(start + 1, length, ...(Array(length).fill(ESC.SEL)))
  
      // 変わり目だけにesc挿入
      const dst = Array.from(src).reduce((acc, cur, index) => {
        if(code[index] !== code[index + 1]){
          return `${acc}${ESC.DEF}${code[index + 1]}${cur}`
        }else{
          return `${acc}${cur}`
        }
      }, "");
  
      return dst + ESC.DEF;
    }

  })

}

/**************** WPty ****************/

/**
 * WPty
 * @class
 */
class WPty {
  /** @type {boolean} */
  #isWaitCom = false;
  /** @type {string} */
  #prompt_str = '';
  
  /** @type {CurLineManager} */
  #cur = new CurLineManager();
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
      this.#onData(`*\x1B[48;5;025mHistory restored\x1B[0m\r\n`);
    }else{
      this.#onData(`*\x1B[48;5;025mwelcome to haiterm\x1B[0m\r\n`);
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
   * @param {string} [mode='insert'] - append, insert, overwrite, execute
   */
  input(e, mode = 'insert') {
    if(!this.#isWaitCom){ 
      console.log('terminal is busy')
      return;
    }else{
      if(typeof e === 'string'){
        this.#onStr(mode, e)
      }else{
        this.#onKey(e);
      }
    }
  }

  /**
   * @param {string} e
   */
  #onStr(type, e){
    // this.#terminal.input(args); // -> onDataに入力
    switch(type){
      case 'insert':
        this.#cur.input(e)
        this.#buildOutput();
        break;
      case 'append':
        this.#cur.pos(this.#cur.length)
        this.#cur.input(e)
        this.#buildOutput();
        break;
      case 'overwrite':
        this.#cur.new(e)
        this.#buildOutput();
        break;
      case 'execute':
        this.#cur.new(e)
        this.#buildOutput();
        this.#enter();
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

      case 'ArrowLeft': { this.#cur.move(-1, false) } break;
      case 'ArrowRight': { this.#cur.move(+1, false) } break;
      case 'shift+ArrowLeft': { this.#cur.move(-1, true) } break;
      case 'shift+ArrowRight': { this.#cur.move(+1, true) } break;

      case 'ctrl+ArrowLeft': { this.#cur.pos(0, false) } break;
      case 'Home': { this.#cur.pos(0, false) } break;
      case 'ctrl+ArrowRight': { this.#cur.pos(this.#cur.length, false) } break;
      case 'End': { this.#cur.pos(this.#cur.length, false) } break;
      case 'Delete': { this.#cur.move(+1, true); this.#cur.input(''); } break;
      case 'Backspace': { this.#cur.move(-1, true); this.#cur.input(''); } break;
      case 'shift+ArrowUp': break;
      case 'shift+ArrowDown': break;

      case 'ctrl+v': { 
        navigator.clipboard.readText().then((n) => { this.input(n) });
      } break;
      case 'ctrl+c': { 
        navigator.clipboard.writeText(this.#cur.getSelection());
        this.#cur.move(0, false)
      } break;
      case 'ctrl+a': { 
        this.#cur.pos(0, false)
        this.#cur.move(this.#cur.length, true)
      } break;
      /*** ここからreturn ***/
      case 'ArrowUp': this.#onStr('overwrite', this.#storage.back()); return;
      case 'ArrowDown': this.#onStr('overwrite', this.#storage.next()); return;

      case 'Enter': this.#enter(); return; 
      // const bubbling = await this.onAsyncSubmit(json);
      // if(bubbling) { /* rustとの通信 */ this.prompt(); }
      /* this.#current_line初期化はpromptの中 */

      default:
        if(!JSON.stringify(e.key).startsWith(String.raw`"\u001`)) {
          this.#onStr('insert', e.key);
        }
        return;
    }
    this.#buildOutput();
  }

  /**
   * promptの表示のbuild
   */
  #buildOutput() {
    this.#onData(this.#cur.currentLine(this.#prompt_str));
    this.#onChange(this.#cur.str)
  }

  /**
   * enter
   */
  #enter(){
    this.#isWaitCom = false;
    this.#onData(`\r\n`)
    this.#storage.regist(this.#cur.str)
    this.#onSubmit(this.#cur.json);
  }
  /**
   * 新たなプロンプトの表示
   * @param {string} args - プロンプトの頭
   */
  prompt(args){
    this.#prompt_str = args;
    if(this.#cur.str.trim().length > 0){
      this.#onData('\r\n');
    }
    this.#cur.new('');
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
      this.#onData(`${ESC.move(0)}${ESC.eraseLine}`);
      this.#isWaitCom = false
    }
  }

  /******** command ********/

  /** @type {Object.<string, { type:string, func:function(any, function(string):void): void}>} */
  #cmdlet = {
    'welcome' : { 'type': 'cmdlet', 'func':(e, callback) =>{
      const env = {
        language : window.navigator.language,
        userAgent  : window.navigator.userAgent,
      }
      // cybermedium
      callback(`${ESC.B+ESC.BOLD}`)
      callback("   ███   ███      ▄▄▄   ▄▄▄  ▄▄▄▄▄▄▄▄▄  ▄▄▄  ▄▄▄▄▄▄▄▄▄  ▄▄▄   ▄▄▄\r\n")
      callback("▄▄▄▀▀▀▄▄▄▀▀▀▄▄▄   ▀▀▀   ███  ▀▀▀▀▀▀███  ▀▀▀  ▀▀▀███▀▀▀  ▀▀▀   ███\r\n")
      callback("███   ███   ███   ███▄▄▄███  ███▄▄▄███  ███     ███     ███   ███\r\n")
      callback("                  ███▀▀▀███  ███▀▀▀███  ███     ███     ███   ███\r\n") 
      callback("███   ███   ███   ███   ███  ███   ███  ███     ███     ███▄▄▄███\r\n")
      callback("▀▀▀▄▄▄▀▀▀▄▄▄▀▀▀   ▀▀▀   ▀▀▀  ▀▀▀   ▀▀▀  ▀▀▀     ▀▀▀     ▀▀▀▀▀▀▀▀▀\r\n")
      callback(`   ███   ███           海       图       微       电       子     \r\n${ESC.DEF}`)
      callback(`                    haitusense Co.,Ltd. in Hefei China since 2018\r\n`)
      callback(`${ESC.BOLD}`)
      callback(' '.repeat(25) + String.raw`_  _  __  _ ___  ___  __  _  _    _ ___` + "\r\n")
      callback(' '.repeat(25) + String.raw`|__| |__| |  |  |___ |__| |\/|    | [__ ` + "\r\n")
      callback(' '.repeat(25) + String.raw`|  | |  | |  |  |___ |  \ |  | . _| ___]` + "\r\n")
      callback(JSON.stringify(env, undefined, 2).replace(/\n/g, '\r\n'))
    }},
    'get-environment' : { 'type': 'cmdlet', 'func':(e, callback) =>{
      // console.log(new Intl.Locale(window.navigator.language))
      const env = {
        hardwareConcurrency : window.navigator.hardwareConcurrency,
        language : window.navigator.language,
        languages : window.navigator.languages,
        timeZones : Intl.DateTimeFormat().resolvedOptions(),
        maxTouchPoints : window.navigator.maxTouchPoints ,
        onLine  : window.navigator.onLine,
        pdfViewerEnabled : window.navigator.pdfViewerEnabled,
        userAgent  : window.navigator.userAgent,
        //@ts-ignore
        userAgentData  : window.navigator.userAgentData,
      }
      callback(JSON.stringify(env, undefined, 2).replace(/\n/g, '\r\n'))
    }},
    'sleep' : { 'type': 'function', 'func': async (e, callback) =>{
      for (let step = 0; step <= 100; step++) {
        const cuttlefish = Math.floor(step / 10) % 2 == 0 ? 'くコ:ミ': 'くコ:彡';
        const dust = ['₃   ', '³₃  ', '₃³₃ ', '³₃³₃'][Math.floor(step / 10) % 4];
        callback(`${ESC.move(0)}${ ('000'+step).slice(-3) }% ${ cuttlefish }${dust}`);
        await (()=> new Promise(resolve => setTimeout(resolve, 30)) )();
      }
      callback(`\r\n`);
    }},
    'geolocation' : { 'type': 'cmdlet', 'func':  async (e, callback) =>{
      const position = await (() => new Promise( (resolve, reject) => window.navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error)
      ) ))();
      const dst = {
        latitude : position.coords.latitude,   /*緯度*/
        longitude : position.coords.longitude, /*経度*/ 
        altitude : position.coords.altitude,   /*高度*/ 
        accuracy : {                           /*精度*/ 
          latitude : position.coords.accuracy,
          longitude : position.coords.accuracy,
          altitude : position.coords.altitudeAccuracy,
        }
      }
      callback("geolocation : \r\n");
      callback(JSON.stringify(dst,undefined,2).replace(/\n/g, '\r\n'));
    }},
    'echo' : { 'type': 'cmdlet', 'func':(e, callback) =>{
      callback(`echo : ${e.payload.join(' ')}`);
    }},
    'get-command' : { 'type': 'cmdlet', 'func':(e, callback) =>{
      callback(`  CommandType     Name\r\n`);
      callback(`  -----------     ----\r\n`);
      for (const i of Object.keys(this.#cmdlet)) {
        callback(`  ${this.#cmdlet[i].type.padEnd(15, ' ')} ${i}\r\n`);
      }
    }},
    'get-forecolor' : { 'type': 'cmdlet', 'func':(e, callback) =>{
      for (let j = 0; j < 32; j++) {
        for (let i = 0; i < 8; i++) {
          let k = i + j*8;
          callback(`${ESC.Fore(k)}${('000'+k).slice(-3)}${ESC.DEF} `)
        }
        callback(`\r\n`)
      }
      callback(`\r\n`)
    }},
    'get-backcolor' : { 'type': 'cmdlet', 'func':(e, callback) =>{
      for (let j = 0; j < 32; j++) {
        for (let i = 0; i < 8; i++) {
          let k = i + j*8;
          callback(`${ESC.Back(k)}${('000'+k).slice(-3)}${ESC.DEF} `)
        }
        callback(`\r\n`)
      }
      callback(`\r\n`)
    }},
    'history' : { 'type': 'cmdlet', 'func':(e, callback) =>{
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const label = `timestamp(${tz})`;
      const cnt = Math.max(19, label.length);
      const hist = this.#storage.history();
      callback(`${ESC.G}`)
      callback(`  ${ label           }  CommandLine\r\n`);
      callback(`  ${ '-'.repeat(cnt) }  -----------\r\n`);
      callback(`${ESC.DEF}`)
      hist.forEach( n =>{
        const date = (new Date(n.date)).toLocaleString('sv-SE', { timeZone: tz });
        callback(`  ${date.padEnd(cnt)}  ${n.prompt}\r\n`);
      });

    }},
  };

  /**
   * setCmd
   * @param {Object.<string, { type:string, func:function(any, function(string):void): void}>} obj
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
    } else if(e.type === undefined) {
      /* なにもしない */
    } else {
      callback(`${ESC.R+ESC.BOLD}The term '${e.type}' is not recognized as a name of a cmdlet, function, script file, or executable program.${ESC.DEF}`)
    }
  }

}

/**************** Component ****************/

/**
 * props   : fontSize, fontFamily. beforeOnKey, pty \
 * methods : \
 * emit    : on-change, on-submit, on-mounted, on-drop \
 *   asyncでreturn欲しい場合はpropsでつなぐ
 */
const haitermComponent = {
  template: `<div id="hai-term" ref="terminalRef" style="height: 100%; background-color:black; opacity:1"> </div>`,
  data() { return { /* count: 0 */ } },
  props: {
    fontSize: { type: [Number, String], default: 13 }, /*リアルタイムに反映させてないので再描画必要*/
    fontFamily: { type: String, default: "Consolas, 'Courier New', monospace" },
    beforeOnKey: { type: Function }, /* asyncにしない */
    pty: { type: Object },
  },
  methods: { },
  setup(props, { emit }) {
    console.log(`setup term`)
    const terminalRef = ref(null);

    /******** terminal ********/
    const pty = props.pty;
    const terminal = new Terminal({
      fontSize: Number(props.fontSize),
      fontFamily: props.fontFamily,
      RendererType: 'canvas',
      theme: { /* foreground: 'yellow', */ }
    });
    const fitAddon = new FitAddon()
    
    // init term
    {
      terminal.loadAddon(fitAddon);
      if (terminal._initialized) { return; }
      terminal._initialized = true;

      let scrollFunc = undefined; // 強制スクロールがうまく抑制できないのでスクロール後に巻き戻し
      terminal.onKey( e => { 
        /* 
          - asyncにするとgetSelection()が取れないことがあるので同期化
          - terminalに特化した動作のみ
            - copy&pasteはマウスに選択に関わるところのみ（キーボード入力選択は別枠
            - 画面スクロールに関わる命令
        */
        const nowLine = terminal.buffer.active.viewportY;
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
          case 'ctrl+c': // マウスイベント優先
            if(terminal.getSelectionPosition()){  
              navigator.clipboard.writeText(terminal.getSelection())
            }else{
              pty.input(e)
            }
            break;
          case 'ctrl+alt+PageUp': {
            terminal.scrollLines(-1);
            //@ts-ignore
            scrollFunc = (n) => terminal.scrollLines(nowLine - 1 - n);
          } break;
          case 'ctrl+alt+PageDown': {
            terminal.scrollLines(-1);
            //@ts-ignore
            scrollFunc = (n) => terminal.scrollLines(nowLine + 1 - n);
          } break;
          case 'ctrl+Home': {
            terminal.scrollLines(-1);
            //@ts-ignore
            scrollFunc = (n) => terminal.scrollToTop();
          } break;
          case 'ctrl+End': {
            terminal.scrollLines(-1);
            //@ts-ignore
            scrollFunc = (n) => terminal.scrollToBottom();
          } break;
          default: { pty.input(e); } break;
        }
        /* rustで受ける際
          window.ipc.postMessage(JSON.stringify({
            altKey : e.domEvent.altKey,
            ctrlKey : e.domEvent.ctrlKey,
            metaKey : e.domEvent.metaKey,
            shiftKey : e.domEvent.shiftKey,
            key : e.domEvent.key,
            charCode : e.domEvent.charCode,
            code : e.domEvent.code,
            keyCode : e.domEvent.keyCode,
            selection : this.terminal.getSelection() // select外れるないように
          })); 
        */
      });
      terminal.onScroll(e =>{ 
        if(scrollFunc){
          const buf = scrollFunc;
          scrollFunc = undefined;
          //@ts-ignore
          buf(e);
        }
      });
      // not use : terminal.prompt = () =>{ };
      // not use : terminal.onData(e => { });
      // not use : terminal.onCursorMove(e => { console.log("onCursorMove ", this.#terminal.buffer) });

      // fromEvent(document, 'keydown').subscribe( e => { console.log("ok",e) });
    }
    
    // init pty
    {
      pty.onData((e)=>{ terminal.write(e); })
      pty.onChange((e) => { emit('on-change', e) });
      // pty.onSubmit((e) => { emit('on-submit', e) });
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

      terminal.clear();
      pty.restore();
      terminal.focus();
    }

    const close = () =>{
      console.log("release terminal/pty")
      // 入力時に書き込んでるのでterminalの内容を拾う必要ない -> windowclose時の検討不必要
      // terminal.selectAll()
      // const buffer = terminal.getSelection().trim()
      terminal.dispose()

      pty.onData((e)=>{ console.log(e); })
      pty.onChange((e) => { });
    }

    /******** key/mouse event ********/

    /* keydown/mousedown */
    {
      /* fromEventは何が流れてくるのか分かりにくいので未使用 */
      fromEvent(terminalRef, 'mousedown').pipe(filter(e=> e.buttons == 4)).subscribe(e => {
        navigator.clipboard.readText().then((n) => pty.input(n) );
        e.preventDefault();
      });  
    }

    /* drop */
    {
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
      fromEvent(terminalRef, 'drop').subscribe(e => {
        // e.stopPropagation(); e.preventDefault(); で伝播をとめるのは親側で
        emit('on-drop', e)
        terminalRef.value.style.opacity = 1
      })
    }

    /******** onMounted ********/
    onMounted(() => {
      console.log(`terminal mounted`)
      open('hai-term');
      nextTick(() => { emit('on-mounted', null); });
    }),
    onUnmounted(() => {
      console.log('terminal unmounted')
      close()
    })
    return { terminalRef, terminal, pty }
  }
}

/**************** export ****************/

export { haitermComponent, WPty };


