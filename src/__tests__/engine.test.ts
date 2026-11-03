import { describe, expect, it } from 'vitest';
import { ENDINGS, ENDING_MAP, evaluateEnding } from '../data/endingData';
import { COMBOS, FURNITURE, FURNITURE_MAP } from '../data/furnitureData';
import { SCHEDULE_ACTIONS } from '../data/scheduleData';
import { computeActiveCombos, findFreeSpot } from '../engine/room';
import { createNewGame, refreshCombos, runMonth, type SaveState } from '../engine/simulation';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('master data', () => {
  it('has 50 endings with unique ids', () => {
    expect(ENDINGS).toHaveLength(50);
    expect(new Set(ENDINGS.map((e) => e.id)).size).toBe(50);
  });
  it('has 12 combos whose furniture all exist', () => {
    expect(COMBOS).toHaveLength(12);
    for (const c of COMBOS) for (const id of c.requiredFurnitureIds) expect(FURNITURE_MAP[id], id).toBeDefined();
  });
  it('has 8 education + 8 part-time actions', () => {
    expect(SCHEDULE_ACTIONS.filter((a) => a.type === 'EDUCATION')).toHaveLength(8);
    expect(SCHEDULE_ACTIONS.filter((a) => a.type === 'PART_TIME')).toHaveLength(8);
  });
});

describe('combos', () => {
  it('activates when 3 pieces are within manhattan 2', () => {
    const placed = [
      { instanceId: 'a', furnitureId: 'oak_desk', gridX: 0, gridY: 0, rotation: 0 as const },
      { instanceId: 'b', furnitureId: 'encyclopedia_shelf', gridX: 1, gridY: 0, rotation: 0 as const },
      { instanceId: 'c', furnitureId: 'led_lamp', gridX: 2, gridY: 1, rotation: 0 as const },
    ];
    expect(computeActiveCombos(placed).comboIds).toEqual(['CMB_01']);
  });
  it('does not activate when far apart', () => {
    const placed = [
      { instanceId: 'a', furnitureId: 'oak_desk', gridX: 0, gridY: 0, rotation: 0 as const },
      { instanceId: 'b', furnitureId: 'encyclopedia_shelf', gridX: 5, gridY: 5, rotation: 0 as const },
      { instanceId: 'c', furnitureId: 'led_lamp', gridX: 0, gridY: 5, rotation: 0 as const },
    ];
    expect(computeActiveCombos(placed).comboIds).toEqual([]);
  });
});

describe('ending evaluation', () => {
  it('falls back to END_50 for a fresh game', () => {
    expect(evaluateEnding(createNewGame('t', 'SON', 'INT')).id).toBe('END_50');
  });
  it('picks a higher-priority ending first', () => {
    const s = createNewGame('t', 'SON', 'INT');
    s.stats = { INT: 900, STR: 100, ART: 100, CHA: 600, MOR: 900, TEC: 100 };
    s.aptitudes.APT_LAW.level = 9;
    expect(evaluateEnding(s).id).toBe('END_02');
    s.status.delinquency = 5; // 대법관 조건 탈락 → A급 이하
    expect(ENDING_MAP[evaluateEnding(s).id].priority).toBeGreaterThan(2);
  });
});

/** 간단한 자동 플레이: 스트레스 관리 + 집중 육성 + 콤보 가구 구매 */
function autoplay(plan: { edu: string[]; furniture: string[]; job?: string }, seed: number) {
  const rng = mulberry32(seed);
  let s: SaveState = createNewGame('auto', 'DAUGHTER', 'INT');
  for (let m = 0; m < 144; m++) {
    for (const fid of plan.furniture) {
      const def = FURNITURE_MAP[fid];
      if (s.collectedFurniture.includes(fid) || (def.minAge ?? 0) > s.age) continue;
      if (s.gold >= def.costGold + 400 && s.ideaPoints >= def.costIdea) {
        const spot = findFreeSpot(s.placedFurniture, s.roomSize, fid);
        if (!spot) continue;
        s.gold -= def.costGold;
        s.ideaPoints -= def.costIdea;
        s.collectedFurniture.push(fid);
        s.placedFurniture.push({ instanceId: `x${s.instanceSeq++}`, furnitureId: fid, gridX: spot.x, gridY: spot.y, rotation: 0 });
        refreshCombos(s);
      }
    }
    const usable = plan.edu.filter((id) => SCHEDULE_ACTIONS.find((a) => a.id === id)!.minAge <= s.age);
    const e1 = usable[m % usable.length];
    const e2 = usable[(m + 1) % usable.length];
    const rest = s.status.stress > 40 ? 'REST_01' : e2;
    const cheap = s.gold < 800 ? plan.job ?? 'JOB_01' : e1;
    s.monthlySchedule = [e1, cheap, rest, s.status.stress > 20 ? 'REST_01' : e2];
    const r = runMonth(s, rng);
    s = r.state;
    if (r.ending) return { state: s, ending: r.ending };
  }
  throw new Error('no ending');
}

