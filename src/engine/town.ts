import { LOCS, NPCS, TOWN_ENCS, type LocId, type NpcId, type TownEnc } from '../data/townData';
import type { Effect } from '../data/parentingData';
import { applyEffect } from './parenting';
import type { SaveState } from './simulation';

export interface Person {
  rel: number; // 0~100
  got?: number[]; // 받은 관계 보상 (50, 100)
  met?: boolean;
}

const RIVALS = { SON: ['태오', '준서', '건우', '현우'], DAUGHTER: ['다은', '지민', '소율', '예린'] };
const MENTORS = ['지환', '수빈', '연우', '민재'];
const TEACHERS = ['김', '이', '박', '최', '정'];

function hash(t: string) {
  return [...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
}

/** 이 판의 동네 사람 이름 (아이 이름으로 정해져 항상 같음) */
export function townNames(s: Pick<SaveState, 'childName' | 'gender' | 'friend'>) {
  const h = hash(s.childName);
  const pick = (a: string[], k: number) => {
    const v = a[(h + k) % a.length];
    return v === s.childName || v === s.friend ? a[(h + k + 1) % a.length] : v;
  };
  return {
    name: s.childName,
    friend: s.friend ?? '서연',
    rival: pick(RIVALS[s.gender], 1),
    mentor: pick(MENTORS, 3),
    teacher: TEACHERS[h % TEACHERS.length],
  };
}

const hasBatchim = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
const JOSA: Record<string, [string, string]> = { '이(가)': ['이', '가'], '은(는)': ['은', '는'], '을(를)': ['을', '를'], '와(과)': ['과', '와'] };

/** {name}·{friend}… 를 이름으로, 뒤에 붙은 이(가)·을(를) 등은 받침에 맞게 */
export function townText(t: string, vars: Record<string, string>) {
  return t.replace(/\{(\w+)\}(이\(가\)|은\(는\)|을\(를\)|와\(과\))?/g, (_, k: string, j?: string) => {
    const w = vars[k] ?? '';
    if (!j) return w;
    const [a, b] = JOSA[j];
    return w + (hasBatchim(w) ? a : b);
  });
}

export const relTier = (rel: number): 0 | 1 | 2 => (rel >= 70 ? 2 : rel >= 30 ? 1 : 0);

export function person(s: SaveState, id: NpcId): Person {
  return s.people?.[id] ?? { rel: 0 };
}

export function npcHere(s: SaveState, id: NpcId) {
  if (s.age < NPCS[id].minAge) return false;
  if (id === 'FRIEND' && (!s.friend || s.flags.includes('FRIEND_AWAY'))) return false;
  return true;
}

export function availableLocs(s: SaveState) {
  return LOCS.filter((l) => s.age >= l.minAge);
}

/** 받을 때가 된 관계 보상 */
function dueMilestone(s: SaveState, id: NpcId): 50 | 100 | null {
  const p = person(s, id);
  const got = p.got ?? [];
  if (p.rel >= 100 && !got.includes(100) && got.includes(50)) return 100;
  if (p.rel >= 50 && !got.includes(50)) return 50;
  return null;
}

/** 장소에 가면 생기는 일 하나 */
export function pickEncounter(s: SaveState, loc: LocId, rng: () => number = Math.random): TownEnc {
  const age = s.age;
  const recent = s.townRecent ?? [];
  const npcs = (Object.keys(NPCS) as NpcId[]).filter((id) => NPCS[id].homes.includes(loc) && npcHere(s, id));
  const milestone = npcs.map((id) => ({ id, m: dueMilestone(s, id) })).find((x) => x.m);
  const generic = TOWN_ENCS.filter((e) => e.loc === loc && !e.npc && age >= (e.minAge ?? 0) && age <= (e.maxAge ?? 99));
  const fresh = generic.filter((e) => !recent.includes(e.id));
  const npcEnc = (id: NpcId) => {
    const m = dueMilestone(s, id);
    const p = person(s, id);
    return TOWN_ENCS.find((e) => e.npc === id && (m ? e.milestone === m : e.tier === relTier(p.rel) && !e.milestone))!;
  };
  if (milestone && rng() < 0.85) return npcEnc(milestone.id);
  if (npcs.length && (rng() < 0.55 || !fresh.length)) {
    // 덜 친한 사람을 조금 더 자주 (골고루 만나도록)
    const w = npcs.map((id) => 1.4 - person(s, id).rel / 100);
    let r = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < npcs.length; i++) {
      r -= w[i];
      if (r <= 0) return npcEnc(npcs[i]);
    }
    return npcEnc(npcs[npcs.length - 1]);
  }
  const pool = fresh.length ? fresh : generic;
  return pool[Math.floor(rng() * pool.length)];
}

export interface TownOutcome {
  reply: string;
  delta: Effect;
  rel?: { npc: NpcId; before: number; after: number; tierUp: boolean; perk?: string };
}

/** 만남·놀이 결과를 적용 (pick: 고른 선택지 번호, 또는 놀이 결과 번호) */
export function resolveEncounter(s: SaveState, encId: string, pick: number): TownOutcome | null {
  const e = TOWN_ENCS.find((x) => x.id === encId);
  if (!e) return null;
  const opt = e.choices ? e.choices[Math.min(pick, e.choices.length - 1)] : e.results?.[Math.min(pick, (e.results?.length ?? 1) - 1)];
  if (!opt) return null;
  const delta = applyEffect(s, opt.fx);
  const vars = townNames(s);
  const out: TownOutcome = { reply: townText('reply' in opt ? opt.reply : opt.text, vars), delta };
  if (e.npc) {
    const p = { ...person(s, e.npc) };
    const before = p.rel;
    p.met = true;
    if (e.milestone) {
      p.got = [...(p.got ?? []), e.milestone];
      out.rel = { npc: e.npc, before, after: before, tierUp: false, perk: e.milestone === 50 ? NPCS[e.npc].perk50 : NPCS[e.npc].perk100 };
    } else {
      const gain = (opt as { rel?: number }).rel ?? 0;
      p.rel = Math.min(100, before + gain);
      out.rel = { npc: e.npc, before, after: p.rel, tierUp: relTier(p.rel) > relTier(before) };
    }
    s.people = { ...(s.people ?? {}), [e.npc]: p };
  }
  s.townRecent = [...(s.townRecent ?? []).filter((x) => x !== e.id), e.id].slice(-8);
  return out;
}

/** 라이벌과 '라이벌이자 친구'가 되면 대회 점수 +5% */
export function rivalBonus(s: SaveState) {
  return person(s, 'RIVAL').got?.includes(50) ? 1.05 : 1;
}
