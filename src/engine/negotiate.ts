import { SCHEDULE_ACTIONS } from '../data/scheduleData';
import type { ScheduleAction, StatKey } from '../types/game';
import { hashRng } from './specialDay';
import { monthIndex, type SaveState } from './simulation';

/**
 * 🤝 나이에 따라 바뀌는 스케줄 (v0.41)
 *  - 유년기(8~11): 부모가 4주를 정함 (예전과 같음)
 *  - 청소년기(12~16): 아이가 먼저 하고 싶은 4주를 들고 옴 → 부모가 바꾼 칸은 💬 설득 또는 ✋ 강제
 *      그대로 둔 칸은 '자기주도' (능력치 +20%, 스트레스 -20%), 강제한 칸은 반발이 쌓이고 파업 위험
 *  - 청년기(17~19): 아이가 4주를 정함 (칸은 못 바꿈) → 부모는 한 달에 한 번 뒷받침 카드
 */
export type PlanMode = 'PARENT' | 'NEGOTIATE' | 'AUTONOMY';
export const planMode = (age: number): PlanMode => (age >= 17 ? 'AUTONOMY' : age >= 12 ? 'NEGOTIATE' : 'PARENT');

export const trustOf = (s: Pick<SaveState, 'trust'>) => s.trust ?? 50;
export const defianceOf = (s: Pick<SaveState, 'defiance'>) => s.defiance ?? 0;
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export type Advice = 'EDUCATION' | 'ART' | 'SPORT' | 'PART_TIME';
export const ADVICE_META: Record<Advice, { emoji: string; label: string }> = {
  EDUCATION: { emoji: '📚', label: '공부에 집중해 보면 어때?' },
  ART: { emoji: '🎨', label: '예술·기술 쪽을 더 해 봐' },
  SPORT: { emoji: '🏃', label: '몸 쓰는 걸 해 보자' },
  PART_TIME: { emoji: '💼', label: '일하면서 경험을 쌓아 봐' },
};
const adviceHit = (a: ScheduleAction, adv: Advice) =>
  adv === 'EDUCATION' ? a.type === 'EDUCATION' && ((a.weeklyStatGains.INT ?? 0) > 0)
  : adv === 'ART' ? (a.weeklyStatGains.ART ?? 0) > 0 || (a.weeklyStatGains.TEC ?? 0) > 0
  : adv === 'SPORT' ? (a.weeklyStatGains.STR ?? 0) > 0
  : a.type === 'PART_TIME';

/** 아이가 하고 싶은 4주 (같은 달이면 늘 같음) */
export function childPlan(s: SaveState): string[] {
  const rng = hashRng(`${s.childName}|plan|${monthIndex(s)}`);
  const stress = s.status.stress;
  const delinq = s.status.delinquency;
  // 아이가 잘하는(높은) 능력치 두 개 → 그쪽 활동을 좋아함
  const top = (Object.entries(s.stats) as [StatKey, number][]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  const adviceOk = s.advice && rng() < trustOf(s) / 100; // 믿는 만큼 부모 조언을 따름
  const pool = SCHEDULE_ACTIONS.filter((a) => a.minAge <= s.age && (a.id !== 'JOB_08' || delinq >= 40) && (a.id !== 'OUT_ALLEY' || delinq >= 25));
  const w = new Map<string, number>();
  for (const a of pool) {
    let v = 1;
    if (a.type === 'REST') v += stress / 20;
    if (a.type === 'OUTING') v += 1 + stress / 40;
    if (a.type === 'EDUCATION') v -= stress / 50;
    if (top.some((k) => (a.weeklyStatGains[k] ?? 0) > 0)) v += 2;
    if ((s.actionCounts[a.id] ?? 0) >= 6) v += 0.6; // 해 보던 것
    if (a.id === 'OUT_ALLEY' || a.id === 'OUT_ARCADE' || a.id === 'JOB_08') v += delinq / 20;
    if (s.age >= 17 && a.type === 'PART_TIME') v += 0.8;
    if (a.weeklyGoldDelta < 0 && s.gold + a.weeklyGoldDelta * 4 < 0) v *= 0.2;
    if (a.id === 'REST_02') v *= 0.4; // 캠핑은 가끔
    if (adviceOk && adviceHit(a, s.advice as Advice)) v += 3;
    w.set(a.id, Math.max(0.1, v));
  }
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    const tot = [...w.values()].reduce((x, y) => x + y, 0);
    let r = rng() * tot;
    let pick = pool[0].id;
    for (const [id, v] of w) {
      r -= v;
      if (r <= 0) {
        pick = id;
        break;
      }
    }
    out.push(pick);
    w.set(pick, (w.get(pick) ?? 1) * 0.45); // 같은 걸 연달아 고르기 덜하게
  }
  // 지쳤으면 한 주는 꼭 쉬고 싶어 함
  if (stress >= 60 && !out.includes('REST_01')) out[3] = 'REST_01';
  return out;
}

/** 이번 달 계획을 준비 (아이 계획 → 스케줄). 이미 준비했으면 그대로 */
export function preparePlan(s: SaveState) {
  if (planMode(s.age) === 'PARENT') return;
  const mi = monthIndex(s);
  if (s.planFor === mi) return;
  s.planFor = mi;
  s.childWant = childPlan(s);
  s.monthlySchedule = [...s.childWant] as SaveState["monthlySchedule"];
  s.negoDone = false;
  s.negoHow = ['ASK', 'ASK', 'ASK', 'ASK'];
  s.ownWeeks = [true, true, true, true];
  s.forcedWeeks = [false, false, false, false];
  s.support = null;
}