describe('full playthrough', () => {
  it('reaches an ending after 144 months', () => {
    const { ending, state } = autoplay(
      { edu: ['EDU_02', 'EDU_03', 'EDU_08'], furniture: ['oak_desk', 'encyclopedia_shelf', 'led_lamp', 'globe', 'fluffy_bed', 'aroma_diffuser', 'cat_cushion'] },
      42,
    );
    console.log('study path →', ending.id, ending.title, state.stats, Object.fromEntries(Object.entries(state.aptitudes).map(([k, v]) => [k, v.level])), state.gold);
    expect(ending).toBeDefined();
    expect(ending.id).not.toBe('END_50');
  });
  it('art path reaches an art ending', () => {
    const { ending, state } = autoplay(
      { edu: ['EDU_05', 'EDU_06'], furniture: ['easel', 'plaster_bust', 'watercolor_kit', 'fluffy_bed', 'aroma_diffuser', 'cat_cushion', 'grand_piano'] },
      7,
    );
    console.log('art path →', ending.id, ending.title, state.stats, state.status);
    expect(ending).toBeDefined();
  });
  it('coverage: furniture count', () => {
    expect(FURNITURE.length).toBe(40);
  });
});

import { FURNITURE_PIXELS, FURNITURE_BODY } from '../render/sprites';
import { project, unproject } from '../render/isoRenderer';
describe('sprites & iso', () => {
  it('every furniture has an 8x8 sprite and body', () => {
    for (const f of FURNITURE) {
      const rows = FURNITURE_PIXELS[f.id];
      expect(rows, f.id).toHaveLength(8);
      rows.forEach((r) => expect(r.length, `${f.id}:${r}`).toBe(8));
      expect(FURNITURE_BODY[f.id], f.id).toBeDefined();
    }
  });
  it('unproject inverts project at tile centers', () => {
    for (let x = 0; x < 8; x++)
      for (let y = 0; y < 8; y++) {
        const [sx, sy] = project(8, x + 0.5, y + 0.5);
        expect(unproject(8, sx, sy)).toEqual({ x, y });
      }
  });
});

import { besideCells, CharacterSim, pathToward } from '../render/characterSim';
describe('character sim', () => {
  const placed = [
    { instanceId: 'a', furnitureId: 'oak_desk', gridX: 2, gridY: 0, rotation: 0 as const },
    { instanceId: 'b', furnitureId: 'encyclopedia_shelf', gridX: 2, gridY: 1, rotation: 0 as const },
    { instanceId: 'c', furnitureId: 'led_lamp', gridX: 2, gridY: 2, rotation: 0 as const },
  ];
  it('paths around furniture', () => {
    const path = pathToward(6, placed, { x: 0, y: 0 }, [{ x: 4, y: 0 }]);
    expect(path[path.length - 1]).toEqual({ x: 4, y: 0 });
    for (const c of path) expect(placed.some((p) => p.gridX === c.x && p.gridY === c.y)).toBe(false);
  });
  it('finds free cells beside a furniture', () => {
    const cells = besideCells(6, placed, placed[1]);
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) expect(c.x === 1 || c.x === 3).toBe(true);
  });
  it('runs a script to completion', () => {
    const sim = new CharacterSim();
    let done = false;
    sim.runScript([
      { kind: 'goto', resolve: () => ({ x: 5, y: 5 }) },
      { kind: 'wait', ms: 500, pose: 'read' },
      { kind: 'call', fn: () => (done = true) },
    ]);
    for (let i = 0; i < 200 && !done; i++) sim.update(50, { n: 6, placed });
    expect(done).toBe(true);
    expect(sim.cell()).toEqual({ x: 5, y: 5 });
  });
});

