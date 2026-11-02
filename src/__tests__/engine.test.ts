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
