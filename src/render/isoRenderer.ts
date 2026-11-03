import { FURNITURE_MAP } from '../data/furnitureData';
import { footprint, type Cell } from '../engine/room';
import type { GrowthStage, PlacedFurniture } from '../types/game';
import { drawPixels, FURNITURE_BODY, FURNITURE_PIXELS, shade } from './sprites';
const WOOD_D = '#8a5a35';
import { CAT_FRAME, drawCharacter, drawFrame, PARENT_FRAME, RES, walkFrame } from './spriteCharacter';
import { drawFurnitureModel, modelHeight as codeModelHeight } from './furnitureModels';
import { drawFurnitureSprite, furnitureSpriteHeight } from './furnitureSprites';

/** 가구 높이: 손그림 스프라이트가 있으면 그 높이, 없으면 코드 모델 높이 */
const modelHeight = (id: string) => furnitureSpriteHeight(id) ?? codeModelHeight(id);
import type { Actor } from './characterSim';
import type { Gender } from '../types/game';

/** 아이소메트릭 2:1 타일 (논리 해상도 px) */
export const TW = 32;
export const TH = 16;
export const WALL = 100;
export const PAD = 6;
const WT = 0.22; // 벽 두께 (타일 단위)
const SLAB = 9; // 바닥 단면 두께 (px)
const CAP = 4;
const ICON_SCALE = 2;

export const COMBO_COLORS = ['#ffd96b', '#8ff0c9', '#9fd8ff', '#ffb3d1', '#d6b8ff', '#ffc48a'];

const WALLPAPER: Record<GrowthStage, string> = {
  CHILD: '#f8e8c8',
  TEEN: '#e6f0dc',
  YOUTH: '#e2e8f2',
};
const FLOOR = '#dca46a';
const FLOOR_LINE = '#b98048';

export interface RoomView {
  n: number;
  placed: PlacedFurniture[];
  stage: GrowthStage;
  comboTint: Map<string, string>; // instanceId → 콤보 색
  selectedId: string | null;
  ghost: { furnitureId: string; x: number; y: number; rotation: PlacedFurniture['rotation']; valid: boolean } | null;
  placingCells: Set<string> | null; // 배치 가능한 빈 칸 하이라이트
  time: number; // ms (오라 펄스 애니메이션)
  actor?: { actor: Actor; gender: Gender } | null;
  actorHalo?: string | null; // 행동 중 발밑 하이라이트 색
  npc?: Actor | null; // 부모님
}

export function canvasSize(n: number) {
  return { w: n * TW + PAD * 2, h: WALL + CAP + n * TH + SLAB + PAD * 2 };
}

function origin(n: number) {
  return { ox: PAD + (n * TW) / 2, oy: PAD + WALL + CAP + 2 };
}

/** 그리드 좌표 → 화면 좌표 (타일 꼭짓점 기준) */
export function project(n: number, x: number, y: number): [number, number] {
  const { ox, oy } = origin(n);
  return [ox + ((x - y) * TW) / 2, oy + ((x + y) * TH) / 2];
}

/** 화면 좌표 → 그리드 타일 (바닥 평면 기준) */
export function unproject(n: number, sx: number, sy: number): Cell | null {
  const { ox, oy } = origin(n);
  const a = (sx - ox) / (TW / 2);
  const b = (sy - oy) / (TH / 2);
  const x = Math.floor((a + b) / 2);
  const y = Math.floor((b - a) / 2);
  if (x < 0 || y < 0 || x >= n || y >= n) return null;
  return { x, y };
}

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function tile(ctx: CanvasRenderingContext2D, n: number, x: number, y: number, fill: string, stroke?: string) {
  poly(ctx, [project(n, x, y), project(n, x + 1, y), project(n, x + 1, y + 1), project(n, x, y + 1)], fill, stroke);
}

function footprintRect(p: Pick<PlacedFurniture, 'furnitureId' | 'gridX' | 'gridY' | 'rotation'>) {
  const cells = footprint(p);
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs) + 1, y1: Math.max(...ys) + 1 };
}

/** 화면상 가구 영역 (탭 판정용) */
export function furnitureBounds(n: number, p: PlacedFurniture) {
  const { x0, y0, x1, y1 } = footprintRect(p);
  const h = modelHeight(p.furnitureId);
  const left = project(n, x0, y1)[0];
  const right = project(n, x1, y0)[0];
  const top = project(n, x0, y0)[1] - h;
  const bottom = project(n, x1, y1)[1];
  return { left, right, top, bottom };
}

