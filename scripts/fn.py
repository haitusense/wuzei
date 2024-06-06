import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
# import seaborn as sns
from plotnine import *

def lineprof(df, x, y, z):
  dst = df.iloc[x::2, y::2].mean(axis=z).to_frame()
  dst.columns = ["data"]
  dst["index"] = dst.index
  dst['dt_rolling'] = dst['data'].rolling(5).mean() - dst['data']
  dst['dt'] = dst['data'].diff()
  print(dst)
  return dst

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  df = pd.DataFrame(Px.to_np())
  print('---fixed noise---')
  print('width: {}, height: {}, size: {}'.format(Px.width(), Px.height(), df.size))
  sub_df = df.iloc[args['top']:args['bottom'], args['left']:args['right']]
  v1 = lineprof(sub_df, 0, 0, 0)

  # sns.relplot(x='index', y=['data','dt'], data=v1, kind='line')
  # plt.axvline(v1['dt'].idxmax(), 0, 1, color='red', linestyle="dotted")
  # plt.show()
  
  p = (
    ggplot(data = v1, mapping = aes(x="index", y="data"))
    + geom_point()
    + geom_line()
    + geom_vline(xintercept=v1['dt'].idxmax(), color='red')
  )
  print(p)
  return args