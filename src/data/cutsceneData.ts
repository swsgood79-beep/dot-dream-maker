import type { SaveState } from '../engine/simulation';
import type { TemperamentId } from './temperamentData';

type Stage = 'CHILD' | 'TEEN' | 'YOUTH';

export type CutLine =
  | { kind: 'narr'; text: string }
  | { kind: 'child'; text: string; pose?: 'stand' | 'cheer' | 'tired' }
  /** 성장 변신: 이전 모습 → 번쩍 → 새 모습 */
  | { kind: 'transform'; from: Stage; to: Stage; text: string };

export interface Cutscene {
  id: string;
  age: number;
  month: number;
  title: string;
  emoji: string;
  sky: [string, string];
  lines: (s: SaveState) => CutLine[];
}

const byTemper = (s: SaveState, map: Partial<Record<TemperamentId, string>>, dflt: string) =>
  (s.temperament && map[s.temperament]) || dflt;
const friendAway = (s: SaveState) => s.flags.includes('FRIEND_AWAY');

export const CUTSCENES: Cutscene[] = [
  {
    id: 'CS_SCHOOL', age: 8, month: 3, title: '초등학교 입학식', emoji: '🏫', sky: ['#ffd6e7', '#fff6d6'],
    lines: (s) => [
      { kind: 'narr', text: '{name}의 초등학교 입학식 날. 몸보다 큰 책가방을 메고 교문 앞에 섰어요.' },
      {
        kind: 'child',
        text: byTemper(s, {
          SHY: '(엄마 아빠 손을 꼭 잡고) ...같이 들어가면 안 돼?',
          ACTIVE: '우와, 학교 진짜 크다! 나 먼저 간다~!',
          STUBBORN: '나 혼자 갈 수 있어. 따라오지 마!',
          SENSITIVE: '(울먹) 친구 못 사귀면 어떡해...',
          EASYGOING: '(하품) 학교는 몇 시에 끝나?',
        }, '다녀오겠습니다!'),
      },
      { kind: 'narr', text: '그날 오후, {name이} 누군가의 손을 잡고 교문을 나왔어요.' },
      { kind: 'child', text: '엄마 아빠! 얘는 {friend}야. 오늘부터 내 짝꿍!', pose: 'cheer' },
    ],
  },
  {
    id: 'CS_PUBERTY', age: 12, month: 1, title: '어느새 훌쩍', emoji: '📏', sky: ['#c9e4ff', '#f5e8ff'],
    lines: (s) => [
      { kind: 'narr', text: '새해 아침, 문틀에 키를 재 보니 작년보다 한 뼘이나 자랐어요.' },
      { kind: 'transform', from: 'CHILD', to: 'TEEN', text: '...언제 이렇게 컸지?' },
      {
        kind: 'child',
        text: s.status.affection >= 60 ? '나 이제 엄마 아빠 어깨까지 온다! 곧 따라잡을 거야.' : '...키 재는 거 이제 그만해. 창피해.',
        pose: s.status.affection >= 60 ? 'cheer' : 'stand',
      },
      { kind: 'narr', text: '목소리도, 표정도 조금씩 달라지고 있어요. 사춘기가 시작됐나 봐요.' },
    ],
  },
  {
    id: 'CS_MIDDLE', age: 14, month: 3, title: '중학교 입학', emoji: '🎒', sky: ['#d7f5e1', '#fff6d6'],
    lines: (s) => [
      { kind: 'narr', text: '처음 입어 보는 교복. {name이} 거울 앞에서 한참을 서 있어요.' },
      { kind: 'child', text: s.stats.CHA >= 300 ? '어때? 교복 잘 어울리지?' : '...교복 좀 크지 않아? 소매가 손을 덮어.' },
      friendAway(s)
        ? { kind: 'child', text: '새 친구들 이름부터 외워야겠다. ...{friend}도 잘 지내겠지?' }
        : { kind: 'child', text: '대박! {friend}랑 또 같은 반 됐어!', pose: 'cheer' },
    ],
  },
  {
    id: 'CS_GROWN', age: 17, month: 1, title: '이제 거의 어른', emoji: '🌅', sky: ['#ffd9b8', '#f3e1ff'],
    lines: (s) => [
      { kind: 'narr', text: '어느 날 문득, 현관을 나서는 아이의 뒷모습이 낯설게 느껴졌어요.' },
      { kind: 'transform', from: 'TEEN', to: 'YOUTH', text: '이렇게 컸구나...' },
      {
        kind: 'child',
        text: s.status.affection >= 70 ? '왜 그렇게 봐? ...나 많이 컸지?' : '왜? 뭐 묻었어?',
        pose: s.status.affection >= 70 ? 'cheer' : 'stand',
      },
      { kind: 'narr', text: '올봄이면 고등학생. 어른이 될 날이 얼마 남지 않았어요.' },
    ],
  },
  {
    id: 'CS_SENIOR', age: 19, month: 3, title: '고3, 마지막 1년', emoji: '📚', sky: ['#dfe6ff', '#fff2e0'],
    lines: (s) => [
      { kind: 'narr', text: "{name}의 책상 위에 '수능 D-250' 메모가 붙었어요." },
      {
        kind: 'child',
        text: s.status.stress >= 50 ? '...솔직히 좀 무서워. 잘할 수 있을까?' : '1년만 버티면 어른이다! 파이팅!',
        pose: s.status.stress >= 50 ? 'tired' : 'cheer',
      },
      friendAway(s)
        ? { kind: 'narr', text: '책상 서랍에는 멀리서 {friend}가 보낸 응원 편지가 들어 있어요.' }
        : { kind: 'child', text: '{friend}랑 같은 대학 가자고 약속했어. 꼭 지킬 거야.' },
      { kind: 'narr', text: '이 1년이 지나면, 아이는 어른이 됩니다.' },
    ],
  },
];

export const CUTSCENE_MAP: Record<string, Cutscene> = Object.fromEntries(CUTSCENES.map((c) => [c.id, c]));

/** 아이의 첫 단짝 이름 (아이 이름으로 정해져 같은 판에서는 항상 같음) */
const FRIENDS = ['서연', '지호', '민서', '하준', '도윤', '지아', '예준', '수아', '시우', '하린', '유찬', '채원'];
export function pickFriend(childName: string) {
  const sum = [...childName].reduce((a, c) => a + c.charCodeAt(0), 0);
  let f = FRIENDS[sum % FRIENDS.length];
  if (f === childName) f = FRIENDS[(sum + 1) % FRIENDS.length];
  return f;
}
