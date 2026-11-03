import type { Cell } from '../engine/room';
import type { PlacedFurniture } from '../types/game';
import type { Facing } from './character';
import { blockedSet, lookDirection, nearestFreeCell, occupiedCells, pathToward } from './characterSim';

/** 반려묘 행동: 걷기 → 멈춰서 앉기/그루밍/기지개/식빵/잠 → 다시 걷기 */
export type CatPose = 'walk' | 'sit' | 'groom' | 'stretch' | 'loaf' | 'sleep';

export interface CatActor {
  gx: number;
  gy: number;
  facing: Facing;
  pose: CatPose;
}

const SPEED = 1.3; // 칸/초 (아이보다 느긋하게)
// 쉬는 동작별 비중과 지속 시간(ms)
const RESTS: { pose: CatPose; weight: number; min: number; max: number }[] = [
  { pose: 'sit', weight: 3, min: 2500, max: 5000 },
  { pose: 'groom', weight: 2, min: 2500, max: 4500 },
  { pose: 'stretch', weight: 1, min: 1200, max: 1800 },
  { pose: 'loaf', weight: 2, min: 4000, max: 8000 },
  { pose: 'sleep', weight: 2, min: 6000, max: 12000 },
];

export class CatSim {
  actor: CatActor = { gx: 5.5, gy: 1.5, facing: 'L', pose: 'loaf' };
  private path: Cell[] = [];
  private timer = 3000;

  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  private pickRest() {
    const total = RESTS.reduce((s, r) => s + r.weight, 0);
    let r = this.rng() * total;
    for (const rest of RESTS) {
      r -= rest.weight;
      if (r <= 0) return rest;
    }
    return RESTS[0];
  }

  /** 다른 캐릭터가 피해야 할 칸 */
  occupied(): Set<string> {
    return occupiedCells(this.actor.gx, this.actor.gy, this.path, 1);
  }

  /** 누르면 멈춰서 기지개를 켜거나 그루밍 */
  poke() {
    this.path = [];
    this.actor.pose = this.rng() < 0.5 ? 'stretch' : 'groom';
    this.timer = 2200;
  }

  /** avoid: 아이·부모님이 서 있거나 지나갈 칸 (고양이가 양보) */
  update(dt: number, n: number, placed: PlacedFurniture[], avoid: Set<string> = new Set()) {
    const a = this.actor;
    const blocked = blockedSet(placed);
    const cx = Math.floor(a.gx);
    const cy = Math.floor(a.gy);
    // 가구에 깔리거나 방 밖이면 가장 가까운 빈 칸으로
    if (cx >= n || cy >= n || blocked.has(`${cx},${cy}`)) {
      let best: Cell | null = null;
      let bestD = Infinity;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          if (blocked.has(`${x},${y}`)) continue;
          const d = Math.abs(x - cx) + Math.abs(y - cy);
          if (d < bestD) {
            bestD = d;
            best = { x, y };
          }
        }
      if (best) {
        a.gx = best.x + 0.5;
        a.gy = best.y + 0.5;
      }
      this.path = [];
    }

    // 가는 길이나 지금 자리에 사람이 오면 다른 곳으로 비켜감
    const here = `${Math.floor(a.gx)},${Math.floor(a.gy)}`;
    if ((this.path.length && avoid.has(`${this.path[0].x},${this.path[0].y}`)) || (!this.path.length && avoid.has(here))) {
      const spot = nearestFreeCell(n, placed, { x: Math.floor(a.gx), y: Math.floor(a.gy) }, avoid);
      this.path = spot ? pathToward(n, placed, { x: Math.floor(a.gx), y: Math.floor(a.gy) }, [spot], avoid) : [];
      if (!this.path.length) {
        a.pose = 'sit';
        return;
      }
    }

    if (this.path.length) {
      const next = this.path[0];
      const dx = next.x + 0.5 - a.gx;
      const dy = next.y + 0.5 - a.gy;
      const dist = Math.hypot(dx, dy);
      const step = (SPEED * dt) / 1000;
      const look = lookDirection(a.gx, a.gy, this.path);
      if (look.sdx > 0.3) a.facing = 'R';
      else if (look.sdx < -0.3) a.facing = 'L';
      a.pose = 'walk';
      if (dist <= step) {
        a.gx = next.x + 0.5;
        a.gy = next.y + 0.5;
        this.path.shift();
        if (!this.path.length) {
          // 도착 → 쉬는 동작 하나
          const rest = this.pickRest();
          a.pose = rest.pose;
          this.timer = rest.min + this.rng() * (rest.max - rest.min);
        }
      } else {
        a.gx += (dx / dist) * step;
        a.gy += (dy / dist) * step;
      }
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      // 근처(3칸 이내) 아무 곳으로 산책
      const goal = {
        x: Math.max(0, Math.min(n - 1, cx + Math.round((this.rng() - 0.5) * 6))),
        y: Math.max(0, Math.min(n - 1, cy + Math.round((this.rng() - 0.5) * 6))),
      };
      this.path = pathToward(n, placed, { x: cx, y: cy }, [goal], avoid);
      if (!this.path.length) this.timer = 1500;
    }
  }
}
