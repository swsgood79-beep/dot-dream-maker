import { FURNITURE_MAP } from '../data/furnitureData';
import type { Effect, ParentStyle } from '../data/parentingData';
import { growthStage } from './room';
import type { SaveState, WeekResult } from './simulation';

/**
 * GDD 11장 현실 육아 시스템
 * - 내면 심리: 자존감(selfEsteem) · 자율성(autonomy), 0~100 (처음 50)
 * - 4대 양육 태도: 플레이어의 선택·행동이 쌓여서 정해짐
 * - 방 공기: 공부 가구만 가득 + 스트레스 → 숨 막히는 방, 방문 잠금
 * - 이상행동: 관찰 카메라(REC)로 겉말 뒤 속마음을 보고 코칭
 */
export type Attitude = 'TIGER' | 'HELICOPTER' | 'NEGLECT' | 'COACHING';
export const ATTITUDE_META: Record<Attitude, { label: string; emoji: string; desc: string; short: string; long: string }> = {
  TIGER: { label: '호랑이·압박형', emoji: '🐯', desc: '"90점? 나머지 10점은 왜 틀렸어?"', short: '지력·기술 성장 +20%', long: '매달 자존감·친밀도가 조금씩 깎임 (번아웃·절연 위험)' },
  HELICOPTER: { label: '헬리콥터·과보호형', emoji: '🚁', desc: '"힘들면 하지 마, 엄마 아빠가 다 해 줄게"', short: '스트레스 증가 -40%, 스트레스가 터져도 아프거나 가출하지 않음', long: '매달 자율성이 깎임 (스스로 못 서는 캥거루 위험)' },
  NEGLECT: { label: '방임·무관심형', emoji: '📦', desc: '대화 대신 가구와 용돈만', short: '가구 15% 할인', long: '매달 친밀도↓ 비행↑' },
  COACHING: { label: '공감·정서 코칭형', emoji: '🌱', desc: '"끝까지 해낸 네 노력이 자랑스러워"', short: '처음엔 느리지만 매달 자존감·자율성↑', long: '17세부터 대성공 확률 2배, 건강한 자립' },
};

export const selfEsteem = (s: SaveState) => s.status.selfEsteem ?? 50;
export const autonomy = (s: SaveState) => s.status.autonomy ?? 50;

/** 대응 스타일 → 내면 심리 변화 · 양육 태도 */
export const STYLE_PSYCHE: Record<ParentStyle, Effect> = {
  WARM: { selfEsteem: 3, autonomy: 1 },
  STRICT: { selfEsteem: -3, autonomy: -1 },
  FREE: { autonomy: 3 },
  PROTECT: { autonomy: -4, selfEsteem: 1 },
};
export const STYLE_ATTITUDE: Partial<Record<ParentStyle, Attitude>> = { WARM: 'COACHING', STRICT: 'TIGER', PROTECT: 'HELICOPTER' };

export function bumpAttitude(s: SaveState, a: Attitude, n = 1) {
  s.attitudes = { TIGER: 0, HELICOPTER: 0, NEGLECT: 0, COACHING: 0, ...s.attitudes };
  s.attitudes[a] += n;
}

/** 가장 많이 쌓인 양육 태도 (충분히 쌓이고 35% 이상일 때만) */
export function dominantAttitude(s: Pick<SaveState, 'attitudes'>): Attitude | null {
  const a = s.attitudes;
  if (!a) return null;
  const keys = Object.keys(a) as Attitude[];
  const total = keys.reduce((x, k) => x + a[k], 0);
  if (total < 6) return null;
  const best = keys.reduce((x, y) => (a[y] > a[x] ? y : x));
  return a[best] / total >= 0.35 ? best : null;
}

