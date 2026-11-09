"""창·장면(UI)용 아이 그림: 캐릭터 시트에서 원본 해상도 그대로 잘라 src/assets/portraits/{이름}.webp
게임용 시트(characters_hi)는 원본을 2배 도트로 줄인 것이라 창에 크게 띄우면 흐릿함 → 창에서는 이 그림을 쓴다.
실행: python3 scripts/build-portraits.py"""
import os
import numpy as np
from PIL import Image

src = open('scripts/build-sprites.py', encoding='utf-8').read()
ns = {'__name__': 'portraits'}
exec(src[:src.index('def walk_frames')], ns)

os.makedirs('src/assets/portraits', exist_ok=True)
frames, img, boxes = ns['load_sheet'](ns['SRC'], ns['NAMES'])
for name in ns['NAMES']:
    if name.startswith(('CAT', 'PARENT')):
        continue
    a = ns['cut'](img, boxes[name], 1.0)  # 원본 1:1
    out = f'src/assets/portraits/{name}.webp'
    Image.fromarray(a).save(out, 'WEBP', quality=92, alpha_quality=100)
    print(out, a.shape[1], a.shape[0], os.path.getsize(out))
