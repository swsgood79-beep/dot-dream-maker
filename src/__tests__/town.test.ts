import { describe, expect, it } from 'vitest';
import { LOCS, NPCS, TOWN_ENCS, type NpcId } from '../data/townData';
import { createNewGame } from '../engine/simulation';
import { availableLocs, person, pickEncounter, resolveEncounter, townNames, townText } from '../engine/town';

describe('주말 나들이', () => {
  it('사람마다 관계 단계 3개 + 보상 2개 만남이 있음', () => {
    for (const id of Object.keys(NPCS) as NpcId[]) {
      for (const t of [0, 1, 2]) expect(TOWN_ENCS.some((e) => e.npc === id && e.tier === t), `${id} ${t}`).toBe(true);
      for (const m of [50, 100]) expect(TOWN_ENCS.some((e) => e.npc === id && e.milestone === m), `${id} ${m}`).toBe(true);
    }
  });

  it('모든 나이·장소에서 만남이 생기고, 글에 {이름} 자리가 남지 않음', () => {
    for (const g of ['SON', 'DAUGHTER'] as const) {
      const s = createNewGame('민준', g, 'INT');
      const vars = townNames(s);
      for (let age = 8; age <= 19; age++) {
        s.age = age;
        for (const l of availableLocs(s)) {
          for (let k = 0; k < 15; k++) {
            const e = pickEncounter(s, l.id);
            expect(e, `${age} ${l.id}`).toBeTruthy();
            if (e.npc) expect(age).toBeGreaterThanOrEqual(NPCS[e.npc].minAge);
            const all = [e.title, e.text, ...(e.choices ?? []).flatMap((c) => [c.label, c.reply]), ...(e.results ?? []).map((r) => r.text)];
            for (const t of all) expect(townText(t, vars), t).not.toMatch(/[{}]|\(가\)|\(를\)|\(는\)|\(과\)/);
          }
        }
      }
    }
    expect(LOCS.filter((l) => l.minAge <= 8).length).toBeGreaterThanOrEqual(4);
  });

  it('관계가 쌓이면 50·100 보상이 순서대로 나오고 한 번씩만', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    s.age = 10;
    let got50 = 0;
    for (let i = 0; i < 60; i++) {
      const e = pickEncounter(s, 'MARKET', () => 0.01);
      if (e.npc !== 'GRANNY') continue;
      if (e.milestone === 50) got50++;
      if (e.milestone === 100) expect(person(s, 'GRANNY').got).toContain(50);
      resolveEncounter(s, e.id, 0);
    }
    expect(got50).toBe(1);
    expect(person(s, 'GRANNY').rel).toBe(100);
    expect(person(s, 'GRANNY').got).toEqual([50, 100]);
  });
});
