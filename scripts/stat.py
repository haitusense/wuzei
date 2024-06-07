import numpy as np

def main(args):
  Px = Pixel #type: ignore
  print('args   :', args)
  mat = Px.to_np()
  print('---full---')
  print('width: {}, height: {}, size: {}'.format(Px.width(), Px.height(), mat.size))
  print(mat)
  print('---selected---')
  sub_mat = mat[args['top']:args['bottom'], args['left']:args['right']]
  sub_mat1 = sub_mat[0::2, 0::2]
  sub_mat2 = sub_mat[1::2, 0::2]
  sub_mat3 = sub_mat[0::2, 1::2]
  sub_mat4 = sub_mat[1::2, 1::2]
  print('size: {}'.format(sub_mat.size))
  print(sub_mat)
  print('---statistics---')
  #注：clip位置でbayer順が変化する
  print('max : {}, {}, {}, {}, {}'.format(np.max(sub_mat), np.max(sub_mat1), np.max(sub_mat2), np.max(sub_mat3), np.max(sub_mat4)))
  print('min : {}, {}, {}, {}, {}'.format(np.min(sub_mat), np.min(sub_mat1), np.min(sub_mat2), np.min(sub_mat3), np.min(sub_mat4)))
  print('mean: {}, {}, {}, {}, {}'.format(np.mean(sub_mat), np.mean(sub_mat1), np.mean(sub_mat2), np.mean(sub_mat3), np.mean(sub_mat4)))
  print('std : {}, {}, {}, {}, {}'.format(np.std(sub_mat), np.std(sub_mat1), np.std(sub_mat2), np.std(sub_mat3), np.std(sub_mat4)))

  return args