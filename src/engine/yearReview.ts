import type { ParentStyle } from '../data/parentingData';
import type { CharacterStats, StatKey } from '../types/game';
import { eqOf } from './emotion';
import { applyEffect } from './parenting';
import { addPhoto, type SaveState } from './simulation';
import { defianceOf, trustOf } from './negotiate';

/**
 * 🪞 연말 성장 거울 (v0.42) — 해가 바뀌면 지난 1년 동안 부모의 선택이 아이에게 남긴 것을 보여 준다.
 * 연초에 찍어 둔 기록(yearStart)과 지금을 비교. 그리고 아이와 함께 새해 목표를 하나 정한다.
 */
export interface YearStart {
  age: number;
  stats: CharacterStats;
  parenting: Record<ParentStyle, number>;
  counts: Record<string, number>; // actionCounts 일부
  emo: number; // emoLog 길이
  burst: number;
  trust: number;
  defiance: number;
  eq: number;
  affection: number;
  selfEsteem: number;
  autonomy: number;
  rel: number; // 동네 인연 합
  wins: number;
}

const relSum = (s: SaveState) => Object.values(s.people ?? {}).reduce((a, p) => a + (p?.rel ?? 0), 0);
const winSum = (s: SaveState) => Object.entries(s.actionCounts).filter(([k]) => k.startsWith('WIN_')).reduce((a, [, v]) => a + v, 0);

export function snapshotYear(s: SaveState) {
  s.yearStart = {
    age: s.age,
    stats: { ...s.stats },
    parenting: { WARM: 0, STRICT: 0, FREE: 0, PROTECT: 0, ...s.parenting },
    counts: { STRIKE: s.actionCounts.STRIKE ?? 0, REST_01: s.actionCounts.REST_01 ?? 0 },
    emo: (s.emoLog ?? []).length,
    burst: s.burstCount,
    trust: trustOf(s),
    defiance: defianceOf(s),
    eq: eqOf(s),
    affection: s.status.affection,
    selfEsteem: s.status.selfEsteem ?? 50,
    autonomy: s.status.autonomy ?? 50,
    rel: relSum(s),
    wins: winSum(s),
  };
}

export interface Mirror {
  icon: string;
  did: string; // 부모가 한 것
  left: string; // 아이에게 남은 것
  tip: string; // 실제 육아에서는
  good: boolean;
}

const STAT_AWARD: Record<StatKey, string> = {
  INT: '🧠 꼬마 박사상', STR: '💪 튼튼 체력상', ART: '🎨 반짝 감성상', CHA: '🌟 인기 만점상', MOR: '🕊️ 바른 마음상', TEC: '🔧 척척 손재주상',
};
const STAT_KO: Record<StatKey, string> = { INT: '지력', STR: '체력', ART: '감성', CHA: '매력', MOR: '도덕', TEC: '기술' };

export interface YearReview {
  age: number; // 지난 해 나이
  statDelta: Record<StatKey, number>;
  award: string;
  mirrors: Mirror[];
  goal?: { title: string; done: boolean };
  comment: string;
}

