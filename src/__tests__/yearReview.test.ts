import { describe, expect, it } from 'vitest';
import { buildReview, finishYear, goalDone, goalOptions } from '../engine/yearReview';
import { createNewGame, runMonth, type SaveState } from '../engine/simulation';

describe('연말 성장 거울', () => {
  it('1년이 지나면 돌아보기 → 거울 · 상 · 새해 목표', () => {
    let s: SaveState = createNewGame('하나', 'DAUGHTER', 'INT');
    s.gold = 9000;
    let rng = 5;
    const r = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
    for (let m = 0; m < 12; m++) {
      s.monthlySchedule = ['EDU_01', 'REST_01', 'EDU_07', 'EDU_01'];
      s = runMonth(s, r).state;
      s.pendingEvent = null;
      s.pendingSpecial = null;
    }
    expect(s.age).toBe(9);
    expect(s.pendingYearReview).toBe(true);
    const rv = buildReview(s);
    expect(rv.age).toBe(8);
    expect(rv.statDelta.INT).toBeGreaterThan(0);
    expect(rv.mirrors.length).toBeGreaterThanOrEqual(1);
    expect(rv.award).toMatch(/상/);
    const goals = goalOptions(s);
    expect(goals.length).toBe(3);
    finishYear(s, goals[0]);
    expect(s.pendingYearReview).toBe(false);
    expect(s.yearGoal?.id).toBe(goals[0].id);
    expect(goalDone(s)).toBe(false);
    s.stats[goals[0].stat!] += 999;
    expect(goalDone(s)).toBe(true);
  });

  it('감정 코칭을 많이 하면 그 내용이 거울에 나옴', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    finishYear(s, null);
    s.emoLog = [{ age: 8, id: 'EC_TOY', good: 4, total: 4 }, { age: 8, id: 'EC_TEASE', good: 3, total: 3 }];
    s.eq = 60;
    const rv = buildReview(s);
    expect(rv.mirrors[0].icon).toBe('💗');
    expect(rv.mirrors[0].good).toBe(true);
  });
});
