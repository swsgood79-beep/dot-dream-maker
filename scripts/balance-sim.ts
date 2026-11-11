/**
 * 밸런스 점검용 자동 플레이 시뮬레이터.
 *   npx vite-node scripts/balance-sim.ts [runs]
 * - 목표형 봇: 엔딩 하나를 노리고 부족한 스탯·적성·조건을 채우는 "잘하는 플레이어"
 * - 캐주얼 봇: 무작위로 스케줄을 짜고 가끔 가구를 사는 "처음 하는 플레이어"
 */
import { COMBOS, COMBO_MAP, FURNITURE_MAP } from '../src/data/furnitureData';
import { SCHEDULE_ACTIONS } from '../src/data/scheduleData';
import { ENDINGS, ENDING_MAP, meetsEnding } from '../src/data/endingData';
import { FURNITURE } from '../src/data/furnitureData';
import { canPlace, footprint } from '../src/engine/room';
import { resolveParentingEvent } from '../src/engine/parenting';
import { preparePlan } from '../src/engine/negotiate';
import { PARENT_JOB_MAP, randomParent, type ParentJobId, type ParentProfile } from '../src/data/parentData';

/** PARENT=DOCTOR 등 직업 ID, 'random', 없으면 부모 영향 없음 */
function parentFor(rng: () => number): ParentProfile | undefined {
  const p = process.env.PARENT;
  if (!p) return undefined;
  if (p === 'random') return randomParent(rng);
  return { job: p as ParentJobId, points: { ...PARENT_JOB_MAP[p as ParentJobId].points } };
}
import {
  APT_KEYS,
  STAT_KEYS,
  GAIN_SCALE,
  REST_ACTION_ID,
  createNewGame,
  growthCurve,
  runMonth,
  type SaveState,
} from '../src/engine/simulation';
import type { EndingDefinition, ScheduleAction, StatKey } from '../src/types/game';

