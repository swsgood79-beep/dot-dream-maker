/** 장면 배경의 빛(평균 색)을 읽어 캐릭터에 입혀, 배경 위에 붙여 넣은 느낌을 줄인다 */
export type Light = { tint: [number, number, number]; shadow: string; glow: string };

const lightCache = new Map<string, Light>();
const litCache = new Map<string, string>();

export function readLight(url: string, cb: (l: Light) => void): void {
  const hit = lightCache.get(url);
  if (hit) return cb(hit);
  const img = new Image();
  img.onload = () => {
    const w = 24, h = 24;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    // 전체 평균(주변광) + 아랫부분 평균(바닥색 → 그림자)
    let r = 0, g = 0, b = 0, fr = 0, fg = 0, fb = 0, n = 0, fn = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
        if (y > h * 0.7) { fr += d[i]; fg += d[i + 1]; fb += d[i + 2]; fn++; }
      }
    r /= n; g /= n; b /= n; fr /= fn; fg /= fn; fb /= fn;
    // 밝기는 빼고 색감만: 가장 밝은 채널을 255로 맞춘 색을 흰색과 섞는다
    const m = Math.max(r, g, b, 1);
    const tint: [number, number, number] = [r / m, g / m, b / m].map((c) => Math.round(255 * (0.62 + 0.38 * c))) as [number, number, number];
    const dark = (c: number) => Math.round(c * 0.35);
    const l: Light = {
      tint,
      shadow: `rgba(${dark(fr)},${dark(fg)},${dark(fb)},0.55)`,
      glow: `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0.55)`,
    };
    lightCache.set(url, l);
    cb(l);
  };
  img.src = url;
}

/** 스프라이트 그림(data URL)에 주변광 색을 곱해서 새 그림을 만든다 */
export function litSprite(src: string, l: Light, cb: (url: string) => void): void {
  const key = src.length + ':' + src.slice(-40) + l.tint.join(',');
  const hit = litCache.get(key);
  if (hit) return cb(hit);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    // 위쪽은 덜, 아래쪽(발치)은 조금 더 어둡게 — 위에서 비추는 조명
    const gr = ctx.createLinearGradient(0, 0, 0, img.height);
    const [r, g, b] = l.tint;
    gr.addColorStop(0, `rgb(${r},${g},${b})`);
    gr.addColorStop(1, `rgb(${Math.round(r * 0.86)},${Math.round(g * 0.86)},${Math.round(b * 0.86)})`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);
    const url = cv.toDataURL();
    litCache.set(key, url);
    cb(url);
  };
  img.src = src;
}