/** 앞쪽(화면 아래)일수록 나중에 그림 */
export function depthSorted(placed: PlacedFurniture[]) {
  return [...placed].sort((a, b) => {
    const ra = footprintRect(a);
    const rb = footprintRect(b);
    return ra.x1 + ra.y1 - (rb.x1 + rb.y1) || ra.x0 - rb.x0;
  });
}

function drawFurniture(
  ctx: CanvasRenderingContext2D,
  n: number,
  p: Pick<PlacedFurniture, 'furnitureId' | 'gridX' | 'gridY' | 'rotation'>,
  opts: { selected?: boolean; alpha?: number; tint?: string; time?: number } = {},
) {
  if (drawFurnitureSprite(ctx, (x, y) => project(n, x, y), p, opts.alpha ?? 1)) return;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  const drawn = drawFurnitureModel(ctx, (x, y) => project(n, x, y), p, opts.time ?? 0);
  ctx.restore();
  if (drawn) return;
  const body = FURNITURE_BODY[p.furnitureId] ?? { color: '#b07642', h: 8 };
  const { x0, y0, x1, y1 } = footprintRect(p);
  const ins = 0.12;
  const T = project(n, x0 + ins, y0 + ins);
  const R = project(n, x1 - ins, y0 + ins);
  const B = project(n, x1 - ins, y1 - ins);
  const L = project(n, x0 + ins, y1 - ins);
  const h = body.h;
  const up = (q: [number, number]): [number, number] => [q[0], q[1] - h];
  const outline = opts.selected ? '#ff7a59' : '#1b1f3b';

  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  // 그림자
  poly(ctx, [T, R, B, L].map(([x, y]) => [x + 2, y + 1] as [number, number]), 'rgba(0,0,0,0.18)');
  // 왼쪽 면 / 오른쪽 면 / 윗면
  poly(ctx, [L, B, up(B), up(L)], shade(body.color, -0.18), outline);
  poly(ctx, [B, R, up(R), up(B)], shade(body.color, -0.36), outline);
  poly(ctx, [up(T), up(R), up(B), up(L)], shade(body.color, 0.15), outline);
  if (opts.tint) poly(ctx, [up(T), up(R), up(B), up(L)], opts.tint);

  // 도트 아이콘 (윗면 중앙에 서 있는 스프라이트)
  const rows = FURNITURE_PIXELS[p.furnitureId];
  if (rows) {
    const cx = (up(T)[0] + up(B)[0]) / 2;
    const cy = (up(T)[1] + up(B)[1]) / 2;
    const s = ICON_SCALE;
    drawPixels(ctx, rows, cx - 4 * s, cy - 8 * s + 3, s);
  }
  ctx.restore();
}

type Pt = [number, number];

