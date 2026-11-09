"""창·장면(UI)용 아이 그림: 캐릭터 시트에서 원본 해상도 그대로 잘라 src/assets/portraits/{이름}.webp
게임용 시트(characters_hi)는 원본을 2배 도트로 줄인 것이라 창에 크게 띄우면 흐릿함 → 창에서는 이 그림을 쓴다.
실행: python3 scripts/build-portraits.py"""
import os
import numpy as np
from PIL import Image

src = open('scripts/build-sprites.py', encoding='utf-8').read()
ns = {'__name__': 'portraits'}
exec(src[:src.index('def walk_frames')], ns)

def thin_outline(a, passes=4, thr=75):
    """바깥 검은 테두리를 안쪽으로 깎아 얇게 (원본은 1도트 ≈ 6px 라 테두리가 12px 안팎 → 친구 그림처럼 얇게)"""
    a = np.pad(a, ((2, 2), (2, 2), (0, 0)))  # 그림 끝에 붙은 테두리도 깎이도록 투명 여백
    for _ in range(passes):
        op = a[..., 3] > 0
        edge = np.zeros_like(op)
        edge[1:] |= ~op[:-1]; edge[:-1] |= ~op[1:]; edge[:, 1:] |= ~op[:, :-1]; edge[:, :-1] |= ~op[:, 1:]
        lum = a[..., :3].astype(int).mean(-1)
        a[op & edge & (lum < thr), 3] = 0
    # 깎고 남은 외톨이 점 정리 (주변 3x3 에 불투명이 2개 이하)
    for _ in range(2):
        op = (a[..., 3] > 0).astype(int)
        n = sum(np.roll(np.roll(op, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        a[(op == 1) & (n <= 3), 3] = 0
    ys, xs = np.where(a[..., 3] > 0)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    # 머리 꼭대기에 두껍게 남은 검은 줄 (원본 시트 칸 경계에 붙어 있던 테두리) 걷어 내기
    while a.shape[0] > 10:
        row = a[0]
        op = row[:, 3] > 0
        if op.sum() and (row[op, :3].astype(int).mean(-1) < thr).mean() > 0.7:
            a = a[1:]
        else:
            break
    return a


os.makedirs('src/assets/portraits', exist_ok=True)
frames, img, boxes = ns['load_sheet'](ns['SRC'], ns['NAMES'])
for name in ns['NAMES']:
    if name.startswith(('CAT', 'PARENT')):
        continue
    a = thin_outline(ns['cut'](img, boxes[name], 1.0))  # 원본 1:1, 테두리만 얇게
    out = f'src/assets/portraits/{name}.webp'
    Image.fromarray(a).save(out, 'WEBP', quality=92, alpha_quality=100)
    print(out, a.shape[1], a.shape[0], os.path.getsize(out))
