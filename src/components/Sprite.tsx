import { useEffect, useState } from 'react';
import { onSheetReady, spriteUrl } from '../render/spriteCharacter';
import { litSprite, type Light } from '../render/sceneLight';
import atlas from '../render/characterAtlas.json';

/** 스프라이트 시트의 한 프레임을 도트 그대로 표시 (light가 있으면 장면 조명 색을 입힘) */
export function Sprite({ name, scale = 1, className = '', light }: { name: string; scale?: number; className?: string; light?: Light | null }) {
  const [url, setUrl] = useState(() => spriteUrl(name));
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
      {src && <img src={src} alt="" style={{ width: f.w * scale, height: f.h * scale, imageRendering: 'pixelated' }} />}
    </span>
  );
}
