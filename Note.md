# eventの順番

初回呼び出しをどう判断するか

```  
                                    F5
resist_javascript app.js            ↓
↓                                   ↓
Event::NewEvents(StartCause::Init)  ↓
↓                                   ↓
navigation                          navigation
  ↓                                   ↓
  <script src=""></script>            <script src=""></script>
  ↓                                   ↓
  window.addEventListener("load")     ...
  ↓
  app mounted
  ↓
  app rendered
↓
...
↓
Event::NewEvents(StartCause::Exit)
```

beforeunload, unloadはうまく取れないのでどうしよう

# rustへのcall

terminalでのテスト
- sleep-js    : js
- sleep-event : ipc.postMessage -> (evaluate_script) -> (new CustomEvent)
- sleep-async : await fetch -> (evaluate_script) -> term.prompt

# eventの種類

# 要修正

- unwrap全体
- path指定時の""の取り扱い

# vue

親 -> 子 : props / v-bind:hoge (省略 :hoge)
子 -> 親 : emit / v-on:hoge (省略 @hoge)
双方向   : defineModel / v-model:hoge
  (内部で :modelValue="foo" @update:modelValue="$event => (foo = $event)" )

# 

1 行上にスクロール - Ctrl+Alt+PageUp
一行下にスクロール - Ctrl+Alt+PageDown
ページを上にスクロール - Shift+PageUp
ページを下にスクロール - Shift+PageDown
一番上までスクロール - Ctrl+Home
一番下までスクロール - Ctrl+End
前のコマンドまでスクロールします - Ctrl+Up
次のコマンドまでスクロールします - Ctrl+Down