"""
가구 스프라이트 시트(Gemini 생성, 흰 배경) → src/assets/furniture.png 아틀라스 + src/render/furnitureAtlas.json

실행: python3 scripts/build-furniture.py
- assets-src/furniture-sheets.json 의 시트 목록을 읽는다 (칸 → 가구ID, 원본 정면 방향)
- 흰 배경 덩어리를 찾아 행/열 칸에 배정 (중복·빈칸 허용)
- 테두리와 이어진 흰색만 배경으로 지움, 본체와 떨어진 잡티/워터마크 제거
- 업스케일된 도트를 원래 해상도로 축소 (게임 캔버스 백버퍼 RES=2 기준 1:1)
- 1칸 가구는 가로 70px·세로 90px(백버퍼) 안에 들어가도록 크기 제한
"""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('bs', ROOT / 'scripts' / 'build-sprites.py')
# build-sprites.py 의 공용 함수(components, drop_specks)를 가져오되 모듈 본문 실행은 피한다
src = (ROOT / 'scripts' / 'build-sprites.py').read_text(encoding='utf-8')
ns: dict = {}
exec(compile(src.split('\nSRC = ')[0], 'build-sprites-head', 'exec'), ns)  # import 부분
for fn in ('def components(', 'def drop_specks('):
    start = src.index(fn)
    end = src.index('\ndef ', start + 5)
    exec(compile(src[start:end], fn, 'exec'), ns)
components = ns['components']
drop_specks = ns['drop_specks']

TW = 32  # 게임 타일 폭 (논리 px)
RES = 2  # 캔버스 백버퍼 배율
MAX_W_PER_TILE = TW * RES * 1.1
MAX_H = 92

conf = json.loads((ROOT / 'assets-src' / 'furniture-sheets.json').read_text(encoding='utf-8'))
furniture_cells = {}  # 가로 칸 수 (2칸 가구)
for line in (ROOT / 'src' / 'data' / 'furnitureData.ts').read_text(encoding='utf-8').splitlines():
    if "id: '" in line:
        fid = line.split("id: '")[1].split("'")[0]
        furniture_cells[fid] = 2 if 'width: 2' in line else 1


