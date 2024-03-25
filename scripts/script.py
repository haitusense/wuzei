import sys
import json

args = sys.argv
json_obj = json.loads(args[1])

print("Hello, World")
print(args)
print(json_obj)
print(json_obj["width"])