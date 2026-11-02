// 기획서 7장 데이터 스키마

export type Gender = 'SON' | 'DAUGHTER';
export type GrowthStage = 'CHILD' | 'TEEN' | 'YOUTH'; // 8~11세, 12~16세, 17~19세

export type StatKey = 'INT' | 'STR' | 'ART' | 'CHA' | 'MOR' | 'TEC';
export type AptitudeKey = 'APT_MED' | 'APT_LAW' | 'APT_IT' | 'APT_ENT' | 'APT_BIZ' | 'APT_ADV';

export interface CharacterStats {
  INT: number; // 지력 (0~999)
  STR: number; // 체력 (0~999)
  ART: number; // 감성/예술 (0~999)
  CHA: number; // 매력 (0~999)
  MOR: number; // 도덕성 (0~999)
  TEC: number; // 기술/손재주 (0~999)
}

export interface CharacterStatus {
  stress: number; // 0~100 (100 도달 시 질병/가출)
  affection: number; // 부모 친밀도 0~100
  fame: number; // 명성 0~500
  delinquency: number; // 비행 수치 0~100
}

export type AptitudeLevels = Record<AptitudeKey, { level: number; exp: number }>;

export interface PlacedFurniture {
  instanceId: string;
  furnitureId: string;
  gridX: number;
  gridY: number;
  rotation: 0 | 90 | 180 | 270;
}

export type FurnitureCategory = 'STUDY' | 'ART' | 'TECH' | 'FITNESS' | 'REST' | 'DECO';

export interface FurnitureDefinition {
  id: string;
  name: string;
  costGold: number;
  costIdea: number;
  width: number;
  height: number;
  spriteKey: string;
  category: FurnitureCategory;
  auraBonus: Partial<CharacterStats>;
  aptitudeBonus?: Partial<Record<AptitudeKey, number>>;
  stressReductionBonus?: number;
  minAge?: number; // 해금 연령 (확장 필드)
}

export interface ComboDefinition {
  id: string;
  name: string;
  requiredFurnitureIds: [string, string, string];
  statMultiplierBonus: Partial<Record<StatKey, number>>; // { INT: 0.3 } -> +30%
  aptitudeExpBonus?: Partial<Record<AptitudeKey, number>>; // 확장: 적성 경험치 배율
  stressMultiplier?: number; // 확장: 스트레스 증가량 배율 보정 (-0.15 => 15% 감소)
  restBonus?: number; // 확장: 휴식 회복량 보너스 비율
  wageBonus?: number; // 확장: 알바 보수 보너스 비율
  monthlyEffects?: { affection?: number; MOR?: number }; // 확장: 매월 효과
  appliesTo: ScheduleActionType[]; // 어떤 행동 유형에 적용되는지
  description: string;
  relatedJobs: string;
}

export type ScheduleActionType = 'EDUCATION' | 'PART_TIME' | 'REST' | 'OUTING';

export interface ScheduleAction {
  id: string;
  name: string;
  type: ScheduleActionType;
  minAge: number;
  weeklyGoldDelta: number; // 음수면 비용, 양수면 알바 수입
  weeklyStatGains: Partial<CharacterStats>;
  weeklyStressDelta: number;
  aptitudeGain?: { key: AptitudeKey; exp: number };
  statusGains?: Partial<Pick<CharacterStatus, 'affection' | 'fame' | 'delinquency'>>; // 확장
  targetFurnitureCategory?: FurnitureCategory;
  emoji: string;
}

export type EndingTier = 'SS' | 'S' | 'A' | 'B' | 'C';
export type EndingCategory = 'ELITE' | 'TECH' | 'ENT' | 'BIZ' | 'ACTION' | 'HIDDEN' | 'DARK';

export interface EndingDefinition {
  id: string;
  title: string;
  tier: EndingTier;
  category: EndingCategory;
  priority: number; // 1(최우선) ~ 5(기본 폴백)
  minStats: Partial<CharacterStats>;
  maxStats?: Partial<CharacterStats>;
  minAptitudes?: Partial<Record<AptitudeKey, number>>;
  anyAptitudes?: Partial<Record<AptitudeKey, number>>; // 확장: "A 또는 B" 조건
  minFame?: number;
  minGold?: number;
  minAffection?: number;
  maxDelinquency?: number;
  minDelinquency?: number;
  requiredComboId?: string;
  requiredFlag?: string;
  requiredActionCounts?: Record<string, number>; // 확장: "도서관 알바 8회↑" 등
  minFurnitureCollectionRate?: number; // 확장: 가구 도감 수집률
  conditionText: string; // 도감 힌트용 조건 요약
  epilogueText: string;
  spriteKey: string;
}

export interface GameState {
  childName: string;
  gender: Gender;
  age: number; // 8 ~ 19
  month: number; // 1 ~ 12
  gold: number;
  ideaPoints: number; // 영감 포인트 💡
  stats: CharacterStats;
  status: CharacterStatus;
  aptitudes: AptitudeLevels;
  roomSize: number; // 6 -> 8 -> 10
  placedFurniture: PlacedFurniture[];
  activeCombos: string[];
  monthlySchedule: [string, string, string, string]; // 4주 행동 ID 배열
  flags: string[];
  actionCounts: Record<string, number>;
  unlockedEndings: string[]; // 다회차 엔딩 도감 영구 보존
}
