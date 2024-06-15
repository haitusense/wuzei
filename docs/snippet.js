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

 // termの古いコード 
    cursor() { return this.terminal.buffer.active.cursorX - this.prompt_str.length; }
    prompt() {
      if(this.linestorage.current_line.length > 0){
        // this.terminal.writeln('\r\n');
      }
      this.terminal.write(this.prompt_str);
      this.terminal.scrollToBottom(); 
      this.linestorage.current_line = '';
    }
      /*
        let len = this.terminal.buffer.alternate.cursorX;
        this.terminal.write("\b \b".repeat(len));
        はいまいち
      */


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
      // localStorage.removeItem('haiterm_buffer')
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
    window.haiterm.resize();
  }
  fromEvent(window,'resize').subscribe(e => { window.haiterm.resize(); });

*/

// from(paneShow).subscribe(async (e) => { 
//   await nextTick()
//   if(paneShow.value){
//     window.haiterm.show('terminal')
//   }
// });

// this.terminal.open(document.getElementById(id));
// this.terminal.element.addEventListener("focus", function() {
//   console.log("onFocus")
//   this.terminal.clearSelection();
// }, true);


// | function         | mouse                | shotcut-key     | terminal command |
// | :--              | :--:                 | :--:            | :--              |
// | prompt-dialog    | center (deep click)  |                 |                  |
// | alert            |                      |                 | alert [message]  |