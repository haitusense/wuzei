import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
# import seaborn as sns
from plotnine import *

def lineprof(df, x, y, axis):
  
  dst = df.iloc[x::2, y::2].mean(axis=axis).to_frame()
  dst.columns = ["data"]
  dst["index"] = dst.index
  dst['dt_rolling'] = dst['data'].rolling(5, center=True).mean() - dst['data']
  dst['dt'] = dst['data'].diff()
  print(dst)
  return dst
  # sns.relplot(x='index', y=['data','dt'], data=v1, kind='line')
  # plt.axvline(v1['dt'].idxmax(), 0, 1, color='red', linestyle="dotted")
  # plt.show()

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  left   = args.get('left', 0)
  top    = args.get('top', 0)
  right  = args.get('right', Px.width())
  bottom = args.get('bottom', Px.height())
  axis = args.get('axis', 0) # axis direction
  src_df = pd.DataFrame(Px.to_np())
  df = src_df.iloc[top:bottom, left:right]

  print('---fixed noise---')
  print('width: {}, height: {}, size: {}'.format(Px.width(), Px.height(), df.size))

  d1 = lineprof(df, 0, 0, axis)
  d2 = lineprof(df, 0, 1, axis)
  d3 = lineprof(df, 1, 0, axis)
  d4 = lineprof(df, 1, 1, axis)

  # p =(
  #   ggplot(data = d1, mapping = aes(x="index", y="data"))
  #   + geom_point()
  #   + geom_line()
  #   + geom_vline(xintercept=d1['dt'].idxmax(), color='red')
  # )
  p = (
    ggplot()

    + geom_point(data = d1, mapping = aes(x="index", y="data"), color='red')
    + geom_line(data = d1, mapping = aes(x="index", y="data"), color='red')
    + geom_vline(xintercept=d1['dt'].idxmax(), color='red')

    + geom_point(data = d2, mapping = aes(x="index", y="data"), color='green')
    + geom_line(data = d2, mapping = aes(x="index", y="data"), color='green')
    + geom_vline(xintercept=d2['dt'].idxmax(), color='green')

    + geom_point(data = d3, mapping = aes(x="index", y="data"), color='lightgreen')
    + geom_line(data = d3, mapping = aes(x="index", y="data"), color='lightgreen')
    + geom_vline(xintercept=d3['dt'].idxmax(), color='lightgreen')

    + geom_point(data = d4, mapping = aes(x="index", y="data"), color='blue')
    + geom_line(data = d4, mapping = aes(x="index", y="data"), color='blue')
    + geom_vline(xintercept=d4['dt'].idxmax(), color='blue')
  )
  print(p)
  return args