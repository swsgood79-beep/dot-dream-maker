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

export type ParentJobId =
  | 'CHAEBOL' | 'DOCTOR' | 'LAWYER' | 'LANDLORD'
  | 'OFFICE' | 'PROFESSOR' | 'DEVELOPER' | 'COACH' | 'CIVIL'
  | 'CHEF' | 'SHOP' | 'DRIVER' | 'FACTORY'
  | 'DAYLABOR' | 'ARTIST' | 'JOBLESS';

/** 집안 형편 4단계 */
export type ParentClass = 'RICH' | 'MIDDLE' | 'WORKING' | 'POOR';
export const CLASS_META: Record<ParentClass, { label: string; emoji: string; desc: string; color: string }> = {
  RICH: { label: '상류층', emoji: '💎', desc: '부족함 없는 집', color: '#ffe08a' },
  MIDDLE: { label: '중산층', emoji: '🏠', desc: '평범하고 단란한 집', color: '#c9e8ff' },
  WORKING: { label: '하류층', emoji: '🧺', desc: '빠듯하지만 정 많은 집', color: '#d9f2d0' },
  POOR: { label: '빈곤층', emoji: '🕯️', desc: '가진 건 없어도 서로가 있는 집', color: '#eadff5' },
};
export const CLASSES = Object.keys(CLASS_META) as ParentClass[];

export interface ParentJob {
  id: ParentJobId;
  label: string;
  emoji: string;
  cls: ParentClass;
  desc: string;
  points: ParentPoints;
  /** 아이가 이 엔딩 중 하나를 받으면 "엄마 아빠처럼…" */
  likeParent: string[];
}

const P = (WEALTH: number, SCHOLAR: number, FIT: number, SENSE: number, CRAFT: number, HEART: number): ParentPoints => ({
  WEALTH, SCHOLAR, FIT, SENSE, CRAFT, HEART,
});

