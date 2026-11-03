import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setMuted, sfx } from '../audio/sfx';
import { FURNITURE_MAP, COMBO_MAP } from '../data/furnitureData';
import { ACTION_MAP } from '../data/scheduleData';
import { ENDING_MAP } from '../data/endingData';
import type { EndingDefinition, Gender, StatKey } from '../types/game';
import { TEMPERAMENTS, type TemperamentId } from '../data/temperamentData';
import { DEFAULT_PARENT, parentTalkBonus, type ParentProfile } from '../data/parentData';
import { canPlace, findFreeSpot } from '../engine/room';
import { resolveParentingEvent, type EventOutcome } from '../engine/parenting';
import { resolveReport } from '../engine/school';
import { readDiary as readDiaryEngine, respondCaught as respondCaughtEngine, skipDiary as skipDiaryEngine } from '../engine/diary';
import { CUTSCENE_MAP } from '../data/cutsceneData';
import { giftOptions, giveGift } from '../data/birthdayData';
import type { Effect, ParentStyle } from '../data/parentingData';
import { addPhoto, finishContest, perfFactor, type ContestResult, createNewGame, refreshCombos, runMonth, type MonthResult, type SaveState } from '../engine/simulation';

export type Toast = { id: number; text: string };

interface GameStore {
  game: SaveState | null;
  /** 다회차 영구 보존: 엔딩 도감 */
  unlockedEndings: string[];
  /** 2회차 인계용 영감 포인트 */
  carryIdea: number;
  playthrough: number;
  lastResult: MonthResult | null;
  /** 월간 스케줄 실행 연출 재생 중 */
  playing: boolean;
  /** 효과음 끄기 */
  muted: boolean;
  toggleMute: () => void;
  /** 배경음악 켜기/끄기 (효과음과 별개) */
  musicOn: boolean;
  toggleMusic: () => void;
  endPlayback: () => void;
  ending: EndingDefinition | null;
  toasts: Toast[];

  /** temperament: 'RANDOM'이면 랜덤으로 정하고 숨김, 직접 고르면 처음부터 공개 */
  newGame: (name: string, gender: Gender, bonus: StatKey, temperament?: TemperamentId | 'RANDOM', parent?: ParentProfile, birthMonth?: number) => void;
  giveGift: (giftId: string) => { liked: boolean; reply: string; delta: Effect } | null;
  setScheduleSlot: (slot: number, actionId: string) => void;
  runMonth: () => void;
  dismissResult: () => void;
  buyFurniture: (furnitureId: string) => boolean;
  placeFromInventory: (furnitureId: string, x: number, y: number) => boolean;
  moveFurniture: (instanceId: string, x: number, y: number) => boolean;
  rotateFurniture: (instanceId: string) => void;
  storeFurniture: (instanceId: string) => void;
  talk: (kind?: 'talk' | 'praise' | 'scold') => void;
  /** 육아 상황에 대한 부모의 선택 → 아이 반응 */
  resolveEvent: (choiceIndex: number) => EventOutcome | null;
  finishCutscene: () => void;
  /** 방에서 아이 쓰다듬기 (한 달에 한 번 친밀도 +1) */
  petChild: () => boolean;
  readDiary: () => ReturnType<typeof readDiaryEngine>;
  skipDiary: () => void;
  respondCaught: (i: number) => { reply: string; delta: Effect } | null;
  /** 대회 판정: perf(0~1)=미니게임 성적, null=응원만 하기(무작위) */
  playContest: (perf: number | null) => ContestResult | null;
  reactReport: (style: ParentStyle) => { reply: string; delta: Effect } | null;
  giveAllowance: () => void;
  finishEnding: () => void;
  quitToTitle: () => void;
  pushToast: (text: string) => void;
}

let toastSeq = 1;

