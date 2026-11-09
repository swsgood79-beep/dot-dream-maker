import atlasUrl from '../assets/characters_hi.webp';
import atlas from './characterAtlas.json';
import atlasHi from './characterAtlasHi.json';
import type { Gender, GrowthStage } from '../types/game';
import { drawCharacterProcedural, proceduralHeight, type CharacterDrawOpts } from './character';

/**
 * 스프라이트 시트(assets-src/character-sheet.png → src/assets/characters.png) 기반 캐릭터 렌더링.
 * 프레임: {단계}_{성별}_{stand|read|cheer|walkN|back_*|행동}, CAT_*
 * 크기·기준점은 1배 아틀라스(1도트 = 논리 1/SHEET), 그림은 같은 그림을 2배로 자른 고화질 시트(characters_hi.webp)에서.
 * 캔버스 백버퍼는 논리 좌표의 RES배 → 고화질 시트 1px = 백버퍼 1px.
 */
export const SHEET = 2;
export const RES = 4;

type Frame = { x: number; y: number; w: number; h: number; ax?: number };
const FRAMES = atlas as Record<string, Frame>;
const HIF = atlasHi as Record<string, Frame>;

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

/** 아틀라스에 그 프레임이 있는지 */
export function hasFrame(name: string): boolean {
  return !!FRAMES[name];
}

export function frameName(stage: GrowthStage, gender: Gender, kind: string): string {
  const name = `${stage}_${gender}_${kind}`;
  return FRAMES[name] ? name : `${stage}_${gender}_stand`; // 프레임이 없으면 서기로 대체
}

export function characterHeight(stage: GrowthStage, gender: Gender = 'SON'): number {
  const f = FRAMES[frameName(stage, gender, 'stand')];
  return f ? f.h / SHEET : proceduralHeight(stage);
}

/** 프레임을 (fx, fy) = 발 중앙 기준으로 그린다 */
export function drawFrame(ctx: CanvasRenderingContext2D, name: string, fx: number, fy: number, flip = false, alpha = 1) {
  const f = FRAMES[name];
  const sheet = loadSheet();
  if (!f || !sheet || !ready) return false;
  const g = HIF[name] ?? f;
  const w = f.w / SHEET;
  const h = f.h / SHEET;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  // 백버퍼 픽셀 격자에 맞춰 반올림 → 도트가 흐려지지 않음
  // 기준점: 상체 중심(ax). 좌우 반전 시 반대쪽에서 잰다
  const ax = (f.ax ?? f.w / 2) / SHEET;
  const x = Math.round((fx - (flip ? w - ax : ax)) * RES) / RES;
  const y = Math.round((fy - h) * RES) / RES;
  if (flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, g.x, g.y, g.w, g.h, 0, 0, w, h);
  } else {
    ctx.drawImage(sheet, g.x, g.y, g.w, g.h, x, y, w, h);
  }
  ctx.restore();
  return true;
}

/** 침대 가운데 기준 베개 위치 (머리판이 오른쪽 위인 침대 기준, 반전 시 x 반대) */
export const PILLOW_OFFSET = { x: 7, y: -7 };

