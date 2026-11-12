import type { ScheduleAction } from '../types/game';

/**
 * 기획서 5장 월간 스케줄 행동 테이블.
 * - 교육: 기획서의 "월간 비용(주간x4)"을 4로 나눠 주간 비용으로 사용
 * - 적성 exp는 기획서 수치 그대로 두고, 엔진에서 APT_EXP_SCALE(×5)를 곱해 100exp = 1레벨로 환산
 */
export const SCHEDULE_ACTIONS: ScheduleAction[] = [
  // ── 5.1 교육 및 학원
  { id: 'EDU_01', name: '종합 보습학원', type: 'EDUCATION', minAge: 8, weeklyGoldDelta: -100, weeklyStatGains: { INT: 6, MOR: 1 }, weeklyStressDelta: 6, aptitudeGain: { key: 'APT_LAW', exp: 2 }, targetFurnitureCategory: 'STUDY', emoji: '📚' },
  { id: 'EDU_02', name: '영재 과학·의학 학원', type: 'EDUCATION', minAge: 10, weeklyGoldDelta: -200, weeklyStatGains: { INT: 9, TEC: 4 }, weeklyStressDelta: 9, aptitudeGain: { key: 'APT_MED', exp: 4 }, targetFurnitureCategory: 'STUDY', emoji: '🔬' },
  { id: 'EDU_03', name: '로스쿨 준비 논술반', type: 'EDUCATION', minAge: 12, weeklyGoldDelta: -200, weeklyStatGains: { INT: 8, CHA: 4, MOR: 3 }, weeklyStressDelta: 8, aptitudeGain: { key: 'APT_LAW', exp: 4 }, targetFurnitureCategory: 'STUDY', emoji: '⚖️' },
  { id: 'EDU_04', name: '코딩·게임 제작 부트캠프', type: 'EDUCATION', minAge: 10, weeklyGoldDelta: -175, weeklyStatGains: { TEC: 9, INT: 5 }, weeklyStressDelta: 7, aptitudeGain: { key: 'APT_IT', exp: 4 }, targetFurnitureCategory: 'TECH', emoji: '💻' },
  { id: 'EDU_05', name: '실용음악·댄스 아카데미', type: 'EDUCATION', minAge: 8, weeklyGoldDelta: -188, weeklyStatGains: { ART: 7, CHA: 7, STR: 2 }, weeklyStressDelta: 7, aptitudeGain: { key: 'APT_ENT', exp: 4 }, targetFurnitureCategory: 'ART', emoji: '🎤' },
  { id: 'EDU_06', name: '미술·웹툰 창작 화실', type: 'EDUCATION', minAge: 8, weeklyGoldDelta: -163, weeklyStatGains: { ART: 9, TEC: 4 }, weeklyStressDelta: 6, aptitudeGain: { key: 'APT_ENT', exp: 4 }, targetFurnitureCategory: 'ART', emoji: '🎨' },
  { id: 'EDU_07', name: '체육·무술 도장', type: 'EDUCATION', minAge: 8, weeklyGoldDelta: -125, weeklyStatGains: { STR: 10, MOR: 2 }, weeklyStressDelta: 6, aptitudeGain: { key: 'APT_ADV', exp: 3 }, targetFurnitureCategory: 'FITNESS', emoji: '🥋' },
  { id: 'EDU_08', name: '경제·리더십 스쿨', type: 'EDUCATION', minAge: 8, weeklyGoldDelta: -175, weeklyStatGains: { CHA: 7, INT: 6 }, weeklyStressDelta: 7, aptitudeGain: { key: 'APT_BIZ', exp: 4 }, targetFurnitureCategory: 'STUDY', emoji: '💼' },

  // ── 5.2 아르바이트
  { id: 'JOB_01', name: '집안일 돕기', type: 'PART_TIME', minAge: 8, weeklyGoldDelta: 60, weeklyStatGains: { MOR: 3, TEC: 2 }, statusGains: { affection: 1 }, weeklyStressDelta: 3, targetFurnitureCategory: 'TECH', emoji: '🧹' },
  { id: 'JOB_02', name: '동네 베이커리 보조', type: 'PART_TIME', minAge: 12, weeklyGoldDelta: 140, weeklyStatGains: { TEC: 4, CHA: 2 }, weeklyStressDelta: 5, emoji: '🥐' },
  { id: 'JOB_03', name: '도서관 사서 도우미', type: 'PART_TIME', minAge: 12, weeklyGoldDelta: 120, weeklyStatGains: { INT: 4, MOR: 2, STR: -1 }, weeklyStressDelta: 4, emoji: '📖' },
  { id: 'JOB_04', name: '동물병원 케어 알바', type: 'PART_TIME', minAge: 14, weeklyGoldDelta: 180, weeklyStatGains: { MOR: 4 }, aptitudeGain: { key: 'APT_MED', exp: 2 }, weeklyStressDelta: 5, emoji: '🐶' },
  { id: 'JOB_05', name: '인디게임 QA 테스터', type: 'PART_TIME', minAge: 15, weeklyGoldDelta: 240, weeklyStatGains: { TEC: 5, STR: -1 }, aptitudeGain: { key: 'APT_IT', exp: 2 }, weeklyStressDelta: 6, emoji: '🎮' },
  { id: 'JOB_06', name: '거리 버스킹 공연', type: 'PART_TIME', minAge: 15, weeklyGoldDelta: 220, weeklyStatGains: { ART: 4, CHA: 5 }, statusGains: { fame: 2 }, weeklyStressDelta: 6, emoji: '🎸' },
  { id: 'JOB_07', name: '법률사무소 문서 정리', type: 'PART_TIME', minAge: 16, weeklyGoldDelta: 260, weeklyStatGains: { INT: 5 }, aptitudeGain: { key: 'APT_LAW', exp: 2 }, weeklyStressDelta: 7, emoji: '🗂️' },
  { id: 'JOB_08', name: '밤거리 심부름 (위험)', type: 'PART_TIME', minAge: 16, weeklyGoldDelta: 450, weeklyStatGains: { STR: 4, MOR: -6 }, statusGains: { delinquency: 5 }, weeklyStressDelta: 8, emoji: '🌃' },

  // ── 5.3 휴식 및 특별 외출
  { id: 'REST_01', name: '방에서 휴식', type: 'REST', minAge: 8, weeklyGoldDelta: 0, weeklyStatGains: {}, weeklyStressDelta: -18, targetFurnitureCategory: 'REST', emoji: '🛏️' },
  { id: 'REST_02', name: '가족 캠핑·바캉스', type: 'REST', minAge: 8, weeklyGoldDelta: -300, weeklyStatGains: { ART: 2 }, statusGains: { affection: 5 }, weeklyStressDelta: -30, emoji: '🏕️' },

  // OUT_01 시내 외출 — 장소별로 분리 (특수 이벤트 플래그 획득처)
  { id: 'OUT_SHOP', name: '외출: 백화점 쇼핑', type: 'OUTING', minAge: 8, weeklyGoldDelta: -150, weeklyStatGains: { CHA: 3 }, weeklyStressDelta: -8, emoji: '🛍️' },
  { id: 'OUT_BOOK', name: '외출: 서점 방문', type: 'OUTING', minAge: 8, weeklyGoldDelta: -50, weeklyStatGains: { INT: 2, ART: 1 }, weeklyStressDelta: -6, emoji: '📕' },
  { id: 'OUT_SCI', name: '외출: 과학관 견학', type: 'OUTING', minAge: 8, weeklyGoldDelta: -80, weeklyStatGains: { INT: 2, TEC: 2 }, aptitudeGain: { key: 'APT_MED', exp: 1 }, weeklyStressDelta: -6, emoji: '🔭' },
  { id: 'OUT_ARCADE', name: '외출: 오락실', type: 'OUTING', minAge: 10, weeklyGoldDelta: -60, weeklyStatGains: { TEC: 2 }, aptitudeGain: { key: 'APT_IT', exp: 1 }, statusGains: { delinquency: 1 }, weeklyStressDelta: -12, emoji: '👾' },
  { id: 'OUT_RUINS', name: '외출: 고대 유적 탐방', type: 'OUTING', minAge: 10, weeklyGoldDelta: -200, weeklyStatGains: { STR: 3, INT: 1 }, aptitudeGain: { key: 'APT_ADV', exp: 2 }, weeklyStressDelta: -8, emoji: '🗿' },
  { id: 'OUT_ALLEY', name: '외출: 뒷골목 배회', type: 'OUTING', minAge: 12, weeklyGoldDelta: 0, weeklyStatGains: { STR: 2, CHA: 1, MOR: -4 }, statusGains: { delinquency: 4 }, weeklyStressDelta: -14, emoji: '🚬' },
];

export const ACTION_MAP: Record<string, ScheduleAction> = Object.fromEntries(SCHEDULE_ACTIONS.map((a) => [a.id, a]));

export const ACTION_TYPE_LABEL: Record<ScheduleAction['type'], string> = {
  EDUCATION: '교육/학원',
  PART_TIME: '아르바이트',
  REST: '휴식',
  OUTING: '외출/탐험',
};
