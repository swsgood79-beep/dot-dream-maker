import { LOCS, NPCS, TOWN_ENCS, type LocId, type NpcId, type TownEnc } from '../data/townData';
import type { Effect } from '../data/parentingData';
import { applyEffect } from './parenting';
import type { SaveState } from './simulation';

export interface Person {
  rel: number; // 0~100
  got?: number[]; // 받은 관계 보상 (50, 100)
  met?: boolean;
  /** 마지막으로 만난 나들이 번호 (s.townVisits 기준) */
  seenAt?: number;
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
  const npcEnc = (id: NpcId) => {
    const m = dueMilestone(s, id);
    const p = person(s, id);
    return TOWN_ENCS.find((e) => e.npc === id && (m ? e.milestone === m : e.tier === relTier(p.rel) && !e.milestone))!;
  };
  // 같은 사람은 나들이 3번에 한 번까지만 (같은 인사 장면이 몇 번씩 반복되지 않도록)
  const visits = s.townVisits ?? 0;
  const rested = (id: NpcId) => person(s, id).seenAt === undefined || visits - person(s, id).seenAt! >= 3;
  const npcs = (Object.keys(NPCS) as NpcId[]).filter((id) => NPCS[id].homes.includes(loc) && npcHere(s, id) && (dueMilestone(s, id) || rested(id)));
  const milestone = npcs.map((id) => ({ id, m: dueMilestone(s, id) })).find((x) => x.m);
  const generic = TOWN_ENCS.filter((e) => e.loc === loc && !e.npc && age >= (e.minAge ?? 0) && age <= (e.maxAge ?? 99));
  const fresh = generic.filter((e) => !recent.includes(e.id));
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
    p.seenAt = s.townVisits ?? 0;
    if (e.milestone) {
      p.got = [...(p.got ?? []), e.milestone];
      out.rel = { npc: e.npc, before, after: before, tierUp: false, perk: e.milestone === 50 ? NPCS[e.npc].perk50 : NPCS[e.npc].perk100 };
    } else {
      // 같은 장면이 덜 반복되도록 한 번 만날 때 조금 더 친해진다
      const gain = Math.round(((opt as { rel?: number }).rel ?? 0) * 1.5);
      p.rel = Math.min(100, before + gain);
      out.rel = { npc: e.npc, before, after: p.rel, tierUp: relTier(p.rel) > relTier(before) };
    }
    s.people = { ...(s.people ?? {}), [e.npc]: p };
  }
  s.townRecent = [...(s.townRecent ?? []).filter((x) => x !== e.id), e.id].slice(-8);
  s.townVisits = (s.townVisits ?? 0) + 1;
  return out;
}

/** 라이벌과 '라이벌이자 친구'가 되면 대회 점수 +5% */
export function rivalBonus(s: SaveState) {
  return person(s, 'RIVAL').got?.includes(50) ? 1.05 : 1;
}

/* ───────── 🎓 성인식 날 찾아온 사람들 · 20년 후 (v0.43) ───────── */
export interface PeopleEnding {
  npc: NpcId;
  label: string;
  tier: 0 | 1 | 2;
  ceremony: string; // 성인식 날
  later: string; // 20년 후
}

type Cat = 'ELITE' | 'TECH' | 'ENT' | 'BIZ' | 'ACTION' | 'HIDDEN' | 'DARK';

