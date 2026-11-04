import type { PlacedFurniture } from '../types/game';
import { footprint } from '../engine/room';
import { drawPixels, FURNITURE_PIXELS, shade } from './sprites';

/**
 * 가구 3D 도트 모델: 아이소메트릭 박스 여러 개 + 앞면 디테일로 실제 모양(책장·책상·침대·피아노…)을 그린다.
 * 좌표계: a = 정면 기준 가로(0=화면 왼쪽 ~ 1=오른쪽), b = 깊이(0=뒤 ~ 1=앞), z = 높이(px)
 * 회전 0/180 → 정면이 +y(화면 왼쪽 아래), 90/270 → 정면이 +x(화면 오른쪽 아래)
 */
type Pt = [number, number];
type Proj = (x: number, y: number) => Pt;

const OUTLINE = 'rgba(40,24,14,0.85)';
const WOOD = '#b9783f';
const WOOD_L = '#d79a5c';
const WOOD_D = '#8a5a35';

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }
}

class Model {
  private ctx: CanvasRenderingContext2D;
  private proj: Proj;
  private r: { x0: number; y0: number; x1: number; y1: number };
  private front: 'L' | 'R';
  constructor(ctx: CanvasRenderingContext2D, proj: Proj, r: { x0: number; y0: number; x1: number; y1: number }, front: 'L' | 'R') {
    this.ctx = ctx;
    this.proj = proj;
    this.r = r;
    this.front = front;
  }

  /** (a, b) → 그리드 좌표 */
  private g(a: number, b: number): [number, number] {
    const { x0, y0, x1, y1 } = this.r;
    if (this.front === 'L') return [x0 + a * (x1 - x0), y0 + b * (y1 - y0)];
    return [x0 + b * (x1 - x0), y1 - a * (y1 - y0)];
  }

  P(a: number, b: number, z: number): Pt {
    const [x, y] = this.g(a, b);
    const [sx, sy] = this.proj(x, y);
    return [sx, sy - z];
  }

  /** 박스: 보이는 세 면(위, +y, +x)을 그린다 */
  box(a0: number, a1: number, b0: number, b1: number, z0: number, z1: number, color: string, outline = true) {
    const [xa, ya] = this.g(a0, b0);
    const [xb, yb] = this.g(a1, b1);
    const X0 = Math.min(xa, xb), X1 = Math.max(xa, xb), Y0 = Math.min(ya, yb), Y1 = Math.max(ya, yb);
    const Q = (x: number, y: number, z: number): Pt => {
      const [sx, sy] = this.proj(x, y);
      return [sx, sy - z];
    };
    const o = outline ? OUTLINE : undefined;
    poly(this.ctx, [Q(X0, Y1, z0), Q(X1, Y1, z0), Q(X1, Y1, z1), Q(X0, Y1, z1)], shade(color, -0.1), o);
    poly(this.ctx, [Q(X1, Y1, z0), Q(X1, Y0, z0), Q(X1, Y0, z1), Q(X1, Y1, z1)], shade(color, -0.3), o);
    poly(this.ctx, [Q(X0, Y0, z1), Q(X1, Y0, z1), Q(X1, Y1, z1), Q(X0, Y1, z1)], shade(color, 0.12), o);
  }

  /** 정면 평면(깊이 b) 위의 사각형 — 책, 화면, 손잡이 등 */
  face(a0: number, a1: number, z0: number, z1: number, b: number, color: string) {
    const lit = this.front === 'L' ? shade(color, -0.04) : shade(color, -0.2);
    poly(this.ctx, [this.P(a0, b, z0), this.P(a1, b, z0), this.P(a1, b, z1), this.P(a0, b, z1)], lit);
  }

  /** 윗면(높이 z) 위의 사각형 */
  top(a0: number, a1: number, b0: number, b1: number, z: number, color: string) {
    poly(this.ctx, [this.P(a0, b0, z), this.P(a1, b0, z), this.P(a1, b1, z), this.P(a0, b1, z)], color);
  }

