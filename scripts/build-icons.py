"""
UI 아이콘 시트(assets-src/ui-icons.jpg, 흰 배경 4행 × 8열) → src/assets/icons.png (48px 칸 격자) + src/render/iconAtlas.json

실행: python3 scripts/build-icons.py
- 칸(행·열)으로 아이콘을 배정하고, 한 칸에 조각이 여러 개면(반짝이 별 등) 하나로 합친다
- 테두리와 이어진 흰 배경 제거, 48px 칸 안에 비율 유지해 맞춤
"""
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'ui-icons.jpg'
CELL = 48
NAMES = [
    ['INT', 'STR', 'ART', 'CHA', 'MOR', 'TEC', 'GOLD', 'IDEA'],
    ['APT_MED', 'APT_LAW', 'APT_IT', 'APT_ENT', 'APT_BIZ', 'APT_ADV', 'STRESS', 'FAME'],
    ['NAV_SCHEDULE', 'NAV_ROOM', 'NAV_OUTING', 'NAV_BOOK', 'NAV_INFO', 'HOME', 'SOUND_ON', 'SOUND_OFF'],
    ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'TROPHY', 'MEDAL', 'STORAGE', 'SPARKLE'],
]

img = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = img.shape
rows, cols = len(NAMES), len(NAMES[0])
nonwhite = (765 - img.sum(axis=2)) > 90  # JPG 압축 노이즈 무시

# 덩어리(연결된 전경) 단위로 찾고, 덩어리 중심이 속한 칸에만 배정 → 칸 경계에 걸친 옆 칸 아이콘 조각이 섞이지 않음.
# 한 칸에 덩어리가 여러 개면(반짝이 별 등) 상자를 합친다.
src_bs = (ROOT / 'scripts' / 'build-sprites.py').read_text(encoding='utf-8')
ns: dict = {}
exec(compile(src_bs.split('\nSRC = ')[0], 'head', 'exec'), ns)
a_ = src_bs.index('def components(')
exec(compile(src_bs[a_ : src_bs.index('\ndef ', a_ + 5)], 'components', 'exec'), ns)
boxes = {}
for b in ns['components'](nonwhite, f=2, min_cells=6):
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    key = (min(rows - 1, int(cy // (H / rows))), min(cols - 1, int(cx // (W / cols))))
    o = boxes.get(key)
    boxes[key] = (min(o[0], b[0]), min(o[1], b[1]), max(o[2], b[2]), max(o[3], b[3])) if o else tuple(b)


def remove_bg(crop):
    h, w, _ = crop.shape
    nearwhite = (crop > 225).all(axis=2)
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if nearwhite[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if nearwhite[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
            if 0 <= ny < h and 0 <= nx < w and nearwhite[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    return ~bg


atlas = np.zeros((rows * CELL, cols * CELL, 4), np.uint8)
meta = {}
for r, row in enumerate(NAMES):
    for c, name in enumerate(row):
        x0, y0, x1, y1 = boxes[(r, c)]
        crop = img[y0:y1, x0:x1]
        fgb = remove_bg(crop)
        # 상자 가장자리에 닿은 작은 조각(옆 칸 아이콘의 끄트머리) 제거
        from collections import deque as _dq
        h0, w0 = fgb.shape
        lab = np.zeros((h0, w0), np.int32)
        sizes = [0]
        touch = [False]
        for yy in range(h0):
            for xx in range(w0):
                if fgb[yy, xx] and not lab[yy, xx]:
                    k = len(sizes)
                    lab[yy, xx] = k
                    qq = _dq([(yy, xx)])
                    cnt = 0
                    edge = False
                    while qq:
                        cy, cx = qq.popleft()
                        cnt += 1
                        edge |= cy in (0, h0 - 1) or cx in (0, w0 - 1)
                        for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                            if 0 <= ny < h0 and 0 <= nx < w0 and fgb[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = k
                                qq.append((ny, nx))
                    sizes.append(cnt)
                    touch.append(edge)
        big = max(sizes)
        for k in range(1, len(sizes)):
            if sizes[k] < big * 0.02 or (touch[k] and sizes[k] < big * 0.15):
                fgb[lab == k] = False
        ys_, xs_ = np.where(fgb)
        crop = crop[ys_.min() : ys_.max() + 1, xs_.min() : xs_.max() + 1]
        fg = fgb[ys_.min() : ys_.max() + 1, xs_.min() : xs_.max() + 1].astype(np.float64)
        h, w = fg.shape
        s = (CELL - 2) / max(h, w)
        tw, th = max(1, round(w * s)), max(1, round(h * s))
        prem = Image.fromarray(np.uint8(np.clip(crop * fg[..., None], 0, 255))).resize((tw, th), Image.Resampling.LANCZOS)
        cov = Image.fromarray(np.uint8(fg * 255)).resize((tw, th), Image.Resampling.LANCZOS)
        prem_a = np.asarray(prem).astype(np.float64)
        cov_a = np.asarray(cov).astype(np.float64) / 255
        rgb = np.where(cov_a[..., None] > 0.02, prem_a / np.maximum(cov_a[..., None], 1e-6), 0)
        icon = np.dstack([np.clip(rgb, 0, 255), np.clip(cov_a * 255, 0, 255)]).astype(np.uint8)
        ox, oy = c * CELL + (CELL - tw) // 2, r * CELL + (CELL - th) // 2
        atlas[oy : oy + th, ox : ox + tw] = icon
        meta[name] = {'x': c * CELL, 'y': r * CELL}

Image.fromarray(atlas).save(ROOT / 'src' / 'assets' / 'icons.png', optimize=True)
(ROOT / 'src' / 'render' / 'iconAtlas.json').write_text(
    json.dumps({'cell': CELL, 'cols': cols, 'rows': rows, 'icons': meta}, indent=1), encoding='utf-8'
)
print('icons', atlas.shape, len(meta))
