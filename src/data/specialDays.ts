import type { SaveState } from '../engine/simulation';
import { notPoor } from '../engine/homeContext';
import type { Effect } from './parentingData';

/**
 * ✨ 특별한 하루 (v0.37) — 선택지 대화(육아 상황)와 다른, 직접 해 보는 짧은 놀이 이벤트.
 * 대회·생일·컷신이 없는 조용한 달에 2~3달마다 하나씩. 같은 이벤트는 성장 단계(유년·청소년·청년)마다 한 번만.
 *
 * 놀이 종류
 *  - catch  : 떨어지는(날아가는) 것을 톡톡 눌러 모으기
 *  - timing : 왔다 갔다 하는 막대가 표시 안에 들어올 때 누르기
 *  - pick   : 카드 고르기 (hidden 이면 뒤집힌 카드 — 열어 봐야 앎)
 *  - build  : 칸마다 하나씩 골라 꾸미기
 * 결과는 마지막 놀이(점수 0~2 또는 고른 카드 번호)로 정해진다.
 */
export interface SpOption {
  emoji: string;
  label: string;
  fx?: Effect;
}

export type SpStep =
  | { kind: 'catch'; prompt: string; items: string[]; bad?: string[]; seconds: number; goal: number; motion: 'fall' | 'streak' | 'float' }
  | { kind: 'timing'; prompt: string; icon: string; rounds: number; speed: number; zone: number; hitText: string; missText: string }
  | { kind: 'pick'; prompt: string; options: SpOption[]; hidden?: boolean; back?: string }
  | { kind: 'build'; prompt: string; slots: { label: string; options: SpOption[] }[] };

export interface SpResult {
  title: string;
  text: string; // {name} 아이 이름, {p0} {p1}… 앞 단계에서 고른 것, {score} 잡은 개수
  fx: Effect;
  photo?: { emoji: string; title: string; caption: string; pose: 'stand' | 'cheer' | 'tired' };
}

export interface SpecialDay {
  id: string;
  emoji: string;
  title: string;
  months?: number[]; // 없으면 아무 달
  minAge: number;
  maxAge: number;
  sky: [string, string]; // 장면 배경 그라데이션
  deco: string[]; // 장면에 떠다니는 장식
  intro: string[]; // 도입 이야기 (한 줄씩)
  steps: SpStep[];
  /** 마지막 단계가 catch/timing 이면 [못함, 보통, 아주 잘함], pick 이면 고른 카드 순서대로 */
  results: SpResult[];
  weight?: number;
  /** 이 집 사정에 맞을 때만 (형편 · 가진 물건 · 해 본 일) */
  /** 명절: 성장 단계마다 다시 나온다 (그 밖의 날은 한 판에 한 번) */
  yearly?: boolean;
  need?: (s: SaveState) => boolean;
}

