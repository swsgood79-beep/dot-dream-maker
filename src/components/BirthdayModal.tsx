import { useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { GIFT_PRICE, giftOptions } from '../data/birthdayData';
import type { Effect } from '../data/parentingData';
import { growthStage } from '../engine/room';
import { frameName } from '../render/spriteCharacter';
import { FirstTip } from './FirstTip';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { EffectChips, PixelButton } from './ui';

/** 생일 파티: 선물 3개 중 하나 — 아이가 원하던 걸 맞히면 크게 기뻐한다 */
export function BirthdayModal({ onPick, onClose }: { onPick: () => void; onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const give = useGameStore((s) => s.giveGift);
  const opts = useMemo(() => giftOptions(game), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [res, setRes] = useState<{ liked: boolean; reply: string; delta: Effect } | null>(null);
  const stage = growthStage(game.age);
  const candles = Math.min(game.age, 20);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3">
      <div className="pop-in max-h-full w-full overflow-y-auto rounded-md border-3 border-ink bg-[#fff0f6] p-3 text-xs text-ink shadow-[6px_6px_0_rgba(0,0,0,.35)]">
        <p className="text-center text-lg font-bold">🎉 {game.childName}의 생일! 🎉</p>
        <div className="relative my-2 flex h-32 items-end justify-center gap-2 overflow-hidden rounded border-3 border-ink bg-gradient-to-b from-[#ffd6e7] to-[#fff6d6]">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="confetti absolute top-0 h-2 w-1.5" style={{ left: `${(i * 37) % 100}%`, background: ['#ff6fae', '#ffd84d', '#5bd6ff', '#5bd66b'][i % 4], animationDelay: `${(i % 5) * 0.15}s` }} />
          ))}
          <Sprite name={frameName(stage, game.gender, res ? (res.liked ? 'cheer' : 'stand') : 'cheer')} scale={1.4} />
          <div className="mb-1 flex flex-col items-center">
            <span className="text-[10px] tracking-tighter">{'🕯️'.repeat(Math.min(candles, 6))}</span>
            <span className="text-4xl">🎂</span>
            <span className="text-[10px] font-bold">{game.age}살</span>
          </div>
        </div>
        {!res ? (
          <>
            <FirstTip id="birthday" text="아이가 원하던 선물을 맞히면 크게 기뻐해요. 생일 전 달에 방에서 아이를 눌러 보거나 일기장을 보면 힌트가 있어요." />
            <p className="mb-1 text-center font-bold">어떤 선물을 줄까요? (각 {GIFT_PRICE[stage]}G)</p>
            <p className="mb-2 text-center text-[10px] opacity-70">💡 아이가 요즘 뭘 갖고 싶어 했는지 떠올려 보세요 (방에서 말을 걸거나 일기장을 보면 힌트가 있어요)</p>
            <div className="grid grid-cols-3 gap-1.5">
              {opts.map((g) => (
                <button
                  key={g.id}
                  className="pixel-btn flex flex-col items-center bg-white px-1 py-2"
                  onClick={() => {
                    onPick();
                    const r = give(g.id);
                    if (!r) return;
                    sfx(r.liked ? 'win' : 'happy');
                    setRes(r);
                  }}
                >
                  <span className="text-3xl">{g.emoji}</span>
                  <span className="mt-1 text-[10px] leading-tight font-bold">{g.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {res.liked && <p className="stamp rounded border-3 border-[#c0392b] bg-gold px-2 text-sm font-bold text-[#c0392b]">💝 원하던 선물!</p>}
            <div className="w-full rounded-lg border-3 border-ink bg-white p-2 text-center">“{res.reply}”</div>
            <EffectChips fx={res.delta} />
            <PixelButton className="w-full" color="bg-mint" onClick={onClose}>
              확인
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
