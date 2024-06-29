from plotnine import *
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

def main(args):
  data = {
    'a': [1,2,3],
    'b': [10,20,40],
  }

  df = pd.DataFrame(data)
  print(df)
  # p = ggplot(df, aes('a', 'b')) + geom_point()
  # p.save(filename='plot.svg', format='svg')
  return { 'state': 'success' }