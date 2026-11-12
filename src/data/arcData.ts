import { hasBatchim, josa } from './josa';
import type { SaveState } from '../engine/simulation';
import type { ParentingEvent, ParentStyle } from './parentingData';
import { ENDINGS, ENDING_MAP } from './endingData';
import type { StatKey } from '../types/game';

/**
 * 연속 이야기: 몇 달 간격으로 이어지는 육아 상황.
 * 앞 단계에서 어떻게 대응했는지에 따라 다음 단계 문장과 결말이 달라진다.
 */
const arcStyles = (s: SaveState, id: string): ParentStyle[] => s.arcs?.[id]?.styles ?? [];
const lastStyle = (s: SaveState, id: string) => arcStyles(s, id).slice(-1)[0];
const count = (s: SaveState, id: string, st: ParentStyle) => arcStyles(s, id).filter((x) => x === st).length;
/** 가장 많이 고른 대응 (동점이면 마지막 선택) */
export function arcMajor(s: SaveState, id: string): ParentStyle {
  const order: ParentStyle[] = ['WARM', 'STRICT', 'FREE'];
  const best = Math.max(...order.map((o) => count(s, id, o)));
  const tied = order.filter((o) => count(s, id, o) === best);
  return tied.length === 1 ? tied[0] : (lastStyle(s, id) ?? 'WARM');
}

/* ───────── 꿈의 직업: 아이 스탯과 가장 잘 맞는 A·S 엔딩 ───────── */
export function dreamFor(s: SaveState): string {
  let best = 'END_34';
  let bestScore = -1;
  for (const e of ENDINGS) {
    if (e.category === 'HIDDEN' || e.category === 'DARK' || e.tier === 'C' || e.tier === 'B') continue;
    const req = Object.entries(e.minStats) as [StatKey, number][];
    if (!req.length) continue;
    const fit = req.reduce((a, [k, v]) => a + Math.min(1.2, s.stats[k] / v), 0) / req.length;
    if (fit > bestScore) {
      bestScore = fit;
      best = e.id;
    }
  }
  return best;
}
const dreamTitle = (s: SaveState) => ENDING_MAP[s.dreamJob ?? dreamFor(s)].title.replace(/ \(.*\)$/, '');

