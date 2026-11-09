"""주말 나들이 동네 사람 그림: assets-src/town/people/*-transparent.png → src/assets/people/{NPC}-{STAGE}-{SON|DAUGHTER}.webp
가장자리에 남은 흰 테두리(누끼 찌꺼기)를 깎아 내고, 여백을 잘라 낸다."""
import glob, os
import numpy as np
from PIL import Image

NPC = {'friend': 'FRIEND', 'rival': 'RIVAL', 'crush': 'CRUSH'}
STAGE = {'child': 'CHILD', 'teen': 'TEEN', 'youth': 'YOUTH'}
G = {'boy': 'SON', 'girl': 'DAUGHTER'}


def clean(im):
    a = np.asarray(im.convert('RGBA')).copy()
    for _ in range(3):
        op = a[..., 3] > 0
        edge = np.zeros_like(op)
        edge[1:] |= ~op[:-1]; edge[:-1] |= ~op[1:]; edge[:, 1:] |= ~op[:, :-1]; edge[:, :-1] |= ~op[:, 1:]
        rgb = a[..., :3].astype(int)
        lum = rgb.mean(-1)
        sat = rgb.max(-1) - rgb.min(-1)
        bad = op & edge & (lum > 165) & (sat < 60)
        a[bad, 3] = 0
    ys, xs = np.where(a[..., 3] > 0)
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


for f in sorted(glob.glob('assets-src/town/people/*-transparent.png')):
    parts = os.path.basename(f).replace('-transparent.png', '').split('-')
    npc, stage, g = NPC[parts[0]], STAGE[parts[1]], G[parts[2]]
    out = f'src/assets/people/{npc}-{stage}-{g}.webp'
    clean(Image.open(f)).save(out, 'WEBP', lossless=True)
    print(out, os.path.getsize(out))
