import pandas as pd
import subprocess

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  left   = args.get('left', 0)
  top    = args.get('top', 0)
  right  = args.get('right', Px.width())
  bottom = args.get('bottom', Px.height())
  bayer = args.get("bayer", 0)

  df = pd.DataFrame(Px.to_np())
  dst = df.iloc[top:bottom, left:right]
  if bayer == 1:    # left-top in bayer
    dst = dst[0::2,0::2]
  elif bayer == 2:  # right-top in bayer
    dst = dst[0::2,1::2]
  elif bayer == 3:  # left-bottom in bayer
    dst = dst[1::2,0::2]
  elif bayer == 4:  # right-bottom in bayer
    dst = dst[1::2,0::2]
  elif bayer == -1: # R in png
    dst = dst.map(lambda x: (x >> 24) & 0xFF)
  elif bayer == -2: # G in png
    dst = dst.map(lambda x: (x >> 16) & 0xFF)
  elif bayer == -3: # B in png
    dst = dst.map(lambda x: (x >> 8) & 0xFF)
  else:             # mono in bayer
    dst = dst

  print('clip : ({}, {}) - ({}, {}), bayer: {}, size: {}'.format(left, top, right, bottom, bayer, dst.size))
  subprocess.run("clip", input=dst.to_csv(index=True, sep=',', lineterminator='\n'), text=True)

  return args