  /** 도트 아이콘을 (a, b, z) 위에 세운다 */
  icon(id: string, a: number, b: number, z: number, scale = 2) {
    const rows = FURNITURE_PIXELS[id];
    if (!rows) return;
    const [sx, sy] = this.P(a, b, z);
    drawPixels(this.ctx, rows, sx - 4 * scale, sy - 8 * scale + 1, scale);
  }

  glow(a: number, b: number, z: number, radius: number, color: string) {
    const [sx, sy] = this.P(a, b, z);
    const grad = this.ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
  }
}

const BOOK_COLORS = ['#d9534f', '#4a7bd8', '#5bb85b', '#f0ad4e', '#9b6bd8', '#e8e0c8', '#3aa8a0', '#c0392b'];

function books(m: Model, a0: number, a1: number, zBase: number, zTop: number, b: number, seed: number, palette = BOOK_COLORS) {
  let a = a0;
  let i = seed;
  while (a < a1 - 0.04) {
    const w = 0.055 + ((i * 37) % 5) * 0.012;
    const hgt = (zTop - zBase) * (0.7 + ((i * 53) % 4) * 0.09);
    if (a + w > a1) break;
    m.face(a, a + w - 0.01, zBase, zBase + hgt, b, palette[i % palette.length]);
    a += w;
    i++;
  }
}

function shelf(m: Model, h: number, rows: number, palette?: string[], color = WOOD) {
  m.box(0.04, 0.96, 0.05, 0.42, 0, h, color);
  m.face(0.1, 0.9, 2, h - 2, 0.42, shade(color, -0.45));
  const rowH = (h - 4) / rows;
  for (let r = 0; r < rows; r++) {
    const z = 2 + r * rowH;
    m.face(0.08, 0.92, z, z + 1.2, 0.421, shade(color, 0.1));
    books(m, 0.12, 0.88, z + 1.2, z + rowH - 0.5, 0.422, r * 3 + 1, palette);
  }
}

function deskBase(m: Model, topZ = 15, color = WOOD) {
  for (const [a, b] of [[0.06, 0.14], [0.86, 0.14], [0.06, 0.8], [0.86, 0.8]]) m.box(a, a + 0.07, b, b + 0.07, 0, topZ, WOOD_D, false);
  m.box(0.62, 0.95, 0.12, 0.86, 3, topZ, color);
  m.face(0.72, 0.85, topZ - 6, topZ - 5, 0.861, '#f0d080');
  m.box(0.02, 0.98, 0.08, 0.9, topZ, topZ + 3, WOOD_L);
}

function monitor(m: Model, a0: number, a1: number, z: number, screen: string) {
  m.box((a0 + a1) / 2 - 0.03, (a0 + a1) / 2 + 0.03, 0.22, 0.28, z, z + 4, '#333844', false);
  m.box(a0, a1, 0.2, 0.28, z + 4, z + 18, '#2b2f3b');
  m.face(a0 + 0.04, a1 - 0.04, z + 6, z + 16, 0.281, screen);
}

type Drawer = (m: Model, id: string, t: number) => void;

