import pandas as pd
import subprocess

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  df = pd.DataFrame(Px.to_np())
  dst = df.iloc[args['top']:args['bottom'], args['left']:args['right']]
  
  if args.get("color") == 1:
    dst = dst.map(lambda x: (x >> 24) & 0xFF)
  elif args.get("color") == 2:
    dst = dst.map(lambda x: (x >> 16) & 0xFF)
  elif args.get("color") == 3:
    dst = dst.map(lambda x: (x >> 8) & 0xFF)
  else:
    dst = dst.map(lambda x: (x >> 16) & 0xFF)
  subprocess.run("clip", input=dst.to_csv(index=True, sep=',', lineterminator='\n'), text=True)
  return args

