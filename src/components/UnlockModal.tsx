import { useEffect } from 'react';
import { sfx } from '../audio/sfx';
import { FURNITURE_MAP } from '../data/furnitureData';
import { ACTION_MAP } from '../data/scheduleData';
import { pixelIconUrl } from '../render/sprites';
import { useGameStore } from '../store/useGameStore';
import { PixelButton } from './ui';

const TYPE_LABEL: Record<string, string> = { EDUCATION: '학원', PART_TIME: '아르바이트', REST: '휴식', OUTING: '외출' };

/** 새해(나이가 오를 때) 새로 열린 스케줄·가구 소개 */
export function UnlockModal({ onClose }: { onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const dismiss = useGameStore((s) => s.dismissUnlock);
  const u = game.pendingUnlock;
  useEffect(() => sfx('levelup'), []);
  if (!u) return null;
  const close = () => {
    dismiss();
    onClose();
  };
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3">
      <div className="pixel-box pop-in max-h-full w-full overflow-y-auto p-3 text-sm">
        <p className="text-center text-[11px] font-bold text-wood">🎂 {u.age}세가 되었어요</p>
        <p className="mb-2 text-center text-xl font-bold">🔓 새로 열렸어요!</p>
        <p className="mb-3 text-center text-[11px] opacity-70">이제 {game.childName}(이)가 할 수 있는 일이 늘었어요. 목록에서 <b className="rounded border border-ink bg-[#ff6fae] px-1 text-[9px] text-white">NEW</b> 표시를 찾아보세요.</p>
        {u.actions.length > 0 && (
          <>
            <p className="mb-1 text-[11px] font-bold text-wood">📅 새 스케줄</p>
            <div className="mb-3 grid gap-1.5">
              {u.actions.map((id, i) => {
                const a = ACTION_MAP[id];
                return (
                  <div key={id} className="pop-in flex items-center gap-2 rounded border-2 border-ink bg-white px-2 py-1.5" style={{ animationDelay: `${0.15 + i * 0.12}s`, animationFillMode: 'both' }}>
                    <span className="text-2xl">{a.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-xs">{a.name}</b>
                      <span className="text-[10px] opacity-60">{TYPE_LABEL[a.type]}</span>
                    </span>
                    <span className="rounded border border-ink bg-[#ff6fae] px-1 text-[9px] font-bold text-white">NEW</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {u.furniture.length > 0 && (
          <>
            <p className="mb-1 text-[11px] font-bold text-wood">🛋️ 새 가구 (방꾸미기 상점)</p>
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {u.furniture.map((id, i) => (
                <div key={id} className="pop-in flex items-center gap-1.5 rounded border-2 border-ink bg-white px-1.5 py-1" style={{ animationDelay: `${0.3 + i * 0.1}s`, animationFillMode: 'both' }}>
                  <img src={pixelIconUrl(id)} alt="" className="h-6 w-6" style={{ imageRendering: 'pixelated' }} />
                  <b className="min-w-0 flex-1 truncate text-[11px]">{FURNITURE_MAP[id].name}</b>
                </div>
              ))}
            </div>
          </>
        )}
        <PixelButton className="w-full" color="bg-mint" onClick={close}>
          좋아요!
        </PixelButton>
      </div>
    </div>
  );
}
