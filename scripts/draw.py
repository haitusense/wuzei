import numpy as np
import matplotlib.pyplot as plt
import random

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  mat = Px.to_np()
  mat[0::2, 0::2].fill(0)
  Px.from_np(mat)

  hoge = random.randint(0, 255)
  print('get pixel (10, 10) :', Px.get(10, 10))
  print('set pixel : (10, 10) = ', hoge)
  Px.set(10, 10, hoge)
  print('get pixel (10, 10) :', Px.get(10, 10))
  
  return args
#自分でrefreshして