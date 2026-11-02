import { CATEGORY_LABEL, ENDINGS } from '../../data/endingData';
import { useGameStore } from '../../store/useGameStore';
import type { EndingCategory } from '../../types/game';
import { TIER_COLOR } from '../ui';

export function EncyclopediaPanel() {
  const unlocked = useGameStore((s) => s.unlockedEndings);
  const cats = Object.keys(CATEGORY_LABEL) as EndingCategory[];
  return (
    <div className="text-xs">
      <p className="mb-3 text-sm font-bold">
        👑 엔딩 도감 {unlocked.length} / {ENDINGS.length}
      </p>
      {cats.map((cat) => (
        <div key={cat} className="mb-4">
          <p className="mb-1 border-b-2 border-ink font-bold">{CATEGORY_LABEL[cat]}</p>
          <div className="grid grid-cols-1 gap-1">
            {ENDINGS.filter((e) => e.category === cat).map((e) => {
              const got = unlocked.includes(e.id);
              return (
                <div key={e.id} className={`flex items-start gap-2 border-2 border-ink p-1 ${got ? 'bg-white' : 'bg-black/10'}`}>
                  <span className={`shrink-0 border-2 border-ink px-1 font-bold ${TIER_COLOR[e.tier]}`}>{e.tier}</span>
                  <div className="min-w-0">
                    <p className="font-bold">{got ? e.title : '???'}</p>
                    <p className="text-[10px] opacity-70">{got ? e.epilogueText : `힌트: ${e.conditionText}`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
