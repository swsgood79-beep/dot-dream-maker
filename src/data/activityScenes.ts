import type { WeekResult } from '../engine/simulation';

/** 스케줄 진행 연출: 장소 장면 · 효과 · 한 줄 대사 */
export interface ActivityScene {
  place: string;
  /** 하늘(벽) → 바닥 색 */
  sky: [string, string];
  floor: string;
  /** 배경 소품: [이모지, 왼쪽 %, 아래 %, 크기 px] */
  props: [string, number, number, number][];
  /** 칠판·화면 같은 글씨 판 */
  board?: { text: string; bg: string; color: string };
  /** 아이 주변에 떠오르는 효과 */
  fx: string[];
  pose: string;
  lines: { GREAT: string; SUCCESS: string; FAIL: string };
  dark?: boolean;
}

const S = (s: ActivityScene) => s;

export const SCENES: Record<string, ActivityScene> = {
  // ── 학원
  EDU_01: S({
    place: '종합 보습학원', sky: ['#e9f2e4', '#d8e6cf'], floor: '#b98048',
    props: [['🪑', 12, 6, 26], ['🪑', 82, 6, 26], ['🕰️', 86, 70, 22]],
    board: { text: '2x + 3 = 11\nx = ?', bg: '#2f5d3a', color: '#fff' },
    fx: ['✏️', '📝', '💯'], pose: 'desk',
    lines: { GREAT: '선생님이 "오늘 최고!" 도장을 쾅 찍어 주셨다!', SUCCESS: '칠판 가득한 문제를 하나씩 풀었다.', FAIL: '꾸벅꾸벅... 수업 시간에 졸고 말았다.' },
  }),
  EDU_02: S({
    place: '영재 과학·의학 학원', sky: ['#eaf6ff', '#d4ecfa'], floor: '#9fb7c9',
    props: [['🔬', 14, 8, 30], ['🧪', 80, 8, 26], ['🧬', 84, 62, 24], ['⚗️', 22, 60, 22]],
    fx: ['🫧', '🧪', '✨'], pose: 'desk',
    lines: { GREAT: '실험 대성공! 현미경 속 세포가 반짝였다.', SUCCESS: '실험 보고서를 꼼꼼히 정리했다.', FAIL: '비커를 쏟아 버렸다... 으악.' },
  }),
  EDU_03: S({
    place: '로스쿨 준비 논술반', sky: ['#f5efe2', '#e8dcc4'], floor: '#8a5a35',
    props: [['⚖️', 14, 60, 30], ['📜', 82, 8, 26], ['📚', 14, 6, 26]],
    board: { text: '주장 → 근거 → 결론', bg: '#fffaf0', color: '#1b1f3b' },
    fx: ['✍️', '💬', '📜'], pose: 'desk',
    lines: { GREAT: '토론 대회에서 반박 한 방으로 모두를 압도했다!', SUCCESS: '논리적인 글을 한 편 완성했다.', FAIL: '할 말이 생각나지 않아 백지만 바라봤다.' },
  }),
  EDU_04: S({
    place: '코딩·게임 제작 부트캠프', sky: ['#1b1f3b', '#2b2f5c'], floor: '#3a3f6b', dark: true,
    props: [['🖥️', 14, 8, 30], ['🖥️', 82, 8, 30], ['🎮', 84, 62, 22]],
    board: { text: "print('Hello!')\n>> Hello!", bg: '#0d1117', color: '#5bff8a' },
    fx: ['0', '1', '💾', '🐛'], pose: 'pc',
    lines: { GREAT: '처음 만든 게임이 한 번에 실행됐다!', SUCCESS: '버그를 세 개나 잡았다.', FAIL: '에러 메시지가 끝도 없이 쏟아졌다...' },
  }),
  EDU_05: S({
    place: '실용음악·댄스 아카데미', sky: ['#3a2a5c', '#6b3fa0'], floor: '#4a2e70', dark: true,
    props: [['🎹', 14, 8, 32], ['🎤', 84, 10, 26], ['💡', 50, 78, 26]],
    fx: ['🎵', '🎶', '✨', '💃'], pose: 'music',
    lines: { GREAT: '선생님이 "데뷔해도 되겠다!"며 박수를 쳤다!', SUCCESS: '새 안무를 끝까지 외웠다.', FAIL: '박자를 계속 놓쳤다... 다리가 꼬였다.' },
  }),
  EDU_06: S({
    place: '미술·웹툰 창작 화실', sky: ['#fff3e6', '#ffe6cc'], floor: '#c9a27a',
    props: [['🖼️', 14, 62, 30], ['🎨', 84, 8, 28], ['🖌️', 14, 8, 24]],
    fx: ['🎨', '🖌️', '🌈'], pose: 'draw',
    lines: { GREAT: '그린 그림이 화실 벽에 걸렸다!', SUCCESS: '스케치북 한 권을 거의 다 채웠다.', FAIL: '물감이 번져서 그림을 망쳐 버렸다.' },
  }),
  EDU_07: S({
    place: '유소년 체육·무술 도장', sky: ['#fff6e0', '#f0e2c0'], floor: '#4f9a45',
    props: [['🥋', 14, 62, 30], ['🏅', 84, 64, 24], ['🥊', 84, 8, 26]],
    fx: ['💥', '💪', '💦'], pose: 'exercise',
    lines: { GREAT: '얍! 송판 세 장을 한 번에 격파했다!', SUCCESS: '땀을 뻘뻘 흘리며 품새를 연습했다.', FAIL: '헉헉... 준비 운동만 하고 지쳐 버렸다.' },
  }),
  EDU_08: S({
    place: '어린이 경제·리더십 스쿨', sky: ['#eef3ff', '#dfe7fb'], floor: '#7a8bb5',
    props: [['📊', 14, 62, 30], ['💼', 84, 8, 26], ['🪙', 84, 64, 22]],
    board: { text: '사업 계획서\n1. 아이디어 💡', bg: '#fffaf0', color: '#1b1f3b' },
    fx: ['💡', '📈', '🤝'], pose: 'desk',
    lines: { GREAT: '모의 창업 대회에서 1등을 했다!', SUCCESS: '조장으로 팀원들을 이끌었다.', FAIL: '발표하다가 말을 더듬었다...' },
  }),
  // ── 아르바이트
  JOB_01: S({
    place: '우리 집 대청소', sky: ['#fff8ee', '#f3e6d0'], floor: '#c79a62',
    props: [['🧺', 14, 6, 28], ['🧽', 84, 6, 22], ['🪣', 84, 60, 22]],
    fx: ['✨', '🫧', '🧹'], pose: 'work',
    lines: { GREAT: '집이 반짝반짝! 용돈을 두 배로 받았다!', SUCCESS: '설거지랑 빨래 개기를 도왔다.', FAIL: '접시를 하나 깨 버렸다... 쨍그랑.' },
  }),
  JOB_02: S({
    place: '동네 베이커리', sky: ['#fff1dc', '#ffe1b8'], floor: '#b07a4a',
    props: [['🥐', 14, 62, 26], ['🍞', 84, 62, 26], ['🧁', 14, 8, 24], ['🎂', 84, 8, 28]],
    fx: ['♨️', '🥖', '✨'], pose: 'work',
    lines: { GREAT: '내가 만든 빵이 오전에 다 팔렸다!', SUCCESS: '밀가루 범벅이 되며 반죽을 도왔다.', FAIL: '빵을 태워 버렸다... 사장님 미안해요.' },
  }),
  JOB_03: S({
    place: '도서관', sky: ['#f4efe4', '#e6dcc6'], floor: '#8a5a35',
    props: [['📚', 10, 8, 32], ['📚', 86, 8, 32], ['🪴', 86, 64, 22]],
    fx: ['📖', '🔖', '💭'], pose: 'read',
    lines: { GREAT: '책 정리를 하다 인생 책을 만났다!', SUCCESS: '반납된 책을 제자리에 꽂았다.', FAIL: '책장을 무너뜨려 정리를 처음부터 다시 했다.' },
  }),
  JOB_04: S({
    place: '동물병원', sky: ['#eafaf3', '#d3f2e4'], floor: '#9cc9b3',
    props: [['🐶', 14, 8, 28], ['🐱', 84, 8, 26], ['💊', 84, 64, 20], ['🩹', 14, 64, 20]],
    fx: ['❤️', '🐾', '✨'], pose: 'work',
    lines: { GREAT: '아픈 강아지가 꼬리를 흔들며 나았다!', SUCCESS: '케이지를 청소하고 밥을 챙겨 줬다.', FAIL: '고양이에게 할퀴어 버렸다... 아야.' },
  }),
  JOB_05: S({
    place: '인디게임 회사', sky: ['#20243f', '#33386a'], floor: '#3a3f6b', dark: true,
    props: [['🎮', 14, 8, 28], ['🖥️', 84, 8, 30], ['☕', 84, 62, 20]],
    board: { text: 'BUG #127\n점프하면 벽을 뚫음', bg: '#0d1117', color: '#ffcc4d' },
    fx: ['🐞', '🎮', '✅'], pose: 'pc',
    lines: { GREAT: '치명적인 버그를 찾아 보너스를 받았다!', SUCCESS: '게임을 백 번 넘게 테스트했다.', FAIL: '게임만 하다 보고서를 못 썼다...' },
  }),
  JOB_06: S({
    place: '저녁 거리 버스킹', sky: ['#1b1f3b', '#5a3a7a'], floor: '#555a77', dark: true,
    props: [['🌃', 14, 62, 30], ['🎸', 84, 8, 28], ['🎩', 84, 4, 18], ['🪙', 78, 4, 14]],
    fx: ['🎵', '🪙', '👏'], pose: 'music',
    lines: { GREAT: '사람들이 몰려들어 앙코르를 외쳤다!', SUCCESS: '지나가던 사람들이 동전을 넣어 줬다.', FAIL: '목이 쉬어서 노래가 나오지 않았다...' },
  }),
  JOB_07: S({
    place: '법률사무소', sky: ['#f2f0ea', '#e2ded2'], floor: '#6b5a4a',
    props: [['🗂️', 14, 8, 28], ['⚖️', 84, 62, 28], ['📑', 84, 8, 24]],
    fx: ['📄', '🖇️', '✍️'], pose: 'work',
    lines: { GREAT: '변호사님이 "법조인 재목이네"라고 했다!', SUCCESS: '산더미 같은 서류를 정리했다.', FAIL: '서류 순서를 뒤죽박죽으로 섞어 버렸다.' },
  }),
  JOB_08: S({
    place: '밤거리 심부름', sky: ['#0e1024', '#26203a'], floor: '#2a2a3a', dark: true,
    props: [['🌃', 14, 62, 32], ['📦', 84, 8, 26], ['🚧', 14, 6, 22]],
    fx: ['💸', '🌙', '👀'], pose: 'work',
    lines: { GREAT: '수상한 상자를 무사히 배달했다. 돈은 두둑하다.', SUCCESS: '밤늦게까지 골목을 뛰어다녔다.', FAIL: '경찰 아저씨와 눈이 마주쳤다... 도망쳤다.' },
  }),
  // ── 휴식 · 외출
  REST_01: S({
    place: '방에서 뒹굴뒹굴', sky: ['#fff6ea', '#f1e2c8'], floor: '#c79a62',
    props: [['🛏️', 14, 6, 30], ['📺', 84, 8, 26]],
    fx: ['💤', '☁️', '🍪'], pose: 'read',
    lines: { GREAT: '푹 쉬었더니 몸이 가볍다!', SUCCESS: '하루 종일 뒹굴뒹굴했다.', FAIL: '쉬어도 쉬어도 피곤하다...' },
  }),
  REST_02: S({
    place: '가족 캠핑', sky: ['#141838', '#2e3a6a'], floor: '#2f6b4a', dark: true,
    props: [['⛺', 14, 6, 36], ['🔥', 80, 6, 28], ['🌲', 90, 40, 30], ['🌙', 84, 78, 24]],
    fx: ['✨', '🌟', '🍢'], pose: 'cheer',
    lines: { GREAT: '별똥별을 보며 다 같이 소원을 빌었다!', SUCCESS: '모닥불에 마시멜로를 구워 먹었다.', FAIL: '비가 와서 텐트 안에만 있었다...' },
  }),
  OUT_SHOP: S({
    place: '백화점', sky: ['#fff0f6', '#ffd9ea'], floor: '#e8c9d8',
    props: [['👗', 14, 8, 28], ['👟', 84, 8, 24], ['🛍️', 84, 62, 26], ['🪞', 14, 60, 24]],
    fx: ['🛍️', '✨', '💖'], pose: 'cheer',
    lines: { GREAT: '딱 마음에 드는 옷을 세일가에 샀다!', SUCCESS: '이것저것 구경하며 즐거운 시간을 보냈다.', FAIL: '사람이 너무 많아서 지쳐 버렸다.' },
  }),
  OUT_BOOK: S({
    place: '동네 서점', sky: ['#f6efe0', '#e9dcc0'], floor: '#8a5a35',
    props: [['📚', 10, 8, 32], ['📕', 86, 8, 26], ['☕', 86, 60, 20]],
    fx: ['📖', '💭', '✨'], pose: 'read',
    lines: { GREAT: '구석에서 신기한 책을 발견했다!', SUCCESS: '좋아하는 작가의 신간을 읽었다.', FAIL: '고르다 고르다 아무것도 못 샀다.' },
  }),
  OUT_SCI: S({
    place: '과학관', sky: ['#14193a', '#2a3a7a'], floor: '#3a4a7a', dark: true,
    props: [['🦖', 12, 6, 38], ['🪐', 84, 70, 30], ['🔭', 84, 6, 26], ['🚀', 30, 68, 22]],
    fx: ['⭐', '🪐', '✨'], pose: 'cheer',
    lines: { GREAT: '천체 투영관에서 별자리를 전부 맞혔다!', SUCCESS: '공룡 화석 앞에서 한참을 서 있었다.', FAIL: '견학 내내 길을 잃고 헤맸다...' },
  }),
  OUT_ARCADE: S({
    place: '오락실', sky: ['#1a0f2e', '#3a1f5c'], floor: '#2a1a40', dark: true,
    props: [['🕹️', 14, 8, 30], ['👾', 84, 8, 28], ['🎰', 84, 62, 22]],
    board: { text: 'HIGH SCORE\n999,999', bg: '#000', color: '#ff5bd6' },
    fx: ['⭐', '👾', '💥'], pose: 'cheer',
    lines: { GREAT: '오락실 최고 기록을 갈아 치웠다!', SUCCESS: '용돈으로 신나게 게임을 했다.', FAIL: '동전만 다 쓰고 1판도 못 깼다...' },
  }),
  OUT_RUINS: S({
    place: '고대 유적', sky: ['#ffe2b8', '#f2c48a'], floor: '#b98a4a',
    props: [['🗿', 12, 6, 38], ['🏛️', 84, 6, 34], ['🌵', 30, 4, 22], ['☀️', 84, 78, 24]],
    fx: ['💎', '🗺️', '✨'], pose: 'exercise',
    lines: { GREAT: '벽화 뒤에서 숨겨진 통로를 찾았다!', SUCCESS: '흙먼지를 뒤집어쓰며 유적을 탐험했다.', FAIL: '뙤약볕에 지쳐 금방 돌아왔다.' },
  }),
  OUT_ALLEY: S({
    place: '뒷골목', sky: ['#121222', '#2a2236'], floor: '#2a2a33', dark: true,
    props: [['🧱', 12, 6, 32], ['🗑️', 84, 6, 26], ['🌙', 84, 78, 22]],
    fx: ['💨', '😎', '🌙'], pose: 'stand',
    lines: { GREAT: '골목 형들이 "너 좀 하는데?"라고 했다.', SUCCESS: '친구들과 밤늦게까지 어슬렁거렸다.', FAIL: '무서운 형들을 만나 도망쳤다...' },
  }),
};

