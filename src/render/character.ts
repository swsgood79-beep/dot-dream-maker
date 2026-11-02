import type { Gender, GrowthStage } from '../types/game';

/**
 * (폴백) 성장 단계별 도트 캐릭터를 코드로 그린다 — 스프라이트 시트 로딩 전/실패 시 사용.
 * 유년기 2등신 → 청소년기 2.5등신 → 청년기 3등신. 아들/딸 헤어·의상 분기.
 */
export type Facing = 'L' | 'R';
/** idle/walk: 서기, read: 독서·공부, cheer: 만세 점프, work: 알바·집안일, sleep: 침대 휴식 */
export type Pose = 'idle' | 'walk' | 'read' | 'cheer' | 'work' | 'sleep';

interface Outfit {
  top: string;
  topDark: string;
  bottom: string;
  collar?: string;
  tie?: string;
  skirt?: boolean;
  dress?: boolean;
}

const SKIN = '#f6cfa6';
const SKIN_D = '#d9a57a';
const INK = '#1b1f3b';
const HAIR: Record<Gender, string> = { SON: '#4a2f22', DAUGHTER: '#6b3a26' };

const OUTFITS: Record<GrowthStage, Record<Gender, Outfit>> = {
  CHILD: {
    SON: { top: '#ffd84d', topDark: '#e0b52a', bottom: '#4a7bd8' },
    DAUGHTER: { top: '#ff8fc0', topDark: '#e06a9e', bottom: '#ff8fc0', dress: true },
  },
  TEEN: {
    SON: { top: '#2b3a6b', topDark: '#1e2a52', bottom: '#5a6070', collar: '#ffffff' },
    DAUGHTER: { top: '#ffffff', topDark: '#d6dbe6', bottom: '#2b3a6b', collar: '#2b3a6b', tie: '#e5484d', skirt: true },
  },
  YOUTH: {
    SON: { top: '#5bd6a8', topDark: '#3aa880', bottom: '#3a5a9b' },
    DAUGHTER: { top: '#c3a0f0', topDark: '#9b78d0', bottom: '#e8d2a8', skirt: true },
  },
};

const DIMS: Record<GrowthStage, { body: number; legs: number }> = {
  CHILD: { body: 5, legs: 3 },
  TEEN: { body: 7, legs: 5 },
  YOUTH: { body: 8, legs: 7 },
};

/** 도트 1칸 = 2px (논리 해상도) — 타일 대비 카이로소프트풍 큼직한 캐릭터 */
export const CHAR_SCALE = 2;

export function proceduralHeight(stage: GrowthStage) {
  return (9 + DIMS[stage].body + DIMS[stage].legs) * CHAR_SCALE;
}

export interface CharacterDrawOpts {
  stage: GrowthStage;
  gender: Gender;
  facing: Facing;
  pose: Pose;
  time: number; // ms
  alpha?: number;
}

