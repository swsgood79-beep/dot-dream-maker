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
      if (e.npc !== 'GRANNY') {
        resolveEncounter(s, e.id, 0); // 실제 게임처럼 다른 장면도 겪고 지나간다
        continue;
      }
      if (e.milestone === 50) got50++;
      if (e.milestone === 100) expect(person(s, 'GRANNY').got).toContain(50);
      resolveEncounter(s, e.id, 0);
    }
    expect(got50).toBe(1);
    expect(person(s, 'GRANNY').rel).toBe(100);
    expect(person(s, 'GRANNY').got).toEqual([50, 100]);
  });
  it('같은 인사 장면이 연달아 나오지 않는다', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    s.age = 10;
    const ids: string[] = [];
    for (let i = 0; i < 30; i++) {
      const e = pickEncounter(s, 'MARKET', () => 0.01);
      ids.push(e.id);
      resolveEncounter(s, e.id, 1);
    }
    for (let i = 1; i < ids.length; i++) if (ids[i].startsWith('GR_')) expect(ids.slice(Math.max(0, i - 2), i)).not.toContain(ids[i]);
  });
  it('끝까지 친해진 사람은 가끔만 나온다 (같은 장면 반복 방지)', () => {
    const s = createNewGame('하나', 'DAUGHTER', 'INT');
    s.age = 10;
    s.people = { GRANNY: { rel: 100, got: [50, 100], met: true } };
    const ids: string[] = [];
    for (let i = 0; i < 40; i++) {
      const e = pickEncounter(s, 'MARKET', () => 0.01);
      ids.push(e.id);
      resolveEncounter(s, e.id, 0);
    }
    expect(ids.filter((x) => x.startsWith('GR_')).length).toBeLessThanOrEqual(5);
  });
});

import { peopleEnding } from '../engine/town';

describe('인연 엔딩', () => {
  it('만난 사람만, 깊은 사이 먼저, 글에 자리표시가 남지 않음', () => {
    const s = createNewGame('민준', 'SON', 'INT');
    s.people = { FRIEND: { rel: 100, met: true }, GRANNY: { rel: 40, met: true }, RIVAL: { rel: 10, met: true } };
    const list = peopleEnding(s, 'BIZ');
    expect(list.map((p) => p.npc)).toEqual(['FRIEND', 'GRANNY', 'RIVAL']);
    expect(list[0].later).toContain('첫 투자자');
    for (const p of list) expect(p.ceremony + p.later).not.toMatch(/[{}]|\(가\)|\(는\)|\(과\)/);
  });
});
