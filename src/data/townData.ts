import type { Effect } from './parentingData';
import type { SpStep } from './specialDays';

/**
 * 🗺️ 주말 나들이 (v0.38) — 한 달에 한 번, 아이와 동네를 돌아다니며 사람을 만나고 작은 일을 겪는다.
 * 오전 · 오후 · 저녁 세 번 장소를 고르고, 장소마다 만남(동네 사람) 또는 작은 사건·놀이가 생긴다.
 * 글 안의 {name} {friend} {rival} {teacher} {mentor} 는 이름으로, '{x}이(가)'처럼 쓰면 받침에 맞춰 조사가 붙는다.
 */

export type NpcId = 'FRIEND' | 'RIVAL' | 'TEACHER' | 'GRANNY' | 'MENTOR';

export interface Npc {
  id: NpcId;
  role: string; // 관계 이름
  emoji: string;
  minAge: number;
  homes: LocId[]; // 자주 나타나는 곳
  /** 관계 단계 이름 (0~29, 30~69, 70~) */
  tiers: [string, string, string];
  /** 50·100 이 됐을 때 받는 것 (화면 표시용) */
  perk50: string;
  perk100: string;
}

export const NPCS: Record<NpcId, Npc> = {
  FRIEND: { id: 'FRIEND', role: '단짝', emoji: '🧒', minAge: 8, homes: ['PARK', 'SCHOOL'], tiers: ['반 친구', '단짝', '평생 친구'], perk50: '우정 팔찌 (자존감 +5)', perk100: '평생 친구 (매력 +5, 스트레스 -10)' },
  RIVAL: { id: 'RIVAL', role: '라이벌', emoji: '😤', minAge: 9, homes: ['SCHOOL', 'PCROOM'], tiers: ['신경 쓰이는 애', '라이벌', '최고의 라이벌'], perk50: '라이벌이자 친구 — 대회 점수 +5%', perk100: '서로를 키운 사이 (지력·체력 +4)' },
  TEACHER: { id: 'TEACHER', role: '선생님', emoji: '🧑‍🏫', minAge: 8, homes: ['SCHOOL', 'LIBRARY'], tiers: ['담임 선생님', '믿어 주는 선생님', '인생의 은사'], perk50: '선생님의 책 선물 (지력 +5)', perk100: '은사님의 편지 (자존감 +6)' },
  GRANNY: { id: 'GRANNY', role: '빵집 할머니', emoji: '👵', minAge: 8, homes: ['MARKET'], tiers: ['빵집 할머니', '단골 손님', '손주 같은 아이'], perk50: '비밀 레시피 (기술 +4)', perk100: '할머니의 용돈 (200G)' },
  MENTOR: { id: 'MENTOR', role: '대학생 선배', emoji: '🧑‍🎓', minAge: 15, homes: ['RIVER', 'CAMPUS'], tiers: ['동네 대학생', '고민 상담 선배', '인생 선배'], perk50: '캠퍼스 구경 (💡+6)', perk100: '선배의 응원 (자존감 +5, 스트레스 -10)' },
};

export type LocId = 'PARK' | 'SCHOOL' | 'MARKET' | 'RIVER' | 'LIBRARY' | 'DOWNTOWN' | 'PCROOM' | 'CAMPUS';

export interface Loc {
  id: LocId;
  name: string;
  emoji: string;
  minAge: number;
  /** 지도 그림(town-map) 위 건물 가운데 위치 (%) */
  x: number;
  y: number;
  sky: [string, string];
  props: string[];
}

