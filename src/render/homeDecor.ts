import { shade } from './sprites';

/** 집 형편별 방 그림 (상류층·하류층·빈곤층). 중산층은 isoRenderer 기본 방. */
export type Pt = [number, number];
type PFn = (x: number, y: number, z?: number) => Pt;

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string, stroke?: string) {
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
/** 왼쪽 벽(x=0) 위 사각형: y 구간 × 높이 구간 */
const LW = (P: PFn, y0: number, y1: number, z0: number, z1: number): Pt[] => [P(0, y0, z0), P(0, y1, z0), P(0, y1, z1), P(0, y0, z1)];
/** 오른쪽 벽(y=0) 위 사각형 */
const RW = (P: PFn, x0: number, x1: number, z0: number, z1: number): Pt[] => [P(x0, 0, z0), P(x1, 0, z0), P(x1, 0, z1), P(x0, 0, z1)];
const dot = (ctx: CanvasRenderingContext2D, p: Pt, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(p[0]), Math.round(p[1]), w, h);
};
const line = (ctx: CanvasRenderingContext2D, pts: Pt[], c: string, w = 1) => {
  ctx.strokeStyle = c;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]);
  ctx.stroke();
};
const glow = (ctx: CanvasRenderingContext2D, p: Pt, r: number, c: string) => {
  const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
  g.addColorStop(0, c);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
};

const OUT = '#2a1a10';
const GOLD = '#d9b45a';
const GOLD_D = '#a8842f';

