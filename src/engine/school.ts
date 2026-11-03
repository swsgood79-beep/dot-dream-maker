import type { StatKey } from '../types/game';
import type { Effect, ParentStyle } from '../data/parentingData';
import { applyEffect } from './parenting';
import { addPhoto, type SaveState } from './simulation';

/** 성적표가 나오는 달: 7월(1학기), 2월(학년 마무리) */
export const REPORT_MONTHS = [7, 2];

export function schoolOf(age: number) {
  if (age >= 17) return { label: '고등학교', grade: age - 16, kind: 'HIGH' as const };
  if (age >= 14) return { label: '중학교', grade: age - 13, kind: 'MIDDLE' as const };
  return { label: '초등학교', grade: age - 7, kind: 'ELEM' as const };
}

const SUBJECTS: { name: (kind: 'ELEM' | 'MIDDLE' | 'HIGH') => string; stats: StatKey[] }[] = [
  { name: () => '국어', stats: ['INT', 'ART'] },
  { name: () => '수학', stats: ['INT', 'TEC'] },
  { name: () => '영어', stats: ['INT', 'CHA'] },
  { name: (k) => (k === 'ELEM' ? '즐거운 생활' : '체육'), stats: ['STR'] },
  { name: (k) => (k === 'ELEM' ? '음악·미술' : '예술'), stats: ['ART'] },
  { name: (k) => (k === 'ELEM' ? '바른 생활' : '도덕'), stats: ['MOR'] },
];

/** 나이에 맞는 기대 수준 대비 비율 → 등급 */
function gradeLabel(kind: 'ELEM' | 'MIDDLE' | 'HIGH', r: number) {
  if (kind === 'HIGH') return `${Math.max(1, Math.min(9, Math.round(9 - (r - 0.3) * 7)))}등급`;
  const idx = r >= 1.15 ? 0 : r >= 0.9 ? 1 : r >= 0.65 ? 2 : r >= 0.4 ? 3 : 4;
  return (kind === 'ELEM' ? ['수', '우', '미', '양', '가'] : ['A', 'B', 'C', 'D', 'E'])[idx];
}

const TOP_COMMENT: Record<StatKey, string> = {
  INT: '수업 시간에 질문이 많고 이해가 무척 빠릅니다.',
  STR: '체육 시간이면 늘 앞장서는 활기찬 학생입니다.',
  ART: '그림과 노래에 남다른 감각이 있습니다.',
  CHA: '친구들 사이에서 인기가 많고 반 분위기를 밝게 만듭니다.',
  MOR: '궂은일을 먼저 나서서 하는 바른 학생입니다.',
  TEC: '만들기 시간마다 손재주로 친구들을 놀라게 합니다.',
};

const TEMPER_COMMENT = {
  SHY: '발표할 때 목소리가 작지만, 공책 정리는 반에서 가장 꼼꼼합니다.',
  ACTIVE: '쉬는 시간마다 운동장을 가장 먼저 뛰어나갑니다.',
  STUBBORN: '한번 하겠다고 한 일은 끝까지 해내는 끈기가 있습니다.',
  SENSITIVE: '친구의 기분을 누구보다 먼저 알아채는 따뜻한 아이입니다.',
  EASYGOING: '어떤 일에도 서두르지 않는 여유가 있습니다. 다만 숙제는 조금 서둘러 주세요.',
};

export interface ReportCard {
  school: string;
  term: string;
  subjects: { name: string; grade: string; ratio: number }[];
  avg: number;
  comments: string[];
}

export function computeReport(s: SaveState): ReportCard {
  // 2월 성적표는 지난 학년 마무리
  const age = s.month === 2 ? s.age - 1 : s.age;
  const sc = schoolOf(age);
  const expected = 60 + (age - 8) * 55;
  const subjects = SUBJECTS.map((sub) => {
    const v = sub.stats.reduce((a, k) => a + s.stats[k], 0) / sub.stats.length;
    const ratio = v / expected;
    return { name: sub.name(sc.kind), grade: gradeLabel(sc.kind, ratio), ratio };
  });
  const avg = subjects.reduce((a, x) => a + x.ratio, 0) / subjects.length;
  const top = (Object.keys(TOP_COMMENT) as StatKey[]).reduce((a, b) => (s.stats[b] > s.stats[a] ? b : a));
  const comments = [TOP_COMMENT[top]];
  if (s.temperament) comments.push(TEMPER_COMMENT[s.temperament]);
  if (s.status.delinquency >= 30) comments.push('다만 최근 수업 태도가 흐트러져 가정에서의 관심이 필요합니다.');
  else if (s.status.stress >= 60) comments.push('요즘 많이 지쳐 보여 조금 걱정됩니다.');
  else if (s.friend && !s.flags.includes('FRIEND_AWAY') && age <= 16) comments.push('단짝 친구와 늘 붙어 다니며 서로 잘 챙겨 줍니다.');
  return {
    school: `${sc.label} ${sc.grade}학년`,
    term: s.month === 7 ? '1학기' : '학년 말',
    subjects,
    avg,
    comments,
  };
}

/** 성적표를 본 부모의 반응 */
export const REPORT_REACTIONS: { label: string; style: ParentStyle }[] = [
  { label: '👏 "고생했어, 수고 많았어!"', style: 'WARM' },
  { label: '📏 "다음엔 더 잘할 수 있어. 계획을 세워 보자"', style: 'STRICT' },
  { label: '🕊️ "성적보다 네가 즐거운 게 중요해"', style: 'FREE' },
];

export function reportReaction(avg: number, style: ParentStyle): { fx: Effect; reply: string } {
  const good = avg >= 1.0;
  const bad = avg < 0.7;
  if (style === 'WARM')
    return good
      ? { fx: { affection: 6, stress: -6, CHA: 3 }, reply: '헤헤, 다음에도 칭찬받을 거야!' }
      : { fx: { affection: 5, stress: -8 }, reply: bad ? '...혼날 줄 알았는데. 고마워. 다음엔 진짜 노력할게.' : '응! 다음 학기엔 더 잘해 볼게.' };
  if (style === 'STRICT')
    return good
      ? { fx: { INT: 8, MOR: 3, stress: 4 }, reply: '알았어. 더 높이 가 볼게.' }
      : { fx: { INT: 10, stress: bad ? 12 : 7, affection: bad ? -5 : -1 }, reply: bad ? '...(고개 숙임) 알겠어요.' : '계획표 짜 볼게.' };
  return good
    ? { fx: { stress: -8, ART: 3, affection: 3 }, reply: '공부도 재밌어서 하는 거야~' }
    : { fx: { stress: -10, affection: 4, MOR: -2 }, reply: bad ? '진짜? 휴... (근데 진짜 괜찮은 건가?)' : '응! 즐겁게 할게!' };
}

export function resolveReport(s: SaveState, style: ParentStyle) {
  const card = computeReport(s);
  const r = reportReaction(card.avg, style);
  const delta = applyEffect(s, r.fx);
  s.parenting = { WARM: 0, STRICT: 0, FREE: 0, ...s.parenting };
  s.parenting[style] += 1;
  s.pendingReport = false;
  if (card.avg >= 1.15)
    addPhoto(s, { emoji: '📜', title: `${card.school} ${card.term} 우수 성적표`, caption: card.comments[0], pose: 'cheer' });
  return { reply: r.reply, delta };
}
