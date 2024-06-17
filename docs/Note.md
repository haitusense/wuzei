# Note

### 親要素で変更検知

- 子 -> 親 一方向
  - emit : 投げっぱなし
  - props + Function : 戻り値を取得 + asyncできる
  - CustomEvent : eventとして拾う。bubblingすればdoucumentでも拾える
- 子 <-> 親 双方向
  - props + emit
  - defineModel : Vueの新しいverで使用可能

```html
<div id ="app">
  <my-component 
    :on-click-props="async (e) =>{ return true; }"
    @on-click-emit="(e)=>{ console.log(e) }"
    :my-state="state" @update:my-state="$event => (state = $event)"
  ></my-component>
</div>
<script type="module">
  const app = {
    setup(props, { emit }) {
      fromEvent(document, 'action').subscribe(async e=>{ console.log("event", e) });
    }
  }
</script>
```

```javascript
const myComponent = {
  props: {
    onClickProps: { type: Function },
    myState: { type: String },
  }
  setup(props, { emit }) {
    const myRef = ref(null)

    // call event
    const onClick = async (e)=> {
      emit('on-click-emit', e);
      const dst = await props.onClickProps(e);
      myRef.value.dispatchEvent(new CustomEvent('action', { bubbles: true, detail: e }));
      console.log(dst)
    }

    // two-way
    const state = computed({ get: () => props.myState, set: (e) => emit("update:my-state", e) });
    from(state).subscribe(e => { console.log(state); });
    state.value = "new value";
  }
}
```

### Drop

```javascript
  e[0].event.constructor.name
// 変更前 問題点 : 
//   drop$内で処理 -> aysncなのでfromEvent(wv, 'newWindowReq')より遅く流れることがある
//   fromEvent(wv, 'newWindowReq')内で処理 -> 処理中にevent handler抜けて破棄される

const drop$ = fromEvent(target, 'drop').pipe(...)
( wv 
  ? drop$.pipe( switchMap( e => merge( of(e).pipe(delay(200)), fromEvent(wv, 'newWindowReq')).pipe(first()) ))
  : drop$.pipe( tap(e => { e.event.stopPropagation(); e.event.preventDefault(); }), map(e => [ e, undefined ]) )
).subscribe( )

// ↓
// 変更
//   drop$内で処理して結果をemitする
//   drop$とfromEvent(wv, 'newWindowReq')が逆順になるが1vs1ではあるのでzipでまとめる
//   preventDefaultの為、fromEvent(document, 'drop') / fromEvent(wv, 'newWindowReq')の切り替えとする
//   e2.constructor.nameで分岐してもいいけど面倒なのでmapでundefinedにする

( wv 
  ? zip(drop$, fromEvent(wv, 'newWindowReq'))
  : zip(drop$, fromEvent(document, 'drop').pipe( tap(e => e.preventDefault(); ))).pipe( map(e => [e[0], undefined]) )
).subscribe( )
```

### junk

```javascript
async function hoge(e) {
  console.log('hoge() start', e);
  return new Promise(resolve => setTimeout(() => {
    console.log('hoge() completed', e);
    resolve();
  }, 2000));
}
mousewheel$.pipe(
  buffer(busyChanged$),
  // concatMap((e) => hoge(e))
).subscribe(e => {
  console.log('buffer:', e);
});
```

```javascript
const mousedown$ = fromEvent(divRef, 'mousedown').pipe(
  switchMap((e) => merge( of(e).pipe(delay(200)), mouseup$).pipe(first())),
  share()
);

mousedown$.pipe(
  filter((e) => e.type === 'mousedown'),
  tap(e => {
    selectArea.value = { 
      x: e.offsetX,
      y: e.offsetY, 
      width: 1, 
      height: 1 }
    }
  ),
  mergeMap(start => mousemove$.pipe(
    map(end => ({ start: start, end: end, })),
    takeUntil(mouseup$),
    tap(e => {
      console.log('drag', e, e.start.offsetX, e.end.offsetX)
      selectArea.value = { 
        x: e.start.offsetX,
        y: e.start.offsetY, 
        width: e.end.screenX - e.start.screenX , 
        height: e.end.screenY - e.start.screenY }
    })
  )),
  switchMap(e => mouseup$.pipe(
    map(end => ({ start: e.start, end: end, })),
  ))
).subscribe(e => { console.log('up', e) });
```

## haiterm

```js
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

```