import { COMBOS, FURNITURE_MAP } from '../data/furnitureData';
import type { AptitudeKey, CharacterStats, FurnitureCategory, PlacedFurniture, StatKey } from '../types/game';

export type Cell = { x: number; y: number };

/** 가구 1개가 차지하는 타일 목록 (회전 90/270이면 가로세로 교체) */
export function footprint(p: Pick<PlacedFurniture, 'furnitureId' | 'gridX' | 'gridY' | 'rotation'>): Cell[] {
  const def = FURNITURE_MAP[p.furnitureId];
  const swap = p.rotation === 90 || p.rotation === 270;
  const w = swap ? def.height : def.width;
  const h = swap ? def.width : def.height;
  const cells: Cell[] = [];
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) cells.push({ x: p.gridX + dx, y: p.gridY + dy });
  return cells;
}

export function canPlace(
  placed: PlacedFurniture[],
  roomSize: number,
  candidate: Pick<PlacedFurniture, 'furnitureId' | 'gridX' | 'gridY' | 'rotation'>,
  ignoreInstanceId?: string,
): boolean {
  const cells = footprint(candidate);
  if (cells.some((c) => c.x < 0 || c.y < 0 || c.x >= roomSize || c.y >= roomSize)) return false;
  const taken = new Set(
    placed.filter((p) => p.instanceId !== ignoreInstanceId).flatMap((p) => footprint(p).map((c) => `${c.x},${c.y}`)),
  );
  return cells.every((c) => !taken.has(`${c.x},${c.y}`));
}

/** 빈 자리 자동 탐색 (상점 구매 시 사용) */
export function findFreeSpot(placed: PlacedFurniture[], roomSize: number, furnitureId: string): Cell | null {
  for (let y = 0; y < roomSize; y++)
    for (let x = 0; x < roomSize; x++)
      if (canPlace(placed, roomSize, { furnitureId, gridX: x, gridY: y, rotation: 0 })) return { x, y };
  return null;
}

/** 두 가구 사이 최소 맨해튼 거리 */
function manhattan(a: PlacedFurniture, b: PlacedFurniture): number {
  let best = Infinity;
  for (const ca of footprint(a)) for (const cb of footprint(b)) best = Math.min(best, Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y));
  return best;
}

/** 두 가구 사이 최소 체비셰프 거리 (상하좌우/대각선 반경) */
function chebyshev(a: PlacedFurniture, b: PlacedFurniture): number {
  let best = Infinity;
  for (const ca of footprint(a)) for (const cb of footprint(b)) best = Math.min(best, Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y)));
  return best;
}

export const COMBO_DISTANCE = 2;

/**
 * 콤보 판정: 필요 가구 3종이 맨해튼 거리 2 이내로 서로 연결(체인)되어 있으면 활성.
 * 반환: 활성 콤보 ID와 콤보에 참여한 가구 instanceId 목록
 */
export function computeActiveCombos(placed: PlacedFurniture[]): { comboIds: string[]; members: Record<string, string[]> } {
  const comboIds: string[] = [];
  const members: Record<string, string[]> = {};
  for (const combo of COMBOS) {
    const [ia, ib, ic] = combo.requiredFurnitureIds.map((id) => placed.filter((p) => p.furnitureId === id));
    let found: string[] | null = null;
    outer: for (const a of ia)
      for (const b of ib)
        for (const c of ic) {
          const ab = manhattan(a, b) <= COMBO_DISTANCE;
          const bc = manhattan(b, c) <= COMBO_DISTANCE;
          const ac = manhattan(a, c) <= COMBO_DISTANCE;
          if ((ab && bc) || (ab && ac) || (bc && ac)) {
            found = [a.instanceId, b.instanceId, c.instanceId];
            break outer;
          }
        }
    if (found) {
      comboIds.push(combo.id);
      members[combo.id] = found;
    }
  }
  return { comboIds, members };
}

export interface AuraResult {
  target: PlacedFurniture | null;
  stats: Partial<CharacterStats>;
  aptitude: Partial<Record<AptitudeKey, number>>;
  stressReduction: number;
}

/**
 * 행동 대상 가구(카테고리 일치) 선택 후, 대상 가구 자신 + 반경 1칸(대각선 포함) 가구의 오라 합산.
 * 대상 후보가 여럿이면 오라 합이 가장 큰 가구를 선택.
 */
export function computeAura(placed: PlacedFurniture[], category?: FurnitureCategory): AuraResult {
  const empty: AuraResult = { target: null, stats: {}, aptitude: {}, stressReduction: 0 };
  if (!category) return empty;
  const candidates = placed.filter((p) => FURNITURE_MAP[p.furnitureId].category === category);
  let best: AuraResult = empty;
  let bestScore = -1;
  for (const target of candidates) {
    const res: AuraResult = { target, stats: {}, aptitude: {}, stressReduction: 0 };
    for (const p of placed) {
      if (p.instanceId !== target.instanceId && chebyshev(p, target) > 1) continue;
      const def = FURNITURE_MAP[p.furnitureId];
      for (const [k, v] of Object.entries(def.auraBonus) as [StatKey, number][]) res.stats[k] = (res.stats[k] ?? 0) + v;
      for (const [k, v] of Object.entries(def.aptitudeBonus ?? {}) as [AptitudeKey, number][])
        res.aptitude[k] = (res.aptitude[k] ?? 0) + v;
      res.stressReduction += def.stressReductionBonus ?? 0;
    }
    const score =
      Object.values(res.stats).reduce((a, b) => a + (b ?? 0), 0) +
      Object.values(res.aptitude).reduce((a, b) => a + (b ?? 0), 0) +
      res.stressReduction;
    if (score > bestScore) {
      best = res;
      bestScore = score;
    }
  }
  return best;
}

export function roomSizeForAge(age: number): number {
  if (age >= 17) return 10;
  if (age >= 12) return 8;
  return 6;
}

export function growthStage(age: number) {
  if (age >= 17) return 'YOUTH' as const;
  if (age >= 12) return 'TEEN' as const;
  return 'CHILD' as const;
}
