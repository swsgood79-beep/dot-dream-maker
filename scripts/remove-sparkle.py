"""Gemini 그림 구석의 반투명 반짝이(✦) 워터마크 지우기
사용: python3 scripts/remove-sparkle.py 원본.png 결과.png 중심x 중심y [반경] [옮길x 옮길y]
(옮길x·y 를 주면: 바닥·벽처럼 무늬가 단순한 곳은 그만큼 떨어진 옆자리 무늬를 별 모양대로 옮겨 덮음 — 가장 깔끔)
반짝이 바깥 픽셀로 안쪽 색을 매끈하게 추정 → 그 차이로 흰색 덮개의 투명도를 구해 거꾸로 풀어냄 (무늬는 살아 있음)"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst, cx, cy = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
R = int(sys.argv[5]) if len(sys.argv) > 5 else 34
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(float)
x0, y0, x1, y1 = cx - R - 12, cy - R - 12, cx + R + 12, cy + R + 12
reg = a[y0:y1, x0:x1].copy()
Y, X = np.mgrid[y0:y1, x0:x1]
mask = (np.abs(X - cx) + np.abs(Y - cy)) < R
fill = reg.copy()
fill[mask] = reg[~mask].mean(0)
for _ in range(1500):
    f2 = fill.copy()
    f2[1:-1, 1:-1] = (fill[:-2, 1:-1] + fill[2:, 1:-1] + fill[1:-1, :-2] + fill[1:-1, 2:]) / 4
    fill[mask] = f2[mask]
al0 = ((reg - fill) / np.maximum(255 - fill, 1)).min(-1)
al0 = np.where(mask, np.clip(al0, 0, 0.7), 0)
alim = Image.fromarray((al0 * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
al = np.asarray(alim).astype(float) / 255 * mask
# 별 안쪽(가장자리 한 겹 제외)만 투명도 바닥값을 깔아 얼룩을 줄임 — 가장자리는 추정값 그대로 (선이 남지 않게)
inside = np.asarray(Image.fromarray(((al > 0.08) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) > 0
al = np.where(inside, np.maximum(al, 0.22), al)
out = np.clip((reg - al[..., None] * 255) / (1 - al[..., None]), 0, 255)
if len(sys.argv) > 7:
    dx, dy = int(sys.argv[6]), int(sys.argv[7])
    shifted = a[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
    m = np.asarray(Image.fromarray(((al0 > 0.03) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)[..., None] / 255
    out = reg * (1 - m) + shifted * m
a[y0:y1, x0:x1] = out
Image.fromarray(a.astype(np.uint8)).save(dst)
print('removed sparkle at', cx, cy)
