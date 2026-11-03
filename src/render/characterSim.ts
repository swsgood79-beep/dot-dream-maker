import { footprint, type Cell } from '../engine/room';
import type { PlacedFurniture } from '../types/game';
import type { Facing, Pose } from './character';

/** 방 안을 돌아다니는 캐릭터의 위치/상태 + 스크립트 실행기 (렌더러와 분리된 순수 로직) */
export interface Actor {
  gx: number; // 그리드 좌표 (셀 중심 = 정수 + 0.5)
  gy: number;
  facing: Facing;
  /** 화면 위쪽(방 안쪽)으로 걸어가는 중이면 뒷모습 */
  back?: boolean;
  pose: Pose;
  alpha: number;
  /** 가구 위에 올라가 그릴 때 (예: 침대에서 잠자기) */
  drawAt?: { gx: number; gy: number; lift: number } | null;
}

export type Step =
  | { kind: 'goto'; resolve: (w: World) => Cell | null }
  | { kind: 'wait'; ms: number; pose: Pose; onStart?: () => void }
  | { kind: 'fade'; to: number; ms: number }
  | { kind: 'call'; fn: () => void };

export interface World {
  n: number;
  placed: PlacedFurniture[];
  /** 다른 캐릭터(아이·부모님·고양이)가 서 있거나 지나갈 칸 → 겹치지 않게 피함 */
  avoid?: Set<string>;
}

/** 지금 칸 + 앞으로 지나갈 몇 칸 + 도착 칸 (다른 캐릭터가 피할 칸) */
export function occupiedCells(gx: number, gy: number, path: Cell[], ahead = 2): Set<string> {
  const s = new Set<string>([`${Math.floor(gx)},${Math.floor(gy)}`]);
  path.slice(0, ahead).forEach((c) => s.add(key(c)));
  if (path.length) s.add(key(path[path.length - 1]));
  return s;
}

/** 다른 캐릭터와 겹쳤을 때 비켜설 가장 가까운 빈 칸 */
export function nearestFreeCell(n: number, placed: PlacedFurniture[], from: Cell, avoid: Set<string>): Cell | null {
  const blocked = blockedSet(placed);
  let best: Cell | null = null;
  let bestD = Infinity;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const k = `${x},${y}`;
      if (blocked.has(k) || avoid.has(k)) continue;
      const d = Math.abs(x - from.x) + Math.abs(y - from.y);
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  return best;
}

const SPEED = 2.6; // 칸/초
const key = (c: Cell) => `${c.x},${c.y}`;

export function blockedSet(placed: PlacedFurniture[]): Set<string> {
  const s = new Set<string>();
  for (const p of placed) for (const c of footprint(p)) s.add(key(c));
  return s;
}

/** BFS: start에서 갈 수 있는 모든 칸까지의 경로 맵 */
function bfs(n: number, blocked: Set<string>, start: Cell): Map<string, string | null> {
  const prev = new Map<string, string | null>([[key(start), null]]);
  const q: Cell[] = [start];
  while (q.length) {
    const c = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      const k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n || blocked.has(k) || prev.has(k)) continue;
      prev.set(k, key(c));
      q.push({ x: nx, y: ny });
    }
  }
  return prev;
}

function buildPath(prev: Map<string, string | null>, goal: string): Cell[] {
  const path: Cell[] = [];
  let k: string | null | undefined = goal;
  while (k) {
    const [x, y] = k.split(',').map(Number);
    path.unshift({ x, y });
    k = prev.get(k);
  }
  return path.slice(1); // 시작 칸 제외
}

