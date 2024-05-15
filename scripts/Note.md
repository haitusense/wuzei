# Scriptに関して

## Python

### detail

- エントリーポイントはdefaultでmain
  - jsで指定を変更できる
- argsはjsonを介してdictionary object
- 画素へのアクセスはPixel
  - IntelliSenseで未定義エラー吐くので```#type: ignore```で回避
- 戻り値はdictionary object (rust側でjson化して返却)

```python
def main(args):
  Px = Pixel #type: ignore
  print('__name__ :', __name__)
  print('args :', args)
  print('dst :', Px.get(10, 10))
  Px.set(10, 10, 255)
  args["x"] = 10
  return args
```

### pending

- 直接argvとJsonの取り扱い

```python
import sys
import json

args = sys.argv
json_obj = json.loads(args[1])

print("Hello, World")
print(args)
print(json_obj)
print(json_obj["width"])
```

- NamedPipeでの直接制御
- MemoryMappedFileへの直接アクセス

## Rust