const MODELS: Record<string, { h: number; draw: Drawer }> = {
  // ── 책장류
  encyclopedia_shelf: { h: 38, draw: (m) => shelf(m, 38, 3) },
  medical_shelf: { h: 38, draw: (m) => shelf(m, 38, 3, ['#e8f0e8', '#5bb85b', '#ffffff', '#3aa8a0', '#d9534f']) },
  spice_rack: { h: 22, draw: (m) => shelf(m, 22, 2, ['#d9534f', '#f0ad4e', '#5bb85b', '#8a5a35', '#ffd84d']) },
  // ── 책상류
  oak_desk: {
    h: 22,
    draw: (m) => {
      deskBase(m);
      m.box(0.15, 0.35, 0.3, 0.55, 18, 21, '#4a7bd8');
      m.box(0.17, 0.33, 0.32, 0.53, 21, 23, '#d9534f');
      m.box(0.45, 0.52, 0.35, 0.42, 18, 24, '#6b8e23', false);
    },
  },
  microscope_table: { h: 34, draw: (m) => { deskBase(m, 15, '#c8ccd4'); m.icon('microscope_table', 0.45, 0.45, 18, 1.5); } },
  gaming_pc: {
    h: 38,
    draw: (m, _id, t) => {
      deskBase(m);
      monitor(m, 0.2, 0.7, 18, Math.floor(t / 400) % 2 ? '#5bd6ff' : '#4ac0f0');
      m.box(0.25, 0.65, 0.5, 0.72, 18, 19.5, '#c9ced6');
      m.box(0.76, 0.96, 0.2, 0.75, 18, 34, '#2b2f3b');
      m.face(0.79, 0.81, 20, 32, 0.751, `hsl(${(t / 10) % 360} 90% 60%)`);
    },
  },
  dual_monitor: {
    h: 36,
    draw: (m) => {
      deskBase(m);
      monitor(m, 0.08, 0.5, 18, '#7fd8ff');
      monitor(m, 0.52, 0.94, 18, '#b5f0ff');
      m.box(0.3, 0.7, 0.55, 0.75, 18, 19.5, '#c9ced6');
    },
  },
  stock_monitor: {
    h: 36,
    draw: (m, _id, t) => {
      deskBase(m);
      monitor(m, 0.15, 0.85, 18, '#10241a');
      const up = Math.floor(t / 600) % 2;
      m.face(0.25, 0.4, 26, 28, 0.282, up ? '#5bd66b' : '#e5484d');
      m.face(0.45, 0.6, 28, 31, 0.282, '#5bd66b');
      m.face(0.62, 0.75, 24, 27, 0.282, up ? '#e5484d' : '#5bd66b');
    },
  },
  whiteboard: {
    h: 34,
    draw: (m) => {
      m.box(0.1, 0.16, 0.4, 0.5, 0, 12, '#7a8290', false);
      m.box(0.84, 0.9, 0.4, 0.5, 0, 12, '#7a8290', false);
      m.box(0.05, 0.95, 0.4, 0.48, 10, 34, '#c9ced6');
      m.face(0.09, 0.91, 12, 32, 0.481, '#ffffff');
      m.face(0.15, 0.45, 26, 27, 0.482, '#4a7bd8');
      m.face(0.2, 0.6, 22, 23, 0.482, '#d9534f');
      m.face(0.5, 0.8, 17, 18, 0.482, '#5bb85b');
    },
  },
  // ── 침대류
  basic_bed: { h: 16, draw: (m) => bed(m, '#d9a066', '#f0b8c8') },
  fluffy_bed: { h: 18, draw: (m) => bed(m, '#c98f55', '#ff9ec7', true) },
  zero_g_bed: {
    h: 22,
    draw: (m, _id, t) => {
      m.box(0.05, 0.95, 0.05, 0.95, 0, 8, '#c9ced6');
      m.box(0.1, 0.9, 0.1, 0.9, 8, 12, '#ffffff');
      m.box(0.1, 0.9, 0.1, 0.3, 8, 22, '#8fe3ff');
      m.glow(0.5, 0.5, 14, 12, `rgba(143,227,255,${0.25 + 0.15 * Math.sin(t / 300)})`);
    },
  },
  cat_cushion: {
    h: 6,
    draw: (m) => {
      // 빈 쿠션 (고양이가 나가 있을 때): 도톰한 테두리 + 오목한 가운데
      m.box(0.1, 0.9, 0.1, 0.9, 0, 5, '#ff8fc0');
      m.top(0.2, 0.8, 0.2, 0.8, 5, '#ffb3d1');
      m.top(0.3, 0.7, 0.3, 0.7, 4, '#e8789f');
    },
  },
  // ── 러그
  magic_rug: {
    h: 2,
    draw: (m) => {
      m.box(0.02, 0.98, 0.02, 0.98, 0, 1, '#6b3fa0', false);
      m.top(0.1, 0.9, 0.1, 0.9, 1, '#8a5cc8');
      m.top(0.3, 0.7, 0.3, 0.7, 1, '#ffd84d');
      m.top(0.38, 0.62, 0.38, 0.62, 1, '#6b3fa0');
    },
  },
  // ── 피아노 / 음악
  grand_piano: {
    h: 34,
    draw: (m) => {
      m.box(0.03, 0.97, 0.05, 0.45, 0, 32, '#2a2230');
      m.face(0.38, 0.62, 22, 29, 0.451, '#f6f0e0');
      m.face(0.42, 0.58, 24, 25, 0.452, '#999');
      m.face(0.42, 0.58, 26, 27, 0.452, '#999');
      m.box(0.05, 0.11, 0.55, 0.68, 0, 12, '#2a2230', false);
      m.box(0.89, 0.95, 0.55, 0.68, 0, 12, '#2a2230', false);
      m.box(0.03, 0.97, 0.45, 0.72, 12, 16, '#2a2230');
      m.top(0.05, 0.95, 0.5, 0.7, 16, '#ffffff');
      for (let a = 0.08; a < 0.92; a += 0.06) m.top(a, a + 0.025, 0.5, 0.6, 16, '#1b1f3b');
      m.box(0.35, 0.65, 0.82, 0.98, 0, 9, '#c0392b');
    },
  },
  condenser_mic: { h: 30, draw: (m) => { m.box(0.42, 0.58, 0.42, 0.58, 0, 1.5, '#333844'); m.box(0.48, 0.52, 0.48, 0.52, 1.5, 20, '#7a8290', false); m.icon('condenser_mic', 0.5, 0.5, 18, 1.5); } },
  sound_booth: {
    h: 44,
    draw: (m) => {
      m.box(0.04, 0.96, 0.04, 0.96, 0, 42, '#6b5a8a');
      m.face(0.25, 0.75, 0, 34, 0.961, '#8a78a8');
      m.face(0.35, 0.65, 20, 30, 0.962, '#8fd3ff');
      m.face(0.66, 0.7, 14, 18, 0.962, '#ffd84d');
    },
  },
  // ── 미술
  easel: { h: 30, draw: (m) => { m.box(0.3, 0.36, 0.5, 0.56, 0, 10, WOOD_D, false); m.box(0.64, 0.7, 0.5, 0.56, 0, 10, WOOD_D, false); m.icon('easel', 0.5, 0.5, 6, 2.2); } },
  plaster_bust: { h: 30, draw: (m) => { m.box(0.25, 0.75, 0.25, 0.75, 0, 12, '#e8e2d6'); m.icon('plaster_bust', 0.5, 0.5, 12, 1.6); } },
  watercolor_kit: { h: 24, draw: (m) => { deskBase(m, 11); m.icon('watercolor_kit', 0.5, 0.5, 14, 1.5); } },
  // ── 운동
  treadmill: {
    h: 26,
    draw: (m, _id, t) => {
      m.box(0.15, 0.85, 0.02, 0.98, 0, 4, '#5a6070');
      m.top(0.2, 0.8, 0.15, 0.95, 4, '#2b2f3b');
      const s = (t / 120) % 1;
      m.top(0.2, 0.8, 0.15 + s * 0.7, 0.18 + s * 0.7, 4.1, '#444b5c');
      m.box(0.15, 0.21, 0.02, 0.1, 4, 22, '#7a8290', false);
      m.box(0.79, 0.85, 0.02, 0.1, 4, 22, '#7a8290', false);
      m.box(0.15, 0.85, 0.0, 0.12, 21, 25, '#2b2f3b');
      m.face(0.4, 0.6, 22, 24, 0.121, '#5bd6a8');
    },
  },
  dumbbell_rack: { h: 22, draw: (m) => { m.box(0.08, 0.92, 0.3, 0.7, 0, 10, '#5a6070'); for (const a of [0.2, 0.5, 0.8]) m.box(a - 0.08, a + 0.08, 0.35, 0.65, 10, 13, '#2b2f3b'); } },
  full_mirror: { h: 36, draw: (m) => { m.box(0.2, 0.8, 0.3, 0.42, 0, 36, WOOD); m.face(0.26, 0.74, 3, 33, 0.421, '#bfefff'); m.face(0.32, 0.4, 8, 28, 0.422, '#ffffff'); } },
  wooden_sword_rack: { h: 28, draw: (m) => { m.box(0.08, 0.92, 0.3, 0.55, 0, 8, WOOD_D); m.icon('wooden_sword_rack', 0.5, 0.42, 8, 2); } },
  // ── 비즈니스
  newspaper_stand: { h: 26, draw: (m) => { m.box(0.3, 0.7, 0.3, 0.7, 0, 14, WOOD_D); m.icon('newspaper_stand', 0.5, 0.5, 12, 1.4); } },
  world_clock: {
    h: 40,
    draw: (m, _id, t) => {
      m.box(0.28, 0.72, 0.3, 0.6, 0, 38, WOOD_D);
      m.face(0.33, 0.67, 26, 36, 0.601, '#fff6e5');
      m.face(0.49, 0.51, 31, 35, 0.602, '#1b1f3b');
      const sw = Math.sin(t / 400) * 0.08;
      m.face(0.47 + sw, 0.53 + sw, 6, 14, 0.602, '#ffd84d');
    },
  },
  // ── 주방
  mini_oven: {
    h: 24,
    draw: (m, _id, t) => {
      m.box(0.15, 0.85, 0.2, 0.8, 0, 6, WOOD_D);
      m.box(0.12, 0.88, 0.2, 0.8, 6, 20, '#d0d4dc');
      m.face(0.2, 0.65, 9, 17, 0.801, '#2b2f3b');
      m.face(0.24, 0.61, 10, 16, 0.802, Math.floor(t / 500) % 2 ? '#ff9f43' : '#ff7a2a');
    },
  },
  kitchen_counter: {
    h: 20,
    draw: (m) => {
      m.box(0.02, 0.98, 0.1, 0.9, 0, 16, '#f0ece4');
      m.top(0.04, 0.96, 0.12, 0.88, 16, '#c9ced6');
      for (const a of [0.05, 0.36, 0.67]) m.face(a, a + 0.28, 2, 14, 0.901, '#e6dfd2');
      m.top(0.12, 0.3, 0.3, 0.7, 16.1, '#2b2f3b');
      m.top(0.6, 0.85, 0.3, 0.7, 16.1, '#8fd3ff');
    },
  },
  // ── 방송
  ring_light: { h: 38, draw: (m) => { m.box(0.42, 0.58, 0.42, 0.58, 0, 1.5, '#333844'); m.box(0.48, 0.52, 0.48, 0.52, 1.5, 24, '#7a8290', false); m.icon('ring_light', 0.5, 0.5, 22, 1.8); m.glow(0.5, 0.5, 30, 12, 'rgba(255,255,255,0.35)'); } },
  broadcast_cam: { h: 32, draw: (m) => { m.icon('broadcast_cam', 0.5, 0.5, 4, 2.4); } },
  chroma_key: { h: 40, draw: (m) => { m.box(0.04, 0.96, 0.08, 0.16, 0, 40, '#2e8b57'); m.face(0.06, 0.94, 0, 40, 0.161, '#3cb371'); } },
  // ── 과학
  telescope: { h: 34, draw: (m) => m.icon('telescope', 0.5, 0.5, 2, 2.6) },
  planet_model: { h: 32, draw: (m) => { m.box(0.3, 0.7, 0.3, 0.7, 0, 12, WOOD_D); m.icon('planet_model', 0.5, 0.5, 10, 2); } },
  anatomy_model: { h: 32, draw: (m) => { m.box(0.3, 0.7, 0.3, 0.7, 0, 6, '#7a8290'); m.icon('anatomy_model', 0.5, 0.5, 6, 2.4); } },
  globe: { h: 32, draw: (m) => { m.box(0.25, 0.75, 0.25, 0.75, 0, 14, WOOD); m.icon('globe', 0.5, 0.5, 14, 2); } },
  // ── 장식 / 휴식
  plant: { h: 30, draw: (m) => { m.box(0.3, 0.7, 0.3, 0.7, 0, 8, '#c8643c'); m.icon('plant', 0.5, 0.5, 4, 2.6); } },
  aroma_diffuser: { h: 26, draw: (m, _id, t) => { m.box(0.3, 0.7, 0.3, 0.7, 0, 10, WOOD); m.icon('aroma_diffuser', 0.5, 0.5, 10, 1.6); m.glow(0.5, 0.5, 26 + (t / 200) % 6, 6, 'rgba(220,200,255,0.4)'); } },
  led_lamp: {
    h: 32,
    draw: (m) => {
      m.box(0.38, 0.62, 0.38, 0.62, 0, 2, '#333844');
      m.box(0.47, 0.53, 0.47, 0.53, 2, 24, '#7a8290', false);
      m.box(0.3, 0.7, 0.3, 0.7, 24, 30, '#ffd84d');
      m.glow(0.5, 0.5, 20, 16, 'rgba(255,230,140,0.35)');
    },
  },
  toy_box: { h: 22, draw: (m) => { chest(m, '#ff8fc0', '#ffb3d1', false); m.icon('toy_box', 0.5, 0.5, 13, 1.3); } },
  treasure_chest: { h: 18, draw: (m) => chest(m, '#c8402e', '#e04a35', true) },
};

