import numpy as np
import matplotlib.pyplot as plt
def main(args):
  Px = Pixel #type: ignore
  print('__name__ :', __name__)
  print('args :', args)
  print('dst :', Px.get(10, 10))
  Px.set(10, 10, 255)
  hoge = Px.to_array()
  hist, bin_edge = np.histogram(hoge)
  print(hist)
  print(bin_edge)

  fig, ax = plt.subplots()
  ax.hist(hoge)
  plt.show()
  return args