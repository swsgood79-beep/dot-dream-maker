import atlasUrl from '../assets/furniture.png';
import atlas from './furnitureAtlas.json';
import type { PlacedFurniture } from '../types/game';
import { footprint } from '../engine/room';
import { RES, SHEET } from './spriteCharacter';

/**
 * 손그림 가구 스프라이트 (assets-src/furniture-*.png → scripts/build-furniture.py → src/assets/furniture.png).
 * 스프라이트가 있는 가구는 코드 모델 대신 이 그림을 그린다. 시트 1도트 = 캔버스 백버퍼 1px.
 */
type Frame = { x: number; y: number; w: number; h: number; face: 'L' | 'R' };
const FRAMES = atlas as Record<string, Frame>;

let img: HTMLImageElement | null = null;
let ready = false;
const listeners = new Set<() => void>();

function load() {
  if (typeof Image === 'undefined') return null;
  if (!img) {
    img = new Image();
    img.onload = () => {
      ready = true;
      listeners.forEach((fn) => fn());
    };
    img.src = atlasUrl;
  }
  return img;
}

export function onFurnitureSheetReady(fn: () => void): () => void {
  load();
  if (ready) fn();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function hasFurnitureSprite(id: string): boolean {
  return !!FRAMES[id];
}

/** 화면 위 높이 (논리 px) — 탭 판정/반짝이 위치용 */
export function furnitureSpriteHeight(id: string): number | null {
  const f = FRAMES[id];
  return f ? f.h / SHEET : null;
}

type Proj = (x: number, y: number) => [number, number];

/** 가구 스프라이트를 바닥 칸 위에 세운다. 그리지 못하면 false (호출측이 코드 모델로 대체) */
export function drawFurnitureSprite(
  ctx: CanvasRenderingContext2D,
  proj: Proj,
  p: Pick<PlacedFurniture, 'furnitureId' | 'gridX' | 'gridY' | 'rotation'>,
  alpha = 1,
): boolean {
  const f = FRAMES[p.furnitureId];
  const sheet = load();
  if (!f || !sheet || !ready) return false;
  const cells = footprint(p);
  const x0 = Math.min(...cells.map((c) => c.x));
  const y0 = Math.min(...cells.map((c) => c.y));
  const x1 = Math.max(...cells.map((c) => c.x)) + 1;
  const y1 = Math.max(...cells.map((c) => c.y)) + 1;
  const [cx, cy] = proj((x0 + x1) / 2, (y0 + y1) / 2);
  const [, frontY] = proj(x1, y1);
  // 밑면이 칸 중앙보다 조금 앞쪽에 닿도록
  const baseY = cy + (frontY - cy) * 0.7;
  const w = f.w / SHEET;
  const h = f.h / SHEET;
  const want = p.rotation === 90 || p.rotation === 270 ? 'R' : 'L';
  const flip = want !== f.face;
  const x = Math.round((cx - w / 2) * RES) / RES;
  const y = Math.round((baseY - h) * RES) / RES;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  // 바닥 그림자
  ctx.fillStyle = 'rgba(60,30,10,0.16)';
  ctx.beginPath();
  ctx.ellipse(cx + 1, baseY - 1, w * 0.42, Math.max(3, w * 0.18), 0, 0, Math.PI * 2);
  ctx.fill();
  if (flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, w, h);
  } else {
    ctx.drawImage(sheet, f.x, f.y, f.w, f.h, x, y, w, h);
  }
  ctx.restore();
  return true;
}

const urlCache = new Map<string, string>();
/** 상점/창고 목록 아이콘용 dataURL (시트 로딩 전이면 '') */
export function furnitureSpriteUrl(id: string): string {
  const hit = urlCache.get(id);
  if (hit) return hit;
  const f = FRAMES[id];
  const sheet = load();
  if (!f || !sheet || !ready || typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = f.w;
  cv.height = f.h;
  const c = cv.getContext('2d');
  if (!c) return '';
  if (f.face === 'R') {
    c.translate(f.w, 0);
    c.scale(-1, 1);
  }
  c.drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  const url = cv.toDataURL();
  urlCache.set(id, url);
  return url;
}

/** 손그림 가구가 좌우 반전되어 그려지는지 (회전에 따른 정면 방향 vs 원본 방향) */
export function furnitureFlipped(p: Pick<PlacedFurniture, 'furnitureId' | 'rotation'>): boolean {
  const f = FRAMES[p.furnitureId];
  if (!f) return p.rotation === 90 || p.rotation === 270;
  const want = p.rotation === 90 || p.rotation === 270 ? 'R' : 'L';
  return want !== f.face;
}
