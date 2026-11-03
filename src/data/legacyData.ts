import type { EndingDefinition, Gender } from '../types/game';
import type { SaveState } from '../engine/simulation';
import { buildLetter } from './letterData';
import { relationEnding, type Relation } from '../engine/psyche';
import { PARENT_JOB_MAP } from './parentData';
import type { TemperamentId } from './temperamentData';
import type { ParentJobId } from './parentData';

/* ───────── 명예의 전당: 키운 아이 기록 (다회차 영구 보존) ───────── */
export interface HallEntry {
  name: string;
  gender: Gender;
  endingId: string;
  temperament?: TemperamentId;
  parentJob?: ParentJobId | 'CUSTOM';
  quote: string;
  dream: boolean;
  playthrough: number;
  relation?: Relation;
}

export function makeHallEntry(s: SaveState, e: EndingDefinition, playthrough: number): HallEntry {
  const l = buildLetter(s, e);
  return {
    name: s.childName,
    gender: s.gender,
    endingId: e.id,
    temperament: s.temperament,
    parentJob: s.parent?.job,
    quote: l.body.find((x) => !x.startsWith('이제 저는')) ?? l.closing,
    dream: s.dreamJob === e.id,
    playthrough,
    relation: relationEnding(s),
  };
}

/* ───────── 업적 30종 ───────── */
export interface Meta {
  hall: HallEntry[]; // 이번 아이 포함
  unlockedEndings: string[];
}
export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  check: (s: SaveState, e: EndingDefinition, m: Meta) => boolean;
}

