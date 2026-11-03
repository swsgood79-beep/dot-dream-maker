import { COMBO_MAP, FURNITURE_MAP } from '../data/furnitureData';
import { ACTION_MAP } from '../data/scheduleData';
import { evaluateEnding } from '../data/endingData';
import type {
  AptitudeKey,
  AptitudeLevels,
  CharacterStats,
  CharacterStatus,
  EndingDefinition,
  Gender,
  GameState,
  ScheduleActionType,
  StatKey,
} from '../types/game';
import { computeActiveCombos, computeAura, roomSizeForAge } from './room';
import { rollParentingEvent, updateWish } from './parenting';
import { writeDiary, type DiaryEntry } from './diary';
import type { ParentStyle } from '../data/parentingData';
import { TEMPERAMENT_MAP, type TemperamentId } from '../data/temperamentData';
import { CUTSCENES, pickFriend } from '../data/cutsceneData';
import {
  parentAllowanceMul,
  parentDelinquencyMul,
  parentStartBonus,
  parentStartGold,
  parentStatMul,
  type ParentProfile,
} from '../data/parentData';

export const STAT_KEYS: StatKey[] = ['INT', 'STR', 'ART', 'CHA', 'MOR', 'TEC'];
export const APT_KEYS: AptitudeKey[] = ['APT_MED', 'APT_LAW', 'APT_IT', 'APT_ENT', 'APT_BIZ', 'APT_ADV'];

/** 기획서 적성 수치(+2, +4)를 100exp=1Lv 체계로 환산하는 배율 */
export const APT_EXP_SCALE = 5;
export const MAX_COMBO_MULTIPLIER = 2.0;
export const REST_ACTION_ID = 'REST_01';
/** 밸런스 보정: 기획서 수치 그대로면 12년간 스탯이 999에 쉽게 도달하므로 성장 배율과 체감 곡선을 둔다 */
export const GAIN_SCALE = 0.6;
export const DIMINISH_CAP = 1050;
/** 현재 스탯이 높을수록 성장 둔화: 0 → 1.0, 500 → 0.77, 800 → 0.42, 950 → 0.18 */
export const growthCurve = (current: number) => Math.max(0.05, 1 - (current / DIMINISH_CAP) ** 2);

/** 게임 저장 상태 = 기획서 GameState + 진행용 확장 필드 */
export interface SaveState extends GameState {
  collectedFurniture: string[]; // 한 번이라도 구매한 가구 ID (도감)
  inventory: string[]; // 보유 중이지만 배치하지 않은 가구 ID
  forcedRestWeeks: number; // 질병으로 다음 달 강제 요양 주 수
  runawayWeeks: number; // 가출로 다음 달 취소되는 주 수
  talkedThisMonth: boolean;
  burstCount: number; // 스트레스 폭발 횟수
  instanceSeq: number;
  history?: GrowthSnapshot[]; // 매년 1월 스탯 기록 (성장 앨범)
  // ── v0.8 육아 시스템 (옛 저장에는 없을 수 있음)
  pendingEvent?: string | null; // 부모가 대응해야 할 육아 상황
  seenEvents?: string[];
  wish?: { id: string; left: number; progress: number } | null; // 진행 중인 아이의 부탁
  lastWish?: string;
  wishesGranted?: number;
  wishesFailed?: number;
  parenting?: Record<ParentStyle, number>; // 양육 스타일 선택 횟수
  talkKind?: 'talk' | 'praise' | 'scold' | null; // 이번 달 대화 종류
  // ── v0.9 기질·기억·사진첩
  temperament?: TemperamentId; // 타고난 기질 (없으면 기질 효과 없음: 옛 저장)
  temperRevealed?: boolean; // 부모가 기질을 알아챘는지
  clues?: string[]; // 관찰 노트
  memories?: string[]; // '이벤트ID:스타일' — 몇 년 뒤 돌아오는 기억, 엔딩 편지 재료
  photos?: Photo[]; // 가족 사진첩
  wishClosed?: boolean; // 부탁을 자주 무시당해 마음을 닫음
  // ── v0.10 성장 컷신·학교 생활
  friend?: string; // 단짝 친구 이름
  pendingCutscene?: string | null;
  seenCutscenes?: string[];
  pendingReport?: boolean; // 이번 달 성적표 확인 대기
  pendingContest?: { id: ContestId; age: number } | null; // v0.11 미니게임 대기 중인 대회 (열린 해의 나이)
  parent?: ParentProfile; // v0.13 부모 직업·능력치
  // ── v0.14 살아있는 방·일기장
  pettedThisMonth?: boolean;
  diaryNew?: DiaryEntry | null; // 책상 위에 놓인 새 일기
  diaryRead?: DiaryEntry[]; // 몰래 읽은 일기
  diaryCaught?: number; // 읽다 들킨 횟수
  diaryRespected?: number; // 읽지 않고 둔 횟수
  // ── v0.15 연속 이야기·생일
  arcs?: Record<string, { step: number; styles: ParentStyle[]; next: number; result?: string; done?: boolean }>;
  dreamJob?: string; // 아이가 말한 꿈의 직업 (엔딩 ID)
  birthMonth?: number;
  pendingBirthday?: boolean;
  giftsLiked?: number; // 원하던 생일 선물을 맞힌 횟수
}

