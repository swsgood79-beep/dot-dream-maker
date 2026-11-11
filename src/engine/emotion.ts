import { BAD_FOR, BAD_REPLY, BAD_TEXT, EMO_MAP, EMO_SCENES, type BadKind, type EmoScene, type EmoStage, type EmoTrigger, type StepKind } from '../data/emotionData';
import type { Effect, ParentStyle } from '../data/parentingData';
import { applyEffect, recordStyle } from './parenting';
import { growthStage } from './room';
import { hashRng } from './specialDay';
import { monthIndex, type SaveState, type WeekResult } from './simulation';
import { SCHEDULE_ACTIONS } from '../data/scheduleData';
import { computeReport } from './school';
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

type Wk = Pick<WeekResult, 'actionId' | 'actionType' | 'outcome'>;
const ACT_NAME = (id: string) => SCHEDULE_ACTIONS.find((a) => a.id === id)?.name ?? id;

/**
 * '평소' 장면이 뜨려면 그 달에 실제로 그럴 만한 일이 있어야 함 → 이유 문장을 돌려줌 (없으면 null = 이번 달엔 안 뜸)
 * 화면 맨 위에 "📌 왜 이런 일이?"로 그대로 보여 줌
 */
const CAUSE: Record<string, (s: SaveState, w: Wk[]) => string | null> = {
  EC_TOY: (_s, w) => (w.some((x) => x.actionId === 'OUT_SHOP') ? '이번 달 백화점에 쇼핑하러 갔던 날이에요.' : null),
  EC_DRAWING: (s, w) => {
    const art = w.filter((x) => x.actionId === 'EDU_06');
    if (!art.length) return null;
    return art.some((x) => x.outcome === 'FAIL') ? '이번 달 미술 화실에서 그림이 잘 안 된 주가 있었어요.' : s.status.stress >= 40 ? '이번 달 미술 화실을 다녀왔는데, 요즘 좀 지쳐 있어요.' : null;
  },
  EC_GAME: (_s, w) => (w.some((x) => x.outcome === 'FAIL') && w.some((x) => x.actionType === 'REST') ? `이번 달 '${ACT_NAME(w.find((x) => x.outcome === 'FAIL')!.actionId)}'에서 잘 안 된 주가 있었고, 집에서 쉬는 날 가족 보드게임을 했어요.` : null),
  EC_TEASE: (s) => ((s.month === 3 || s.month === 4) && s.stats.CHA < 120 ? '새 학년 새 반이 된 지 얼마 안 됐고, 아직 친구 사귀는 게 서툴러요 (매력이 낮음).' : (s.status.selfEsteem ?? 50) < 40 ? '요즘 자신감이 많이 떨어져 있어요 (자존감이 낮음).' : null),
  ET_EXAM: (s) => {
    if (!s.pendingReport) return null;
    const card = computeReport(s);
    const avg = card.subjects.reduce((a, x) => a + x.ratio, 0) / card.subjects.length;
    return avg < 0.9 ? '방금 받은 성적표 결과가 기대보다 낮았어요.' : null;
  },
  ET_FRIEND: (s) => {
    const vals = Object.values(s.stats);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (s.stats.CHA < mean * 0.75) return '친구 관계가 서툴러요 (다른 능력치보다 매력이 많이 낮음).';
    if (s.flags.includes('FRIEND_AWAY') && (s.people?.FRIEND?.rel ?? 0) < 30) return '단짝이 전학 간 뒤로 마음 붙일 친구가 없어요.';
    return null;
  },
  ET_LOOKS: (s) => ((s.status.selfEsteem ?? 50) < 45 ? '요즘 자신감이 많이 떨어져 있어요 (자존감이 낮음).' : null),
  EY_ANXIETY: (s, w) =>
    s.age === 19 && s.month >= 9 && s.month <= 11
      ? '수능이 얼마 남지 않았어요.'
      : s.status.stress >= 50 && w.filter((x) => x.actionType === 'EDUCATION').length >= 2
        ? '입시 공부가 몰린 달이라 스트레스가 높아요.'
        : null,
  EY_JOB: (_s, w) => {
    const job = w.find((x) => x.actionType === 'PART_TIME' && x.actionId !== 'JOB_01');
    if (!job) return null;
    return w.some((x) => x.actionType === 'PART_TIME' && x.outcome === 'FAIL') ? `이번 달 '${ACT_NAME(job.actionId)}'에서 실수한 주가 있었어요.` : `이번 달 '${ACT_NAME(job.actionId)}'에서 일했어요.`;
  },
  EY_BEHIND: (s) => (s.age >= 18 && (s.month === 12 || s.month <= 2) ? '친구들의 대학 합격 소식이 들려오는 때예요.' : null),
};

/**
 * 감정의 순간을 고른다.
 * STRIKE(학원 파업한 달) · CONTEST_LOSS(대회에서 진 날)는 그 일에 맞는 장면,
 * RANDOM 은 그 달에 실제로 그럴 만한 일(CAUSE)이 있는 장면만, 3달 이상 지났을 때 (스트레스가 높으면 더 자주).
 */
export function rollEmotion(s: SaveState, trigger: EmoTrigger, age = s.age, weeks: Wk[] = [], why?: string) {
  if (s.pendingEmotion) return;
  const now = monthIndex(s);
  const gap = now - (s.lastEmotionAt ?? -99);
  const stage = growthStage(age) as EmoStage;
  const rng = hashRng(`${s.childName}|emo|${now}|${trigger}|${(s.emoSeen ?? []).length}`);
  if (trigger === 'RANDOM') {
    if (gap < 3 || s.pendingSpecial || s.pendingCutscene || s.pendingBirthday) return;
    if (s.age === 8 && s.month <= 3) return;
    const chance = 0.55 + (s.status.stress >= 50 ? 0.25 : 0);
    if (rng() >= chance) return;
  } else if (gap < 2) return;
  const seen = s.emoSeen ?? [];
  let pool = EMO_SCENES.filter((e) => e.stage === stage && e.trigger === trigger).map((e) => ({ e, why: trigger === 'RANDOM' ? (CAUSE[e.id]?.(s, weeks) ?? null) : (why ?? null) }));
  if (trigger === 'RANDOM') pool = pool.filter((x) => x.why);
  if (!pool.length) return;
  // 같은 장면은 한 판에 한 번만 (반복되면 뜬금없게 느껴짐)
  const from = pool.filter((x) => !seen.includes(x.e.id));
  if (!from.length) return;
  const pick = from[Math.floor(rng() * from.length)];
  s.pendingEmotion = pick.e.id;
  s.emoWhy = pick.why;
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
  s.emoWhy = null;
  return { good, total, shut, delta, eqBefore, eqAfter: s.eq, picks };
}

/** 감정 조절력 단계 이름 */
export function eqLabel(eq: number) {
  return eq >= 75 ? '감정을 말로 잘 풀어요' : eq >= 55 ? '마음을 조금씩 표현해요' : eq >= 35 ? '아직 서툴러요' : '감정을 꾹 참거나 터뜨려요';
}