function drawWalls(ctx: CanvasRenderingContext2D, n: number, stage: GrowthStage) {
  const paper = WALLPAPER[stage];
  const P = (x: number, y: number, z = 0): Pt => {
    const [sx, sy] = project(n, x, y);
    return [sx, sy - z];
  };
  const OUT = '#4a2c18';

  // ── 안쪽 벽면: 벽지 + 나무 징두리
  poly(ctx, [P(0, 0), P(0, n), P(0, n, WALL), P(0, 0, WALL)], shade(paper, -0.08));
  poly(ctx, [P(0, 0), P(n, 0), P(n, 0, WALL), P(0, 0, WALL)], paper);
  // 벽지 잔무늬 (점)
  ctx.fillStyle = shade(paper, -0.16);
  for (let i = 0.25; i < n; i += 0.5)
    for (let z = 34; z < WALL - 4; z += 10) {
      const off = (Math.round(z / 10) % 2) * 0.25;
      const a = P(0, i + off, z);
      const b = P(i + off, 0, z);
      if (i + off < n) {
        ctx.fillRect(Math.round(a[0]), Math.round(a[1]), 1, 1);
        ctx.fillRect(Math.round(b[0]), Math.round(b[1]), 1, 1);
      }
    }
  const WZ = 24;
  poly(ctx, [P(0, 0), P(0, n), P(0, n, WZ), P(0, 0, WZ)], '#c08550');
  poly(ctx, [P(0, 0), P(n, 0), P(n, 0, WZ), P(0, 0, WZ)], '#cf9460');
  ctx.strokeStyle = 'rgba(90,50,20,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0.5; i < n; i += 0.5) {
    for (const [a, b] of [[P(0, i, 1), P(0, i, WZ)], [P(i, 0, 1), P(i, 0, WZ)]]) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  poly(ctx, [P(0, 0, WZ), P(0, n, WZ), P(0, n, WZ + 3), P(0, 0, WZ + 3)], WOOD_D);
  poly(ctx, [P(0, 0, WZ), P(n, 0, WZ), P(n, 0, WZ + 3), P(0, 0, WZ + 3)], '#9a6a40');
  poly(ctx, [P(0, 0), P(0, n), P(0, n, 3), P(0, 0, 3)], '#6b4226');
  poly(ctx, [P(0, 0), P(n, 0), P(n, 0, 3), P(0, 0, 3)], '#7a4c2c');

  // ── 창문 + 커튼 (오른쪽 벽)
  const w0 = Math.max(1.2, n / 2 - 0.6);
  const w1 = Math.min(n - 0.4, w0 + Math.max(1.6, n * 0.32));
  const zb = 36, zt = WALL - 10;
  poly(ctx, [P(w0 - 0.08, 0, zb - 3), P(w1 + 0.08, 0, zb - 3), P(w1 + 0.08, 0, zt + 3), P(w0 - 0.08, 0, zt + 3)], '#fff8ea', OUT);
  const sky = ctx.createLinearGradient(0, P(w0, 0, zt)[1], 0, P(w0, 0, zb)[1]);
  sky.addColorStop(0, '#7ec8f2');
  sky.addColorStop(1, '#d4f0ff');
  poly(ctx, [P(w0, 0, zb), P(w1, 0, zb), P(w1, 0, zt), P(w0, 0, zt)], sky as unknown as string);
  // 나무
  poly(ctx, [P(w0, 0, zb), P(w1, 0, zb), P(w1, 0, zb + 8), P(w0 + (w1 - w0) * 0.6, 0, zb + 12), P(w0, 0, zb + 7)], '#6fbf5a');
  poly(ctx, [P(w0, 0, zb), P(w1, 0, zb), P(w1, 0, zb + 3), P(w0, 0, zb + 4)], '#4f9a45');
  // 구름
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const cl = P(w0 + (w1 - w0) * 0.3, 0, zt - 8);
  ctx.fillRect(Math.round(cl[0]), Math.round(cl[1]), 8, 2);
  ctx.fillRect(Math.round(cl[0]) + 2, Math.round(cl[1]) - 2, 4, 2);
  // 창살
  const wm = (w0 + w1) / 2;
  poly(ctx, [P(wm - 0.03, 0, zb), P(wm + 0.03, 0, zb), P(wm + 0.03, 0, zt), P(wm - 0.03, 0, zt)], '#fff8ea');
  poly(ctx, [P(w0 - 0.15, 0, zb - 5), P(w1 + 0.15, 0, zb - 5), P(w1 + 0.15, 0, zb - 2), P(w0 - 0.15, 0, zb - 2)], '#9a6a40', OUT);
  // 커튼
  const cur = '#3aa88a';
  for (const [c0, c1] of [[w0 - 0.25, w0 + 0.12], [w1 - 0.12, w1 + 0.25]]) {
    poly(ctx, [P(c0, 0, zb - 8), P(c1, 0, zb - 6), P(c1, 0, zt + 4), P(c0, 0, zt + 4)], cur, OUT);
    poly(ctx, [P(c0 + 0.12, 0, zb - 7), P(c0 + 0.17, 0, zb - 7), P(c0 + 0.17, 0, zt + 4), P(c0 + 0.12, 0, zt + 4)], shade(cur, -0.2));
  }
  poly(ctx, [P(w0 - 0.35, 0, zt + 4), P(w1 + 0.35, 0, zt + 4), P(w1 + 0.35, 0, zt + 6), P(w0 - 0.35, 0, zt + 6)], '#6b4226');

  // ── 코르크 게시판 (왼쪽 벽)
  if (n >= 5) {
    const c0 = 0.9, c1 = 2.1;
    poly(ctx, [P(0, c0, 40), P(0, c1, 40), P(0, c1, 66), P(0, c0, 66)], '#8a5a35', OUT);
    poly(ctx, [P(0, c0 + 0.08, 42), P(0, c1 - 0.08, 42), P(0, c1 - 0.08, 64), P(0, c0 + 0.08, 64)], '#d6a06a');
    const notes: [number, number, string][] = [[c0 + 0.2, 52, '#ffffff'], [c0 + 0.6, 56, '#fff59d'], [c0 + 0.85, 46, '#ffc2dc'], [c0 + 0.35, 45, '#bdf0d8']];
    for (const [y, z, col] of notes) {
      poly(ctx, [P(0, y, z), P(0, y + 0.25, z), P(0, y + 0.25, z + 7), P(0, y, z + 7)], col);
      const pin = P(0, y + 0.12, z + 6);
      ctx.fillStyle = '#e5484d';
      ctx.fillRect(Math.round(pin[0]), Math.round(pin[1]) - 1, 1, 1);
    }
  }
  // ── 액자 (왼쪽 벽)
  if (n >= 6) {
    const f0 = 2.6, f1 = 3.5;
    poly(ctx, [P(0, f0, 44), P(0, f1, 44), P(0, f1, 62), P(0, f0, 62)], '#6b4226', OUT);
    poly(ctx, [P(0, f0 + 0.08, 46), P(0, f1 - 0.08, 46), P(0, f1 - 0.08, 60), P(0, f0 + 0.08, 60)], '#9fd8ff');
    poly(ctx, [P(0, f0 + 0.08, 46), P(0, f1 - 0.08, 46), P(0, f1 - 0.08, 51), P(0, f0 + 0.4, 54), P(0, f0 + 0.08, 50)], '#6fbf5a');
    const sun = P(0, f1 - 0.25, 57);
    ctx.fillStyle = '#ffd84d';
    ctx.fillRect(Math.round(sun[0]) - 1, Math.round(sun[1]) - 1, 2, 2);
  }

  // ── 문 (왼쪽 벽 앞쪽 끝)
  const d0 = n - 0.9, d1 = n - 0.12;
  poly(ctx, [P(0, d0, 0), P(0, d1, 0), P(0, d1, 50), P(0, d0, 50)], '#6b4226', OUT);
  poly(ctx, [P(0, d0 + 0.06, 0), P(0, d1 - 0.06, 0), P(0, d1 - 0.06, 47), P(0, d0 + 0.06, 47)], '#a8703f');
  poly(ctx, [P(0, d0 + 0.14, 28), P(0, d1 - 0.14, 28), P(0, d1 - 0.14, 42), P(0, d0 + 0.14, 42)], '#8f5c33');
  poly(ctx, [P(0, d0 + 0.14, 6), P(0, d1 - 0.14, 6), P(0, d1 - 0.14, 22), P(0, d0 + 0.14, 22)], '#8f5c33');
  const knob = P(0, d1 - 0.18, 24);
  ctx.fillStyle = '#ffd84d';
  ctx.fillRect(Math.round(knob[0]) - 1, Math.round(knob[1]), 2, 2);
}

