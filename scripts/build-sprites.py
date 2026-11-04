"""
assets-src/character-sheet.png (흰 배경 캐릭터 시트) →
  src/assets/characters.png  (투명 배경, 원본 도트 해상도로 축소한 아틀라스)
  src/render/characterAtlas.json (프레임 좌표)

실행: python3 scripts/build-sprites.py
1) 흰 배경이 아닌 픽셀을 묶어 스프라이트 19개를 자동 검출
2) 테두리에서 이어지는 흰색만 배경으로 지움 (흰 티셔츠는 유지)
3) 업스케일된 도트(약 5.67px = 1도트)를 원래 해상도로 축소
4) 아들/딸은 assets-src/{son,daughter}-walk-sheet.png 의 손그림 걷기 3장(A·B·C → A,B,C,B 사이클) 사용
5) 뒷모습(방 안쪽으로 걸어갈 때)은 assets-src/{son,daughter}-back-sheet.png
6) 행동 포즈(책상 공부·운동·그림·노래·컴퓨터·알바·잠자기·지침)는 assets-src/{son,daughter}-pose-sheet.png
7) 손그림 걷기가 없는 캐릭터는 '서기' 프레임에서 생성: 다리를 좌우로 나눠 번갈아 들고,
   팔을 반대로 흔들고, 발 디딤 순간 몸이 1px 내려앉는 4프레임 사이클 → {이름}_walk0~3
"""
import json
import os
from collections import deque
import numpy as np
from PIL import Image

SRC = 'assets-src/character-sheet.png'
# HI=2: 같은 그림을 2배 해상도로 다시 잘라 고화질 시트를 만든다 (게임은 이 시트로 그림, 좌표·크기는 1배 아틀라스 기준)
HI = int(os.environ.get('HI', '1'))
OUT_PNG = 'src/assets/characters.png' if HI == 1 else 'src/assets/characters_hi.webp'
OUT_JSON = 'src/render/characterAtlas.json' if HI == 1 else 'src/render/characterAtlasHi.json'
BLOCK = 5.67 / HI  # 원본 1도트당 픽셀 수 (런 길이 분석으로 측정)

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


def clean_edges(rgba, passes):
    """흰 배경 번짐(누끼 흰 테두리) 제거.
    1) 투명한 곳에 닿은 밝고 무채색인 픽셀을 passes번 벗겨 낸다 (도트 그림은 진한 외곽선이 있어 거기서 멈춤)
    2) 남은 테두리 중 회색빛(흰색+외곽선이 섞인 색) 픽셀은 주변에서 가장 진한 색으로 바꿔 외곽선을 또렷하게"""
    def edge_of(a):
        pad = np.pad(~a, 1, constant_values=True)
        e = np.zeros_like(a)
        for dy, dx in ((0, 1), (2, 1), (1, 0), (1, 2)):
            e |= pad[dy : dy + a.shape[0], dx : dx + a.shape[1]]
        return a & e
    for _ in range(passes):
        a = rgba[..., 3] > 0
        rgb = rgba[..., :3].astype(int)
        lum, sat = rgb.mean(axis=2), rgb.max(axis=2) - rgb.min(axis=2)
        halo = edge_of(a) & (lum > 150) & (sat < 70)
        if not halo.any():
            break
        rgba[halo] = 0
    a = rgba[..., 3] > 0
    rgb = rgba[..., :3].astype(int)
    lum, sat = rgb.mean(axis=2), rgb.max(axis=2) - rgb.min(axis=2)
    grey = edge_of(a) & (lum > 95) & (sat < 50)
    H, W = a.shape
    big = np.where(a, lum, 999)
    for y, x in zip(*np.where(grey)):
        y0, y1, x0, x1 = max(0, y - 1), min(H, y + 2), max(0, x - 1), min(W, x + 2)
        win = big[y0:y1, x0:x1]
        k = np.unravel_index(np.argmin(win), win.shape)
        if win[k] < lum[y, x] - 30:
            rgba[y, x, :3] = rgba[y0 + k[0], x0 + k[1], :3]
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
    out = clean_edges(out, max(1, round(3 / block)))
    # 투명 여백 잘라내기
    ys, xs = np.where(out[..., 3] > 0)
    return out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def defringe(rgba, passes=2):
    """압축된 작은 이미지의 흰 배경 번짐 제거: 투명 영역에 닿은 밝은 회백색 테두리 픽셀을 지운다"""
    for _ in range(passes):
        a = rgba[..., 3] > 0
        rgb = rgba[..., :3].astype(int)
        pale = (rgb.min(axis=2) > 175) & (rgb.max(axis=2) - rgb.min(axis=2) < 45)
        edge = np.zeros_like(a)
        pad = np.pad(~a, 1, constant_values=True)
        for dy, dx in ((0, 1), (2, 1), (1, 0), (1, 2)):
            edge |= pad[dy : dy + a.shape[0], dx : dx + a.shape[1]]
        rgba[a & pale & edge] = 0
    return rgba


