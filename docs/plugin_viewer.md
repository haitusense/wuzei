# viewer.html 

## Description

This software is intended for Show True RAW Data, Evaluation of Image quality and Development logic verification.

- topics
  - Pickup raw output
    - Deep bit width (e.g. 12-32bit)
    - Negative signal (e.g. Useing DCDS)
    - Linear display
    - image scaled with nearest-neighbor rendering
  - Strictness of Bit Operation
    - Check for flag bit  
    - Check for errors in IO / digital logic / ADC
  - Special Struct
    - color filter array (e.g. RGBW)
    - read order (e.g. Using Pixel sharing)
    - Exist Dummy Pixel and Optical Black
  - scripting
    - correction
    - search
    - statistical analysis
    - other ( linearity, color evaluation)
  - Terminal operation
- hidden topic
  - logic replaced by Rust
  - Using web technologies for presentation layer
  - Develop simple Raw image format

## Usage

```powershell
ps> wuzei.exe -s resource:viewer.html
```

### Canvas default key assignment

| function                          | mouse                    | shotcut-key            | terminal command |
| :--                               | :--:                     | :--:                   | :--              |
| **Show/Hide the Terminal window** |                          | ctrl + '@'             | |
| **read file**                     | drag and drop [*]        |                        | ```read [path]``` |
| **select**                        | left + move [*]          |                        | ```select [left] [top] [right] [bottom]``` |
| **context menu**                  | right [*]                |                        | |
| **bitshift**                      | shift + wheel            | shift + ↑/↓            | ```set bitshift [num]``` |
| **zoom up/down** (browser)        | ctrl + wheel             | ctrl + '+'/'-'         | |
| **zoom reset** (browser)          |                          | ctrl + 0               | |
| **zoom up/down** (canvas)         | shift + ctrl + wheel [*] | shift + ctrl + '+'/'-' | ```set zoom [level]``` |
|                                   |                          | shift + ctrl + ↑/↓     | |
| **mono/color**                    |                          | shift + ←/→            | ```set color [num]``` |
| **rendering**                     |                          | F1                     | |
| echo                              |                          |                        | ```echo [args]``` |
| get current_dir                   |                          |                        | ```env``` |
| set current_dir                   |                          |                        | ```cd [path]``` |
| show state                        |                          |                        | ```state``` |
| set state                         |                          |                        | ```set [key] [value]``` |
| refresh display                   |                          | F2                     | ```refresh``` |
| reload (browser)                  |                          | F5                     | |
| redraw form file                  |                          |                        | ```redraw``` |
| getpixel                          |                          |                        | ```getpixel [x] [y]``` |
| scripting (js eval)               |                          |                        | ```js1 [command]``` |
| scripting (py eval)               |                          |                        | ```py1 [command]``` |
| scripting (py preset)             |                          |                        | ```py-pst``` |
| scripting (py from file)          |                          |                        | ```py [path] [args]``` |
| scripting (ps)                    |                          |                        | ```ps [args]``` |

[*] : event in canvas

- drop event
  - drop image file in canvas : overwite ```read``` command and execute
  - drop py file in canvas : overwite ```py``` command
  - drop in terminal : insert filepath

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

customize the display from the terminal

```powershell
terminal> state
# ...
# otherState : {
#   ...
#   "stalker": "(e) => e + 0"
# }

terminal> set stalker "(e) => e / 100"
terminal> state
# ...
# otherState : {
#   ...
#   "stalker": "(e) => e / 100"
# }

# src = 1234567
#   "(e) => e / 100"                             -> 12345.67
#   "(e) => e.toLocaleString('en-IN')"           -> 1,234,567
#   "(e) => '0x' + e.toString(16).toUpperCase()" -> 0x12D687
#   "(e) => (0 & 0b1111)"                        -> 7
```

#### disable

- send from namedpipe
- memorymapped

### Scripting

refer to the docs of hraw