/** (fx, fy) = 발 중앙 화면 좌표 */
export function drawCharacterProcedural(ctx: CanvasRenderingContext2D, fx: number, fy: number, o: CharacterDrawOpts) {
  const { body, legs } = DIMS[o.stage];
  const outfit = OUTFITS[o.stage][o.gender];
  const flip = o.facing === 'L';
  const step = Math.floor(o.time / 160) % 2; // 걷기 프레임
  const bob = (o.pose === 'read' || o.pose === 'cheer' || o.pose === 'work') ? (Math.floor(o.time / 220) % 2) : o.pose === 'walk' ? step : 0;

  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  const S = CHAR_SCALE;
  const ox = Math.round(fx) - 5.5 * S; // 캐릭터 폭 11도트
  const fy0 = Math.round(fy);
  // 아래 좌표들은 '도트' 단위, baseY = 0 이 발끝
  const baseY = 0;

  // px(x, y, w, h, color) — 도트 단위, 좌우 반전 고려
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    if (w <= 0 || h <= 0) return;
    const rx = flip ? 11 - x - w : x;
    ctx.fillStyle = c;
    ctx.fillRect(ox + rx * S, fy0 + y * S, w * S, h * S);
  };

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(ox + 1 * S, fy0 - 1 * S, 9 * S, 2 * S);

  if (o.pose === 'sleep') {
    // 누운 자세 (간략): 머리 + 이불
    const y = baseY - 6;
    px(0, y, 11, 5, INK);
    px(1, y + 1, 4, 3, SKIN);
    px(1, y + 1, 4, 1, HAIR[o.gender]);
    px(5, y + 1, 5, 3, outfit.top);
    px(2, y + 3, 2, 1, INK); // 감은 눈
    ctx.restore();
    return;
  }

  const legTop = baseY - legs;
  const bodyTop = legTop - body - bob;
  const headTop = bodyTop - 9;

  // ── 다리
  const legA = o.pose === 'walk' && step === 0 ? 1 : 0;
  const legB = o.pose === 'walk' && step === 1 ? 1 : 0;
  const legColor = outfit.dress || outfit.skirt ? SKIN : outfit.bottom;
  px(3, legTop - bob, 2, legs + bob - legA, INK);
  px(6, legTop - bob, 2, legs + bob - legB, INK);
  if (legs > 2) {
    px(3, legTop - bob, 2, Math.max(0, legs + bob - legA - 1), legColor);
    px(6, legTop - bob, 2, Math.max(0, legs + bob - legB - 1), legColor);
  }
  // 신발
  px(2, baseY - 1 - legA, 3, 1, INK);
  px(6, baseY - 1 - legB, 3, 1, INK);

  // ── 몸통 (외곽선 → 채움)
  px(2, bodyTop, 7, body + 1, INK);
  px(3, bodyTop + 1, 5, body - 1, outfit.top);
  px(7, bodyTop + 1, 1, body - 1, outfit.topDark);
  if (outfit.collar) {
    px(3, bodyTop + 1, 5, 1, outfit.collar);
    px(4, bodyTop + 2, 3, 1, outfit.collar);
  }
  if (outfit.tie) px(5, bodyTop + 2, 1, 2, outfit.tie);
  // 치마/원피스
  if (outfit.skirt || outfit.dress) {
    const sTop = outfit.dress ? bodyTop + body - 1 : legTop - 1 - bob;
    px(1, sTop, 9, 3, INK);
    px(2, sTop, 7, 2, outfit.dress ? outfit.top : outfit.bottom);
  } else {
    px(3, legTop - 1 - bob, 5, 1, outfit.bottom);
  }

  // ── 팔 (걷기 시 흔들기, 행동 시 들기)
  const armSwing = o.pose === 'walk' ? (step ? 1 : -1) : 0;
  if ((o.pose === 'read' || o.pose === 'cheer' || o.pose === 'work')) {
    px(0, bodyTop - 1, 2, 4, INK);
    px(0, bodyTop - 1, 1, 1, SKIN);
    px(9, bodyTop - 1, 2, 4, INK);
    px(10, bodyTop - 1, 1, 1, SKIN);
  } else {
    px(1, bodyTop + 1 + armSwing, 1, body - 1, INK);
    px(1, bodyTop + body - 1 + armSwing, 1, 1, SKIN);
    px(9, bodyTop + 1 - armSwing, 1, body - 1, INK);
    px(9, bodyTop + body - 1 - armSwing, 1, 1, SKIN);
  }

  // ── 머리 (9x9)
  const hair = HAIR[o.gender];
  px(1, headTop, 9, 9, INK);
  px(2, headTop + 1, 7, 7, SKIN);
  px(8, headTop + 2, 1, 6, SKIN_D);
  // 앞머리
  px(2, headTop + 1, 7, 2, hair);
  px(2, headTop + 3, 2, 1, hair);
  px(6, headTop + 3, 1, 1, hair);
  if (o.gender === 'DAUGHTER') {
    // 긴 머리: 옆머리가 어깨까지
    px(0, headTop + 2, 2, o.stage === 'CHILD' ? 6 : 9, INK);
    px(1, headTop + 2, 1, o.stage === 'CHILD' ? 5 : 8, hair);
    px(9, headTop + 2, 2, o.stage === 'CHILD' ? 6 : 9, INK);
    px(9, headTop + 2, 1, o.stage === 'CHILD' ? 5 : 8, hair);
    // 리본
    const ribbon = o.stage === 'TEEN' ? '#e5484d' : o.stage === 'CHILD' ? '#ffd84d' : '#ff8fc0';
    px(7, headTop - 1, 3, 2, ribbon);
  } else {
    // 짧은 머리 + 뻗친 머리카락
    px(4, headTop - 1, 2, 1, INK);
    px(1, headTop + 2, 1, 3, hair);
  }
  // 눈 (바라보는 쪽으로 1px 치우침)
  const eyeY = headTop + 4;
  if ((o.pose === 'read' || o.pose === 'cheer' || o.pose === 'work') && Math.floor(o.time / 900) % 3 === 0) {
    px(4, eyeY + 1, 2, 1, INK);
    px(7, eyeY + 1, 1, 1, INK);
  } else {
    px(4, eyeY, 1, 2, INK);
    px(7, eyeY, 1, 2, INK);
  }
  // 볼터치
  if (o.gender === 'DAUGHTER' || o.stage === 'CHILD') {
    px(3, eyeY + 2, 1, 1, '#ff9eb0');
    px(8, eyeY + 2, 1, 1, '#ff9eb0');
  }
  ctx.restore();
}
