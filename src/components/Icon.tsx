import iconsUrl from '../assets/icons.png';
import atlas from '../render/iconAtlas.json';

/** UI 도트 아이콘 (assets-src/ui-icons.jpg → scripts/build-icons.py) */
export type IconName = keyof typeof atlas.icons;

const CELL = atlas.cell;
const SHEET_W = atlas.cols * CELL;
const SHEET_H = atlas.rows * CELL;

export function Icon({ name, size = 18, className = '', title }: { name: IconName | string; size?: number; className?: string; title?: string }) {
  const pos = (atlas.icons as Record<string, { x: number; y: number }>)[name];
  if (!pos) return null;
  const s = size / CELL;
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${iconsUrl})`,
        backgroundSize: `${SHEET_W * s}px ${SHEET_H * s}px`,
        backgroundPosition: `-${pos.x * s}px -${pos.y * s}px`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
