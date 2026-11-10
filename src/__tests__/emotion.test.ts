import { describe, expect, it } from 'vitest';
import { EMO_MAP, EMO_SCENES } from '../data/emotionData';
import { emoOptions, emoSteps, emoText, resolveEmotion, rollEmotion } from '../engine/emotion';
import { createNewGame, runMonth, type SaveState } from '../engine/simulation';

describe('감정 다루기', () => {
  it('나이대마다 평소·대회 진 날·파업한 날 장면이 있고, 단계마다 선택지 3개', () => {
    for (const st of ['CHILD', 'TEEN', 'YOUTH'] as const)
      for (const tr of ['RANDOM', 'CONTEST_LOSS', 'STRIKE'] as const) expect(EMO_SCENES.some((e) => e.stage === st && e.trigger === tr), `${st} ${tr}`).toBe(true);
    const s = createNewGame('민준', 'SON', 'INT');
    for (const e of EMO_SCENES)
      for (const step of emoSteps(e)) {
        const o = emoOptions(e, step, e.stage);
        expect(o.length).toBe(3);
        expect(o.filter((x) => x.pick === 'GOOD').length).toBe(1);
        for (const x of o) expect(emoText(s, x.text + x.reply), e.id).not.toMatch(/[{}]|\(가\)|\(를\)/);
      }
  });

  it('코칭을 고를수록 감정 조절력이 오르고, 흔한 반응만 고르면 내려감', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    s.pendingEmotion = 'EC_DRAWING';
    const r = resolveEmotion(s, ['GOOD', 'GOOD', 'GOOD', 'GOOD'], false)!;
    expect(r.eqAfter).toBeGreaterThan(r.eqBefore);
    expect(s.pendingEmotion).toBeNull();
    s.pendingEmotion = 'EC_TEASE';
    const r2 = resolveEmotion(s, ['DISMISS', 'LECTURE', 'DIRECT'], false)!;
    expect(r2.eqAfter).toBeLessThan(r2.eqBefore);
  });

  it('파업한 달에는 파업 장면, 평소엔 몇 달에 한 번', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    s.age = 13; s.month = 5;
    rollEmotion(s, 'STRIKE');
    expect(EMO_MAP[s.pendingEmotion!].trigger).toBe('STRIKE');
    expect(EMO_MAP[s.pendingEmotion!].stage).toBe('TEEN');

    let g: SaveState = createNewGame('특별', 'SON', 'INT');
    let n = 0;
    let rng = 11;
    const r = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
    for (let m = 0; m < 144; m++) {
      g.monthlySchedule = ['EDU_01', 'REST_01', 'EDU_01', 'REST_01'];
      const out = runMonth(g, r);
      g = out.state;
      if (out.ending) break;
      g.pendingEvent = null; g.pendingCutscene = null; g.pendingBirthday = false; g.pendingUnlock = null; g.pendingSpecial = null;
      if (g.pendingEmotion) {
        n++;
        resolveEmotion(g, ['GOOD', 'GOOD', 'GOOD'], false);
      }
    }
    expect(n).toBeGreaterThanOrEqual(15);
    expect(n).toBeLessThanOrEqual(45);
  });
});