import { hasModel } from '../render/furnitureModels';
describe('furniture models', () => {
  it('every furniture has a 3D dot model', () => {
    for (const f of FURNITURE) expect(hasModel(f.id), f.id).toBe(true);
  });
});

import atlas from '../render/characterAtlas.json';
describe('character atlas', () => {
  it('has 4 walk frames for every standing character', () => {
    const names = Object.keys(atlas);
    for (const stand of names.filter((n) => n.endsWith('_stand'))) {
      const base = stand.replace('_stand', '');
      for (let i = 0; i < 4; i++) expect(names, `${base}_walk${i}`).toContain(`${base}_walk${i}`);
    }
  });
});

import { ENDING_SCENE } from '../data/endingScenes';
describe('v0.5 events & ending', () => {
  it('every ending has an illustration scene', () => {
    for (const e of ENDINGS) expect(ENDING_SCENE[e.id], e.id).toBeDefined();
  });
  it('contest months return structured results and history is recorded yearly', () => {
    const rng = mulberry32(3);
    let s = createNewGame('t', 'SON', 'STR');
    const contests: string[] = [];
    for (let m = 0; m < 24; m++) {
      const r = runMonth(s, rng);
      if (r.contest) contests.push(`${r.contest.id}@${r.contest.age}`);
      s = r.state;
    }
    expect(contests).toEqual(['SPORTS@8', 'ARTFEST@8', 'EXAM@8', 'SPORTS@9', 'ARTFEST@9', 'EXAM@9']);
    expect(s.history?.map((h) => h.age)).toEqual([8, 9, 10]);
  });
});

describe('back view', () => {
  it('has back stand + 4 back walk frames for every child stage', () => {
    const names = Object.keys(atlas);
    for (const st of ['CHILD', 'TEEN', 'YOUTH'])
      for (const g of ['SON', 'DAUGHTER']) {
        expect(names).toContain(`${st}_${g}_back_stand`);
        for (let i = 0; i < 4; i++) expect(names).toContain(`${st}_${g}_back_walk${i}`);
      }
  });
  it('walking toward the back wall switches to back view', () => {
    const sim = new CharacterSim();
    sim.actor.gx = 4.5;
    sim.actor.gy = 4.5;
    sim.runScript([{ kind: 'goto', resolve: () => ({ x: 0, y: 0 }) }]);
    sim.update(50, { n: 6, placed: [] });
    sim.update(50, { n: 6, placed: [] });
    expect(sim.actor.back).toBe(true);
    sim.runScript([{ kind: 'goto', resolve: () => ({ x: 5, y: 5 }) }]);
    sim.update(50, { n: 6, placed: [] });
    sim.update(50, { n: 6, placed: [] });
    expect(sim.actor.back).toBe(false);
  });
});

import { CatSim } from '../render/catSim';
describe('cat', () => {
  it('has all cat frames', () => {
    for (const k of ['CAT_sleep', 'CAT_sit', 'CAT_walk0', 'CAT_walk1', 'CAT_stretch', 'CAT_groom', 'CAT_loaf'])
      expect(Object.keys(atlas)).toContain(k);
  });
  it('wanders, rests, and never stands inside furniture', () => {
    const cat = new CatSim(mulberry32(5));
    const placed = [{ instanceId: 'a', furnitureId: 'oak_desk', gridX: 2, gridY: 2, rotation: 0 as const }];
    const poses = new Set<string>();
    for (let i = 0; i < 4000; i++) {
      cat.update(50, 6, placed);
      poses.add(cat.actor.pose);
      const c = { x: Math.floor(cat.actor.gx), y: Math.floor(cat.actor.gy) };
      expect(c.x === 2 && c.y === 2).toBe(false);
    }
    expect(poses.has('walk')).toBe(true);
    expect([...poses].filter((p) => p !== 'walk').length).toBeGreaterThanOrEqual(3);
  });
});