export const ARC_EVENTS: ParentingEvent[] = [
  /* ───────── 사춘기 반항기 (4단계) ───────── */
  {
    id: 'A_REBEL_1', emoji: '😠', title: '반항기 ① 말대꾸', minAge: 13, maxAge: 14, weight: 4,
    arc: { id: 'REBEL', step: 1, gap: 2 },
    text: '요즘 {name이} 사사건건 말대꾸를 해요. "엄마 아빠는 맨날 잔소리만 해!"',
    choices: [
      { label: '잔소리를 줄이고 이야기를 들어 준다', style: 'WARM', fx: { affection: 4, stress: -5 }, reply: '...진짜? 그럼 나도 좀 덜 짜증 낼게.' },
      { label: '말버릇부터 고치라고 단호하게 말한다', style: 'STRICT', fx: { MOR: 6, affection: -5, stress: 5 }, reply: '봐, 또 잔소리잖아!' },
      { label: '그 나이엔 그럴 수 있다며 넘긴다', style: 'FREE', fx: { stress: -3, delinquency: 2 }, reply: '(흥) ...' },
    ],
  },
  {
    id: 'A_REBEL_2', emoji: '🌃', title: '반항기 ② 늦은 귀가', minAge: 13, maxAge: 16,
    arc: { id: 'REBEL', step: 2, gap: 2 },
    text: (s) =>
      ({
        WARM: '요즘 {name이} 조금 늦게 들어와요. 그래도 "늦어요 미안" 문자는 꼬박꼬박 보내요.',
        STRICT: '{name이} 통금을 어기고 밤 11시에 들어왔어요. 전화도 받지 않았어요.',
        FREE: '{name이} 어디서 누구랑 뭘 하는지 도통 말을 안 해요. 오늘도 늦었어요.',
        PROTECT: '{name이} 늦게 들어오면서 투덜대요. "엄마 아빠가 자꾸 데리러 오니까 애들이 놀려!"',
      })[lastStyle(s, 'REBEL') ?? 'FREE'],
    choices: [
      { label: '현관에서 기다렸다가 "밥은 먹었어?" 묻는다', style: 'WARM', fx: { affection: 5, delinquency: -2 }, reply: '...응. 기다리지 말라니까. (작게) 고마워.' },
      { label: '한 달 동안 외출 금지', style: 'STRICT', fx: { delinquency: -5, affection: -8, stress: 8 }, reply: '감옥이야, 여기?!' },
      { label: '어디 있었는지만 알려 달라고 한다', style: 'FREE', fx: { delinquency: 2, stress: -4, affection: 2 }, reply: '...친구네. 됐지?' },
    ],
  },
  {
    id: 'A_REBEL_3', emoji: '🎒', title: '반항기 ③ 싸 놓은 가방', minAge: 13, maxAge: 17,
    arc: { id: 'REBEL', step: 3, gap: 2 },
    text: (s) =>
      count(s, 'REBEL', 'STRICT') >= 2
        ? '{name}의 방에서 가방 싸는 소리가 나요. "나 이 집 나갈 거야! 진짜야!"'
        : count(s, 'REBEL', 'WARM') >= 2
          ? '{name이} 가방을 메고 현관에 섰다가... 다시 내려놓았어요. "...나 요즘 왜 이러지."'
          : '{name이} 가방을 싸 들고 나가려 해요. "며칠 친구네서 지낼래."',
    choices: [
      { label: '문 앞을 막지 않고, 언제든 돌아오라고 말한다', style: 'WARM', fx: { affection: 6, stress: -8 }, reply: '(한참 서 있다가) ...안 나갈래. 배고파.' },
      { label: '"나가려면 나가!" 하고 소리친다', style: 'STRICT', fx: { affection: -10, delinquency: 6, stress: 12 }, reply: '(문 쾅)' },
      { label: '친구 부모님께 연락해 두고 보내 준다', style: 'FREE', fx: { delinquency: 3, stress: -10, affection: 2 }, reply: '(이틀 뒤) ...다녀왔어.' },
    ],
  },
  {
    id: 'A_REBEL_4', emoji: '🌤️', title: '반항기 ④ 그리고...', minAge: 13, maxAge: 18, weight: 2,
    arc: { id: 'REBEL', step: 4, final: true },
    text: (s) =>
      ({
        WARM: '책상 위에 쪽지가 있어요. "그동안 미안했어. 끝까지 기다려 줘서 고마워. 이제 좀 어른이 된 것 같아."',
        STRICT: '폭풍 같던 시간이 지나갔어요. 방문은 다시 열렸지만, {name}의 말수는 조금 줄었어요.',
        FREE: '{name이} 스스로 마음을 정리하고 돌아왔어요. "나 혼자 생각할 시간이 필요했어."',
        PROTECT: '폭풍은 지나갔지만, {name}은(는) 여전히 무슨 일이든 엄마 아빠에게 먼저 물어봐요.',
      })[arcMajor(s, 'REBEL')],
    choices: [
      { label: '꼭 안아 준다', style: 'WARM', fx: { affection: 10, stress: -10 }, reply: '...아 진짜, 숨 막혀. (안 놓음)' },
      { label: '앞으로의 약속을 함께 정한다', style: 'STRICT', fx: { MOR: 10, affection: 4 }, reply: '통금 10시, 대신 용돈 인상. 거래 성사!' },
      { label: '아무 말 없이 좋아하는 음식을 해 준다', style: 'FREE', fx: { affection: 8, stress: -8, CHA: 4 }, reply: '(허겁지겁) ...역시 집밥이 최고야.' },
    ],
    onResolve: (s) => {
      const major = arcMajor(s, 'REBEL');
      s.memories = [...(s.memories ?? []), `ARC_REBEL:${major}`];
      if (major === 'WARM') s.status.affection = Math.min(100, s.status.affection + 8);
      if (major === 'STRICT') s.stats.MOR = Math.min(999, s.stats.MOR + 15);
      if (major === 'FREE') s.stats.CHA = Math.min(999, s.stats.CHA + 10);
    },
  },

  /* ───────── 첫사랑 (3단계) ───────── */
  {
    id: 'A_LOVE_1', emoji: '💗', title: '첫사랑 ① 혼자 웃는 아이', minAge: 15, maxAge: 16, weight: 4,
    arc: { id: 'LOVE', step: 1, gap: 2 },
    text: '요즘 {name이} 휴대폰을 보며 혼자 웃어요. 물어보니 얼굴이 빨개져요. "...좋아하는 사람 생겼어."',
    choices: [
      { label: '"어떤 사람이야?" 신나게 들어 준다', style: 'WARM', fx: { affection: 6, CHA: 5 }, reply: '웃을 때 보조개가 있어. 아 몰라! 부끄러워!' },
      { label: '지금은 공부할 때라고 한다', style: 'STRICT', fx: { INT: 6, affection: -5, stress: 5 }, reply: '...그럴 줄 알았어. 말하지 말걸.' },
      { label: '모른 척 "그래?" 하고 넘어간다', style: 'FREE', fx: { stress: -4, CHA: 3 }, reply: '(휴, 안 캐물어서 다행이다)' },
    ],
  },
  {
    id: 'A_LOVE_2', emoji: '💌', title: '첫사랑 ② 고백할까 말까', minAge: 15, maxAge: 17,
    arc: { id: 'LOVE', step: 2, gap: 2 },
    text: '"고백할까 말까... 차이면 어떡하지? 내일 학교 어떻게 가?" {name이} 밤새 뒤척여요.',
    choices: [
      { label: '용기를 북돋아 준다', style: 'WARM', fx: { CHA: 5, affection: 4 }, reply: '...해 볼게. 내일 꼭!' },
      { label: '수능 끝나고 하라고 말린다', style: 'STRICT', fx: { INT: 6, stress: 4 }, reply: '...알았어. 참을게.' },
      { label: '네 마음 가는 대로 하라고 한다', style: 'FREE', fx: { stress: -3 }, reply: '음... 일단 자고 생각할래.' },
    ],
    onResolve: (s, style) => {
      const arc = s.arcs!.LOVE;
      if (style === 'STRICT') arc.result = 'WAIT';
      else {
        const chance = 0.3 + s.stats.CHA / 1500 + (style === 'WARM' ? 0.15 : 0);
        arc.result = Math.random() < chance ? 'YES' : 'NO';
      }
    },
  },
  {
    id: 'A_LOVE_3Y', emoji: '💑', title: '첫사랑 ③ "사귀기로 했어!"', minAge: 15, maxAge: 18,
    arc: { id: 'LOVE', step: 3, variant: 'YES', final: true },
    text: '{name이} 현관문을 열자마자 소리쳐요. "엄마 아빠!! 걔도 나 좋대!!!"',
    choices: [
      { label: '같이 방방 뛰며 축하한다', style: 'WARM', fx: { affection: 8, CHA: 8, stress: -10 }, reply: '첫 데이트는 어디 가지? 같이 고민해 줘!' },
      { label: '축하하지만 성적은 지키자고 약속한다', style: 'STRICT', fx: { CHA: 5, INT: 4, MOR: 4 }, reply: '약속! 같이 도서관 다닐 거야.' },
      { label: '"잘됐네~" 하고 쿨하게 웃어 준다', style: 'FREE', fx: { CHA: 6, stress: -8 }, reply: '헤헤. 엄마 아빠 연애 얘기도 해 줘!' },
    ],
    onResolve: (s) => void (s.memories = [...(s.memories ?? []), 'ARC_LOVE:YES']),
  },
  {
    id: 'A_LOVE_3N', emoji: '💔', title: '첫사랑 ③ 첫 실연', minAge: 15, maxAge: 18,
    arc: { id: 'LOVE', step: 3, variant: 'NO', final: true },
    text: '{name이} 이불 속에서 나오지 않아요. "...차였어. 친구로 지내재."',
    choices: [
      { label: '아무 말 없이 곁에 앉아 등을 토닥인다', style: 'WARM', fx: { affection: 10, stress: -12 }, reply: '(훌쩍) ...조금만 이렇게 있어 줘.' },
      { label: '"더 좋은 사람 만날 거야" 하고 공부에 집중하게 한다', style: 'STRICT', fx: { INT: 8, stress: 4, affection: -2 }, reply: '...그래. 공부나 할래.' },
      { label: '떡볶이 먹으러 나가자고 한다', style: 'FREE', fx: { stress: -14, affection: 6 }, reply: '매운 거 먹으니까 눈물이 나는 거야. 진짜야.' },
    ],
    onResolve: (s) => void (s.memories = [...(s.memories ?? []), 'ARC_LOVE:NO']),
  },
  {
    id: 'A_LOVE_3W', emoji: '⏳', title: '첫사랑 ③ 마음속에 접어 둔 편지', minAge: 15, maxAge: 18,
    arc: { id: 'LOVE', step: 3, variant: 'WAIT', final: true },
    text: '{name}의 책상 서랍에 전하지 못한 편지가 있어요. "수능 끝나면... 그때 줄 거야."',
    choices: [
      { label: '"그때 꼭 전해" 하고 응원한다', style: 'WARM', fx: { affection: 5, MOR: 4 }, reply: '응. 그때까지 멋있어져 있을 거야.' },
      { label: '잘 참았다고 칭찬한다', style: 'STRICT', fx: { MOR: 8, INT: 4 }, reply: '...그래도 좀 아쉽긴 해.' },
      { label: '참는 게 다는 아니라고 말해 준다', style: 'FREE', fx: { CHA: 6, stress: -5 }, reply: '...그럼 지금 줘 볼까? 아냐, 아냐!' },
    ],
    onResolve: (s) => void (s.memories = [...(s.memories ?? []), 'ARC_LOVE:WAIT']),
  },

  /* ───────── 꿈과 진로 (2단계) ───────── */
  {
    id: 'A_DREAM_1', emoji: '🌟', title: '진로 상담 날', minAge: 17, maxAge: 17, months: [4, 5, 6, 7, 8, 9], weight: 6,
    arc: { id: 'DREAM', step: 1, gap: 2 },
    text: (s) => `진로 상담을 다녀온 {name이} 진지하게 말해요. "나... ${josa(dreamTitle(s), '이', '가')} 되고 싶어."`,
    choices: [
      { label: '"멋지다! 엄마 아빠가 응원할게"', style: 'WARM', fx: { affection: 8, stress: -10 }, reply: '진짜? ...꼭 될게. 지켜봐!' },
      { label: '"더 안정적인 길도 생각해 보자"', style: 'STRICT', fx: { affection: -8, stress: 10 }, reply: '...또 그 소리. 내 꿈은 내가 정해.' },
      { label: '"네가 정한 거면 믿어"', style: 'FREE', fx: { MOR: 5, stress: -5, affection: 3 }, reply: '고마워. 계획 세워서 보여 줄게.' },
    ],
    onResolve: (s, style) => {
      s.dreamJob = dreamFor(s);
      s.arcs!.DREAM.result = style === 'STRICT' ? 'CLASH' : 'OK';
    },
  },
  {
    id: 'A_DREAM_2C', emoji: '🚪', title: '꿈 앞의 갈등', minAge: 17, maxAge: 19,
    arc: { id: 'DREAM', step: 2, variant: 'CLASH', final: true },
    text: (s) => `{name이} 방에 틀어박혔어요. 문 너머로 작은 목소리가 들려요. "${dreamTitle(s)}... 그게 그렇게 이상해?"`,
    choices: [
      { label: '문을 두드리고 "미안해, 응원할게"', style: 'WARM', fx: { affection: 12, stress: -12 }, reply: '(문이 열림) ...진짜지? 고마워.' },
      { label: '현실적인 이유를 차근차근 설명한다', style: 'STRICT', fx: { INT: 8, affection: -6, stress: 6 }, reply: '...알아. 그래도 해 보고 싶어.' },
      { label: '그 직업을 가진 사람을 만나게 해 준다', style: 'FREE', fx: { MOR: 6, CHA: 6, stress: -6, affection: 4 }, reply: '직접 들어 보니까 더 하고 싶어졌어!' },
    ],
  },
  {
    id: 'A_DREAM_2O', emoji: '📋', title: '꿈을 향한 계획표', minAge: 17, maxAge: 19,
    arc: { id: 'DREAM', step: 2, variant: 'OK', final: true },
    text: (s) => `{name이} 벽에 커다란 계획표를 붙였어요. 맨 위에는 '${dreamTitle(s)}'${hasBatchim(dreamTitle(s)) ? '이라고' : '라고'} 적혀 있어요.`,
    choices: [
      { label: '계획표 옆에 응원 쪽지를 붙인다', style: 'WARM', fx: { affection: 8, stress: -6 }, reply: '이거 보고 매일 힘낼게!' },
      { label: '계획을 같이 점검해 준다', style: 'STRICT', fx: { INT: 6, MOR: 4 }, reply: '오, 이 부분 빠졌었네. 고마워.' },
      { label: '"멋지네" 하고 지켜본다', style: 'FREE', fx: { MOR: 4, stress: -4 }, reply: '두고 봐. 다 해낼 거야.' },
    ],
  },
];

export const DREAM_HINT = (s: SaveState) => (s.dreamJob ? ENDING_MAP[s.dreamJob] : null);
