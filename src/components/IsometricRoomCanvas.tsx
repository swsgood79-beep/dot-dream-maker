import { useEffect, useMemo, useRef, useState } from 'react';
import { FURNITURE_MAP } from '../data/furnitureData';
import { canPlace, computeActiveCombos, footprint, growthStage } from '../engine/room';
import { canvasSize, COMBO_COLORS, depthSorted, furnitureBounds, renderRoom, unproject, type RoomView } from '../render/isoRenderer';
import { pixelIconUrl } from '../render/sprites';
import { useGameStore } from '../store/useGameStore';
import { PixelButton } from './ui';

/**
 * 카이로소프트풍 2D 아이소메트릭 도트 방 (HTML5 Canvas)
 * - 가구 탭 → 선택(회전/보관), 빈 바닥 탭 → 선택 가구 이동
 * - placingId가 있으면 창고 가구 배치 모드 (가능한 칸이 초록색)
 */
export function IsometricRoomCanvas({ placingId, onPlaced }: { placingId: string | null; onPlaced: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const { moveFurniture, rotateFurniture, storeFurniture, placeFromInventory, pushToast } = useGameStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(2);

  const n = game.roomSize;
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
      setScale(Math.max(1, Math.min((r.width - 8) / w, (r.height - 8) / h)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  // 최신 뷰 상태를 ref에 담아 rAF 루프에서 그림
  const viewRef = useRef<Omit<RoomView, 'time'>>(null);
  const movingId = sel && !placingId ? sel.instanceId : null;
  viewRef.current = {
    n,
    placed: game.placedFurniture,
    stage: growthStage(game.age),
    comboTint,
    selectedId: selected,
    placingCells,
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
    const loop = (t: number) => {
      if (viewRef.current) renderRoom(ctx, { ...viewRef.current, time: t });
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
    const { lx, ly } = toLogical(e);
    const cell = unproject(n, lx, ly);

    if (placingId) {
      if (cell && placeFromInventory(placingId, cell.x, cell.y)) onPlaced();
      else pushToast('여기엔 놓을 수 없어요');
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
      <div ref={wrapRef} className="flex min-h-0 flex-1 items-center justify-center">
        <canvas
          ref={canvasRef}
          width={w}
          height={h}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
          style={{ width: w * scale, height: h * scale, imageRendering: 'pixelated', touchAction: 'manipulation' }}
        />
      </div>
      <div className="flex h-11 shrink-0 items-center justify-center px-2 text-xs text-white">
        {placingId ? (
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
          <span className="opacity-70">가구를 탭해서 선택 → 빈 바닥을 탭해서 이동</span>
        )}
      </div>
    </div>
  );
}
