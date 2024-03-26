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

### default key assignment

| function           | mouse               | shotcut-key     | command |
| :--                | :--:                | :--:            | :--     |
| File Read          | Drag and Drop       |                 | |
| bitshift up        | shift + wheel       | ArrowUp         | bitshift [num] |
| bitshift down      | shift + wheel       | ArrowDown       | |
| mono/color         |                     | ArrowLeft/Right | |
| rendering          | 4th,5th             | '\'             | |
| zoom up   (full)   | ctrl + wheel        | ctrl + '+'      | |
| zoom down (full)   | ctrl + wheel        | ctrl + '-'      | |
| zoom up   (canvas) | alt + wheel         |                 | zoom [level] |
| zoom down (canvas) | alt + wheel         |                 | |
| select             | left + move         |                 | select [left] [top] [right] [bottom] |
| prompt-dialog      | center (deep click) |                 | |
| alert              |                     |                 | alert [message] |
| context menu       | right               |                 | |

[*] command : send from namedpipe or prompt-dialog

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