function bed(m: Model, frame: string, blanket: string, fluffy = false) {
  m.box(0.04, 0.96, 0.02, 0.98, 0, 6, frame);
  m.box(0.04, 0.96, 0.02, 0.14, 0, 16, frame);
  m.box(0.08, 0.92, 0.12, 0.96, 6, fluffy ? 11 : 9.5, '#ffffff');
  m.box(0.2, 0.8, 0.15, 0.34, fluffy ? 11 : 9.5, fluffy ? 14 : 12, '#f4f4f4');
  m.box(0.07, 0.93, 0.42, 0.97, 6, fluffy ? 12 : 10.5, blanket);
  m.top(0.07, 0.93, 0.42, 0.5, fluffy ? 12 : 10.5, shade(blanket, 0.25));
}

function chest(m: Model, body: string, lid: string, gold: boolean) {
  m.box(0.1, 0.9, 0.2, 0.85, 0, 9, body);
  m.box(0.08, 0.92, 0.18, 0.87, 9, 13, lid);
  if (gold) {
    for (const a of [0.2, 0.74]) m.face(a, a + 0.06, 0, 13, 0.871, '#ffd84d');
    m.face(0.45, 0.55, 6, 11, 0.872, '#ffd84d');
  }
}

export function modelHeight(id: string): number {
  return MODELS[id]?.h ?? 24;
}