export const LOCS: Loc[] = [
  { id: 'PARK', name: '놀이터 공원', emoji: '🛝', minAge: 8, x: 15, y: 17, sky: ['#bfe6ff', '#c9efc0'], props: ['🌳', '🛝', '🌼'] },
  { id: 'SCHOOL', name: '학교 운동장', emoji: '🏫', minAge: 8, x: 52, y: 13, sky: ['#cfe8ff', '#e9d9b8'], props: ['🏫', '⚽', '🚩'] },
  { id: 'MARKET', name: '동네 상가', emoji: '🥐', minAge: 8, x: 84, y: 28, sky: ['#ffe8c9', '#f3d3a8'], props: ['🥐', '🏪', '🎈'] },
  { id: 'RIVER', name: '강변 산책로', emoji: '🌊', minAge: 8, x: 17, y: 81, sky: ['#bfe2ff', '#9fd0e8'], props: ['🌊', '🚲', '🐟'] },
  { id: 'LIBRARY', name: '구립 도서관', emoji: '📚', minAge: 10, x: 53, y: 46, sky: ['#f4ecdc', '#e3d3b5'], props: ['📚', '🪴', '🕰️'] },
  { id: 'DOWNTOWN', name: '번화가', emoji: '🛍️', minAge: 13, x: 85, y: 68, sky: ['#ffd1e6', '#c9b8ff'], props: ['🛍️', '🎤', '🧋'] },
  { id: 'PCROOM', name: 'PC방·노래방', emoji: '🎧', minAge: 13, x: 57, y: 78, sky: ['#271a4a', '#4a2e7a'], props: ['🖥️', '🎤', '🍜'] },
  { id: 'CAMPUS', name: '대학가', emoji: '🎓', minAge: 17, x: 17, y: 47, sky: ['#d9f0dc', '#f6efd9'], props: ['🎓', '☕', '🌳'] },
];

export const LOC_MAP: Record<LocId, Loc> = Object.fromEntries(LOCS.map((l) => [l.id, l])) as Record<LocId, Loc>;

export interface TownChoice {
  label: string;
  fx: Effect;
  rel?: number; // 만난 사람과의 관계 변화
  reply: string;
}

export interface TownEnc {
  id: string;
  loc: LocId | 'ANY_HOME'; // ANY_HOME: 그 사람이 있는 아무 곳
  npc?: NpcId;
  tier?: 0 | 1 | 2;
  milestone?: 50 | 100;
  minAge?: number;
  maxAge?: number;
  emoji: string;
  title: string;
  text: string;
  choices?: TownChoice[];
  /** 놀이: 결과는 [못함, 보통, 잘함] 또는 고른 카드 순서 */
  game?: SpStep;
  results?: { text: string; fx: Effect; rel?: number }[];
}

const C = (label: string, fx: Effect, reply: string, rel?: number): TownChoice => ({ label, fx, reply, rel });

