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
  type ParentingEvent,
} from '../data/parentingData';
import type { StatKey } from '../types/game';
import { STYLE_ATTITUDE, STYLE_PSYCHE, bumpAttitude } from './psyche';
import { addPhoto, monthIndex, type Rng, type SaveState, type WeekResult } from './simulation';
import { CLUES_TO_REVEAL, TEMPERAMENT_MAP, type TemperamentId } from '../data/temperamentData';

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
      const sk = k as 'stress' | 'affection' | 'delinquency' | 'fame' | 'selfEsteem' | 'autonomy';
      const max = sk === 'fame' ? 500 : 100;
      before = s.status[sk] ?? 50;
      after = s.status[sk] = clamp(before + v, 0, max);
    }
    if (after !== before) out[k] = after - before;
  }
  return out;
}

/** 부모의 대응 기록: 스타일 횟수 + 내면 심리(자존감·자율성) + 양육 태도 누적 (GDD 11.1) */
export function recordStyle(s: SaveState, style: ParentStyle): Effect {
  s.parenting = { WARM: 0, STRICT: 0, FREE: 0, PROTECT: 0, ...s.parenting };
  s.parenting[style] = (s.parenting[style] ?? 0) + 1;
  const att = STYLE_ATTITUDE[style];
  if (att) bumpAttitude(s, att);
  return applyEffect(s, STYLE_PSYCHE[style]);
}


/** 가장 많이 고른 양육 스타일 (동점이면 다정 > 자율 > 엄격) */
export function dominantStyle(s: Pick<SaveState, 'parenting'>): ParentStyle | null {
  const p = s.parenting;
  if (!p) return null;
  const order: ParentStyle[] = ['WARM', 'FREE', 'PROTECT', 'STRICT'];
  const best = order.reduce((a, b) => ((p[b] ?? 0) > (p[a] ?? 0) ? b : a), order[0]);
  return (p[best] ?? 0) > 0 ? best : null;
}

/* ───────── 육아 상황 ───────── */
/** 연속 이야기 단계가 지금 나올 수 있는지 */
function arcReady(s: SaveState, e: ParentingEvent) {
  if (!e.arc) return true;
  const st = s.arcs?.[e.arc.id];
  if (e.arc.step === 1) return !st;
  if (!st || st.done || st.step !== e.arc.step - 1) return false;
  if (monthIndex(s) < st.next) return false;
  return !e.arc.variant || st.result === e.arc.variant;
}

export function eligibleEvents(s: SaveState) {
  const seen = s.seenEvents ?? [];
  return PARENTING_EVENTS.filter(
    (e) =>
      !seen.includes(e.id) &&
      s.age >= e.minAge &&
      s.age <= e.maxAge &&
      (!e.months || e.months.includes(s.month)) &&
      (!e.cond || e.cond(s)) &&
      arcReady(s, e),
  );
}

/** 월말에 호출: 다음 달 시작 전에 부모가 대응할 상황을 정한다 (이미 남아 있으면 그대로) */
export function rollParentingEvent(s: SaveState, rng: Rng) {
  if (s.pendingEvent) return;
  const pool = eligibleEvents(s);
  // 이어지는 이야기의 다음 단계는 때가 되면 바로 나온다
  const due = pool.find((e) => e.arc && e.arc.step > 1);
  if (due) {
    s.pendingEvent = due.id;
    return;
  }
  if (rng() >= EVENT_CHANCE) return;
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
  /** 관찰 노트에 새로 적힌 단서 */
  clue?: string;
  /** 이번 선택으로 기질을 알아챘다 */
  revealed?: TemperamentId;
}

function mergeFx(a: Effect, b?: Effect): Effect {
  if (!b) return a;
  const out: Effect = { ...a };
  for (const [k, v] of Object.entries(b) as [EffectKey, number][]) out[k] = (out[k] ?? 0) + v;
  return out;
}

/** 부모의 선택 적용 */
export function resolveParentingEvent(s: SaveState, choiceIndex: number): EventOutcome | null {
  const ev = s.pendingEvent ? EVENT_MAP[s.pendingEvent] : null;
  if (!ev) return null;
  const c = ev.choices[choiceIndex];
  if (!c) return null;
  const temper = s.temperament ? TEMPERAMENT_MAP[s.temperament] : null;
  // 같은 대응이라도 아이 기질에 따라 결과가 달라진다
  const delta = applyEffect(s, mergeFx(c.fx, temper?.styleFx[c.style]));
  const psy = recordStyle(s, c.style);
  for (const [k, v] of Object.entries(psy) as [EffectKey, number][]) delta[k] = (delta[k] ?? 0) + v;
  s.seenEvents = [...(s.seenEvents ?? []), ev.id];
  s.memories = [...(s.memories ?? []), `${ev.id}:${c.style}`];
  s.pendingEvent = null;
  let reply = fillName(c.reply, s.childName, s.friend);
  addPhoto(s, { emoji: ev.emoji, title: ev.title, caption: reply, pose: (delta.affection ?? 0) >= 0 ? 'cheer' : 'stand' });
  if (c.reopenWishes) s.wishClosed = false;
  if (ev.arc) {
    const prev = s.arcs?.[ev.arc.id];
    s.arcs = {
      ...s.arcs,
      [ev.arc.id]: {
        step: ev.arc.step,
        styles: [...(prev?.styles ?? []), c.style],
        next: monthIndex(s) + (ev.arc.gap ?? 2),
        result: prev?.result,
        done: !!ev.arc.final,
      },
    };
  }
  const extra = ev.onResolve?.(s, c.style);
  if (extra) reply += `\n${extra}`;
  if (c.flag && !s.flags.includes(c.flag)) s.flags.push(c.flag);
  let wishText: string | undefined;
  if (c.wish && !s.wish && WISH_MAP[c.wish]) {
    startWish(s, c.wish);
    wishText = WISH_MAP[c.wish].text;
  }
  // 관찰 노트: 기질을 모를 때 아이 반응에서 단서를 얻는다
  let clue: string | undefined;
  let revealed: TemperamentId | undefined;
  if (temper && !s.temperRevealed) {
    clue = temper.clue[c.style];
    s.clues = [...(s.clues ?? []), clue];
    if (s.clues.length >= CLUES_TO_REVEAL) {
      s.temperRevealed = true;
      s.temperRevealedAge = s.age;
      revealed = temper.id;
    }
  }
  return { reply, delta, wishText, clue, revealed };
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
        addPhoto(s, { emoji: def.emoji, title: '들어준 부탁', caption: def.done, pose: 'cheer' });
        events.push(`💝 부탁을 들어줬다! "${def.done}"`);
        s.wish = null;
      } else {
        s.wish.left -= 1;
        if (s.wish.left <= 0) {
          applyEffect(s, WISH_FAIL);
          s.wishesFailed = (s.wishesFailed ?? 0) + 1;
          events.push(`💔 부탁을 들어주지 못했다... 아이가 서운해한다 (친밀도 ${WISH_FAIL.affection})`);
          // 여러 번 무시당하면 마음을 닫고 더는 부탁하지 않는다
          if (s.wishesFailed >= 3 && s.wishesFailed > (s.wishesGranted ?? 0)) s.wishClosed = true;
          s.wish = null;
        }
      }
      return; // 부탁이 끝난 달에는 새 부탁을 하지 않는다
    }
  }
  if (s.wishClosed) return;
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
