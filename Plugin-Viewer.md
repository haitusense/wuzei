# viewer.html 

## Description

This software is intended for Show True RAW Data, Evaluation of Image quality and Development logic verification.

- topics
  - Pickup raw output
    - Deep bit width (e.g. 12-32bit)
    - Negative signal (e.g. Useing DCDS)  
    - Linear display
    - image scaled with nearest-neighbor rendering
  - Special Struct
    - color filter array (e.g. RGBW)
    - read order (e.g. Using Pixel sharing)
    - Exist Dummy Pixel and Optical Black
  - scripting
    - correction
    - search
    - statistical analysis
- hidden topic
  - logic replaced by Rust
  - Using web technologies for presentation layer

## Usage

### Canvas default key assignment

| function                          | mouse                    | shotcut-key            | terminal command |
| :--                               | :--:                     | :--:                   | :--              |
| **Show/Hide the Terminal window** |                          | ctrl + '@'             | |
| **read file**                     | drag and drop [*]        |                        | ```read [path]``` |
| **select**                        | left + move [*]          |                        | ```select [left] [top] [right] [bottom]``` |
| **context menu**                  | right [*]                |                        | |
| **bitshift**                      | shift + wheel            | shift + ↑/↓            | ```bitshift [num]``` |
| **zoom up/down** (browser)        | ctrl + wheel             | ctrl + '+'/'-'         | |
| **zoom reset** (browser)          |                          | ctrl + 0               | |
| **zoom up/down** (canvas)         | shift + ctrl + wheel [*] | shift + ctrl + '+'/'-' | ```zoom [level]``` |
| **mono/color**                    |                          | shift + ←/→            | ```color [num]``` |
| **rendering**                     |                          | '\\'                    | |
| echo                              |                          |                        | ```echo [args]``` |
| show state                        |                          |                        | ```state``` |
| set state                         |                          |                        | ```set [key] [value]``` |
| getpixel                          |                          |                        | ```getpixel [x] [y]``` |
| scripting (js eval)               |                          |                        | ```js1 [command]``` |
| scripting (py eval)               |                          |                        | ```py1 [command]``` |
| scripting (py preset)             |                          |                        | ```py-pst``` |
| scripting (py from file)          |                          |                        | ```py [path] [args]``` |
| scripting (ps)                    |                          |                        | ```ps``` |

[*] : event in canvas

### Terminal keyboard shortcuts / mouse event

| function                               | mouse       | shotcut-key     |
| :--                                    | :--:        | :--:            |
| select text                            | left + move |                 |
| paste                                  | center      | ctrl + v        |
| copy                                   |             | ctrl + c        |
| clear                                  |             | ctrl + l        |
| home                                   |             | home / ctrl + ← |
| end                                    |             | end  / ctrl + → |
| clear                                  |             | ctrl + l        |
| context menu (browser default)         | right       |                 |
| Cycle through previously used commands |             | ↑ / ↓           |

#### disable

- send from namedpipe or prompt-dialog

| function           | mouse                | shotcut-key     | terminal command |
| :--                | :--:                 | :--:            | :--              |
| prompt-dialog      | center (deep click)  |                 |                  |
| alert              |                      |                 | alert [message]  |


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

#### by Python

**detail**

- Entry Point : default is ```main```
  - Target can be specified in js
- Args : json to dictionary object
- Pixel References : use ```Pixel```
  - IntelliSense throws undefined error, use ```#type: ignore``` to avoid it.
- Returns : dictionary object (Serialize to Json in rust)

```python
def main(args):
  Px = Pixel #type: ignore
  print('args :', args)
  print('dst :', Px.get(10, 10))
  Px.set(10, 10, 255)
  args["x"] = 10
  return args
```
