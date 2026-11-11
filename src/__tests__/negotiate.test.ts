import { describe, expect, it } from 'vitest';
import { childPlan, negotiate, planMode, preparePlan } from '../engine/negotiate';
import { createNewGame, runMonth } from '../engine/simulation';

describe('협상 · 자율 스케줄', () => {
  it('나이대별 방식', () => {
    expect(planMode(9)).toBe('PARENT');
    expect(planMode(13)).toBe('NEGOTIATE');
    expect(planMode(18)).toBe('AUTONOMY');
  });

  it('아이 계획: 4주, 나이에 맞는 활동, 지치면 쉬는 주 포함', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    s.age = 14;
    for (let m = 1; m <= 12; m++) {
      s.month = m;
      s.status.stress = 70;
      const p = childPlan(s);
      expect(p.length).toBe(4);
      expect(p).toContain('REST_01');
    }
  });

  it('그대로 두면 자기주도, 강제하면 반발·신뢰 하락', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    s.age = 13;
    preparePlan(s);
    const want = [...s.childWant!];
    s.monthlySchedule[0] = want[0] === 'EDU_01' ? 'EDU_07' : 'EDU_01';
    s.negoHow = ['FORCE', 'ASK', 'ASK', 'ASK'];
    const lines = negotiate(s);
    expect(lines[0].how).toBe('FORCE');
    expect(lines.slice(1).every((l) => l.how === 'OK')).toBe(true);
    expect(s.defiance).toBeGreaterThan(0);
    expect(s.forcedWeeks![0]).toBe(true);
    expect(s.ownWeeks!.slice(1).every(Boolean)).toBe(true);
  });

  it('자기주도 주는 능력치가 더 오름', () => {
    const base = createNewGame('하나', 'DAUGHTER', 'INT');
    base.age = 13; base.month = 4; base.gold = 9000;
    const a = structuredClone(base);
    const b = structuredClone(base);
    for (const g of [a, b]) g.monthlySchedule = ['EDU_01', 'EDU_01', 'EDU_01', 'EDU_01'];
    b.planFor = 99; b.childWant = [...b.monthlySchedule]; b.ownWeeks = [true, true, true, true]; b.negoDone = true;
    const one = () => 0.5;
    const ra = runMonth(a, one).state;
    const rb = runMonth(b, one).state;
    expect(rb.stats.INT).toBeGreaterThan(ra.stats.INT);
  });
});
