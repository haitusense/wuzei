import numpy as np
import pandas as pd

w = 8
h = 6
src = np.arange(h * w).reshape(h, w)
np.sum(src, axis=0)
print(src)

h_mean = np.mean(src, axis=1)
print("hfnp correction\n", (src.T - h_mean).T)

v_mean = np.mean(src, axis=0)
print("vfnp correction\n", src - v_mean)

df = pd.DataFrame(src)
df = df.rolling(3, center=True).sum()
df = (df.transpose().rolling(3, center=True).sum()).transpose()

print(df)

kernel3x3 = np.array([
  [1,1,1],
  [1,1,1],
  [1,1,1]
])
d = 1
h, w = src.shape[:2]
dst = src.copy()
for y in range(d, h - d):
  for x in range(d, w - d):
    dst[y][x] = np.sum(src[y-d:y+d+1, x-d:x+d+1] * kernel3x3)

print(filter)
print("filter\n", dst)