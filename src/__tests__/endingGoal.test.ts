import { describe, expect, it } from 'vitest';
import { ENDINGS, meetsEnding } from '../data/endingData';
import { endingChecklist, endingProgress, lackingStats } from '../engine/endingGoal';
import { createNewGame } from '../engine/simulation';

describe('엔딩 노리기', () => {
  it('모든 엔딩 조건이 한글 체크리스트로 나오고, 다 채우면 100%', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    for (const e of ENDINGS) {
      const items = endingChecklist(e, s);
      for (const c of items) {
        expect(c.label, e.id).not.toMatch(/undefined|APT_|INT|STR|ART|CHA|MOR|TEC/);
        expect(Number.isFinite(c.need)).toBe(true);
      }
      const p = endingProgress(e, s);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      if (meetsEnding(e, s)) expect(p).toBe(1);
    }
  });

  it('모자란 능력치', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    const e = ENDINGS.find((x) => x.minStats.INT && x.minStats.INT > 500)!;
    expect(lackingStats(e, s)).toContain('INT');
    s.stats.INT = 999;
    expect(lackingStats(e, s)).not.toContain('INT');
  });
});