const style = (s: SaveState, k: 'WARM' | 'STRICT' | 'FREE') => s.parenting?.[k] ?? 0;
const wins = (s: SaveState) => (s.actionCounts.WIN_SPORTS ?? 0) + (s.actionCounts.WIN_ARTFEST ?? 0) + (s.actionCounts.WIN_EXAM ?? 0);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'FIRST', emoji: '🎓', name: '첫 졸업', desc: '아이를 처음으로 성인식까지 키웠다', check: () => true },
  { id: 'S_END', emoji: '⭐', name: '빛나는 별', desc: 'S등급 엔딩을 받았다', check: (_, e) => e.tier === 'S' },
  { id: 'SS_END', emoji: '🌈', name: '전설의 시작', desc: 'SS등급 히든 엔딩을 받았다', check: (_, e) => e.tier === 'SS' },
  { id: 'IDLE_END', emoji: '🛋️', name: '괜찮아, 천천히', desc: '방구석 한량 엔딩을 봤다', check: (_, e) => e.id === 'END_50' },
  { id: 'DARK_END', emoji: '🌑', name: '빗나간 길', desc: '괴도 또는 지하세계 보스 엔딩', check: (_, e) => e.id === 'END_47' || e.id === 'END_48' },
  { id: 'DREAM', emoji: '🌟', name: '꿈은 이루어진다', desc: '아이가 말한 꿈을 엔딩으로 이뤄 줬다', check: (s, e) => s.dreamJob === e.id },
  { id: 'LIKE_PARENT', emoji: '👨‍👧', name: '부모 닮은 꼴', desc: '부모 직업과 비슷한 길을 걸었다', check: (s, e) => !!s.parent && s.parent.job !== 'CUSTOM' && PARENT_JOB_MAP[s.parent.job].likeParent.includes(e.id) },
  { id: 'POOR_HERO', emoji: '🐉', name: '개천에서 용', desc: '경제력 1 이하 집에서 A등급 이상 엔딩', check: (s, e) => (s.parent?.points.WEALTH ?? 2) <= 1 && ['A', 'S', 'SS'].includes(e.tier) },
  { id: 'NO_STRICT', emoji: '🕊️', name: '회초리 없는 집', desc: '엄격한 대응을 한 번도 하지 않았다', check: (s) => style(s, 'STRICT') === 0 && style(s, 'WARM') + style(s, 'FREE') >= 10 },
  { id: 'WARM_20', emoji: '🤗', name: '다정함의 끝판왕', desc: '다정한 대응 20번 이상', check: (s) => style(s, 'WARM') >= 20 },
  { id: 'STRICT_15', emoji: '📏', name: '원칙주의자', desc: '엄격한 대응 15번 이상', check: (s) => style(s, 'STRICT') >= 15 },
  { id: 'FREE_15', emoji: '🪁', name: '자유로운 영혼', desc: '믿고 맡기는 대응 15번 이상', check: (s) => style(s, 'FREE') >= 15 },
  { id: 'WISH_10', emoji: '🧚', name: '소원 들어주는 요정', desc: '아이의 부탁을 10번 이상 들어줬다', check: (s) => (s.wishesGranted ?? 0) >= 10 },
  { id: 'WISH_PERFECT', emoji: '🤙', name: '약속은 지킨다', desc: '부탁 5번 이상, 한 번도 못 들어준 적 없음', check: (s) => (s.wishesGranted ?? 0) >= 5 && (s.wishesFailed ?? 0) === 0 },
  { id: 'DIARY_TRUST', emoji: '🔒', name: '믿음의 부모', desc: '일기장을 한 번도 읽지 않고 5번 이상 그냥 뒀다', check: (s) => !(s.diaryRead ?? []).length && (s.diaryRespected ?? 0) >= 5 },
  { id: 'DIARY_SPY', emoji: '🕵️', name: '완벽한 첩보원', desc: '일기를 8편 이상 읽고 한 번도 들키지 않았다', check: (s) => (s.diaryRead ?? []).length >= 8 && !(s.diaryCaught ?? 0) },
  { id: 'DIARY_CAUGHT', emoji: '😱', name: '들켰다!', desc: '일기를 몰래 읽다 들켰다', check: (s) => (s.diaryCaught ?? 0) > 0 },
  { id: 'GIFT_5', emoji: '🎁', name: '선물의 달인', desc: '원하던 생일 선물을 5번 맞혔다', check: (s) => (s.giftsLiked ?? 0) >= 5 },
  { id: 'GIFT_10', emoji: '💝', name: '마음을 읽는 부모', desc: '원하던 생일 선물을 10번 맞혔다', check: (s) => (s.giftsLiked ?? 0) >= 10 },
  { id: 'NO_BURST', emoji: '😌', name: '평화로운 12년', desc: '스트레스가 한 번도 폭발하지 않았다', check: (s) => s.burstCount === 0 },
  { id: 'LOVE_MAX', emoji: '💞', name: '사랑 듬뿍', desc: '친밀도 100으로 성인식을 맞았다', check: (s) => s.status.affection >= 100 },
  { id: 'REBEL_WARM', emoji: '🌤️', name: '폭풍을 지나', desc: '사춘기 반항기를 다정한 결말로 마쳤다', check: (s) => (s.memories ?? []).includes('ARC_REBEL:WARM') },
  { id: 'LOVE_YES', emoji: '💑', name: '첫사랑 성공', desc: '아이의 첫사랑이 이루어졌다', check: (s) => (s.memories ?? []).includes('ARC_LOVE:YES') },
  { id: 'TEMPER_FAST', emoji: '🔍', name: '눈치 백단', desc: '10세가 되기 전에 아이의 기질을 알아챘다', check: (s) => (s.temperRevealedAge ?? 99) < 10 },
  { id: 'FRIEND_KEEP', emoji: '🤝', name: '평생 단짝', desc: '단짝 친구와 12년 내내 함께했다', check: (s) => !!s.friend && !s.flags.includes('FRIEND_AWAY') },
  { id: 'PHOTO_50', emoji: '📷', name: '추억 부자', desc: '사진첩에 사진 50장 이상', check: (s) => (s.photos ?? []).length >= 50 },
  { id: 'TROPHY_10', emoji: '🏆', name: '트로피 수집가', desc: '대회 우승·입상 10번 이상', check: (s) => wins(s) >= 10 },
  { id: 'TEMPER_ALL', emoji: '🎭', name: '다섯 가지 마음', desc: '기질 5종을 모두 키워 봤다', check: (_, __, m) => new Set(m.hall.map((h) => h.temperament).filter(Boolean)).size >= 5 },
  { id: 'HOMES_4', emoji: '🏘️', name: '여러 집 이야기', desc: '서로 다른 부모 직업 4종으로 키워 봤다', check: (_, __, m) => new Set(m.hall.map((h) => h.parentJob).filter((j) => j && j !== 'CUSTOM')).size >= 4 },
  { id: 'HEALTHY', emoji: '🌱', name: '건강한 자립', desc: '친밀도·자존감·자율성이 모두 높은 채로 어른이 되었다', check: (s) => relationEnding(s) === 'HEALTHY' },
  { id: 'REC_COACH', emoji: '🎥', name: '마음 번역가', desc: '관찰 카메라로 속마음을 보고 공감 코칭을 3번 했다', check: (s) => (s.attitudes?.COACHING ?? 0) >= 6 && (s.actionCounts.REC_GOLD ?? 0) >= 3 },
  { id: 'BOOK_10', emoji: '📚', name: '도감 수집가', desc: '엔딩 도감 10종을 모았다', check: (_, __, m) => m.unlockedEndings.length >= 10 },
];

