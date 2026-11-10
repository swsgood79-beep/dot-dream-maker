import { BAD_FOR, BAD_REPLY, BAD_TEXT, EMO_MAP, EMO_SCENES, type BadKind, type EmoScene, type EmoStage, type EmoTrigger, type StepKind } from '../data/emotionData';
import type { Effect, ParentStyle } from '../data/parentingData';
import { applyEffect, recordStyle } from './parenting';
import { growthStage } from './room';
import { hashRng } from './specialDay';
import { monthIndex, type SaveState } from './simulation';
import { townNames, townText } from './town';

export type EmoPick = 'GOOD' | BadKind;

export const eqOf = (s: Pick<SaveState, 'eq'>) => s.eq ?? 40;

export function emoSteps(sc: EmoScene): StepKind[] {
  return sc.limit ? ['EMPATHY', 'LABEL', 'LIMIT', 'SOLVE'] : ['EMPATHY', 'LABEL', 'SOLVE'];
}

/** 단계의 선택지 3개 (코칭 1 + 흔한 반응 2) — 화면에서 섞어 보여 준다 */
export function emoOptions(sc: EmoScene, step: StepKind, stage: EmoStage): { pick: EmoPick; text: string; reply: string }[] {
  const good =
    step === 'EMPATHY' ? sc.empathy : step === 'LABEL' ? sc.label : step === 'LIMIT' ? [sc.limit!.good, sc.limit!.reply] : sc.solve;
  return [
    { pick: 'GOOD', text: good[0], reply: good[1] },
    ...BAD_FOR[step].map((b) => ({ pick: b as EmoPick, text: b === 'FIX' ? sc.fix : BAD_TEXT[b as Exclude<BadKind, 'FIX'>], reply: BAD_REPLY[stage][b] })),
  ];
}

export function emoText(s: SaveState, t: string) {
  return townText(t, townNames(s));
}

const STYLE_OF: Record<EmoPick, ParentStyle> = {
  GOOD: 'WARM', DISMISS: 'FREE', SUPPRESS: 'STRICT', LECTURE: 'STRICT', FIX: 'PROTECT', THREAT: 'STRICT', PERMIT: 'FREE', DIRECT: 'STRICT', FORGET: 'FREE',
};

/**
 * 감정의 순간을 고른다.
 * STRIKE(학원 파업한 달) · CONTEST_LOSS(대회에서 진 날)는 그 일에 맞는 장면이 바로, RANDOM 은 3달 이상 지났을 때 가끔 (스트레스가 높으면 더 자주).
 */
export function rollEmotion(s: SaveState, trigger: EmoTrigger, age = s.age) {
  if (s.pendingEmotion) return;
  const now = monthIndex(s);
  const gap = now - (s.lastEmotionAt ?? -99);
  const stage = growthStage(age) as EmoStage;
  const rng = hashRng(`${s.childName}|emo|${now}|${trigger}|${(s.emoSeen ?? []).length}`);
  if (trigger === 'RANDOM') {
    if (gap < 3 || s.pendingSpecial || s.pendingCutscene || s.pendingBirthday) return;
    if (s.age === 8 && s.month <= 3) return;
    const chance = 0.4 + (s.status.stress >= 50 ? 0.25 : 0);
    if (rng() >= chance) return;
  } else if (gap < 1) return;
  const pool = EMO_SCENES.filter((e) => e.stage === stage && e.trigger === trigger);
  if (!pool.length) return;
  const seen = s.emoSeen ?? [];
  const fresh = pool.filter((e) => !seen.includes(e.id));
  const from = fresh.length ? fresh : pool;
  s.pendingEmotion = from[Math.floor(rng() * from.length)].id;
}

export interface EmoResult {
  good: number;
  total: number;
  shut: boolean;
  delta: Effect;
  eqBefore: number;
  eqAfter: number;
  picks: EmoPick[];
}

/** 다 고르면 (또는 아이가 마음을 닫으면) 결과 적용 */
export function resolveEmotion(s: SaveState, picks: EmoPick[], shut: boolean): EmoResult | null {
  const sc = s.pendingEmotion ? EMO_MAP[s.pendingEmotion] : null;
  if (!sc) {
    s.pendingEmotion = null;
    return null;
  }
  const total = emoSteps(sc).length;
  const good = picks.filter((p) => p === 'GOOD').length;
  const bad = picks.length - good;
  const fx: Effect = {
    affection: good * 2 - bad - (shut ? 3 : 0),
    stress: -good * 4 + bad * 2 + (shut ? 3 : 0),
    selfEsteem: good - (shut ? 2 : 0),
  };
  const delta = applyEffect(s, fx);
  const eqBefore = eqOf(s);
  s.eq = Math.max(0, Math.min(100, eqBefore + good * 4 - bad * 2 - (shut ? 2 : 0)));
  // 이번에 가장 많이 한 반응으로 양육 스타일 기록
  const cnt = new Map<ParentStyle, number>();
  for (const p of picks) cnt.set(STYLE_OF[p], (cnt.get(STYLE_OF[p]) ?? 0) + 1);
  const top = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) recordStyle(s, top[0]);
  s.emoSeen = [...(s.emoSeen ?? []).filter((x) => x !== sc.id), sc.id];
  s.emoLog = [...(s.emoLog ?? []), { age: s.age, id: sc.id, good, total }].slice(-60);
  s.lastEmotionAt = monthIndex(s);
  s.pendingEmotion = null;
  return { good, total, shut, delta, eqBefore, eqAfter: s.eq, picks };
}

/** 감정 조절력 단계 이름 */
export function eqLabel(eq: number) {
  return eq >= 75 ? '감정을 말로 잘 풀어요' : eq >= 55 ? '마음을 조금씩 표현해요' : eq >= 35 ? '아직 서툴러요' : '감정을 꾹 참거나 터뜨려요';
}