export const SPECIAL_DAYS: SpecialDay[] = [
  {
    id: 'SP_HALLOWEEN', emoji: '🎃', title: '할로윈 사탕 모으기', months: [10], minAge: 8, maxAge: 13,
    sky: ['#2b1846', '#7a3b2e'], deco: ['🦇', '🕸️', '🌕'],
    intro: ['동네 아이들이 분장을 하고 집집마다 돌아다닌다.', '{name}: "나도 갈래! 뭘로 분장하지?"'],
    steps: [
      { kind: 'build', prompt: '분장을 골라 주세요', slots: [
        { label: '옷', options: [{ emoji: '👻', label: '유령' }, { emoji: '🧛', label: '드라큘라' }, { emoji: '🧙', label: '마법사' }] },
        { label: '소품', options: [{ emoji: '🎃', label: '호박 바구니' }, { emoji: '🪄', label: '요술봉' }, { emoji: '🔦', label: '손전등' }] },
      ] },
      { kind: 'catch', prompt: '사탕을 톡톡! (벌레는 피하기)', items: ['🍬', '🍭', '🍫', '🧁'], bad: ['🕷️'], seconds: 9, goal: 14, motion: 'fall' },
    ],
    results: [
      { title: '사탕 조금', text: '{p0} {name}, 사탕 {score}개. "그래도 재밌었어!"', fx: { stress: -6, CHA: 2 } },
      { title: '사탕 한 바구니', text: '{p0} {name}, 사탕 {score}개! 친구들이랑 바꿔 먹었다', fx: { stress: -10, CHA: 4 }, photo: { emoji: '🎃', title: '할로윈', caption: '분장하고 사탕 한 바구니!', pose: 'cheer' } },
      { title: '동네 사탕왕', text: '{p0} {name}, 사탕 {score}개! 분장이 제일 멋지다고 칭찬까지', fx: { stress: -14, CHA: 6, selfEsteem: 4 }, photo: { emoji: '🎃', title: '할로윈 사탕왕', caption: '동네에서 사탕을 제일 많이 모았다!', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_CHUSEOK', emoji: '🌕', title: '추석 송편 빚기', months: [9], yearly: true, minAge: 8, maxAge: 19,
    sky: ['#1f2a55', '#d98b4a'], deco: ['🌕', '🍂', '🏮'],
    intro: ['할머니 댁에 온 가족이 모였다.', '할머니: "송편을 예쁘게 빚으면 예쁜 짝을 만난단다~"'],
    steps: [
      { kind: 'timing', prompt: '반죽이 동그랗게 될 때 꾹!', icon: '🥟', rounds: 3, speed: 1.1, zone: 22, hitText: '예쁘다!', missText: '삐뚤...' },
    ],
    results: [
      { title: '못난이 송편', text: '터진 송편에 다들 깔깔. {name}: "맛은 똑같잖아!"', fx: { affection: 4, stress: -5 } },
      { title: '반달 송편', text: '할머니: "우리 {name} 손재주 좋네~" 용돈도 살짝', fx: { affection: 5, ART: 3, gold: 50 } },
      { title: '송편 장인', text: '할머니가 감탄! "이건 팔아도 되겠다" 온 가족 사진 찰칵', fx: { affection: 7, ART: 5, gold: 100 }, photo: { emoji: '🌕', title: '추석', caption: '할머니 댁에서 송편 빚기', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_SEOLLAL', emoji: '🧧', title: '설날 세뱃돈', months: [1, 2], yearly: true, minAge: 8, maxAge: 19,
    sky: ['#7a1f2b', '#e8b04a'], deco: ['🧧', '🎍', '🪁'],
    intro: ['곱게 한복을 입고 세배를 했다.', '친척 어른들이 봉투 세 개를 내밀었다. "하나만 골라 보렴~"'],
    steps: [
      { kind: 'pick', prompt: '봉투 하나를 골라요', hidden: true, options: [{ emoji: '💴', label: '1만 원', fx: { gold: 100 } }, { emoji: '💵', label: '3만 원', fx: { gold: 300 } }, { emoji: '💰', label: '5만 원', fx: { gold: 500 } }] },
      { kind: 'pick', prompt: '세뱃돈은 어떻게 할까?', options: [{ emoji: '🐷', label: '엄마가 저금해 줄게' }, { emoji: '✋', label: '반은 네가 써' }, { emoji: '🛍️', label: '전부 네 마음대로' }] },
    ],
    results: [
      { title: '통장에 쏙', text: '{p0}! 저금했다. {name}: "...내 돈인데 ㅠ" (나중에 고마워할 거야)', fx: { gold: 0, MOR: 3, autonomy: -3, affection: -2 } },
      { title: '반반 약속', text: '{p0}! 반은 저금, 반으로 {name}이(가) 고른 책과 간식', fx: { MOR: 2, INT: 2, autonomy: 2 } },
      { title: '내 맘대로', text: '{p0}! 하루 만에 다 썼다. {name}: "돈이 이렇게 빨리 없어지는구나..."', fx: { autonomy: 5, stress: -6, MOR: -1 } },
    ],
  },
  {
    id: 'SP_FIRST_SNOW', emoji: '⛄️', title: '첫눈 오는 날', months: [12, 1], minAge: 8, maxAge: 14,
    sky: ['#9fb6d8', '#eef4ff'], deco: ['❄️', '❄️', '☁️'],
    intro: ['아침에 일어나니 온 세상이 하얗다!', '{name}: "눈사람 만들자!! 빨리빨리!"'],
    steps: [
      { kind: 'build', prompt: '눈사람을 꾸며 주세요', slots: [
        { label: '모자', options: [{ emoji: '🎩', label: '신사 모자' }, { emoji: '🧢', label: '야구 모자' }, { emoji: '👑', label: '왕관' }] },
        { label: '코', options: [{ emoji: '🥕', label: '당근' }, { emoji: '🍒', label: '체리' }, { emoji: '🌰', label: '밤' }] },
        { label: '목도리', options: [{ emoji: '🧣', label: '빨간 목도리' }, { emoji: '🎀', label: '리본' }, { emoji: '🌼', label: '꽃 장식' }] },
      ] },
      { kind: 'catch', prompt: '혀로 눈송이 받아먹기! (날름)', items: ['❄️', '❄️', '🌨️'], seconds: 7, goal: 11, motion: 'float' },
    ],
    results: [
      { title: '꽁꽁 언 손', text: '{p0}{p1}{p2} 눈사람 완성! 손이 시려서 금방 들어왔다', fx: { stress: -8, affection: 3 }, photo: { emoji: '⛄️', title: '첫눈', caption: '처음 만든 눈사람', pose: 'stand' } },
      { title: '눈사람 친구', text: '{p0}{p1}{p2} 눈사람 옆에서 눈싸움까지! 볼이 빨개졌다', fx: { stress: -12, affection: 4, STR: 2 }, photo: { emoji: '⛄️', title: '첫눈', caption: '눈사람이랑 찰칵', pose: 'cheer' } },
      { title: '동네 명물 눈사람', text: '{p0}{p1}{p2} 눈사람이 너무 귀여워 지나가던 사람들이 사진을 찍었다!', fx: { stress: -15, affection: 5, ART: 3, fame: 2 }, photo: { emoji: '⛄️', title: '동네 명물 눈사람', caption: '모두가 사진을 찍어 간 눈사람', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_BLACKOUT', emoji: '🕯️', title: '장마철 정전', months: [7], minAge: 8, maxAge: 11,
    sky: ['#0d0f1e', '#3b2c1a'], deco: ['🌧️', '⚡', '🕯️'],
    intro: ['우르르 쾅! 번개와 함께 불이 꺼졌다.', '{name}: "엄마 아빠... 무서워..." 촛불을 켰다.'],
    steps: [
      { kind: 'pick', prompt: '촛불 아래, 무슨 이야기를 해 줄까?', options: [{ emoji: '👻', label: '오싹한 귀신 이야기' }, { emoji: '🐰', label: '손 그림자 토끼 놀이' }, { emoji: '📷', label: '엄마 아빠 어릴 적 이야기' }] },
    ],
    results: [
      { title: '오싹오싹', text: '{name}: "꺄악!! ...또 해 줘!" 이불 속에 숨어서 끝까지 들었다', fx: { stress: -4, affection: 4, INT: 2 } },
      { title: '그림자 동물원', text: '벽에 토끼, 강아지, 독수리가! {name}도 따라 만들며 깔깔', fx: { stress: -8, ART: 3, affection: 4 } },
      { title: '그때 그 시절', text: '{name}: "엄마 아빠도 혼났었어?ㅋㅋ" 처음 듣는 얘기에 눈이 반짝', fx: { affection: 8, MOR: 2 }, photo: { emoji: '🕯️', title: '정전된 밤', caption: '촛불 아래 옛날이야기', pose: 'stand' } },
    ],
  },
  {
    id: 'SP_SHOOTING_STAR', emoji: '🌠', title: '별똥별 쏟아지는 밤', months: [8], minAge: 8, maxAge: 19,
    sky: ['#070a24', '#28306a'], deco: ['✨', '⭐', '🌌'],
    intro: ['오늘 밤 유성우가 쏟아진대!', '돗자리를 펴고 옥상에 누웠다. {name}: "보인다! 저기!"'],
    steps: [
      { kind: 'catch', prompt: '별똥별이 지나가는 순간 톡!', items: ['🌠', '⭐', '💫'], seconds: 8, goal: 7, motion: 'streak' },
      { kind: 'pick', prompt: '{name}의 소원은?', options: [{ emoji: '🏆', label: '꿈을 꼭 이루게 해 주세요' }, { emoji: '👨‍👩‍👧', label: '우리 가족 오래오래 건강하게' }, { emoji: '🍕', label: '내일 피자 먹게 해 주세요' }] },
    ],
    results: [
      { title: '꿈을 향한 소원', text: '별똥별 {score}개! {name}이(가) 두 손을 모았다. "꼭 이룰 거야"', fx: { selfEsteem: 5, INT: 2, ART: 2 }, photo: { emoji: '🌠', title: '유성우', caption: '별똥별에 빈 소원', pose: 'stand' } },
      { title: '가족을 위한 소원', text: '별똥별 {score}개! "우리 가족 건강하게..." 가슴이 뭉클해졌다', fx: { affection: 8, MOR: 3 }, photo: { emoji: '🌠', title: '유성우', caption: '가족을 위해 빈 소원', pose: 'stand' } },
      { title: '피자 소원', text: '별똥별 {score}개! 다음 날 진짜 피자를 시켜 줬다. "소원 이루어졌다!!"', fx: { stress: -10, affection: 4, gold: -30 } },
    ],
  },
  {
    id: 'SP_TOOTH', emoji: '🦷', title: '흔들리던 이가 쏙!', minAge: 8, maxAge: 9,
    sky: ['#ffd9c2', '#fff3de'], deco: ['🦷', '🏠', '🐦'],
    intro: ['{name}: "이가 빠졌어!!" 손바닥 위에 작은 이 하나.', '"까치야 까치야, 헌 이 줄게 새 이 다오~" 지붕 위로 던져 볼까?'],
    steps: [
      { kind: 'timing', prompt: '지붕 끝에 닿을 힘으로 휙!', icon: '🦷', rounds: 1, speed: 1.4, zone: 20, hitText: '지붕 위에 쏙!', missText: '앗, 마당에 떨어졌다' },
    ],
    results: [
      { title: '다시 던지기', text: '몇 번을 다시 던져서 겨우 성공. {name}: "까치가 꼭 가져가야 해!"', fx: { stress: -3, affection: 3 } },
      { title: '까치야 부탁해', text: '지붕 위에 쏙! {name}이(가) 이 빠진 얼굴로 활짝 웃었다', fx: { stress: -5, affection: 4, selfEsteem: 2 }, photo: { emoji: '🦷', title: '이 빠진 날', caption: '앞니 빠진 웃음', pose: 'cheer' } },
      { title: '한 번에 성공', text: '단번에 지붕 위로! {name}: "나 이제 형님(언니)이야!"', fx: { stress: -6, affection: 5, selfEsteem: 4 }, photo: { emoji: '🦷', title: '이 빠진 날', caption: '앞니 빠진 웃음', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_FRIEND_VISIT', emoji: '🧒', title: '친구가 놀러 왔어요', minAge: 8, maxAge: 15, weight: 1.3,
    sky: ['#ffe7b8', '#ffd2d2'], deco: ['🎈', '🎮', '🧸'],
    intro: ['띵동~ {name}의 반 친구들이 놀러 왔다!', '{name}이(가) 귓속말한다. "간식 뭐 줄 거야? 멋진 걸로!"'],
    steps: [
      { kind: 'pick', prompt: '간식을 골라 주세요', options: [{ emoji: '🍕', label: '피자 배달', fx: { gold: -60 } }, { emoji: '🧇', label: '직접 구운 와플' }, { emoji: '🍎', label: '깎은 과일' }] },
    ],
    results: [
      { title: '피자 파티', text: '친구들: "우와 피자다!!" {name}의 어깨가 하늘까지 올라갔다', fx: { CHA: 5, selfEsteem: 4, stress: -6 } },
      { title: '와플 카페', text: '친구들이 "너네 엄마 아빠 요리사야?" {name}이(가) 뿌듯해한다', fx: { CHA: 4, affection: 5, stress: -5 } },
      { title: '건강 간식', text: '친구들은 조금 시무룩... 그래도 보드게임으로 신나게 놀았다', fx: { CHA: 3, STR: 1, stress: -4 } },
    ],
  },
  {
    id: 'SP_PICNIC', emoji: '🌸', title: '벚꽃 가족사진', months: [4], minAge: 8, maxAge: 16,
    sky: ['#ffd6e7', '#e6f7ff'], deco: ['🌸', '🌸', '🦋'],
    intro: ['벚꽃이 활짝 핀 공원으로 소풍을 갔다.', '"자, 가족사진 찍자! 다들 웃어~ 하나, 둘..."'],
    steps: [
      { kind: 'timing', prompt: '모두 웃는 순간 셔터 찰칵!', icon: '📸', rounds: 3, speed: 1.25, zone: 18, hitText: '활짝!', missText: '눈 감았다' },
    ],
    results: [
      { title: '눈 감은 사진', text: '전부 눈을 감았다ㅋㅋ {name}: "이게 더 웃겨! 이거 걸어 놓자"', fx: { affection: 5, stress: -6 }, photo: { emoji: '🌸', title: '벚꽃 소풍', caption: '다 같이 눈 감은 가족사진ㅋㅋ', pose: 'stand' } },
      { title: '봄날의 가족사진', text: '벚꽃 아래 모두 웃는 사진 한 장. 휴대폰 배경 화면이 됐다', fx: { affection: 6, stress: -8 }, photo: { emoji: '🌸', title: '벚꽃 소풍', caption: '벚꽃 아래 가족사진', pose: 'cheer' } },
      { title: '인생 사진', text: '꽃잎이 흩날리는 순간까지 완벽! 액자로 만들어 거실에 걸었다', fx: { affection: 8, stress: -10, ART: 2 }, photo: { emoji: '🌸', title: '인생 가족사진', caption: '꽃잎 흩날리는 완벽한 한 장', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_FIREFLY', emoji: '🏕️', title: '여름밤 캠핑', months: [6], minAge: 8, maxAge: 14,
    need: notPoor,
    sky: ['#0f2a24', '#2f5a3a'], deco: ['🌲', '🏕️', '🌙'],
    intro: ['계곡 옆에 텐트를 쳤다. 모닥불 타닥타닥.', '{name}: "저기 반짝이는 거 뭐야?" 반딧불이다!'],
    steps: [
      { kind: 'catch', prompt: '반딧불이를 살짝 잡아 보기 (모기는 안 돼!)', items: ['✨', '🪲'], bad: ['🦟'], seconds: 8, goal: 10, motion: 'float' },
    ],
    results: [
      { title: '모기 물린 밤', text: '반딧불이 {score}마리... 모기에 잔뜩 물렸지만 별은 예뻤다', fx: { stress: -6, STR: 2, affection: 3 } },
      { title: '반짝반짝 유리병', text: '반딧불이 {score}마리! 한참 보다가 다시 숲으로 날려 보냈다', fx: { stress: -9, INT: 2, MOR: 2, affection: 4 }, photo: { emoji: '🏕️', title: '여름 캠핑', caption: '반딧불이 가득한 밤', pose: 'stand' } },
      { title: '숲속 탐험가', text: '반딧불이 {score}마리! {name}: "나 곤충 박사 될래!"', fx: { stress: -12, INT: 4, STR: 2, affection: 4 }, photo: { emoji: '🏕️', title: '여름 캠핑', caption: '반딧불이 박사 탄생', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_STRAY_DOG', emoji: '🐶', title: '길 잃은 강아지', minAge: 8, maxAge: 16,
    sky: ['#cfe3c4', '#f6efd9'], deco: ['🐾', '🍂', '🏡'],
    intro: ['{name}이(가) 헐레벌떡 들어왔다. 품에 꼬질꼬질한 강아지 한 마리!', '{name}: "놀이터에 혼자 떨고 있었어... 어떡해?"'],
    steps: [
      { kind: 'pick', prompt: '어떻게 할까요?', options: [{ emoji: '📋', label: '같이 전단지 만들어 주인 찾기' }, { emoji: '🚓', label: '근처 지구대에 데려다주기' }, { emoji: '🏠', label: '주인 찾을 때까지 우리가 돌보기', fx: { gold: -50 } }] },
    ],
    results: [
      { title: '주인을 찾았다!', text: '전단지를 본 할머니가 눈물을 글썽이며 찾아왔다. {name}: "다행이다..."', fx: { MOR: 6, CHA: 3, INT: 2 }, photo: { emoji: '🐶', title: '강아지 주인 찾기', caption: '전단지 덕분에 집으로', pose: 'cheer' } },
      { title: '경찰관 아저씨', text: '경찰관 아저씨가 "꼬마 영웅이네!" 하며 경례를 해 줬다', fx: { MOR: 4, selfEsteem: 4 } },
      { title: '일주일 동생', text: '일주일 동안 밥 주고 산책시키다 주인을 만났다. 헤어질 땐 펑펑 울었다', fx: { MOR: 5, affection: 6, stress: 4 }, photo: { emoji: '🐶', title: '일주일 동생', caption: '잠깐 함께한 강아지', pose: 'stand' } },
    ],
  },
  {
    id: 'SP_FLEA_MARKET', emoji: '🏷️', title: '동네 벼룩시장', months: [5, 10], minAge: 10, maxAge: 16,
    sky: ['#fff1c9', '#c9f0e0'], deco: ['🏷️', '🧺', '☀️'],
    intro: ['주말 공원에 벼룩시장이 열렸다.', '{name}이(가) 안 쓰는 장난감과 책을 모아 돗자리를 폈다.'],
    steps: [
      { kind: 'pick', prompt: '가격을 어떻게 붙일까?', options: [{ emoji: '🪙', label: '싸게 많이 팔기' }, { emoji: '⚖️', label: '적당한 가격 + 흥정' }, { emoji: '💎', label: '비싸게! 귀한 물건이야' }] },
    ],
    results: [
      { title: '완판!', text: '30분 만에 다 팔렸다! {name}: "사람들이 좋아하니까 기분 좋다"', fx: { gold: 120, CHA: 4, MOR: 2 } },
      { title: '흥정의 달인', text: '"500원만 깎아 주세요~" "그럼 이것도 같이 사세요!" 장사꾼 기질 발견', fx: { gold: 220, CHA: 3, INT: 3 }, photo: { emoji: '🏷️', title: '벼룩시장', caption: '꼬마 사장님 첫 장사', pose: 'cheer' } },
      { title: '하나도 안 팔림', text: '아무도 안 샀다... {name}: "가격이 너무 비쌌나 봐" 다음엔 잘할 거야', fx: { gold: 30, INT: 2, stress: 3 } },
    ],
  },
  {
    id: 'SP_TICKETING', emoji: '🎫', title: '콘서트 티켓팅 대작전', minAge: 13, maxAge: 19, weight: 1.3,
    need: (s) => notPoor(s) && s.gold >= 300,
    sky: ['#2a1a4a', '#d14d8b'], deco: ['🎤', '💜', '🎶'],
    intro: ['{name}: "제발 도와줘!! 오늘 8시 정각에 티켓 열려!"', '7시 59분 58초... 새로고침 손가락에 땀이 난다.'],
    steps: [
      { kind: 'timing', prompt: '좌석이 뜨는 순간 광클!', icon: '👆', rounds: 3, speed: 1.9, zone: 16, hitText: '잡았다!', missText: '이미 선택된 좌석입니다' },
    ],
    results: [
      { title: '광탈...', text: '대기 번호 38,201번... {name}: "괜찮아, 다음에 또 하면 되지 ㅠㅠ" 같이 치킨 먹으며 위로', fx: { affection: 4, stress: 2 } },
      { title: '2층 구석 자리', text: '2층 맨 끝이라도 성공! {name}: "엄마 아빠 최고!!" 꽉 안아 줬다', fx: { affection: 7, stress: -10, ART: 2, gold: -100 } },
      { title: '1열 성공!!!', text: '무대 바로 앞 1열!! {name}이(가) 소리를 질렀다. 평생 자랑할 거래', fx: { affection: 10, stress: -15, ART: 3, gold: -150 }, photo: { emoji: '🎫', title: '콘서트 1열', caption: '엄마 아빠가 잡아 준 전설의 1열', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_RAMEN', emoji: '🍜', title: '한밤의 야식 라면', minAge: 13, maxAge: 19,
    sky: ['#14182e', '#5a3a2a'], deco: ['🌙', '♨️', '🍳'],
    intro: ['밤 11시, 부엌에서 달그락 소리.', '{name}: "...배고파서. 같이 라면 먹을래?"'],
    steps: [
      { kind: 'timing', prompt: '면이 꼬들꼬들할 때 불 끄기!', icon: '🍜', rounds: 2, speed: 1.3, zone: 20, hitText: '꼬들꼬들!', missText: '퉁퉁 불었다' },
    ],
    results: [
      { title: '불어 터진 라면', text: '면이 퉁퉁 불었지만 둘이 웃으며 먹었다. {name}: "요즘... 사실 좀 힘들어"', fx: { affection: 6, stress: -6 } },
      { title: '꿀맛 라면', text: '후루룩! {name}이(가) 학교 얘기, 친구 얘기를 술술 꺼냈다', fx: { affection: 8, stress: -8, CHA: 2 } },
      { title: '인생 라면', text: '계란까지 완벽! {name}: "이 맛 평생 못 잊을 듯" 새벽까지 수다', fx: { affection: 10, stress: -10 }, photo: { emoji: '🍜', title: '한밤의 라면', caption: '둘이서 끓인 인생 라면', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_GIMBAP', emoji: '🍙', title: '같이 김밥 말기', minAge: 8, maxAge: 19,
    sky: ['#fff0c4', '#ffd7a8'], deco: ['🥕', '🥚', '🍚'],
    intro: ['주말 아침, 김밥 재료를 조금 사 왔다.', '{name}: "오늘은 내가 김밥 말아 볼래! 알려 줘!"'],
    steps: [
      { kind: 'timing', prompt: '김발을 꾹! 단단하게 말기', icon: '🍙', rounds: 3, speed: 1.15, zone: 22, hitText: '단단!', missText: '옆구리 터짐' },
    ],
    results: [
      { title: '옆구리 터진 김밥', text: '다 터졌지만 꽁다리가 제일 맛있대. {name}: "다음엔 진짜 잘할 거야!"', fx: { affection: 5, stress: -5 } },
      { title: '도시락 김밥', text: '제법 동그란 김밥! {name}이(가) 친구 몫까지 싸 갔다', fx: { affection: 5, TEC: 2, CHA: 2, stress: -5 } },
      { title: '김밥 천국', text: '썰어 놓으니 가게 김밥 같다! {name}: "나 요리 소질 있나 봐"', fx: { affection: 6, TEC: 3, selfEsteem: 3, stress: -6 }, photo: { emoji: '🍙', title: '김밥 말기', caption: '처음으로 혼자 만 김밥', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_MOVIE_NIGHT', emoji: '🍿', title: '거실 영화관', minAge: 8, maxAge: 19,
    need: notPoor,
    sky: ['#1a1530', '#3d2a5c'], deco: ['🍿', '🎬', '🛋️'],
    intro: ['금요일 밤, 거실 불을 끄고 이불을 깔았다.', '{name}: "오늘 영화는 내가 고를래! 아니 같이 골라!"'],
    steps: [
      { kind: 'pick', prompt: '무슨 영화를 볼까?', options: [{ emoji: '🦁', label: '눈물 쏙 애니메이션' }, { emoji: '🧟', label: '으스스 공포 영화' }, { emoji: '🚀', label: '우주 다큐멘터리' }] },
    ],
    results: [
      { title: '같이 펑펑', text: '마지막 장면에서 셋 다 울었다. {name}: "엄마 아빠도 울었지? 봤어!"', fx: { affection: 7, ART: 2, stress: -6 } },
      { title: '이불 속 비명', text: '{name}이(가) 이불을 뒤집어쓰고도 끝까지 봤다. 그날 밤은 같이 잤다', fx: { affection: 6, stress: -4, STR: 1 } },
      { title: '꼬마 천문학자', text: '{name}: "블랙홀에 빠지면 어떻게 돼?" 질문이 끝도 없이 쏟아졌다', fx: { affection: 4, INT: 4, stress: -4 } },
    ],
  },
  {
    id: 'SP_CLEANUP', emoji: '🧹', title: '대청소 날', minAge: 8, maxAge: 16,
    sky: ['#d8f0ff', '#fff8e0'], deco: ['🫧', '🧽', '🪣'],
    intro: ['오늘은 온 가족 대청소의 날!', '{name}의 침대 밑에서 온갖 물건이 쏟아져 나온다...'],
    steps: [
      { kind: 'catch', prompt: '물건을 상자에 쏙! (바퀴벌레는 으악)', items: ['🧦', '📚', '🧸', '✏️', '🧩'], bad: ['🪳'], seconds: 8, goal: 13, motion: 'fall' },
    ],
    results: [
      { title: '아직도 어질', text: '{score}개 정리... {name}: "나머지는 내일 할게ㅎㅎ"', fx: { MOR: 2, stress: -2 } },
      { title: '반짝반짝', text: '{score}개 정리! 잃어버린 줄 알았던 장난감도 찾았다', fx: { MOR: 3, affection: 4, stress: -5 } },
      { title: '정리왕', text: '{score}개 정리! 방이 새것 같다. {name}: "앞으로 깨끗하게 쓸게!"', fx: { MOR: 5, affection: 4, stress: -6, autonomy: 2 } },
    ],
  },
  {
    id: 'SP_KITE', emoji: '🪁', title: '연날리기', months: [1, 2, 3], minAge: 8, maxAge: 13,
    sky: ['#8fd0ff', '#e8f7ff'], deco: ['☁️', '🕊️', '☁️'],
    intro: ['바람이 시원한 강둑.', '{name}: "내 연이 제일 높이 날 거야!"'],
    steps: [
      { kind: 'timing', prompt: '바람이 불 때 실을 휙 당기기!', icon: '🪁', rounds: 3, speed: 1.2, zone: 22, hitText: '쑥 올라간다!', missText: '빙글빙글...' },
    ],
    results: [
      { title: '나무에 걸린 연', text: '연이 나무에 걸렸다ㅠ 아빠가 겨우 꺼내 줬다. 그래도 웃음꽃', fx: { STR: 2, affection: 4, stress: -5 } },
      { title: '하늘 높이', text: '연이 구름까지 닿을 듯! {name}: "보여? 내 연이야!"', fx: { STR: 3, affection: 4, stress: -8 } },
      { title: '강둑 최고의 연', text: '제일 높이 난 연! 옆집 아이들이 다 몰려와 구경했다', fx: { STR: 4, CHA: 2, selfEsteem: 3, stress: -9 }, photo: { emoji: '🪁', title: '연날리기', caption: '하늘 높이 난 내 연', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_PHOTO_BOOTH', emoji: '📸', title: '같이 네 컷 사진', minAge: 13, maxAge: 19,
    sky: ['#ffd1e8', '#d9d2ff'], deco: ['💖', '✨', '🎀'],
    intro: ['쇼핑하다 {name}이(가) 소매를 잡아끈다.', '{name}: "엄마 아빠, 네 컷 사진 찍자! 포즈 잘해야 돼!"'],
    steps: [
      { kind: 'timing', prompt: '찰칵 순간에 포즈!', icon: '🤳', rounds: 4, speed: 1.5, zone: 20, hitText: '포즈 성공', missText: '눈 감음ㅋㅋ' },
    ],
    results: [
      { title: '흑역사 네 컷', text: '전부 이상하게 나왔다ㅋㅋ {name}: "이건 평생 놀릴 거야"', fx: { affection: 6, stress: -6 }, photo: { emoji: '📸', title: '네 컷 사진', caption: '전부 이상하게 나온 네 컷ㅋㅋ', pose: 'cheer' } },
      { title: '귀여운 네 컷', text: '{name}이(가) 사진을 폰 케이스에 꽂았다', fx: { affection: 7, stress: -7 }, photo: { emoji: '📸', title: '네 컷 사진', caption: '폰 케이스에 꽂은 네 컷', pose: 'cheer' } },
      { title: '레전드 네 컷', text: '완벽한 네 컷! {name}이(가) 프로필 사진으로 바꿨다', fx: { affection: 9, stress: -8, CHA: 2 }, photo: { emoji: '📸', title: '레전드 네 컷', caption: '프로필 사진이 된 네 컷', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_DRIVE', emoji: '🚗', title: '빈 주차장 운전 연습', minAge: 19, maxAge: 19,
    need: notPoor,
    sky: ['#ffcf9e', '#7aa0d8'], deco: ['🅿️', '🚧', '🌇'],
    intro: ['{name}: "운전 좀 가르쳐 줘! 딱 한 번만!"', '일요일 저녁, 텅 빈 마트 주차장. 조수석에서 손잡이를 꽉 잡았다.'],
    steps: [
      { kind: 'timing', prompt: '선 안에 딱 맞춰 브레이크!', icon: '🚗', rounds: 3, speed: 1.0, zone: 20, hitText: '주차 성공', missText: '끼익!!' },
    ],
    results: [
      { title: '심장이 덜컥', text: '연석에 쿵! 둘 다 소리를 질렀다. {name}: "...다음 주에 한 번만 더"', fx: { affection: 5, stress: 2, TEC: 1 } },
      { title: '제법인데?', text: '삐뚤빼뚤해도 주차 성공! {name}: "나 운전 체질인가 봐"', fx: { affection: 6, TEC: 3, autonomy: 3 } },
      { title: '베스트 드라이버', text: '한 번에 일렬 주차! {name}: "이제 내가 태워 줄게"... 언제 이렇게 컸지', fx: { affection: 8, TEC: 4, autonomy: 4, selfEsteem: 3 }, photo: { emoji: '🚗', title: '첫 운전 연습', caption: '조수석에서 본 다 큰 아이', pose: 'cheer' } },
    ],
  },
  {
    id: 'SP_SECRET_VISIT', emoji: '🥐', title: '아이의 알바 가게', minAge: 17, maxAge: 19,
    need: (s) => (s.actionCounts.JOB_02 ?? 0) >= 2,
    sky: ['#f3dcc2', '#b98b62'], deco: ['☕', '🧁', '🔔'],
    intro: ['{name}이(가) 주말마다 동네 베이커리에서 일한다고 했다.', '몰래 한번 가 볼까?'],
    steps: [
      { kind: 'pick', prompt: '어떻게 할까요?', options: [{ emoji: '🕶️', label: '선글라스 끼고 몰래 손님인 척' }, { emoji: '💐', label: '꽃 들고 당당하게 응원 방문' }, { emoji: '🏠', label: '가지 말고 집에서 믿고 기다리기' }] },
    ],
    results: [
      { title: '바로 들킴', text: '{name}: "...엄마 아빠 맞지? 다 보여ㅋㅋ" 그래도 갓 구운 빵을 서비스로 줬다', fx: { affection: 6, stress: -4 } },
      { title: '창피해!', text: '{name}의 얼굴이 빨개졌다. "아 진짜..." 그날 밤 "근데 고마워"라는 문자', fx: { affection: 7, CHA: 2, selfEsteem: 3 } },
      { title: '믿어 주는 마음', text: '그날 저녁 {name}이(가) 먼저 말했다. "오늘 손님 엄청 많았는데 나 잘했어!"', fx: { affection: 5, autonomy: 5, selfEsteem: 2 } },
    ],
  },
];

export const SPECIAL_MAP: Record<string, SpecialDay> = Object.fromEntries(SPECIAL_DAYS.map((d) => [d.id, d]));