export function newAchievements(s: SaveState, e: EndingDefinition, m: Meta, have: string[]) {
  return ACHIEVEMENTS.filter((a) => !have.includes(a.id) && a.check(s, e, m)).map((a) => a.id);
}

/* ───────── 20년 후 ───────── */
const josa = (w: string, a: string, b: string) => {
  const c = w.charCodeAt(w.length - 1);
  return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b);
};

export function epilogueLines(s: SaveState, e: EndingDefinition): string[] {
  const name = s.childName;
  const title = e.title.replace(/ \(.*\)$/, '');
  const L: string[] = [`20년 후, ${josa(name, '은', '는')} 서른아홉 살이 되었어요.`];
  const byCat: Record<string, string> = {
    ELITE: `${title}로서 많은 사람들에게 존경받고 있어요.`,
    TECH: `${title}로 만든 것들이 오늘도 세계 어딘가에서 쓰이고 있어요.`,
    ENT: `${title}로서 무대와 작품으로 사람들을 웃기고 울려요.`,
    BIZ: `${title}로 일하는 곳은 늘 사람들로 북적여요.`,
    ACTION: `${title}로서 오늘도 누군가를 지키고 있어요.`,
    HIDDEN: `${title}의 이야기는 이제 아이들의 동화책에 실려 있어요.`,
  };
  if (e.id === 'END_50') L.push('여전히 자기만의 속도로 살고 있어요. 요즘은 작은 동네 카페를 열 준비를 한대요.');
  else if (e.id === 'END_49') L.push('지구 반대편에서 계절마다 엽서를 보내와요. 이번엔 오로라 사진이에요.');
  else if (e.category === 'DARK') L.push('아직도 정체를 아는 사람이 없어요. ...하지만 어머니날엔 꼭 꽃이 배달돼요.');
  else L.push(byCat[e.category] ?? `${title}로 살아가고 있어요.`);
  if (s.dreamJob === e.id) L.push('열일곱 살에 말했던 꿈을 그대로 이룬 채로요.');
  const tl: Record<string, string> = {
    SHY: '어릴 적 겁 많던 아이는 이제 누구보다 단단한 어른이 되었어요.',
    ACTIVE: '여전히 한시도 가만히 있지 않아요. 주말엔 마라톤을 뛴대요.',
    STUBBORN: '그 고집은 이제 "뚝심"이라고 불려요.',
    SENSITIVE: '남의 마음을 잘 알아주는 어른이 되었어요.',
    EASYGOING: '여전히 느긋하지만, 해야 할 일은 결국 다 해내요.',
  };
  if (s.temperament) L.push(tl[s.temperament]);
  const rel = relationEnding(s);
  L.push(
    rel === 'HEALTHY'
      ? '주말마다 부모님 댁에 들러 저녁을 먹고 가요. 이제는 부모님 걱정을 하는 쪽이 되었어요.'
      : rel === 'HOLLOW'
        ? '연락은 끊긴 지 오래예요. 가끔 뉴스에서 이름을 볼 때마다, 그 작은 방이 떠올라요.'
        : rel === 'DEPENDENT'
          ? '여전히 하루에도 몇 번씩 전화가 와요. "엄마, 이거 어떻게 해?"'
          : '명절이면 꼭 집에 와서 하룻밤 자고 가요.',
  );
  if (s.friend) {
    const f = josa(s.friend, '이', '');
    if (!s.flags.includes('FRIEND_AWAY')) L.push(`입학식 날 만난 ${f}와는 아직도 단짝이에요.`);
    else if ((s.seenEvents ?? []).includes('F_REUNION')) L.push(`다시 만난 ${f}랑은 매년 함께 여행을 떠나요.`);
  }
  L.push('그 시절 고양이를 꼭 닮은 고양이가 지금 집에도 살고 있대요.');
  L.push('그리고 가끔, 어린 시절의 그 작은 방을 떠올린대요.');
  return L;
}
