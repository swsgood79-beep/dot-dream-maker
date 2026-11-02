"""
assets-src/character-sheet.png (흰 배경 캐릭터 시트) →
  src/assets/characters.png  (투명 배경, 원본 도트 해상도로 축소한 아틀라스)
  src/render/characterAtlas.json (프레임 좌표)

실행: python3 scripts/build-sprites.py
1) 흰 배경이 아닌 픽셀을 묶어 스프라이트 19개를 자동 검출
2) 테두리에서 이어지는 흰색만 배경으로 지움 (흰 티셔츠는 유지)
3) 업스케일된 도트(약 5.67px = 1도트)를 원래 해상도로 축소
"""
import json
from collections import deque
import numpy as np
from PIL import Image

SRC = 'assets-src/character-sheet.png'
OUT_PNG = 'src/assets/characters.png'
OUT_JSON = 'src/render/characterAtlas.json'
BLOCK = 5.67  # 원본 1도트당 픽셀 수 (런 길이 분석으로 측정)

NAMES = [
    # 1행: 유년기
    'CHILD_SON_stand', 'CHILD_SON_read', 'CHILD_SON_cheer',
    'CHILD_DAUGHTER_stand', 'CHILD_DAUGHTER_read', 'CHILD_DAUGHTER_cheer',
    # 2행: 청소년기
    'TEEN_SON_stand', 'TEEN_SON_read', 'TEEN_SON_cheer',
    'TEEN_DAUGHTER_stand', 'TEEN_DAUGHTER_read', 'TEEN_DAUGHTER_cheer',
    # 3행: 청년기 + NPC
    'YOUTH_SON_stand', 'YOUTH_SON_read', 'YOUTH_SON_cheer',
    'YOUTH_DAUGHTER_stand', 'YOUTH_DAUGHTER_read',
    'CAT_sleep', 'PARENT_stand',
]

img = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W, _ = img.shape
nonwhite = (765 - img.sum(axis=2)) > 60


def components(mask, f=4, min_cells=200):
    h, w = mask.shape[0] // f, mask.shape[1] // f
    small = mask[: h * f, : w * f].reshape(h, f, w, f).any(axis=(1, 3))
    d = small.copy()
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            d |= np.roll(np.roll(small, dy, 0), dx, 1)
    lab = np.zeros((h, w), np.int32)
    boxes, n = [], 0
    for y in range(h):
        for x in range(w):
            if d[y, x] and not lab[y, x]:
                n += 1
                q = deque([(y, x)])
                lab[y, x] = n
                y0 = y1 = y
                x0 = x1 = x
                cnt = 0
                while q:
                    cy, cx = q.popleft()
                    cnt += 1
                    y0, y1, x0, x1 = min(y0, cy), max(y1, cy), min(x0, cx), max(x1, cx)
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and d[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n
                            q.append((ny, nx))
                if cnt > min_cells:
                    boxes.append((x0 * f, y0 * f, (x1 + 1) * f, (y1 + 1) * f))
    return boxes


boxes = components(nonwhite)
assert len(boxes) == len(NAMES), f'expected {len(NAMES)} sprites, found {len(boxes)}'
# 행(세로 위치) → 열(가로 위치) 순 정렬
rows = sorted({round(((b[1] + b[3]) / 2) / (H / 3) - 0.5) for b in boxes})
boxes.sort(key=lambda b: (int(((b[1] + b[3]) / 2) // (H / 3)), b[0]))


def cut(box):
    x0, y0, x1, y1 = box
    pad = 6
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    crop = img[y0:y1, x0:x1]
    h, w, _ = crop.shape
    nearwhite = (crop > 228).all(axis=2)
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if nearwhite[y, x] and not bg[y, x]:
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
    fg = (~bg).astype(np.float64)
    # 배경색이 섞이지 않도록 전경 색만 평균 (premultiplied box 축소)
    tw, th = max(1, round(w / BLOCK)), max(1, round(h / BLOCK))
    prem = Image.fromarray(np.uint8(np.clip(crop * fg[..., None], 0, 255)))
    cov = Image.fromarray(np.uint8(fg * 255))
    prem_s = np.asarray(prem.resize((tw, th), Image.Resampling.BOX)).astype(np.float64)
    cov_s = np.asarray(cov.resize((tw, th), Image.Resampling.BOX)).astype(np.float64) / 255
    rgb = np.where(cov_s[..., None] > 0, prem_s / np.maximum(cov_s[..., None], 1e-6), 0)
    alpha = (cov_s > 0.45) * 255
    out = np.dstack([np.clip(rgb, 0, 255), alpha]).astype(np.uint8)
    # 투명 여백 잘라내기
    ys, xs = np.where(out[..., 3] > 0)
    return out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


frames = [cut(b) for b in boxes]
gap = 1
aw = sum(f.shape[1] for f in frames) + gap * (len(frames) - 1)
ah = max(f.shape[0] for f in frames)
atlas = np.zeros((ah, aw, 4), np.uint8)
meta = {}
x = 0
for name, f in zip(NAMES, frames):
    h, w, _ = f.shape
    atlas[0:h, x : x + w] = f
    meta[name] = {'x': x, 'y': 0, 'w': w, 'h': h}
    x += w + gap
Image.fromarray(atlas).save(OUT_PNG, optimize=True)
json.dump(meta, open(OUT_JSON, 'w'), indent=1)
print('atlas', atlas.shape, {k: (v['w'], v['h']) for k, v in meta.items()})
