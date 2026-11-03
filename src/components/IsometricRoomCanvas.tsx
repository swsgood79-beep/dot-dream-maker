import { useEffect, useMemo, useRef, useState } from 'react';
import { FURNITURE_MAP } from '../data/furnitureData';
import { canPlace, computeActiveCombos, footprint, growthStage } from '../engine/room';
import { canvasSize, COMBO_COLORS, depthSorted, furnitureBounds, renderRoom, unproject, type RoomView } from '../render/isoRenderer';
import { FURNITURE_BODY, pixelIconUrl } from '../render/sprites';
import { furnitureFlipped, hasFurnitureSprite } from '../render/furnitureSprites';
import { characterHeight, RES } from '../render/spriteCharacter';
import { besideCells, CharacterSim, doorCell, nearestFreeCell, type Step } from '../render/characterSim';
import { isColdRoom } from '../engine/psyche';
import { CatSim } from '../render/catSim';
import { project } from '../render/isoRenderer';
import { sfx } from '../audio/sfx';
import type { MonthResult, WeekResult } from '../engine/simulation';
import type { Pose } from '../render/character';
import { useGameStore } from '../store/useGameStore';
import { PixelButton, ko } from './ui';
import { catTapLine, childTapLine } from '../data/roomTalk';
import { sceneFor, sceneLine } from '../data/activityScenes';
import { ActivitySceneView } from './ActivitySceneView';

/**
 * 카이로소프트풍 2D 아이소메트릭 도트 방 (HTML5 Canvas)
 * - 가구 탭 → 선택(회전/보관), 빈 바닥 탭 → 선택 가구 이동
 * - placingId가 있으면 창고 가구 배치 모드 (가능한 칸이 초록색)
 */
type Popup = { id: number; text: string; x: number; y: number; stack: number; delay: number; kind: 'stat' | 'combo' | 'great' | 'bad' };
let popupSeq = 1;

const ACT_BUBBLE: Record<WeekResult['actionType'], string> = {
  EDUCATION: '✏️',
  PART_TIME: '💦',
  REST: '💤',
  OUTING: '🎒',
  RUNAWAY: '💢',
};
const HALO: Record<WeekResult['outcome'], string> = {
  GREAT: '#ffd84d',
  SUCCESS: '#5bd6a8',
  FAIL: '#9aa0ad',
  SICK: '#8fe3ff',
  RUNAWAY: '#e5484d',
  NO_GOLD: '#9aa0ad',
  STRIKE: '#7a8bb5',
};

/** 스탯별 팝업 색 (참고 이미지: +INT 초록, +ART 분홍) */
const STAT_POP_COLOR: Record<string, string> = {
  INT: '#8dff6a',
  STR: '#ffa860',
  ART: '#ff7ae0',
  CHA: '#ff9ec7',
  MOR: '#7ae8ff',
  TEC: '#ffe14d',
};
function popupColor(p: Popup): string {
  if (p.kind === 'combo') return '#5bffd0';
  if (p.kind === 'great') return '#ffe14d';
  if (p.kind === 'bad') return '#ff8a8a';
  const stat = Object.keys(STAT_POP_COLOR).find((k) => p.text.includes(k));
  return stat ? STAT_POP_COLOR[stat] : '#ffffff';
}

const POSE_BUBBLE: Partial<Record<Pose, string>> = {
  desk: '✏️', read: '📖', pc: '💻', music: '🎵', draw: '🎨', exercise: '💪', work: '📦', sleep: '💤', tired: '😓',
};

