import numpy as np
import matplotlib.pyplot as plt
import random
import pandas as pd
import polars as pl

def main(args):
  Px = Pixel #type: ignore
  print('__name__ :', __name__)
  print('args   :', args)
  arr = Px.to_array()
  mat = Px.to_np()
  pd_df = pd.DataFrame(mat)
  pl_df = pl.DataFrame(mat)

  print('width: {}, height: {}, size: {}'.format(Px.width(), Px.height(), mat.size))
  print('list        :', type(arr), len(arr), arr[0:5], '...')
  print(arr[0:5], '...')
  print('nparray     :', type(mat), mat.size)
  print(mat)
  print('pd dataframe:', type(pd_df), pd_df.size)
  print(pd_df)
  # df.to_csv("test.csv")
  print('pl dataframe:', type(pl_df))
  print(pl_df)

  hoge = random.randint(0, 255)
  print('get pixel (10, 10) :', Px.get(10, 10))
  print('set pixel : (10, 10) = ', hoge)
  Px.set(10, 10, hoge)
  print('get pixel (10, 10) :', Px.get(10, 10))

  return args