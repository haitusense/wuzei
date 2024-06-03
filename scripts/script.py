import numpy as np
import matplotlib.pyplot as plt
import random

def main(args):
  Px = Pixel #type: ignore
  print('__name__ :', __name__)
  print('args   :', args)
  arr = Px.to_array()
  mat = Px.to_np()
  hoge = random.randint(0, 255)

  print('width: {}, height: {}, size: {}'.format(Px.width(), Px.height(), mat.size))
  print('list:', type(arr), len(arr), arr[0:5], '...')
  print(arr[0:5], '...')
  print('np  :', type(mat), mat.size)
  print(mat)

  print('get pixel (10, 10) :', Px.get(10, 10))
  print('set pixel : (10, 10) = ', hoge)
  Px.set(10, 10, hoge)
  print('get pixel (10, 10) :', Px.get(10, 10))
  
  return args