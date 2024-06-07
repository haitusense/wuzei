import pandas as pd
import subprocess

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  df = pd.DataFrame(Px.to_np())
  dst = df.iloc[args['top']:args['bottom'], args['left']:args['right']]
  if args.get("color") == 1:
    dst = dst[0::2,0::2]
  elif args.get("color") == 2:
    dst = dst[0::2,1::2]
  elif args.get("color") == 3:
    dst = dst[1::2,0::2]
  elif args.get("color") == 4:
    dst = dst[1::2,1::2]
  else:
    dst = dst
  subprocess.run("clip", input=dst.to_csv(index=True, sep=',', lineterminator='\n'), text=True)
  return args