/** 이번 주 행동 → 캐릭터 포즈 (행동 스프라이트) */
const EDU_POSE: Record<string, Pose> = {
  EDU_01: 'desk', EDU_02: 'desk', EDU_03: 'desk', EDU_08: 'desk',
  EDU_04: 'pc', EDU_05: 'music', EDU_06: 'draw', EDU_07: 'exercise',
};
function poseFor(w: WeekResult): Pose {
  if (w.outcome === 'STRIKE') return w.targetInstanceId ? 'sleep' : 'tired';
  if (w.outcome === 'GREAT') return 'cheer';
  if (w.outcome === 'FAIL') return 'tired';
  if (w.actionType === 'REST') return w.targetInstanceId ? 'sleep' : 'read';
  if (w.outcome === 'SICK') return 'tired';
  if (w.actionType === 'EDUCATION') return EDU_POSE[w.actionId] ?? 'read';
  if (w.actionType === 'PART_TIME') return w.actionId === 'JOB_03' ? 'read' : 'work';
  return 'idle';
}

function popupKind(text: string): Popup['kind'] {
  if (text.startsWith('Combo') || text.includes('Lv.')) return 'combo';
  if (text === '대성공!') return 'great';
  if (text.startsWith('-') || text === '실패...' || text === '가출...') return 'bad';
  return 'stat';
}

