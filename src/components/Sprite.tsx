import { useEffect, useState } from 'react';
import { onSheetReady, spriteUrl } from '../render/spriteCharacter';
import atlas from '../render/characterAtlas.json';

/** 스프라이트 시트의 한 프레임을 도트 그대로 표시 */
export function Sprite({ name, scale = 1, className = '' }: { name: string; scale?: number; className?: string }) {
  const [url, setUrl] = useState(() => spriteUrl(name));
  useEffect(() => onSheetReady(() => setUrl(spriteUrl(name))), [name]);
  const f = (atlas as Record<string, { w: number; h: number }>)[name];
  if (!f) return null;
  return (
    <span className={`inline-block shrink-0 ${className}`} style={{ width: f.w * scale, height: f.h * scale }}>
      {url && <img src={url} alt="" style={{ width: f.w * scale, height: f.h * scale, imageRendering: 'pixelated' }} />}
    </span>
  );
}
