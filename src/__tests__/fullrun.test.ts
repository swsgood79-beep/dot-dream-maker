import { describe, expect, it } from 'vitest';
import { createNewGame, runMonth, type SaveState } from '../engine/simulation';
import { resolveParentingEvent } from '../engine/parenting';
import { resolveSpecial } from '../engine/specialDay';
import { resolveEmotion } from '../engine/emotion';
import { negotiate, preparePlan, planMode } from '../engine/negotiate';
import { buildReview, finishYear, goalOptions } from '../engine/yearReview';
import { pickEncounter, resolveEncounter, availableLocs } from '../engine/town';
import { SCHEDULE_ACTIONS } from '../data/scheduleData';

/** 처음 하는 사람처럼 아무거나 고르며 12년 → 모든 새 시스템이 오류 없이 엔딩까지 */
describe('무작위 플레이어 12년', () => {
  for (const seed of [11, 22, 33, 44]) {
    it(`seed ${seed}`, () => {
      let x = seed;
      const r = () => ((x = (x * 16807) % 2147483647) / 2147483647);
      let s: SaveState = createNewGame('초보', seed % 2 ? 'SON' : 'DAUGHTER', 'INT');
      for (let m = 0; m < 150; m++) {
        if (s.pendingYearReview) {
          const rv = buildReview(s);
          expect(rv.mirrors.length).toBeGreaterThan(0);
          const g = goalOptions(s);
          finishYear(s, r() < 0.7 ? g[Math.floor(r() * g.length)] : null);
        }
        if (s.pendingEvent) resolveParentingEvent(s, Math.floor(r() * 3));
        if (s.pendingSpecial) resolveSpecial(s, { picks: [0, 1, 0, 1], score: 5, tier: (Math.floor(r() * 3) as 0 | 1 | 2) });
        if (s.pendingEmotion) resolveEmotion(s, ['GOOD', r() < 0.5 ? 'GOOD' : 'LECTURE', 'GOOD', 'DIRECT'], false);
        s.pendingCutscene = null; s.pendingBirthday = false; s.pendingReport = false; s.pendingUnlock = null; s.pendingContest = null;
        if (r() < 0.5) {
          const locs = availableLocs(s);
          for (let k = 0; k < 3; k++) { const e = pickEncounter(s, locs[Math.floor(r() * locs.length)].id, r); resolveEncounter(s, e.id, Math.floor(r() * 2)); }
        }
        const acts = SCHEDULE_ACTIONS.filter((a) => a.minAge <= s.age);
        const mode = planMode(s.age);
        if (mode === 'PARENT') s.monthlySchedule = [0, 1, 2, 3].map(() => acts[Math.floor(r() * acts.length)].id) as SaveState['monthlySchedule'];
        else {
          preparePlan(s);
          if (mode === 'NEGOTIATE') {
            s.monthlySchedule[0] = acts[Math.floor(r() * acts.length)].id;
            s.negoHow = [r() < 0.5 ? 'FORCE' : 'ASK', 'ASK', 'ASK', 'ASK'];
            negotiate(s);
          } else s.support = (['FUND', 'CHEER', 'ADVICE', 'HEALTH'] as const)[Math.floor(r() * 4)];
        }
        const out = runMonth(s, r, { childPlans: true });
        s = out.state;
        for (const k of Object.keys(s.stats)) expect(Number.isFinite(s.stats[k as 'INT'])).toBe(true);
        if (out.ending) return;
      }
      throw new Error('엔딩에 도달하지 못함');
    });
  }
});
