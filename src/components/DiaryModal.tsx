import { useState } from 'react';
import { sfx } from '../audio/sfx';
import type { Effect } from '../data/parentingData';
import { fillName } from '../data/parentingData';
import { CAUGHT_CHOICES, caughtChance, type DiaryEntry } from '../engine/diary';
import { FirstTip } from './FirstTip';
import { useGameStore } from '../store/useGameStore';
import { EffectChips, PixelButton } from './ui';

/** 아이의 일기장 페이지 */
export function DiaryPage({ e, name }: { e: DiaryEntry; name: string }) {
  return (
    <div className="rounded-sm border-3 border-ink bg-[repeating-linear-gradient(#fffaf0_0_21px,#e5d8bd_21px_22px)] p-3 text-left text-[13px] leading-[22px] text-ink">
      <p className="text-right text-[11px] opacity-60">
        {e.age}세 {e.month}월 · {name}의 일기
      </p>
      {e.lines.map((l, i) => (
        <p key={i} className={e.secret && i === e.lines.length - 2 ? 'font-bold text-[#b0306a]' : ''}>
          {l}
        </p>
      ))}
    </div>
  );
}

type Phase = 'ask' | 'read' | 'caught' | 'after';

export function DiaryModal({ onClose }: { onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const read = useGameStore((s) => s.readDiary);
  const skip = useGameStore((s) => s.skipDiary);
  const respond = useGameStore((s) => s.respondCaught);
  const [phase, setPhase] = useState<Phase>('ask');
  const [res, setRes] = useState<ReturnType<typeof read>>(null);
  const [after, setAfter] = useState<{ reply: string; delta: Effect } | null>(null);
  const risk = Math.round(caughtChance(game) * 100);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3">
      <div className="pixel-box pop-in max-h-full w-full overflow-y-auto p-3 text-xs">
        {phase === 'ask' && (
          <div className="flex flex-col items-center gap-2 text-center">
            <FirstTip id="diary" text="일기에는 아이가 말하지 않는 속마음이 적혀 있어요. 읽으면 도움이 되지만, 들키면 아이가 크게 서운해해요." />
            <p className="text-4xl">📔</p>
            <p className="text-sm font-bold">책상 위에 {game.childName}의 일기장이 펼쳐져 있어요</p>
            <p className="opacity-70">몰래 읽으면 아이의 속마음을 알 수 있지만, 들키면 크게 서운해할 거예요.</p>
            <p className="text-[10px] text-accent">들킬 확률 약 {risk}%</p>
            <div className="mt-1 grid w-full grid-cols-2 gap-2">
              <PixelButton
                color="bg-gold"
                onClick={() => {
                  const r = read();
                  setRes(r);
                  setPhase('read');
                  sfx('page');
                  if (r?.caught) setTimeout(() => (setPhase('caught'), sfx('door')), 1600);
                }}
              >
                📖 몰래 읽기
              </PixelButton>
              <PixelButton
                color="bg-white"
                onClick={() => {
                  skip();
                  onClose();
                }}
              >
                🙈 그냥 둔다
              </PixelButton>
            </div>
          </div>
        )}

        {(phase === 'read' || phase === 'caught' || phase === 'after') && res && (
          <div className="flex flex-col gap-2">
            <DiaryPage e={res.entry} name={game.childName} />
            {res.entry.secret && phase === 'read' && (
              <p className="rounded border-2 border-ink bg-[#fff1c2] p-2">💡 알게 된 것: {res.entry.secret.hint}</p>
            )}
            {res.clue && phase === 'read' && <p className="rounded border-2 border-dashed border-ink/50 bg-[#f3efe2] p-2">🔍 관찰 노트에 단서가 적혔어요</p>}
            {phase === 'read' && !res.caught && (
              <>
                <p className="text-center opacity-70">...휴, 들키지 않았다.</p>
                <PixelButton color="bg-mint" onClick={onClose}>
                  살짝 덮어 둔다
                </PixelButton>
              </>
            )}
            {phase === 'read' && res.caught && <p className="animate-pulse text-center opacity-70">...어? 발소리가...</p>}
            {phase === 'caught' && (
              <div className="pop-in rounded border-3 border-ink bg-[#ffe0dc] p-2">
                <p className="mb-2 text-center text-sm font-bold">{fillName('🚪 {name이} 들어왔다! "내 일기 읽었어?!"', game.childName)}</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {CAUGHT_CHOICES.map((c, i) => (
                    <button
                      key={i}
                      className="pixel-btn bg-white px-2 py-2 text-left"
                      onClick={() => {
                        const r = respond(i);
                        if (r) {
                          setAfter(r);
                          setPhase('after');
                          sfx('sad');
                        }
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {phase === 'after' && after && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-full rounded-lg border-3 border-ink bg-white p-2 text-center">“{after.reply}”</div>
                <EffectChips fx={after.delta} />
                <PixelButton className="w-full" color="bg-mint" onClick={onClose}>
                  확인
                </PixelButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