/** 가출 중인 주 */
export const RUNAWAY_SCENE: ActivityScene = {
  place: '집을 나간 아이', sky: ['#1b1f2e', '#33384a'], floor: '#2a2d3a', dark: true,
  props: [['🌧️', 14, 76, 26], ['🌧️', 70, 80, 22], ['🚏', 84, 6, 30]],
  fx: ['💧', '💧', '😢'], pose: 'tired',
  lines: { GREAT: '...', SUCCESS: '어디서 무얼 하고 있을까. 집이 텅 빈 것 같다.', FAIL: '어디서 무얼 하고 있을까. 집이 텅 빈 것 같다.' },
};

export function sceneFor(w: WeekResult): ActivityScene | null {
  if (w.outcome === 'RUNAWAY') return RUNAWAY_SCENE;
  return SCENES[w.actionId] ?? null;
}

/** 이번 주 한 줄 (요양 중이면 따로) */
export function sceneLine(w: WeekResult): string {
  if (w.outcome === 'SICK') return '아파서 침대에 누워 있었다. 얼른 나아야지...';
  if (w.outcome === 'NO_GOLD') return '돈이 모자라서 집에서 쉬었다.';
  if (w.outcome === 'STRIKE') return '"학원 진짜 싫어!!" 가방을 던지고 침대에 누워 버렸다...';
  const sc = sceneFor(w);
  if (!sc) return '';
  return w.outcome === 'GREAT' ? sc.lines.GREAT : w.outcome === 'FAIL' ? sc.lines.FAIL : sc.lines.SUCCESS;
}