/** 경제력은 형편에 따라(상류 4~5 · 중산 2~3 · 하류 1 · 빈곤 0), 남은 점수는 다른 능력에 — 가난할수록 다른 능력이 높다 */
export const PARENT_JOBS: ParentJob[] = [
  // 상류층
  { id: 'CHAEBOL', label: '재벌 회장', emoji: '🏢', cls: 'RICH', desc: '집이 곧 성, 돈 걱정 없는 집', points: P(5, 2, 1, 1, 1, 2), likeParent: ['END_27', 'END_29'] },
  { id: 'DOCTOR', label: '의사', emoji: '🩺', cls: 'RICH', desc: '넉넉하고 공부 쪽에 강한 집', points: P(4, 4, 0, 0, 2, 2), likeParent: ['END_01', 'END_05', 'END_06'] },
  { id: 'LAWYER', label: '변호사', emoji: '⚖️', cls: 'RICH', desc: '논리와 원칙의 집', points: P(4, 4, 0, 1, 0, 3), likeParent: ['END_02', 'END_03', 'END_30'] },
  { id: 'LANDLORD', label: '건물주', emoji: '🏙️', cls: 'RICH', desc: '여유롭고 느긋한 집', points: P(5, 1, 1, 2, 1, 2), likeParent: ['END_33', 'END_27'] },
  // 중산층
  { id: 'OFFICE', label: '회사원', emoji: '💼', cls: 'MIDDLE', desc: '무난하고 균형 잡힌 집', points: P(3, 2, 2, 2, 1, 2), likeParent: ['END_34', 'END_27', 'END_29'] },
  { id: 'PROFESSOR', label: '교수', emoji: '🎓', cls: 'MIDDLE', desc: '책이 가득한 집, 학식 최고', points: P(3, 5, 0, 1, 1, 2), likeParent: ['END_04', 'END_07', 'END_02'] },
  { id: 'DEVELOPER', label: '개발자', emoji: '💻', cls: 'MIDDLE', desc: '기계와 친한 집', points: P(3, 3, 0, 1, 4, 1), likeParent: ['END_11', 'END_12', 'END_13', 'END_16'] },
  { id: 'COACH', label: '체육 선생님', emoji: '🏃', cls: 'MIDDLE', desc: '주말마다 운동장에 가는 튼튼한 집', points: P(2, 1, 5, 1, 1, 2), likeParent: ['END_35', 'END_36', 'END_37', 'END_10'] },
  { id: 'CIVIL', label: '공무원', emoji: '🏛️', cls: 'MIDDLE', desc: '반듯하고 성실한 집', points: P(3, 2, 1, 1, 1, 4), likeParent: ['END_10', 'END_38', 'END_25'] },
  // 하류층
  { id: 'CHEF', label: '식당 요리사', emoji: '👨‍🍳', cls: 'WORKING', desc: '맛있는 냄새가 나는 손재주의 집', points: P(1, 0, 2, 3, 4, 2), likeParent: ['END_28', 'END_31'] },
  { id: 'SHOP', label: '동네 가게 사장님', emoji: '🏪', cls: 'WORKING', desc: '이웃이 늘 드나드는 정 많은 집', points: P(1, 1, 2, 2, 2, 4), likeParent: ['END_33', 'END_31', 'END_27'] },
  { id: 'DRIVER', label: '택배 기사', emoji: '🚚', cls: 'WORKING', desc: '하루 종일 달리는 부지런한 집', points: P(1, 1, 4, 1, 2, 3), likeParent: ['END_49', 'END_39'] },
  { id: 'FACTORY', label: '공장 기술자', emoji: '🏭', cls: 'WORKING', desc: '뭐든 고쳐 내는 손재주의 집', points: P(1, 1, 3, 0, 5, 2), likeParent: ['END_15', 'END_40', 'END_16'] },
  // 빈곤층
  { id: 'DAYLABOR', label: '일용직 노동자', emoji: '🧱', cls: 'POOR', desc: '몸은 고되도 마음은 단단한 집', points: P(0, 1, 4, 1, 3, 3), likeParent: ['END_39', 'END_37'] },
  { id: 'ARTIST', label: '무명 예술가', emoji: '🎨', cls: 'POOR', desc: '살림은 빈 통장, 감성은 가득한 집', points: P(0, 1, 1, 5, 2, 3), likeParent: ['END_19', 'END_20', 'END_21', 'END_24', 'END_26'] },
  { id: 'JOBLESS', label: '구직 중인 부모', emoji: '📮', cls: 'POOR', desc: '다시 일어서려 애쓰는 집', points: P(0, 3, 1, 2, 2, 4), likeParent: ['END_34', 'END_10'] },
];
export const PARENT_JOB_MAP = Object.fromEntries(PARENT_JOBS.map((j) => [j.id, j])) as Record<ParentJobId, ParentJob>;

export interface ParentProfile {
  job: ParentJobId | 'CUSTOM';
  points: ParentPoints;
}

export const DEFAULT_PARENT: ParentProfile = { job: 'OFFICE', points: { ...PARENT_JOB_MAP.OFFICE.points } };

/** 🎲 랜덤: 16개 직업 중 하나를 무작위로 */
export function randomParent(rng: () => number = Math.random): ParentProfile {
  const job = PARENT_JOBS[Math.floor(rng() * PARENT_JOBS.length)];
  return { job: job.id, points: { ...job.points } };
}

/** 부모 프로필의 형편: 직업이 있으면 그 직업의, 직접 설정이면 경제력으로 */
export function parentClass(p: ParentProfile | undefined): ParentClass {
  if (!p) return 'MIDDLE';
  if (p.job !== 'CUSTOM' && PARENT_JOB_MAP[p.job]) return PARENT_JOB_MAP[p.job].cls;
  const w = p.points.WEALTH;
  return w >= 4 ? 'RICH' : w >= 2 ? 'MIDDLE' : w === 1 ? 'WORKING' : 'POOR';
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
  const c = CLASS_META[parentClass(pr)];
  if (pr.job === 'CUSTOM' || !PARENT_JOB_MAP[pr.job]) return { emoji: '🏠', label: `우리만의 집 (${c.label})` };
  const j = PARENT_JOB_MAP[pr.job];
  return { emoji: j.emoji, label: `${j.label} 부모 (${c.label})` };
}