/* ═════════════ 💎 상류층: 에메랄드 다마스크 벽, 벽난로, 붙박이 책장, 프렌치 창 2개, 샹들리에 ═════════════ */
function richWalls(ctx: CanvasRenderingContext2D, n: number, P: PFn, WALL: number) {
  const paperL = '#24493f', paperR = '#2d5a4e';
  poly(ctx, LW(P, 0, n, 0, WALL), paperL);
  poly(ctx, RW(P, 0, n, 0, WALL), paperR);
  // 금색 다마스크 무늬 (마름모)
  for (let i = 0.25; i < n; i += 0.5)
    for (let z = 40; z < WALL - 12; z += 12) {
      const off = (Math.round(z / 12) % 2) * 0.25;
      if (i + off >= n) continue;
      for (const q of [P(0, i + off, z), P(i + off, 0, z)]) {
        dot(ctx, [q[0], q[1] - 2], 1, 1, 'rgba(217,180,90,.55)');
        dot(ctx, [q[0] - 1, q[1] - 1], 3, 1, 'rgba(217,180,90,.55)');
        dot(ctx, [q[0], q[1]], 1, 1, 'rgba(217,180,90,.55)');
      }
    }
  // 천장 몰딩
  poly(ctx, LW(P, 0, n, WALL - 8, WALL), '#f3ead6');
  poly(ctx, RW(P, 0, n, WALL - 8, WALL), '#fbf4e4');
  poly(ctx, LW(P, 0, n, WALL - 9, WALL - 7), GOLD);
  poly(ctx, RW(P, 0, n, WALL - 9, WALL - 7), GOLD);
  // 호두나무 징두리 + 금 패널
  const WZ = 32;
  poly(ctx, LW(P, 0, n, 0, WZ), '#4a2e1c');
  poly(ctx, RW(P, 0, n, 0, WZ), '#5a3922');
  for (let i = 0.15; i < n - 0.5; i += 1) {
    line(ctx, [...LW(P, i, i + 0.7, 5, WZ - 5), LW(P, i, i + 0.7, 5, WZ - 5)[0]], 'rgba(217,180,90,.6)');
    line(ctx, [...RW(P, i, i + 0.7, 5, WZ - 5), RW(P, i, i + 0.7, 5, WZ - 5)[0]], 'rgba(217,180,90,.6)');
  }
  poly(ctx, LW(P, 0, n, WZ, WZ + 3), GOLD);
  poly(ctx, RW(P, 0, n, WZ, WZ + 3), GOLD);
  poly(ctx, LW(P, 0, n, 0, 3), '#2e1c10');
  poly(ctx, RW(P, 0, n, 0, 3), '#3a2414');

  // ── 프렌치 창 2개 (오른쪽 벽) — 도시 전망
  const ww = Math.min(1.8, n * 0.2);
  const spots = n >= 8 ? [n * 0.3 - ww / 2, n * 0.72 - ww / 2] : [n * 0.5 - ww / 2];
  const zb = 22, zt = WALL - 14;
  for (const w0 of spots) {
    const w1 = w0 + ww;
    poly(ctx, RW(P, w0 - 0.1, w1 + 0.1, zb - 3, zt + 5), '#fbf4e4', OUT);
    const sky = ctx.createLinearGradient(0, P(w0, 0, zt)[1], 0, P(w0, 0, zb)[1]);
    sky.addColorStop(0, '#6fa8e0');
    sky.addColorStop(1, '#f5d9b8');
    poly(ctx, RW(P, w0, w1, zb, zt), sky as unknown as string);
    // 고층 빌딩 스카이라인
    const bld = [0.3, 0.55, 0.4, 0.7, 0.35, 0.5];
    for (let k = 0; k < 6; k++) {
      const x0 = w0 + (ww * k) / 6, x1 = x0 + ww / 6 - 0.03;
      const h = zb + (zt - zb) * bld[(k + Math.round(w0)) % 6];
      poly(ctx, RW(P, x0, x1, zb, h), k % 2 ? '#7a8fb5' : '#8ea1c4');
      for (let z = zb + 4; z < h - 3; z += 5) dot(ctx, P(x0 + 0.06, 0, z), 1, 1, '#ffe9a0');
    }
    // 창살 (십자)
    const wm = (w0 + w1) / 2;
    poly(ctx, RW(P, wm - 0.03, wm + 0.03, zb, zt), '#fbf4e4');
    poly(ctx, RW(P, w0, w1, (zb + zt) / 2 - 1, (zb + zt) / 2 + 1), '#fbf4e4');
    // 버건디 드레이프 + 금 끈
    for (const [c0, c1] of [[w0 - 0.4, w0 + 0.1], [w1 - 0.1, w1 + 0.4]]) {
      poly(ctx, [P(c0, 0, 6), P(c1, 0, 8), P(c1, 0, zt + 8), P(c0, 0, zt + 8)], '#7a1f2e', OUT);
      for (let f = 0.1; f < c1 - c0; f += 0.15) poly(ctx, RW(P, c0 + f, c0 + f + 0.04, 8, zt + 8), '#5e1522');
      poly(ctx, RW(P, c0, c1, 40, 43), GOLD);
    }
    poly(ctx, RW(P, w0 - 0.5, w1 + 0.5, zt + 2, zt + 10), '#8e2738', OUT);
    poly(ctx, RW(P, w0 - 0.5, w1 + 0.5, zt + 2, zt + 4), GOLD);
  }

  // ── 벽난로 (왼쪽 벽)
  const f0 = Math.min(1.0, n * 0.12), f1 = f0 + 1.7;
  poly(ctx, LW(P, f0, f1, 0, 34), '#ece5d8', OUT);
  poly(ctx, LW(P, f0 + 0.3, f1 - 0.3, 2, 22), '#1e130c', OUT);
  // 불꽃
  const fm = (f0 + f1) / 2;
  poly(ctx, [P(0, fm - 0.4, 3), P(0, fm + 0.4, 3), P(0, fm + 0.2, 12), P(0, fm, 17), P(0, fm - 0.25, 11)], '#ff7a2a');
  poly(ctx, [P(0, fm - 0.2, 3), P(0, fm + 0.2, 3), P(0, fm + 0.08, 9), P(0, fm, 12), P(0, fm - 0.1, 8)], '#ffd84d');
  glow(ctx, P(0, fm, 10), 28, 'rgba(255,150,60,.35)');
  poly(ctx, LW(P, f0 - 0.15, f1 + 0.15, 34, 38), '#d9d0c0', OUT);
  // 벽난로 위 초상화 (금 액자)
  poly(ctx, LW(P, f0 + 0.25, f1 - 0.25, 46, 80), GOLD, OUT);
  poly(ctx, LW(P, f0 + 0.33, f1 - 0.33, 49, 77), '#3d2a3a');
  poly(ctx, LW(P, fm - 0.28, fm + 0.28, 49, 66), '#e8c6a0');
  poly(ctx, LW(P, fm - 0.45, fm + 0.45, 49, 56), '#5b3a52');
  // 벽 촛대 조명
  for (const y of [f0 - 0.35, f1 + 0.35]) {
    poly(ctx, LW(P, y - 0.06, y + 0.06, 52, 60), GOLD_D);
    dot(ctx, P(0, y, 64), 2, 3, '#fff6c8');
    glow(ctx, P(0, y, 62), 14, 'rgba(255,230,150,.35)');
  }
  // ── 붙박이 책장 (왼쪽 벽)
  const b0 = f1 + 0.7, b1 = Math.min(n - 1.3, b0 + 2);
  if (b1 - b0 > 0.8) {
    poly(ctx, LW(P, b0, b1, 0, WALL - 12), '#3e2616', OUT);
    const cols = ['#a33246', '#2f5d8a', '#d9b45a', '#3a7a5a', '#7a4a8a', '#c86a3a'];
    for (let z = 6; z < WALL - 18; z += 16) {
      poly(ctx, LW(P, b0 + 0.06, b1 - 0.06, z, z + 13), '#2a180c');
      for (let y = b0 + 0.1, k = 0; y < b1 - 0.12; y += 0.13, k++) poly(ctx, LW(P, y, y + 0.1, z, z + 9 + (k % 3)), cols[(k + z) % 6]);
      poly(ctx, LW(P, b0, b1, z - 2, z), '#5a3922');
    }
  }
  // ── 문: 높은 호두나무 패널 문
  const d0 = n - 1.0, d1 = n - 0.12;
  poly(ctx, LW(P, d0, d1, 0, 60), '#2e1c10', OUT);
  poly(ctx, LW(P, d0 + 0.06, d1 - 0.06, 0, 57), '#5a3922');
  poly(ctx, LW(P, d0 + 0.14, d1 - 0.14, 32, 52), '#4a2e1c', GOLD_D);
  poly(ctx, LW(P, d0 + 0.14, d1 - 0.14, 6, 26), '#4a2e1c', GOLD_D);
  dot(ctx, P(0, d1 - 0.2, 29), 2, 2, GOLD);

  // ── 크리스털 샹들리에
  const c = P(n * 0.5, n * 0.5, WALL + 4);
  line(ctx, [[c[0], c[1] - 90], [c[0], c[1] - 30]], GOLD_D);
  glow(ctx, [c[0], c[1] - 24], 40, 'rgba(255,235,170,.28)');
  poly(ctx, [[c[0] - 16, c[1] - 30], [c[0] + 16, c[1] - 30], [c[0] + 10, c[1] - 22], [c[0] - 10, c[1] - 22]], GOLD, OUT);
  poly(ctx, [[c[0] - 9, c[1] - 22], [c[0] + 9, c[1] - 22], [c[0], c[1] - 12]], '#e8f4ff', OUT);
  for (const dx of [-14, -7, 0, 7, 14]) {
    dot(ctx, [c[0] + dx - 1, c[1] - 36], 2, 5, '#fff6c8');
    dot(ctx, [c[0] + dx, c[1] - 20], 1, 4, '#cfe8ff');
  }
}

