

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

## wterm

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