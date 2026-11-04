/** 활동 숙련도 (같은 스케줄을 할수록 익숙해져 효율이 오른다) — 누적 주 수로 Lv.1~5 */
export const MASTERY_STEPS = [0, 6, 15, 28, 45];
export const MASTERY_TITLE = ['', '입문', '익숙', '능숙', '숙련', '달인'];
export function masteryLevel(count: number): number {
  let lv = 1;
  for (let i = 1; i < MASTERY_STEPS.length; i++) if (count >= MASTERY_STEPS[i]) lv = i + 1;
  return lv;
}
/** Lv마다 능력치 획득 +3% (Lv.5 = +12%) — 더 크면 스탯이 넘쳐 다른 엔딩으로 새는 경우가 생김 */
export const MASTERY_PER_LV = 0.03;
export const masteryMul = (lv: number) => 1 + (lv - 1) * MASTERY_PER_LV;
/** 다음 레벨까지: [지금까지, 필요] (최대 레벨이면 null) */
export function masteryProgress(count: number): [number, number] | null {
  const lv = masteryLevel(count);
  if (lv >= 5) return null;
  return [count - MASTERY_STEPS[lv - 1], MASTERY_STEPS[lv] - MASTERY_STEPS[lv - 1]];
}