function richFloor(ctx: CanvasRenderingContext2D, n: number, P: PFn) {
  // 호두나무 헤링본: 반 칸마다 결 방향을 엇갈림
  for (let x = 0; x < n * 2; x++)
    for (let y = 0; y < n * 2; y++) {
      const a = (x + y) % 2 === 0;
      const X = x / 2, Y = y / 2;
      poly(ctx, [P(X, Y), P(X + 0.5, Y), P(X + 0.5, Y + 0.5), P(X, Y + 0.5)], a ? '#7a4a2c' : '#8c5834');
      const [p0, p1] = a ? [P(x / 2, y / 2 + 0.25), P(x / 2 + 0.5, y / 2 + 0.25)] : [P(x / 2 + 0.25, y / 2), P(x / 2 + 0.25, y / 2 + 0.5)];
      line(ctx, [p0, p1], 'rgba(40,20,10,.35)');
    }
  // 광택
  ctx.save();
  ctx.globalAlpha = 0.1;
  poly(ctx, [P(n * 0.2, 0), P(n * 0.45, 0), P(n * 0.7, n * 0.4), P(n * 0.45, n * 0.4)], '#ffffff');
  ctx.restore();
  // 페르시안 카펫
  const c0 = Math.round(n * 0.28), c1 = Math.round(n * 0.78);
  poly(ctx, [P(c0, c0), P(c1, c0), P(c1, c1), P(c0, c1)], '#5e1522');
  poly(ctx, [P(c0 + 0.2, c0 + 0.2), P(c1 - 0.2, c0 + 0.2), P(c1 - 0.2, c1 - 0.2), P(c0 + 0.2, c1 - 0.2)], '#8e2738', GOLD);
  const m = (c0 + c1) / 2, r = (c1 - c0) / 2 - 0.6;
  poly(ctx, [P(m, m - r), P(m + r, m), P(m, m + r), P(m - r, m)], '#1f3f6a', GOLD);
  poly(ctx, [P(m, m - r / 2), P(m + r / 2, m), P(m, m + r / 2), P(m - r / 2, m)], GOLD);
  for (let k = c0 + 0.1; k < c1; k += 0.25) {
    dot(ctx, P(k, c1 + 0.05), 1, 2, '#f3ead6');
    dot(ctx, P(c1 + 0.05, k), 1, 2, '#f3ead6');
  }
}

