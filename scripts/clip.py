import numpy as np
import pandas as pd
import subprocess

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  df = pd.DataFrame(Px.to_np())
  dst = df.iloc[args['top']:args['bottom'], args['left']:args['right']].to_csv(index=True, sep=',', lineterminator='\n')
  subprocess.run("clip", input=dst, text=True)
  return args

