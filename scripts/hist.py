import numpy as np
import matplotlib.pyplot as plt

def plot(arg1, arg2, arg3, arg4, arg5):
  try:
    import seaborn as sns
    sns.histplot(arg1.ravel())
    sns.histplot(arg2.ravel())
    sns.histplot(arg3.ravel())
    sns.histplot(arg4.ravel())
    sns.histplot(arg5.ravel())
  except ImportError as e:
    print(f"ImportError: {e}")
    fig, ax = plt.subplots()
    ax.hist(arg1.ravel())
    ax.hist(arg2.ravel())
    ax.hist(arg3.ravel())
    ax.hist(arg4.ravel())
    ax.hist(arg5.ravel())

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  mat = Px.to_np()
  sub_mat = mat[args['top']:args['bottom'], args['left']:args['right']]
  sub_mat1 = sub_mat[0::2, 0::2]
  sub_mat2 = sub_mat[1::2, 0::2]
  sub_mat3 = sub_mat[0::2, 1::2]
  sub_mat4 = sub_mat[1::2, 1::2]

  hist, bin_edge = np.histogram(sub_mat.ravel())
  print(hist)
  print(bin_edge)

  plot(sub_mat, sub_mat1, sub_mat2, sub_mat3, sub_mat4)
  plt.show()
  
  return args