/* ═════════════ 🧺 하류층: 민트 벽지 아파트, 알루미늄 샷시 창(앞 동 아파트), 벽걸이 에어컨, 시계 ═════════════ */
function workingWalls(ctx: CanvasRenderingContext2D, n: number, P: PFn, WALL: number) {
  poly(ctx, LW(P, 0, n, 0, WALL), '#c9ddd3');
  poly(ctx, RW(P, 0, n, 0, WALL), '#d7e9e0');
  // 도배지 이음새 + 작은 꽃무늬
  for (let i = 1; i < n; i += 1) {
    line(ctx, [P(0, i, 4), P(0, i, WALL)], 'rgba(60,90,80,.12)');
    line(ctx, [P(i, 0, 4), P(i, 0, WALL)], 'rgba(60,90,80,.12)');
  }
  for (let i = 0.5; i < n; i += 1)
    for (let z = 20; z < WALL - 6; z += 18) {
      dot(ctx, P(0, i, z), 2, 2, 'rgba(255,255,255,.6)');
      dot(ctx, P(i, 0, z + 9), 2, 2, 'rgba(255,255,255,.6)');
    }
  // 흰 PVC 걸레받이
  poly(ctx, LW(P, 0, n, 0, 5), '#eeeeea', '#b8bcb8');
  poly(ctx, RW(P, 0, n, 0, 5), '#f6f6f2', '#b8bcb8');

  // ── 알루미늄 샷시 창: 바로 앞 동 아파트가 보임
  const ww = Math.max(1.6, n * 0.3);
  const w0 = n / 2 - ww / 2, w1 = w0 + ww;
  const zb = 34, zt = WALL - 16;
  poly(ctx, RW(P, w0 - 0.08, w1 + 0.08, zb - 3, zt + 3), '#aeb5bd', OUT);
  poly(ctx, RW(P, w0, w1, zb, zt), '#bcdcf5');
  poly(ctx, RW(P, w0, w1, zb, zt - 6), '#d8cbb0'); // 앞 동 벽
  for (let x = w0 + 0.15; x < w1 - 0.2; x += 0.45)
    for (let z = zb + 4; z < zt - 10; z += 9) {
      poly(ctx, RW(P, x, x + 0.25, z, z + 5), '#5e7590');
      poly(ctx, RW(P, x, x + 0.25, z, z + 1), '#a9a08c'); // 난간
    }
  // 미닫이 두 짝 (겹친 샷시)
  const wm = (w0 + w1) / 2;
  poly(ctx, RW(P, wm - 0.06, wm + 0.06, zb, zt), '#9aa2ab', OUT);
  ctx.save();
  ctx.globalAlpha = 0.25;
  poly(ctx, RW(P, w0, wm, zb, zt), '#ffffff');
  ctx.restore();
  // 롤 블라인드 (반쯤 내림)
  poly(ctx, RW(P, w0 - 0.1, w1 + 0.1, zt - 10, zt + 6), '#7fa6d6', OUT);
  for (let z = zt - 8; z < zt + 5; z += 3) poly(ctx, RW(P, w0 - 0.1, w1 + 0.1, z, z + 1), '#6a90c0');
  line(ctx, [P(w1 - 0.1, 0, zt - 10), P(w1 - 0.1, 0, zt - 20)], '#ffffff');
  // 창틀 위 빨래 건조대 (집게에 양말)
  // 창 아래 라디에이터 대신 콘센트 + 멀티탭
  dot(ctx, P(w0 + 0.3, 0, 10), 3, 3, '#ffffff');

  // ── 벽걸이 에어컨 (왼쪽 벽 위)
  const a0 = 0.4, a1 = Math.min(n - 2, 2.1);
  poly(ctx, LW(P, a0, a1, WALL - 26, WALL - 10), '#fbfbf8', '#8a9098');
  poly(ctx, LW(P, a0 + 0.08, a1 - 0.08, WALL - 24, WALL - 22), '#c9ced4');
  for (let y = a0 + 0.15; y < a1 - 0.1; y += 0.12) dot(ctx, P(0, y, WALL - 22), 1, 1, '#9aa0a8');
  dot(ctx, P(0, a1 - 0.2, WALL - 14), 1, 1, '#5bd66b');
  // ── 둥근 벽시계
  const cl = P(0, Math.min(n - 1.8, 2.9), 62);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b3f4a';
  ctx.beginPath();
  ctx.ellipse(cl[0], cl[1], 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  line(ctx, [cl, [cl[0], cl[1] - 4]], '#1b1f3b');
  line(ctx, [cl, [cl[0] + 3, cl[1] + 1]], '#e5484d');
  // ── 벽걸이 달력
  if (n >= 6) {
    const k0 = 3.4, k1 = 4.0;
    poly(ctx, LW(P, k0, k1, 36, 56), '#ffffff', OUT);
    poly(ctx, LW(P, k0, k1, 50, 56), '#e5484d');
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) dot(ctx, P(0, k0 + 0.1 + q * 0.17, 46 - r * 4), 2, 1, '#9aa0b0');
  }
  // ── 문: 회색 방화문 + 레버 손잡이, 옷걸이 훅에 가방
  const d0 = n - 0.9, d1 = n - 0.12;
  poly(ctx, LW(P, d0, d1, 0, 50), '#7c838c', OUT);
  poly(ctx, LW(P, d0 + 0.06, d1 - 0.06, 0, 47), '#c4c9cf');
  poly(ctx, LW(P, d1 - 0.3, d1 - 0.12, 24, 26), '#5a6068');
  const hk = d0 - 0.4;
  poly(ctx, LW(P, hk - 0.06, hk + 0.06, 46, 48), '#5a6068');
  poly(ctx, [P(0, hk - 0.2, 46), P(0, hk + 0.2, 46), P(0, hk + 0.25, 30), P(0, hk - 0.25, 30)], '#d96a4a', OUT);
}

