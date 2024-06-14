# wuzei

customizable GUI くコ:彡

## Install

```powershell
ps> cargo install --git https://github.com/haitusense/wuzei [tool name]
```

**when using python for scripting**

```powershell
ps> winget search Python.Python
ps> winget install --id Python.Python.3.xx

ps> pip install numpy pandas polars plotnine
```

**when using rust for scripting**

```powershell
ps> cargo install rust-script
```

## Usage

```powershell
ps> wuzei.exe --help
```

```powershell
ps> wuzei.exe -c alloc-console
```

**when using a custom GUI**

```powershell
ps> wuzei.exe -s ./index.html            # from local file
ps> wuzei.exe -s local:./index.html      # from local file
ps> wuzei.exe -s file:./index.html       # from local file
ps> wuzei.exe -s resource:index.html     # from resource file
ps> wuzei.exe -s https://www.google.com/ # from web
```

```
local:./index.html  -> http://wuzei.localhoset/local/C:/hoge/index.html -> C:/hoge/index.html
resource:index.html -> http://wuzei.localhoset/resource/index.html

```