"""고화질 이벤트 장면
  1순위: assets-src/events-sheets/{SON|DAUGHTER}/event-e01~e21.png (2752×1536, 2×2 칸 / 마지막 장은 1칸, 칸 순서는 make-event-scene-requests.py 목록 순서)
  2순위: assets-src/events-hd/{SON|DAUGHTER}/{이벤트ID}.png (1280×720 한 장씩) — 시트에 없는 장면만
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
    """가장자리에서 흰 줄(20% 이상 흰색, 기울어진 여백·둥근 모서리 포함) 또는 테두리 선(50% 이상 진한색)인 줄을 깎고 3px 더"""
    white = a.min(axis=2) > 235
    dark = a.max(axis=2) < 50
    h, w = white.shape
    def run(get, n):
        # 흰 줄·테두리 줄이 이어지는 동안 (사이에 낀 번진 줄 2개까지는 건너뜀) → 마지막 해당 줄 다음부터
        k, last, gap = 0, -1, 0
        while k < 40:
            wr, dr = get(k)
            if wr.mean() > 0.2 or dr.mean() > 0.5:
                last, gap = k, 0
            elif gap < 2:
                gap += 1
            else:
                break
            k += 1
        return last + 1 + 3
    t = run(lambda k: (white[k], dark[k]), h)
    b = run(lambda k: (white[h - 1 - k], dark[h - 1 - k]), h)
    l = run(lambda k: (white[:, k], dark[:, k]), w)
    r = run(lambda k: (white[:, w - 1 - k], dark[:, w - 1 - k]), w)
    return a[t:h - b, l:w - r]


import re

IDS = re.findall(r"^ \('([A-Z0-9_]+)','", open('scripts/make-event-scene-requests.py', encoding='utf-8').read(), re.M)
assert len(IDS) == 81, len(IDS)


def span(v, frac):
    idx = np.where(v > frac)[0]
    return (idx.min(), idx.max() + 1) if len(idx) else None


def panel(img, y0, y1, x0, x1, frac=0.6):
    """사분면 안에서 흰 여백이 아닌 칸 영역"""
    sub = (765 - img[y0:y1, x0:x1].astype(int).sum(axis=2)) > 45
    ys, xs = span(sub.mean(axis=1), frac), span(sub.mean(axis=0), frac)
    if not ys or not xs:
        return None
    return img[y0 + ys[0]:y0 + ys[1], x0 + xs[0]:x0 + xs[1]]


def sources(g):
    """(장면 ID, RGB 배열) — 시트에서 자른 칸 우선, 없으면 한 장짜리"""
    got = {}
    chunks = [IDS[i:i + 4] for i in range(0, 81, 4)]
    for n, chunk in enumerate(chunks, 1):
        path = f'assets-src/events-sheets/{g}/event-e{n:02d}.png'
        if not os.path.exists(path):
            continue
        img = np.asarray(Image.open(path).convert('RGB'))
        h, w = img.shape[:2]
        if len(chunk) == 1:
            got[chunk[0]] = panel(img, 0, h, 0, w, 0.25)
        else:
            for q, gid in enumerate(chunk):
                got[gid] = panel(img, (q // 2) * h // 2, (q // 2 + 1) * h // 2, (q % 2) * w // 2, (q % 2 + 1) * w // 2)
    for f in sorted(glob.glob(f'{SRC}/{g}/*.png')):
        gid = os.path.basename(f)[:-4]
        if got.get(gid) is None:
            got[gid] = np.asarray(Image.open(f).convert('RGB'))
    return [(k, v) for k, v in got.items() if v is not None]


os.makedirs(OUT, exist_ok=True)
for f in glob.glob(f'{OUT}/*.webp'):
    os.remove(f)
keys = []
for g in ('SON', 'DAUGHTER'):
    for gid, arr in sources(g):
        a = trim(arr)
        im = brighten(Image.fromarray(a))
        if im.width > W:
            im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
        im.save(f'{OUT}/{gid}_{g}.webp', quality=84, method=6)
        keys.append(f'{gid}_{g}')
json.dump(sorted(keys), open('src/render/eventManifest.json', 'w'), indent=0)
print(len(keys), 'scenes →', OUT)
