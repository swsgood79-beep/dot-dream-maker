"""연출 장소 배경 (assets-src/scene-s1~s7.png, 2×2 패널) → src/assets/scenes/{행동ID}.webp
실행: python3 scripts/build-scenes.py
패널은 흰 여백으로 나뉘어 있으므로 사분면마다 흰색이 아닌 영역의 테두리를 찾아 자르고, 외곽선 몇 픽셀을 안쪽으로 깎는다."""
import os
import numpy as np
from PIL import Image

SHEETS = {
    's1': ['EDU_01', 'EDU_02', 'EDU_03', 'EDU_04'],
    's2': ['EDU_05', 'EDU_06', 'EDU_07', 'EDU_08'],
    's3': ['JOB_01', 'JOB_02', 'JOB_03', 'JOB_04'],
    's4': ['JOB_05', 'JOB_06', 'JOB_07', 'JOB_08'],
    's5': ['REST_01', 'REST_02', 'OUT_SHOP', 'OUT_BOOK'],
    's6': ['OUT_SCI', 'OUT_ARCADE', 'OUT_RUINS', 'OUT_ALLEY'],
    's7': ['RUNAWAY', 'CONTEST_SPORTS', 'CONTEST_ARTFEST', 'CONTEST_EXAM'],
}
OUT = 'src/assets/scenes'
W = 1000  # 이보다 크면 줄임 (원본 해상도 유지)


def span(v, frac):
    idx = np.where(v > frac)[0]
    return (idx.min(), idx.max() + 1) if len(idx) else None


os.makedirs(OUT, exist_ok=True)
for sid, ids in SHEETS.items():
    path = f'assets-src/scene-{sid}.png'
    if not os.path.exists(path):
        continue
    img = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    h, w = img.shape[:2]
    ink = (765 - img.sum(axis=2)) > 45  # 흰색이 아닌 곳
    for q, gid in enumerate(ids):
        r, c = divmod(q, 2)
        y0, y1 = r * h // 2, (r + 1) * h // 2
        x0, x1 = c * w // 2, (c + 1) * w // 2
        sub = ink[y0:y1, x0:x1]
        ys = span(sub.mean(axis=1), 0.6)
        xs = span(sub.mean(axis=0), 0.6)
        if not ys or not xs:
            print('  패널을 못 찾음:', sid, gid)
            continue
        inset = 6
        box = (x0 + xs[0] + inset, y0 + ys[0] + inset, x0 + xs[1] - inset, y0 + ys[1] - inset)
        crop = Image.fromarray(img[box[1]:box[3], box[0]:box[2]].astype(np.uint8))
        if crop.width > W:  # 원본 해상도 유지 (폰 화면은 2~3배 밀도라 줄이면 흐려짐)
            crop = crop.resize((W, round(crop.height * W / crop.width)), Image.LANCZOS)
        crop.save(f'{OUT}/{gid}.webp', quality=88, method=6)
        print(f'  {sid} → {gid}: {box[2] - box[0]}×{box[3] - box[1]} → {crop.size}')
