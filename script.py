######## githubからのload ########

import requests
url = "https://gist.githubusercontent.com/haitusense/8642d5bc23317096fc718473308cd118/raw/07e5cb3975b0a97df5a32cfe94626aa0055e6aa1/test.py"
response = requests.get(url)
code = response.content
exec(code)

######## argsの読み込み ########

import sys
import json
args = sys.argv
json_obj = json.loads(args[1])

print("Hello, World")
print(args)
print(json_obj)
print(json_obj["width"])

######## namedpipe通信 ########
import time
import sys
import win32pipe, win32file, pywintypes
try:
  handle = win32file.CreateFile(
    r'\\.\pipe\Foo',
    win32file.GENERIC_READ | win32file.GENERIC_WRITE,
    0,
    None,
    win32file.OPEN_EXISTING,
    0,
    None
  )
  res = win32pipe.SetNamedPipeHandleState(handle, win32pipe.PIPE_READMODE_MESSAGE, None, None)
  if res == 0:
    print(f"SetNamedPipeHandleState return code: {res}")
  while True:
    resp = win32file.ReadFile(handle, 64*1024)
    print(f"message: {resp}")
except pywintypes.error as e:
  if e.args[0] == 2:
    print("no pipe, trying again in a sec")
    time.sleep(1)
  elif e.args[0] == 109:
    print("broken pipe, bye bye")
    quit = True

######## memorymapped通信 ########
from multiprocessing import shared_memory
import ctypes

class MyStruct(ctypes.Structure):
  _fields_ = [
    ("a", ctypes.c_int32),
    ("b", ctypes.c_int32),
    ("c", ctypes.c_int32),
  ]

shm = shared_memory.SharedMemory(name="wuzeiMemoryMapped")

data = shm.buf.cast("MyStruct")
print(data.a)
print(data.b)
print(data.c)
value = shm.buf[:4]
dst = int.from_bytes(value, byteorder="little", signed=True)
print(dst)