/** 게임 시작부터 센 달 수 (8세 1월 = 1) */
export const monthIndex = (s: Pick<SaveState, 'age' | 'month'>) => (s.age - 8) * 12 + s.month;

export interface Photo {
  age: number;
  month: number;
  emoji: string;
  title: string;
  caption: string;
  pose: 'stand' | 'cheer' | 'tired';
}

export const MAX_PHOTOS = 80;
export function addPhoto(s: SaveState, p: Omit<Photo, 'age' | 'month'>) {
  s.photos = [...(s.photos ?? []), { age: s.age, month: s.month, ...p }].slice(-MAX_PHOTOS);
}

export type Rng = () => number;

export interface WeekResult {
  week: number;
  actionId: string;
  actionName: string;
  emoji: string;
  outcome: 'GREAT' | 'SUCCESS' | 'FAIL' | 'SICK' | 'RUNAWAY' | 'NO_GOLD';
  statDelta: Partial<CharacterStats>;
  stressDelta: number;
  goldDelta: number;
  comboMultiplier: number;
  usedCombos: string[];
  popups: string[]; // 머리 위 팝업 텍스트 ("+12 INT!", "Combo x1.3!")
  notes: string[];
  actionType: ScheduleActionType | 'RUNAWAY';
  targetInstanceId?: string; // 이번 주 사용한 방 안 가구 (연출용)
}

/** 연간 대회 결과 (연출용) */
export interface ContestResult {
  id: ContestId;
  title: string;
  stat: StatKey;
  score: number;
  threshold: number;
  win: boolean;
  rank: number; // 1 = 우승, 2~3 = 입상권 근처, 0 = 참가
  rewards: string[];
  age: number;
}

/** 성장 앨범용 연도별 기록 */
export interface GrowthSnapshot {
  age: number;
  stats: CharacterStats;
  fame: number;
}

