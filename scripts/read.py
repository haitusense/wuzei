import numpy as np
import matplotlib.pyplot as plt
def main(args):
  Px = Pixel #type: ignore
  print('__name__ :', __name__)
  print('args   :', args)
  print('width  :', Px.width())
  print('height :', Px.height())
  print('dst    :', Px.get(10, 10))
  Px.set(10, 10, 255)
  arr = Px.to_array()
  mat = Px.to_np()
  print('size :', mat.size)
  print(mat)

  sub_mat = mat[args['left']:args['right'], args['top']:args['bottom']]
  print('size :', sub_mat.size)
  print('max :', np.max(sub_mat))
  print('min :', np.min(sub_mat))
  print('mean :', np.mean(sub_mat))
  print('std :', np.std(sub_mat))
  print(sub_mat)

  hist, bin_edge = np.histogram(arr)
  print(hist)
  print(bin_edge)

  fig, ax = plt.subplots()
  ax.hist(arr)
  plt.show()
  return args