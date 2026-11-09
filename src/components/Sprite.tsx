import { useEffect, useState } from 'react';
import { onSheetReady, spriteUrl } from '../render/spriteCharacter';
import { litSprite, type Light } from '../render/sceneLight';
import atlas from '../render/characterAtlas.json';

/** 창·장면용 원본 해상도 아이 그림 (scripts/build-portraits.py) — 있으면 게임용 축소 그림 대신 이걸로 선명하게 */
const PORTRAITS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/portraits/*.webp', { eager: true, import: 'default' }) as Record<string, string>).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]),
);

/** 스프라이트 시트의 한 프레임을 도트 그대로 표시 (light가 있으면 장면 조명 색을 입힘)
 * 그림은 2배 고화질 시트에서 오므로, 2배보다 작게(scale < 2) 보일 때는 부드럽게 줄인다
 * (도트 그대로 줄이면 픽셀이 들쭉날쭉 빠져 뭉개져 보임) */
export function Sprite({ name, scale = 1, className = '', light, hiSrc }: { name: string; scale?: number; className?: string; light?: Light | null; hiSrc?: string }) {
  const [atlasUrl, setUrl] = useState(() => spriteUrl(name));
  // hiSrc: 같은 그림의 고해상도 원본이 있으면 그걸 같은 크기로 표시 (폰 고밀도 화면에서 선명)
  const big = hiSrc || PORTRAITS[name];
  const url = big || atlasUrl;
  const [lit, setLit] = useState('');
  useEffect(() => onSheetReady(() => setUrl(spriteUrl(name))), [name]);
  useEffect(() => {
    setLit('');
    if (!url || !light) return;
    let alive = true;
    litSprite(url, light, (u) => alive && setLit(u));
    return () => {
      alive = false;
    };
  }, [url, light]);
  const f = (atlas as Record<string, { w: number; h: number }>)[name];
  if (!f) return null;
  const src = light ? lit || url : url;
  return (
    <span className={`inline-block shrink-0 ${className}`} style={{ width: f.w * scale, height: f.h * scale }}>
      {src && (
        <img
          src={src}
          alt=""
          style={{ width: f.w * scale, height: f.h * scale, objectFit: big ? 'contain' : undefined, objectPosition: 'bottom', imageRendering: big || scale < 2 ? 'auto' : 'pixelated' }}
        />
      )}
    </span>
  );
}
