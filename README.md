# wuzei

simple raw image viewer written in rust

## Install

```powershell
cargo install --git https://github.com/haitusense/wuzei [tool name]
```

**when using rust for scripting**

```powershell
cargo install rust-script
```

## Usage

```powershell
wuzei.exe --help
```

```powershell
wuzei.exe -c alloc-console
```

**when using a custom GUI**

```powershell
wuzei.exe -s index.html
```

### Canvas default key assignment

| function                          | mouse                    | shotcut-key        | terminal command |
| :--                               | :--:                     | :--:               | :--              |
| **Show/Hide the Terminal window** |                          | Ctrl + '@'         | |
| **read file**                     | drag and drop [*]        |                    | ```read [path]``` |
| **select**                        | left + move [*]          |                    | ```select [left] [top] [right] [bottom]``` |
| **context menu**                  | right [*]                |                    | |
| **bitshift up**                   | shift + wheel            | shift + ↑          | ```bitshift [num]``` |
| **bitshift down**                 | shift + wheel            | shift + ↓          | |
| **zoom up**   (browser)           | ctrl + wheel             | ctrl + '+'         | |
| **zoom down** (browser)           | ctrl + wheel             | ctrl + '-'         | |
| **zoom up**   (canvas)            | shift + ctrl + wheel [*] | shift + ctrl + '+' | ```zoom [level]``` |
| **zoom down** (canvas)            | shift + ctrl + wheel [*] | shift + ctrl + '-' | |
| **mono/color**                    |                          | shift + ←/→        | ```color [num]``` |
| **rendering**                     |                          | '\'                | |
| echo                              |                          |                    | ```echo [args]``` |
| show state                        |                          |                    | ```state``` |
| set state                         |                          |                    | ```set [key] [value]``` |
| scripting (js eval)               |                          |                    | ```js1 [command]``` |
| scripting (py eval)               |                          |                    | ```py1 [command]``` |
| scripting (py preset)             |                          |                    | ```py-pst``` |
| scripting (py from file)          |                          |                    | ```py [path] [args]``` |
| scripting (ps)                    |                          |                    | ```ps``` |

### Terminal keyboard shortcuts / mouse event

| function                               | mouse       | shotcut-key |
| :--                                    | :--:        | :--:        |
| select text                            | left + move |             |
| paste                                  | center      | ctrl + v    |
| copy                                   |             | ctrl + c    |
| clear                                  |             | ctrl + l    |
| context menu (browser default)         | right       |             |
| Cycle through previously used commands |             | ↑ / ↓       |

#### disable

- send from namedpipe or prompt-dialog

| function           | mouse                | shotcut-key     | terminal command |
| :--                | :--:                 | :--:            | :--     |
| prompt-dialog      | center (deep click)  |                 | |
| alert              |                      |                 | alert [message] |


**color**

| num | note                             |
| :-- | :--                              |
| -1  | RGB (32bit RGBA data)            |
|  0  | Mono (32bit signed integer data) |
|  1  | debayer (GRBG)                   | 
|  2  | debayer (RGGB)                   |
|  3  | debayer (BGGR)                   |
|  4  | debayer (GBRG)                   |
|  5  | mono bayer (Left-Top)            |
|  6  | mono bayer (Right-Top)           |
|  7  | mono bayer (Left-Bottom)         |
|  8  | mono bayer (Right-Bottom)        |

**mouse stalker**

```
 (xx,xx)     <- coords ( x, y )
 00000       <- pixel dec val : 32bit signed integer
 0xAABBCCDD  <- pixel hex val
    ↑ ↑ ↑ ↑
    R G B A
```

### Scripting

#### Python

**detail**

- エントリーポイントはdefaultでmain
  - jsで指定を変更できる
- argsはjsonを介してdictionary object
- 画素へのアクセスはPixel
  - IntelliSenseで未定義エラー吐くので```#type: ignore```で回避
- 戻り値はdictionary object (rust側でjson化して返却)

```python
def main(args):
  Px = Pixel #type: ignore
  print('args :', args)
  print('dst :', Px.get(10, 10))
  Px.set(10, 10, 255)
  args["x"] = 10
  return args
```