export function hasModel(id: string): boolean {
  return !!MODELS[id];
}

/** 가구 모델 그리기. 모델이 없는 가구는 false 반환(호출측이 기본 박스로 그림) */
export function drawFurnitureModel(
  ctx: CanvasRenderingContext2D,
  proj: Proj,
  p: Pick<PlacedFurniture, 'furnitureId' | 'gridX' | 'gridY' | 'rotation'>,
  t: number,
): boolean {
  const model = MODELS[p.furnitureId];
  if (!model) return false;
  const cells = footprint(p);
  const r = {
    x0: Math.min(...cells.map((c) => c.x)),
    y0: Math.min(...cells.map((c) => c.y)),
    x1: Math.max(...cells.map((c) => c.x)) + 1,
    y1: Math.max(...cells.map((c) => c.y)) + 1,
  };
  const front = p.rotation === 90 || p.rotation === 270 ? 'R' : 'L';
  // 바닥 그림자
  const [a, b, c, d] = [proj(r.x0 + 0.1, r.y0 + 0.1), proj(r.x1 - 0.05, r.y0 + 0.1), proj(r.x1 - 0.05, r.y1 - 0.05), proj(r.x0 + 0.1, r.y1 - 0.05)];
  poly(ctx, [a, b, c, d].map(([x, y]) => [x + 2, y + 1] as Pt), 'rgba(60,30,10,0.18)');
  model.draw(new Model(ctx, proj, r, front), p.furnitureId, t);
  return true;
}
