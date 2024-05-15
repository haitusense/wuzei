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


