import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setMuted, sfx } from '../audio/sfx';
import { FURNITURE_MAP, COMBO_MAP } from '../data/furnitureData';
import { ACTION_MAP } from '../data/scheduleData';
import { ENDING_IDS, ENDING_MAP } from '../data/endingData';
import type { EndingDefinition, Gender, StatKey } from '../types/game';
import { TEMPERAMENTS, type TemperamentId } from '../data/temperamentData';
import { DEFAULT_PARENT, parentTalkBonus, type ParentProfile } from '../data/parentData';
import { canPlace, findFreeSpot } from '../engine/room';
import { applyEffect, recordStyle, resolveParentingEvent, type EventOutcome } from '../engine/parenting';
import { REC_CHOICES, bumpAttitude, dominantAttitude } from '../engine/psyche';
import { visitNight, type HomeworkWay, type Lunch, type NightTouch } from '../engine/parentTouch';
import { finishYear, type YearGoal } from '../engine/yearReview';
import { negotiate as negotiateEngine, planMode, preparePlan as preparePlanEngine, SUPPORT_META, type Advice, type NegoLine, type Support } from '../engine/negotiate';
import { resolveEmotion, type EmoPick, type EmoResult } from '../engine/emotion';
import { resolveEncounter, type TownOutcome } from '../engine/town';
import { resolveSpecial, type SpecialPlay } from '../engine/specialDay';
import { resolveReport } from '../engine/school';
import { readDiary as readDiaryEngine, respondCaught as respondCaughtEngine, skipDiary as skipDiaryEngine } from '../engine/diary';
import { CUTSCENE_MAP } from '../data/cutsceneData';
import { giftOptions, giveGift } from '../data/birthdayData';
import { makeHallEntry, newAchievements, type HallEntry } from '../data/legacyData';
import type { Effect, ParentStyle } from '../data/parentingData';
import { monthIndex, addPhoto, finishContest, perfFactor, type ContestResult, createNewGame, refreshCombos, runMonth, type MonthResult, type SaveState } from '../engine/simulation';

export type Toast = { id: number; text: string };

