# Scriptに関して



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