export function buildReview(s: SaveState): YearReview {
  const y = s.yearStart!;
  const statDelta = Object.fromEntries((Object.keys(s.stats) as StatKey[]).map((k) => [k, s.stats[k] - y.stats[k]])) as Record<StatKey, number>;
  const best = (Object.keys(statDelta) as StatKey[]).sort((a, b) => statDelta[b] - statDelta[a])[0];
  const par = { WARM: 0, STRICT: 0, FREE: 0, PROTECT: 0, ...s.parenting };
  const dp = (Object.keys(par) as ParentStyle[]).map((k) => [k, par[k] - (y.parenting[k] ?? 0)] as const);
  const totalP = dp.reduce((a, [, v]) => a + v, 0);
  const topP = [...dp].sort((a, b) => b[1] - a[1])[0];
  const emoNew = (s.emoLog ?? []).slice(y.emo);
  const emoGood = emoNew.reduce((a, e) => a + e.good, 0);
  const emoTot = emoNew.reduce((a, e) => a + e.total, 0);
  const dEq = eqOf(s) - y.eq;
  const dSelf = (s.status.selfEsteem ?? 50) - y.selfEsteem;
  const dAuto = (s.status.autonomy ?? 50) - y.autonomy;
  const dTrust = trustOf(s) - y.trust;
  const strikes = (s.actionCounts.STRIKE ?? 0) - (y.counts.STRIKE ?? 0);
  const rests = (s.actionCounts.REST_01 ?? 0) - (y.counts.REST_01 ?? 0);
  const bursts = s.burstCount - y.burst;
  const dRel = relSum(s) - y.rel;
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  /** 변화가 있을 때만 ' (자존감 +3)' 처럼 붙임 */
  const chg = (label: string, n: number) => (n ? ` (${label} ${sign(n)})` : '');

  const m: (Mirror & { w: number })[] = [];
  if (emoTot >= 3) {
    const r = emoGood / emoTot;
    if (r >= 0.65)
      m.push({ w: 10, good: true, icon: '💗', did: `아이가 울거나 화낼 때 마음을 먼저 알아줬어요 (감정 코칭 ${emoGood}/${emoTot})`, left: `감정을 말로 표현하는 힘이 자랐어요${chg('감정 조절력', dEq)}`, tip: '감정을 인정받은 아이는 화나 슬픔을 행동 대신 말로 풀어내는 법을 배운다고 해요.' });
    else if (r <= 0.4)
      m.push({ w: 10, good: false, icon: '🚪', did: `아이 감정을 달래기보다 멈추게 하는 쪽을 많이 골랐어요 (감정 코칭 ${emoGood}/${emoTot})`, left: `감정을 꾹 참거나 터뜨리는 일이 늘었어요${chg('감정 조절력', dEq)}`, tip: '"울지 마"는 감정을 없애지 못하고 숨기게만 해요. "속상했구나" 한마디가 먼저예요.' });
  }
  if (totalP >= 3 && topP[1] / totalP >= 0.45) {
    const k = topP[0];
    if (k === 'WARM') m.push({ w: 8, good: true, icon: '🤗', did: `고민이 생길 때마다 다정하게 들어 줬어요 (${topP[1]}번)`, left: `"내 편이 있다"는 믿음이 생겼어요${chg('자존감', dSelf)}`, tip: '따뜻하게 반응해 주는 부모 밑에서 자란 아이는 새로운 일에 도전하는 걸 덜 두려워해요.' });
    if (k === 'STRICT') m.push({ w: 8, good: dSelf >= 0, icon: '📏', did: `규칙과 책임을 강조했어요 (${topP[1]}번)`, left: dSelf >= 0 ? '스스로 지키는 힘이 생겼어요' : `눈치를 보는 일이 늘었어요${chg('자존감', dSelf)}`, tip: '규칙은 이유를 설명해 줄 때 아이 안에 남아요. 설명 없는 규칙은 "들키지 않기"를 가르쳐요.' });
    if (k === 'FREE') m.push({ w: 8, good: true, icon: '🕊️', did: `스스로 해 보게 맡겼어요 (${topP[1]}번)`, left: `스스로 정하는 힘이 자랐어요${chg('자율성', dAuto)}`, tip: '실수할 기회를 준 만큼 아이는 스스로 판단하는 법을 배워요. 다만 위험할 때는 곁에 있어 주세요.' });
    if (k === 'PROTECT') m.push({ w: 8, good: false, icon: '🛡️', did: `어려운 일을 대신 막아 주고 해결해 줬어요 (${topP[1]}번)`, left: `혼자 해결하는 힘이 약해졌어요${chg('자율성', dAuto)}`, tip: '대신 해 주면 그 순간은 편하지만, 아이는 "나는 혼자서는 못 해"를 배워요. 같이 방법을 찾는 게 좋아요.' });
  }
  if (bursts > 0 || strikes >= 2)
    m.push({ w: 9, good: false, icon: '🔥', did: `쉬는 주가 부족했어요 (방에서 휴식 ${rests}주)`, left: `지쳐서 터진 일이 있었어요 (스트레스 폭발 ${bursts}번 · 파업 ${strikes}번)`, tip: '쉬는 시간도 성장의 일부예요. 휴식이 없는 아이는 결국 공부까지 멈추게 돼요.' });
  else if (rests >= 8)
    m.push({ w: 5, good: true, icon: '🛏️', did: `꾸준히 쉬는 시간을 챙겨 줬어요 (휴식 ${rests}주)`, left: '지치지 않고 한 해를 버텼어요 (스트레스 폭발 0번)', tip: '잘 쉬는 아이가 오래 달려요.' });
  if (y.age >= 12 && Math.abs(dTrust) >= 4)
    m.push(
      dTrust > 0
        ? { w: 7, good: true, icon: '🤝', did: '아이가 원하는 걸 들어 주고, 바꿀 땐 설득했어요', left: `부모 말에 귀 기울이게 됐어요 (신뢰 ${sign(dTrust)})`, tip: '사춘기 아이는 "내가 정했다"는 느낌이 있을 때 더 열심히 해요.' }
        : { w: 9, good: false, icon: '✋', did: '아이 계획을 자주 강제로 바꿨어요', left: `부모 말을 잘 안 들으려 해요 (신뢰 ${sign(dTrust)} · 반발 ${defianceOf(s)})`, tip: '강요는 그 달의 스케줄은 바꿔도 아이의 마음은 멀어지게 해요.' },
    );
  if (dRel >= 25) m.push({ w: 4, good: true, icon: '🗺️', did: '주말마다 함께 동네를 다녔어요', left: `친구 · 이웃과의 인연이 깊어졌어요 (인연 ${sign(dRel)})`, tip: '부모 말고도 믿을 어른과 친구가 많은 아이가 더 단단하게 자라요.' });
  m.sort((a, b) => b.w - a.w);
  const mirrors = m.slice(0, 3).map(({ w: _, ...x }) => x);
  if (!mirrors.length)
    mirrors.push({ icon: '🌱', good: true, did: '평범하고 무난한 한 해를 보냈어요', left: '크게 흔들리지 않고 자랐어요', tip: '특별한 일이 없는 해도 아이에게는 소중한 한 해예요.' });

  // 새해 목표 결과
  let goal: YearReview['goal'];
  if (s.yearGoal) goal = { title: s.yearGoal.title, done: goalDone(s) };
  const aff = s.status.affection;
  const comment =
    aff >= 70 ? '올해도 엄마 아빠랑 있어서 좋았어! 내년에도 잘 부탁해!' : aff >= 45 ? '음... 나쁘지 않은 한 해였던 것 같아.' : '...그냥 그랬어.';
  return { age: y.age, statDelta, award: `${STAT_AWARD[best]} (${STAT_KO[best]} ${sign(statDelta[best])})`, mirrors, goal, comment };
}

