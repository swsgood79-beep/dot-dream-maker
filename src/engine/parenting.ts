import {
  EVENT_MAP,
  PARENTING_EVENTS,
  WISHES,
  WISH_FAIL,
  WISH_MAP,
  WISH_MONTHS,
  fillName,
  type Effect,
  type EffectKey,
  type ParentStyle,
} from '../data/parentingData';
import type { StatKey } from '../types/game';
import type { Rng, SaveState, WeekResult } from './simulation';

const STATS: StatKey[] = ['INT', 'STR', 'ART', 'CHA', 'MOR', 'TEC'];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 한 달 결과 뒤에 육아 상황이 생길 확률 */
export const EVENT_CHANCE = 0.45;
/** 진행 중인 부탁이 없을 때 새 부탁이 생길 확률 */
export const WISH_CHANCE = 0.3;

/** 효과 적용 → 실제로 바뀐 양 */
export function applyEffect(s: SaveState, fx: Effect): Effect {
  const out: Effect = {};
  for (const [k, v] of Object.entries(fx) as [EffectKey, number][]) {
    if (!v) continue;
    let before = 0;
    let after = 0;
    if ((STATS as string[]).includes(k)) {
      before = s.stats[k as StatKey];
      after = s.stats[k as StatKey] = clamp(before + v, 0, 999);
    } else if (k === 'gold') {
      before = s.gold;
      after = s.gold = Math.max(0, s.gold + v);
    } else if (k === 'idea') {
      before = s.ideaPoints;
      after = s.ideaPoints = Math.max(0, s.ideaPoints + v);
    } else {
      const sk = k as 'stress' | 'affection' | 'delinquency' | 'fame';
      const max = sk === 'fame' ? 500 : 100;
      before = s.status[sk];
      after = s.status[sk] = clamp(before + v, 0, max);
    }
    if (after !== before) out[k] = after - before;
  }
  return out;
}

function bumpStyle(s: SaveState, style: ParentStyle) {
  s.parenting = { WARM: 0, STRICT: 0, FREE: 0, ...s.parenting };
  s.parenting[style] += 1;
}

/** 가장 많이 고른 양육 스타일 (동점이면 다정 > 자율 > 엄격) */
export function dominantStyle(s: Pick<SaveState, 'parenting'>): ParentStyle | null {
  const p = s.parenting;
  if (!p) return null;
  const order: ParentStyle[] = ['WARM', 'FREE', 'STRICT'];
  const best = order.reduce((a, b) => (p[b] > p[a] ? b : a), order[0]);
  return p[best] > 0 ? best : null;
}

/* ───────── 육아 상황 ───────── */
export function eligibleEvents(s: SaveState) {
  const seen = s.seenEvents ?? [];
  return PARENTING_EVENTS.filter(
    (e) =>
      !seen.includes(e.id) &&
      s.age >= e.minAge &&
      s.age <= e.maxAge &&
      (!e.months || e.months.includes(s.month)) &&
      (!e.cond || e.cond(s)),
  );
}

/** 월말에 호출: 다음 달 시작 전에 부모가 대응할 상황을 정한다 (이미 남아 있으면 그대로) */
export function rollParentingEvent(s: SaveState, rng: Rng) {
  if (s.pendingEvent) return;
  if (rng() >= EVENT_CHANCE) return;
  const pool = eligibleEvents(s);
  if (!pool.length) return;
  // 그 달에만 있는 이벤트(명절·시험 등)는 더 잘 나오게
  const w = pool.map((e) => (e.weight ?? 1) * (e.months ? 2.5 : 1));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) {
      s.pendingEvent = pool[i].id;
      return;
    }
  }
  s.pendingEvent = pool[pool.length - 1].id;
}

export interface EventOutcome {
  reply: string;
  delta: Effect;
  wishText?: string;
}

/** 부모의 선택 적용 */
export function resolveParentingEvent(s: SaveState, choiceIndex: number): EventOutcome | null {
  const ev = s.pendingEvent ? EVENT_MAP[s.pendingEvent] : null;
  if (!ev) return null;
  const c = ev.choices[choiceIndex];
  if (!c) return null;
  const delta = applyEffect(s, c.fx);
  bumpStyle(s, c.style);
  s.seenEvents = [...(s.seenEvents ?? []), ev.id];
  s.pendingEvent = null;
  let wishText: string | undefined;
  if (c.wish && !s.wish && WISH_MAP[c.wish]) {
    startWish(s, c.wish);
    wishText = WISH_MAP[c.wish].text;
  }
  return { reply: fillName(c.reply, s.childName), delta, wishText };
}

/* ───────── 아이의 부탁 ───────── */
export function startWish(s: SaveState, id: string) {
  s.wish = { id, left: WISH_MONTHS, progress: 0 };
  s.lastWish = id;
}

export function wishGoal(id: string) {
  const w = WISH_MAP[id];
  return w.kind === 'action' ? (w.count ?? 1) : 1;
}

function furnitureReady(s: SaveState, fid: string) {
  return s.placedFurniture.some((p) => p.furnitureId === fid);
}

/**
 * 한 달 4주가 끝난 뒤 호출: 부탁 진행도 갱신, 성공/실패 처리, 새 부탁 생성.
 * talkKind는 이번 달 대화 종류 (대화하기/칭찬하기를 했으면 '들어 주기'로 인정)
 */
export function updateWish(s: SaveState, weeks: WeekResult[], rng: Rng, events: string[]) {
  if (s.wish) {
    const def = WISH_MAP[s.wish.id];
    if (!def) s.wish = null;
    else {
      if (def.kind === 'action') s.wish.progress += weeks.filter((w) => w.actionId === def.target && w.outcome !== 'RUNAWAY').length;
      else if (def.kind === 'furniture') s.wish.progress = furnitureReady(s, def.target!) ? 1 : 0;
      else if (def.kind === 'talk') s.wish.progress = s.talkKind === 'talk' || s.talkKind === 'praise' ? 1 : s.wish.progress;
      if (s.wish.progress >= wishGoal(def.id)) {
        applyEffect(s, def.reward);
        s.wishesGranted = (s.wishesGranted ?? 0) + 1;
        events.push(`💝 부탁을 들어줬다! "${def.done}"`);
        s.wish = null;
      } else {
        s.wish.left -= 1;
        if (s.wish.left <= 0) {
          applyEffect(s, WISH_FAIL);
          s.wishesFailed = (s.wishesFailed ?? 0) + 1;
          events.push(`💔 부탁을 들어주지 못했다... 아이가 서운해한다 (친밀도 ${WISH_FAIL.affection})`);
          s.wish = null;
        }
      }
      return; // 부탁이 끝난 달에는 새 부탁을 하지 않는다
    }
  }
  if (rng() >= WISH_CHANCE) return;
  const pool = WISHES.filter(
    (w) =>
      !w.eventOnly &&
      w.id !== s.lastWish &&
      s.age >= w.minAge &&
      s.age <= w.maxAge &&
      (!w.cond || w.cond(s)) &&
      !(w.kind === 'furniture' && furnitureReady(s, w.target!)),
  );
  if (!pool.length) return;
  const w = pool[Math.floor(rng() * pool.length)];
  startWish(s, w.id);
  events.push(`💭 ${s.childName}의 부탁: "${w.text}" (${WISH_MONTHS}개월 안에 · ${w.hint})`);
}
