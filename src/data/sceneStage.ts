import type { GrowthStage } from '../types/game';

/** 이벤트 장면 그림 속 아이가 몇 살 무렵으로 그려졌는지 (그림을 직접 보고 분류, 아들·딸 공통)
 * - 그림과 다른 나이대에는 그 그림을 보여 주지 않고 (도트 캐릭터로 대신)
 * - 연속 이야기(arc)가 아닌 이벤트는 나오는 나이를 그림 나이대 안으로 좁힌다 */
const C = 'CHILD', T = 'TEEN', Y = 'YOUTH';
export const SCENE_STAGE: Record<string, GrowthStage> = {
  A_HOLIDAY_MONEY: C, CS_SCHOOL: C, F_MOVING: C, F_SLEEPOVER: C, K_MIDDLE: C, K_WORKING: C, V_VISIT: C,
  P_ARTIST: C, P_CHEF: C, P_COACH: C, P_DOCTOR: C, P_OFFICE: C, P_SHOP: C,
  A_LOVE_1: T, A_LOVE_2: T, A_LOVE_3N: T, A_LOVE_3Y: T, A_REBEL_1: T, A_REBEL_2: T, A_REBEL_3: T, A_REBEL_4: T,
  CS_MIDDLE: T, CS_PUBERTY: T, F_REUNION: T, F_TEEN_FIGHT: T, K_POOR: T, K_RICH: T,
  M_SANTA: T, M_VASE_STRICT: T, M_VASE_WARM: T, M_WISH_CLOSED: T, P_DEVELOPER: T, P_PROFESSOR: T,
  A_DREAM_1: Y, A_DREAM_2C: Y, A_DREAM_2O: Y, A_LOVE_3W: Y, CS_GROWN: Y, CS_SENIOR: Y,
  M_BULLY: Y, M_DREAM_FREE: Y, M_DREAM_STRICT: Y, M_DREAM_WARM: Y, M_FEVER: Y, M_PHONE: Y, M_SORRY: Y, M_SPARROW: Y,
};
/** 접두어로 정해지는 것: C_ 유년, T_ 청소년, Y_ 청년 */
export function sceneStage(id: string): GrowthStage | undefined {
  if (SCENE_STAGE[id]) return SCENE_STAGE[id];
  if (id.startsWith('C_')) return C;
  if (id.startsWith('T_')) return T;
  if (id.startsWith('Y_')) return Y;
  return undefined;
}
export const STAGE_AGES: Record<GrowthStage, [number, number]> = { CHILD: [8, 11], TEEN: [12, 16], YOUTH: [17, 19] };
