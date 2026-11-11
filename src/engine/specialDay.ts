import { SPECIAL_DAYS, SPECIAL_MAP, type SpResult, type SpecialDay } from '../data/specialDays';
import type { Effect } from '../data/parentingData';
import { applyEffect } from './parenting';
import { growthStage } from './room';
import { addPhoto, CONTESTS, monthIndex, type SaveState } from './simulation';

/** 같은 저장·같은 달이면 늘 같은 결과 (게임 진행 난수를 건드리지 않음) */
export function hashRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const seenKey = (s: Pick<SaveState, 'age'>, id: string) => `${id}:${growthStage(s.age)}`;

export function eligibleSpecials(s: SaveState): SpecialDay[] {
  const seen = s.specialSeen ?? [];
  return SPECIAL_DAYS.filter((d) => s.age >= d.minAge && s.age <= d.maxAge && (!d.months || d.months.includes(s.month)) && !seen.includes(seenKey(s, d.id)));
}

/**
 * 새 달 시작에 '특별한 하루'를 고른다.
 * 대회·생일·성장 컷신·새 콘텐츠 알림이 있는 달은 이미 볼거리가 있으니 건너뛰고, 조용한 달에 2~3달 간격으로.
 */
export function rollSpecialDay(s: SaveState) {
  if (s.pendingSpecial) return;
  // 첫 판 첫 달(튜토리얼) 다음 달에는 꼭 하나 — 게임 초반에 재미있는 순간을 빨리 보여 주기
  if (s.age === 8 && s.month === 2 && !(s.specialSeen ?? []).length) {
    s.pendingSpecial = 'SP_TOOTH';
    return;
  }
  if (s.age === 8 && s.month <= 2) return;
  if (s.age === 19 && s.month === 12) return;
  if (s.pendingCutscene || s.pendingBirthday || s.pendingUnlock) return;
  if ((Object.keys(CONTESTS) as (keyof typeof CONTESTS)[]).some((k) => CONTESTS[k].month === s.month)) return;
  const now = monthIndex(s);
  const gap = now - (s.lastSpecialAt ?? 0);
  if (gap < 2) return;
  const rng = hashRng(`${s.childName}|${now}|${(s.specialSeen ?? []).length}`);
  // 육아 상황도 와 있으면 너무 몰리지 않게 오래 비었을 때만
  const chance = s.pendingEvent ? (gap >= 4 ? 1 : 0) : gap >= 3 ? 1 : 0.5;
  if (rng() >= chance) return;
  const pool = eligibleSpecials(s);
  if (!pool.length) return;
  // 이 달에만 있는 명절·계절 이벤트를 더 잘 나오게
  const w = pool.map((d) => (d.weight ?? 1) * (d.months ? 3 : 1));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  let pick = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) {
      pick = pool[i];
      break;
    }
  }
  s.pendingSpecial = pick.id;
}

export interface SpecialPlay {
  picks: number[]; // 단계별 고른 번호 (build 는 칸 순서대로 이어 붙임, catch/timing 은 -1)
  score: number; // catch 로 잡은 개수
  tier: 0 | 1 | 2; // 마지막 catch/timing 점수
}

/** 고른 것들을 결과 문장에 넣을 글자로 */
export function pickWords(d: SpecialDay, picks: number[]): string[] {
  const out: string[] = [];
  let i = 0;
  for (const st of d.steps) {
    if (st.kind === 'build') for (const sl of st.slots) out.push(sl.options[picks[i++] ?? 0]?.emoji ?? '');
    else if (st.kind === 'pick') out.push(st.options[picks[i++] ?? 0]?.label ?? '');
    else i++;
  }
  return out;
}

export function specialResultIndex(d: SpecialDay, p: SpecialPlay): number {
  const last = d.steps[d.steps.length - 1];
  if (last.kind === 'pick') return Math.min(d.results.length - 1, p.picks[p.picks.length - 1] ?? 0);
  return p.tier;
}

/** 이름 끝 받침에 맞춰 이/가 */
function iga(name: string) {
  const c = name.charCodeAt(name.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? '이' : '가';
}

export function fillText(t: string, name: string, words: string[], score: number) {
  return t
    .split('{name}이(가)').join(name + iga(name))
    .split('{name}').join(name)
    .split('{score}').join(String(score))
    .replace(/\{p(\d)\}/g, (_, n) => words[+n] ?? '');
}

/** 놀이를 마치면: 고른 카드의 효과 + 결과 효과 · 사진 · 다시 안 나오게 기록 */
export function resolveSpecial(s: SaveState, p: SpecialPlay): { day: SpecialDay; result: SpResult; text: string; delta: Effect } | null {
  const id = s.pendingSpecial;
  const d = id ? SPECIAL_MAP[id] : null;
  if (!d) {
    s.pendingSpecial = null;
    return null;
  }
  const total: Effect = {};
  const add = (fx?: Effect) => {
    for (const [k, v] of Object.entries(fx ?? {}) as [keyof Effect, number][]) total[k] = (total[k] ?? 0) + v;
  };
  let i = 0;
  for (const st of d.steps) {
    if (st.kind === 'build') for (const sl of st.slots) add(sl.options[p.picks[i++] ?? 0]?.fx);
    else if (st.kind === 'pick') add(st.options[p.picks[i++] ?? 0]?.fx);
    else i++;
  }
  const result = d.results[specialResultIndex(d, p)];
  add(result.fx);
  const delta = applyEffect(s, total);
  const words = pickWords(d, p.picks);
  const text = fillText(result.text, s.childName, words, p.score);
  if (result.photo) addPhoto(s, { ...result.photo, caption: fillText(result.photo.caption, s.childName, words, p.score) });
  s.specialSeen = [...(s.specialSeen ?? []), seenKey(s, d.id)];
  s.lastSpecialAt = monthIndex(s);
  s.pendingSpecial = null;
  return { day: d, result, text, delta };
}