interface GameStore {
  game: SaveState | null;
  /** 다회차 영구 보존: 엔딩 도감 */
  unlockedEndings: string[];
  /** 2회차 인계용 영감 포인트 */
  carryIdea: number;
  playthrough: number;
  lastResult: MonthResult | null;
  /** 명예의 전당: 지금까지 키운 아이들 (다회차 영구 보존) */
  hallOfFame: HallEntry[];
  /** 달성한 업적 ID (다회차 영구 보존) */
  achievements: string[];
  /** 이번 엔딩에서 새로 달성한 업적 */
  newAchievements: string[];
  /** 오프닝을 봤는지 / 튜토리얼을 마쳤는지 / 처음 보는 창 도움말 */
  introSeen: boolean;
  tutorialDone: boolean;
  tipsSeen: string[];
  setIntroSeen: (v: boolean) => void;
  setTutorialDone: (v: boolean) => void;
  seeTip: (id: string) => void;
  /** 저장 백업: 코드로 내보내기 / 불러오기 */
  exportSave: () => string;
  importSave: (code: string) => boolean;
  /** 모든 기록 초기화 */
  resetAll: () => void;
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
  preparePlan: () => void;
  finishYearReview: (goal: YearGoal | null) => void;
  setTargetEnding: (id: string | null) => void;
  /** 지난 판까지 포함해 본 적 있는 컷신 (2회차 건너뛰기용, 영구 보존) */
  seenEver: string[];
  setNegoHow: (slot: number, how: 'ASK' | 'FORCE') => void;
  doNegotiate: () => NegoLine[];
  /** 방금 한 협상 결과 (저장 안 함) */
  negoLines: NegoLine[] | null;
  chooseSupport: (kind: Support, advice?: Advice) => boolean;
  runMonth: (months?: number) => void;
  dismissResult: () => void;
  /** 연속 진행: 이번 달 뒤에 더 진행할 달 수 (저장 안 함) */
  autoLeft: number;
  stopAuto: () => void;
  /** 연출 속도 1 · 2배 */
  speed: 1 | 2;
  toggleSpeed: () => void;
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
  /** 관찰 카메라 대응: 'gold' = 관찰 후 해금되는 공감 코칭, 0/1 = 일반 대응 */
  resolveActing: (choice: 'gold' | 0 | 1, clues?: number) => { reply: string; delta: Effect } | null;
  markActingSeen: () => void;
  dismissUnlock: () => void;
  visitNight: (kind: NightTouch) => { delta: Effect; talk: string | null } | null;
  helpHomework: (way: HomeworkWay, pick?: number) => { delta: Effect; reply: string; correct?: boolean } | null;
  packLunch: (kind: Lunch) => Effect | null;
  townResolve: (encId: string, pick: number) => TownOutcome | null;
  playEmotion: (picks: EmoPick[], shut: boolean) => EmoResult | null;
  finishOuting: () => void;
  playSpecial: (p: SpecialPlay) => { text: string; title: string; delta: Effect; photo: boolean } | null;
  clearNew: (ids: string[]) => void;
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
        hallOfFame: [],
        achievements: [],
        newAchievements: [],
        introSeen: false,
        tutorialDone: false,
        tipsSeen: [],
        setIntroSeen: (v) => set({ introSeen: v }),
        setTutorialDone: (v) => set({ tutorialDone: v }),
        seeTip: (id) => {
          const t = get().tipsSeen ?? [];
          if (!t.includes(id)) set({ tipsSeen: [...t, id] });
        },
        exportSave: () => {
          const st = get();
          const data = {
            v: 1,
            game: st.game,
            unlockedEndings: st.unlockedEndings,
            carryIdea: st.carryIdea,
            playthrough: st.playthrough,
            hallOfFame: st.hallOfFame,
            achievements: st.achievements,
          };
          return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        },
        importSave: (code) => {
          try {
            const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
            if (!data || data.v !== 1 || !Array.isArray(data.unlockedEndings)) return false;
            set({
              game: data.game ?? null,
              unlockedEndings: data.unlockedEndings,
              carryIdea: data.carryIdea ?? 0,
              playthrough: data.playthrough ?? 1,
              hallOfFame: data.hallOfFame ?? [],
              achievements: data.achievements ?? [],
              ending: null,
              lastResult: null,
            });
            return true;
          } catch {
            return false;
          }
        },
        resetAll: () =>
          set({
            game: null,
            unlockedEndings: [],
            carryIdea: 0,
            playthrough: 1,
            hallOfFame: [],
            achievements: [],
            newAchievements: [],
            ending: null,
            lastResult: null,
            introSeen: false,
            tutorialDone: false,
            tipsSeen: [],
          }),
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
        autoLeft: 0,
        stopAuto: () => set({ autoLeft: 0 }),
        speed: 1,
        toggleSpeed: () => set({ speed: get().speed === 2 ? 1 : 2 }),
        ending: null,
        toasts: [],
        endPlayback: () => set({ playing: false }),

        newGame: (name, gender, bonus, temperament = 'RANDOM', parent = DEFAULT_PARENT, birthMonth) => {
          const { unlockedEndings, carryIdea } = get();
          const random = temperament === 'RANDOM';
          const t = random ? TEMPERAMENTS[Math.floor(Math.random() * TEMPERAMENTS.length)].id : temperament;
          const g = createNewGame(name, gender, bonus, [...unlockedEndings], carryIdea, t, !random, parent);
          // 지난 판에 키운 아이가 어른이 되어 찾아온다
          const prev = (get().hallOfFame ?? []).slice(-1)[0];
          // 절연으로 끝난 아이는 찾아오지 않는다 (GDD 11.3: 건강한 자립 → 가문 멘토)
          if (prev && prev.relation !== 'HOLLOW') g.prevChild = { name: prev.name, gender: prev.gender, endingId: prev.endingId };
          g.birthMonth = birthMonth ?? 1 + Math.floor(Math.random() * 12);
          set({
            game: g,
            lastResult: null,
            ending: null,
            carryIdea: 0,
          });
        },