/* ───────── 방 공기 ───────── */
const ACHIEVE = new Set(['STUDY', 'TECH']);
/** 공부·성취 가구 비율 (침대 제외) */
export function achieveRatio(s: SaveState) {
  const items = s.placedFurniture.filter((p) => FURNITURE_MAP[p.furnitureId].category !== 'REST');
  if (items.length < 3) return 0;
  return items.filter((p) => ACHIEVE.has(FURNITURE_MAP[p.furnitureId].category)).length / items.length;
}
/** 숨 막히는 방: 공부 가구만 80% 이상 + 스트레스 높음 */
export const isColdRoom = (s: SaveState) => achieveRatio(s) >= 0.8 && s.status.stress >= 60;

/* ───────── 이상행동 (관찰 카메라 대상) ───────── */
export type ActingKind = 'STRIKE' | 'LOCKED' | 'DELINQ' | 'SILENT' | 'COLD';
export interface Acting {
  kind: ActingKind;
  outer: string; // 겉말
  inner: string; // 속마음
}

const ACT_TEXT: Record<ActingKind, { outer: Record<'CHILD' | 'TEEN' | 'YOUTH', string>; inner: Record<'CHILD' | 'TEEN' | 'YOUTH', string> }> = {
  STRIKE: {
    outer: { CHILD: '학원 진짜 싫어!! 안 갈 거야!', TEEN: '학원 안 가. 가 봤자 똑같아.', YOUTH: '공부 얘기 좀 그만해. 숨 막혀.' },
    inner: { CHILD: '사실... 문제를 못 풀면 혼날까 봐 무서워요.', TEEN: '열심히 해도 성적이 안 오르니까... 내가 바보 같아.', YOUTH: '떨어지면 다 끝날 것 같아서 무서워. 쉬고 싶다고 말하면 실망할까 봐.' },
  },
  LOCKED: {
    outer: { CHILD: '들어오지 마! 혼자 있을 거야!', TEEN: '(철컥) ...노크도 하지 마.', YOUTH: '나 혼자 있게 해 줘.' },
    inner: { CHILD: '아무도 내 마음을 몰라줘서 속상해요.', TEEN: '말해 봤자 또 혼날 거잖아. 그냥... 지쳤어.', YOUTH: '엄마 아빠 실망시키는 내가 싫어. 들키고 싶지 않아.' },
  },
  DELINQ: {
    outer: { CHILD: '흥, 나 원래 나쁜 애야.', TEEN: '내가 뭘 하든 상관없잖아.', YOUTH: '내 인생이야. 신경 꺼.' },
    inner: { CHILD: '이렇게 하면 엄마 아빠가 나를 봐 줄까요?', TEEN: '밖에 있는 애들만 내 편이야. 집엔 내 자리가 없어.', YOUTH: '나도 잘하고 싶었어. 근데 어디서부터 다시 해야 할지 모르겠어.' },
  },
  SILENT: {
    outer: { CHILD: '...괜찮아.', TEEN: '...아무것도 아니야.', YOUTH: '괜찮다니까. 신경 쓰지 마.' },
    inner: { CHILD: '너무 힘든데, 말하면 걱정할까 봐요.', TEEN: '숨을 못 쉬겠어. 누가 좀 멈춰 줬으면.', YOUTH: '다 놓아 버리고 싶어. 근데 그러면 안 되잖아.' },
  },
  COLD: {
    outer: { CHILD: '...몰라.', TEEN: '할 말 없어.', YOUTH: '...응. 알았어.' },
    inner: { CHILD: '나 안아 줬으면 좋겠어요.', TEEN: '예전처럼 같이 웃고 싶은데 어떻게 말해야 할지 모르겠어.', YOUTH: '언제부터 이렇게 멀어졌을까. 다시 가까워지고 싶어.' },
  },
};

