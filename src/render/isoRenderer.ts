import { FURNITURE_MAP } from '../data/furnitureData';
import { footprint, type Cell } from '../engine/room';
import type { GrowthStage, PlacedFurniture } from '../types/game';
import { drawPixels, FURNITURE_BODY, FURNITURE_PIXELS, shade } from './sprites';
import { drawCharacter } from './character';
import type { Actor } from './characterSim';
import type { Gender } from '../types/game';

/** 아이소메트릭 2:1 타일 (논리 해상도 px) */
export const TW = 32;
export const TH = 16;
export const WALL = 64;
export const PAD = 10;
const ICON_SCALE = 2;

export const COMBO_COLORS = ['#ffd96b', '#8ff0c9', '#9fd8ff', '#ffb3d1', '#d6b8ff', '#ffc48a'];

const WALLPAPER: Record<GrowthStage, string> = {
  CHILD: '#ffe3a8',
  TEEN: '#bfead3',
  YOUTH: '#c3d4f7',
};
const FLOOR_A = '#e2b57a';
const FLOOR_B = '#d4a468';

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
}

export function canvasSize(n: number) {
  return { w: n * TW + PAD * 2, h: WALL + n * TH + PAD * 2 };
}

function origin(n: number) {
  return { ox: PAD + (n * TW) / 2, oy: PAD + WALL };
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
  const h = FURNITURE_BODY[p.furnitureId]?.h ?? 8;
  const left = project(n, x0, y1)[0];
  const right = project(n, x1, y0)[0];
  const top = project(n, x0, y0)[1] - h - 8 * ICON_SCALE;
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
  opts: { selected?: boolean; alpha?: number; tint?: string } = {},
) {
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

function drawWalls(ctx: CanvasRenderingContext2D, n: number, stage: GrowthStage) {
  const paper = WALLPAPER[stage];
  const lift = (q: [number, number], h = WALL): [number, number] => [q[0], q[1] - h];
  const O = project(n, 0, 0);
  const XL = project(n, 0, n);
  const XR = project(n, n, 0);

  // 왼쪽 벽 (x=0 라인)
  poly(ctx, [O, XL, lift(XL), lift(O)], shade(paper, -0.1), '#1b1f3b');
  // 오른쪽 벽 (y=0 라인)
  poly(ctx, [O, XR, lift(XR), lift(O)], paper, '#1b1f3b');

  // 벽지 세로 줄무늬
  ctx.save();
  ctx.strokeStyle = shade(paper, -0.18);
  ctx.lineWidth = 1;
  for (let i = 1; i < n * 2; i++) {
    const a = project(n, 0, i / 2);
    const b = project(n, i / 2, 0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] - 6);
    ctx.lineTo(a[0], a[1] - WALL + 2);
    ctx.moveTo(b[0], b[1] - 6);
    ctx.lineTo(b[0], b[1] - WALL + 2);
    ctx.stroke();
  }
  ctx.restore();

  // 걸레받이
  poly(ctx, [O, XL, lift(XL, 5), lift(O, 5)], '#8a5a35');
  poly(ctx, [O, XR, lift(XR, 5), lift(O, 5)], '#a06a40');
  // 벽 윗단 몰딩
  poly(ctx, [lift(O), lift(XL), lift(XL, WALL + 3), lift(O, WALL + 3)], '#f6efe0', '#1b1f3b');
  poly(ctx, [lift(O), lift(XR), lift(XR, WALL + 3), lift(O, WALL + 3)], '#fff8ea', '#1b1f3b');

  // 창문 (오른쪽 벽)
  const wx = Math.max(1, Math.floor(n / 2) - 1);
  const w0 = project(n, wx, 0);
  const w1 = project(n, wx + 2, 0);
  const winPts: [number, number][] = [lift(w0, 18), lift(w1, 18), lift(w1, 50), lift(w0, 50)];
  poly(ctx, winPts, '#8fd3ff', '#1b1f3b');
  // 창틀 십자
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  const mid0 = project(n, wx + 1, 0);
  ctx.beginPath();
  ctx.moveTo(mid0[0], mid0[1] - 18);
  ctx.lineTo(mid0[0], mid0[1] - 50);
  ctx.moveTo(lift(w0, 34)[0], lift(w0, 34)[1]);
  ctx.lineTo(lift(w1, 34)[0], lift(w1, 34)[1]);
  ctx.stroke();
  // 구름
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(Math.round(w0[0] + 6), Math.round(w0[1] - 44), 6, 3);
  ctx.fillRect(Math.round(w0[0] + 4), Math.round(w0[1] - 42), 10, 2);

  // 포스터/액자 (왼쪽 벽) — 성장 단계별
  const pa = project(n, 0, 1.2);
  const pb = project(n, 0, 2.4);
  const posterColor = stage === 'CHILD' ? '#ff8fc0' : stage === 'TEEN' ? '#9b6bd8' : '#4a7bd8';
  poly(ctx, [lift(pa, 22), lift(pb, 22), lift(pb, 48), lift(pa, 48)], posterColor, '#1b1f3b');
  poly(
    ctx,
    [lift(project(n, 0, 1.5), 28), lift(project(n, 0, 2.1), 28), lift(project(n, 0, 2.1), 42), lift(project(n, 0, 1.5), 42)],
    '#fff6e5',
  );

  // 문 (왼쪽 벽 앞쪽 끝) — 외출/알바 시 이 문으로 나간다
  const d0 = project(n, 0, n - 0.85);
  const d1 = project(n, 0, n - 0.15);
  poly(ctx, [d0, d1, lift(d1, 40), lift(d0, 40)], '#8a5a35', '#1b1f3b');
  poly(ctx, [lift(d0, 3), lift(d1, 3), lift(d1, 37), lift(d0, 37)], '#a8703f');
  ctx.fillStyle = '#ffd84d';
  const knob = lift(project(n, 0, n - 0.3), 20);
  ctx.fillRect(Math.round(knob[0]) - 1, Math.round(knob[1]), 2, 2);
}