export const TOWN_ENCS: TownEnc[] = [
  // ───────── 단짝 ─────────
  { id: 'FR_0', loc: 'ANY_HOME', npc: 'FRIEND', tier: 0, emoji: '🧒', title: '{friend}', text: '{friend}이(가) 혼자 그네를 타고 있다. "어? {name}! 같이 놀자!"',
    choices: [C('신나게 달려가게 두기', { CHA: 2, stress: -3 }, '둘이 해 질 때까지 모래성을 쌓았다.', 10), C('"숙제 먼저!" 인사만 하고 오게 하기', { MOR: 1 }, '{friend}이(가) 손을 흔들어 줬다. "내일 학교에서 봐!"', 4)] },
  { id: 'FR_1', loc: 'ANY_HOME', npc: 'FRIEND', tier: 1, emoji: '🧒', title: '{friend}', text: '{friend}: "{name}! 나 비밀 기지 찾았어! 같이 가자!"',
    choices: [C('신나게 따라가게 둔다', { STR: 2, stress: -5 }, '덤불 속 비밀 기지에 둘만의 깃발을 꽂았다.', 9), C('"위험한 데는 안 돼" 조심시키기', { MOR: 2 }, '"알았어~" 대신 놀이터에 기지를 만들었다.', 5)] },
  { id: 'FR_2', loc: 'ANY_HOME', npc: 'FRIEND', tier: 2, emoji: '🧒', title: '{friend}', text: '{friend}: "우리 어른 돼도 계속 친구 하는 거다?"',
    choices: [C('새끼손가락 걸고 약속', { selfEsteem: 3, stress: -4 }, '도장, 복사, 코팅까지 완료!', 6), C('"당연하지!" 어깨동무', { CHA: 2, stress: -3 }, '둘이 깔깔 웃으며 아이스크림을 나눠 먹었다.', 5)] },
  { id: 'FR_50', loc: 'ANY_HOME', npc: 'FRIEND', milestone: 50, emoji: '📿', title: '우정 팔찌', text: '{friend}이(가) 꼼지락꼼지락 만든 실 팔찌를 내민다. "이거 너 주려고 만들었어!"',
    choices: [C('평생 차고 다니기로', { selfEsteem: 5, stress: -5 }, '{name}의 손목에 알록달록 팔찌가 생겼다.')] },
  { id: 'FR_100', loc: 'ANY_HOME', npc: 'FRIEND', milestone: 100, emoji: '🤝', title: '평생 친구', text: '{friend}: "힘들 때 생각나는 사람이 너야." 두 아이가 말없이 웃었다.',
    choices: [C('둘만의 타임캡슐을 묻는다', { CHA: 5, stress: -10 }, '"20년 뒤에 같이 열자!"')] },

  // ───────── 라이벌 ─────────
  { id: 'RV_0', loc: 'ANY_HOME', npc: 'RIVAL', tier: 0, emoji: '😤', title: '{rival}', text: '{rival}이(가) 코웃음 친다. "이번에도 내가 이길걸?"',
    choices: [C('"두고 봐!" 맞받아치기', { INT: 2, STR: 1, stress: 2 }, '{name}의 눈에서 불꽃이 튄다.', 7), C('무시하고 지나가기', { MOR: 1 }, '"...흥." {rival}이(가) 오히려 신경 쓰는 눈치다.', 3)] },
  { id: 'RV_1', loc: 'ANY_HOME', npc: 'RIVAL', tier: 1, emoji: '😤', title: '{rival}', text: '{rival}: "...너 저번에 꽤 하더라. 인정."',
    choices: [C('"같이 연습할래?" 제안하기', { INT: 2, STR: 2 }, '둘이 붙으니 실력이 쑥쑥 는다.', 10), C('"당연하지~" 으쓱하기', { selfEsteem: 2 }, '{rival}: "다음엔 안 져!"', 4)] },
  { id: 'RV_2', loc: 'ANY_HOME', npc: 'RIVAL', tier: 2, emoji: '😤', title: '{rival}', text: '{rival}: "다음 대회도 정정당당하게 하자."',
    choices: [C('굳게 악수하기', { MOR: 2, CHA: 1 }, '둘 다 씩 웃었다.', 6), C('"이번엔 안 봐준다!"', { INT: 1, STR: 2 }, '{rival}: "누가 할 소리!"', 5)] },
  { id: 'RV_50', loc: 'ANY_HOME', npc: 'RIVAL', milestone: 50, emoji: '🔥', title: '라이벌이자 친구', text: '{rival}: "너 없으면 재미없을 것 같아. 그러니까 대회 때 꼭 나와."',
    choices: [C('"너도 꼭 나와!"', { selfEsteem: 3 }, '이제 대회가 기다려진다. (대회 점수 +5%)')] },
  { id: 'RV_100', loc: 'ANY_HOME', npc: 'RIVAL', milestone: 100, emoji: '🏅', title: '서로를 키운 사이', text: '{rival}: "솔직히... 너 덕분에 여기까지 왔어."',
    choices: [C('"나도야."', { INT: 4, STR: 4 }, '둘은 서로의 가장 든든한 경쟁자다.')] },

  // ───────── 선생님 ─────────
  { id: 'TC_0', loc: 'ANY_HOME', npc: 'TEACHER', tier: 0, emoji: '🧑‍🏫', title: '{teacher} 선생님', text: '{teacher} 선생님이 벤치에서 채점을 하고 계신다.',
    choices: [C('꾸벅 인사시키기', { MOR: 1 }, '선생님: "어머, {name} 왔구나!"', 6), C('궁금한 걸 여쭤보게 하기', { INT: 2 }, '선생님이 반가워하며 한참 설명해 주셨다.', 8)] },
  { id: 'TC_1', loc: 'ANY_HOME', npc: 'TEACHER', tier: 1, emoji: '🧑‍🏫', title: '{teacher} 선생님', text: '선생님: "{name}, 요즘 표정이 좋네. 고민 있으면 말해."',
    choices: [C('고민을 털어놓게 두기', { stress: -6 }, '선생님이 고개를 끄덕이며 끝까지 들어 주셨다.', 8), C('"없어요!" 씩씩하게', { selfEsteem: 1 }, '"그래, 언제든 와."', 3)] },
  { id: 'TC_2', loc: 'ANY_HOME', npc: 'TEACHER', tier: 2, emoji: '🧑‍🏫', title: '{teacher} 선생님', text: '선생님: "선생님은 {name}이(가) 뭘 하든 응원해."',
    choices: [C('꿈 이야기를 하게 하기', { selfEsteem: 4 }, '선생님의 눈이 반짝였다. "멋지다!"', 5), C('"감사합니다" 꾸벅', { MOR: 2 }, '선생님이 머리를 쓰다듬어 주셨다.', 4)] },
  { id: 'TC_50', loc: 'ANY_HOME', npc: 'TEACHER', milestone: 50, emoji: '📘', title: '선생님의 선물', text: '선생님: "이 책, 선생님이 {name} 나이 때 제일 좋아하던 책이야."',
    choices: [C('밤새 읽어 보기', { INT: 5 }, '책 첫 장에 "꿈꾸는 {name}에게"라고 적혀 있었다.')] },
  { id: 'TC_100', loc: 'ANY_HOME', npc: 'TEACHER', milestone: 100, emoji: '✉️', title: '은사님의 편지', text: '선생님에게서 손편지가 왔다. "넌 선생님의 자랑이야."',
    choices: [C('편지를 액자에 넣는다', { selfEsteem: 6 }, '{name}이(가) 몇 번이고 다시 읽었다.')] },

  // ───────── 빵집 할머니 ─────────
  { id: 'GR_0', loc: 'MARKET', npc: 'GRANNY', tier: 0, emoji: '👵', title: '빵집 할머니', text: '빵집 할머니가 가게 앞을 쓸고 계신다. 고소한 냄새가 솔솔.',
    choices: [C('빗자루질을 도와드리게 하기', { MOR: 2 }, '할머니: "아이고 착하기도 해라!"', 8), C('빵 냄새에 침만 꿀꺽', { stress: -2 }, '할머니가 웃으며 손을 흔들어 주셨다.', 3)] },
  { id: 'GR_1', loc: 'MARKET', npc: 'GRANNY', tier: 1, emoji: '👵', title: '빵집 할머니', text: '할머니: "우리 강아지 왔니? 갓 구운 소보로 하나 먹고 가."',
    choices: [C('"감사합니다!" 냠냠', { stress: -5 }, '세상에서 제일 맛있는 소보로였다.', 6), C('"이번엔 제가 살게요!" 용돈 꺼내기', { MOR: 2, gold: -20 }, '할머니가 덤으로 크림빵을 하나 더 넣어 주셨다.', 8)] },
  { id: 'GR_2', loc: 'MARKET', npc: 'GRANNY', tier: 2, emoji: '👵', title: '빵집 할머니', text: '할머니: "나 젊을 땐 말이다..." 옛날이야기가 시작됐다.',
    choices: [C('끝까지 들어 드리기', { INT: 1, MOR: 2 }, '할머니가 처음 빵집을 연 날 이야기에 {name}이(가) 푹 빠졌다.', 6), C('어깨를 주물러 드리기', { MOR: 2 }, '"아이고 시원하다~ 우리 손주 최고!"', 7)] },
  { id: 'GR_50', loc: 'MARKET', npc: 'GRANNY', milestone: 50, emoji: '📜', title: '비밀 레시피', text: '할머니: "이건 아무한테도 안 알려 준 건데..." 꼬깃꼬깃한 레시피 쪽지.',
    choices: [C('집에서 같이 만들어 보기', { TEC: 4 }, '처음 만든 소보로가 제법 그럴듯했다!')] },
  { id: 'GR_100', loc: 'MARKET', npc: 'GRANNY', milestone: 100, emoji: '🧧', title: '할머니의 용돈', text: '할머니가 꼭 쥐여 주신 봉투. "맛있는 거 사 먹어. 우리 손주."',
    choices: [C('"할머니 오래오래 건강하세요!"', { gold: 200, MOR: 2 }, '할머니가 {name}을(를) 꼭 안아 주셨다.')] },

  // ───────── 대학생 선배 ─────────
  { id: 'MT_0', loc: 'ANY_HOME', npc: 'MENTOR', tier: 0, emoji: '🧑‍🎓', title: '{mentor} 선배', text: '조깅하던 대학생 {mentor}이(가) 말을 건다. "너 달리는 자세 좋은데?"',
    choices: [C('같이 한 바퀴 뛰게 두기', { STR: 2 }, '숨이 차도록 강변을 달렸다.', 8), C('대학 생활을 물어보게 하기', { INT: 1, idea: 1 }, '"대학? 생각보다 재밌어. 근데 과제가..."', 8)] },
  { id: 'MT_1', loc: 'ANY_HOME', npc: 'MENTOR', tier: 1, emoji: '🧑‍🎓', title: '{mentor} 선배', text: '{mentor}: "진로 고민? 나도 고3 때 엄청 했어."',
    choices: [C('고민 상담을 하게 두기', { stress: -6 }, '"정답은 없어. 네가 좋아하는 걸 찾아."', 8), C('선배 학과 구경 가기', { INT: 2 }, '처음 본 대학 강의실에 {name}의 눈이 반짝였다.', 6)] },
  { id: 'MT_2', loc: 'ANY_HOME', npc: 'MENTOR', tier: 2, emoji: '🧑‍🎓', title: '{mentor} 선배', text: '{mentor}: "넌 뭘 고르든 잘할 거야. 내가 보장해."',
    choices: [C('"선배처럼 되고 싶어요"', { MOR: 2, selfEsteem: 3 }, '{mentor}이(가) 쑥스러운 듯 웃었다.', 6), C('밥 한 끼 같이 먹기', { stress: -4, gold: -20 }, '학식이 생각보다 맛있었다!', 5)] },
  { id: 'MT_50', loc: 'ANY_HOME', npc: 'MENTOR', milestone: 50, emoji: '🏛️', title: '캠퍼스 구경', text: '{mentor}이(가) 학교 구석구석을 구경시켜 줬다. 동아리방, 도서관, 잔디밭...',
    choices: [C('"나도 여기 다니고 싶다!"', { idea: 6, INT: 2 }, '{name}에게 새로운 목표가 생겼다.')] },
  { id: 'MT_100', loc: 'ANY_HOME', npc: 'MENTOR', milestone: 100, emoji: '📣', title: '선배의 응원', text: '{mentor}: "시험 날 아침, 교문 앞에서 기다릴게. 화이팅!"',
    choices: [C('"꼭 갈게요!"', { selfEsteem: 5, stress: -10 }, '든든한 선배가 생겼다.')] },

  // ───────── 놀이터 공원 ─────────
  { id: 'P_BUBBLE', loc: 'PARK', maxAge: 12, emoji: '🫧', title: '비눗방울 아저씨', text: '비눗방울 아저씨가 왕 비눗방울을 날린다!',
    game: { kind: 'catch', prompt: '비눗방울을 톡톡 터뜨리기!', items: ['🫧', '🫧', '🫧'], seconds: 6, goal: 9, motion: 'float' },
    results: [{ text: '비눗방울이 자꾸 도망갔다ㅋㅋ', fx: { stress: -3 } }, { text: '퐁퐁퐁! 신나게 터뜨렸다.', fx: { stress: -5, STR: 1 } }, { text: '아저씨가 "꼬마 챔피언!" 하고 큰 비눗방울을 만들어 줬다.', fx: { stress: -6, STR: 1, CHA: 1 } }] },
  { id: 'P_SWING', loc: 'PARK', maxAge: 14, emoji: '🛝', title: '그네 타기', text: '{name}: "밀어 줘! 하늘까지!"',
    game: { kind: 'timing', prompt: '그네가 뒤로 왔을 때 힘껏 밀기!', icon: '🛝', rounds: 2, speed: 1.2, zone: 24, hitText: '휘익~!', missText: '어이쿠' },
    results: [{ text: '타이밍이 엇갈려 그네가 비틀비틀. 그래도 깔깔.', fx: { stress: -3 } }, { text: '구름 가까이 올라갔다!', fx: { stress: -5, STR: 1 } }, { text: '"엄마 아빠 최고!" 하늘까지 날아오를 것 같았다.', fx: { stress: -6, STR: 2 } }] },
  { id: 'P_CAT', loc: 'PARK', emoji: '🐈', title: '길고양이', text: '벤치 밑에 노란 길고양이 한 마리. {name}이(가) 쪼그려 앉았다.',
    choices: [C('편의점 간식을 사서 준다', { MOR: 2, gold: -10 }, '고양이가 {name}의 손에 머리를 비볐다.'), C('멀리서 조용히 관찰하기', { INT: 1, MOR: 1 }, '"고양이는 꼬리로 기분을 말한대!" 관찰 일지가 한 장 늘었다.')] },
  { id: 'P_LOST', loc: 'PARK', emoji: '😭', title: '길 잃은 꼬마', text: '어린 꼬마가 엉엉 울고 있다. "엄마가 없어..."',
    choices: [C('같이 엄마를 찾아 준다', { MOR: 3, CHA: 1 }, '꼬마 엄마가 몇 번이고 고맙다고 하셨다. {name}이(가) 으쓱.'), C('관리사무소에 데려다준다', { MOR: 2, INT: 1 }, '방송이 나오고 금방 엄마가 달려왔다.')] },

  // ───────── 학교 운동장 ─────────
  { id: 'S_SOCCER', loc: 'SCHOOL', emoji: '⚽', title: '운동장 축구', text: '반 아이들이 축구를 하다가 손짓한다. "한 명 모자라! 들어와!"',
    game: { kind: 'timing', prompt: '골대 구석으로 슛!', icon: '⚽', rounds: 3, speed: 1.3, zone: 20, hitText: '골~!', missText: '골대 맞음' },
    results: [{ text: '골은 못 넣었지만 끝까지 뛰었다.', fx: { STR: 1, stress: -2 } }, { text: '한 골 넣었다! 친구들이 하이파이브.', fx: { STR: 2, CHA: 1, stress: -4 } }, { text: '해트트릭! 오늘의 MVP는 {name}!', fx: { STR: 3, CHA: 2, selfEsteem: 2 } }] },
  { id: 'S_BAR', loc: 'SCHOOL', maxAge: 13, emoji: '🤸', title: '철봉', text: '{name}: "나 철봉 거꾸로 매달리기 할 수 있다? 봐 봐!"',
    choices: [C('"우와!" 박수 쳐 주기', { selfEsteem: 2, STR: 1 }, '신이 나서 열 번이나 보여 줬다.'), C('"조심해!" 밑에서 받쳐 주기', { STR: 1, MOR: 1 }, '든든하니 처음으로 앞구르기 내리기 성공!')] },
  { id: 'S_WALLET', loc: 'SCHOOL', emoji: '👛', title: '떨어진 지갑', text: '운동장 구석에 지갑이 떨어져 있다.',
    choices: [C('교무실에 갖다주게 하기', { MOR: 3 }, '다음 날 조회 시간에 칭찬을 받았다.'), C('지갑 속 학생증 보고 직접 찾아 주기', { MOR: 2, CHA: 2 }, '"정말 고마워!" 새 친구가 생겼다.')] },

  // ───────── 동네 상가 ─────────
  { id: 'M_GACHA', loc: 'MARKET', maxAge: 14, emoji: '🎰', title: '문구점 뽑기', text: '{name}: "딱 한 번만! 제발!" 문구점 앞 뽑기 기계.',
    game: { kind: 'pick', prompt: '캡슐 하나를 골라요', hidden: true, back: '🔮', options: [{ emoji: '🧷', label: '꽝 (지우개)' }, { emoji: '⭐', label: '반짝이 스티커' }, { emoji: '🦖', label: '레어 공룡 피규어' }] },
    results: [{ text: '꽝... 그래도 지우개는 쓸 만하다.', fx: { gold: -10, stress: -1 } }, { text: '반짝이 스티커! 필통에 붙였다.', fx: { gold: -10, stress: -3 } }, { text: '레어 피규어!!! 반에서 자랑할 거래.', fx: { gold: -10, stress: -5, CHA: 1 } }] },
  { id: 'M_TTEOK', loc: 'MARKET', emoji: '🍢', title: '분식집', text: '분식집 앞. {name}의 발걸음이 멈췄다. 떡볶이 냄새...',
    choices: [C('떡볶이 1인분 쏜다', { stress: -4, gold: -30 }, '"매워! 근데 맛있어!" 입가가 빨개졌다.'), C('"저녁 먹어야지" 참기', { MOR: 1, stress: 1 }, '집에 오는 내내 떡볶이 얘기만 했다.')] },
  { id: 'M_BAGS', loc: 'MARKET', emoji: '🛒', title: '무거운 장바구니', text: '할아버지 한 분이 무거운 장바구니를 들고 쩔쩔매신다.',
    choices: [C('같이 들어 드린다', { MOR: 3, STR: 1 }, '할아버지가 사탕을 한 주먹 쥐여 주셨다.'), C('카트를 가져다드린다', { MOR: 2, INT: 1 }, '"요즘 애들 똑똑하네!"')] },

  // ───────── 강변 ─────────
  { id: 'R_STONE', loc: 'RIVER', emoji: '🪨', title: '물수제비', text: '{name}: "물수제비 누가 더 많이 뜨나 내기!"',
    game: { kind: 'timing', prompt: '납작한 돌을 휙!', icon: '🪨', rounds: 3, speed: 1.4, zone: 20, hitText: '통통통!', missText: '퐁당...' },
    results: [{ text: '돌이 전부 퐁당. "다음엔 이길 거야!"', fx: { stress: -3 } }, { text: '세 번 통통통! 제법이다.', fx: { stress: -4, STR: 1 } }, { text: '일곱 번! 지나가던 사람이 박수를 쳤다.', fx: { stress: -6, STR: 2 } }] },
  { id: 'R_FISH', loc: 'RIVER', emoji: '🎣', title: '낚시 할아버지', text: '낚싯대를 드리운 할아버지가 손짓한다. "한번 해 볼 테냐?"',
    choices: [C('조용히 같이 기다려 본다', { INT: 1, MOR: 1, stress: -4 }, '한 시간 만에 손바닥만 한 붕어! "놓아주자"'), C('물고기 이름을 배운다', { INT: 2 }, '"이건 피라미, 저건 버들치란다."')] },
  { id: 'R_BIKE', loc: 'RIVER', emoji: '🚲', title: '자전거', text: '강변 자전거길. {name}: "저 다리까지 시합!"',
    choices: [C('전력으로 경주', { STR: 3, stress: -2 }, '헉헉... 다리에 먼저 닿은 건 {name}!'), C('천천히 바람 맞으며', { stress: -5 }, '강바람이 시원했다. 둘 다 말없이 웃었다.')] },

  // ───────── 도서관 ─────────
  { id: 'L_BOOK', loc: 'LIBRARY', emoji: '📖', title: '오늘의 책', text: '{name}: "오늘은 어떤 책 빌리지?"',
    game: { kind: 'pick', prompt: '어떤 책을 빌릴까?', options: [{ emoji: '🗺️', label: '모험 소설' }, { emoji: '🔬', label: '과학 잡지' }, { emoji: '🎨', label: '그림 그리는 법' }] },
    results: [{ text: '보물섬 이야기에 푹 빠져 밤늦게까지 읽었다.', fx: { ART: 1, INT: 1, stress: -2 } }, { text: '"블랙홀은 빛도 빨아들인대!" 아는 척이 늘었다.', fx: { INT: 2, TEC: 1 } }, { text: '책을 따라 그린 그림이 제법이다.', fx: { ART: 2 } }] },
  { id: 'L_STUDY', loc: 'LIBRARY', emoji: '✏️', title: '열람실', text: '조용한 열람실. 옆에는 만화책 코너가 손짓한다.',
    choices: [C('열람실에서 숙제 끝내기', { INT: 2, stress: 1 }, '집에 와서 놀 시간이 생겼다!'), C('만화책 코너로 직행', { stress: -4, ART: 1 }, '"한 권만..." 이 열 권이 됐다.')] },

  // ───────── 번화가 (13+) ─────────
  { id: 'D_BUSK', loc: 'DOWNTOWN', emoji: '🎸', title: '길거리 버스킹', text: '광장에서 버스킹 공연이 한창이다.',
    choices: [C('맨 앞에서 구경하고 동전 넣기', { ART: 2, gold: -10 }, '{name}이(가) 노래를 따라 흥얼거렸다.'), C('"같이 부를 사람?"에 손 들기', { CHA: 3, stress: 2 }, '떨렸지만 박수를 받았다!')] },
  { id: 'D_CLOTHES', loc: 'DOWNTOWN', emoji: '👕', title: '옷가게', text: '{name}이(가) 쇼윈도 앞에서 발을 못 뗀다. "이거 진짜 예쁘다..."',
    choices: [C('사 준다', { CHA: 2, selfEsteem: 2, gold: -80 }, '다음 날 그 옷만 입고 학교에 갔다.'), C('"용돈 모아서 사자" 약속', { MOR: 2, autonomy: 1 }, '저금통에 "옷"이라고 써 붙였다.')] },
  { id: 'D_CLAW', loc: 'DOWNTOWN', emoji: '🧸', title: '인형 뽑기', text: '"저 인형 진짜 갖고 싶어..." 인형 뽑기 기계 앞.',
    game: { kind: 'timing', prompt: '집게가 인형 위에 왔을 때 꾹!', icon: '🕹️', rounds: 1, speed: 1.6, zone: 18, hitText: '잡았다!', missText: '스르륵...' },
    results: [{ text: '아깝다! 집게가 스르륵...', fx: { gold: -10, stress: 1 } }, { text: '걸렸는데 떨어졌다! 그래도 재밌었다.', fx: { gold: -10, stress: -2 } }, { text: '한 번에 뽑았다!! 오늘의 전리품.', fx: { gold: -10, stress: -5, selfEsteem: 1 } }] },

  // ───────── PC방·노래방 (13+) ─────────
  { id: 'C_SING', loc: 'PCROOM', emoji: '🎤', title: '코인 노래방', text: '{name}: "한 곡만 같이 부르자!" 코인 노래방 부스.',
    game: { kind: 'timing', prompt: '고음 타이밍에 맞춰!', icon: '🎤', rounds: 3, speed: 1.5, zone: 20, hitText: '삑사리 없이!', missText: '삑-!' },
    results: [{ text: '삑사리 대잔치ㅋㅋ 배꼽 빠지게 웃었다.', fx: { stress: -5 } }, { text: '점수 87점! 나쁘지 않다.', fx: { stress: -5, ART: 1 } }, { text: '100점!! 축하 팡파레가 울렸다.', fx: { stress: -6, ART: 2, CHA: 1 } }] },
  { id: 'C_LATE', loc: 'PCROOM', emoji: '🖥️', title: 'PC방', text: '친구들이 PC방에 모여 있다. "{name}, 한 판만 하고 가!"',
    choices: [C('딱 한 시간만 허락', { TEC: 2, stress: -3 }, '약속한 시간에 정확히 나왔다. 믿어 준 보람.'), C('"오늘은 집에 가자"', { MOR: 2, stress: 1 }, '"치..." 그래도 순순히 따라왔다.')] },

  // ───────── 대학가 (17+) ─────────
  { id: 'U_FAIR', loc: 'CAMPUS', emoji: '🏛️', title: '학과 설명회', text: '대학 학과 설명회가 열렸다. 부스가 줄지어 있다.',
    game: { kind: 'pick', prompt: '어느 부스부터 가 볼까?', options: [{ emoji: '🩺', label: '의예과' }, { emoji: '💻', label: '컴퓨터공학과' }, { emoji: '🎭', label: '예술대학' }] },
    results: [{ text: '해부학 모형 앞에서 한참을 서 있었다.', fx: { INT: 2, MOR: 1 } }, { text: '코딩 체험에서 1등을 했다!', fx: { TEC: 2, INT: 1 } }, { text: '졸업 작품 전시에 마음을 빼앗겼다.', fx: { ART: 2, CHA: 1 } }] },
  { id: 'U_CAFE', loc: 'CAMPUS', emoji: '☕', title: '캠퍼스 카페', text: '대학생들 사이에 앉아 커피를 마셨다. 어른이 된 기분.',
    choices: [C('창가에서 공부해 보기', { INT: 2 }, '"여기서 공부하면 잘 될 것 같아."'), C('대학생들 대화 엿듣기', { CHA: 1, idea: 1 }, '"조별 과제"라는 무서운 단어를 처음 들었다.')] },
  { id: 'U_LECTURE', loc: 'CAMPUS', emoji: '🎒', title: '몰래 청강', text: '열린 강의실 문 사이로 수업이 보인다.',
    choices: [C('맨 뒷자리에 살짝 앉아 듣기', { INT: 3, stress: 1 }, '교수님이 눈치채고 "고등학생? 환영해요!" 하셨다.'), C('복도에서 귀만 쫑긋', { INT: 1 }, '어려운 말이 반, 신기한 말이 반.')] },
];
