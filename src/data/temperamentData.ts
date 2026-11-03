import type { StatKey } from '../types/game';
import type { Effect, ParentStyle } from './parentingData';

export type TemperamentId = 'SHY' | 'ACTIVE' | 'STUBBORN' | 'SENSITIVE' | 'EASYGOING';

export interface Temperament {
  id: TemperamentId;
  label: string;
  emoji: string;
  desc: string;
  /** 부모에게 주는 팁 (기질이 밝혀진 뒤 표시) */
  tip: string;
  /** 육아 선택지에서 고른 대응 스타일에 따라 추가로 붙는 효과 */
  styleFx: Partial<Record<ParentStyle, Effect>>;
  /** 관찰 노트 단서: 이 기질의 아이가 각 대응에 보이는 반응 */
  clue: Record<ParentStyle, string>;
  /** 매주 스케줄 성장 배율 */
  statMul: Partial<Record<StatKey, number>>;
  /** 매주 스트레스 증가 배율 */
  stressMul: number;
}

export const TEMPERAMENTS: Temperament[] = [
  {
    id: 'SHY', label: '소심한', emoji: '🐢',
    desc: '겁이 많고 낯을 가리지만 속이 깊어요.',
    tip: '다그치기보다 기다려 주면 마음을 열어요. 엄하게 대하면 오래 움츠러들어요.',
    styleFx: { WARM: { affection: 3, stress: -3 }, STRICT: { stress: 6, affection: -3 }, FREE: { stress: 2 } },
    clue: {
      WARM: '다정하게 기다려 주자 그제야 작은 목소리로 속마음을 꺼냈다.',
      STRICT: '혼나고 나서 한참을 방구석에 움츠리고 있었다.',
      FREE: '혼자 두니 어쩔 줄 몰라 하며 자꾸 눈치를 살폈다.',
    },
    statMul: { CHA: 0.9, INT: 1.05, MOR: 1.05 },
    stressMul: 1,
  },
  {
    id: 'ACTIVE', label: '활발한', emoji: '🐯',
    desc: '에너지가 넘치고 속상한 일도 금방 털어 버려요.',
    tip: '몸을 움직이게 해 주세요. 오래 앉혀 두면 힘들어하지만 혼나도 금방 회복해요.',
    styleFx: { FREE: { stress: -3, STR: 3 }, STRICT: { stress: 3 }, WARM: { CHA: 2 } },
    clue: {
      WARM: '꼭 안아 주자 금세 깔깔 웃으며 밖으로 뛰어나갔다.',
      STRICT: '혼난 지 5분 만에 다시 소파 위를 뛰어다닌다.',
      FREE: '맡겨 두니 신이 나서 온 동네를 누비고 돌아왔다.',
    },
    statMul: { STR: 1.1, CHA: 1.05, INT: 0.95 },
    stressMul: 1,
  },
  {
    id: 'STUBBORN', label: '고집 센', emoji: '🐏',
    desc: '한번 마음먹으면 끝까지 가요.',
    tip: '명령보다 이유를 설명하고 스스로 정하게 해 주세요. 억누르면 반발해요.',
    styleFx: { STRICT: { affection: -4, delinquency: 3, stress: 3 }, FREE: { MOR: 3, affection: 2 }, WARM: { MOR: 2 } },
    clue: {
      WARM: '이유를 차근차근 설명하자 한참 고민하더니 고개를 끄덕였다.',
      STRICT: '하지 말라고 하니 오히려 더 하겠다며 입을 꾹 다물었다.',
      FREE: '스스로 정하게 하니 끝까지 책임지고 해냈다.',
    },
    statMul: { TEC: 1.05, STR: 1.05, MOR: 0.95 },
    stressMul: 1,
  },
  {
    id: 'SENSITIVE', label: '예민한', emoji: '🦋',
    desc: '감수성이 풍부하고 작은 일에도 쉽게 상처받아요.',
    tip: '작은 변화도 알아차려 주고 말을 골라 주세요. 스트레스가 빨리 쌓이니 자주 쉬게 해 주세요.',
    styleFx: { WARM: { affection: 2, ART: 3 }, STRICT: { stress: 8, affection: -2 }, FREE: { stress: 3 } },
    clue: {
      WARM: '마음을 알아주자 눈물을 글썽이며 고맙다고 했다.',
      STRICT: '엄한 한마디에 밤새 일기장에 무언가를 적고 있었다.',
      FREE: '혼자 두니 오히려 불안한지 방문 앞을 서성였다.',
    },
    statMul: { ART: 1.1, CHA: 1.03 },
    stressMul: 1.15,
  },
  {
    id: 'EASYGOING', label: '느긋한', emoji: '🐼',
    desc: '웬만한 일에는 흔들리지 않는 태평한 성격이에요.',
    tip: '스트레스엔 강하지만 가끔은 등을 떠밀어 줘야 해요. 그냥 두면 하루 종일 뒹굴어요.',
    styleFx: { STRICT: { INT: 3, stress: -2 }, FREE: { delinquency: 1, stress: -2 }, WARM: { stress: -2 } },
    clue: {
      WARM: '다정하게 말하니 "헤헤" 웃으며 느릿느릿 움직였다.',
      STRICT: '혼나도 "응~ 알겠어~" 하고 하품을 했다.',
      FREE: '맡겨 두니 하루 종일 뒹굴며 아무것도 안 했다.',
    },
    statMul: { INT: 0.95, TEC: 0.95 },
    stressMul: 0.85,
  },
];

export const TEMPERAMENT_MAP = Object.fromEntries(TEMPERAMENTS.map((t) => [t.id, t])) as Record<TemperamentId, Temperament>;

/** 기질이 밝혀지기까지 필요한 관찰 단서 수 */
export const CLUES_TO_REVEAL = 3;
