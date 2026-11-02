import { CATEGORY_LABEL, ENDINGS } from '../data/endingData';
import { Sprite } from './Sprite';
import { frameName, PARENT_FRAME } from '../render/spriteCharacter';
import { STAT_KEYS } from '../engine/simulation';
import { useGameStore } from '../store/useGameStore';
import { PixelButton, STAT_META, TIER_COLOR } from './ui';

export function EndingScreen({ onDone }: { onDone: () => void }) {
  const { ending, game, unlockedEndings, finishEnding } = useGameStore();
  if (!ending) return null;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#1b1f3b] to-[#4a3b6b] p-5 text-center text-white">
      <p className="text-sm text-gold">🎓 19세 12월 · 성인식</p>
      {game && <p className="text-xs opacity-80">{game.childName}의 12년간의 성장 이야기가 끝났습니다</p>}
      <div className="pixel-box pop-in w-full p-4 text-ink">
        {game && (
          <div className="flex items-end justify-center gap-3">
            <Sprite name={frameName('YOUTH', game.gender, 'cheer')} scale={1.5} />
            <Sprite name={PARENT_FRAME} scale={1.2} />
          </div>
        )}
        <span className={`mt-2 inline-block border-3 border-ink px-3 py-1 text-lg font-bold ${TIER_COLOR[ending.tier]}`}>{ending.tier}</span>
        <h2 className="mt-2 text-2xl font-bold">{ending.title}</h2>
        <p className="text-[10px] opacity-60">{CATEGORY_LABEL[ending.category]} · {ending.id}</p>
        <p className="mt-3 text-sm">{ending.epilogueText}</p>
        {game && (
          <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
            {STAT_KEYS.map((k) => (
              <span key={k} className="border-2 border-ink bg-white px-1 py-0.5">
                {STAT_META[k].icon} {k} {game.stats[k]}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs">👑 엔딩 도감 {unlockedEndings.length} / {ENDINGS.length} 등록!</p>
      <PixelButton
        color="bg-gold"
        onClick={() => {
          finishEnding();
          onDone();
        }}
      >
        타이틀로 (다음 회차 💡 30% 인계)
      </PixelButton>
    </div>
  );
}