/** 벽 윗단(두께), 바닥 단면 — 디오라마처럼 잘린 방 */
function drawShell(ctx: CanvasRenderingContext2D, n: number) {
  const P = (x: number, y: number, z = 0): Pt => {
    const [sx, sy] = project(n, x, y);
    return [sx, sy - z];
  };
  const OUT = '#3b2414';
  const top = WALL + CAP;
  // 벽 윗면 (두께)
  poly(ctx, [P(0, 0, WALL), P(0, n, WALL), P(-WT, n, top), P(-WT, -WT, top)], '#9a6a40', OUT);
  poly(ctx, [P(0, 0, WALL), P(n, 0, WALL), P(n, -WT, top), P(-WT, -WT, top)], '#a8784a', OUT);
  poly(ctx, [P(0, 0, WALL), P(0, n, WALL), P(0, n, WALL + 1), P(0, 0, WALL + 1)], '#c8925a');
  // 벽 끝 단면
  poly(ctx, [P(0, n, 0), P(-WT, n, 0), P(-WT, n, top), P(0, n, WALL)], '#6b4226', OUT);
  poly(ctx, [P(n, 0, 0), P(n, -WT, 0), P(n, -WT, top), P(n, 0, WALL)], '#5a3820', OUT);
  // 바닥 단면 (앞쪽 두 변)
  poly(ctx, [P(-WT, n), P(n, n), P(n, n, -SLAB), P(-WT, n, -SLAB)], '#7a4c2c', OUT);
  poly(ctx, [P(n, n), P(n, -WT), P(n, -WT, -SLAB), P(n, n, -SLAB)], '#5a3820', OUT);
  poly(ctx, [P(-WT, n), P(n, n), P(n, n, -2), P(-WT, n, -2)], '#9a6a40');
  poly(ctx, [P(n, n), P(n, -WT), P(n, -WT, -2), P(n, n, -2)], '#7a4c2c');
}

