import numpy as np
import random

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  src_mat = Px.to_np()
  left   = args.get('left', 0)
  top    = args.get('top', 0)
  right  = args.get('right', Px.width())
  bottom = args.get('bottom', Px.height())
  mat = src_mat[top:bottom, left:right]

  print('---draw selected---')
  print('({}, {}) - ({}, {}), size: {}'.format(left, top, right, bottom, mat.size))
  mat[0::2, 0::2].fill(0)
  mat[1::2, 0::2].fill(0)
  mat[0::2, 1::2].fill(0)

  print('---read/write pixel---')
  rn = random.randint(0, 255)
  print('get pixel (10, 10) :', Px.get(10, 10))
  print('set pixel : (10, 10) = ', rn)
  Px.set(10, 10, rn)
  print('get pixel (10, 10) :', Px.get(10, 10))

  # write out
  Px.from_np(mat)
  
  return {'a': 0 }