export interface NegoLine {
  week: number;
  want: string;
  ask: string;
  how: 'OK' | 'ASK_OK' | 'ASK_NO' | 'FORCE';
  reply: string;
}

const REPLY = {
  OK: ['좋아, 이건 내가 하고 싶었던 거야!', '오 진짜? 고마워!', '응, 열심히 할게.'],
  ASK_OK: ['음... 그 말 들으니 그럴 만하네. 알았어.', '...알았어, 대신 다음엔 내 거 해 줘.', '그렇게까지 말하면 해 볼게.'],
  ASK_NO: ['싫어, 이건 내가 정할래.', '아 그건 진짜 싫단 말이야.', '...그냥 내가 원래 하려던 거 할래.'],
  FORCE: ['...알았다고. (문이 쾅 닫힌다)', '맨날 엄마 아빠 마음대로야.', '...진짜 최악이야.'],
};

/** 청소년기: 부모가 바꾼 칸마다 설득(ASK) 또는 강제(FORCE) → 결과 적용 */
export function negotiate(s: SaveState): NegoLine[] {
  const want = s.childWant ?? s.monthlySchedule;
  const how = s.negoHow ?? ['ASK', 'ASK', 'ASK', 'ASK'];
  const rng = hashRng(`${s.childName}|nego|${monthIndex(s)}|${s.monthlySchedule.join(',')}`);
  const temper = s.temperament;
  const lines: NegoLine[] = [];
  let trust = trustOf(s);
  let def = defianceOf(s);
  const own = [false, false, false, false];
  const forced = [false, false, false, false];
  for (let i = 0; i < 4; i++) {
    const ask = s.monthlySchedule[i];
    const pickReply = (k: keyof typeof REPLY) => REPLY[k][Math.floor(rng() * REPLY[k].length)];
    if (ask === want[i]) {
      own[i] = true;
      trust += 1;
      lines.push({ week: i, want: want[i], ask, how: 'OK', reply: pickReply('OK') });
    } else if (how[i] === 'FORCE') {
      forced[i] = true;
      trust -= 3;
      def += 8;
      lines.push({ week: i, want: want[i], ask, how: 'FORCE', reply: pickReply('FORCE') });
    } else {
      // 설득: 믿을수록 잘 통함, 고집 센 아이는 덜, 무난한 아이는 더
      const p = 0.2 + trust * 0.006 - def * 0.003 + (temper === 'STUBBORN' ? -0.15 : temper === 'EASYGOING' ? 0.15 : 0);
      if (rng() < p) {
        trust += 1;
        lines.push({ week: i, want: want[i], ask, how: 'ASK_OK', reply: pickReply('ASK_OK') });
      } else {
        s.monthlySchedule[i] = want[i];
        own[i] = true;
        lines.push({ week: i, want: want[i], ask, how: 'ASK_NO', reply: pickReply('ASK_NO') });
      }
    }
  }
  s.trust = clamp(trust);
  s.defiance = clamp(def);
  s.ownWeeks = own;
  s.forcedWeeks = forced;
  s.negoDone = true;
  return lines;
}

/** 청년기 뒷받침 카드 */
export type Support = 'FUND' | 'CHEER' | 'ADVICE' | 'HEALTH';
export const SUPPORT_META: Record<Support, { emoji: string; label: string; desc: string; cost?: number }> = {
  FUND: { emoji: '💰', label: '학원비·활동비 지원', desc: '이번 달 모든 활동 능력치 +30%', cost: 200 },
  CHEER: { emoji: '📣', label: '응원하기', desc: '스트레스 -10 · 친밀도 +3 · 신뢰 +2' },
  ADVICE: { emoji: '💬', label: '진로 상담', desc: '바라는 방향을 말해 줌 → 신뢰만큼 다음 달 계획에 반영' },
  HEALTH: { emoji: '🍱', label: '건강 챙기기', desc: '이번 달 쌓이는 스트레스 -30%' },
};

/** 아이가 스스로 정한 주의 효율 (자기주도) · 뒷받침 카드 효과 */
export function weekStatMul(s: SaveState, week: number) {
  let m = 1;
  if (planMode(s.age) !== 'PARENT' && s.ownWeeks?.[week]) m *= 1.2;
  if (s.support === 'FUND') m *= 1.3;
  return m;
}
export function weekStressMul(s: SaveState, week: number) {
  let m = 1;
  if (planMode(s.age) !== 'PARENT' && s.ownWeeks?.[week]) m *= 0.8;
  if (s.support === 'HEALTH') m *= 0.7;
  return m;
}

/** 월말: 반발은 조금씩 풀리고, 크면 마음이 멀어짐 */
export function monthlyTrust(s: SaveState, events: string[]) {
  if (planMode(s.age) === 'PARENT') return;
  const def = defianceOf(s);
  if (def >= 50) {
    s.status.affection = clamp(s.status.affection - 2);
    if (def >= 70) events.push('😤 반발심이 커서 아이가 말을 잘 안 해요 (친밀도 -2)');
  }
  s.defiance = clamp(def - 5);
  if ((s.ownWeeks ?? []).every(Boolean) && planMode(s.age) === 'NEGOTIATE') s.trust = clamp(trustOf(s) + 1);
}
