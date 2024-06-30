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
  src_mat = Px.to_np()
  left    = args.get('left', 0)
  top     = args.get('top', 0)
  right   = args.get('right', Px.width())
  bottom  = args.get('bottom', Px.height())
  mat = src_mat[top:bottom, left:right]
  print('---full---')
  print('width: {}, height: {}, size: {}'.format(Px.width(), Px.height(), mat.size))
  print(src_mat)
  print('---selected---')
  print('({}, {}) - ({}, {}), size: {}'.format(left, top, right, bottom, mat.size))
  print(mat)

  print('---statistics---')
  matLT = mat[0::2, 0::2] # bayer left-top, attention:clip位置でbayer順が変化する
  matRT = mat[1::2, 0::2] # bayer right-top
  matLB = mat[0::2, 1::2] # bayer left-bottom
  matRB = mat[1::2, 1::2] # bayer right-bottom
  print('max : {} / {}, {}, {}, {}'.format(np.max(mat), np.max(matLT), np.max(matRT), np.max(matLB), np.max(matRB)))
  print('min : {} / {}, {}, {}, {}'.format(np.min(mat), np.min(matLT), np.min(matRT), np.min(matLB), np.min(matRB)))
  print('mean: {:.2f} / {:.2f}, {:.2f}, {:.2f}, {:.2f}'.format(np.mean(mat), np.mean(matLT), np.mean(matRT), np.mean(matLB), np.mean(matRB)))
  print('std : {:.2f} / {:.2f}, {:.2f}, {:.2f}, {:.2f}'.format(np.std(mat), np.std(matLT), np.std(matRT), np.std(matLB), np.std(matRB)))

  hist, bin_edge = np.histogram(mat.ravel())
  print('hist : {} bin_edge {}'.format(hist, bin_edge))

  plot(mat, matLT, matRT, matLB, matRB)
  plt.show()

  return { 'state': True }