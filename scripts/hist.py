import numpy as np
import matplotlib.pyplot as plt
def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  mat = Px.to_np()
  sub_mat = mat[args['top']:args['bottom'], args['left']:(args['right'])]
  sub_mat1 = sub_mat[0::2, 0::2]
  sub_mat2 = sub_mat[1::2, 0::2]
  sub_mat3 = sub_mat[0::2, 1::2]
  sub_mat4 = sub_mat[1::2, 1::2]

  hist, bin_edge = np.histogram(sub_mat.ravel())
  print(hist)
  print(bin_edge)

  fig, ax = plt.subplots()
  ax.hist(sub_mat.ravel())
  ax.hist(sub_mat1.ravel())
  ax.hist(sub_mat2.ravel())
  ax.hist(sub_mat3.ravel())
  ax.hist(sub_mat4.ravel())
  plt.show()
  return args