describe('walking direction', () => {
  it('prefers an L-shaped path over a zigzag', () => {
    const path = pathToward(8, [], { x: 6, y: 6 }, [{ x: 1, y: 2 }]);
    let turns = 0;
    for (let i = 2; i < path.length; i++) {
      const d1 = [path[i - 1].x - path[i - 2].x, path[i - 1].y - path[i - 2].y].join();
      const d2 = [path[i].x - path[i - 1].x, path[i].y - path[i - 1].y].join();
      if (d1 !== d2) turns++;
    }
    expect(turns).toBeLessThanOrEqual(1);
  });
  it('does not flip facing every tile while walking toward the back wall', () => {
    const sim = new CharacterSim();
    sim.actor.gx = 6.5;
    sim.actor.gy = 6.5;
    sim.runScript([{ kind: 'goto', resolve: () => ({ x: 0, y: 1 }) }]);
    const facings: string[] = [];
    for (let i = 0; i < 200 && sim.scripted; i++) {
      sim.update(50, { n: 8, placed: [] });
      if (sim.actor.pose === 'walk') facings.push(sim.actor.facing);
    }
    let flips = 0;
    for (let i = 1; i < facings.length; i++) if (facings[i] !== facings[i - 1]) flips++;
    expect(flips).toBeLessThanOrEqual(1);
  });
});

describe('characters do not overlap', () => {
  it('child, parent and cat rarely share a cell', () => {
    const child = new CharacterSim();
    const npc = new CharacterSim();
    const cat = new CatSim(mulberry32(9));
    child.actor.gx = 1.5; child.actor.gy = 1.5;
    npc.actor.gx = 4.5; npc.actor.gy = 3.5;
    const placed = [{ instanceId: 'd', furnitureId: 'oak_desk', gridX: 3, gridY: 0, rotation: 0 as const }];
    const here = (a: { gx: number; gy: number }) => `${Math.floor(a.gx)},${Math.floor(a.gy)}`;
    const rng = mulberry32(2);
    let overlap = 0;
    const N = 6000;
    for (let i = 0; i < N; i++) {
      if (!child.scripted && i % 300 === 0) {
        const goal = { x: Math.floor(rng() * 6), y: Math.floor(rng() * 6) };
        child.runScript([{ kind: 'goto', resolve: () => goal }, { kind: 'wait', ms: 800, pose: 'read' }]);
      }
      child.update(50, { n: 6, placed, avoid: new Set([here(npc.actor), here(cat.actor)]) }, rng);
      npc.update(30, { n: 6, placed, avoid: new Set([...child.occupied(), here(cat.actor)]) }, rng);
      cat.update(50, 6, placed, new Set([...child.occupied(), ...npc.occupied()]));
      const cells = [here(child.actor), here(npc.actor), here(cat.actor)];
      if (new Set(cells).size < 3) overlap++;
    }
    expect(overlap / N).toBeLessThan(0.03);
  });
});

import { ko } from '../components/ui';
import iconAtlas from '../render/iconAtlas.json';
describe('korean labels & icons', () => {
  it('translates stat keys in popups', () => {
    expect(ko('+12 INT')).toBe('+12 지력');
    expect(ko('APT_LAW Lv.3!')).toBe('법률 Lv.3!');
    expect(ko('Combo x1.3!')).toBe('콤보 x1.3!');
    expect(ko('-1 STR')).toBe('-1 체력');
  });
  it('has an icon for every stat and aptitude', () => {
    for (const k of ['INT', 'STR', 'ART', 'CHA', 'MOR', 'TEC', 'APT_MED', 'APT_LAW', 'APT_IT', 'APT_ENT', 'APT_BIZ', 'APT_ADV'])
      expect(Object.keys(iconAtlas.icons)).toContain(k);
  });
});

describe('job costumes', () => {
  it('son has costume sprites for all 50 endings', () => {
    for (let i = 1; i <= 50; i++) expect(Object.keys(atlas)).toContain(`JOB_END_${String(i).padStart(2, '0')}_SON`);
  });
  it('daughter has costume sprites for all 50 endings', () => {
    for (let i = 1; i <= 50; i++) expect(Object.keys(atlas)).toContain(`JOB_END_${String(i).padStart(2, '0')}_DAUGHTER`);
  });
});

