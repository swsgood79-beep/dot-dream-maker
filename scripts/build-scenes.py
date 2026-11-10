"""연출 장소 배경 (assets-src/scene-s1~s7.png, 2×2 패널) → src/assets/scenes/{행동ID}.webp
실행: python3 scripts/build-scenes.py
패널은 흰 여백으로 나뉘어 있으므로 사분면마다 흰색이 아닌 영역의 테두리를 찾아 자르고, 외곽선 몇 픽셀을 안쪽으로 깎는다."""
import os
import numpy as np
from PIL import Image, ImageEnhance

# 밝기 보정: 원본이 전체적으로 어두워서 중간 톤을 끌어올림 (감마 0.8, 하이라이트는 거의 그대로) + 채도 살짝
_LUT = [round(255 * (i / 255) ** 0.8) for i in range(256)] * 3


def brighten(im):
    return ImageEnhance.Color(im.convert('RGB').point(_LUT)).enhance(1.06)

SHEETS = {
    's1': ['EDU_01', 'EDU_02', 'EDU_03', 'EDU_04'],
    's2': ['EDU_05', 'EDU_06', 'EDU_07', 'EDU_08'],
    's3': ['JOB_01', 'JOB_02', 'JOB_03', 'JOB_04'],
    's4': ['JOB_05', 'JOB_06', 'JOB_07', 'JOB_08'],
    's5': ['REST_01', 'REST_02', 'OUT_SHOP', 'OUT_BOOK'],
    's6': ['OUT_SCI', 'OUT_ARCADE', 'OUT_RUINS', 'OUT_ALLEY'],
    's7': ['RUNAWAY', 'CONTEST_SPORTS', 'CONTEST_ARTFEST', 'CONTEST_EXAM'],
    # 관찰 카메라 (v0.27): 이상행동 장면 + 화해 장면
    's8': ['REC_STRIKE', 'REC_LOCKED', 'REC_DELINQ', 'REC_SILENT'],
    's9': ['REC_COLD', 'REC_DOOR', 'REC_WARM', 'REC_LETTER'],
    # 비어 있던 화면 배경 (v0.39, docs/bg2_requests.xlsx): assets-src/scene-bg2-N.png
    'bg2-1': ['SP_SEOLLAL', 'SP_KITE', 'SP_PICNIC', 'SP_FIREFLY'],
    'bg2-2': ['SP_BLACKOUT', 'SP_SHOOTING_STAR', 'SP_CHUSEOK', 'SP_HALLOWEEN'],
    'bg2-3': ['SP_FIRST_SNOW', 'SP_GIMBAP', 'SP_MOVIE_NIGHT', 'SP_CLEANUP'],
    'bg2-4': ['SP_FLEA_MARKET', 'SP_TICKETING', 'SP_RAMEN', 'SP_PHOTO_BOOTH'],
    'bg2-5': ['SP_DRIVE', 'SP_SECRET_VISIT', 'SP_TOOTH', 'SP_FRIEND_VISIT'],
    'bg2-6': ['SP_STRAY_DOG', 'EMO_MART', 'EMO_ROOM', 'EMO_LIVING'],
    'bg2-7': ['EMO_CAR', 'EMO_ENTRY', 'EMO_SOFA', 'CS_SCHOOL'],
    'bg2-8': ['CS_PUBERTY', 'CS_MIDDLE', 'CS_GROWN', 'CS_SENIOR'],
    'bg2-9': ['PT_BDAY', 'PT_HOMEWORK', 'PT_LUNCH', 'PT_REPORT'],
}
OUT = 'src/assets/scenes'
W = 1000  # 이보다 크면 줄임 (원본 해상도 유지)


def span(v, frac):
    idx = np.where(v > frac)[0]
    return (idx.min(), idx.max() + 1) if len(idx) else None


def trim_blank(a):
    """패널 안에 남은 흰 빈칸·테두리 줄을 위아래에서 걷어 냄 (그림이 패널을 다 채우지 못한 경우)"""
    def bad(row):
        m = row.mean(axis=-1)
        return (m > 235).mean() > 0.6
    t, b = 0, a.shape[0]
    while t < b - 10 and bad(a[t]):
        t += 1
    while b > t + 10 and bad(a[b - 1]):
        b -= 1
    # 흰 칸과 그림 사이 테두리 선 몇 줄 더
    if t > 0:
        t += 3
    if b < a.shape[0]:
        b -= 3
    return a[t:b]


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
        crop = Image.fromarray(trim_blank(img[box[1]:box[3], box[0]:box[2]]).astype(np.uint8))
        if crop.width > W:  # 원본 해상도 유지 (폰 화면은 2~3배 밀도라 줄이면 흐려짐)
            crop = crop.resize((W, round(crop.height * W / crop.width)), Image.LANCZOS)
        crop = brighten(crop)
        crop.save(f'{OUT}/{gid}.webp', quality=88, method=6)
        print(f'  {sid} → {gid}: {box[2] - box[0]}×{box[3] - box[1]} → {crop.size}')
