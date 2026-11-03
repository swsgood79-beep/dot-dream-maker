import { eventScene } from '../render/eventScenes';
import { useState } from 'react';
import { sfx } from '../audio/sfx';
import { EVENT_MAP, STYLE_META, eventText, fillName } from '../data/parentingData';
import { growthStage } from '../engine/room';
import type { EventOutcome } from '../engine/parenting';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { FirstTip } from './FirstTip';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { EffectChips, PixelButton } from './ui';
import { TEMPERAMENT_MAP } from '../data/temperamentData';

/** 육아 상황: 부모가 대응을 고르면 아이의 반응과 변화를 보여 준다 (결과는 미리 공개하지 않음) */
export function EventModal({ id, onPick, onClose }: { id: string; onPick: () => void; onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const resolve = useGameStore((s) => s.resolveEvent);
  const [result, setResult] = useState<{ out: EventOutcome; style: string } | null>(null);
  const ev = EVENT_MAP[id];
  // 손님(첫째)은 선택 뒤에도 계속 보이도록 처음 모습을 기억
  const [visitor] = useState(() => ev?.visitor?.(game) ?? null);
  const sceneImg = eventScene(id, game.gender);
  if (!ev) return null;
  const stage = growthStage(game.age);
  const moodPose = game.status.stress >= 60 ? 'tired' : 'stand';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3">
      <div className="pixel-box pop-in max-h-full w-full overflow-y-auto p-3 text-sm">
        <p className="text-center text-[10px] opacity-60">
          🏠 {game.age}세 {game.month}월 · 육아 일기
        </p>
        <p className="mb-2 text-center text-lg font-bold">
          {ev.emoji} {ev.title}
        </p>
        {sceneImg ? (
          // 장면 일러스트가 있으면 그림으로 (아이가 그림 속에 있음)
          <img src={sceneImg} alt="" className="pop-in mb-2 aspect-video w-full border-3 border-ink object-cover" />
        ) : (
          <div className="room-bg mb-2 flex h-28 items-end justify-center gap-2 border-3 border-ink">
            {visitor && hasFrame(visitor) && <Sprite name={visitor} scale={1.1} />}
            <Sprite name={frameName(stage, game.gender, result ? (result.out.delta.affection ?? 0) >= 0 ? 'cheer' : 'stand' : moodPose)} scale={1.3} />
          </div>
        )}

        {!result ? (
          <>
            <p className="mb-3 rounded border-2 border-ink bg-white p-2 text-xs leading-relaxed">{fillName(eventText(ev, game), game.childName, game.friend)}</p>
            <FirstTip id="event" text="가끔 이렇게 육아 상황이 생겨요. 정답은 없고, 고르기 전엔 결과를 몰라요. 아이 반응을 보며 어떤 아이인지 알아가 보세요." />
            <p className="mb-1 text-[11px] font-bold text-wood">어떻게 할까요?</p>
            <div className="grid grid-cols-1 gap-1.5">
              {ev.choices.map((c, i) => (
                <button
                  key={i}
                  className="pixel-btn bg-white px-2 py-2 text-left text-xs"
                  onClick={() => {
                    onPick();
                    const out = resolve(i);
                    if (!out) return;
                    sfx((out.delta.affection ?? 0) >= 0 ? 'happy' : 'sad');
                    if (out.revealed) setTimeout(() => sfx('chime'), 450);
                    setResult({ out, style: c.style });
                  }}
                >
                  {fillName(c.label, game.childName, game.friend)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-full rounded-lg border-3 border-ink bg-white p-2 text-center text-xs">
              <span className="whitespace-pre-line">“{result.out.reply}”</span>
            </div>
            <EffectChips fx={result.out.delta} />
            {result.out.wishText && (
              <p className="rounded border-2 border-ink bg-[#fff1c2] px-2 py-1 text-[11px]">
                💭 새 부탁: “{result.out.wishText}”
              </p>
            )}
            {result.out.clue && (
              <p className="w-full rounded border-2 border-dashed border-ink/50 bg-[#f3efe2] px-2 py-1 text-[11px]">
                🔍 관찰 노트: {result.out.clue}
              </p>
            )}
            {result.out.revealed && (
              <div className="pop-in w-full rounded border-3 border-ink bg-gold p-2 text-center text-xs">
                <p className="font-bold">
                  ✨ 알았다! 우리 아이는 {TEMPERAMENT_MAP[result.out.revealed].emoji} {TEMPERAMENT_MAP[result.out.revealed].label} 아이예요
                </p>
                <p className="mt-0.5 text-[10px]">{TEMPERAMENT_MAP[result.out.revealed].tip}</p>
              </div>
            )}
            <p className="text-[10px] opacity-60">
              {STYLE_META[result.style as keyof typeof STYLE_META].emoji} {STYLE_META[result.style as keyof typeof STYLE_META].label} 선택
            </p>
            <PixelButton className="w-full" color="bg-mint" onClick={onClose}>
              확인
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