export function renderRoom(ctx: CanvasRenderingContext2D, v: RoomView) {
  const { n } = v;
  const { w, h } = canvasSize(n);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  drawWalls(ctx, n, v.stage);

  // 바닥 타일 (체크 무늬 나무 바닥)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) tile(ctx, n, x, y, (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B, 'rgba(90,50,20,0.25)');

  // 콤보 오라: 참여 가구 바닥이 은은하게 빛남
  const pulse = 0.35 + 0.25 * Math.sin(v.time / 300);
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

  // 가구 + 캐릭터 (깊이 순서대로)
  const at = v.actor ? v.actor.actor.drawAt ?? { gx: v.actor.actor.gx, gy: v.actor.actor.gy, lift: 0 } : null;
  const actorKey = at ? Math.floor(at.gx) + Math.floor(at.gy) + 2.1 + (at.lift ? 0.5 : 0) : Infinity;
  let actorDrawn = !v.actor;
  const drawActor = () => {
    if (!v.actor || !at) return;
    const { actor, gender } = v.actor;
    const [sx, sy] = project(n, at.gx, at.gy);
    drawCharacter(ctx, sx, sy - at.lift, { stage: v.stage, gender, facing: actor.facing, pose: actor.pose, time: v.time, alpha: actor.alpha });
    actorDrawn = true;
  };
  for (const p of depthSorted(v.placed)) {
    const r = footprintRect(p);
    if (!actorDrawn && actorKey < r.x1 + r.y1) drawActor();
    drawFurniture(ctx, n, p, { selected: p.instanceId === v.selectedId });
  }
  if (!actorDrawn) drawActor();

  // 배치 고스트
  if (v.ghost && FURNITURE_MAP[v.ghost.furnitureId]) {
    const g = { furnitureId: v.ghost.furnitureId, gridX: v.ghost.x, gridY: v.ghost.y, rotation: v.ghost.rotation };
    for (const c of footprint(g))
      if (c.x >= 0 && c.y >= 0 && c.x < n && c.y < n) tile(ctx, n, c.x, c.y, v.ghost.valid ? 'rgba(91,214,168,0.6)' : 'rgba(229,72,77,0.6)');
    drawFurniture(ctx, n, g, { alpha: 0.6 });
  }
}
