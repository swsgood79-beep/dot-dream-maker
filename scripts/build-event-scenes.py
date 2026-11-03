"""이벤트 장면 시트 (assets-src/events/event-e01~e21.png, 2×2 패널, 마지막 장은 1패널)
→ src/assets/events/{이벤트ID}_{SON|DAUGHTER}.jpg
실행: python3 scripts/build-event-scenes.py SON   (딸 시트는 assets-src/events-daughter/ 에 두고 DAUGHTER)
칸 순서는 scripts/make-event-scene-requests.py 의 장면 목록 순서 그대로."""
import os, re, sys
import numpy as np
from PIL import Image

GENDER = sys.argv[1] if len(sys.argv) > 1 else 'SON'
SRC = 'assets-src/events' if GENDER == 'SON' else 'assets-src/events-daughter'
OUT = 'src/assets/events'
W = 400

ids = re.findall(r"^ \('([A-Z0-9_]+)','", open('scripts/make-event-scene-requests.py', encoding='utf-8').read(), re.M)
assert len(ids) == 81, len(ids)
chunks = [ids[i:i + 4] for i in range(0, len(ids), 4)]


def span(v, frac):
    idx = np.where(v > frac)[0]
    return (idx.min(), idx.max() + 1) if len(idx) else None


def cut(img, y0, y1, x0, x1, frac=0.6):
    sub = ((765 - img[y0:y1, x0:x1].sum(axis=2)) > 45)
    ys, xs = span(sub.mean(axis=1), frac), span(sub.mean(axis=0), frac)
    if not ys or not xs:
        return None
    inset = 5
    return (x0 + xs[0] + inset, y0 + ys[0] + inset, x0 + xs[1] - inset, y0 + ys[1] - inset)


os.makedirs(OUT, exist_ok=True)
done = 0
for n, chunk in enumerate(chunks, 1):
    path = f'{SRC}/event-e{n:02d}.png'
    if not os.path.exists(path):
        print('  없음:', path)
        continue
    img = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    h, w = img.shape[:2]
    boxes = [cut(img, 0, h, 0, w, 0.25)] if len(chunk) == 1 else [cut(img, (q // 2) * h // 2, (q // 2 + 1) * h // 2, (q % 2) * w // 2, (q % 2 + 1) * w // 2) for q in range(4)]
    for gid, box in zip(chunk, boxes):
        if not box:
            print('  패널을 못 찾음:', n, gid)
            continue
        crop = Image.fromarray(img[box[1]:box[3], box[0]:box[2]].astype(np.uint8))
        crop = crop.resize((W, round(crop.height * W / crop.width)), Image.LANCZOS)
        crop.save(f'{OUT}/{gid}_{GENDER}.jpg', quality=85, optimize=True)
        done += 1
print(f'{done} scenes → {OUT} ({GENDER})')
