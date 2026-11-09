import { describe, expect, it } from 'vitest';
import { SPECIAL_DAYS, SPECIAL_MAP } from '../data/specialDays';
import { resolveSpecial } from '../engine/specialDay';
import { createNewGame, runMonth, type SaveState } from '../engine/simulation';

describe('특별한 하루', () => {
  it('데이터: 결과 수가 마지막 단계와 맞음', () => {
    for (const d of SPECIAL_DAYS) {
      const last = d.steps[d.steps.length - 1];
      expect(d.results.length, d.id).toBe(last.kind === 'pick' ? last.options.length : 3);
    }
  });

  it('12년 동안 조용한 달에 2~3달 간격으로, 같은 단계에 중복 없이', () => {
    let s: SaveState = createNewGame('특별', 'SON', 'INT');
    const seen: { id: string; age: number; month: number }[] = [];
    let rng = 7;
    const r = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
    for (let m = 0; m < 144; m++) {
      s.monthlySchedule = ['EDU_01', 'REST_01', 'EDU_01', 'REST_01'];
      const out = runMonth(s, r);
      s = out.state;
      if (out.ending) break;
      s.pendingEvent = null;
      s.pendingCutscene = null;
      s.pendingBirthday = false;
      s.pendingUnlock = null;
      if (s.pendingSpecial) {
        seen.push({ id: s.pendingSpecial, age: s.age, month: s.month });
        const res = resolveSpecial(s, { picks: [0, 0, 0, 0], score: 5, tier: 1 });
        expect(res).not.toBeNull();
        expect(s.pendingSpecial).toBeNull();
      }
    }
    expect(seen.length).toBeGreaterThanOrEqual(30);
    for (let i = 1; i < seen.length; i++) {
      const gap = (seen[i].age - seen[i - 1].age) * 12 + seen[i].month - seen[i - 1].month;
      expect(gap).toBeGreaterThanOrEqual(2);
    }
    for (const e of seen) {
      const d = SPECIAL_MAP[e.id];
      expect(e.age).toBeGreaterThanOrEqual(d.minAge);
      expect(e.age).toBeLessThanOrEqual(d.maxAge);
      if (d.months) expect(d.months).toContain(e.month);
      expect([5, 10, 12]).not.toContain(e.month); // 대회 달 제외
    }
    expect(new Set(s.specialSeen).size).toBe(s.specialSeen!.length);
  });
});

import { SCHEDULE_ACTIONS } from '../data/scheduleData';
import { sceneBeats } from '../data/activityScenes';
import type { WeekResult } from '../engine/simulation';

describe('스케줄 장면 대사', () => {
  it('바깥 활동은 모두 그 장소 전용 대사가 있음 (공통 대사로 빠지지 않음)', () => {
    for (const a of SCHEDULE_ACTIONS) {
      if (a.id === 'REST_01') continue;
      for (let week = 0; week < 4; week++) {
        const w = { week, actionId: a.id, actionType: a.type, outcome: 'SUCCESS' } as unknown as WeekResult;
        const mid = sceneBeats(w)[1];
        expect(mid, a.id).not.toBe('열심히 하는 중!');
        if (a.id === 'EDU_07' || a.id === 'EDU_05' || a.id === 'EDU_06') expect(mid, a.id).not.toMatch(/받아 적|문제를 풀|손을 번쩍/);
      }
    }
  });
});
