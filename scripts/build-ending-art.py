"""직업 엔딩 일러스트
  ① assets-src/ending-art/END_xx.png (2×2: 아들 밝음·지침 / 딸 밝음·지침)
  ② assets-src/ending-art/panels/END_xx_{son|daughter}_{bright|dark}.png (한 장씩) — ①보다 우선
→ public/endings/END_xx_{SON|DAUGHTER}_{BRIGHT|DARK}.webp (게임 옆 파일) + src/render/endingArtManifest.json
실행: python3 scripts/build-ending-art.py   (요청서: docs/ending_art_requests.xlsx)
칸 자르기·테두리 정리·밝기 보정은 build-event-hd.py 와 같은 방식."""
import glob, json, os
import numpy as np
from PIL import Image

src = open('scripts/build-event-hd.py', encoding='utf-8').read()
ns = {}
exec(src[src.index('from PIL import'):src.index('def sources(')].replace("IDS = re.findall", "IDS = [''] * 81 or re.findall").replace('assert len(IDS) == 81, len(IDS)', ''), ns)
trim, panel, brighten = ns['trim'], ns['panel'], ns['brighten']

OUT = 'public/endings'
os.makedirs(OUT, exist_ok=True)
CELLS = [('SON', 'BRIGHT'), ('SON', 'DARK'), ('DAUGHTER', 'BRIGHT'), ('DAUGHTER', 'DARK')]
keys = []
for f in sorted(glob.glob('assets-src/ending-art/END_*.png')):
    eid = os.path.basename(f)[:-4]
    img = np.asarray(Image.open(f).convert('RGB'))
    h, w = img.shape[:2]
    for q, (g, mood) in enumerate(CELLS):
        arr = panel(img, (q // 2) * h // 2, (q // 2 + 1) * h // 2, (q % 2) * w // 2, (q % 2 + 1) * w // 2)
        if arr is None:
            print('  칸을 못 찾음:', f, q)
            continue
        im = brighten(Image.fromarray(trim(arr)))
        if im.width > 1100:
            im = im.resize((1100, round(im.height * 1100 / im.width)), Image.LANCZOS)
        im.save(f'{OUT}/{eid}_{g}_{mood}.webp', quality=84, method=6)
        keys.append(f'{eid}_{g}_{mood}')
import re
for f in sorted(glob.glob('assets-src/ending-art/panels/END_*.png')):
    m = re.match(r'(END_\d\d)_(son|daughter)_(bright|dark)\.png$', os.path.basename(f), re.I)
    if not m:
        print('  이름 형식이 다름:', f)
        continue
    eid, g, mood = m.group(1), m.group(2).upper(), m.group(3).upper()
    im = brighten(Image.fromarray(trim(np.asarray(Image.open(f).convert('RGB')))))
    if im.width > 1100:
        im = im.resize((1100, round(im.height * 1100 / im.width)), Image.LANCZOS)
    im.save(f'{OUT}/{eid}_{g}_{mood}.webp', quality=86, method=6)
    if f'{eid}_{g}_{mood}' not in keys:
        keys.append(f'{eid}_{g}_{mood}')
json.dump(sorted(keys), open('src/render/endingArtManifest.json', 'w'), indent=0)
print(len(keys), 'illustrations →', OUT)