        setScheduleSlot: (slot, actionId) =>
          void mutate((g) => {
            // 청년기는 아이가 정함, 청소년기는 이야기를 마친 뒤엔 못 바꿈
            if (planMode(g.age) === 'AUTONOMY' || (planMode(g.age) === 'NEGOTIATE' && g.negoDone)) return false;
            g.monthlySchedule[slot] = actionId;
          }),
        setTargetEnding: (id) =>
          void mutate((g) => {
            g.targetEnding = g.targetEnding === id ? null : id;
          }),
        seenEver: [],
        finishYearReview: (goal) =>
          void mutate((g) => {
            finishYear(g, goal);
          }),
        preparePlan: () =>
          void mutate((g) => {
            set({ negoLines: null });
            if (planMode(g.age) === 'PARENT' || g.planFor === monthIndex(g)) return false;
            preparePlanEngine(g);
          }),
        setNegoHow: (slot, how) =>
          void mutate((g) => {
            const h = [...(g.negoHow ?? ['ASK', 'ASK', 'ASK', 'ASK'])];
            h[slot] = how;
            g.negoHow = h;
          }),
        negoLines: null,
        doNegotiate: () => {
          let out: NegoLine[] = [];
          mutate((g) => {
            if (g.negoDone) return false;
            out = negotiateEngine(g);
          });
          set({ negoLines: out });
          return out;
        },
        chooseSupport: (kind, advice) => {
          let ok = false;
          mutate((g) => {
            if (g.support) return false;
            const cost = SUPPORT_META[kind].cost ?? 0;
            if (g.gold < cost) {
              get().pushToast('골드가 부족해요');
              return false;
            }
            g.gold -= cost;
            g.support = kind;
            if (kind === 'CHEER') {
              g.status.stress = Math.max(0, g.status.stress - 10);
              g.status.affection = Math.min(100, g.status.affection + 3);
              g.trust = Math.min(100, (g.trust ?? 50) + 2);
            }
            if (kind === 'ADVICE' && advice) g.advice = advice;
            ok = true;
          });
          return ok;
        },

        runMonth: (months = 1) => {
          const g = get().game;
          if (!g) return;
          set({ autoLeft: Math.max(0, months - 1) });
          const result = runMonth(g, Math.random, { interactiveContest: true, childPlans: true });
          const unlocked = Array.from(new Set([...get().unlockedEndings, ...result.state.unlockedEndings]));
          set({ game: result.state, lastResult: result, unlockedEndings: unlocked, playing: true });
          if (result.ending) {
            // 명예의 전당 기록 + 업적 판정
            const { hallOfFame, achievements, playthrough } = get();
            const hall = [...(hallOfFame ?? []), makeHallEntry(result.state, result.ending, playthrough)];
            const fresh = newAchievements(result.state, result.ending, { hall, unlockedEndings: unlocked }, achievements ?? []);
            set({ ending: result.ending, hallOfFame: hall, achievements: [...(achievements ?? []), ...fresh], newAchievements: fresh });
          }
        },

        dismissResult: () => set({ lastResult: null, playing: false }),

