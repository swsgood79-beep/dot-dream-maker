import type { SaveState } from '../engine/simulation';
import { growthStage } from '../engine/room';
import { WISH_MAP } from './parentingData';
import { wantedGift } from './birthdayData';

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** 방에서 아이를 눌렀을 때 한마디 (나이·기분별) + 포즈 */
export function childTapLine(s: SaveState): { text: string; pose: 'cheer' | 'idle' | 'tired' } {
  const st = growthStage(s.age);
  const { stress, affection, delinquency } = s.status;
  if (stress >= 70) return { text: pick(['건드리지 마아...', '피곤해... 😪', '좀 쉬고 싶어...']), pose: 'tired' };
  if (delinquency >= 50) return { text: pick(['...뭐.', '용돈이나 줘.', '신경 꺼.']), pose: 'idle' };
  if (s.birthMonth && (s.birthMonth === (s.month % 12) + 1 || s.birthMonth === s.month) && Math.random() < 0.5) {
    const g = wantedGift(s);
    return { text: `생일 선물로... ${g.emoji} ${g.name} 받고 싶다~ (힐끔)`, pose: 'cheer' };
  }
  if (s.wish && Math.random() < 0.35) return { text: `(혹시... ${WISH_MAP[s.wish.id]?.emoji ?? ''} 내 부탁 기억해?)`, pose: 'idle' };
  if (st === 'TEEN' && affection < 60) return { text: pick(['왜.', '노크 좀 해.', '...아 진짜.', '(이어폰 꽂는 중)']), pose: 'idle' };
  if (affection >= 85)
    return {
      text: st === 'CHILD' ? pick(['안아 줘! 💕', '헤헤 간지러워~', '엄마 아빠 최고!']) : st === 'TEEN' ? pick(['...헤헤.', '(쑥스럽) 뭐야~', '고마워. 그냥.']) : pick(['나중에 효도할게!', '오늘 저녁 내가 할까?', '사랑해~ 💕']),
      pose: 'cheer',
    };
  if (st === 'CHILD') return { text: pick(['놀아 줘!', '배고파~', '오늘 뭐 해?', '고양이 봤어? 귀여워!', '이거 봐 봐!']), pose: 'cheer' };
  if (st === 'TEEN') return { text: pick(['숙제 중이야.', '급식 맛없었어.', '...응?', '나 키 컸지?', '이 노래 알아?']), pose: 'idle' };
  return { text: pick(['요즘 생각이 많아.', '커피 마실래?', '나 바빠~', '시간 진짜 빠르다.', '파이팅 해 줘!']), pose: 'idle' };
}

export function catTapLine() {
  return pick(['냥', '냐앙~', '(골골골)', '🐟?', '...냥.', '(꼬리 탁탁)']);
}