def fit_cut(img, box, target_h):
    """잘라낸 그림의 실제 키가 target_h 가 되도록 축소 비율을 두 번에 걸쳐 맞춘다
    (검출 상자에는 여백이 섞여 있어 상자 높이로만 계산하면 작아짐)"""
    blk = (box[3] - box[1]) / target_h
    spr = cut(img, box, blk)
    blk *= spr.shape[0] / target_h
    return cut(img, box, blk), blk


def walk_frames(s, lift=None, back=False):
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
    lift = lift or max(2, h // 28)
    # 발 디딤(contact) 프레임: 한쪽 다리 들고 몸이 1px 내려앉음 / 교차(passing) 프레임: 기본 자세
    if back:
        # 뒷모습(멀어지며 걷기): 내딛는 발은 위(먼 쪽)로, 남는 발은 아래(가까운 쪽)로 → 보폭이 생김.
        # 발을 디딜 때 몸이 1px 내려앉고, 디딘 발 쪽으로 1px 기울어짐. 팔은 다리와 반대로.
        # 항목: (왼다리 dx,dy), (오른다리 dx,dy), 몸 dy, (왼팔 dy, 오른팔 dy), 몸 dx
        cycle = [
            ((0, -lift), (0, 1), 1, (1, -1), 1),   # 왼발 내딛기 (오른발로 디딤)
            ((0, -1), (0, 0), 0, (0, 0), 0),       # 교차
            ((0, 1), (0, -lift), 1, (-1, 1), -1),  # 오른발 내딛기
            ((0, 0), (0, -1), 0, (0, 0), 0),       # 교차
        ]
    else:
        # 발 디딤(contact) 프레임: 한쪽 다리 들고 몸이 1px 내려앉음 / 교차(passing) 프레임: 기본 자세
        cycle = [
            ((-1, -lift), (1, 0), 1, (1, -1), 0),   # 왼발 앞으로
            ((0, 0), (0, 0), 0, (0, 0), 0),         # 교차
            ((-1, 0), (1, -lift), 1, (-1, 1), 0),   # 오른발 앞으로
            ((0, 0), (0, 0), 0, (0, 0), 0),
        ]
    frames = []
    for (ldx, ldy), (rdx, rdy), bdy, (la, ra), bdx in cycle:
        out = np.zeros((h + 3, w, 4), np.uint8)
        # 다리를 먼저, 몸통을 위에 (들린 다리가 치마/상의 아래로 들어가게)
        paste(out, left, ldx, ldy + 2)
        paste(out, right, rdx, rdy + 2)
        body = upper.copy()
        la_l = arm_layer(body, 'L'); ra_l = arm_layer(body, 'R')
        if la or ra:
            body[shoulder:leg_top + 4, bx0:bx0 + arm_w] = 0
            body[shoulder:leg_top + 4, bx1 - arm_w + 1:bx1 + 1] = 0
        paste(out, body, bdx, bdy + 2)
        if la or ra:
            paste(out, la_l, bdx, bdy + 2 + la)
            paste(out, ra_l, bdx, bdy + 2 + ra)
        # 아래 빈 줄 제거 (발끝을 기준선에 맞춤)
        ys = np.where(out[..., 3].any(axis=1))[0]
        frames.append(out[: ys.max() + 1])
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

# 아들/딸 뒷모습 시트: 단계별 [뒤 서기, 걷기 5장]
# 걷기 5장 중 행마다 자동 선택: 발 간격이 가장 좁은 그림 = 다리 모음(교차),
# 발 간격이 넓고 뒤쪽 발 방향이 서로 반대인 두 장 = 왼발/오른발 보폭 → [보폭A, 교차, 보폭B, 교차]
# 키는 앞모습 서기 키에 맞춘다.
# 원본 걷기 그림이 이상한 줄 (딸 유년기: 왼쪽 위를 향해 그려졌고 발이 뜨는 등 다리 모양이 어색함)
BACK_SYNTH: set = set()
# 따로 받은 뒷모습 걷기 시트 (2행 × 4열, 8프레임 사이클)
BACK_CUSTOM = {'CHILD_DAUGHTER': 'assets-src/daughter-child-back-walk.png'}
BACK_SHEETS = {
    'SON': 'assets-src/son-back-sheet.png',
    'DAUGHTER': 'assets-src/daughter-back-sheet.png',
}


def gait_features(img, box):
    """(발 간격 비율, 가장 아래 발의 상체 대비 좌우 위치)"""
    crop = img[box[1]:box[3], box[0]:box[2]]
    m = (765 - crop.sum(axis=2)) > 60
    h, w = m.shape
    _, xs = np.where(m[: int(h * 0.6)])
    torso = xs.mean()
    yb, xb = np.where(m[int(h * 0.9):])
    low = xb[yb >= yb.max() - 3].mean()
    return (xb.max() - xb.min()) / w, (low - torso) / w


for g, path in BACK_SHEETS.items():
    img_b = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    Hb = img_b.shape[0]
    bboxes = components((765 - img_b.sum(axis=2)) > 60)
    assert len(bboxes) == 18, f'{path}: expected 18, found {len(bboxes)}'
    bboxes.sort(key=lambda b: (int(((b[1] + b[3]) / 2) // (Hb / 3)), b[0]))
    for r, st in enumerate(STAGES):
        row = bboxes[r * 6:(r + 1) * 6]
        stand_box, walks = row[0], row[1:]
        if f'{st}_{g}' in BACK_CUSTOM:
            # 따로 받은 손그림 뒷모습 걷기 시트 (행→열 순서 = 걷기 순서)
            target_h = sprites[f'{st}_{g}_stand'].shape[0]
            sprites[f'{st}_{g}_back_stand'], _ = fit_cut(img_b, stand_box, target_h)
            cimg = np.asarray(Image.open(BACK_CUSTOM[f'{st}_{g}']).convert('RGB')).astype(np.int32)
            cb = components((765 - cimg.sum(axis=2)) > 60, f=2, min_cells=40)
            row_h = cimg.shape[0] / 2
            cb.sort(key=lambda b: (int(((b[1] + b[3]) / 2) // row_h), b[0]))
            _, cblk = fit_cut(cimg, cb[0], target_h)
            for i, b in enumerate(cb):
                sprites[f'{st}_{g}_back_walk{i}'] = defringe(cut(cimg, b, cblk))
            print(f'  {g} {st} 뒷모습 걷기: 손그림 {len(cb)}프레임')
            continue
        if f'{st}_{g}' in BACK_SYNTH:
            # 원본 걷기 그림이 이상한 줄: 똑바로 등을 보인 '뒤 서기'에서 걷기 4프레임을 직접 생성
            target_h = sprites[f'{st}_{g}_stand'].shape[0]
            stand, _ = fit_cut(img_b, stand_box, target_h)
            sprites[f'{st}_{g}_back_stand'] = stand
            for i, wf in enumerate(walk_frames(stand, lift=3, back=True)):
                sprites[f'{st}_{g}_back_walk{i}'] = wf
            print(f'  {g} {st} 뒷모습 걷기: 뒤 서기 그림에서 4프레임 생성')
            continue
        feats = [gait_features(img_b, b) for b in walks]
        pass_i = min(range(5), key=lambda i: feats[i][0])
        rest = sorted((i for i in range(5) if i != pass_i), key=lambda i: -feats[i][0])
        a_i = rest[0]
        # 보폭B: 뒤쪽 발이 보폭A와 반대쪽에 있을수록, 다리를 벌릴수록 좋음
        b_i = max(rest[1:], key=lambda i: abs(feats[i][1] - feats[a_i][1]) + 0.3 * feats[i][0])
        print(f'  {g} {st} 뒷모습 걷기: 보폭 {a_i + 2}번 → 교차 {pass_i + 2}번 → 보폭 {b_i + 2}번')
        target_h = sprites[f'{st}_{g}_stand'].shape[0]
        sprites[f'{st}_{g}_back_stand'], blk = fit_cut(img_b, stand_box, target_h)  # 뒤 서기 키 = 앞 서기 키
        for k, i in zip(('back_walk0', 'back_walk1', 'back_walk2', 'back_walk3'), (a_i, pass_i, b_i, pass_i)):
            sprites[f'{st}_{g}_{k}'] = cut(img_b, walks[i], blk)

# 아들/딸 행동 시트: 단계별 [책상 공부, 운동, 그림, 노래, 컴퓨터, 알바, 잠자기, 지침]
# 크기: 행마다 서 있는 포즈(그림·노래·지침) 키의 중앙값이 그 단계 서기 키와 같아지도록 축소 비율을 정한다.
POSE_SHEETS = {
    'SON': 'assets-src/son-pose-sheet.png',
    'DAUGHTER': 'assets-src/daughter-pose-sheet.png',
}
POSE_COLS = ['desk', 'exercise', 'draw', 'music', 'pc', 'work', 'sleep', 'tired']
# 의상이 틀리게 그려진 칸은 제외 → 게임이 기존 그림(독서/서기)으로 대체
POSE_EXCLUDE = {
    'CHILD_SON_tired',        # 반바지 대신 청바지
    'CHILD_DAUGHTER_sleep',   # 원피스 대신 세일러 교복
    'CHILD_DAUGHTER_tired',   # 긴 머리 + 카키 바지 (청년 모습)
}
for g, path in POSE_SHEETS.items():
    names_g = [f'{st}_{g}_{k}' for st in STAGES for k in POSE_COLS]
    img_p = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    Hp = img_p.shape[0]
    pboxes = components((765 - img_p.sum(axis=2)) > 60)
    assert len(pboxes) == len(names_g), f'{path}: expected {len(names_g)}, found {len(pboxes)}'
    pboxes.sort(key=lambda b: (int(((b[1] + b[3]) / 2) // (Hp / 3)), b[0]))
    named = dict(zip(names_g, pboxes))
    for st in STAGES:
        target_h = sprites[f'{st}_{g}_stand'].shape[0]
        blk = float(np.median([fit_cut(img_p, named[f'{st}_{g}_{k}'], target_h)[1] for k in ('draw', 'music', 'tired')]))
        for k in POSE_COLS:
            name = f'{st}_{g}_{k}'
            if name in POSE_EXCLUDE:
                continue
            if k == 'sleep':
                # 누운 그림은 Gemini가 단계마다 크기를 제각각 그림 → 누운 길이(가로) = 서 있을 때 키의 90%
                spr = cut(img_p, named[name], blk)
                sprites[name] = cut(img_p, named[name], blk * spr.shape[1] / (target_h * 0.9))
            else:
                sprites[name] = cut(img_p, named[name], blk)

# 침대에 누운 그림 시트 (2행 × 3열): 위 = 아들, 아래 = 딸 / 왼쪽부터 유년·청소년·청년
# 침대 각도(머리 오른쪽 위, 발 왼쪽 아래)로 그려져 있어 그대로 사용. 행동 시트의 잠자기 그림을 대체.
# 크기: 그림 폭 = 서 있을 때 키의 70% (침대 폭과 비슷)
SLEEP_SHEET = 'assets-src/sleep-sheet.png'
img_s = np.asarray(Image.open(SLEEP_SHEET).convert('RGB')).astype(np.int32)
sboxes = components((765 - img_s.sum(axis=2)) > 60, f=2, min_cells=40)
assert len(sboxes) == 6, f'{SLEEP_SHEET}: expected 6, found {len(sboxes)}'
sboxes.sort(key=lambda b: (int(((b[1] + b[3]) / 2) // (img_s.shape[0] / 2)), b[0]))
for (g, st), b in zip([(g, st) for g in ('SON', 'DAUGHTER') for st in STAGES], sboxes):
    target_w = sprites[f'{st}_{g}_stand'].shape[0] * 0.7
    blk = (b[2] - b[0]) / target_w
    blk *= cut(img_s, b, blk).shape[1] / target_w
    sprites[f'{st}_{g}_sleep'] = defringe(cut(img_s, b, blk))

# 반려묘 시트: [앉기, 걷기A, 걷기B, 기지개, 그루밍, 식빵 자세] — 모두 오른쪽을 봄 (왼쪽은 게임에서 좌우 반전)
# 크기: 식빵 자세의 폭 = 기존 잠자는 고양이(CAT_sleep) 폭
CAT_SHEET = 'assets-src/cat-sheet.png'
CAT_NAMES = ['CAT_sit', 'CAT_walk0', 'CAT_walk1', 'CAT_stretch', 'CAT_groom', 'CAT_loaf']
img_c = np.asarray(Image.open(CAT_SHEET).convert('RGB')).astype(np.int32)
cboxes = sorted(components((765 - img_c.sum(axis=2)) > 60), key=lambda b: b[0])
assert len(cboxes) == len(CAT_NAMES), f'{CAT_SHEET}: expected {len(CAT_NAMES)}, found {len(cboxes)}'
cat_w = sprites['CAT_sleep'].shape[1]
loaf_box = cboxes[CAT_NAMES.index('CAT_loaf')]
cblk = (loaf_box[2] - loaf_box[0]) / cat_w
cblk *= cut(img_c, loaf_box, cblk).shape[1] / cat_w
for n, b in zip(CAT_NAMES, cboxes):
    sprites[n] = cut(img_c, b, cblk)

# 손그림 걷기가 없는 캐릭터(딸, 부모님)는 서기 프레임에서 생성
for name in list(sprites):
    if name.endswith('_stand'):
        base = name[: -len('_stand')]
        if f'{base}_walk0' not in sprites:
            for i, wf in enumerate(walk_frames(sprites[name])):
                sprites[f'{base}_walk{i}'] = wf

# 뒷모습 색감 보정: Gemini 뒷모습 시트가 앞모습보다 어둡고 빨강이 빠져 녹회색으로 칙칙함.
# 앞뒤에 공통으로 보이는 머리카락(갈색) 평균색으로 채널별 비율을 구하고,
# 전체 밝기 차이도 절반만큼 보정해서 뒷모습 그림 전체에 곱한다.
def opaque_rgb(names_):
    return np.concatenate([sprites[n][sprites[n][..., 3] > 0][:, :3].astype(float) for n in names_])


def hair_mean(p_):
    sel = (p_[:, 0] > p_[:, 1]) & (p_[:, 1] > p_[:, 2]) & (p_[:, 0] < 170) & (p_[:, 0] > 60)
    return p_[sel].mean(axis=0)


for st in STAGES:
    for g in ('SON', 'DAUGHTER'):
        front_names = [f'{st}_{g}_stand'] + [n for n in sprites if n.startswith(f'{st}_{g}_walk')]
        fr = opaque_rgb(front_names)
        # 뒤 서기 / 뒤 걷기는 출처 시트가 다를 수 있어 따로 보정
        for group in ('back_stand', 'back_walk'):
            back_names = [n for n in sprites if n.startswith(f'{st}_{g}_{group}')]
            bk = opaque_rgb(back_names)
            gain = hair_mean(fr) / hair_mean(bk)
            lum = fr.mean() / (bk * gain).mean()
            gain *= float(np.clip(lum, 1.0, 1.25)) ** 0.5
            for n in back_names:
                spr = sprites[n].astype(float)
                spr[..., :3] = np.clip(spr[..., :3] * gain, 0, 255)
                sprites[n] = spr.astype(np.uint8)
            print(f'  뒷모습 색감 보정: {st}_{g}_{group} R×{gain[0]:.2f} G×{gain[1]:.2f} B×{gain[2]:.2f}')

# 직업 의상 시트 (청년, 3행 × 6열): Gemini가 직업마다 비슷한 그림 2장이나 관계없는 그림을 섞어 그려서
# 직업마다 가장 잘 맞는 칸(행, 열)을 골라 둠 → JOB_END_xx_{SON|DAUGHTER}
# 붙어 있는 그림이 있어 덩어리 대신 칸 단위로 자른다. 크기는 시트별로 청년 서기 키에 맞춤.
JOB_SHEETS = {
    'SON': [
        ('assets-src/job-son-1.png', {'01': (0, 0), '02': (0, 1), '03': (0, 2), '04': (1, 0), '05': (1, 1), '06': (1, 2), '07': (1, 5), '08': (2, 1), '09': (2, 5)}),
        ('assets-src/job-son-2.png', {'10': (0, 0), '11': (0, 1), '12': (0, 2), '13': (1, 0), '14': (1, 2), '15': (1, 4), '16': (2, 0), '17': (2, 2), '18': (2, 5)}),
        ('assets-src/job-son-3.png', {'19': (0, 0), '20': (0, 1), '21': (0, 2), '22': (1, 0), '23': (1, 1), '24': (1, 2), '25': (2, 0), '26': (2, 1), '27': (2, 5)}),
        ('assets-src/job-son-4.png', {'28': (0, 0), '29': (0, 1), '30': (0, 4), '31': (1, 1), '32': (1, 2), '33': (1, 3), '34': (2, 0), '35': (2, 2), '36': (2, 5)}),
        ('assets-src/job-son-5.png', {'37': (0, 0), '38': (0, 1), '39': (0, 2), '40': (1, 0), '41': (1, 2), '42': (1, 4), '43': (2, 0), '44': (2, 1), '45': (2, 3)}),
        ('assets-src/job-son-6.png', {'46': (0, 0), '47': (0, 1), '48': (0, 3), '49': (2, 0), '50': (2, 2)}),
    ],
    # 딸 시트는 한 줄에 7장인 줄이 있어서 (행, 그 줄의 몇 번째 그림)으로 고른다
    'DAUGHTER': [
        ('assets-src/job-daughter-1.png', {'01': (0, 0), '02': (0, 1), '03': (0, 2), '04': (1, 0), '05': (1, 1), '06': (1, 3), '07': (2, 0), '08': (2, 2), '09': (2, 5)}, 'comp'),
        ('assets-src/job-daughter-2.png', {'10': (0, 0), '11': (0, 1), '12': (0, 2), '13': (1, 0), '14': (1, 2), '15': (1, 5), '16': (2, 0), '17': (2, 2), '18': (2, 4)}, 'comp'),
        ('assets-src/job-daughter-3.png', {'19': (0, 0), '20': (0, 1), '21': (0, 2), '22': (1, 0), '23': (1, 1), '24': (1, 2), '25': (2, 0), '26': (2, 1), '27': (2, 4)}, 'comp'),
        ('assets-src/job-daughter-4.png', {'28': (0, 0), '29': (0, 1), '30': (0, 2), '31': (1, 0), '32': (1, 1), '33': (1, 3), '34': (2, 0), '35': (2, 2), '36': (2, 5)}, 'comp'),
        ('assets-src/job-daughter-5.png', {'37': (0, 0), '38': (0, 1), '39': (0, 2), '40': (1, 0), '41': (1, 1), '42': (1, 3), '43': (2, 0), '44': (2, 2), '45': (2, 5)}, 'comp'),
        ('assets-src/job-daughter-6.png', {'46': (0, 0), '47': (0, 1), '48': (0, 2), '49': (2, 0), '50': (2, 1)}, 'comp'),
    ],
}


def cell_box(img_, r, c, rows=3, cols=6):
    h_, w_ = img_.shape[:2]
    y0, y1 = int(r * h_ / rows), int((r + 1) * h_ / rows)
    x0, x1 = int(c * w_ / cols), int((c + 1) * w_ / cols)
    m = (765 - img_[y0:y1, x0:x1].sum(axis=2)) > 60
    ys_, xs_ = np.where(m)
    return (x0 + xs_.min(), y0 + ys_.min(), x0 + xs_.max() + 1, y0 + ys_.max() + 1)


def comp_rows(img_, rows=3):
    """그림 덩어리를 찾아 줄별로 왼쪽부터 정렬"""
    m = (765 - img_.sum(axis=2)) > 60
    out = {}
    H = img_.shape[0]
    boxes = []
    for b in components(m, f=2, min_cells=150):
        x0, y0, x1, y1 = b
        if y1 - y0 > H / rows * 1.5:
            # 위아래 그림이 붙어 한 덩어리가 되면 줄 경계 근처 가장 빈 가로줄에서 자른다
            prof = m[:, x0:x1].sum(axis=1)
            cuts = [y0]
            for k in range(1, rows):
                c = int(H * k / rows)
                if y0 < c < y1:
                    lo, hi = max(y0, c - H // 12), min(y1, c + H // 12)
                    cuts.append(lo + int(np.argmin(prof[lo:hi])))
            cuts.append(y1)
            for a, z in zip(cuts, cuts[1:]):
                ys_ = np.where(prof[a:z] > 0)[0]
                if len(ys_):
                    boxes.append((x0, a + ys_[0], x1, a + ys_[-1] + 1))
        else:
            boxes.append(b)
    for b in boxes:
        out.setdefault(int((b[1] + b[3]) / 2 / (img_.shape[0] / rows)), []).append(b)
    return {r: sorted(v) for r, v in out.items()}


def tight_box(img_, b):
    x0, y0, x1, y1 = b
    m = (765 - img_[y0:y1, x0:x1].sum(axis=2)) > 60
    ys_, xs_ = np.where(m)
    return (x0 + xs_.min(), y0 + ys_.min(), x0 + xs_.max() + 1, y0 + ys_.max() + 1)


for g, sheets_ in JOB_SHEETS.items():
    target_h = sprites[f'YOUTH_{g}_stand'].shape[0]
    for path, picks, *mode in sheets_:
        img_j = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
        if mode and mode[0] == 'comp':
            rows_j = comp_rows(img_j)
            boxes_j = {num: tight_box(img_j, rows_j[r][k]) for num, (r, k) in picks.items()}
        else:
            boxes_j = {num: cell_box(img_j, r, c) for num, (r, c) in picks.items()}
        # 시트 기준 축소 비율: 고른 그림들 키의 중앙값 = 청년 서기 키
        blk = float(np.median([b[3] - b[1] for b in boxes_j.values()])) / target_h
        for num, b in boxes_j.items():
            sprites[f'JOB_END_{num}_{g}'] = defringe(cut(img_j, b, blk))

# 엔딩 44번(도트 마스코트)은 v0.29.4에 삭제 → 직업 의상 그림도 아틀라스에서 뺀다
for g in ('SON', 'DAUGHTER'):
    sprites.pop(f'JOB_END_44_{g}', None)

# 활동 포즈 (v0.21): 나이대·성별마다 3×4 = 12동작 → {STAGE}_{G}_{동작}
# 스케줄 바깥 활동 장면에서 그 장소에 맞는 동작으로 쓴다 (빵 쟁반, 빗자루, 기타, 발차기 …)
ACT_KEYS = ['bake', 'sweep', 'guitar', 'dance', 'kick', 'experiment', 'pet', 'shopping', 'camp', 'arcade', 'explore', 'raise']
for g in ('SON', 'DAUGHTER'):
    for st in ('CHILD', 'TEEN', 'YOUTH'):
        path = f'assets-src/act-{st.lower()}-{g.lower()}.png'
        if not os.path.exists(path):
            continue
        img_a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
        rows_a = comp_rows(img_a)
        if [len(rows_a.get(r, [])) for r in range(3)] != [4, 4, 4]:
            print(f'  활동 포즈 칸 수가 맞지 않음: {path}', {r: len(v) for r, v in rows_a.items()})
            continue
        boxes_a = {ACT_KEYS[r * 4 + k]: tight_box(img_a, rows_a[r][k]) for r in range(3) for k in range(4)}
        # 서 있는 동작들 키의 중앙값 = 그 나이 서기 키
        tall = sorted(b[3] - b[1] for b in boxes_a.values())
        blk = float(np.median(tall[3:])) / sprites[f'{st}_{g}_stand'].shape[0]
        for key, b in boxes_a.items():
            sprites[f'{st}_{g}_{key}'] = defringe(cut(img_a, b, blk))
            # 장면 화면용 고해상도 원본 (폰 화면에서 흐려지지 않게)
            os.makedirs('src/assets/acts', exist_ok=True)
            if HI == 1:
                Image.fromarray(defringe(cut(img_a, b, 1.0))).save(f'src/assets/acts/{st}_{g}_{key}.webp', quality=90, method=6)
        print(f'  활동 포즈: {path} → 12동작')

# 상태(기분) 포즈 (v0.26): 나이대·성별마다 3×4 = 12동작 → {STAGE}_{G}_mood_{키}
# 아이 상태가 나쁠 때 방 안에서 서 있거나 걷는 모습 (src/engine/mood.ts 가 상황에 맞는 키를 고름)
MOOD_KEYS = ['sad', 'angry', 'cry', 'stressed', 'sulk', 'back_sulk', 'sick', 'phone', 'rebel', 'mope_walkA', 'mope_walkB', 'sigh']
for g in ('SON', 'DAUGHTER'):
    for st in ('CHILD', 'TEEN', 'YOUTH'):
        path = f'assets-src/mood-{st.lower()}-{g.lower()}.png'
        if not os.path.exists(path):
            continue
        img_m = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
        rows_m = comp_rows(img_m)
        if [len(rows_m.get(r, [])) for r in range(3)] != [4, 4, 4]:
            print('  상태 포즈 칸 수가 맞지 않음:', path, {r: len(v) for r, v in rows_m.items()})
            continue
        boxes_m = {MOOD_KEYS[r * 4 + k]: tight_box(img_m, rows_m[r][k]) for r in range(3) for k in range(4)}
        # 크기: 앉은 포즈(웅크리기)를 뺀 서 있는 포즈 키의 중앙값 = 그 단계 서기 키
        tall = [b[3] - b[1] for k, b in boxes_m.items() if k != 'sulk']
        blk = float(np.median(tall)) / sprites[f'{st}_{g}_stand'].shape[0]
        for key, b in boxes_m.items():
            sprites[f'{st}_{g}_mood_{key}'] = defringe(cut(img_m, b, blk))
        print(f'  상태 포즈: {path} → 12동작')

# 책상 없이 의자에만 앉은 공부 그림 (v0.34.3): 받으면 '책상 공부' 그림을 교체 → 방 책상 앞에 바로 앉힘
# 아직 교체되지 않은(그림 안에 책상이 있는) 프레임 목록은 src/render/deskSeat.json 으로 내보냄
DESK_IN_SPRITE = {'TEEN_DAUGHTER_desk', 'YOUTH_SON_desk', 'YOUTH_DAUGHTER_desk'}
for st, g in (('TEEN', 'DAUGHTER'), ('YOUTH', 'SON'), ('YOUTH', 'DAUGHTER')):
    path = f'assets-src/seat-{st.lower()}-{g.lower()}.png'
    if not os.path.exists(path) or f'{st}_{g}_stand' not in sprites:
        continue
    img_s = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    m = (765 - img_s.sum(axis=2)) > 60
    comps = components(m, f=2, min_cells=150)
    b = tight_box(img_s, max(comps, key=lambda c: (c[2] - c[0]) * (c[3] - c[1])))
    # 크기: 의자 포함 앉은 키 = 그 단계 서기 키의 88% (어린이 책상 공부 그림과 비슷하게)
    want = sprites[f'{st}_{g}_stand'].shape[0] * 0.88
    sprites[f'{st}_{g}_desk'] = defringe(cut(img_s, b, (b[3] - b[1]) / want))
    DESK_IN_SPRITE.discard(f'{st}_{g}_desk')
    print(f'  의자에 앉은 공부 그림: {path}')
json.dump(sorted(DESK_IN_SPRITE), open('src/render/deskSeat.json', 'w'))

# 행동 포즈 밝기 맞춤 (v0.34.2): Gemini 행동 시트가 서기 그림보다 어둡게 나옴(최대 -20%)
# 밝은 쪽 픽셀(피부·옷, 상위 30%)의 밝기를 그 단계 서기 그림에 맞춰 올린다 (어두운 머리카락 비율 차이에 휘둘리지 않게)
def _bright(spr):
    m = spr[..., 3] > 0
    lum = spr[..., :3][m].astype(float).mean(axis=1)
    return float(np.percentile(lum, 70)) if len(lum) else 0
for name in list(sprites):
    parts = name.split('_')
    if len(parts) != 3 or parts[2] not in ('desk', 'read', 'pc', 'draw', 'music', 'exercise', 'work', 'tired'):
        continue
    base = sprites.get(f'{parts[0]}_{parts[1]}_stand')
    if base is None:
        continue
    gain = min(1.5, max(1.0, _bright(base) / max(1, _bright(sprites[name]))))
    if gain > 1.02:
        spr = sprites[name].astype(float)
        spr[..., :3] = np.clip(spr[..., :3] * gain, 0, 255)
        sprites[name] = spr.astype(np.uint8)

# 침대에 누웠을 때 얼굴만 (v0.36.2): 누운 그림이 침대보다 커서 어색 → 이불 위로 머리만 빼꼼
# 누운 그림은 머리가 오른쪽 위 → x/w - y/h > c 인 쪽(오른쪽 위)만 남기고, 잘린 자리에 이불 주름 선
for name in [n for n in sprites if n.endswith('_sleep') and not n.startswith('CAT')]:
    spr = sprites[name].copy()
    h, w, _ = spr.shape
    yy, xx = np.mgrid[0:h, 0:w]
    keep = (xx / w - yy / h) > 0.1
    head = spr.copy()
    head[~keep] = 0
    # 잘린 경계(바로 바깥 한 줄)에 이불 가장자리 그림자
    edge = ((xx / w - yy / h) <= 0.1) & ((xx / w - yy / h) > 0.1 - 2.2 / w) & (spr[..., 3] > 0)
    head[edge] = [70, 40, 55, 150]
    ys, xs = np.where(head[..., 3] > 0)
    sprites[name.replace('_sleep', '_sleephead')] = head[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

# 부모님 캐릭터는 게임에서 사용하지 않음 (v0.5.17) → 아틀라스에서 제외
for n in [n for n in sprites if n.startswith('PARENT')]:
    del sprites[n]

# 걷기 그림 방향 통일: Gemini가 같은 걷기 동작 안에서도 일부 장을 반대 방향으로 그리는 경우가 있음
# (예: 딸 유년기 뒷모습 아랫줄 4장, 딸 청년 뒷모습 3번째 장) → 걷는 도중 고개가 휙 돌아가 보임.
# 첫 장을 기준으로, 각 장의 머리 부분이 '그대로'보다 '좌우 반전'이 더 닮았으면 반전한다.
def head_patch(spr, flip=False):
    s_ = spr[:, ::-1] if flip else spr
    a_ = s_[..., 3] > 0
    ys_ = np.where(a_.any(axis=1))[0]
    top, hh = ys_.min(), ys_.max() - ys_.min()
    hd = s_[top : top + int(hh * 0.45)].astype(float)
    xs_ = np.where((hd[..., 3] > 0).any(axis=0))[0]
    cx = int(round((xs_.min() + xs_.max()) / 2))
    out = np.zeros((hd.shape[0], 40, 4))
    for x in range(40):
        sx = cx - 20 + x
        if 0 <= sx < hd.shape[1]:
            out[:, x] = hd[:, sx]
    return out


def head_diff(p1, p2):
    h_ = min(p1.shape[0], p2.shape[0])
    p1, p2 = p1[:h_], p2[:h_]
    m1, m2 = p1[..., 3] > 0, p2[..., 3] > 0
    both = m1 & m2
    col = np.abs(p1[..., :3] - p2[..., :3]).sum(axis=2)[both].mean() / 765 if both.any() else 1
    return (m1 ^ m2).mean() + col


walk_sets = sorted({n.rsplit('_walk', 1)[0] for n in sprites if '_walk' in n and n.rsplit('_walk', 1)[1].isdigit()})
for base in walk_sets:
    ref = head_patch(sprites[f'{base}_walk0'])
    i = 1
    flipped = []
    while f'{base}_walk{i}' in sprites:
        spr = sprites[f'{base}_walk{i}']
        if head_diff(head_patch(spr, True), ref) < head_diff(head_patch(spr), ref) * 0.9:
            sprites[f'{base}_walk{i}'] = spr[:, ::-1].copy()
            flipped.append(i)
        i += 1
    if flipped:
        print(f'  방향 통일: {base} 걷기 {[f + 1 for f in flipped]}번째 장 좌우 반전')

names = list(sprites)
frames = [sprites[n] for n in names]
gap = 1
# 선반 배치 (고화질 시트는 WebP 최대 크기 안에 들도록 여러 줄로)
ROW_W = 10 ** 9 if HI == 1 else 4096
pos, x, y, rh = [], 0, 0, 0
for f in frames:
    h, w, _ = f.shape
    if x + w > ROW_W:
        x, y, rh = 0, y + rh + gap, 0
    pos.append((x, y))
    x += w + gap
    rh = max(rh, h)
aw = max(px + f.shape[1] for (px, _), f in zip(pos, frames))
ah = max(py + f.shape[0] for (_, py), f in zip(pos, frames))
atlas = np.zeros((ah, aw, 4), np.uint8)
meta = {}
for name, f, (x, y) in zip(names, frames, pos):
    h, w, _ = f.shape
    atlas[y : y + h, x : x + w] = f
    # 상체(위 60%) 중심 = 그리는 기준점. 보폭이 넓은 걷기 그림에서 몸이 좌우로 흔들리지 않게 한다
    _, oxs = np.where(f[: int(h * 0.6), :, 3] > 0)
    meta[name] = {'x': x, 'y': y, 'w': w, 'h': h, 'ax': round(float(oxs.mean()) + 0.5, 1)}
if HI == 1:
    Image.fromarray(atlas).save(OUT_PNG, optimize=True)
else:
    Image.fromarray(atlas).save(OUT_PNG, quality=92, method=6)
json.dump(meta, open(OUT_JSON, 'w'), indent=1)
print('atlas', atlas.shape, len(meta))
