import { parentClass } from '../data/parentData';
import type { SaveState } from './simulation';

/**
 * 🏠 이벤트가 이 집 사정과 맞는지 (v0.44.3)
 * 가난한 집에서 거실 영화관 · 가족 차 드라이브가 나오거나, 컴퓨터도 없는데 밤새 게임하는 이벤트가 나오지 않게.
 */
export const homeClass = (s: SaveState) => parentClass(s.parent);
export const notPoor = (s: SaveState) => homeClass(s) !== 'POOR';
export const owns = (s: SaveState, ...ids: string[]) => ids.some((id) => s.collectedFurniture.includes(id));
/** 컴퓨터나 게임기가 있는지 (PC 가구 · 생일/크리스마스 게임기 선물) */
export const hasScreen = (s: SaveState) => owns(s, 'gaming_pc', 'dual_monitor', 'stock_monitor', 'broadcast_cam') || s.flags.includes('GOT_CONSOLE');
/** 알바를 해 본 적이 있는지 (집안일 돕기 제외) */
export const workedJobs = (s: SaveState) => Object.entries(s.actionCounts).filter(([k]) => k.startsWith('JOB_') && k !== 'JOB_01').reduce((a, [, v]) => a + v, 0);
