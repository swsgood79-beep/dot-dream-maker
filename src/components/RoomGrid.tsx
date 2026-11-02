import { useMemo, useState } from 'react';
import { FURNITURE_MAP } from '../data/furnitureData';
import { canPlace, computeActiveCombos, footprint } from '../engine/room';
import { useGameStore } from '../store/useGameStore';
import { FURNITURE_ICON, PixelButton } from './ui';

const COMBO_COLORS = ['#ffd96b', '#8ff0c9', '#9fd8ff', '#ffb3d1', '#d6b8ff', '#ffc48a'];

/**
 * v0.1 탑다운 방 그리드 (v0.2에서 아이소메트릭 캔버스로 교체 예정)
 * - 가구 탭 → 선택(회전/보관), 빈 칸 탭 → 선택된 가구 이동
 * - placingId가 있으면 창고 가구 배치 모드
 */
export function RoomGrid({ placingId, onPlaced }: { placingId: string | null; onPlaced: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const { moveFurniture, rotateFurniture, storeFurniture, placeFromInventory } = useGameStore();
  const [selected, setSelected] = useState<string | null>(null);
  const n = game.roomSize;

  const { cellOwner, comboTint } = useMemo(() => {
    const cellOwner = new Map<string, string>();
    for (const p of game.placedFurniture) for (const c of footprint(p)) cellOwner.set(`${c.x},${c.y}`, p.instanceId);
    const { comboIds, members } = computeActiveCombos(game.placedFurniture);
    const comboTint = new Map<string, string>();
    comboIds.forEach((id, i) => members[id].forEach((inst) => comboTint.set(inst, COMBO_COLORS[i % COMBO_COLORS.length])));
    return { cellOwner, comboTint };
  }, [game.placedFurniture]);

  const sel = game.placedFurniture.find((p) => p.instanceId === selected);

  const onCell = (x: number, y: number) => {
    const owner = cellOwner.get(`${x},${y}`);
    if (placingId) {
      if (placeFromInventory(placingId, x, y)) onPlaced();
      return;
    }
    if (owner) {
      setSelected(owner === selected ? null : owner);
      return;
    }
    if (sel) {
      if (canPlace(game.placedFurniture, n, { ...sel, gridX: x, gridY: y }, sel.instanceId)) moveFurniture(sel.instanceId, x, y);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div
        className="grid border-4 border-wood bg-[#e9c995]"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, width: 'min(88vw, 340px)', aspectRatio: '1' }}
      >
        {Array.from({ length: n * n }).map((_, i) => {
          const x = i % n;
          const y = Math.floor(i / n);
          const owner = cellOwner.get(`${x},${y}`);
          const p = owner ? game.placedFurniture.find((f) => f.instanceId === owner) : undefined;
          const isAnchor = p && p.gridX === x && p.gridY === y;
          const tint = owner ? comboTint.get(owner) : undefined;
          const checker = (x + y) % 2 === 0 ? 'bg-[#e9c995]' : 'bg-[#dfba80]';
          return (
            <button
              key={i}
              onClick={() => onCell(x, y)}
              className={`relative flex items-center justify-center border border-black/10 ${checker} ${owner === selected && owner ? 'outline-3 outline-accent' : ''}`}
            >
              {tint && <span className="aura-pulse absolute inset-0" style={{ background: tint }} />}
              {p && (
                <span className="relative text-[clamp(14px,5vw,24px)] leading-none">
                  {isAnchor ? FURNITURE_ICON[p.furnitureId] : '·'}
                </span>
              )}
              {placingId && !owner && <span className="absolute inset-0 bg-mint/30" />}
            </button>
          );
        })}
      </div>
      <div className="mt-2 h-10 text-xs text-white">
        {placingId ? (
          <span>📦 {FURNITURE_MAP[placingId].name} — 놓을 칸을 탭하세요</span>
        ) : sel ? (
          <div className="flex items-center gap-2">
            <span>{FURNITURE_ICON[sel.furnitureId]} {FURNITURE_MAP[sel.furnitureId].name}</span>
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
          </div>
        ) : (
          <span className="opacity-70">가구를 탭해서 선택 → 빈 칸을 탭해서 이동</span>
        )}
      </div>
    </div>
  );
}
