import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FURNITURE_MAP, COMBO_MAP } from '../data/furnitureData';
import { ACTION_MAP } from '../data/scheduleData';
import { ENDING_MAP } from '../data/endingData';
import type { EndingDefinition, Gender, StatKey } from '../types/game';
import { canPlace, findFreeSpot } from '../engine/room';
import { createNewGame, refreshCombos, runMonth, type MonthResult, type SaveState } from '../engine/simulation';

export type Toast = { id: number; text: string };

interface GameStore {
  game: SaveState | null;
  /** 다회차 영구 보존: 엔딩 도감 */
  unlockedEndings: string[];
  /** 2회차 인계용 영감 포인트 */
  carryIdea: number;
  playthrough: number;
  lastResult: MonthResult | null;
  ending: EndingDefinition | null;
  toasts: Toast[];

  newGame: (name: string, gender: Gender, bonus: StatKey) => void;
  setScheduleSlot: (slot: number, actionId: string) => void;
  runMonth: () => void;
  dismissResult: () => void;
  buyFurniture: (furnitureId: string) => boolean;
  placeFromInventory: (furnitureId: string, x: number, y: number) => boolean;
  moveFurniture: (instanceId: string, x: number, y: number) => boolean;
  rotateFurniture: (instanceId: string) => void;
  storeFurniture: (instanceId: string) => void;
  talk: () => void;
  giveAllowance: () => void;
  finishEnding: () => void;
  quitToTitle: () => void;
  pushToast: (text: string) => void;
}

let toastSeq = 1;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      /** 게임 상태를 변경하고 콤보 재계산 + 신규 콤보 토스트 */
      const mutate = (fn: (g: SaveState) => boolean | void): boolean => {
        const g = get().game;
        if (!g) return false;
        const next = structuredClone(g);
        const ok = fn(next);
        if (ok === false) return false;
        const newly = refreshCombos(next);
        set({ game: next });
        newly.forEach((id) => get().pushToast(`✨ 전문 구역 콤보 발동! [${COMBO_MAP[id].name}]`));
        return true;
      };

      return {
        game: null,
        unlockedEndings: [],
        carryIdea: 0,
        playthrough: 1,
        lastResult: null,
        ending: null,
        toasts: [],

        newGame: (name, gender, bonus) => {
          const { unlockedEndings, carryIdea } = get();
          set({ game: createNewGame(name, gender, bonus, [...unlockedEndings], carryIdea), lastResult: null, ending: null, carryIdea: 0 });
        },

        setScheduleSlot: (slot, actionId) =>
          void mutate((g) => {
            g.monthlySchedule[slot] = actionId;
          }),

        runMonth: () => {
          const g = get().game;
          if (!g) return;
          const result = runMonth(g);
          const unlocked = Array.from(new Set([...get().unlockedEndings, ...result.state.unlockedEndings]));
          set({ game: result.state, lastResult: result, unlockedEndings: unlocked });
          if (result.ending) set({ ending: result.ending });
        },

        dismissResult: () => set({ lastResult: null }),

        buyFurniture: (furnitureId) => {
          const def = FURNITURE_MAP[furnitureId];
          return mutate((g) => {
            if (g.gold < def.costGold || g.ideaPoints < def.costIdea) {
              get().pushToast('재화가 부족합니다');
              return false;
            }
            g.gold -= def.costGold;
            g.ideaPoints -= def.costIdea;
            if (!g.collectedFurniture.includes(furnitureId)) g.collectedFurniture.push(furnitureId);
            const spot = findFreeSpot(g.placedFurniture, g.roomSize, furnitureId);
            if (spot) {
              g.placedFurniture.push({ instanceId: `f${g.instanceSeq++}`, furnitureId, gridX: spot.x, gridY: spot.y, rotation: 0 });
              get().pushToast(`${def.name} 구매 완료! 방에 배치했어요`);
            } else {
              g.inventory.push(furnitureId);
              get().pushToast(`${def.name} 구매! 빈 자리가 없어 창고에 보관`);
            }
          });
        },

        placeFromInventory: (furnitureId, x, y) =>
          mutate((g) => {
            const idx = g.inventory.indexOf(furnitureId);
            if (idx < 0) return false;
            if (!canPlace(g.placedFurniture, g.roomSize, { furnitureId, gridX: x, gridY: y, rotation: 0 })) return false;
            g.inventory.splice(idx, 1);
            g.placedFurniture.push({ instanceId: `f${g.instanceSeq++}`, furnitureId, gridX: x, gridY: y, rotation: 0 });
          }),

        moveFurniture: (instanceId, x, y) =>
          mutate((g) => {
            const p = g.placedFurniture.find((f) => f.instanceId === instanceId);
            if (!p) return false;
            if (!canPlace(g.placedFurniture, g.roomSize, { ...p, gridX: x, gridY: y }, instanceId)) return false;
            p.gridX = x;
            p.gridY = y;
          }),

        rotateFurniture: (instanceId) =>
          void mutate((g) => {
            const p = g.placedFurniture.find((f) => f.instanceId === instanceId);
            if (!p) return false;
            const rot = ((p.rotation + 90) % 360) as 0 | 90 | 180 | 270;
            if (!canPlace(g.placedFurniture, g.roomSize, { ...p, rotation: rot }, instanceId)) return false;
            p.rotation = rot;
          }),

        storeFurniture: (instanceId) =>
          void mutate((g) => {
            const idx = g.placedFurniture.findIndex((f) => f.instanceId === instanceId);
            if (idx < 0) return false;
            g.inventory.push(g.placedFurniture[idx].furnitureId);
            g.placedFurniture.splice(idx, 1);
          }),

        talk: () =>
          void mutate((g) => {
            if (g.talkedThisMonth) {
              get().pushToast('이번 달은 이미 대화했어요');
              return false;
            }
            g.talkedThisMonth = true;
            g.status.affection = Math.min(100, g.status.affection + 3);
            g.status.stress = Math.max(0, g.status.stress - 3);
            get().pushToast('💬 즐거운 대화! 친밀도 +3, 스트레스 -3');
          }),

        giveAllowance: () =>
          void mutate((g) => {
            if (g.gold < 100) return false;
            g.gold -= 100;
            g.status.affection = Math.min(100, g.status.affection + 2);
            get().pushToast('💸 용돈 100G! 친밀도 +2');
          }),

        finishEnding: () => {
          const g = get().game;
          // 2회차 인계: 남은 영감 포인트의 30%
          const carry = g ? Math.floor(g.ideaPoints * 0.3) : 0;
          set((st) => ({ game: null, ending: null, lastResult: null, carryIdea: carry, playthrough: st.playthrough + 1 }));
        },

        quitToTitle: () => set({ lastResult: null }),

        pushToast: (text) => {
          const id = toastSeq++;
          set((st) => ({ toasts: [...st.toasts, { id, text }] }));
          setTimeout(() => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })), 2200);
        },
      };
    },
    {
      name: 'dot-dream-maker-save',
      version: 1,
      partialize: (st) => ({
        game: st.game,
        unlockedEndings: st.unlockedEndings,
        carryIdea: st.carryIdea,
        playthrough: st.playthrough,
        ending: st.ending,
      }),
    },
  ),
);

export const actionName = (id: string) => ACTION_MAP[id]?.name ?? id;
export const endingById = (id: string) => ENDING_MAP[id];