type Rng = () => number;
function mulberry(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const monthsLeft = (s: SaveState) => (19 - s.age) * 12 + (12 - s.month) + 1;

/* ───────── 가구 구매·배치 ───────── */
function place(s: SaveState, fid: string): boolean {
  const def = FURNITURE_MAP[fid];
  const combo = COMBOS.find((c) => c.requiredFurnitureIds.includes(fid));
  const mates = s.placedFurniture.filter((p) => combo?.requiredFurnitureIds.includes(p.furnitureId));
  let best: { x: number; y: number; d: number } | null = null;
  for (let y = 0; y < s.roomSize; y++)
    for (let x = 0; x < s.roomSize; x++) {
      const cand = { furnitureId: fid, gridX: x, gridY: y, rotation: 0 as const };
      if (!canPlace(s.placedFurniture, s.roomSize, cand)) continue;
      let d = 0;
      if (mates.length) {
        for (const m of mates)
          d += Math.min(...footprint(m).flatMap((a) => footprint(cand).map((b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y))));
      } else {
        // 새 콤보 묶음은 다른 가구와 떨어진 빈 구역에서 시작
        const near = s.placedFurniture.filter((p) => Math.abs(p.gridX - x) <= 1 && Math.abs(p.gridY - y) <= 1).length;
        d = near * 3 + (x + y) * 0.01;
      }
      if (!best || d < best.d) best = { x, y, d };
    }
  if (!best) return false;
  void def;
  s.placedFurniture.push({ instanceId: `f${s.instanceSeq++}`, furnitureId: fid, gridX: best.x, gridY: best.y, rotation: 0 });
  return true;
}

function buy(s: SaveState, fid: string, reserve: number): boolean {
  const def = FURNITURE_MAP[fid];
  if ((def.minAge ?? 0) > s.age) return false;
  if (s.gold - def.costGold < reserve || s.ideaPoints < def.costIdea) return false;
  if (s.placedFurniture.some((p) => p.furnitureId === fid)) return false;
  if (!place(s, fid)) return false;
  s.gold -= def.costGold;
  s.ideaPoints -= def.costIdea;
  if (!s.collectedFurniture.includes(fid)) s.collectedFurniture.push(fid);
  return true;
}

/* ───────── 목표형 봇 ───────── */
interface Plan {
  w: Record<StatKey, number>;
  apt: Partial<Record<string, number>>;
  combos: string[];
  def: EndingDefinition;
}

function makePlan(def: EndingDefinition): Plan {
  const w = Object.fromEntries(STAT_KEYS.map((k) => [k, 0.04])) as Record<StatKey, number>;
  for (const [k, v] of Object.entries(def.minStats) as [StatKey, number][]) w[k] = v / 600;
  const apt: Plan['apt'] = { ...(def.minAptitudes ?? {}) };
  if (def.anyAptitudes) {
    const [k, v] = Object.entries(def.anyAptitudes)[0];
    apt[k] = v;
  }
  const scored = COMBOS.filter((c) => c.id !== 'CMB_11')
    .map((c) => ({
      id: c.id,
      v:
        Object.entries(c.statMultiplierBonus).reduce((a, [k, b]) => a + (w[k as StatKey] ?? 0) * (b ?? 0), 0) +
        Object.entries(c.aptitudeExpBonus ?? {}).reduce((a, [k]) => a + (apt[k] ? 0.5 : 0), 0),
    }))
    .sort((a, b) => b.v - a.v);
  const combos = [...new Set([def.requiredComboId, ...scored.slice(0, 2).map((x) => x.id), 'CMB_11'].filter(Boolean) as string[])];
  return { w, apt, combos, def };
}

function expectedGain(s: SaveState, a: ScheduleAction, k: StatKey) {
  const base = a.weeklyStatGains[k] ?? 0;
  if (base <= 0) return base;
  const bonus = s.activeCombos.reduce(
    (m, id) => m + (COMBO_MAP[id].appliesTo.includes(a.type) ? (COMBO_MAP[id].statMultiplierBonus[k] ?? 0) : 0),
    0,
  );
  return base * GAIN_SCALE * growthCurve(s.stats[k]) * Math.min(2, 1 + bonus);
}

/**
 * 행동 점수 = Σ(조건별 남은 비율 × 이번 주 진척 비율).
 * 조건을 이미 채웠으면 그 조건의 가치는 0에 가깝게 떨어진다.
 */
function scoreAction(s: SaveState, a: ScheduleAction, p: Plan, gold: number): number {
  const d = p.def;
  const urg = (cur: number, t: number) => Math.max(0, (t * 1.03 - cur) / t);
  let sc = 0;
  for (const k of STAT_KEYS) {
    const g = expectedGain(s, a, k);
    const t = d.minStats[k];
    if (t) sc += (urg(s.stats[k], t) + 0.02) * (g / t);
    else sc += g * 0.00002;
    const mx = d.maxStats?.[k];
    if (mx !== undefined && g > 0 && s.stats[k] + 40 > mx) sc -= (g / mx) * 2;
    if (mx !== undefined && g < 0 && s.stats[k] > mx * 0.9) sc += (-g / mx) * 1.5;
  }
  if (a.aptitudeGain) {
    const t = p.apt[a.aptitudeGain.key];
    const lv = s.aptitudes[a.aptitudeGain.key];
    if (t && lv.level < t) sc += ((t - lv.level - lv.exp / 100) / t + 0.05) * ((a.aptitudeGain.exp * 5) / (100 * t));
  }
  for (const [k, v] of Object.entries(d.requiredActionCounts ?? {})) {
    const have = s.actionCounts[k] ?? 0;
    const hit = k === a.id || (k === 'OUTING_TOTAL' && (a.type === 'OUTING' || a.id === 'REST_02'));
    if (hit && have < v) sc += (1 / v) * Math.min(3, (v - have) / Math.max(1, monthsLeft(s) * 0.8)) + 0.3 / v;
  }
  const sg = a.statusGains ?? {};
  if (d.minFame && sg.fame) sc += urg(s.status.fame, d.minFame) * (sg.fame / d.minFame);
  if (d.minDelinquency && sg.delinquency) sc += urg(s.status.delinquency, d.minDelinquency) * (sg.delinquency / d.minDelinquency);
  else if (sg.delinquency) sc -= sg.delinquency * 0.01;
  if (d.minAffection && sg.affection) sc += urg(s.status.affection, d.minAffection) * (sg.affection / d.minAffection);
  if (d.requiredFlag && !s.flags.includes(d.requiredFlag)) {
    const f = d.requiredFlag;
    if ((f === 'FLAG_GAME_CHAMP' && a.id === 'OUT_ARCADE' && s.age >= 14 && s.stats.TEC >= 400) ||
      (f === 'FLAG_HERO_SWORD' && a.id === 'OUT_RUINS' && s.stats.STR >= 500 && s.aptitudes.APT_ADV.level >= 5 && s.activeCombos.includes('CMB_12')) ||
      (f === 'FLAG_MAGIC_BOOK' && a.id === 'OUT_BOOK' && s.stats.ART >= 450 && s.stats.INT >= 450) ||
      (f === 'FLAG_ROYAL_BALL' && a.id === 'OUT_SHOP' && s.stats.CHA >= 600 && s.status.fame >= 200))
      sc += 0.15;
  }
  // 돈: 부족할 때만 알바 가치
  const need = Math.max(800, d.minGold && s.age >= 15 ? d.minGold * 1.1 : 0);
  if (gold < need) sc += (a.weeklyGoldDelta / 100) * 0.01;
  else if (a.weeklyGoldDelta < 0 && gold < 2500) sc += (a.weeklyGoldDelta / 100) * 0.0002;
  return sc;
}

function planMonth(s: SaveState, p: Plan): string[] {
  const acts = SCHEDULE_ACTIONS.filter((a) => a.minAge <= s.age && a.type !== 'REST');
  let stress = s.status.stress;
  let gold = s.gold;
  const out: string[] = [];
  for (let w = 0; w < 4; w++) {
    let best: ScheduleAction | null = null;
    let bs = -Infinity;
    for (const a of acts) {
      if (gold + a.weeklyGoldDelta < 150) continue;
      if (stress + Math.max(0, a.weeklyStressDelta) >= 50) continue; // 스트레스 50 이상이면 효율 하락
      const v = scoreAction(s, a, p, gold);
      if (v > bs) {
        bs = v;
        best = a;
      }
    }
    if (!best || bs <= 0) {
      // 쉬기: 돈이 넉넉하면 바캉스(-30), 아니면 방에서 휴식
      const vac = gold > 3000 && stress >= 25;
      out.push(vac ? 'REST_02' : REST_ACTION_ID);
      stress = Math.max(0, stress - (vac ? 30 : 20));
      gold -= vac ? 300 : 0;
      continue;
    }
    out.push(best.id);
    stress = Math.max(0, stress + best.weeklyStressDelta);
    gold += best.weeklyGoldDelta;
  }
  return out;
}

function targetedRun(def: EndingDefinition, seed: number) {
  const rng = mulberry(seed);
  const p = makePlan(def);
  const bonus = (Object.entries(def.minStats).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? 'INT') as StatKey;
  let s = createNewGame('봇', 'DAUGHTER', bonus, [], 0, undefined, false, parentFor(rng));
  let ending: EndingDefinition | undefined;
  let bursts = 0;
  while (!ending) {
    // 가구: 목표 콤보 세트부터 (돈 여유분은 남김)
    const reserve = def.minGold && s.age >= 16 ? def.minGold : 400;
    // 필수 콤보 가구가 아직 나이 제한으로 못 사는 동안엔 자리를 비워 둠 (작은 방에서 다른 콤보가 자리를 다 차지하지 않게)
    const need = def.requiredComboId ? COMBO_MAP[def.requiredComboId].requiredFurnitureIds : [];
    const needWait = need.some((fid) => !s.placedFurniture.some((x) => x.furnitureId === fid));
    for (const cid of p.combos) {
      if (needWait && cid !== def.requiredComboId) continue;
      for (const fid of COMBO_MAP[cid].requiredFurnitureIds) buy(s, fid, reserve);
    }
    if (def.minFurnitureCollectionRate && s.age >= 15) for (const fid of Object.keys(FURNITURE_MAP)) if (!s.collectedFurniture.includes(fid)) buyCollect(s, fid, reserve);
    if (s.pendingEvent) resolveParentingEvent(s, Math.floor(rng() * 3));
    // 매달 대화 (무료) — 실제 대화 버튼처럼 기록 (안 하면 방임으로 쌓임)
    s.status.affection = Math.min(100, s.status.affection + 3);
    s.status.stress = Math.max(0, s.status.stress - 3);
    s.talkedThisMonth = true;
    s.talkKind = 'talk';
    s.monthlySchedule = planMonth(s, p);
    // REAL=1: 실제 규칙 — 청년기(17~)는 아이가 정하고, 부모는 진로 상담(목표 방향) 또는 활동비 지원만
    if (process.env.REAL && s.age >= 17) {
      const top = (Object.entries(def.minStats).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? 'INT') as StatKey;
      s.advice = top === 'STR' ? 'SPORT' : top === 'ART' || top === 'TEC' ? 'ART' : top === 'CHA' && def.category === 'BIZ' ? 'PART_TIME' : 'EDUCATION';
      s.planFor = undefined;
      preparePlan(s);
      s.support = s.month % 2 ? 'ADVICE' : s.gold > 600 ? 'FUND' : 'CHEER';
    }
    if (process.env.DBG && s.month === 6 && s.age % 2 === 0) {
      const acts = SCHEDULE_ACTIONS.filter((a) => a.minAge <= s.age);
      console.log(s.age, s.status.stress, s.monthlySchedule.join(','), JSON.stringify(s.stats));
      console.log('   ', acts.map((a) => [a.id, scoreAction(s, a, p, s.gold)] as const).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}:${(v * 1000).toFixed(2)}`).join(' '));
    }
    const r = runMonth(s, rng);
    if (r.state.burstCount > s.burstCount) bursts++;
    s = r.state;
    ending = r.ending;
  }
  return { ending, s, bursts };
}

/** 도감용: 사서 바로 창고에 넣었다고 치고(배치 안 함) 수집만 */
function buyCollect(s: SaveState, fid: string, reserve: number) {
  const def = FURNITURE_MAP[fid];
  if ((def.minAge ?? 0) > s.age || s.gold - def.costGold < reserve || s.ideaPoints < def.costIdea) return;
  s.gold -= def.costGold;
  s.ideaPoints -= def.costIdea;
  s.collectedFurniture.push(fid);
  s.inventory.push(fid);
}

/* ───────── 캐주얼 봇 ───────── */
function casualRun(seed: number) {
  const rng = mulberry(seed);
  let s = createNewGame('봇', rng() < 0.5 ? 'SON' : 'DAUGHTER', STAT_KEYS[Math.floor(rng() * 6)], [], 0, undefined, false, parentFor(rng));
  let ending: EndingDefinition | undefined;
  // 선호 분야 2개를 정해 두고 그쪽 학원을 자주 고름
  const fav = SCHEDULE_ACTIONS.filter((a) => a.type === 'EDUCATION').sort(() => rng() - 0.5).slice(0, 2).map((a) => a.id);
  const favCombo = COMBOS[Math.floor(rng() * COMBOS.length)].id;
  while (!ending) {
    if (s.pendingEvent) resolveParentingEvent(s, Math.floor(rng() * 3));
    if (rng() < 0.15) for (const fid of COMBO_MAP[favCombo].requiredFurnitureIds) buy(s, fid, 300);
    if (rng() < 0.5) {
      s.status.affection = Math.min(100, s.status.affection + 3);
      s.status.stress = Math.max(0, s.status.stress - 3);
      s.talkedThisMonth = true;
      s.talkKind = 'talk';
    }
    const acts = SCHEDULE_ACTIONS.filter((a) => a.minAge <= s.age);
    const sched: string[] = [];
    let st = s.status.stress;
    for (let w = 0; w < 4; w++) {
      if (st >= 60 || (st >= 40 && rng() < 0.5)) {
        sched.push(REST_ACTION_ID);
        st -= 18;
        continue;
      }
      const r = rng();
      const a =
        r < 0.45 ? acts.find((x) => x.id === fav[Math.floor(rng() * 2)]) :
        r < 0.7 ? acts.filter((x) => x.type === 'PART_TIME')[Math.floor(rng() * acts.filter((x) => x.type === 'PART_TIME').length)] :
        acts[Math.floor(rng() * acts.length)];
      const pick = a && a.minAge <= s.age ? a : acts[0];
      sched.push(pick.id);
      st += pick.weeklyStressDelta;
    }
    s.monthlySchedule = sched;
    const r = runMonth(s, rng);
    s = r.state;
    ending = r.ending;
  }
  return { ending, s };
}

/* ───────── 실행 ───────── */
const RUNS = Number(process.argv[2] ?? 20);
if (process.argv[3]) {
  const r = targetedRun(ENDING_MAP[process.argv[3]], 1000);
  console.log(r.ending.id, r.s.stats, r.s.status, Object.fromEntries(Object.entries(r.s.aptitudes).map(([k, v]) => [k, v.level])));
  console.log(Object.entries(r.s.actionCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
  console.log(r.s.activeCombos.join(','), r.s.gold);
  process.exit(0);
}
const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`.padStart(4);

console.log(`\n=== 목표형 봇: 엔딩별 ${RUNS}회 ===`);
console.log('ID     티어 획득 조건충족 결과(최빈)                 스탯합 남은G  주된 미달 조건');
const reach: Record<string, number> = {};
function missing(def: EndingDefinition, st: SaveState): string[] {
  const m: string[] = [];
  for (const [k, v] of Object.entries(def.minStats) as [StatKey, number][]) if (st.stats[k] < v) m.push(`${k}<${v}`);
  for (const [k, v] of Object.entries(def.maxStats ?? {}) as [StatKey, number][]) if (st.stats[k] > v) m.push(`${k}>${v}`);
  for (const [k, v] of Object.entries(def.minAptitudes ?? {})) if (st.aptitudes[k as 'APT_MED'].level < v!) m.push(`${k}<${v}`);
  if (def.anyAptitudes && !Object.entries(def.anyAptitudes).some(([k, v]) => st.aptitudes[k as 'APT_MED'].level >= v!)) m.push('anyApt');
  if (def.minFame !== undefined && st.status.fame < def.minFame) m.push(`명성<${def.minFame}`);
  if (def.minAffection !== undefined && st.status.affection < def.minAffection) m.push(`친밀<${def.minAffection}`);
  if (def.maxDelinquency !== undefined && st.status.delinquency > def.maxDelinquency) m.push(`비행>${def.maxDelinquency}`);
  if (def.minDelinquency !== undefined && st.status.delinquency < def.minDelinquency) m.push(`비행<${def.minDelinquency}`);
  if (def.minGold !== undefined && st.gold < def.minGold) m.push('골드');
  if (def.requiredComboId && !st.flags.includes(`COMBO:${def.requiredComboId}`) && !st.activeCombos.includes(def.requiredComboId)) m.push(def.requiredComboId);
  if (def.requiredFlag && !st.flags.includes(def.requiredFlag)) m.push(def.requiredFlag);
  for (const [k, v] of Object.entries(def.requiredActionCounts ?? {})) if ((st.actionCounts[k] ?? 0) < v) m.push(`${k}<${v}`);
  if (def.minFurnitureCollectionRate && st.collectedFurniture.length / FURNITURE.length < def.minFurnitureCollectionRate) m.push('도감');
  return m;
}
for (const def of ENDINGS.filter((d) => d.id !== 'END_50')) {
  let hit = 0;
  let met = 0;
  let sum = 0;
  let gold = 0;
  const got: Record<string, number> = {};
  const miss: Record<string, number> = {};
  for (let i = 0; i < RUNS; i++) {
    const r = targetedRun(def, 1000 + i);
    if (r.ending.id === def.id) hit++;
    if (meetsEnding(def, r.s, r.s.collectedFurniture.length / FURNITURE.length)) met++;
    for (const x of missing(def, r.s)) miss[x] = (miss[x] ?? 0) + 1;
    got[r.ending.id] = (got[r.ending.id] ?? 0) + 1;
    sum += STAT_KEYS.reduce((a, k) => a + r.s.stats[k], 0);
    gold += r.s.gold;
  }
  reach[def.id] = met / RUNS;
  const top = Object.entries(got).sort((a, b) => b[1] - a[1])[0];
  const mtxt = Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(' ');
  console.log(
    `${def.id} ${def.tier.padEnd(2)} ${pct(hit, RUNS)} ${pct(met, RUNS)}   ${(ENDING_MAP[top[0]].title.slice(0, 12) + ` ×${top[1]}`).padEnd(18)} ${String(Math.round(sum / RUNS)).padStart(5)} ${String(Math.round(gold / RUNS)).padStart(6)}  ${mtxt}`,
  );
}

const CASUAL = RUNS * 25;
console.log(`\n=== 캐주얼 봇: ${CASUAL}회 엔딩 분포 ===`);
const dist: Record<string, number> = {};
const tiers: Record<string, number> = {};
let statSum = 0;
let goldEnd = 0;
const idle: { st: object; apt: string; cnt: object }[] = [];
for (let i = 0; i < CASUAL; i++) {
  const r = casualRun(5000 + i);
  dist[r.ending.id] = (dist[r.ending.id] ?? 0) + 1;
  tiers[r.ending.tier] = (tiers[r.ending.tier] ?? 0) + 1;
  statSum += STAT_KEYS.reduce((a, k) => a + r.s.stats[k], 0);
  goldEnd += r.s.gold;
  if (r.ending.id === 'END_50')
    idle.push({
      st: r.s.stats,
      apt: Object.entries(r.s.aptitudes).filter(([, v]) => v.level >= 5).map(([k, v]) => `${k.slice(4)}${v.level}`).join(','),
      cnt: Object.fromEntries(Object.entries(r.s.actionCounts).filter(([k]) => /JOB_0[2346]|OUTING_TOTAL/.test(k))),
    });
}
console.log('티어:', Object.entries(tiers).map(([k, v]) => `${k} ${pct(v, CASUAL)}`).join(' · '));
console.log(`평균 최종 스탯 합 ${Math.round(statSum / CASUAL)}, 평균 남은 골드 ${Math.round(goldEnd / CASUAL)}G`);
console.log('한량 엔딩 아이들의 스탯 (상위 5명):');
for (const x of idle.slice(0, 5)) console.log('  ', JSON.stringify(x.st), x.apt, JSON.stringify(x.cnt));
console.log(`나온 엔딩 종류 ${Object.keys(dist).length}/${ENDINGS.length}`);
for (const [id, n] of Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 15))
  console.log(`  ${id} ${ENDING_MAP[id].title.padEnd(20)} ${pct(n, CASUAL)}`);
void APT_KEYS;