/** 관찰 후 해금되는 황금 처방 + 일반 대응 */
export const REC_CHOICES: Record<ActingKind, { gold: { label: string; fx: Effect; reply: string; easeSchedule?: boolean }; others: { label: string; style: ParentStyle; fx: Effect; reply: string }[] }> = {
  STRIKE: {
    gold: { label: '✨ 공감해 주고 학원 단계 낮추기', fx: { stress: -20, affection: 10, selfEsteem: 8, autonomy: 4 }, reply: '...진짜 그래도 돼? 다음 달엔 하나만 다닐게. 대신 그건 열심히 할게.', easeSchedule: true },
    others: [
      { label: '"그래도 해야 할 건 해야지"', style: 'STRICT', fx: { MOR: 4, stress: 8, affection: -6 }, reply: '(입을 꾹 다문다)' },
      { label: '"힘들면 다 그만둬, 엄마 아빠가 알아서 할게"', style: 'PROTECT', fx: { stress: -15 }, reply: '...응. (근데 그럼 난 뭘 해야 하지?)' },
    ],
  },
  LOCKED: {
    gold: { label: '✨ 문 앞에 편지와 간식을 두고 기다리기', fx: { affection: 12, stress: -10, selfEsteem: 6 }, reply: '(한참 뒤 문이 열린다) ...편지 읽었어. 고마워.' },
    others: [
      { label: '열쇠로 문을 열고 들어간다', style: 'STRICT', fx: { affection: -10, stress: 10, selfEsteem: -4 }, reply: '나가라고!!' },
      { label: '"필요한 거 있으면 다 사 줄게"', style: 'PROTECT', fx: { gold: -200, stress: -5 }, reply: '...그런 거 필요 없어.' },
    ],
  },
  DELINQ: {
    gold: { label: '✨ 혼내기 전에 "요즘 많이 외로웠지?" 묻기', fx: { affection: 10, delinquency: -12, selfEsteem: 6 }, reply: '...응. 사실 나도 이러는 거 싫었어.' },
    others: [
      { label: '용돈을 끊고 외출 금지', style: 'STRICT', fx: { delinquency: -5, affection: -10, stress: 10 }, reply: '(쾅)' },
      { label: '친구들을 대신 만나 정리해 준다', style: 'PROTECT', fx: { delinquency: -8, autonomy: -6 }, reply: '...창피하게 왜 그래.' },
    ],
  },
  SILENT: {
    gold: { label: '✨ "괜찮지 않아도 돼" 말해 주고 함께 쉬기', fx: { stress: -25, affection: 8, selfEsteem: 6 }, reply: '(울음이 터진다) ...사실 하나도 안 괜찮았어.' },
    others: [
      { label: '"조금만 더 힘내자"', style: 'STRICT', fx: { stress: 6, INT: 4 }, reply: '...응.' },
      { label: '"다 엄마 아빠가 해 줄게, 넌 쉬기만 해"', style: 'PROTECT', fx: { stress: -18, autonomy: -6 }, reply: '...그래도 돼?' },
    ],
  },
  COLD: {
    gold: { label: '✨ 아무 말 없이 꼭 안아 주기', fx: { affection: 15, selfEsteem: 5 }, reply: '...(조금 뒤 같이 안는다) 오랜만이다, 이거.' },
    others: [
      { label: '"요즘 왜 그렇게 버릇이 없어?"', style: 'STRICT', fx: { affection: -8, MOR: 3 }, reply: '...그럴 줄 알았어.' },
      { label: '갖고 싶은 걸 사 준다', style: 'PROTECT', fx: { gold: -200, affection: 2 }, reply: '...고마워. (그게 아닌데)' },
    ],
  },
};

export function actingText(s: SaveState, kind: ActingKind): Acting {
  const st = growthStage(s.age);
  return { kind, outer: ACT_TEXT[kind].outer[st], inner: ACT_TEXT[kind].inner[st] };
}

