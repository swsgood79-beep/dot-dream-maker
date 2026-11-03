import type { StatKey } from '../types/game';
import type { SaveState } from '../engine/simulation';
import { growthStage } from '../engine/room';
import { applyEffect } from '../engine/parenting';
import { addPhoto } from '../engine/simulation';
import type { Effect } from './parentingData';

export interface Gift {
  id: string;
  emoji: string;
  name: string;
  stat: StatKey;
}

/** 나이대별 선물 6종 — 아이가 가장 잘하는(좋아하는) 분야의 선물을 원한다 */
export const GIFTS: Record<'CHILD' | 'TEEN' | 'YOUTH', Gift[]> = {
  CHILD: [
    { id: 'BOOKS', emoji: '📚', name: '동화 전집', stat: 'INT' },
    { id: 'BALL', emoji: '⚽', name: '축구공', stat: 'STR' },
    { id: 'CRAYON', emoji: '🖍️', name: '64색 크레파스', stat: 'ART' },
    { id: 'BEAR', emoji: '🧸', name: '커다란 곰 인형', stat: 'CHA' },
    { id: 'HAMSTER', emoji: '🐹', name: '햄스터', stat: 'MOR' },
    { id: 'ROBOT', emoji: '🤖', name: '조립 로봇', stat: 'TEC' },
  ],
  TEEN: [
    { id: 'STUDY', emoji: '📖', name: '인강 수강권', stat: 'INT' },
    { id: 'SHOES', emoji: '👟', name: '브랜드 운동화', stat: 'STR' },
    { id: 'EARPHONE', emoji: '🎧', name: '무선 이어폰', stat: 'ART' },
    { id: 'COSME', emoji: '💄', name: '꾸미기 세트', stat: 'CHA' },
    { id: 'PLANT', emoji: '🌱', name: '반려 식물', stat: 'MOR' },
    { id: 'CONSOLE', emoji: '🎮', name: '최신 게임기', stat: 'TEC' },
  ],
  YOUTH: [
    { id: 'WATCH', emoji: '⌚', name: '손목시계', stat: 'INT' },
    { id: 'GYM', emoji: '🏋️', name: '헬스장 1년 이용권', stat: 'STR' },
    { id: 'GUITAR', emoji: '🎸', name: '통기타', stat: 'ART' },
    { id: 'SUIT', emoji: '👔', name: '첫 정장', stat: 'CHA' },
    { id: 'LETTER', emoji: '✉️', name: '손편지와 앨범', stat: 'MOR' },
    { id: 'LAPTOP', emoji: '💻', name: '노트북', stat: 'TEC' },
  ],
};
export const GIFT_PRICE = { CHILD: 100, TEEN: 200, YOUTH: 300 };

/** 아이가 원하는 선물: 가장 높은 스탯 분야 */
export function wantedGift(s: SaveState): Gift {
  const list = GIFTS[growthStage(s.age)];
  const keys: StatKey[] = ['INT', 'STR', 'ART', 'CHA', 'MOR', 'TEC'];
  const top = keys.reduce((a, b) => (s.stats[b] > s.stats[a] ? b : a));
  return list.find((g) => g.stat === top)!;
}

/** 원하는 선물 + 무작위 2개 (나이·생일이 같으면 같은 구성) */
export function giftOptions(s: SaveState): Gift[] {
  const list = GIFTS[growthStage(s.age)];
  const want = wantedGift(s);
  const others = list.filter((g) => g.id !== want.id);
  const seed = s.age * 7 + (s.birthMonth ?? 1);
  const a = others[seed % others.length];
  const b = others[(seed * 3 + 1) % others.length] === a ? others[(seed + 2) % others.length] : others[(seed * 3 + 1) % others.length];
  const opts = [want, a, b];
  return [opts[seed % 3], opts[(seed + 1) % 3], opts[(seed + 2) % 3]];
}

export function giveGift(s: SaveState, gift: Gift): { liked: boolean; reply: string; delta: Effect } {
  const stage = growthStage(s.age);
  const liked = gift.id === wantedGift(s).id;
  s.gold = Math.max(0, s.gold - GIFT_PRICE[stage]);
  const fx: Effect = liked ? { affection: 10, stress: -10, [gift.stat]: 10 } : { affection: 3, stress: -4, [gift.stat]: 4 };
  const delta = applyEffect(s, fx);
  if (liked) s.giftsLiked = (s.giftsLiked ?? 0) + 1;
  s.pendingBirthday = false;
  const reply = liked
    ? stage === 'CHILD'
      ? `우와아아! ${gift.name}! 이거 진짜 갖고 싶었어!!`
      : stage === 'TEEN'
        ? `헐... ${gift.name}? 어떻게 알았어?! 대박!`
        : `${gift.name}... 내가 갖고 싶던 거 기억해 줬구나. 고마워.`
    : stage === 'CHILD'
      ? `${gift.name}! ...고마워! (다른 것도 좋았는데...)`
      : stage === 'TEEN'
        ? `아... ${gift.name}. 응, 고마워. 잘 쓸게.`
        : `${gift.name}, 고마워. 마음만으로도 충분해.`;
  addPhoto(s, { emoji: '🎂', title: `${s.age}살 생일 파티`, caption: `${gift.emoji} ${gift.name} — ${liked ? '원하던 선물!' : '고마운 선물'}`, pose: liked ? 'cheer' : 'stand' });
  return { liked, reply, delta };
}
