"""
assets-src/character-sheet.png (흰 배경 캐릭터 시트) →
  src/assets/characters.png  (투명 배경, 원본 도트 해상도로 축소한 아틀라스)
  src/render/characterAtlas.json (프레임 좌표)

실행: python3 scripts/build-sprites.py
1) 흰 배경이 아닌 픽셀을 묶어 스프라이트 19개를 자동 검출
2) 테두리에서 이어지는 흰색만 배경으로 지움 (흰 티셔츠는 유지)
3) 업스케일된 도트(약 5.67px = 1도트)를 원래 해상도로 축소
4) 아들/딸은 assets-src/{son,daughter}-walk-sheet.png 의 손그림 걷기 3장(A·B·C → A,B,C,B 사이클) 사용
5) 손그림 걷기가 없는 캐릭터는 '서기' 프레임에서 생성: 다리를 좌우로 나눠 번갈아 들고,
   팔을 반대로 흔들고, 발 디딤 순간 몸이 1px 내려앉는 4프레임 사이클 → {이름}_walk0~3
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



def load_sheet(path, names):
    """시트에서 스프라이트를 찾아 (이름, 프레임) 목록으로 반환. 3행 그리드 기준 행→열 순 정렬"""
    img = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    H = img.shape[0]
    nonwhite = (765 - img.sum(axis=2)) > 60
    boxes = components(nonwhite)
    assert len(boxes) == len(names), f'{path}: expected {len(names)} sprites, found {len(boxes)}'
    boxes.sort(key=lambda b: (int(((b[1] + b[3]) / 2) // (H / 3)), b[0]))
    return [(n, cut(img, b)) for n, b in zip(names, boxes)], img, dict(zip(names, boxes))


def drop_specks(rgba, ratio=0.05):
    """본체와 떨어진 작은 조각(워터마크·잡티) 제거: 가장 큰 덩어리의 5% 미만 덩어리를 지운다"""
    a = rgba[..., 3] > 0
    h, w = a.shape
    lab = np.zeros((h, w), np.int32)
    sizes = [0]
    for y in range(h):
        for x in range(w):
            if a[y, x] and not lab[y, x]:
                n = len(sizes)
                lab[y, x] = n
                q = deque([(y, x)])
                cnt = 0
                while q:
                    cy, cx = q.popleft()
                    cnt += 1
                    for ny in (cy - 1, cy, cy + 1):
                        for nx in (cx - 1, cx, cx + 1):
                            if 0 <= ny < h and 0 <= nx < w and a[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n
                                q.append((ny, nx))
                sizes.append(cnt)
    big = max(sizes)
    for i, sz in enumerate(sizes[1:], 1):
        if sz < big * ratio:
            rgba[lab == i] = 0
    return rgba


def cut(img, box, block=BLOCK):
    H, W, _ = img.shape
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
    tw, th = max(1, round(w / block)), max(1, round(h / block))
    prem = Image.fromarray(np.uint8(np.clip(crop * fg[..., None], 0, 255)))
    cov = Image.fromarray(np.uint8(fg * 255))
    prem_s = np.asarray(prem.resize((tw, th), Image.Resampling.BOX)).astype(np.float64)
    cov_s = np.asarray(cov.resize((tw, th), Image.Resampling.BOX)).astype(np.float64) / 255
    rgb = np.where(cov_s[..., None] > 0, prem_s / np.maximum(cov_s[..., None], 1e-6), 0)
    alpha = (cov_s > 0.45) * 255
    out = np.dstack([np.clip(rgb, 0, 255), alpha]).astype(np.uint8)
    out = drop_specks(out)
    # 투명 여백 잘라내기
    ys, xs = np.where(out[..., 3] > 0)
    return out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def walk_frames(s):
    """s: HxWx4 서기 스프라이트 → 걷기 4프레임 (각 H+2 x W)"""
    h, w, _ = s.shape
    a = s[..., 3] > 0
    # 발 영역(아래 6줄)의 가로 범위 = 다리 열 범위
    ys, xs = np.where(a[h - 6:])
    fx0, fx1 = xs.min(), xs.max()
    # 다리 사이 틈: 아래 12줄에서 불투명 픽셀이 가장 적은 열 (중앙 근처)
    zone = a[h - 12:, fx0:fx1 + 1]
    cols = zone.sum(axis=0)
    mid = (fx1 - fx0) / 2
    cand = sorted(range(len(cols)), key=lambda c: (cols[c], abs(c - mid)))
    gap = fx0 + cand[0]
    # 가랑이 높이: 틈 열이 투명한 구간을 아래에서 위로
    y = h - 1
    while y > h * 0.45 and not a[y, gap]:
        y -= 1
    crotch = y
    leg_top = max(int(h * 0.55), crotch - 2)
    lx0, lx1 = max(0, fx0 - 1), min(w - 1, fx1 + 1)
    upper = s.copy()
    upper[leg_top:, lx0:lx1 + 1] = 0
    left = np.zeros_like(s); left[leg_top:, lx0:gap] = s[leg_top:, lx0:gap]
    right = np.zeros_like(s); right[leg_top:, gap:lx1 + 1] = s[leg_top:, gap:lx1 + 1]
    # 팔: 다리 범위 바깥, 허리 위쪽 몸통 양옆 열 (손 흔들기)
    arm_w = max(3, w // 9)
    ys_b, xs_b = np.where(a[: leg_top])
    bx0, bx1 = xs_b.min(), xs_b.max()
    shoulder = int(h * 0.42)

    def paste(dst, src, dx, dy):
        sh, sw, _ = src.shape
        m = src[..., 3] > 0
        yy, xx = np.where(m)
        ny, nx = yy + dy, xx + dx
        ok = (ny >= 0) & (ny < dst.shape[0]) & (nx >= 0) & (nx < dst.shape[1])
        dst[ny[ok], nx[ok]] = src[yy[ok], xx[ok]]

    def arm_layer(body, side):
        lay = np.zeros_like(body)
        if side == 'L':
            lay[shoulder:leg_top + 4, bx0:bx0 + arm_w] = body[shoulder:leg_top + 4, bx0:bx0 + arm_w]
        else:
            lay[shoulder:leg_top + 4, bx1 - arm_w + 1:bx1 + 1] = body[shoulder:leg_top + 4, bx1 - arm_w + 1:bx1 + 1]
        return lay

    # (왼다리 dx,dy), (오른다리 dx,dy), 몸 dy, (왼팔 dy, 오른팔 dy)
    lift = max(2, h // 28)
    # 발 디딤(contact) 프레임: 한쪽 다리 들고 몸이 1px 내려앉음 / 교차(passing) 프레임: 기본 자세
    cycle = [
        ((-1, -lift), (1, 0), 1, (1, -1)),   # 왼발 앞으로
        ((0, 0), (0, 0), 0, (0, 0)),         # 교차
        ((-1, 0), (1, -lift), 1, (-1, 1)),   # 오른발 앞으로
        ((0, 0), (0, 0), 0, (0, 0)),
    ]
    frames = []
    for (ldx, ldy), (rdx, rdy), bdy, (la, ra) in cycle:
        out = np.zeros((h + 2, w, 4), np.uint8)
        # 다리를 먼저, 몸통을 위에 (들린 다리가 치마/상의 아래로 들어가게)
        paste(out, left, ldx, ldy + 2)
        paste(out, right, rdx, rdy + 2)
        body = upper.copy()
        la_l = arm_layer(body, 'L'); ra_l = arm_layer(body, 'R')
        if la or ra:
            body[shoulder:leg_top + 4, bx0:bx0 + arm_w] = 0
            body[shoulder:leg_top + 4, bx1 - arm_w + 1:bx1 + 1] = 0
        paste(out, body, 0, bdy + 2)
        if la or ra:
            paste(out, la_l, 0, bdy + 2 + la)
            paste(out, ra_l, 0, bdy + 2 + ra)
        frames.append(out)
    return frames


# 아들/딸 걷기 시트: 단계별 [서기, 걷기A, 걷기B(교차), 걷기C, 독서, 만세]
WALK_SHEETS = {
    'SON': 'assets-src/son-walk-sheet.png',
    'DAUGHTER': 'assets-src/daughter-walk-sheet.png',
}
STAGES = ('CHILD', 'TEEN', 'YOUTH')

sprites = dict(load_sheet(SRC, NAMES)[0])
for g, path in WALK_SHEETS.items():
    names_g = [f'{st}_{g}_{k}' for st in STAGES for k in ('stand', 'walkA', 'walkB', 'walkC', 'read', 'cheer')]
    lst, sheet_img, sheet_boxes = load_sheet(path, names_g)
    sh = dict(lst)
    # 걷기 그림이 서기보다 작거나 크게 그려진 경우, 교차 프레임(B) 키가 서기 키 -1px 이 되도록 축소 비율 보정
    for st in STAGES:
        k = (sh[f'{st}_{g}_stand'].shape[0] - 1) / sh[f'{st}_{g}_walkB'].shape[0]
        if abs(k - 1) > 0.02:
            for x in 'ABC':
                sh[f'{st}_{g}_walk{x}'] = cut(sheet_img, sheet_boxes[f'{st}_{g}_walk{x}'], BLOCK / k)
    if g == 'DAUGHTER':
        # 청년 딸 만세 그림 발 옆에 붙은 원본 워터마크(밝은 회색) 제거
        f = sh['YOUTH_DAUGHTER_cheer']
        h, w, _ = f.shape
        reg = f[int(h * 0.85):, int(w * 0.6):]
        rgb = reg[..., :3].astype(int)
        gray = (rgb.min(axis=2) > 120) & (rgb.max(axis=2) - rgb.min(axis=2) < 30)
        reg[gray] = 0
        sh['YOUTH_DAUGHTER_cheer'] = drop_specks(f)
    for st in STAGES:
        # 서기·독서·만세도 새 시트로 교체 (청년 딸 만세 추가)
        for k in ('stand', 'read', 'cheer'):
            sprites[f'{st}_{g}_{k}'] = sh[f'{st}_{g}_{k}']
        a, b, c = (sh[f'{st}_{g}_walk{x}'] for x in 'ABC')
        for i, f in enumerate((a, b, c, b)):  # 4프레임 사이클: 왼발 → 교차 → 오른발 → 교차
            sprites[f'{st}_{g}_walk{i}'] = f

# 손그림 걷기가 없는 캐릭터(딸, 부모님)는 서기 프레임에서 생성
for name in list(sprites):
    if name.endswith('_stand'):
        base = name[: -len('_stand')]
        if f'{base}_walk0' not in sprites:
            for i, wf in enumerate(walk_frames(sprites[name])):
                sprites[f'{base}_walk{i}'] = wf

names = list(sprites)
frames = [sprites[n] for n in names]
gap = 1
aw = sum(f.shape[1] for f in frames) + gap * (len(frames) - 1)
ah = max(f.shape[0] for f in frames)
atlas = np.zeros((ah, aw, 4), np.uint8)
meta = {}
x = 0
for name, f in zip(names, frames):
    h, w, _ = f.shape
    atlas[0:h, x : x + w] = f
    meta[name] = {'x': x, 'y': 0, 'w': w, 'h': h}
    x += w + gap
Image.fromarray(atlas).save(OUT_PNG, optimize=True)
json.dump(meta, open(OUT_JSON, 'w'), indent=1)
print('atlas', atlas.shape, {k: (v['w'], v['h']) for k, v in meta.items()})
