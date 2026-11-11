import { SCHEDULE_ACTIONS } from '../data/scheduleData';
import { COMBO_MAP, FURNITURE } from '../data/furnitureData';
import type { AptitudeKey, EndingDefinition, StatKey } from '../types/game';
import type { SaveState } from './simulation';

/**
 * 🎯 엔딩 노리기 (v0.44) — 엔딩 도감에서 하나를 골라 '목표 엔딩'으로 정하면
 * 조건을 한 줄씩 지금 아이와 비교해 보여 주고, 스케줄에서 부족한 능력치를 올리는 활동에 표시를 단다.
 */
export interface CheckItem {
  label: string;
  have: number;
  need: number;
  ok: boolean;
  /** 숫자로 진행도를 보여 줄 수 없는 조건 (콤보 · 특별 조건) */
  flag?: boolean;
  /** 이 조건이 '이하'여야 하는지 */
  max?: boolean;
}

const STAT_KO: Record<StatKey, string> = { INT: '지력', STR: '체력', ART: '감성', CHA: '매력', MOR: '도덕', TEC: '기술' };
const APT_KO: Record<AptitudeKey, string> = { APT_MED: '의학 적성', APT_LAW: '법률 적성', APT_IT: 'IT 적성', APT_ENT: '연예 적성', APT_BIZ: '경영 적성', APT_ADV: '모험 적성' };
const COUNT_KO: Record<string, string> = {
  WIN_EXAM: '기말시험 우승', WIN_ARTFEST: '예술제 입상', WIN_SPORTS: '체육대회 우승', OUTING_TOTAL: '외출 횟수',
};
const countLabel = (k: string) => COUNT_KO[k] ?? `${SCHEDULE_ACTIONS.find((a) => a.id === k)?.name ?? k} 횟수`;

export function endingChecklist(def: EndingDefinition, s: SaveState): CheckItem[] {
  const out: CheckItem[] = [];
  for (const [k, v] of Object.entries(def.minStats) as [StatKey, number][]) out.push({ label: STAT_KO[k], have: s.stats[k], need: v, ok: s.stats[k] >= v });
  for (const [k, v] of Object.entries(def.maxStats ?? {}) as [StatKey, number][]) out.push({ label: `${STAT_KO[k]} (이하)`, have: s.stats[k], need: v, ok: s.stats[k] <= v, max: true });
  for (const [k, v] of Object.entries(def.minAptitudes ?? {}) as [AptitudeKey, number][]) out.push({ label: APT_KO[k], have: s.aptitudes[k].level, need: v, ok: s.aptitudes[k].level >= v });
  if (def.anyAptitudes) {
    const any = Object.entries(def.anyAptitudes) as [AptitudeKey, number][];
    const best = any.map(([k, v]) => ({ k, v, h: s.aptitudes[k].level })).sort((a, b) => b.h / b.v - a.h / a.v)[0];
    out.push({ label: `${any.map(([k]) => APT_KO[k]).join(' 또는 ')}`, have: best.h, need: best.v, ok: any.some(([k, v]) => s.aptitudes[k].level >= v) });
  }
  const st = s.status;
  if (def.minFame !== undefined) out.push({ label: '명성', have: st.fame, need: def.minFame, ok: st.fame >= def.minFame });
  if (def.minAffection !== undefined) out.push({ label: '친밀도', have: st.affection, need: def.minAffection, ok: st.affection >= def.minAffection });
  if (def.minGold !== undefined) out.push({ label: '골드', have: s.gold, need: def.minGold, ok: s.gold >= def.minGold });
  if (def.maxDelinquency !== undefined) out.push({ label: '비행 (이하)', have: st.delinquency, need: def.maxDelinquency, ok: st.delinquency <= def.maxDelinquency, max: true });
  if (def.minDelinquency !== undefined) out.push({ label: '비행', have: st.delinquency, need: def.minDelinquency, ok: st.delinquency >= def.minDelinquency });
  if (def.requiredComboId) {
    const ok = s.activeCombos.includes(def.requiredComboId) || s.flags.includes(`COMBO:${def.requiredComboId}`);
    out.push({ label: `가구 콤보 [${COMBO_MAP[def.requiredComboId]?.name ?? def.requiredComboId}]`, have: ok ? 1 : 0, need: 1, ok, flag: true });
  }
  if (def.requiredFlag) {
    const ok = s.flags.includes(def.requiredFlag);
    out.push({ label: ok ? '특별한 사건 ✓' : '특별한 사건 (외출 · 활동 중 우연히)', have: ok ? 1 : 0, need: 1, ok, flag: true });
  }
  for (const [k, v] of Object.entries(def.requiredActionCounts ?? {})) {
    const have = s.actionCounts[k] ?? 0;
    out.push({ label: countLabel(k), have, need: v, ok: have >= v });
  }
  if (def.minFurnitureCollectionRate !== undefined) {
    const have = Math.round((s.collectedFurniture.length / FURNITURE.length) * 100);
    const need = Math.round(def.minFurnitureCollectionRate * 100);
    out.push({ label: '가구 도감 수집률(%)', have, need, ok: have >= need });
  }
  return out;
}

/** 0~1: 조건을 얼마나 채웠는지 */
export function endingProgress(def: EndingDefinition, s: SaveState): number {
  const items = endingChecklist(def, s);
  if (!items.length) return 1;
  return items.reduce((a, c) => a + (c.ok ? 1 : c.max ? 0.5 : Math.min(1, c.have / Math.max(1, c.need))), 0) / items.length;
}

/** 목표 엔딩에 아직 모자란 능력치 */
export function lackingStats(def: EndingDefinition, s: SaveState): StatKey[] {
  return (Object.entries(def.minStats) as [StatKey, number][]).filter(([k, v]) => s.stats[k] < v).map(([k]) => k);
}
