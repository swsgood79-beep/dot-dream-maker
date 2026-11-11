import { describe, expect, it } from 'vitest';
import { randomParent, PARENT_JOB_MAP, type ParentJobId } from '../data/parentData';
import { createNewGame, runMonth, type SaveState } from '../engine/simulation';
import { eligibleEvents } from '../engine/parenting';
import { eligibleSpecials } from '../engine/specialDay';

const poorJob = (Object.keys(PARENT_JOB_MAP) as ParentJobId[]).find((j) => PARENT_JOB_MAP[j].cls === 'POOR')!;
const richJob = (Object.keys(PARENT_JOB_MAP) as ParentJobId[]).find((j) => PARENT_JOB_MAP[j].cls === 'RICH')!;
const mk = (job: ParentJobId) => createNewGame('하나', 'DAUGHTER', 'INT', [], 0, undefined, false, { job, points: { ...PARENT_JOB_MAP[job].points } });
void randomParent;

describe('집 사정에 맞는 이벤트', () => {
  it('가난한 집: 거실 영화관 · 운전 · 캠핑 · 티켓팅 없음', () => {
    const s = mk(poorJob);
    for (const age of [9, 14, 18]) for (let m = 1; m <= 12; m++) {
      s.age = age; s.month = m; s.gold = 9999;
      const ids = eligibleSpecials(s).map((d) => d.id);
      for (const bad of ['SP_MOVIE_NIGHT', 'SP_DRIVE', 'SP_FIREFLY', 'SP_TICKETING']) expect(ids).not.toContain(bad);
    }
    const r = mk(richJob); r.age = 9; r.month = 6;
    expect(eligibleSpecials(r).map((d) => d.id)).toContain('SP_FIREFLY');
  });

  it('컴퓨터·게임기가 없으면 새벽 게임 이벤트 없음, 있으면 나옴', () => {
    const s: SaveState = mk(richJob);
    s.age = 13; s.month = 5;
    expect(eligibleEvents(s).map((e) => e.id)).not.toContain('T_LATE_GAME');
    s.collectedFurniture.push('gaming_pc');
    expect(eligibleEvents(s).map((e) => e.id)).toContain('T_LATE_GAME');
  });

  it('알바를 안 했으면 알바 가게 방문 없음', () => {
    const s = mk(richJob); s.age = 18; s.month = 5;
    expect(eligibleSpecials(s).map((d) => d.id)).not.toContain('SP_SECRET_VISIT');
    s.actionCounts.JOB_02 = 3;
    expect(eligibleSpecials(s).map((d) => d.id)).toContain('SP_SECRET_VISIT');
    void runMonth;
  });
});