export function IsometricRoomCanvas({
  placingId,
  onPlaced,
  playback = null,
  onPlaybackDone,
}: {
  placingId: string | null;
  onPlaced: () => void;
  playback?: MonthResult | null;
  onPlaybackDone?: () => void;
}) {
  const game = useGameStore((s) => s.game)!;
  const { moveFurniture, rotateFurniture, storeFurniture, placeFromInventory, pushToast } = useGameStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(2);
  const simRef = useRef(new CharacterSim());
  const catRef = useRef(new CatSim());
  const [popups, setPopups] = useState<Popup[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const haloRef = useRef<string | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [catBubble, setCatBubble] = useState<string | null>(null);
  // 스케줄 연출: 바깥 활동 장면 · 이번 주 한 줄 · 집 안 활동 효과
  const [scene, setScene] = useState<WeekResult | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [fx, setFx] = useState<string[] | null>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const catBubbleRef = useRef<HTMLDivElement>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const petChild = useGameStore((s) => s.petChild);
  const doneRef = useRef(onPlaybackDone);
  doneRef.current = onPlaybackDone;

  const n = game.roomSize;
  // GDD 11.2 방 공기: 공부 가구만 가득 + 스트레스 → 숨 막히는 청회색 방
  const cold = isColdRoom(game);
  const distant = !!game.doorLocked || game.status.affection <= 35;
  const { w, h } = canvasSize(n);
  const sel = game.placedFurniture.find((p) => p.instanceId === selected) ?? null;

  const comboTint = useMemo(() => {
    const { comboIds, members } = computeActiveCombos(game.placedFurniture);
    const m = new Map<string, string>();
    comboIds.forEach((id, i) => members[id].forEach((inst) => m.set(inst, COMBO_COLORS[i % COMBO_COLORS.length])));
    return m;
  }, [game.placedFurniture]);

  const placingCells = useMemo(() => {
    if (!placingId) return null;
    const s = new Set<string>();
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (canPlace(game.placedFurniture, n, { furnitureId: placingId, gridX: x, gridY: y, rotation: 0 })) s.add(`${x},${y}`);
    return s;
  }, [placingId, game.placedFurniture, n]);

  // 컨테이너 크기에 맞춰 표시 배율 계산 (도트가 뭉개지지 않게 pixelated)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(Math.max(1, Math.min((r.width - 4) / w, (r.height - 4) / h)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // ── 월간 스케줄 실행 연출: 1~4주 동안 캐릭터가 가구로 걸어가 행동하고 머리 위로 팝업
  useEffect(() => {
    const sim = simRef.current;
    if (!playback) return;
    const spawnPopups = (texts: string[]) => {
      const a = sim.actor;
      const v = viewRef.current!;
      const [sx, sy] = project(v.n, a.gx, a.gy);
      const top = sy - characterHeight(v.stage, game.gender) - 4;
      const items = texts.map((text, i) => ({
        id: popupSeq++,
        text,
        x: sx,
        y: top,
        stack: texts.length - 1 - i,
        delay: i * 200,
        kind: popupKind(text),
      }));
      setPopups((p) => [...p, ...items]);
      // 효과음: 대성공/실패/레벨업/일반 스탯
      if (texts.includes('대성공!')) sfx('great');
      else if (texts.some((t) => t === '실패...' || t === '가출...')) sfx('fail');
      else if (texts.some((t) => t.includes('Lv.'))) sfx('levelup');
      else sfx('stat');
      const ids = new Set(items.map((x) => x.id));
      setTimeout(() => setPopups((p) => p.filter((x) => !ids.has(x.id))), 1800 + items.length * 220);
    };
    const steps: Step[] = [];
    for (const w of playback.weeks) {
      const outside = w.actionType === 'RUNAWAY' || (!w.targetInstanceId && w.actionType !== 'REST' && w.outcome !== 'STRIKE');
      // 공부 → 독서 포즈, 휴식 → 침대 위에서 책 읽기, 대성공 → 만세 점프, 알바 → 바쁘게 움직이기
      const pose = poseFor(w);
      steps.push({
        kind: 'call',
        fn: () => {
          setBanner(`${w.week + 1}주차 · ${w.emoji} ${w.actionName}`);
          setCaption(null);
          setFx(null);
          setBubble(null);
          haloRef.current = null;
        },
      });
      if (outside) {
        steps.push({ kind: 'goto', resolve: (wd) => doorCell(wd.n) });
        steps.push({ kind: 'call', fn: () => setBubble(ACT_BUBBLE[w.actionType]) });
        steps.push({ kind: 'call', fn: () => sfx('door') });
        steps.push({ kind: 'fade', to: 0, ms: 350 });
        if (sceneFor(w)) {
          // 밖에 있는 동안 그 장소 장면을 보여 줌 (스탯 변화도 장면 안에서)
          steps.push({ kind: 'wait', ms: 300, pose: 'idle', onStart: () => setBubble(null) });
          steps.push({
            kind: 'call',
            fn: () => {
              setScene(w);
              sfx(w.outcome === 'GREAT' ? 'great' : w.outcome === 'FAIL' || w.outcome === 'RUNAWAY' ? 'fail' : 'stat');
            },
          });
          steps.push({ kind: 'wait', ms: 2300, pose: 'idle' });
          steps.push({ kind: 'call', fn: () => setScene(null) });
          steps.push({ kind: 'fade', to: 1, ms: 350 });
          steps.push({ kind: 'wait', ms: 700, pose: w.outcome === 'GREAT' ? 'cheer' : w.outcome === 'FAIL' ? 'tired' : 'idle', onStart: () => {
            haloRef.current = HALO[w.outcome];
            setBubble(w.outcome === 'GREAT' ? '✨' : w.outcome === 'FAIL' ? '😓' : '🏠');
          } });
        } else {
          steps.push({ kind: 'wait', ms: 600, pose: 'idle', onStart: () => setBubble(null) });
          steps.push({ kind: 'fade', to: 1, ms: 350 });
          // 밖에서 돌아올 때는 평소 모습 (앞치마 알바 포즈는 집 안에서 하는 일에만)
          steps.push({ kind: 'wait', ms: 1300, pose: w.outcome === 'GREAT' ? 'cheer' : w.outcome === 'FAIL' ? 'tired' : 'idle', onStart: () => {
            haloRef.current = HALO[w.outcome];
            spawnPopups(w.popups.length ? w.popups : [`${w.goldDelta > 0 ? '+' : ''}${w.goldDelta}G`]);
          } });
        }
      } else {
        steps.push({
          kind: 'goto',
          resolve: (wd) => {
            const target = wd.placed.find((p) => p.instanceId === w.targetInstanceId);
            if (!target) return null;
            const cells = besideCells(wd.n, wd.placed, target);
            return cells[0] ?? null;
          },
        });
        steps.push({ kind: 'wait', ms: 1500, pose, onStart: () => {
          // 침대에서 휴식: 침대 위로 올라가 눕는다
          const v = viewRef.current!;
          const bed = v.placed.find((p) => p.instanceId === w.targetInstanceId);
          if (pose === 'sleep' && bed) {
            const fp = footprint(bed);
            const cx = fp.reduce((a, c) => a + c.x, 0) / fp.length + 0.5;
            const cy = fp.reduce((a, c) => a + c.y, 0) / fp.length + 0.5;
            // 누운 그림(침대 각도로 그려짐)의 발끝이 침대 칸 가운데보다 살짝 아래에 오도록
            sim.actor.drawAt = { gx: cx, gy: cy, lift: hasFurnitureSprite(bed.furnitureId) ? -2 : (FURNITURE_BODY[bed.furnitureId]?.h ?? 6) - 2 };
            // 누운 그림은 머리가 오른쪽 위(침대 머리판 쪽) → 침대가 좌우 반전되어 그려지면 같이 반전
            sim.actor.facing = furnitureFlipped(bed) ? 'L' : 'R';
          }
          haloRef.current = HALO[w.outcome];
          setBubble(w.outcome === 'STRIKE' ? '💢 학원 싫어!!' : w.outcome === 'GREAT' ? '✨' : POSE_BUBBLE[pose] ?? ACT_BUBBLE[w.actionType]);
          setCaption(sceneLine(w) || null);
          const sc = sceneFor(w);
          setFx(w.outcome === 'FAIL' ? ['💦', '😵'] : sc ? (w.outcome === 'GREAT' ? [...sc.fx, '✨'] : sc.fx) : null);
          spawnPopups(w.popups);
        } });
      }
    }
    steps.push({
      kind: 'call',
      fn: () => {
        setBanner(null);
        setBubble(null);
        setScene(null);
        setCaption(null);
        setFx(null);
        haloRef.current = null;
        doneRef.current?.();
      },
    });
    sim.runScript(steps);
    return () => sim.stopScript();
  }, [playback]);

  // 거리감: 새 달이 시작되면 친밀도가 높은 아이는 문 쪽으로 마중 나오고, 낮은 아이는 등을 돌려 구석으로 간다
  useEffect(() => {
    if (playback) return;
    const sim = simRef.current;
    const aff = game.status.affection;
    if (distant) {
      sim.runScript([
        { kind: 'goto', resolve: (wd) => nearestFreeCell(wd.n, wd.placed, { x: wd.n - 1, y: 0 }, new Set()) },
        { kind: 'wait', ms: 2200, pose: 'idle', onStart: () => setBubble('...') },
        { kind: 'call', fn: () => setBubble(null) },
      ]);
    } else if (aff >= 70) {
      sim.runScript([
        { kind: 'goto', resolve: (wd) => nearestFreeCell(wd.n, wd.placed, { x: 1, y: wd.n - 1 }, new Set()) },
        { kind: 'wait', ms: 1800, pose: 'cheer', onStart: () => setBubble('❤️') },
        { kind: 'call', fn: () => setBubble(null) },
      ]);
    }
  }, [game.month, game.age]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipPlayback = () => {
    simRef.current.stopScript();
    setBanner(null);
    setBubble(null);
    setScene(null);
    setCaption(null);
    setFx(null);
    setPopups([]);
    haloRef.current = null;
    doneRef.current?.();
  };

  // 최신 뷰 상태를 ref에 담아 rAF 루프에서 그림
  const viewRef = useRef<Omit<RoomView, 'time'>>(null);
  const movingId = sel && !placingId ? sel.instanceId : null;
  viewRef.current = {
    n,
    placed: game.placedFurniture,
    stage: growthStage(game.age),
    comboTint,
    selectedId: playback ? null : selected,
    placingCells,
    actor: { actor: simRef.current.actor, gender: game.gender },
    tired: game.status.stress >= 80,
    // 반려묘 쿠션이 있으면 고양이는 쿠션 그림 속에서 잠 (쿠션 그림에 고양이가 그려져 있음)
    cat: game.placedFurniture.some((p) => p.furnitureId === 'cat_cushion') ? null : catRef.current.actor,
    ghost:
      hover && (placingId || movingId)
        ? (() => {
            const fid = placingId ?? sel!.furnitureId;
            const rot = placingId ? 0 : sel!.rotation;
            const valid = canPlace(game.placedFurniture, n, { furnitureId: fid, gridX: hover.x, gridY: hover.y, rotation: rot }, movingId ?? undefined);
            return { furnitureId: fid, x: hover.x, y: hover.y, rotation: rot, valid };
          })()
        : null,
  };

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(100, t - last);
      last = t;
      const v = viewRef.current;
      if (v) {
        // 서로 겹치지 않기: 아이가 우선, 고양이가 양보
        const child = simRef.current;
        const cat = catRef.current;
        const catOn = !!v.cat;
        const union = (...sets: Set<string>[]) => new Set(sets.flatMap((x) => [...x]));
        const here = (gx: number, gy: number) => new Set([`${Math.floor(gx)},${Math.floor(gy)}`]);
        child.update(dt, { n: v.n, placed: v.placed, avoid: catOn ? here(cat.actor.gx, cat.actor.gy) : new Set() });
        if (catOn) cat.update(dt, v.n, v.placed, union(child.occupied()));
        renderRoom(ctx, { ...v, time: t, actorHalo: haloRef.current });
        // 말풍선이 캐릭터 머리 위를 따라다니도록 DOM 위치 갱신
        const b = bubbleRef.current;
        if (b) {
          const a = simRef.current.actor;
          const [sx, sy] = project(v.n, a.gx, a.gy);
          const sc = scaleRef.current;
          b.style.transform = `translate(${sx * sc}px, ${(sy - characterHeight(v.stage, game.gender) - 6) * sc}px) translate(-50%, -100%)`;
        }
        const fr = fxRef.current;
        if (fr) {
          const a = simRef.current.actor;
          const [fx0, fy0] = project(v.n, a.gx, a.gy);
          fr.style.transform = `translate(${fx0 * scaleRef.current}px, ${(fy0 - characterHeight(v.stage, game.gender) * 0.6) * scaleRef.current}px)`;
        }
        const cb = catBubbleRef.current;
        if (cb) {
          const [cx, cy] = project(v.n, cat.actor.gx, cat.actor.gy);
          cb.style.transform = `translate(${cx * scaleRef.current}px, ${(cy - 22) * scaleRef.current}px) translate(-50%, -100%)`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toLogical = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { lx: ((e.clientX - r.left) * w) / r.width, ly: ((e.clientY - r.top) * h) / r.height };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (playback) return;
    const { lx, ly } = toLogical(e);
    const cell = unproject(n, lx, ly);

    if (placingId) {
      if (cell && placeFromInventory(placingId, cell.x, cell.y)) onPlaced();
      else pushToast('여기엔 놓을 수 없어요');
      return;
    }

    // 아이·고양이를 누르면 반응 (가구 배치 중이 아닐 때)
    const onActor = (gx: number, gy: number, height: number, width: number) => {
      const [sx, sy] = project(n, gx, gy);
      return lx >= sx - width / 2 && lx <= sx + width / 2 && ly >= sy - height && ly <= sy + 3;
    };
    const ch = simRef.current.actor;
    if (!sel && onActor(ch.gx, ch.gy, characterHeight(growthStage(game.age), game.gender), 24) && distant) {
      // 마음이 멀어진 아이: 휙 등을 돌려 구석으로
      simRef.current.runScript([
        { kind: 'goto', resolve: (wd) => nearestFreeCell(wd.n, wd.placed, { x: wd.n - 1, y: 0 }, new Set()) },
        { kind: 'wait', ms: 1500, pose: 'idle' },
      ]);
      setBubble(game.doorLocked ? '🔒 ...나가 줘.' : '☁️ ...');
      sfx('sad');
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => setBubble(null), 1800);
      return;
    }
    if (!sel && onActor(ch.gx, ch.gy, characterHeight(growthStage(game.age), game.gender), 24)) {
      const r = childTapLine(game);
      const petted = petChild();
      simRef.current.runScript([{ kind: 'wait', ms: 1600, pose: r.pose }]);
      setBubble(petted ? `❤️ ${r.text}` : r.text);
      sfx(r.pose === 'cheer' ? 'happy' : r.pose === 'tired' ? 'sad' : 'page');
      if (petted) pushToast('🤚 쓰다듬어 줬어요! 친밀도 +1 (한 달에 한 번)');
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => setBubble(null), 1800);
      return;
    }
    const catA = catRef.current.actor;
    const catShown = !game.placedFurniture.some((p) => p.furnitureId === 'cat_cushion');
    if (!sel && catShown && onActor(catA.gx, catA.gy, 18, 24)) {
      catRef.current.poke();
      setCatBubble(catTapLine());
      sfx('stat');
      setTimeout(() => setCatBubble(null), 1500);
      return;
    }

    // 앞쪽 가구부터 탭 판정
    const hit = [...depthSorted(game.placedFurniture)].reverse().find((p) => {
      const b = furnitureBounds(n, p);
      return lx >= b.left && lx <= b.right && ly >= b.top && ly <= b.bottom;
    });
    const occupied = cell ? game.placedFurniture.some((p) => footprint(p).some((c) => c.x === cell.x && c.y === cell.y)) : false;
    // 다른 가구를 탭 → 선택 전환
    if (hit && hit.instanceId !== selected) {
      setSelected(hit.instanceId);
      return;
    }
    // 선택된 가구가 있고 빈 바닥을 탭 → 이동
    if (sel && cell && !occupied) {
      if (!moveFurniture(sel.instanceId, cell.x, cell.y)) pushToast('여기엔 놓을 수 없어요');
      return;
    }
    setSelected(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const { lx, ly } = toLogical(e);
    const c = unproject(n, lx, ly);
    setHover((prev) => (prev?.x === c?.x && prev?.y === c?.y ? prev : c));
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={wrapRef} className="relative flex min-h-0 flex-1 items-center justify-center">
        <div className="relative" style={{ width: w * scale, height: h * scale }}>
          <canvas
            ref={canvasRef}
            width={w * RES}
            height={h * RES}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHover(null)}
            style={{ width: w * scale, height: h * scale, imageRendering: 'pixelated', touchAction: 'manipulation', filter: cold ? 'saturate(0.45) hue-rotate(175deg) brightness(0.88)' : undefined, transition: 'filter 1.2s' }}
          />
          {/* 머리 위 말풍선 */}
          <div ref={bubbleRef} className="pointer-events-none absolute top-0 left-0" style={{ visibility: bubble ? 'visible' : 'hidden' }}>
            <div className="pop-in border-2 border-ink bg-white px-1 text-sm leading-tight shadow-[2px_2px_0_rgba(0,0,0,.4)]">{bubble}</div>
          </div>
          <div ref={fxRef} className="pointer-events-none absolute top-0 left-0">
            {fx?.map((e, i) => (
              <span
                key={`${e}-${i}-${caption}`}
                className="scene-fx text-base font-bold"
                style={{ left: (i - fx.length / 2) * 14, top: 0, animationDelay: `${i * 0.3}s`, ['--dx' as string]: `${(i % 2 ? 1 : -1) * 10}px`, color: '#5bff8a' }}
              >
                {e}
              </span>
            ))}
          </div>
          <div ref={catBubbleRef} className="pointer-events-none absolute top-0 left-0" style={{ visibility: catBubble ? 'visible' : 'hidden' }}>
            <div className="pop-in border-2 border-ink bg-[#fff6e5] px-1 text-xs leading-tight shadow-[2px_2px_0_rgba(0,0,0,.4)]">{catBubble}</div>
          </div>
          {/* 방문 잠금 */}
          {game.doorLocked &&
            (() => {
              const [lx, ly] = project(n, 0.05, n - 0.5);
              return (
                <span className="pointer-events-none absolute animate-pulse leading-none" style={{ left: lx * scale, top: (ly - 30) * scale, fontSize: 14 * scale, transform: 'translate(-50%, -50%)' }}>
                  🔒
                </span>
              );
            })()}
          {/* 12월: 빈 뒷벽 칸에 크리스마스트리 */}
          {game.month === 12 &&
            (() => {
              const taken = new Set(game.placedFurniture.flatMap((p) => footprint(p).map((c) => `${c.x},${c.y}`)));
              const spot = [...Array.from({ length: n }, (_, i) => ({ x: n - 1 - i, y: 0 })), ...Array.from({ length: n }, (_, i) => ({ x: 0, y: i }))].find(
                (c) => !taken.has(`${c.x},${c.y}`) && !(c.x === 0 && c.y === n - 1),
              );
              if (!spot) return null;
              const [tx, ty] = project(n, spot.x + 0.5, spot.y + 0.5);
              return (
                <span className="pointer-events-none absolute leading-none" style={{ left: tx * scale, top: ty * scale, fontSize: 34 * scale, transform: 'translate(-50%, -88%)' }}>
                  🎄
                </span>
              );
            })()}
          {/* 플로팅 스탯 팝업 */}
          {popups.map((p) => (
            <span
              key={p.id}
              className="popup-float pointer-events-none absolute text-[16px] font-bold whitespace-nowrap"
              style={{ left: p.x * scale, top: p.y * scale - p.stack * 19, animationDelay: `${p.delay}ms`, color: popupColor(p) }}
            >
              {ko(p.text)}
            </span>
          ))}
        </div>
        {scene && <ActivitySceneView week={scene} stage={growthStage(game.age)} gender={game.gender} />}
        {banner && (
          <div className="pop-in pointer-events-none absolute top-2 left-1/2 z-30 -translate-x-1/2 border-3 border-ink bg-gold px-3 py-1 text-xs font-bold whitespace-nowrap shadow-[3px_3px_0_#000]">
            {banner}
          </div>
        )}
        {caption && !scene && (
          <div key={caption} className="pop-in pointer-events-none absolute right-3 bottom-2 left-3 z-30 rounded border-2 border-ink bg-[#fffaf0]/95 px-2 py-1 text-center text-[11px] font-bold text-ink shadow-[2px_2px_0_rgba(0,0,0,.3)]">
            {caption}
          </div>
        )}
      </div>
      <div className="flex h-11 shrink-0 items-center justify-center px-2 text-xs text-white">
        {playback ? (
          <PixelButton className="!px-3 !py-1 !text-[11px]" onClick={skipPlayback}>
            ▶▶ 건너뛰기
          </PixelButton>
        ) : placingId ? (
          <span className="flex items-center gap-1">
            <img src={pixelIconUrl(placingId)} className="h-5 w-5" style={{ imageRendering: 'pixelated' }} alt="" />
            {FURNITURE_MAP[placingId].name} — 초록 칸을 탭해서 배치
          </span>
        ) : sel ? (
          <div className="flex items-center gap-2">
            <img src={pixelIconUrl(sel.furnitureId)} className="h-5 w-5" style={{ imageRendering: 'pixelated' }} alt="" />
            <span>{FURNITURE_MAP[sel.furnitureId].name}</span>
            <PixelButton className="!px-2 !py-1 !text-[10px]" onClick={() => rotateFurniture(sel.instanceId)}>↻ 회전</PixelButton>
            <PixelButton
              className="!px-2 !py-1 !text-[10px]"
              color="bg-white"
              onClick={() => {
                storeFurniture(sel.instanceId);
                setSelected(null);
              }}
            >
              📦 보관
            </PixelButton>
            <PixelButton className="!px-2 !py-1 !text-[10px]" color="bg-white" onClick={() => setSelected(null)}>✕</PixelButton>
          </div>
        ) : (
          <span className="opacity-70">아이·고양이를 눌러 보세요 · 가구를 탭해서 선택 → 빈 바닥을 탭해서 이동</span>
        )}
      </div>
    </div>
  );
}
