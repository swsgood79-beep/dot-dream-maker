import { useState } from 'react';
import { sfx } from '../audio/sfx';
import type { Effect } from '../data/parentingData';
import { NIGHT_TOUCH, type NightTouch } from '../engine/parentTouch';
import { growthStage } from '../engine/room';
import { frameName } from '../render/spriteCharacter';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { EffectChips, PixelButton } from './ui';

/** 🌙 잠든 아이 보러 가기: 부모만 아는 조용한 손길 (한 달에 한 번) */
export function NightModal({ onClose }: { onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const visit = useGameStore((s) => s.visitNight);
  const [res, setRes] = useState<{ kind: NightTouch; delta: Effect; talk: string | null } | null>(null);
  const stage = growthStage(game.age);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-3">
      <div className="pop-in w-full overflow-hidden rounded-md border-3 border-ink text-sm">
        {/* 달빛 드는 밤 방 */}
        <div className="relative flex h-52 items-end justify-center overflow-hidden" style={{ background: 'linear-gradient(#141a3a, #2a2f5c 70%, #3a3560)' }}>
          <div className="absolute top-3 right-6 h-16 w-12 rounded-sm border-2 border-[#5a6090] bg-[linear-gradient(#1d2450,#35407a)]">
            <span className="absolute top-2 right-2 text-base">🌙</span>
            <span className="twinkle absolute top-8 left-2 h-1 w-1 rounded-full bg-white" />
          </div>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 45% 55% at 72% 40%, rgba(190,210,255,.25), transparent 70%)' }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="scene-fx absolute text-sm font-bold text-[#cfe0ff]" style={{ left: `${48 + i * 6}%`, top: '30%', animationDelay: `${i * 0.6}s`, ['--dx' as string]: `${10 + i * 6}px` }}>
              z
            </span>
          ))}
          <div className="relative mb-5" style={{ filter: 'brightness(.75) saturate(.85)' }}>
            <Sprite name={frameName(stage, game.gender, 'sleep')} scale={2.2} />
          </div>
        </div>
        <div className="bg-[#1d2142] p-3 text-[#e8ecff]">
          {!res ? (
            <>
              <p className="mb-1 text-center text-base font-bold">🌙 잠든 {game.childName}</p>
              <p className="mb-3 text-center text-[11px] opacity-80">새근새근... 아이는 모르겠지만, 오늘 밤 무얼 해 줄까요?</p>
              <div className="grid gap-1.5">
                {(Object.keys(NIGHT_TOUCH) as NightTouch[]).map((k) => (
                  <button
                    key={k}
                    className="pixel-btn bg-[#2f3566] px-2 py-2 text-left text-xs text-white"
                    onClick={() => {
                      const r = visit(k);
                      if (!r) return;
                      sfx('happy');
                      setRes({ kind: k, ...r });
                    }}
                  >
                    {NIGHT_TOUCH[k].emoji} {NIGHT_TOUCH[k].label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-center text-xs">{NIGHT_TOUCH[res.kind].after}</p>
              {res.talk && (
                <p className="pop-in w-full rounded-lg border-2 border-[#7f9cff] bg-[#2a3170] px-2 py-1.5 text-center text-xs text-[#dbe5ff]">
                  💭 잠꼬대: {res.talk}
                </p>
              )}
              <div className="text-ink">
                <EffectChips fx={res.delta} />
              </div>
              <PixelButton className="w-full" color="bg-[#7f9cff]" onClick={onClose}>
                살며시 나오기
              </PixelButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
