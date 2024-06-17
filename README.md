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

# replacing by internal logic
#   local:./index.html  -> http://wuzei.localhoset/local/c:/hoge/index.html -> c:/hoge/index.html 
#   resource:index.html -> http://wuzei.localhoset/resource/index.html
```

replace the program, if used from local file, 

```html
<html>
  <head>
    <script src="./vue@3.4.26/dist/vue.global.min.js"></script>
...
    <!-- ↓ -->
    <script src="http://wuzei.localhoset/resource/vue@3.4.26/dist/vue.global.min.js"></script>
```