export interface MonthResult {
  state: SaveState;
  weeks: WeekResult[];
  events: string[];
  contest?: ContestResult;
  ending?: EndingDefinition;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function emptyStats(): CharacterStats {
  return { INT: 0, STR: 0, ART: 0, CHA: 0, MOR: 0, TEC: 0 };
}

export function emptyAptitudes(): AptitudeLevels {
  return Object.fromEntries(APT_KEYS.map((k) => [k, { level: 0, exp: 0 }])) as AptitudeLevels;
}

export function monthlyAllowance(age: number): number {
  if (age >= 17) return 450;
  if (age >= 12) return 350;
  return 250;
}

export function createNewGame(
  childName: string,
  gender: Gender,
  bonusStat: StatKey,
  unlockedEndings: string[] = [],
  carryIdea = 0,
  temperament?: TemperamentId,
  temperRevealed = false,
  parent?: ParentProfile,
): SaveState {
  const stats: CharacterStats = { INT: 20, STR: 20, ART: 20, CHA: 20, MOR: 40, TEC: 15 };
  stats[bonusStat] += 30;
  if (parent) for (const [k, v] of Object.entries(parentStartBonus(parent.points)) as [StatKey, number][]) stats[k] += v;
  const status: CharacterStatus = { stress: 0, affection: 50, fame: 0, delinquency: 0 };
  return {
    childName,
    gender,
    age: 8,
    month: 1,
    gold: parentStartGold(parent?.points),
    ideaPoints: 10 + carryIdea,
    stats,
    status,
    aptitudes: emptyAptitudes(),
    roomSize: 6,
    placedFurniture: [{ instanceId: 'f0', furnitureId: 'basic_bed', gridX: 0, gridY: 0, rotation: 0 }],
    activeCombos: [],
    monthlySchedule: ['EDU_01', 'EDU_07', 'JOB_01', 'REST_01'],
    flags: [],
    actionCounts: {},
    unlockedEndings,
    collectedFurniture: ['basic_bed'],
    inventory: [],
    forcedRestWeeks: 0,
    runawayWeeks: 0,
    talkedThisMonth: false,
    burstCount: 0,
    instanceSeq: 1,
    history: [{ age: 8, stats: { ...stats }, fame: 0 }],
    pendingEvent: null,
    seenEvents: [],
    wish: null,
    wishesGranted: 0,
    wishesFailed: 0,
    parenting: { WARM: 0, STRICT: 0, FREE: 0 },
    talkKind: null,
    temperament,
    temperRevealed,
    clues: [],
    memories: [],
    photos: [{ age: 8, month: 1, emoji: '🎒', title: '우리 집에 온 날', caption: `${childName}의 12년 이야기가 시작됐다.`, pose: 'stand' }],
    wishClosed: false,
    friend: pickFriend(childName),
    pendingCutscene: null,
    seenCutscenes: [],
    pendingReport: false,
    parent,
  };
}

function addAptitudeExp(apt: AptitudeLevels, key: AptitudeKey, exp: number): boolean {
  const a = apt[key];
  if (a.level >= 10) return false;
  a.exp += exp;
  let leveled = false;
  while (a.exp >= 100 && a.level < 10) {
    a.exp -= 100;
    a.level += 1;
    leveled = true;
  }
  if (a.level >= 10) a.exp = 0;
  return leveled;
}

/** 출력 상태를 안전하게 복제 */
function cloneState(s: SaveState): SaveState {
  return structuredClone(s);
}

function pushFlag(s: SaveState, flag: string, events: string[], msg: string) {
  if (!s.flags.includes(flag)) {
    s.flags.push(flag);
    events.push(msg);
  }
}

/** 외출 장소별 특수 이벤트 (플래그 획득) */
function outingEvent(s: SaveState, actionId: string, rng: Rng, notes: string[]) {
  const st = s.stats;
  switch (actionId) {
    case 'OUT_ARCADE':
      if (s.age >= 14 && st.TEC >= 400 && rng() < 0.3) pushFlag(s, 'FLAG_GAME_CHAMP', notes, '🏆 오락실 게임대회에서 우승했다! (게임대회 우승)');
      break;
    case 'OUT_RUINS':
      if (s.activeCombos.includes('CMB_12') && st.STR >= 500 && s.aptitudes.APT_ADV.level >= 5 && rng() < 0.25)
        pushFlag(s, 'FLAG_HERO_SWORD', notes, '⚔️ 유적 깊은 곳에서 빛나는 성검을 발견했다!');
      break;
    case 'OUT_BOOK':
      if (st.ART >= 450 && st.INT >= 450 && rng() < 0.2) pushFlag(s, 'FLAG_MAGIC_BOOK', notes, '📜 서점 구석에서 낡은 마법서를 손에 넣었다!');
      break;
    case 'OUT_SHOP':
      if (st.CHA >= 600 && s.status.fame >= 200 && rng() < 0.25)
        pushFlag(s, 'FLAG_ROYAL_BALL', notes, '👑 백화점에서 왕실 무도회 초대장을 받았다!');
      break;
    case 'OUT_SCI':
      if (s.activeCombos.includes('CMB_10') && rng() < 0.3) {
        s.status.fame = clamp(s.status.fame + 10, 0, 500);
        notes.push('🚀 우주 과학 캠프에 특별 초청! 명성 +10');
      }
      break;
  }
}

function simulateWeek(s: SaveState, week: number, rng: Rng): WeekResult {
  let actionId = s.monthlySchedule[week];
  let outcome: WeekResult['outcome'] = 'SUCCESS';
  const notes: string[] = [];

  if (s.runawayWeeks > 0) {
    s.runawayWeeks--;
    const a = ACTION_MAP[actionId];
    return {
      week, actionId, actionName: '가출 중...', emoji: '🏃', outcome: 'RUNAWAY', statDelta: {}, stressDelta: 0, goldDelta: 0,
      comboMultiplier: 1, usedCombos: [], popups: ['가출...'], notes: [`${a?.name ?? '스케줄'} 취소 (가출 중)`],
      actionType: 'RUNAWAY',
    };
  }
  if (s.forcedRestWeeks > 0) {
    s.forcedRestWeeks--;
    actionId = REST_ACTION_ID;
    outcome = 'SICK';
    notes.push('질병으로 강제 요양 중');
  }

  let action = ACTION_MAP[actionId] ?? ACTION_MAP[REST_ACTION_ID];
  if (action.minAge > s.age) action = ACTION_MAP[REST_ACTION_ID];
  if (action.weeklyGoldDelta < 0 && s.gold + action.weeklyGoldDelta < 0) {
    notes.push(`골드 부족으로 '${action.name}' 대신 휴식`);
    action = ACTION_MAP[REST_ACTION_ID];
    outcome = 'NO_GOLD';
  }

  const stress = s.status.stress;
  const temper = s.temperament ? TEMPERAMENT_MAP[s.temperament] : null;
  // 이번 행동에 실제로 영향을 주는 콤보만 사용
  const usedCombos = s.activeCombos.filter((id) => {
    const c = COMBO_MAP[id];
    if (!c.appliesTo.includes(action.type)) return false;
    const statHit = Object.keys(c.statMultiplierBonus).some((k) => (action.weeklyStatGains[k as StatKey] ?? 0) > 0);
    const aptHit = !!action.aptitudeGain && !!c.aptitudeExpBonus?.[action.aptitudeGain.key];
    const catHit =
      !!action.targetFurnitureCategory &&
      c.requiredFurnitureIds.some((fid) => FURNITURE_MAP[fid].category === action.targetFurnitureCategory);
    return statHit || aptHit || catHit || (!!c.wageBonus && action.type === 'PART_TIME') || (!!c.restBonus && action.type === 'REST');
  });
  const isArt = (action.weeklyStatGains.ART ?? 0) > 0;

  // 성공/대성공 판정
  const successRate = stress >= 80 ? 0.5 : stress >= 50 ? 0.8 : 1.0;
  let greatRate = stress < 50 ? 0.15 : 0;
  if (isArt && usedCombos.includes('CMB_05')) greatRate += 0.2;
  const isFail = action.type !== 'REST' && rng() >= successRate;
  const isGreat = !isFail && action.type !== 'REST' && rng() < greatRate;
  if (outcome === 'SUCCESS') outcome = isFail ? 'FAIL' : isGreat ? 'GREAT' : 'SUCCESS';

  // 1. 기본 상승량 + 인접 가구 오라
  const aura = computeAura(s.placedFurniture, action.targetFurnitureCategory);

  // 2. 콤보 배율 (스트레스 50~79 구간은 보너스 50% 반감)
  const comboHalf = stress >= 50 && stress < 80 ? 0.5 : 1;
  const comboMult = (k: StatKey) => {
    const bonus = usedCombos.reduce((sum, id) => sum + (COMBO_MAP[id].statMultiplierBonus[k] ?? 0), 0);
    return Math.min(MAX_COMBO_MULTIPLIER, 1 + bonus * comboHalf);
  };

  // 3. 컨디션 계수
  const conditionFactor = stress >= 80 ? 0.5 : stress >= 50 ? 0.75 : isGreat ? 1.5 : 1.0;

  const statDelta: Partial<CharacterStats> = {};
  const popups: string[] = [];
  let maxMult = 1;
  for (const k of STAT_KEYS) {
    const base = action.weeklyStatGains[k] ?? 0;
    // 오라는 행동이 이미 올리는 스탯에만 합산 (예: 공부 시 책장 INT+3)
    const auraV = base > 0 ? (aura.stats[k] ?? 0) : 0;
    let gain = 0;
    if (base < 0) {
      gain = base; // 감소 스탯은 배율 미적용
    } else if (base > 0) {
      if (isFail) gain = 0;
      else {
        const m = comboMult(k);
        maxMult = Math.max(maxMult, m);
        const tm = (temper?.statMul[k] ?? 1) * parentStatMul(s.parent?.points, k);
        gain = Math.round((base + auraV) * GAIN_SCALE * growthCurve(s.stats[k]) * m * conditionFactor * tm);
      }
    }
    if (gain !== 0) {
      statDelta[k] = gain;
      s.stats[k] = clamp(s.stats[k] + gain, 0, 999);
      popups.push(`${gain > 0 ? '+' : ''}${gain} ${k}`);
    }
  }
  if (maxMult > 1) popups.push(`Combo x${maxMult.toFixed(2).replace(/0$/, '')}!`);
  if (isGreat) popups.unshift('대성공!');
  if (isFail) popups.unshift('실패...');

  // 스트레스
  let stressDelta = action.weeklyStressDelta;
  if (stressDelta > 0) {
    const mul = usedCombos.reduce((m, id) => m + (COMBO_MAP[id].stressMultiplier ?? 0), 1);
    stressDelta = Math.max(0, Math.round(stressDelta * mul * (temper?.stressMul ?? 1) - aura.stressReduction));
  } else if (stressDelta < 0) {
    const rb = usedCombos.reduce((m, id) => m + (COMBO_MAP[id].restBonus ?? 0), 0);
    stressDelta = Math.round(stressDelta * (1 + rb) - aura.stressReduction);
  }
  s.status.stress = clamp(s.status.stress + stressDelta, 0, 100);
  if (s.status.stress >= 80 && s.status.stress < 100) {
    s.stats.MOR = clamp(s.stats.MOR - 2, 0, 999);
    notes.push('과로 경고! MOR -2');
  }

  // 골드
  let goldDelta = action.weeklyGoldDelta;
  if (action.type === 'PART_TIME' && goldDelta > 0) {
    const wb = s.activeCombos.reduce((m, id) => m + (COMBO_MAP[id].wageBonus ?? 0), 0);
    goldDelta = isFail ? Math.round(goldDelta * 0.5) : Math.round(goldDelta * (1 + wb));
  }
  s.gold += goldDelta;

  // 상태 수치
  if (action.statusGains && !isFail) {
    const g = action.statusGains;
    if (g.affection) s.status.affection = clamp(s.status.affection + g.affection, 0, 100);
    if (g.delinquency)
      s.status.delinquency = clamp(s.status.delinquency + Math.max(1, Math.round(g.delinquency * parentDelinquencyMul(s.parent?.points))), 0, 100);
    if (g.fame) {
      const fb = usedCombos.includes('CMB_09') ? 1.25 : 1;
      s.status.fame = clamp(s.status.fame + Math.round(g.fame * fb), 0, 500);
    }
  }

  // 적성 경험치
  if (!isFail) {
    const aptGains: Partial<Record<AptitudeKey, number>> = {};
    if (action.aptitudeGain) aptGains[action.aptitudeGain.key] = action.aptitudeGain.exp * APT_EXP_SCALE;
    for (const [k, v] of Object.entries(aura.aptitude) as [AptitudeKey, number][]) aptGains[k] = (aptGains[k] ?? 0) + v;
    for (const [k, v] of Object.entries(aptGains) as [AptitudeKey, number][]) {
      const bonus = usedCombos.reduce((m, id) => m + (COMBO_MAP[id].aptitudeExpBonus?.[k] ?? 0), 0);
      const exp = Math.round(v * (1 + bonus) * (isGreat ? 1.5 : 1));
      if (addAptitudeExp(s.aptitudes, k, exp)) {
        popups.push(`${k} Lv.${s.aptitudes[k].level}!`);
        notes.push(`${k} 레벨 업 → Lv.${s.aptitudes[k].level}`);
      }
    }
  }

  // 영감 포인트
  if (isGreat) s.ideaPoints += 3;
  else if (!isFail && action.type !== 'REST') s.ideaPoints += 1;

  // 행동 카운트 & 외출 이벤트
  s.actionCounts[action.id] = (s.actionCounts[action.id] ?? 0) + 1;
  if (action.type === 'OUTING' || action.id === 'REST_02') {
    s.actionCounts.OUTING_TOTAL = (s.actionCounts.OUTING_TOTAL ?? 0) + 1;
  }
  if (action.type === 'OUTING') outingEvent(s, action.id, rng, notes);

  return {
    week, actionId: action.id, actionName: action.name, emoji: action.emoji, outcome, statDelta, stressDelta, goldDelta,
    comboMultiplier: maxMult, usedCombos, popups, notes,
    actionType: action.type, targetInstanceId: aura.target?.instanceId,
  };
}

/** 연간 대회 3종 */
export const CONTESTS = {
  SPORTS: { title: '5월 체육대회', stat: 'STR' as StatKey, month: 5, emoji: '🏃' },
  ARTFEST: { title: '10월 예술제', stat: 'ART' as StatKey, month: 10, emoji: '🎭' },
  EXAM: { title: '12월 기말시험', stat: 'INT' as StatKey, month: 12, emoji: '📝' },
} as const;
export type ContestId = keyof typeof CONTESTS;

export const contestThreshold = (age: number) => 40 + (age - 8) * 60;

/** 미니게임 성적(0~1) → 점수 배율. 자동 진행은 기존처럼 0.85~1.15 무작위 */
export const perfFactor = (perf: number) => 0.85 + Math.max(0, Math.min(1, perf)) * 0.35;

/**
 * 대회 판정: 해당 스탯 × factor vs 연령별 기준치 → 보상 적용.
 * factor는 미니게임 성적(perfFactor) 또는 무작위(0.85~1.15)
 */
export function finishContest(s: SaveState, id: ContestId, factor: number, events: string[] = [], age = s.age): ContestResult {
  const def = CONTESTS[id];
  const threshold = contestThreshold(age);
  const score = Math.round(s.stats[def.stat] * factor);
  const win = score >= threshold;
  const rank = win ? 1 : score >= threshold * 0.85 ? 2 : score >= threshold * 0.7 ? 3 : 0;
  const rewards: string[] = [];
  if (win) {
    s.actionCounts[`WIN_${id}`] = (s.actionCounts[`WIN_${id}`] ?? 0) + 1;
    if (id === 'SPORTS') {
      s.status.fame = clamp(s.status.fame + 15, 0, 500);
      s.gold += 200;
      rewards.push('명성 +15', '200G');
    } else if (id === 'ARTFEST') {
      s.status.fame = clamp(s.status.fame + 15, 0, 500);
      s.ideaPoints += 5;
      rewards.push('명성 +15', '💡+5');
    } else {
      s.status.fame = clamp(s.status.fame + 10, 0, 500);
      s.gold += 300;
      rewards.push('명성 +10', '300G');
    }
    events.push(`${def.emoji} ${def.title} ${id === 'ARTFEST' ? '입상' : id === 'EXAM' ? '1등' : '우승'}! (점수 ${score}/${threshold}) ${rewards.join(', ')}`);
    addPhoto(s, {
      emoji: def.emoji,
      title: `${def.title} ${id === 'ARTFEST' ? '입상' : id === 'EXAM' ? '1등' : '우승'}`,
      caption: `${age}세, 자랑스러운 순간!`,
      pose: 'cheer',
    });
  } else events.push(`${def.emoji} ${def.title} 결과... 아쉽게 놓쳤다 (점수 ${score}/${threshold})`);
  return { age, id, title: def.title, stat: def.stat, score, threshold, win, rank, rewards };
}

function monthEvents(s: SaveState, rng: Rng, events: string[], interactive: boolean): ContestResult | undefined {
  const cid = (Object.keys(CONTESTS) as ContestId[]).find((k) => CONTESTS[k].month === s.month);
  if (cid) {
    // 직접 플레이: 대회를 미뤄 두고 미니게임 뒤에 판정 (마지막 달은 엔딩 판정 전에 바로 처리)
    if (interactive && !(s.age === 19 && s.month === 12)) {
      s.pendingContest = { id: cid, age: s.age };
      events.push(`${CONTESTS[cid].emoji} ${CONTESTS[cid].title}이 열린다! 응원하러 가자`);
      return;
    }
    return finishContest(s, cid, 0.85 + rng() * 0.3, events);
  }
  switch (s.month) {
    case 3:
      s.ideaPoints += 5;
      events.push(s.age === 8 ? '🌸 초등학교 입학! 새로운 시작 (💡+5)' : '🌸 새 학기 진급! (💡+5)');
      return;
    case 8:
      s.status.stress = clamp(s.status.stress - 20, 0, 100);
      s.status.affection = clamp(s.status.affection + 5, 0, 100);
      events.push('🏖️ 8월 여름 바캉스! 스트레스 -20, 친밀도 +5');
      return;
  }
  return;
}

/** 콤보 재계산 + 최초 달성 콤보 플래그 기록 */
export function refreshCombos(s: SaveState): string[] {
  const { comboIds } = computeActiveCombos(s.placedFurniture);
  s.activeCombos = comboIds;
  const newly: string[] = [];
  for (const id of comboIds) {
    if (!s.flags.includes(`COMBO:${id}`)) {
      s.flags.push(`COMBO:${id}`);
      newly.push(id);
    }
  }
  return newly;
}

/** STEP 3~5: 4주 스케줄 실행 → 월말 이벤트/상태 체크 → 재화 정산 → 다음 달 */
export function runMonth(input: SaveState, rng: Rng = Math.random, opts: { interactiveContest?: boolean } = {}): MonthResult {
  const s = cloneState(input);
  const events: string[] = [];
  refreshCombos(s);

  const weeks: WeekResult[] = [];
  for (let w = 0; w < 4; w++) weeks.push(simulateWeek(s, w, rng));

  // STEP 4. 월말 이벤트 및 상태 체크
  if (s.status.stress >= 100) {
    s.burstCount++;
    const sickChance = s.activeCombos.includes('CMB_06') ? 0.25 : 0.5;
    if (s.status.affection >= 60 || rng() < sickChance) {
      s.gold -= 300;
      s.forcedRestWeeks = 2;
      s.status.stress = 60;
      events.push('🤒 스트레스 폭발! 질병 발생 — 병원비 300G, 다음 달 2주 강제 요양');
    } else {
      s.stats.MOR = clamp(s.stats.MOR - 15, 0, 999);
      s.status.delinquency = clamp(s.status.delinquency + 10, 0, 100);
      s.runawayWeeks = 2;
      s.status.stress = 50;
      events.push('💢 스트레스 폭발! 가출 — 도덕성 -15, 비행 +10, 다음 달 2주 스케줄 취소');
    }
  }
  for (const id of s.activeCombos) {
    const me = COMBO_MAP[id].monthlyEffects;
    if (me?.affection) s.status.affection = clamp(s.status.affection + me.affection, 0, 100);
    if (me?.MOR) s.stats.MOR = clamp(s.stats.MOR + me.MOR, 0, 999);
  }
  if (s.status.stress < 50 && s.status.affection >= 50 && s.status.delinquency > 0) {
    s.status.delinquency = clamp(s.status.delinquency - 1, 0, 100);
  }
  updateWish(s, weeks, rng, events);
  const contestResult = monthEvents(s, rng, events, !!opts.interactiveContest);

  writeDiary(s, weeks, contestResult, rng);

  // STEP 5. 재화 정산 (부모 월급)
  const allowance = Math.round(monthlyAllowance(s.age) * parentAllowanceMul(s.parent?.points));
  s.gold += allowance;
  events.push(`💰 부모님 지원금 +${allowance}G`);

  // 턴 종료
  s.talkedThisMonth = false;
  s.talkKind = null;
  s.pettedThisMonth = false;
  if (s.month === 12 && s.age === 19) {
    if (s.burstCount === 0 && !s.flags.includes('NO_BURST')) s.flags.push('NO_BURST');
    const ending = evaluateEnding(s, s.collectedFurniture);
    if (!s.unlockedEndings.includes(ending.id)) s.unlockedEndings.push(ending.id);
    s.history = [...(s.history ?? []), { age: 20, stats: { ...s.stats }, fame: s.status.fame }];
    return { state: s, weeks, events, contest: contestResult, ending };
  }
  s.month += 1;
  if (s.month > 12) {
    s.month = 1;
    s.age += 1;
    s.history = [...(s.history ?? []), { age: s.age, stats: { ...s.stats }, fame: s.status.fame }];
    addPhoto(s, { emoji: '🎍', title: `${s.age}세 새해`, caption: '올해도 건강하게, 즐겁게!', pose: 'cheer' });
    const newSize = roomSizeForAge(s.age);
    if (newSize > s.roomSize) {
      s.roomSize = newSize;
      events.push(`🏠 ${s.age}세! 방이 ${newSize}x${newSize}로 넓어졌다`);
    } else events.push(`🎂 ${s.age}세가 되었다!`);
  }
  rollParentingEvent(s, rng);
  // 새 달 시작: 성장 컷신 · 성적표
  const cut = CUTSCENES.find((c) => c.age === s.age && c.month === s.month && !(s.seenCutscenes ?? []).includes(c.id));
  if (cut) s.pendingCutscene = cut.id;
  if ((s.month === 7 || s.month === 2) && !(s.age === 8 && s.month === 2)) s.pendingReport = true;
  if (s.birthMonth === s.month) s.pendingBirthday = true;
  return { state: s, weeks, events, contest: contestResult };
}
