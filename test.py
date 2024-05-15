import time
import win32pipe, win32file, pywintypes
try:
  handle = win32file.CreateFile( 
    r'\\.\pipe\wuzeiNamedpipe', 
    win32file.GENERIC_READ | win32file.GENERIC_WRITE,
    0, None, win32file.OPEN_EXISTING, 0, None
  )
  some_data = str.encode(f"111")
  win32file.WriteFile(pipe, some_data)
  res = win32pipe.SetNamedPipeHandleState(handle, win32pipe.PIPE_READMODE_MESSAGE, None, None)


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