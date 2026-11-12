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
    expect(seen.length).toBeGreaterThanOrEqual(16); // 명절 말고는 한 판에 한 번 → 한 해 1~2번
    expect(seen.filter((x) => x.age >= 14).length).toBeGreaterThanOrEqual(4); // 어린 시절에 몰리지 않고 청소년기에도 남아 있다
    for (let a = 8; a <= 19; a++) expect(seen.filter((x) => x.age === a).length).toBeLessThanOrEqual(2);
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

import { autoStopReason } from '../engine/simulation';

describe('연속 진행', () => {
  it('조용한 달은 계속, 대회·생일·이벤트가 생기면 멈춤', () => {
    let s = createNewGame('연속', 'SON', 'INT');
    s.gold = 5000;
    let rng = 3;
    const r = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
    let goes = 0;
    let stops = 0;
    for (let m = 0; m < 36; m++) {
      s.monthlySchedule = ['EDU_01', 'REST_01', 'EDU_01', 'REST_01'];
      const out = runMonth(s, r, { interactiveContest: true });
      const why = autoStopReason(out.state, out);
      if ([5, 6, 10, 11, 12, 1].includes(out.state.month)) expect(why).not.toBeNull(); // 대회 달 직전·직후
      if (out.state.month === 3 || out.state.month === 8) expect(why).toBeNull(); // 조용한 달
      if (why) stops++;
      else goes++;
      s = out.state;
      s.pendingEvent = null; s.pendingCutscene = null; s.pendingBirthday = false; s.pendingUnlock = null; s.pendingSpecial = null;
      s.pendingEmotion = null; s.pendingContest = null; s.pendingReport = false; s.pendingYearReview = false; s.gold = 5000; if (s.acting) s.acting.seen = true;
    }
    expect(goes).toBeGreaterThan(8);
    expect(stops).toBeGreaterThan(5);
  });
});
