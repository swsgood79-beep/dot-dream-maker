import type { StatKey } from '../types/game';

/** 부모 능력치 6종 */
export type ParentAbility = 'WEALTH' | 'SCHOLAR' | 'FIT' | 'SENSE' | 'CRAFT' | 'HEART';
export type ParentPoints = Record<ParentAbility, number>;

export const PARENT_TOTAL = 12;
export const PARENT_MAX = 5;

export const ABILITY_META: Record<ParentAbility, { label: string; emoji: string; desc: string }> = {
  WEALTH: { label: '경제력', emoji: '💰', desc: '시작 골드·매달 지원금' },
  SCHOLAR: { label: '학식', emoji: '📚', desc: '아이 지력 성장' },
  FIT: { label: '체력', emoji: '💪', desc: '아이 체력 성장' },
  SENSE: { label: '감성', emoji: '🎨', desc: '아이 감성·매력 성장' },
  CRAFT: { label: '손재주', emoji: '🔧', desc: '아이 기술 성장' },
  HEART: { label: '인품', emoji: '🤝', desc: '도덕 성장·대화 효과↑·비행↓' },
};
export const ABILITIES = Object.keys(ABILITY_META) as ParentAbility[];

export type ParentJobId = 'DOCTOR' | 'PROFESSOR' | 'ARTIST' | 'COACH' | 'CHEF' | 'DEVELOPER' | 'OFFICE' | 'SHOP';

export interface ParentJob {
  id: ParentJobId;
  label: string;
  emoji: string;
  desc: string;
  points: ParentPoints;
  /** 아이가 이 엔딩 중 하나를 받으면 "엄마 아빠처럼…" */
  likeParent: string[];
}

const P = (WEALTH: number, SCHOLAR: number, FIT: number, SENSE: number, CRAFT: number, HEART: number): ParentPoints => ({
  WEALTH, SCHOLAR, FIT, SENSE, CRAFT, HEART,
});

export const PARENT_JOBS: ParentJob[] = [
  { id: 'DOCTOR', label: '의사', emoji: '🩺', desc: '넉넉하고 공부 쪽에 강한 집', points: P(4, 4, 0, 0, 2, 2), likeParent: ['END_01', 'END_05', 'END_06'] },
  { id: 'PROFESSOR', label: '교수', emoji: '🎓', desc: '책이 가득한 집, 학식 최고', points: P(2, 5, 0, 1, 1, 3), likeParent: ['END_04', 'END_07', 'END_02'] },
  { id: 'ARTIST', label: '예술가', emoji: '🎨', desc: '살림은 빠듯해도 감성이 넘치는 집', points: P(1, 1, 1, 5, 2, 2), likeParent: ['END_19', 'END_20', 'END_21', 'END_24', 'END_26'] },
  { id: 'COACH', label: '체육 선생님', emoji: '🏃', desc: '주말마다 운동장에 가는 튼튼한 집', points: P(2, 1, 5, 1, 1, 2), likeParent: ['END_35', 'END_36', 'END_37', 'END_10'] },
  { id: 'CHEF', label: '요리사', emoji: '👨‍🍳', desc: '맛있는 냄새가 나는 손재주의 집', points: P(2, 0, 2, 3, 4, 1), likeParent: ['END_28', 'END_31'] },
  { id: 'DEVELOPER', label: '개발자', emoji: '💻', desc: '넉넉하고 기계와 친한 집', points: P(4, 3, 0, 1, 4, 0), likeParent: ['END_11', 'END_12', 'END_13', 'END_16'] },
  { id: 'OFFICE', label: '회사원', emoji: '💼', desc: '무난하고 균형 잡힌 집', points: P(3, 2, 2, 2, 1, 2), likeParent: ['END_34', 'END_27', 'END_29'] },
  { id: 'SHOP', label: '동네 가게 사장님', emoji: '🏪', desc: '이웃이 늘 드나드는 정 많은 집', points: P(3, 1, 2, 2, 1, 3), likeParent: ['END_33', 'END_31', 'END_27'] },
];
export const PARENT_JOB_MAP = Object.fromEntries(PARENT_JOBS.map((j) => [j.id, j])) as Record<ParentJobId, ParentJob>;

export interface ParentProfile {
  job: ParentJobId | 'CUSTOM';
  points: ParentPoints;
}

export const DEFAULT_PARENT: ParentProfile = { job: 'OFFICE', points: { ...PARENT_JOB_MAP.OFFICE.points } };

/** 🎲 랜덤: 직업을 하나 고른 뒤 점수를 몇 번 무작위로 옮긴다 */
export function randomParent(rng: () => number = Math.random): ParentProfile {
  const job = PARENT_JOBS[Math.floor(rng() * PARENT_JOBS.length)];
  const points = { ...job.points };
  for (let i = 0; i < 3; i++) {
    const from = ABILITIES[Math.floor(rng() * ABILITIES.length)];
    const to = ABILITIES[Math.floor(rng() * ABILITIES.length)];
    if (from !== to && points[from] > 0 && points[to] < PARENT_MAX) {
      points[from]--;
      points[to]++;
    }
  }
  const same = ABILITIES.every((a) => points[a] === job.points[a]);
  return { job: same ? job.id : 'CUSTOM', points };
}

/* ───────── 게임 효과 ───────── */
/** 부모 영향은 점수 2를 기준(배율 1.0)으로 위아래 */
const STAT_ABILITY: Partial<Record<StatKey, ParentAbility>> = {
  INT: 'SCHOLAR',
  STR: 'FIT',
  ART: 'SENSE',
  CHA: 'SENSE',
  TEC: 'CRAFT',
  MOR: 'HEART',
};

/** 매주 스케줄 성장 배율: 점당 ±4% */
export function parentStatMul(p: ParentPoints | undefined, k: StatKey) {
  const a = STAT_ABILITY[k];
  if (!p || !a) return 1;
  return 1 + (p[a] - 2) * 0.04;
}

/** 시작 스탯 보너스: 점당 +6 (감성은 감성·매력 둘 다 +4) */
export function parentStartBonus(p: ParentPoints): Partial<Record<StatKey, number>> {
  return { INT: p.SCHOLAR * 6, STR: p.FIT * 6, ART: p.SENSE * 4, CHA: p.SENSE * 4, TEC: p.CRAFT * 6, MOR: p.HEART * 6 };
}

/** 시작 골드: 경제력 2 = 1500G, 점당 ±350 */
export const parentStartGold = (p: ParentPoints | undefined) => (p ? 1500 + (p.WEALTH - 2) * 350 : 1500);
/** 매달 지원금 배율: 경제력 2 = 1.0, 점당 ±13% */
export const parentAllowanceMul = (p: ParentPoints | undefined) => (p ? 1 + (p.WEALTH - 2) * 0.13 : 1);
/** 인품: 대화·칭찬 친밀도 추가, 비행 증가 감소 */
export const parentTalkBonus = (p: ParentPoints | undefined) => (p ? Math.floor(p.HEART / 2) : 1);
export const parentDelinquencyMul = (p: ParentPoints | undefined) => (p ? 1.1 - p.HEART * 0.08 : 1);

export function describeParent(pr: ParentProfile) {
  if (pr.job === 'CUSTOM') return { emoji: '🏠', label: '우리만의 집' };
  const j = PARENT_JOB_MAP[pr.job];
  return { emoji: j.emoji, label: `${j.label} 부모` };
}