export function drawCharacter(ctx: CanvasRenderingContext2D, fx: number, fy: number, o: CharacterDrawOpts) {
  // 침대에서 잘 때: 누운 전신 그림은 침대보다 커서 어색 → 이불 위로 머리만 빼꼼
  const head = `${o.stage}_${o.gender}_sleephead`;
  if (o.inBed && o.pose === 'sleep' && FRAMES[head]) {
    const flip = o.facing === 'L';
    const breathe = Math.floor(o.time / 900) % 2 ? -0.5 : 0;
    if (drawFrame(ctx, head, fx + (flip ? -PILLOW_OFFSET.x : PILLOW_OFFSET.x), fy + PILLOW_OFFSET.y + breathe, flip, o.alpha ?? 1)) return;
  }
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
      // 기분이 나쁘면 고개 숙이고 터덜터덜 (2장을 천천히 번갈아). 방 안쪽으로 걸을 때는 뒷모습 그대로
      if (o.mood?.mope && !o.back && has('mood_mope_walkA') && has('mood_mope_walkB')) {
        const f = Math.floor(t / 260) % 2 ? 'mood_mope_walkB' : 'mood_mope_walkA';
        if (drawFrame(ctx, `${o.stage}_${o.gender}_${f}`, fx, fy + (Math.floor(t / 260) % 2 ? 0 : -0.5), o.facing === 'L', o.alpha ?? 1)) return;
      }
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
      // 유년기는 지친 그림이 없어 상태 포즈의 한숨으로
      kind = has('tired') ? 'tired' : has('mood_sigh') ? 'mood_sigh' : 'stand';
      dy = Math.floor(t / 1200) % 2 ? 0.5 : 0;
      break;
  }
  // 활동 포즈 그림이 있으면 그걸로 (가만히 서서 하는 동작이라 살짝 들썩이기만)
  if (o.act && o.pose !== 'walk' && has(o.act)) {
    kind = o.act;
    dy = Math.floor(t / 280) % 2 ? -1 : 0;
  }
  // 상태 포즈: 가만히 서 있을 때 기분에 맞는 모습 + 작은 움직임 (몇 초마다 다른 포즈와 번갈아)
  let dx = 0;
  let moodOn = false;
  if (o.mood && o.pose === 'idle' && !o.act) {
    const m = o.mood;
    const key = m.alt && has(`mood_${m.alt}`) && Math.floor(t / 5200) % 3 === 2 ? m.alt : m.key;
    if (has(`mood_${key}`)) {
      kind = `mood_${key}`;
      moodOn = true;
      if (m.anim === 'cry') dy = Math.floor(t / 140) % 2 ? -1 : 0; // 흐느낌
      else if (m.anim === 'shake') dx = Math.floor(t / 2400) % 2 ? (Math.floor(t / 70) % 2 ? 0.5 : -0.5) : 0; // 몸서리 (간간이)
      else if (m.anim === 'stomp') dy = Math.floor(t / 420) % 3 === 0 ? -1.5 : 0; // 발 구르기
      else if (m.anim === 'sway') dx = Math.sin(t / 700) * 0.6; // 비틀
      else dy = Math.floor(t / 1100) % 2 ? 0.5 : 0; // 한숨 섞인 숨쉬기
    }
  }
  const backStand = `${o.stage}_${o.gender}_back_stand`;
  const name = o.pose === 'idle' && o.back && FRAMES[backStand] && !moodOn ? backStand : frameName(o.stage, o.gender, kind);
  // 시트 캐릭터는 오른쪽을 보고 있으므로 왼쪽으로 갈 때 좌우 반전
  const ok = drawFrame(ctx, name, fx + dx, fy + dy, o.facing === 'L', o.alpha ?? 1);
  if (ok && moodOn && o.mood?.fx) drawMoodFx(ctx, fx, fy, characterHeight(o.stage, o.gender), o.mood.fx, t, o.facing === 'L');
  if (!ok) drawCharacterProcedural(ctx, fx, fy, o);
}

/**
 * 창·장면(UI)에 크게 띄울 때 바깥 검은 테두리를 한 겹 걷어 낸다.
 * 방 안의 작은 캐릭터에는 굵은 테두리가 잘 보이지만, 크게 띄우면 테두리가 너무 두꺼워 그림이 뭉개져 보임.
 */
function thinOutline(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const kill: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!d[i + 3]) continue;
      if (op(x - 1, y) && op(x + 1, y) && op(x, y - 1) && op(x, y + 1)) continue;
      if ((d[i] + d[i + 1] + d[i + 2]) / 3 < 90) kill.push(i);
    }
  for (const i of kill) d[i + 3] = 0;
  ctx.putImageData(img, 0, 0);
}

const urlCache = new Map<string, string>();
/** UI용 프레임 dataURL (대화 창 초상화 등). 시트 로딩 전이면 '' */
export function spriteUrl(name: string): string {
  const hit = urlCache.get(name);
  if (hit) return hit;
  const f = FRAMES[name];
  const sheet = loadSheet();
  if (!f || !sheet || !ready || typeof document === 'undefined') return '';
  const g = HIF[name] ?? f;
  const cv = document.createElement('canvas');
  cv.width = g.w;
  cv.height = g.h;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(sheet, g.x, g.y, g.w, g.h, 0, 0, g.w, g.h);
  thinOutline(ctx, g.w, g.h);
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

/** 상태 포즈 위 작은 효과: 눈물 방울이 양옆으로 떨어짐 / 식은땀 한 방울이 흘러내림 */
function drawMoodFx(ctx: CanvasRenderingContext2D, fx: number, fy: number, h: number, kind: 'tears' | 'sweat', t: number, flip: boolean) {
  ctx.save();
  if (kind === 'tears') {
    for (const side of [-1, 1]) {
      const p = ((t / 700) + (side > 0 ? 0.5 : 0)) % 1; // 0→1
      const x = fx + side * (4 + p * 5);
      const y = fy - h * 0.72 + p * p * 10;
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = '#7cc8ff';
      ctx.fillRect(Math.round(x * 4) / 4, Math.round(y * 4) / 4, 1.25, 1.75);
    }
  } else {
    const p = (t / 1600) % 1;
    const x = fx + (flip ? -1 : 1) * 5;
    const y = fy - h * 0.86 + p * 6;
    ctx.globalAlpha = p < 0.8 ? 1 : (1 - p) * 5;
    ctx.fillStyle = '#9fdcff';
    ctx.fillRect(x, y, 1.5, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 0.25, y + 0.25, 0.5, 0.5);
  }
  ctx.restore();
}