def estimate_block(img):
    """업스케일된 도트 1칸의 픽셀 크기: 색 경계 사이 거리의 최빈값 근처"""
    runs = []
    for row in img[:: max(1, img.shape[0] // 300)]:
        d = np.abs(np.diff(row, axis=0)).sum(axis=1) > 40
        idx = np.where(d)[0]
        gaps = np.diff(idx)
        runs.extend(gaps[(gaps > 1) & (gaps < 12)].tolist())
    vals, counts = np.unique(runs, return_counts=True)
    top = vals[np.argsort(counts)[-2:]]  # 가장 흔한 두 값(예: 3,4) 평균
    return float(np.mean(top)) + 0.0


def cut(img, box, block):
    H, W, _ = img.shape
    x0, y0, x1, y1 = box
    pad = 6
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    crop = img[y0:y1, x0:x1]
    h, w, _ = crop.shape
    nearwhite = (crop > 228).all(axis=2)
    # 테두리에서 이어진 흰색 = 배경
    from collections import deque
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
    tw, th = max(1, round(w / block)), max(1, round(h / block))
    prem = Image.fromarray(np.uint8(np.clip(crop * fg[..., None], 0, 255)))
    cov = Image.fromarray(np.uint8(fg * 255))
    prem_s = np.asarray(prem.resize((tw, th), Image.Resampling.BOX)).astype(np.float64)
    cov_s = np.asarray(cov.resize((tw, th), Image.Resampling.BOX)).astype(np.float64) / 255
    rgb = np.where(cov_s[..., None] > 0, prem_s / np.maximum(cov_s[..., None], 1e-6), 0)
    alpha = (cov_s > 0.45) * 255
    out = drop_specks(np.dstack([np.clip(rgb, 0, 255), alpha]).astype(np.uint8), ratio=0.08)
    ys, xs = np.where(out[..., 3] > 0)
    return out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def strip_sparkle(rgba):
    """Gemini 워터마크(오른쪽 아래 반투명 반짝이 별) 제거.
    가구 위에 반투명으로 겹친 부분은 채도가 낮고 밝아지므로, 오른쪽 아래 구석에서 그런 픽셀을 찾아
    왼쪽 이웃 색으로 메운다(이웃이 투명하면 투명 처리)."""
    h, w, _ = rgba.shape
    y0, x0 = int(h * 0.55), int(w * 0.6)
    rgb = rgba[..., :3].astype(int)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    pale = (rgb[..., 2] > 75) & (spread < 70) & (rgb.max(axis=2) > 120) & (rgba[..., 3] > 0)
    pale[:y0, :] = False
    pale[:, :x0] = False
    for y in range(y0, h):
        for x in range(x0, w):
            if pale[y, x]:
                lx = x - 1
                while lx >= 0 and pale[y, lx]:
                    lx -= 1
                if lx >= 0 and rgba[y, lx, 3] > 0 and lx >= x - 12:
                    rgba[y, x] = rgba[y, lx]
                else:
                    rgba[y, x] = 0
    return drop_specks(rgba, ratio=0.08)


sprites = {}
for sheet in conf['sheets']:
    path = ROOT / sheet['file']
    img = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    H, W, _ = img.shape
    block = sheet.get('block') or estimate_block(img)
    nonwhite = (765 - img.sum(axis=2)) > 60
    boxes = components(nonwhite)
    print(f'{sheet["file"]}: {W}x{H}, block≈{block:.2f}px, {len(boxes)} objects')
    assigned = []  # (box, [fid, face, scale?], 마지막 칸 여부)
    if 'rows' in sheet:
        # 방식 2: 행별 왼쪽→오른쪽 순서
        nrows = len(sheet['rows'])
        by_row = [[] for _ in range(nrows)]
        for b in boxes:
            by_row[min(nrows - 1, int(((b[1] + b[3]) / 2) // (H / nrows)))].append(b)
        for r, (spec_row, found) in enumerate(zip(sheet['rows'], by_row)):
            found.sort(key=lambda b: b[0])
            if len(found) != len(spec_row):
                sys.exit(f'{sheet["file"]} {r + 1}행: 설정 {len(spec_row)}개, 이미지 {len(found)}개')
            for c, (b, item) in enumerate(zip(found, spec_row)):
                if item:
                    assigned.append((b, item, r == nrows - 1 and c == len(found) - 1))
    else:
        rows, cols = sheet['grid']
        for b in boxes:
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            key = f'{min(rows - 1, int(cy // (H / rows)))},{min(cols - 1, int(cx // (W / cols)))}'
            if key in sheet['items']:
                assigned.append((b, sheet['items'][key], key == f'{rows - 1},{cols - 1}'))
    for b, item, last in assigned:
        fid, face, *rest = item
        extra = rest[0] if rest else 1.0
        cells = furniture_cells.get(fid, 1)
        # 크기 제한: 기본 축소 후 가로/세로 상한을 넘으면 더 축소
        bw, bh = (b[2] - b[0]) / block, (b[3] - b[1]) / block
        s = min(1.0, MAX_W_PER_TILE * cells / bw, MAX_H / bh) * extra
        spr = cut(img, b, block / s)
        if last:
            spr = strip_sparkle(spr)  # Gemini 워터마크는 항상 오른쪽 아래
        sprites[fid] = (spr, face)

wanted = [v[0] for s in conf['sheets'] for v in (s['items'].values() if 'items' in s else [i for row in s['rows'] for i in row if i])]
missing = [k for k in wanted if k not in sprites]
if missing:
    sys.exit(f'칸에서 그림을 못 찾음: {missing}')



def empty_cushion(spr):
    """반려묘 쿠션 그림에서 고양이를 지운 빈 쿠션 (고양이가 쿠션 밖에 나와 있을 때)
    분홍이 아닌 안쪽 픽셀(주황·크림·갈색·고양이 외곽선) = 고양이 → 주변 분홍으로 메우고, 오목한 가운데 그늘을 넣는다"""
    a = spr.astype(np.float64).copy()
    h, w, _ = a.shape
    alpha = a[..., 3] > 0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    pink = (r > 140) & (b >= g - 8) & (r - g > 25)
    # 바깥 테두리(투명에 닿은 픽셀)는 쿠션 외곽선이라 남김
    pad = np.pad(~alpha, 1, constant_values=True)
    edge = np.zeros_like(alpha)
    for dy, dx in ((0, 1), (2, 1), (1, 0), (1, 2)):
        edge |= pad[dy:dy + h, dx:dx + w]
    # 고양이 몸 색(주황 털 · 크림 배)으로 고양이 자리를 찾고, 그 범위 안의 분홍이 아닌 픽셀(외곽선 포함)을 고양이로
    orange = (r > 150) & (g > 70) & (b < g - 15)
    cream = (r > 185) & (g > 165) & (b > 130) & (r - b < 70)
    core = alpha & (orange | cream) & ~edge
    core[int(h * 0.62):] = False
    cys, cxs = np.where(core)
    by0, by1, bx0, bx1 = cys.min() - 1, cys.max() + 1, cxs.min() - 1, cxs.max() + 1
    box = np.zeros_like(alpha)
    box[max(0, by0):by1 + 1, max(0, bx0):bx1 + 1] = True
    cat = alpha & ~pink & ~edge & box
    # 고양이 덩어리 주변 1칸까지 (안티앨리어싱 섞인 색)
    grow = cat.copy()
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        grow |= np.roll(cat, (dy, dx), axis=(0, 1))
    cat = grow & alpha & ~edge
    rgb = a[..., :3]
    # 쿠션 윗면 분홍(밝은 쪽)과 안쪽 그늘 색: 고양이 주변 분홍 픽셀에서 뽑음
    ys, xs = np.where(cat)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    near = alpha & pink & ~edge
    near[: max(0, y0 - 3)] = False
    near[y1 + 4:] = False
    pk = rgb[near]
    light = np.percentile(pk, 75, axis=0)
    dark = np.percentile(pk, 15, axis=0)
    rim_line = dark * 0.78
    cy, cx = (y0 + y1) / 2 + 0.5, (x0 + x1) / 2
    ry, rx = (y1 - y0) / 2 + 1.5, (x1 - x0) / 2 + 2
    yy, xx = np.mgrid[0:h, 0:w]
    d = ((yy - cy) / ry) ** 2 + ((xx - cx) / rx) ** 2
    # 고양이 자리: 오목한 안쪽 (위는 앞 테두리 그늘로 어둡게 → 아래로 갈수록 밝게, 4단계)
    inside = alpha & ~edge & (d < 1.0)
    t = np.clip((yy - (cy - ry)) / (2 * ry), 0, 1)
    steps = np.floor(t * 4) / 3
    col = dark[None, None, :] * (1 - steps[..., None]) + light[None, None, :] * steps[..., None]
    rgb[inside] = col[inside]
    # 안쪽 테두리 선 (뒤쪽 반원만)
    ring = alpha & ~edge & (d >= 0.78) & (d < 1.0) & (yy < cy + 1)
    rgb[ring] = rim_line
    # 타원 밖으로 삐져나온 고양이 픽셀은 윗면 분홍으로
    rest = cat & ~inside
    rgb[rest] = light
    a[..., :3] = rgb
    return np.clip(a, 0, 255).astype(np.uint8)


if 'cat_cushion' in sprites:
    sprites['cat_cushion_empty'] = (empty_cushion(sprites['cat_cushion'][0]), sprites['cat_cushion'][1])

gap = 1
names = sorted(sprites)
aw = sum(sprites[n][0].shape[1] for n in names) + gap * (len(names) - 1)
ah = max(sprites[n][0].shape[0] for n in names)
atlas = np.zeros((ah, aw, 4), np.uint8)
meta = {}
x = 0
for n in names:
    spr, face = sprites[n]
    h, w, _ = spr.shape
    atlas[0:h, x : x + w] = spr
    meta[n] = {'x': x, 'y': 0, 'w': w, 'h': h, 'face': face}
    x += w + gap
Image.fromarray(atlas).save(ROOT / 'src' / 'assets' / 'furniture.png', optimize=True)
(ROOT / 'src' / 'render' / 'furnitureAtlas.json').write_text(json.dumps(meta, indent=1), encoding='utf-8')
print('atlas', atlas.shape, {k: (v['w'], v['h'], v['face']) for k, v in meta.items()})