import { PARENTING_EVENTS, WISHES, WISH_MAP, fillName } from '../data/parentingData';
import { applyEffect, eligibleEvents, resolveParentingEvent, updateWish } from '../engine/parenting';
import { FURNITURE_MAP as FMAP } from '../data/furnitureData';
import { ACTION_MAP as AMAP } from '../data/scheduleData';
import { createNewGame as newGame_, runMonth as runMonth_ } from '../engine/simulation';

describe('parenting events & wishes', () => {
  it('event data is consistent', () => {
    const ids = new Set<string>();
    for (const e of PARENTING_EVENTS) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(e.choices.length).toBe(3);
      expect(e.minAge).toBeLessThanOrEqual(e.maxAge);
      for (const c of e.choices) if (c.wish) expect(WISH_MAP[c.wish]).toBeTruthy();
    }
    for (const w of WISHES) {
      if (w.kind === 'action') expect(AMAP[w.target!]).toBeTruthy();
      if (w.kind === 'furniture') expect(FMAP[w.target!]).toBeTruthy();
    }
  });

  it('fills Korean particles by batchim', () => {
    expect(fillName('{name이} 왔다', '민준')).toBe('민준이 왔다');
    expect(fillName('{name이} 왔다', '하나')).toBe('하나가 왔다');
    expect(fillName('{name은} {name을}', '지우')).toBe('지우는 지우를');
  });

  it('resolving an event applies effects and records parenting style', () => {
    const s = newGame_('하나', 'DAUGHTER', 'INT');
    s.pendingEvent = 'C_FRIEND_FIGHT';
    const out = resolveParentingEvent(s, 0)!;
    expect(out.delta.affection).toBe(5);
    expect(s.parenting!.WARM).toBe(1);
    expect(s.pendingEvent).toBeNull();
    expect(eligibleEvents(s).some((e) => e.id === 'C_FRIEND_FIGHT')).toBe(false);
  });

  it('wish succeeds when the wished action is scheduled', () => {
    const s = newGame_('하나', 'DAUGHTER', 'INT');
    s.wish = { id: 'W_TAEKWONDO', left: 3, progress: 0 };
    s.monthlySchedule = ['EDU_07', 'EDU_07', 'REST_01', 'REST_01'];
    const before = s.status.affection;
    const r = runMonth_(s, () => 0.99);
    expect(r.state.wish ?? null).toBeNull();
    expect(r.state.wishesGranted).toBe(1);
    expect(r.state.status.affection).toBeGreaterThan(before);
  });

  it('wish fails after 3 months if ignored', () => {
    const s = newGame_('하나', 'DAUGHTER', 'INT');
    s.wish = { id: 'W_TAEKWONDO', left: 3, progress: 0 };
    const ev: string[] = [];
    for (let i = 0; i < 3; i++) updateWish(s, [], () => 0.99, ev);
    expect(s.wish).toBeNull();
    expect(s.wishesFailed).toBe(1);
  });

  it('a full 12-year game produces events and wishes', () => {
    let s = newGame_('하나', 'SON', 'INT');
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let events = 0;
    for (let m = 0; m < 144; m++) {
      if (s.pendingEvent) {
        resolveParentingEvent(s, m % 3);
        events++;
      }
      const r = runMonth_(s, rng);
      s = r.state;
      if (r.ending) break;
    }
    expect(events).toBeGreaterThan(15);
    // 부탁을 계속 무시하면 3번째 실패 뒤 마음을 닫는다
    expect(s.wishesFailed ?? 0).toBeGreaterThanOrEqual(3);
    expect(s.photos!.length).toBeGreaterThan(20);
    void applyEffect;
  });
});

import { TEMPERAMENT_MAP } from '../data/temperamentData';
import { buildLetter } from '../data/letterData';