        buyFurniture: (furnitureId) => {
          const def = FURNITURE_MAP[furnitureId];
          return mutate((g) => {
            // 방임형: 대화 대신 물건 → 가구 15% 할인 (GDD 11.1)
            const cost = dominantAttitude(g) === 'NEGLECT' ? Math.round(def.costGold * 0.85) : def.costGold;
            if (g.gold < cost || g.ideaPoints < def.costIdea) {
              get().pushToast('재화가 부족합니다');
              return false;
            }
            g.gold -= cost;
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
            const hb = parentTalkBonus(g.parent?.points); // 인품 높은 부모는 대화가 더 따뜻하다
            // 방문이 잠겨 있으면 문 너머로만 이야기 → 효과 절반
            const lock = g.doorLocked ? 0.5 : 1;
            const lockNote = g.doorLocked ? ' (🔒 문 너머로)' : '';
            if (kind === 'talk') {
              const a = Math.round((3 + hb) * lock);
              st.affection = Math.min(100, st.affection + a);
              st.stress = Math.max(0, st.stress - 3);
              get().pushToast(`💬 대화했어요! 친밀도 +${a}, 스트레스 -3${lockNote}`);
            } else if (kind === 'praise') {
              const a = Math.round((4 + hb) * lock);
              st.affection = Math.min(100, st.affection + a);
              st.stress = Math.max(0, st.stress - 2);
              g.stats.CHA = Math.min(999, g.stats.CHA + 3);
              recordStyle(g, 'WARM');
              get().pushToast(`👏 칭찬해 줬어요! 친밀도 +${a}, 매력 +3, 자존감↑${lockNote}`);
            } else {
              st.delinquency = Math.max(0, st.delinquency - 6);
              st.affection = Math.max(0, st.affection - 3);
              st.stress = Math.min(100, st.stress + 2);
              g.stats.MOR = Math.min(999, g.stats.MOR + 4);
              recordStyle(g, 'STRICT');
              get().pushToast('☝️ 타일렀어요. 비행 -6, 도덕 +4, 친밀도 -3, 자존감↓');
            }
          }),

        visitNight: (kind) => {
          let out: { delta: Effect; talk: string | null } | null = null;
          mutate((g) => {
            out = visitNight(g, kind);
            if (!out) return false;
          });
          return out;
        },
        helpHomework: (way, pick) => {
          let out: { delta: Effect; reply: string; correct?: boolean } | null = null;
          mutate((g) => {
            const hw = g.homeworkAsk;
            if (!hw) return false;
            let fx: Effect;
            let reply: string;
            let correct: boolean | undefined;
            if (way === 'TOGETHER') {
              correct = pick === hw.answer;
              fx = correct ? { INT: 5, affection: 3, selfEsteem: 2 } : { INT: 2, affection: 2 };
              reply = correct ? '와 맞았다! 엄마 아빠랑 하니까 쉽다!' : '어? 엄마 아빠도 틀렸네ㅋㅋ 그래도 같이 하니까 재밌어!';
              recordStyle(g, 'WARM');
            } else if (way === 'TELL') {
              fx = { INT: 3, autonomy: -2 };
              reply = '아 그렇구나. ...다음에도 알려 줘!';
              recordStyle(g, 'PROTECT');
            } else {
              fx = { INT: 1, autonomy: 3, stress: 2 };
              reply = '치... 알았어. 혼자 해 볼게. (끙끙)';
              recordStyle(g, 'FREE');
            }
            const delta = applyEffect(g, fx);
            g.homeworkAsk = null;
            out = { delta, reply, correct };
          });
          return out;
        },
        playEmotion: (picks, shut) => {
          let out: EmoResult | null = null;
          mutate((g) => {
            out = resolveEmotion(g, picks, shut);
            if (!out) return false;
          });
          return out;
        },
        townResolve: (encId, pick) => {
          let out: TownOutcome | null = null;
          mutate((g) => {
            out = resolveEncounter(g, encId, pick);
            if (!out) return false;
          });
          return out;
        },
        finishOuting: () =>
          void mutate((g) => {
            g.outingDone = true;
          }),
        playSpecial: (p) => {
          let out: { text: string; title: string; delta: Effect; photo: boolean } | null = null;
          mutate((g) => {
            const r = resolveSpecial(g, p);
            if (!r) return;
            out = { text: r.text, title: r.result.title, delta: r.delta, photo: !!r.result.photo };
          });
          return out;
        },
        packLunch: (kind) => {
          let out: Effect | null = null;
          mutate((g) => {
            if (g.lunchbox) return false;
            g.lunchbox = kind;
            out = applyEffect(g, { affection: 2, stress: -3 });
          });
          return out;
        },
        dismissUnlock: () =>
          mutate((g) => {
            if (!g.pendingUnlock) return false;
            g.pendingUnlock = null;
          }),
        clearNew: (ids) =>
          mutate((g) => {
            if (!g.newContent?.some((i) => ids.includes(i))) return false;
            g.newContent = g.newContent.filter((i) => !ids.includes(i));
          }),

        markActingSeen: () =>
          mutate((g) => {
            if (!g.acting || g.acting.seen) return false;
            g.acting = { ...g.acting, seen: true };
          }),

        resolveActing: (choice, clues = 0) => {
          let out: { reply: string; delta: Effect } | null = null;
          mutate((g) => {
            const act = g.acting;
            if (!act) return false;
            const set = REC_CHOICES[act.kind];
            let delta: Effect;
            let reply: string;
            if (choice === 'gold') {
              // 단서를 모두 찾았으면 속마음을 더 정확히 알아서 처방이 더 잘 듣는다 (좋은 효과 ×1.3)
              const boost = clues >= 3 ? 1.3 : 1;
              const goodWay = (k: string, v: number) => (k === 'stress' || k === 'delinquency' ? v < 0 : v > 0 && k !== 'gold');
              const fx = Object.fromEntries(Object.entries(set.gold.fx).map(([k, v]) => [k, goodWay(k, v as number) ? Math.round((v as number) * boost) : v])) as Effect;
              delta = applyEffect(g, fx);
              recordStyle(g, 'WARM');
              bumpAttitude(g, 'COACHING', 2); // 관찰 후 공감 코칭은 코칭형으로 크게 기울어진다
              g.actionCounts.REC_GOLD = (g.actionCounts.REC_GOLD ?? 0) + 1;
              reply = set.gold.reply;
              if (set.gold.easeSchedule) {
                // 다음 달 학원 하나를 휴식으로
                const i = g.monthlySchedule.findIndex((id) => id.startsWith('EDU_'));
                if (i >= 0) g.monthlySchedule[i] = 'REST_01';
              }
            } else {
              const c = set.others[choice];
              delta = applyEffect(g, c.fx);
              const psy = recordStyle(g, c.style);
              for (const [k, v] of Object.entries(psy)) (delta as Record<string, number>)[k] = ((delta as Record<string, number>)[k] ?? 0) + (v as number);
              reply = c.reply;
            }
            g.acting = null;
            out = { reply, delta };
          });
          return out;
        },

        playContest: (perf) => {
          let out: ContestResult | null = null;
          mutate((g) => {
            const pc = g.pendingContest;
            if (!pc) return false;
            out = finishContest(g, pc.id, perf === null ? 0.85 + Math.random() * 0.3 : perfFactor(perf), [], pc.age, pc.lunch);
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
            if (!get().seenEver.includes(id)) set({ seenEver: [...get().seenEver, id] });
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
            g.allowanceThisMonth = true;
            g.status.affection = Math.min(100, g.status.affection + 2);
            get().pushToast('💸 용돈 100G! 친밀도 +2');
          }),

        finishEnding: () => {
          const g = get().game;
          // 2회차 인계: 남은 영감 포인트의 30%
          // 새 업적 하나당 영감 +3 추가 인계
          const carry = g ? Math.floor(g.ideaPoints * 0.3) + 3 * (get().newAchievements?.length ?? 0) : 0;
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
        // 없앤 엔딩(44번)은 도감 기록에서 빼서 "n / 49"가 넘치지 않게
        if (st && st.unlockedEndings?.some((id) => !ENDING_IDS.has(id))) {
          const keep = (ids: string[]) => ids.filter((id) => ENDING_IDS.has(id));
          setTimeout(() =>
            useGameStore.setState((cur) => ({
              unlockedEndings: keep(cur.unlockedEndings),
              game: cur.game ? { ...cur.game, unlockedEndings: keep(cur.game.unlockedEndings ?? []) } : cur.game,
            })),
          );
        }
      },
      partialize: (st) => ({
        muted: st.muted,
        musicOn: st.musicOn,
        speed: st.speed,
        seenEver: st.seenEver,
        game: st.game,
        unlockedEndings: st.unlockedEndings,
        carryIdea: st.carryIdea,
        playthrough: st.playthrough,
        ending: st.ending,
        hallOfFame: st.hallOfFame,
        achievements: st.achievements,
        newAchievements: st.newAchievements,
        introSeen: st.introSeen,
        tutorialDone: st.tutorialDone,
        tipsSeen: st.tipsSeen,
      }),
    },
  ),
);

export const actionName = (id: string) => ACTION_MAP[id]?.name ?? id;
export const endingById = (id: string) => ENDING_MAP[id];