/** 갈 수 있는 칸 중 target에 가장 가까운 칸으로의 경로 */
export function pathToward(n: number, placed: PlacedFurniture[], start: Cell, targets: Cell[], avoid?: Set<string>): Cell[] {
  const blocked = blockedSet(placed);
  avoid?.forEach((k) => blocked.add(k)); // 다른 캐릭터가 있는 칸도 피함
  blocked.delete(key(start));
  const prev = bfs(n, blocked, start);
  let best: string | null = null;
  let bestD = Infinity;
  for (const k of prev.keys()) {
    const [x, y] = k.split(',').map(Number);
    for (const t of targets) {
      const d = Math.abs(t.x - x) + Math.abs(t.y - y);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
  }
  if (!best) return [];
  const [gx, gy] = best.split(',').map(Number);
  // 지그재그(계단식) 대신 'ㄱ자' 경로를 우선: 한 방향으로 쭉 간 뒤 한 번만 꺾음 (막혀 있으면 BFS 경로)
  return straightPath(start, { x: gx, y: gy }, blocked) ?? buildPath(prev, best);
}

function straightPath(from: Cell, to: Cell, blocked: Set<string>): Cell[] | null {
  const tryOrder = (xFirst: boolean): Cell[] | null => {
    const path: Cell[] = [];
    let { x, y } = from;
    const stepX = () => {
      while (x !== to.x) {
        x += Math.sign(to.x - x);
        if (blocked.has(`${x},${y}`)) return false;
        path.push({ x, y });
      }
      return true;
    };
    const stepY = () => {
      while (y !== to.y) {
        y += Math.sign(to.y - y);
        if (blocked.has(`${x},${y}`)) return false;
        path.push({ x, y });
      }
      return true;
    };
    const ok = xFirst ? stepX() && stepY() : stepY() && stepX();
    return ok ? path : null;
  };
  // 더 긴 축을 먼저 가면 방향이 덜 바뀜
  const xFirst = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
  return tryOrder(xFirst) ?? tryOrder(!xFirst);
}

/**
 * 몸 방향: 바로 다음 칸이 아니라 2~3칸 앞을 기준으로 정하고, 애매하면 유지 (한 칸마다 휙휙 돌지 않게)
 * 반환: 화면 x(+ = 오른쪽), 화면 y(- = 위쪽/방 안쪽) 방향 성분
 */
export function lookDirection(gx: number, gy: number, path: Cell[]): { sdx: number; sdy: number } {
  const t = path[Math.min(2, path.length - 1)];
  const dx = t.x + 0.5 - gx;
  const dy = t.y + 0.5 - gy;
  return { sdx: dx - dy, sdy: dx + dy };
}

/** 가구 옆(상하좌우) 빈 칸 목록 — 이 칸들로 걸어가서 가구를 사용 */
export function besideCells(n: number, placed: PlacedFurniture[], target: PlacedFurniture): Cell[] {
  const blocked = blockedSet(placed);
  const out: Cell[] = [];
  for (const c of footprint(target))
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const cell = { x: c.x + dx, y: c.y + dy };
      if (cell.x < 0 || cell.y < 0 || cell.x >= n || cell.y >= n || blocked.has(key(cell))) continue;
      out.push(cell);
    }
  return out.length ? out : footprint(target);
}

/** 문 위치 (왼쪽 벽 앞쪽 끝) */
export const doorCell = (n: number): Cell => ({ x: 0, y: n - 1 });

export class CharacterSim {
  actor: Actor = { gx: 2.5, gy: 2.5, facing: 'R', pose: 'idle', alpha: 1 };
  private path: Cell[] = [];
  private queue: Step[] = [];
  private current: (Step & { elapsed: number; from?: number }) | null = null;
  private idleTimer = 1500;
  scripted = false;

  cell(): Cell {
    return { x: Math.floor(this.actor.gx), y: Math.floor(this.actor.gy) };
  }

  runScript(steps: Step[]) {
    this.queue = [...steps];
    this.current = null;
    this.path = [];
    this.scripted = true;
  }

  stopScript() {
    this.queue = [];
    this.current = null;
    this.path = [];
    this.scripted = false;
    this.actor.alpha = 1;
    this.actor.pose = 'idle';
    this.actor.drawAt = null;
  }

  private walkTo(w: World, goals: Cell[]) {
    this.path = pathToward(w.n, w.placed, this.cell(), goals, w.avoid);
    // 다른 캐릭터를 피해서는 갈 수 없으면 일단 가구만 피해서
    if (!this.path.length && w.avoid?.size) this.path = pathToward(w.n, w.placed, this.cell(), goals);
  }

  private waitMs = 0;

  /** 다른 캐릭터가 피해야 할 칸 */
  occupied(): Set<string> {
    return occupiedCells(this.actor.gx, this.actor.gy, this.path);
  }

