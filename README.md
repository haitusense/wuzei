# wuzei

customizable GUI

## Install

```powershell
ps> cargo install --git https://github.com/haitusense/wuzei [tool name]
```

**when using python for scripting**

```powershell
ps> winget search Python.Python
ps> winget install --id Python.Python.3.xx

ps> pip install numpy pandas polars
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
ps> wuzei.exe -s index.html
``