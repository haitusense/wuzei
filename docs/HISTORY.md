# History

## 0.1.6 / huazhi 0.1.4 (2024--)
- change : rename/refactoring
- change : Separate terminal logic blocks terminal ```pty```
- change : history/cursor select&copy&paste/scroll/drop logic/auto wrap in terminal
- change : add uuid
- add : hashmap(command) in terminal logic blocks
- add : JSDoc
- add : stalker display replacement function
- add : min window size
- fix : select image logic
- fix : url decode in async_custom_protocol_local
- fix : set {} when args is empty in py scripting
## 0.1.5 / huazhi 0.1.3 (2024-06-09)
- change : terminal ```onKey```, ```onMount```, call prompt logic
- change : clip canvas logic (ref zoomfactor)
- enable : ```ps``` command
- add : ```cd``` command
- add : from_np, from_array
- add : Extension of starturl / ```file:```, ```local:```, ```resource:```
## 0.1.4 (2024-06-08)
- add : py example
- fix : shortcut, context menu, ```toHex```
## 0.1.3 (2024-06-03)
- update : wry & tao version
- fix : F5 reload (event_loop-init)
- add : hraw scripting
- add : terminal
- add : window move / remember the window size and position
- change : custom protocol logic / ipc handler logic
- change : to componentize a vue program
## 0.1.2 (2024-03-27)
- change : namedpipe logic
- fix : stalker GUI
- fix : d&d script logic
- fix : nalgebra mat init (hraw)
- fix : change matrix calc from i32 to f64 for overflow (hraw)
- add : view for bmp/png
- add : history
## 0.1.1 (2024-03-25)
- fix : rendering shortcut
## 0.1.0 (2024-03-25)
- first release

# Upcoming

- mmf, memorymapped for scripting
- WebAssembly
- scripting in hraw
  - 平均データではなく加算データ+fixed pointに切り替えるか
- 文字列のnull処理, unwarp減らす
- クリップボードコピーに\n含まれてた時の扱い
- multibyte characters / encodeURIComponent()