/* ───────── 새해 목표 ───────── */
export interface YearGoal {
  id: string;
  title: string;
  emoji: string;
  stat?: StatKey;
  need: number;
}

export function goalOptions(s: SaveState): YearGoal[] {
  const ks = (Object.keys(s.stats) as StatKey[]).sort((a, b) => s.stats[b] - s.stats[a]);
  const need = s.age >= 12 ? 120 : 80;
  const out: YearGoal[] = [
    { id: `STAT_${ks[0]}`, title: `${STAT_KO[ks[0]]} ${need} 올리기 (잘하는 걸 더 잘하게)`, emoji: '📈', stat: ks[0], need },
    { id: `STAT_${ks[ks.length - 1]}`, title: `${STAT_KO[ks[ks.length - 1]]} ${Math.round(need * 0.6)} 올리기 (약한 걸 채우기)`, emoji: '🧩', stat: ks[ks.length - 1], need: Math.round(need * 0.6) },
  ];
  const third: YearGoal[] = [
    { id: 'CONTEST', title: '대회 하나라도 우승하기', emoji: '🏆', need: 1 },
    { id: 'CALM', title: '스트레스 폭발 · 파업 없이 보내기', emoji: '😌', need: 0 },
    { id: 'EQ', title: '감정 조절력 10 올리기', emoji: '💗', need: 10 },
    { id: 'FRIEND', title: '동네 인연 깊게 만들기 (인연 +30)', emoji: '🤝', need: 30 },
  ];
  out.push(third[s.age % third.length]);
  return out;
}

export function goalDone(s: SaveState): boolean {
  const g = s.yearGoal;
  const y = s.yearStart;
  if (!g || !y) return false;
  if (g.stat) return s.stats[g.stat] - y.stats[g.stat] >= g.need;
  if (g.id === 'CONTEST') return winSum(s) - y.wins >= 1;
  if (g.id === 'CALM') return s.burstCount === y.burst && (s.actionCounts.STRIKE ?? 0) === (y.counts.STRIKE ?? 0);
  if (g.id === 'EQ') return eqOf(s) - y.eq >= g.need;
  if (g.id === 'FRIEND') return relSum(s) - y.rel >= g.need;
  return false;
}

/** 목표 진행 상황 (방 화면 표시용) */
export function goalProgress(s: SaveState): string {
  const g = s.yearGoal;
  const y = s.yearStart;
  if (!g || !y) return '';
  if (g.stat) return `${Math.max(0, s.stats[g.stat] - y.stats[g.stat])}/${g.need}`;
  if (g.id === 'CONTEST') return goalDone(s) ? '달성!' : '아직';
  if (g.id === 'CALM') return goalDone(s) ? '지키는 중' : '실패';
  if (g.id === 'EQ') return `${Math.max(0, eqOf(s) - y.eq)}/${g.need}`;
  if (g.id === 'FRIEND') return `${Math.max(0, relSum(s) - y.rel)}/${g.need}`;
  return '';
}

/** 거울을 다 보고 나면: 목표 보상 → 새해 기록 시작 → 새 목표 */
export function finishYear(s: SaveState, pick: YearGoal | null) {
  if (s.yearGoal && goalDone(s)) {
    applyEffect(s, { idea: 5, selfEsteem: 5, affection: 3 });
    addPhoto(s, { emoji: s.yearGoal.emoji, title: '새해 목표 달성!', caption: s.yearGoal.title, pose: 'cheer' });
  }
  s.pendingYearReview = false;
  snapshotYear(s);
  s.yearGoal = pick ?? null;
}
