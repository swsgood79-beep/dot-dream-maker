import atlasUrl from '../assets/characters.png';
import atlas from './characterAtlas.json';
import type { Gender, GrowthStage } from '../types/game';
import { drawCharacterProcedural, proceduralHeight, type CharacterDrawOpts } from './character';

/**
 * 스프라이트 시트(assets-src/character-sheet.png → src/assets/characters.png) 기반 캐릭터 렌더링.
 * 프레임: {단계}_{성별}_{stand|read|cheer}, CAT_sleep, PARENT_stand
 * 시트 1도트 = 캔버스 백버퍼 1px (RES=2) → 논리 좌표에서는 1/RES 크기로 그린다.
 */
export const RES = 2;

type Frame = { x: number; y: number; w: number; h: number; ax?: number };
const FRAMES = atlas as Record<string, Frame>;

let img: HTMLImageElement | null = null;
let ready = false;
const listeners = new Set<() => void>();

export function loadSheet(): HTMLImageElement | null {
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

export function onSheetReady(fn: () => void): () => void {
  loadSheet();
  if (ready) fn();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function frameName(stage: GrowthStage, gender: Gender, kind: string): string {
  const name = `${stage}_${gender}_${kind}`;
  return FRAMES[name] ? name : `${stage}_${gender}_stand`; // 프레임이 없으면 서기로 대체
}

export function characterHeight(stage: GrowthStage, gender: Gender = 'SON'): number {
  const f = FRAMES[frameName(stage, gender, 'stand')];
  return f ? f.h / RES : proceduralHeight(stage);
}

/** 프레임을 (fx, fy) = 발 중앙 기준으로 그린다 */
export function drawFrame(ctx: CanvasRenderingContext2D, name: string, fx: number, fy: number, flip = false, alpha = 1) {
  const f = FRAMES[name];
  const sheet = loadSheet();
  if (!f || !sheet || !ready) return false;
  const w = f.w / RES;
  const h = f.h / RES;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  // 백버퍼 픽셀 격자에 맞춰 반올림 → 도트가 흐려지지 않음
  // 기준점: 상체 중심(ax). 좌우 반전 시 반대쪽에서 잰다
  const ax = (f.ax ?? f.w / 2) / RES;
  const x = Math.round((fx - (flip ? w - ax : ax)) * RES) / RES;
  const y = Math.round((fy - h) * RES) / RES;
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

export function drawCharacter(ctx: CanvasRenderingContext2D, fx: number, fy: number, o: CharacterDrawOpts) {
  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.22 * (o.alpha ?? 1);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(fx, fy - 1, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  let kind = 'stand';
  let dy = 0;
  const t = o.time;
  const has = (k: string) => !!FRAMES[`${o.stage}_${o.gender}_${k}`];
  switch (o.pose) {
    case 'walk': {
      // 걷기 4프레임 사이클 (왼발 → 교차 → 오른발 → 교차). 방 안쪽으로 걸으면 뒷모습 사이클
      const walk = (o.back && walkFrame(`${o.stage}_${o.gender}_back`, t)) || walkFrame(`${o.stage}_${o.gender}`, t);
      if (walk && drawFrame(ctx, walk, fx, fy, o.facing === 'L', o.alpha ?? 1)) return;
      break;
    }
    case 'idle':
      // 스트레스가 높으면 평소에도 지친 모습
      if (o.tired && has('tired')) kind = 'tired';
      break;
    case 'read':
      kind = 'read';
      dy = Math.floor(t / 700) % 2 ? -0.5 : 0;
      break;
    case 'sleep':
      kind = has('sleep') ? 'sleep' : 'read';
      dy = Math.floor(t / 900) % 2 ? -0.5 : 0; // 숨쉬기
      break;
    case 'cheer':
      kind = 'cheer';
      dy = -Math.abs(Math.sin(t / 160)) * 6; // 만세 점프
      break;
    case 'desk':
      kind = has('desk') ? 'desk' : 'read';
      dy = Math.floor(t / 600) % 2 ? -0.5 : 0; // 끄적끄적
      break;
    case 'pc':
      kind = has('pc') ? 'pc' : 'read';
      dy = Math.floor(t / 250) % 2 ? -0.5 : 0; // 타닥타닥
      break;
    case 'music':
    case 'draw':
      kind = has(o.pose) ? o.pose : 'stand';
      dy = Math.floor(t / 300) % 2 ? -1 : 0;
      break;
    case 'exercise':
      kind = has('exercise') ? 'exercise' : 'stand';
      dy = -Math.abs(Math.sin(t / 200)) * 2.5; // 덤벨 들기 반동
      break;
    case 'work':
      if (has('work')) kind = 'work';
      dy = Math.floor(t / 160) % 2 ? -1.5 : 0;
      break;
    case 'tired':
      kind = has('tired') ? 'tired' : 'stand';
      dy = Math.floor(t / 1200) % 2 ? 0.5 : 0;
      break;
  }
  const backStand = `${o.stage}_${o.gender}_back_stand`;
  const name = o.pose === 'idle' && o.back && FRAMES[backStand] ? backStand : frameName(o.stage, o.gender, kind);
  // 시트 캐릭터는 오른쪽을 보고 있으므로 왼쪽으로 갈 때 좌우 반전
  const ok = drawFrame(ctx, name, fx, fy + dy, o.facing === 'L', o.alpha ?? 1);
  if (!ok) drawCharacterProcedural(ctx, fx, fy, o);
}

const urlCache = new Map<string, string>();
/** UI용 프레임 dataURL (대화 창 초상화 등). 시트 로딩 전이면 '' */
export function spriteUrl(name: string): string {
  const hit = urlCache.get(name);
  if (hit) return hit;
  const f = FRAMES[name];
  const sheet = loadSheet();
  if (!f || !sheet || !ready || typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = f.w;
  cv.height = f.h;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  const url = cv.toDataURL();
  urlCache.set(name, url);
  return url;
}

/** 걷기 프레임 이름 (없으면 null). 130ms마다 다음 프레임 */
export const WALK_FRAME_MS = 130;
const walkCount = new Map<string, number>();
export function walkFrame(base: string, t: number): string | null {
  // 걷기 프레임 수(4장 또는 8장)를 세어 같은 간격(130ms)으로 순서대로 재생
  let n = walkCount.get(base);
  if (n === undefined) {
    n = 0;
    while (FRAMES[`${base}_walk${n}`]) n++;
    walkCount.set(base, n);
  }
  if (!n) return null;
  return `${base}_walk${Math.floor(t / WALK_FRAME_MS) % n}`; // 4장·8장 모두 같은 프레임 간격
}

export const PARENT_FRAME = 'PARENT_stand';
