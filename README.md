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