  /** dt: ms */
  update(dt: number, w: World, rng: () => number = Math.random) {
    const a = this.actor;
    // 가구에 깔리면 가장 가까운 빈 칸으로 이동
    const blocked = blockedSet(w.placed);
    const c = this.cell();
    if (c.x >= w.n || c.y >= w.n || blocked.has(key(c))) {
      const free: Cell[] = [];
      for (let y = 0; y < w.n; y++) for (let x = 0; x < w.n; x++) if (!blocked.has(`${x},${y}`)) free.push({ x, y });
      free.sort((p, q) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) - (Math.abs(q.x - c.x) + Math.abs(q.y - c.y)));
      if (free[0]) {
        a.gx = free[0].x + 0.5;
        a.gy = free[0].y + 0.5;
      }
      this.path = [];
    }

    // 경로 이동
    if (this.path.length && w.avoid?.has(key(this.path[0]))) {
      // 바로 다음 칸에 다른 캐릭터가 있음 → 돌아가는 길을 찾고, 없으면 잠깐 기다림
      this.waitMs -= dt;
      if (this.waitMs <= 0) {
        const goal = this.path[this.path.length - 1];
        const detour = pathToward(w.n, w.placed, this.cell(), [goal], w.avoid);
        if (detour.length && !w.avoid.has(key(detour[0]))) this.path = detour;
        this.waitMs = 300;
      }
      if (w.avoid.has(key(this.path[0]))) {
        a.pose = 'idle';
        return;
      }
    }
    if (this.path.length) {
      const next = this.path[0];
      const tx = next.x + 0.5;
      const ty = next.y + 0.5;
      const dx = tx - a.gx;
      const dy = ty - a.gy;
      const dist = Math.hypot(dx, dy);
      const stepLen = (SPEED * dt) / 1000;
      const look = lookDirection(a.gx, a.gy, this.path);
      if (look.sdx > 0.3) a.facing = 'R';
      else if (look.sdx < -0.3) a.facing = 'L';
      if (look.sdy < -0.3) a.back = true; // 화면 위쪽(방 안쪽)으로 가는 중
      else if (look.sdy > 0.3) a.back = false;
      a.pose = 'walk';
      if (dist <= stepLen) {
        a.gx = tx;
        a.gy = ty;
        this.path.shift();
      } else {
        a.gx += (dx / dist) * stepLen;
        a.gy += (dy / dist) * stepLen;
      }
      return;
    }

    if (this.scripted) {
      this.runSteps(dt, w);
      return;
    }

    // 자유 행동 중 다른 캐릭터와 같은 칸(또는 그 캐릭터가 갈 길)에 서 있으면 비켜섬
    if (w.avoid?.has(key(this.cell()))) {
      const spot = nearestFreeCell(w.n, w.placed, this.cell(), w.avoid);
      if (spot) {
        this.walkTo(w, [spot]);
        if (this.path.length) return;
      }
    }
    // 자유 행동: 가끔 근처를 돌아다님
    a.pose = 'idle';
    this.idleTimer -= dt;
    if (this.idleTimer <= 0) {
      this.idleTimer = 2200 + rng() * 3000;
      const goal = { x: Math.floor(rng() * w.n), y: Math.floor(rng() * w.n) };
      this.walkTo(w, [goal]);
    }
  }

  private runSteps(dt: number, w: World) {
    const a = this.actor;
    if (!this.current) {
      const s = this.queue.shift();
      if (!s) {
        this.scripted = false;
        a.pose = 'idle';
        return;
      }
      this.current = { ...s, elapsed: 0, from: a.alpha };
      if (s.kind === 'goto') {
        const goal = s.resolve(w);
        if (goal) this.walkTo(w, [goal]);
        this.current = null;
        return;
      }
      if (s.kind === 'call') {
        s.fn();
        this.current = null;
        return;
      }
      if (s.kind === 'wait') {
        a.pose = s.pose;
        if (s.pose !== 'idle') a.back = false;
        s.onStart?.();
      }
    }
    const cur = this.current;
    cur.elapsed += dt;
    if (cur.kind === 'wait') {
      a.pose = cur.pose;
      if (cur.elapsed >= cur.ms) {
        this.current = null;
        a.drawAt = null;
      }
    } else if (cur.kind === 'fade') {
      const t = Math.min(1, cur.elapsed / cur.ms);
      a.alpha = (cur.from ?? 1) + (cur.to - (cur.from ?? 1)) * t;
      a.pose = 'walk';
      if (t >= 1) this.current = null;
    }
  }
}