/** localStorage 접근이 막힌 환경(사생활 보호 모드, 미리보기)에서도 게임이 돌아가도록 안전 래핑 */
const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 저장 불가 환경: 무시 */
    }
  },
  removeItem: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* 무시 */
    }
  },
}));

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
        if (newly.length) setTimeout(() => sfx('combo'), 150);
        return true;
      };

      return {
        game: null,
        unlockedEndings: [],
        carryIdea: 0,
        playthrough: 1,
        lastResult: null,
        playing: false,
        muted: false,
        toggleMute: () => {
          const m = !get().muted;
          setMuted(m);
          set({ muted: m });
          if (!m) sfx('click');
        },
        musicOn: true,
        toggleMusic: () => set({ musicOn: !get().musicOn }),
        ending: null,
        toasts: [],
        endPlayback: () => set({ playing: false }),

        newGame: (name, gender, bonus, temperament = 'RANDOM', parent = DEFAULT_PARENT, birthMonth) => {
          const { unlockedEndings, carryIdea } = get();
          const random = temperament === 'RANDOM';
          const t = random ? TEMPERAMENTS[Math.floor(Math.random() * TEMPERAMENTS.length)].id : temperament;
          const g = createNewGame(name, gender, bonus, [...unlockedEndings], carryIdea, t, !random, parent);
          g.birthMonth = birthMonth ?? 1 + Math.floor(Math.random() * 12);
          if (g.birthMonth === 1) g.pendingBirthday = true; // 1월생은 시작하자마자 생일
          set({
            game: g,
            lastResult: null,
            ending: null,
            carryIdea: 0,
          });
        },

        setScheduleSlot: (slot, actionId) =>
          void mutate((g) => {
            g.monthlySchedule[slot] = actionId;
          }),

        runMonth: () => {
          const g = get().game;
          if (!g) return;
          const result = runMonth(g, Math.random, { interactiveContest: true });
          const unlocked = Array.from(new Set([...get().unlockedEndings, ...result.state.unlockedEndings]));
          set({ game: result.state, lastResult: result, unlockedEndings: unlocked, playing: true });
          if (result.ending) set({ ending: result.ending });
        },

        dismissResult: () => set({ lastResult: null, playing: false }),

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
              sfx('buy');
            } else {
              g.inventory.push(furnitureId);
              get().pushToast(`${def.name} 구매! 빈 자리가 없어 창고에 보관`);
              sfx('buy');
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

        talk: (kind = 'talk') =>
          void mutate((g) => {
            if (g.talkedThisMonth) {
              get().pushToast('이번 달은 이미 이야기를 나눴어요');
              return false;
            }
            g.talkedThisMonth = true;
            g.talkKind = kind;
            const st = g.status;
            g.parenting = { WARM: 0, STRICT: 0, FREE: 0, ...g.parenting };
            const hb = parentTalkBonus(g.parent?.points); // 인품 높은 부모는 대화가 더 따뜻하다
            if (kind === 'talk') {
              st.affection = Math.min(100, st.affection + 3 + hb);
              st.stress = Math.max(0, st.stress - 3);
              get().pushToast(`💬 즐거운 대화! 친밀도 +${3 + hb}, 스트레스 -3`);
            } else if (kind === 'praise') {
              st.affection = Math.min(100, st.affection + 4 + hb);
              st.stress = Math.max(0, st.stress - 2);
              g.stats.CHA = Math.min(999, g.stats.CHA + 3);
              g.parenting.WARM += 1;
              get().pushToast(`👏 칭찬해 줬어요! 친밀도 +${4 + hb}, 매력 +3`);
            } else {
              st.delinquency = Math.max(0, st.delinquency - 6);
              st.affection = Math.max(0, st.affection - 3);
              st.stress = Math.min(100, st.stress + 2);
              g.stats.MOR = Math.min(999, g.stats.MOR + 4);
              g.parenting.STRICT += 1;
              get().pushToast('☝️ 차분히 타일렀어요. 비행 -6, 도덕 +4, 친밀도 -3');
            }
          }),

        playContest: (perf) => {
          let out: ContestResult | null = null;
          mutate((g) => {
            const pc = g.pendingContest;
            if (!pc) return false;
            out = finishContest(g, pc.id, perf === null ? 0.85 + Math.random() * 0.3 : perfFactor(perf), [], pc.age);
            g.pendingContest = null;
          });
          return out;
        },

        giveGift: (giftId) => {
          let out: { liked: boolean; reply: string; delta: Effect } | null = null;
          mutate((g) => {
            if (!g.pendingBirthday) return false;
            const gift = giftOptions(g).find((x) => x.id === giftId);
            if (!gift) return false;
            out = giveGift(g, gift);
          });
          return out;
        },

        petChild: () =>
          mutate((g) => {
            if (g.pettedThisMonth) return false;
            g.pettedThisMonth = true;
            g.status.affection = Math.min(100, g.status.affection + 1);
          }),

        readDiary: () => {
          let out: ReturnType<typeof readDiaryEngine> = null;
          mutate((g) => {
            out = readDiaryEngine(g, Math.random);
            if (!out) return false;
          });
          return out;
        },

        skipDiary: () => void mutate((g) => skipDiaryEngine(g)),

        respondCaught: (i) => {
          let out: { reply: string; delta: Effect } | null = null;
          mutate((g) => {
            out = respondCaughtEngine(g, i);
          });
          return out;
        },

        finishCutscene: () =>
          void mutate((g) => {
            const id = g.pendingCutscene;
            if (!id) return false;
            const c = CUTSCENE_MAP[id];
            g.seenCutscenes = [...(g.seenCutscenes ?? []), id];
            g.pendingCutscene = null;
            if (c) addPhoto(g, { emoji: c.emoji, title: c.title, caption: '오늘을 오래오래 기억하고 싶다.', pose: 'cheer' });
          }),

        reactReport: (style) => {
          let out: { reply: string; delta: Effect } | null = null;
          mutate((g) => {
            if (!g.pendingReport) return false;
            out = resolveReport(g, style);
          });
          return out;
        },

        resolveEvent: (choiceIndex) => {
          let out: EventOutcome | null = null;
          mutate((g) => {
            out = resolveParentingEvent(g, choiceIndex);
            if (!out) return false;
          });
          return out;
        },

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
      storage: safeStorage,
      onRehydrateStorage: () => (st) => {
        if (st) setMuted(st.muted);
      },
      partialize: (st) => ({
        muted: st.muted,
        musicOn: st.musicOn,
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