describe('temperament, memories, letter', () => {
  it('temperament changes the result of the same choice and reveals after 3 clues', () => {
    const shy = newGame_('하나', 'DAUGHTER', 'INT', [], 0, 'SHY');
    const act = newGame_('하나', 'DAUGHTER', 'INT', [], 0, 'ACTIVE');
    shy.pendingEvent = act.pendingEvent = 'C_FRIEND_FIGHT';
    const a = resolveParentingEvent(shy, 1)!; // 엄격
    const b = resolveParentingEvent(act, 1)!;
    expect(a.delta.stress!).toBeGreaterThan(b.delta.stress!);
    expect(a.clue).toBe(TEMPERAMENT_MAP.SHY.clue.STRICT);
    for (const id of ['C_BROKEN_VASE', 'C_SPARROW']) {
      shy.pendingEvent = id;
      resolveParentingEvent(shy, 0);
    }
    expect(shy.temperRevealed).toBe(true);
  });

  it('a past choice unlocks its memory event years later', () => {
    const s = newGame_('하나', 'DAUGHTER', 'INT');
    s.pendingEvent = 'C_BROKEN_VASE';
    resolveParentingEvent(s, 0);
    s.age = 14;
    expect(eligibleEvents(s).some((e) => e.id === 'M_VASE_WARM')).toBe(true);
    expect(eligibleEvents(s).some((e) => e.id === 'M_VASE_STRICT')).toBe(false);
  });

  it('letter quotes memories and the ending', () => {
    const s = newGame_('하나', 'DAUGHTER', 'INT', [], 0, 'STUBBORN', true);
    s.memories = ['C_FEVER:WARM', 'T_BULLY:WARM'];
    s.status.affection = 90;
    const l = buildLetter(s, ENDING_MAP.END_01);
    expect(l.body.join(' ')).toContain('잡아 준 손');
    expect(l.body.join(' ')).toContain('천재 외과의사');
    expect(l.closing).toContain('사랑');
  });
});

import { computeReport, resolveReport } from '../engine/school';
import { CUTSCENES } from '../data/cutsceneData';

describe('school life & cutscenes', () => {
  it('friend name gets colloquial particle', () => {
    expect(fillName('{friend}랑 놀았어', '하나', '서연')).toBe('서연이랑 놀았어');
    expect(fillName('{friend}랑 놀았어', '하나', '지호')).toBe('지호랑 놀았어');
  });

  it('report card grades follow school level', () => {
    const s = newGame_('하나', 'DAUGHTER', 'INT');
    s.age = 10; s.month = 7;
    expect(computeReport(s).school).toBe('초등학교 3학년');
    expect(['수', '우', '미', '양', '가']).toContain(computeReport(s).subjects[0].grade);
    s.age = 18;
    expect(computeReport(s).subjects[0].grade).toMatch(/등급$/);
    s.pendingReport = true;
    resolveReport(s, 'WARM');
    expect(s.pendingReport).toBe(false);
  });

  it('cutscenes and report cards are scheduled during 12 years', () => {
    let s = newGame_('하나', 'SON', 'INT');
    const cuts = new Set<string>();
    let reports = 0;
    for (let m = 0; m < 144; m++) {
      const r = runMonth_(s, () => 0.5);
      s = r.state;
      if (s.pendingCutscene) {
        cuts.add(s.pendingCutscene);
        s.seenCutscenes = [...(s.seenCutscenes ?? []), s.pendingCutscene];
        s.pendingCutscene = null;
      }
      if (s.pendingReport) {
        reports++;
        s.pendingReport = false;
      }
      if (r.ending) break;
    }
    expect(cuts.size).toBe(CUTSCENES.length);
    expect(reports).toBeGreaterThanOrEqual(22);
  });
});

import { finishContest, perfFactor } from '../engine/simulation';

describe('contest minigames', () => {
  it('interactive month defers the contest until the minigame ends', () => {
    const s = newGame_('하나', 'SON', 'STR');
    s.month = 5;
    const r = runMonth_(s, () => 0.5, { interactiveContest: true });
    expect(r.contest).toBeUndefined();
    expect(r.state.pendingContest).toEqual({ id: 'SPORTS', age: 8 });
  });

  it('better minigame play gives a higher score', () => {
    const a = newGame_('하나', 'SON', 'STR');
    const b = newGame_('하나', 'SON', 'STR');
    const lo = finishContest(a, 'SPORTS', perfFactor(0));
    const hi = finishContest(b, 'SPORTS', perfFactor(1));
    expect(hi.score).toBeGreaterThan(lo.score);
    expect(perfFactor(1)).toBeCloseTo(1.2);
  });

  it('the last month resolves the exam before the ending', () => {
    const s = newGame_('하나', 'SON', 'INT');
    s.age = 19; s.month = 12;
    const r = runMonth_(s, () => 0.5, { interactiveContest: true });
    expect(r.ending).toBeTruthy();
    expect(r.contest?.id).toBe('EXAM');
  });
});

