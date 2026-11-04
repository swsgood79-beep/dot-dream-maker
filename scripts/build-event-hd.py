"""고화질 이벤트 장면 (assets-src/events-hd/{SON|DAUGHTER}/{이벤트ID}.png, 1280×720 한 장씩)
→ public/events/{이벤트ID}_{SON|DAUGHTER}.webp  (게임 HTML 옆에 따로 두는 파일: 단일 HTML 용량 제한 때문에 인라인하지 않음)
→ src/render/eventManifest.json (있는 장면 목록)
실행: python3 scripts/build-event-hd.py
가장자리의 흰 줄·검은 테두리 선을 잘라 내고, 다른 사진과 같게 밝기 보정."""
import glob, json, os
import numpy as np
from PIL import Image, ImageEnhance

SRC = 'assets-src/events-hd'
OUT = 'public/events'
W = 1280
_LUT = [round(255 * (i / 255) ** 0.8) for i in range(256)] * 3


def brighten(im):
    return ImageEnhance.Color(im.point(_LUT)).enhance(1.06)


def trim(a):
    """가장자리에서 흰 줄(90% 이상 흰색) 또는 테두리 선(80% 이상 진한색)인 줄을 깎고 2px 더"""
    white = a.min(axis=2) > 235
    dark = a.max(axis=2) < 70
    h, w = white.shape
    def run(get, n):
        k = 0
        while k < 40 and (get(k)[0].mean() > 0.9 or get(k)[1].mean() > 0.8):
            k += 1
        return k + 2 if k else 0
    t = run(lambda k: (white[k], dark[k]), h)
    b = run(lambda k: (white[h - 1 - k], dark[h - 1 - k]), h)
    l = run(lambda k: (white[:, k], dark[:, k]), w)
    r = run(lambda k: (white[:, w - 1 - k], dark[:, w - 1 - k]), w)
    return a[t:h - b, l:w - r]


os.makedirs(OUT, exist_ok=True)
keys = []
for g in ('SON', 'DAUGHTER'):
    for f in sorted(glob.glob(f'{SRC}/{g}/*.png')):
        gid = os.path.basename(f)[:-4]
        a = trim(np.asarray(Image.open(f).convert('RGB')))
        im = brighten(Image.fromarray(a))
        if im.width > W:
            im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
        im.save(f'{OUT}/{gid}_{g}.webp', quality=84, method=6)
        keys.append(f'{gid}_{g}')
json.dump(sorted(keys), open('src/render/eventManifest.json', 'w'), indent=0)
print(len(keys), 'scenes →', OUT)