function workingFloor(ctx: CanvasRenderingContext2D, n: number, P: PFn) {
  // 노란 장판: 큰 시트, 은은한 얼룩무늬, 1칸마다 이음새
  poly(ctx, [P(0, 0), P(n, 0), P(n, n), P(0, n)], '#e6b96c');
  for (let k = 0; k < n * n * 3; k++) {
    const x = ((k * 0.618) % 1) * n, y = ((k * 0.382 + k * 0.13) % 1) * n;
    dot(ctx, P(x, y), 2, 1, 'rgba(170,110,40,.22)');
  }
  for (let i = 2; i < n; i += 2) line(ctx, [P(0, i), P(n, i)], 'rgba(150,100,40,.35)');
  // 장판 위 원형 러그 (분홍)
  const m = n * 0.55;
  ctx.fillStyle = '#f2a7b8';
  ctx.strokeStyle = '#c97a8e';
  const c = P(m, m);
  ctx.beginPath();
  ctx.ellipse(c[0], c[1], 22, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(c[0], c[1], 14, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/* ═════════════ 🕯️ 빈곤층: 반지하 — 콘크리트 벽, 드러난 배관, 높은 쪽창(바깥 발걸음), 빨랫줄, 곰팡이 ═════════════ */
function poorWalls(ctx: CanvasRenderingContext2D, n: number, P: PFn, WALL: number) {
  poly(ctx, LW(P, 0, n, 0, WALL), '#9d9a90');
  poly(ctx, RW(P, 0, n, 0, WALL), '#aaa79d');
  // 거친 콘크리트 질감
  for (let k = 0; k < n * 40; k++) {
    const t = (k * 0.618) % 1, z = ((k * 0.377) % 1) * WALL;
    dot(ctx, k % 2 ? P(0, t * n, z) : P(t * n, 0, z), 1, 1, k % 3 ? 'rgba(60,55,45,.18)' : 'rgba(255,255,255,.15)');
  }
  // 벗겨진 페인트 자국 (옛 벽지 조각)
  const patch = (pts: Pt[]) => poly(ctx, pts, '#d6ccb0', 'rgba(90,80,60,.35)');
  patch([P(0, 1.2, 40), P(0, 2.4, 44), P(0, 2.2, 66), P(0, 1.6, 70), P(0, 1.0, 58)]);
  patch([P(n * 0.6, 0, 30), P(n * 0.6 + 1.1, 0, 26), P(n * 0.6 + 1.3, 0, 48), P(n * 0.6 + 0.3, 0, 52)]);
  // 올라오는 습기 (바닥 쪽 얼룩)
  const damp = (pts: Pt[]) => {
    const g = ctx.createLinearGradient(0, pts[0][1], 0, pts[3][1]);
    g.addColorStop(0, 'rgba(70,60,40,.35)');
    g.addColorStop(1, 'rgba(70,60,40,0)');
    poly(ctx, pts, g as unknown as string);
  };
  damp(LW(P, 0, n, 0, 26));
  damp(RW(P, 0, n, 0, 26));
  // 곰팡이 (위 모서리)
  for (let k = 0; k < 26; k++) {
    const r = (k * 0.37) % 1, z = WALL - 4 - ((k * 7) % 20);
    dot(ctx, k % 2 ? P(0, r * 1.2, z) : P(r * 1.2, 0, z), 2, 2, 'rgba(40,55,40,.55)');
  }
  // 걸레받이 없음, 대신 금 간 모서리
  line(ctx, [P(n - 1.5, 0, WALL), P(n - 1.7, 0, WALL - 10), P(n - 1.55, 0, WALL - 18), P(n - 1.8, 0, WALL - 30)], 'rgba(40,35,30,.6)');
  line(ctx, [P(0, 2.8, 0), P(0, 3.0, 10), P(0, 2.85, 18)], 'rgba(40,35,30,.6)');

  // ── 높은 쪽창 (반지하): 바깥은 길바닥, 지나가는 발
  const ww = Math.max(1.4, n * 0.28);
  const w0 = n * 0.45 - ww / 2, w1 = w0 + ww;
  const zb = WALL - 34, zt = WALL - 10;
  poly(ctx, RW(P, w0 - 0.08, w1 + 0.08, zb - 3, zt + 3), '#5a5a5e', OUT);
  poly(ctx, RW(P, w0, w1, zb, zt), '#c7ccd2');
  poly(ctx, RW(P, w0, w1, zb, zb + 10), '#7d7a74'); // 길바닥 높이
  poly(ctx, RW(P, w0, w1, zb + 10, zb + 11), '#5e5b55');
  // 지나가는 신발 한 켤레
  poly(ctx, RW(P, w0 + ww * 0.3, w0 + ww * 0.3 + 0.18, zb + 11, zb + 18), '#3a3a48');
  poly(ctx, RW(P, w0 + ww * 0.3 + 0.24, w0 + ww * 0.3 + 0.42, zb + 11, zb + 16), '#3a3a48');
  poly(ctx, RW(P, w0 + ww * 0.3 - 0.04, w0 + ww * 0.3 + 0.22, zb + 11, zb + 13), '#1b1b22');
  // 잡초
  dot(ctx, P(w1 - 0.25, 0, zb + 13), 1, 3, '#5a8a45');
  dot(ctx, P(w1 - 0.2, 0, zb + 14), 1, 2, '#6fa055');
  // 방범 창살
  for (let x = w0 + 0.2; x < w1; x += 0.25) poly(ctx, RW(P, x - 0.02, x + 0.02, zb, zt), '#2f2f34');
  // 테이프로 붙인 금
  line(ctx, [P(w0 + 0.1, 0, zt - 2), P(w0 + 0.45, 0, zt - 9), P(w0 + 0.35, 0, zt - 16)], 'rgba(255,255,255,.9)');
  poly(ctx, RW(P, w0 + 0.15, w0 + 0.6, zt - 9, zt - 7), 'rgba(240,230,190,.9)');

  // ── 드러난 배관 (오른쪽 벽 위 가로 + 구석 세로)
  const pz = WALL - 6;
  poly(ctx, RW(P, 0, n, pz - 3, pz + 1), '#6d7078', '#3e4046');
  poly(ctx, RW(P, 0, n, pz, pz + 1), '#9a9da5');
  for (let x = 0.8; x < n; x += 1.5) poly(ctx, RW(P, x, x + 0.12, pz - 4, pz + 2), '#4a4c52');
  poly(ctx, [P(0.12, 0, 0), P(0.3, 0, 0), P(0.3, 0, pz), P(0.12, 0, pz)], '#6d7078', '#3e4046');
  // 녹물 자국
  const rj = n * 0.38;
  const g = ctx.createLinearGradient(0, P(rj, 0, pz - 3)[1], 0, P(rj, 0, pz - 40)[1]);
  g.addColorStop(0, 'rgba(150,80,30,.55)');
  g.addColorStop(1, 'rgba(150,80,30,0)');
  poly(ctx, RW(P, rj, rj + 0.18, pz - 40, pz - 3), g as unknown as string);

  // ── 빨랫줄 (왼쪽 벽): 양말·티셔츠
  const lz = WALL - 22;
  const y0 = 0.6, y1 = Math.min(n - 1.4, 3.6);
  line(ctx, [P(0, y0, lz), P(0, (y0 + y1) / 2, lz - 3), P(0, y1, lz)], '#e9e2cf');
  poly(ctx, [P(0, y0 + 0.5, lz - 1), P(0, y0 + 1.1, lz - 2), P(0, y0 + 1.0, lz - 16), P(0, y0 + 0.6, lz - 15)], '#8fb3c9', OUT);
  poly(ctx, [P(0, y0 + 1.5, lz - 3), P(0, y0 + 1.7, lz - 3), P(0, y0 + 1.75, lz - 11), P(0, y0 + 1.55, lz - 11)], '#e5d36a');
  poly(ctx, [P(0, y0 + 1.95, lz - 3), P(0, y0 + 2.15, lz - 3), P(0, y0 + 2.2, lz - 10), P(0, y0 + 2.0, lz - 10)], '#d97a7a');

  // ── 녹슨 철문
  const d0 = n - 0.9, d1 = n - 0.12;
  poly(ctx, LW(P, d0, d1, 0, 48), '#3e4a44', OUT);
  poly(ctx, LW(P, d0 + 0.06, d1 - 0.06, 0, 45), '#5f7a6a');
  for (const [y, z] of [[d0 + 0.2, 8], [d0 + 0.5, 20], [d0 + 0.3, 34], [d1 - 0.2, 4]] as const) dot(ctx, P(0, y, z), 3, 2, 'rgba(150,80,30,.7)');
  poly(ctx, LW(P, d1 - 0.25, d1 - 0.12, 22, 26), '#c9c9c9');
  // 신문지 붙인 벽 (외풍 막이)
  poly(ctx, LW(P, d0 - 1.0, d0 - 0.3, 30, 50), '#e9e2cf', 'rgba(90,80,60,.5)');
  for (let z = 33; z < 48; z += 3) dot(ctx, P(0, d0 - 0.9, z), 6, 1, 'rgba(90,90,90,.5)');

  // ── 알전구 하나
  const b = P(n * 0.55, n * 0.45, WALL + 2);
  line(ctx, [[b[0], b[1] - 66], [b[0], b[1] - 12]], '#2a2a2a');
  glow(ctx, [b[0], b[1] - 8], 26, 'rgba(255,220,140,.3)');
  dot(ctx, [b[0] - 2, b[1] - 12], 4, 5, '#ffe9a0');
}

function poorFloor(ctx: CanvasRenderingContext2D, n: number, P: PFn) {
  // 시멘트 바닥 + 금 + 낡은 장판 조각 + 물웅덩이
  poly(ctx, [P(0, 0), P(n, 0), P(n, n), P(0, n)], '#8f8b82');
  for (let k = 0; k < n * n * 4; k++) {
    const x = ((k * 0.618) % 1) * n, y = ((k * 0.414 + k * 0.07) % 1) * n;
    dot(ctx, P(x, y), 1, 1, k % 2 ? 'rgba(50,45,40,.25)' : 'rgba(255,255,255,.12)');
  }
  line(ctx, [P(n * 0.7, n * 0.2), P(n * 0.62, n * 0.35), P(n * 0.66, n * 0.5), P(n * 0.55, n * 0.68)], 'rgba(40,35,30,.55)');
  line(ctx, [P(n * 0.2, n * 0.8), P(n * 0.3, n * 0.72), P(n * 0.28, n * 0.6)], 'rgba(40,35,30,.55)');
  // 해진 장판 조각
  const a = n * 0.3, b = n * 0.75;
  poly(ctx, [P(a, a), P(b, a + 0.2), P(b - 0.2, b), P(a + 0.4, b - 0.1), P(a + 0.1, (a + b) / 2)], '#b69a68', 'rgba(80,60,30,.5)');
  for (let k = 0; k < 10; k++) dot(ctx, P(a + 0.4 + ((k * 0.7) % (b - a - 0.8)), a + 0.4 + ((k * 1.3) % (b - a - 0.8))), 2, 1, 'rgba(90,70,40,.35)');
  // 배관 아래 물웅덩이
  const w = P(n * 0.4, 0.5);
  ctx.fillStyle = 'rgba(150,190,220,.45)';
  ctx.beginPath();
  ctx.ellipse(w[0], w[1], 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ═════════════ 공용 ═════════════ */
export type AltHome = 'RICH' | 'WORKING' | 'POOR';

export function drawHomeWalls(ctx: CanvasRenderingContext2D, n: number, P: PFn, WALL: number, home: AltHome) {
  if (home === 'RICH') richWalls(ctx, n, P, WALL);
  else if (home === 'WORKING') workingWalls(ctx, n, P, WALL);
  else poorWalls(ctx, n, P, WALL);
}

export function drawHomeFloor(ctx: CanvasRenderingContext2D, n: number, P: PFn, home: AltHome) {
  if (home === 'RICH') richFloor(ctx, n, P);
  else if (home === 'WORKING') workingFloor(ctx, n, P);
  else poorFloor(ctx, n, P);
}

/** 벽 윗단·바닥 단면 색 */
export const SHELL: Record<'RICH' | 'MIDDLE' | 'WORKING' | 'POOR', { topL: string; topR: string; edge: string; endL: string; endR: string; slabL: string; slabR: string; lipL: string; lipR: string; out: string }> = {
  MIDDLE: { topL: '#9a6a40', topR: '#a8784a', edge: '#c8925a', endL: '#6b4226', endR: '#5a3820', slabL: '#7a4c2c', slabR: '#5a3820', lipL: '#9a6a40', lipR: '#7a4c2c', out: '#3b2414' },
  RICH: { topL: '#3e2616', topR: '#4a2e1c', edge: GOLD, endL: '#2e1c10', endR: '#24160c', slabL: '#3e2616', slabR: '#2e1c10', lipL: GOLD, lipR: GOLD_D, out: '#1a0f08' },
  WORKING: { topL: '#e4e6e2', topR: '#eef0ec', edge: '#ffffff', endL: '#c4c8c4', endR: '#b4b8b4', slabL: '#a9ada9', slabR: '#959995', lipL: '#d4d8d4', lipR: '#c4c8c4', out: '#5a5e5a' },
  POOR: { topL: '#7f7c74', topR: '#8a877f', edge: '#a3a098', endL: '#6a675f', endR: '#5d5a53', slabL: '#5d5a53', slabR: '#4e4b45', lipL: '#77746c', lipR: '#68655e', out: '#2e2c28' },
};

/** 방 뒤 배경색 (MainScreen) */
export const HOME_BACKDROP: Record<'RICH' | 'MIDDLE' | 'WORKING' | 'POOR', string> = {
  RICH: '#2f3557',
  MIDDLE: '#8fa88c',
  WORKING: '#a3b2bd',
  POOR: '#5d5b62',
};

/** 방 전체 조명 톤 (가구 그리기 전에 벽·바닥 위에) */
export function homeTone(ctx: CanvasRenderingContext2D, w: number, h: number, home: 'RICH' | 'MIDDLE' | 'WORKING' | 'POOR') {
  if (home !== 'POOR' && home !== 'RICH') return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop'; // 이미 그린 방 위에만
  ctx.fillStyle = home === 'POOR' ? 'rgba(30,32,50,.16)' : 'rgba(255,190,110,.06)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  void shade;
}