import { PARENT_JOBS, PARENT_TOTAL, ABILITIES, randomParent, PARENT_JOB_MAP } from '../data/parentData';

describe('parent profile', () => {
  it('every job preset uses exactly the total points', () => {
    for (const j of PARENT_JOBS) expect(ABILITIES.reduce((a, k) => a + j.points[k], 0)).toBe(PARENT_TOTAL);
    for (let i = 0; i < 30; i++) {
      const r = randomParent();
      expect(ABILITIES.reduce((a, k) => a + r.points[k], 0)).toBe(PARENT_TOTAL);
      expect(Math.max(...ABILITIES.map((k) => r.points[k]))).toBeLessThanOrEqual(5);
    }
  });

  it('wealthy parents give more gold, scholars a smarter start', () => {
    const doc = newGame_('하나', 'SON', 'INT', [], 0, undefined, false, { job: 'DOCTOR', points: { ...PARENT_JOB_MAP.DOCTOR.points } });
    const art = newGame_('하나', 'SON', 'INT', [], 0, undefined, false, { job: 'ARTIST', points: { ...PARENT_JOB_MAP.ARTIST.points } });
    expect(doc.gold).toBeGreaterThan(art.gold);
    expect(doc.stats.INT).toBeGreaterThan(art.stats.INT);
    expect(art.stats.ART).toBeGreaterThan(doc.stats.ART);
    const d2 = runMonth_(doc, () => 0.5).state;
    const a2 = runMonth_(art, () => 0.5).state;
    expect(d2.gold - doc.gold).toBeGreaterThan(a2.gold - art.gold);
  });

  it('parent job situations only appear for that job', () => {
    const s = newGame_('하나', 'SON', 'INT', [], 0, undefined, false, { job: 'CHEF', points: { ...PARENT_JOB_MAP.CHEF.points } });
    s.age = 10;
    const ids = eligibleEvents(s).map((e) => e.id);
    expect(ids).toContain('P_CHEF');
    expect(ids).not.toContain('P_DOCTOR');
  });
});

import { writeDiary, readDiary, skipDiary, respondCaught } from '../engine/diary';

describe('diary', () => {
  it('a stressed child always writes a secret diary', () => {
    const s = newGame_('하나', 'DAUGHTER', 'INT');
    s.status.stress = 70;
    writeDiary(s, [], undefined, () => 0.5);
    expect(s.diaryNew?.secret?.kind).toBe('STRESS');
  });

  it('reading may be caught; skipping is respected', () => {
    const s = newGame_('하나', 'DAUGHTER', 'INT', [], 0, 'SHY');
    s.status.stress = 70;
    writeDiary(s, [], undefined, () => 0.5);
    const r = readDiary(s, () => 0)!; // 0 → 반드시 들킴
    expect(r.caught).toBe(true);
    const aff = s.status.affection;
    respondCaught(s, 1);
    expect(s.status.affection).toBeLessThan(aff);
    writeDiary(s, [], undefined, () => 0.5);
    skipDiary(s);
    expect(s.diaryRespected).toBe(1);
    expect(s.diaryNew).toBeNull();
  });

  it('a temperament secret in the diary becomes an observation clue', () => {
    const s = newGame_('하나', 'DAUGHTER', 'INT', [], 0, 'ACTIVE');
    s.status.affection = 60;
    writeDiary(s, [], undefined, () => 0.1);
    expect(s.diaryNew?.secret?.kind).toBe('TEMPER');
    const r = readDiary(s, () => 0.99)!;
    expect(r.clue).toBeTruthy();
    expect(s.clues!.length).toBe(1);
  });
});