/** 한 달이 끝날 때: 양육 태도 누적, 장기 효과, 방 공기, 방문 잠금, 이상행동 */
export function monthlyPsyche(s: SaveState, weeks: WeekResult[], events: string[], monthIdx: number) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  s.status.selfEsteem = selfEsteem(s);
  s.status.autonomy = autonomy(s);
  // 태도 누적
  if (!s.talkedThisMonth) bumpAttitude(s, 'NEGLECT', s.allowanceThisMonth ? 1.5 : 1);
  const edu = weeks.filter((w) => w.actionType === 'EDUCATION').length;
  const rest = weeks.filter((w) => w.actionType === 'REST' || w.actionType === 'OUTING').length;
  if (edu >= 3 && rest === 0) bumpAttitude(s, 'TIGER');
  if (s.talkKind === 'talk' || s.talkKind === 'praise') bumpAttitude(s, 'COACHING', 0.5);
  // 장기 효과
  const dom = dominantAttitude(s);
  if (dom === 'TIGER') {
    s.status.selfEsteem = clamp(s.status.selfEsteem - 1);
    s.status.affection = clamp(s.status.affection - 1);
  } else if (dom === 'HELICOPTER') {
    s.status.autonomy = clamp(s.status.autonomy - 1.5);
  } else if (dom === 'NEGLECT') {
    s.status.affection = clamp(s.status.affection - 1);
    s.status.delinquency = clamp(s.status.delinquency + 1);
  } else if (dom === 'COACHING') {
    s.status.selfEsteem = clamp(s.status.selfEsteem + 1);
    s.status.autonomy = clamp(s.status.autonomy + 1);
  }
  s.status.selfEsteem = Math.round(s.status.selfEsteem);
  s.status.autonomy = Math.round(s.status.autonomy);
  // 방문 잠금
  const cold = isColdRoom(s);
  const wasLocked = !!s.doorLocked;
  if (!wasLocked && (s.status.affection <= 30 || (cold && s.status.stress >= 70))) {
    s.doorLocked = true;
    events.push('🔒 아이가 방문을 잠갔다... 대화가 잘 닿지 않는다');
  } else if (wasLocked && s.status.affection >= 45 && s.status.stress < 60) {
    s.doorLocked = false;
    events.push('🔓 굳게 닫혔던 방문이 다시 열렸다');
  }
  // 이상행동 (같은 일이 매달 반복되지 않게 3달 간격)
  if (!s.acting && monthIdx >= (s.actingCooldown ?? 0)) {
    let kind: ActingKind | null = null;
    if (weeks.some((w) => w.outcome === 'STRIKE')) kind = 'STRIKE';
    else if (s.doorLocked && !wasLocked) kind = 'LOCKED';
    else if (s.status.delinquency >= 40) kind = 'DELINQ';
    else if (s.status.stress >= 80) kind = 'SILENT';
    else if (s.status.affection <= 30) kind = 'COLD';
    if (kind) {
      s.acting = actingText(s, kind);
      s.actingCooldown = monthIdx + 3;
      events.push('🔍 아이 모습이 평소와 다르다. 방에서 [관찰하기]를 눌러 보세요');
    }
  }
}

/* ───────── 스마트폰 관계 엔딩 ───────── */
export type Relation = 'HEALTHY' | 'HOLLOW' | 'DEPENDENT' | 'NORMAL';
export function relationEnding(s: SaveState): Relation {
  const aff = s.status.affection;
  const se = selfEsteem(s);
  const aut = autonomy(s);
  if (aff <= 35 || (dominantAttitude(s) === 'TIGER' && aff < 50 && se < 40)) return 'HOLLOW';
  if (aff >= 70 && se >= 65 && aut >= 60) return 'HEALTHY';
  if (aff >= 50 && aut <= 35) return 'DEPENDENT';
  return 'NORMAL';
}
export const RELATION_META: Record<Relation, { label: string; emoji: string; color: string }> = {
  HEALTHY: { label: '건강한 자립', emoji: '🌱', color: '#5bd66b' },
  HOLLOW: { label: '번아웃·절연', emoji: '🥀', color: '#8a8fa8' },
  DEPENDENT: { label: '캥거루·의존', emoji: '🧸', color: '#ffb35b' },
  NORMAL: { label: '평범한 거리', emoji: '☕', color: '#6ec3f4' },
};