/** 나무 마루 (판자 이음새) */
function drawFloor(ctx: CanvasRenderingContext2D, n: number) {
  poly(ctx, [project(n, 0, 0), project(n, n, 0), project(n, n, n), project(n, 0, n)], FLOOR);
  ctx.strokeStyle = FLOOR_LINE;
  ctx.lineWidth = 1;
  // 판자: x 방향으로 길게, 1타일에 3줄
  for (let i = 1; i < n * 3; i++) {
    const y = i / 3;
    const a = project(n, 0, y);
    const b = project(n, n, y);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  // 엇갈린 이음새
  for (let row = 0; row < n * 3; row++) {
    const off = (row * 0.37) % 1.4;
    for (let x = off; x < n; x += 1.4) {
      const a = project(n, x, row / 3);
      const b = project(n, x, (row + 1) / 3);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  // 창문 빛
  ctx.save();
  ctx.globalAlpha = 0.12;
  const w0 = Math.max(1.2, n / 2 - 0.6);
  poly(ctx, [project(n, w0, 0), project(n, w0 + 1.6, 0), project(n, w0 + 2.4, 2.2), project(n, w0 + 0.8, 2.2)], '#fffbe0');
  ctx.restore();
}

/** 콤보 가구 주변 반짝이 (도트 별) */
function drawSparkles(ctx: CanvasRenderingContext2D, n: number, v: RoomView) {
  const COLORS = ['#ffffff', '#fff59d', '#9ff7ff', '#ffb3f0', '#b8ff9f'];
  let k = 0;
  for (const p of v.placed) {
    if (!v.comboTint.has(p.instanceId)) continue;
    const r = footprintRect(p);
    const [cx, cy] = project(n, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
    const hgt = modelHeight(p.furnitureId);
    for (let i = 0; i < 4; i++) {
      k++;
      const seed = (k * 9301 + 49297) % 233280;
      const rx = ((seed % 100) / 100 - 0.5) * 30;
      const ry = -((seed % 77) / 77) * (hgt + 10);
      const phase = (v.time / 700 + (seed % 13) / 13) % 1;
      const size = phase < 0.5 ? Math.round(phase * 6) : Math.round((1 - phase) * 6);
      if (size <= 0) continue;
      const x = Math.round(cx + rx);
      const y = Math.round(cy + ry);
      ctx.fillStyle = COLORS[k % COLORS.length];
      ctx.fillRect(x - size, y, size * 2 + 1, 1);
      ctx.fillRect(x, y - size, 1, size * 2 + 1);
      if (size >= 2) ctx.fillRect(x - 1, y - 1, 3, 3);
    }
  }
}

export function renderRoom(ctx: CanvasRenderingContext2D, v: RoomView) {
  const { n } = v;
  const { w, h } = canvasSize(n);
  // 백버퍼는 RES배 해상도: 방은 그대로, 캐릭터 스프라이트는 원본 도트 1:1
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  drawWalls(ctx, n, v.stage);
  drawShell(ctx, n);
  drawFloor(ctx, n);

  // 콤보 오라: 참여 가구 바닥이 은은하게 빛남
  const pulse = 0.18 + 0.14 * Math.sin(v.time / 300);
  ctx.save();
  ctx.globalAlpha = pulse;
  for (const p of v.placed) {
    const c = v.comboTint.get(p.instanceId);
    if (!c) continue;
    for (const cell of footprint(p)) tile(ctx, n, cell.x, cell.y, c);
  }
  ctx.restore();

  // 배치 가능 칸
  if (v.placingCells) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (const key of v.placingCells) {
      const [x, y] = key.split(',').map(Number);
      tile(ctx, n, x, y, '#5bd6a8');
    }
    ctx.restore();
  }

  // 선택된 가구 바닥 테두리
  const sel = v.placed.find((p) => p.instanceId === v.selectedId);
  if (sel) for (const c of footprint(sel)) tile(ctx, n, c.x, c.y, 'rgba(255,122,89,0.45)', '#ff7a59');

  // 캐릭터 발밑 하이라이트 (행동 중)
  if (v.actor && v.actorHalo) {
    const cx = Math.floor(v.actor.actor.gx);
    const cy = Math.floor(v.actor.actor.gy);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(v.time / 150);
    tile(ctx, n, cx, cy, v.actorHalo);
    ctx.restore();
  }

  // 가구 + 캐릭터 + 반려묘 (깊이 순서대로)
  type Drawable = { key: number; draw: () => void };
  const list: Drawable[] = depthSorted(v.placed).map((p, i) => {
    const r = footprintRect(p);
    return { key: r.x1 + r.y1 + i * 1e-4, draw: () => drawFurniture(ctx, n, p, { selected: p.instanceId === v.selectedId, time: v.time }) };
  });
  if (v.actor) {
    const { actor, gender } = v.actor;
    const at = actor.drawAt ?? { gx: actor.gx, gy: actor.gy, lift: 0 };
    list.push({
      key: Math.floor(at.gx) + Math.floor(at.gy) + 2.1 + (at.lift ? 0.5 : 0),
      draw: () => {
        const [sx, sy] = project(n, at.gx, at.gy);
        drawCharacter(ctx, sx, sy - at.lift, { stage: v.stage, gender, facing: actor.facing, pose: actor.pose, time: v.time, alpha: actor.alpha });
      },
    });
  }
  if (v.npc) {
    const npc = v.npc;
    list.push({
      key: Math.floor(npc.gx) + Math.floor(npc.gy) + 2.08,
      draw: () => {
        const [sx, sy] = project(n, npc.gx, npc.gy);
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 1, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        const frame = npc.pose === 'walk' ? walkFrame('PARENT', v.time) ?? PARENT_FRAME : PARENT_FRAME;
        drawFrame(ctx, frame, sx, sy, npc.facing === 'L');
      },
    });
  }
  const cat = catSpot(n, v.placed);
  if (cat) {
    list.push({
      key: Math.floor(cat.gx) + Math.floor(cat.gy) + 2.05 + (cat.lift ? 0.5 : 0),
      draw: () => {
        const [sx, sy] = project(n, cat.gx, cat.gy);
        const breathe = Math.floor(v.time / 900) % 2 ? -0.5 : 0;
        drawFrame(ctx, CAT_FRAME, sx, sy - cat.lift + 2 + breathe, false);
      },
    });
  }
  list.sort((a, b) => a.key - b.key).forEach((d) => d.draw());
  drawSparkles(ctx, n, v);

  // 배치 고스트
  if (v.ghost && FURNITURE_MAP[v.ghost.furnitureId]) {
    const g = { furnitureId: v.ghost.furnitureId, gridX: v.ghost.x, gridY: v.ghost.y, rotation: v.ghost.rotation };
    for (const c of footprint(g))
      if (c.x >= 0 && c.y >= 0 && c.x < n && c.y < n) tile(ctx, n, c.x, c.y, v.ghost.valid ? 'rgba(91,214,168,0.6)' : 'rgba(229,72,77,0.6)');
    drawFurniture(ctx, n, g, { alpha: 0.6, time: v.time });
  }
}

/** 반려묘가 자는 자리: 반려묘 쿠션 위 → 침대 옆 빈 칸 → 방 구석 */
export function catSpot(n: number, placed: PlacedFurniture[]): { gx: number; gy: number; lift: number } | null {
  const cushion = placed.find((p) => p.furnitureId === 'cat_cushion');
  if (cushion) return { gx: cushion.gridX + 0.5, gy: cushion.gridY + 0.5, lift: (FURNITURE_BODY.cat_cushion?.h ?? 3) + 1 };
  const taken = new Set(placed.flatMap((p) => footprint(p).map((c) => `${c.x},${c.y}`)));
  const prefer: Cell[] = [];
  for (const p of placed.filter((p) => FURNITURE_MAP[p.furnitureId]?.category === 'REST'))
    for (const c of footprint(p)) prefer.push({ x: c.x + 1, y: c.y }, { x: c.x, y: c.y + 1 });
  prefer.push({ x: n - 1, y: 0 }, { x: n - 1, y: n - 1 });
  const spot = prefer.find((c) => c.x >= 0 && c.y >= 0 && c.x < n && c.y < n && !taken.has(`${c.x},${c.y}`));
  return spot ? { gx: spot.x + 0.5, gy: spot.y + 0.5, lift: 0 } : null;
}