const LINES: Record<NpcId, [string, string][]> = {
  // [성인식 날, 20년 후] — 관계 단계 0 · 1 · 2
  FRIEND: [
    ['{friend}에게서 짧은 축하 문자가 왔어요. "성인 축하해~"', '{friend} 소식은 가끔 SNS로만 봐요. 그래도 사진에 "좋아요"는 꼭 눌러요.'],
    ['{friend}이(가) 꽃 한 송이를 들고 잠깐 들렀어요. "우리 진짜 어른이다!"', '{friend}와(과)는 1년에 한두 번 만나는 반가운 옛 친구예요.'],
    ['{friend}이(가) 제일 먼저 꽃다발을 들고 달려왔어요. 둘이 끌어안고 한참을 웃었어요.', '{friend}와(과)는 아직도 매주 통화해요. 서로의 결혼식에서 축사를 해 줬어요.'],
  ],
  RIVAL: [
    ['{rival}은(는) 오지 않았어요. 그래도 졸업 앨범 속 둘은 나란히 서 있어요.', '{rival}의 이름을 뉴스에서 봤어요. "역시 걔는 잘할 줄 알았어."'],
    ['{rival}이(가) 무심하게 한마디 했어요. "...축하한다. 다음엔 내가 이긴다."', '{rival}와(과)는 같은 분야에서 다시 만나 은근한 경쟁을 이어 가요.'],
    ['{rival}이(가) 손을 내밀었어요. "너 없었으면 여기까지 못 왔어."', '{rival}와(과)는 이제 서로를 가장 먼저 추천하는 동료가 됐어요.'],
  ],
  TEACHER: [
    ['{teacher} 선생님께 짧은 문자가 왔어요. "졸업 축하한다."', '{teacher} 선생님은 정년퇴임을 하셨대요.'],
    ['{teacher} 선생님이 축하 카드를 보내 주셨어요.', '스승의 날마다 {teacher} 선생님께 안부 인사를 드려요.'],
    ['{teacher} 선생님이 직접 오셔서 꼭 안아 주셨어요. "넌 선생님의 자랑이야."', '모교에 강연을 갔더니 {teacher} 선생님이 맨 앞줄에서 박수를 쳐 주셨어요.'],
  ],
  GRANNY: [
    ['빵집 할머니가 지나가다 "다 컸네~" 하고 웃으셨어요.', '동네 빵집 간판이 바뀌었어요. 할머니는 잘 지내실까요.'],
    ['빵집 할머니가 소보로빵 한 봉지를 쥐여 주셨어요.', '명절마다 할머니 빵집에 들러 안부를 전해요.'],
    ['빵집 할머니가 직접 구운 케이크를 들고 오셨어요. "우리 손주 장하다!"', '할머니의 비밀 레시피는 이제 아이가 지켜요. 해마다 그 소보로를 구워 할머니께 가져가요.'],
  ],
  MENTOR: [
    ['{mentor} 선배가 SNS에 축하 댓글을 남겼어요.', '{mentor} 선배는 먼 도시로 이사했대요.'],
    ['{mentor} 선배가 "이제 진짜 후배네!" 하고 밥을 사 줬어요.', '{mentor} 선배와는 가끔 만나 진로 이야기를 나눠요.'],
    ['{mentor} 선배가 교문 앞에서 기다리고 있었어요. "약속했잖아, 화이팅!"', '이제는 아이가 누군가의 선배가 되어, {mentor} 선배에게 받은 것을 그대로 돌려주고 있어요.'],
  ],
};

/** 엔딩 직업에 따라 덧붙는 한 줄 (관계가 깊은 사람만) */
const JOB_TWIST: Partial<Record<NpcId, Partial<Record<Cat, string>>>> = {
  FRIEND: { ENT: ' 첫 무대 맨 앞줄엔 늘 {friend}이(가) 있어요.', BIZ: ' {friend}이(가) 첫 투자자가 되어 줬어요.', DARK: ' 힘든 시절에도 {friend}만은 곁을 떠나지 않았어요.' },
  RIVAL: { ELITE: ' 같은 시험장에서 다시 만난 날, 둘 다 웃음이 터졌어요.', ACTION: ' 같은 팀 유니폼을 입게 됐어요.' },
  GRANNY: { BIZ: ' 할머니 레시피로 연 가게가 동네 명물이 됐어요.' },
  MENTOR: { TECH: ' 선배 회사에서 함께 일하자는 연락이 왔어요.', ELITE: ' 선배가 다니던 학교의 교수가 됐어요.' },
};

export function peopleEnding(s: SaveState, category?: string): PeopleEnding[] {
  const vars = townNames(s);
  const out: PeopleEnding[] = [];
  for (const id of Object.keys(NPCS) as NpcId[]) {
    const p = person(s, id);
    if (!p.met) continue;
    const tier = relTier(p.rel);
    const [c, l] = LINES[id][tier];
    const twist = tier === 2 && category ? (JOB_TWIST[id]?.[category as Cat] ?? '') : '';
    const label = id === 'FRIEND' ? vars.friend : id === 'RIVAL' ? vars.rival : id === 'TEACHER' ? `${vars.teacher} 선생님` : id === 'GRANNY' ? '빵집 할머니' : `${vars.mentor} 선배`;
    out.push({ npc: id, label, tier, ceremony: townText(c, vars), later: townText(l + twist, vars) });
  }
  return out.sort((a, b) => b.tier - a.tier);
}
