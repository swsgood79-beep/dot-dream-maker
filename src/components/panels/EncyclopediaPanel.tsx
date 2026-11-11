import { useState } from 'react';
import { CATEGORY_LABEL, ENDINGS, ENDING_MAP } from '../../data/endingData';
import { endingChecklist, endingProgress } from '../../engine/endingGoal';
import type { SaveState } from '../../engine/simulation';
import { useGameStore } from '../../store/useGameStore';
import type { EndingCategory, EndingDefinition } from '../../types/game';
import { TIER_COLOR } from '../ui';

export function EncyclopediaPanel() {
  const unlocked = useGameStore((s) => s.unlockedEndings);
  const game = useGameStore((s) => s.game);
  const setTarget = useGameStore((s) => s.setTargetEnding);
  const [open, setOpen] = useState<string | null>(null);
  const cats = Object.keys(CATEGORY_LABEL) as EndingCategory[];
  const target = game?.targetEnding ? ENDING_MAP[game.targetEnding] : null;
  return (
    <div className="text-xs">
      <p className="mb-1 text-sm font-bold">
        👑 엔딩 도감 {unlocked.length} / {ENDINGS.length}
      </p>
      <p className="mb-3 text-[10px] opacity-70">
        엔딩을 누르면 조건을 지금 아이와 비교해 보여 줘요. {game ? '🎯 노리기로 정하면 [내 아이] 화면과 스케줄에서 계속 확인할 수 있어요.' : ''}
      </p>
      {target && game && (
        <div className="mb-3 rounded border-2 border-ink bg-[#fff1c2] p-2">
          <p className="font-bold">🎯 노리는 엔딩: {target.title}</p>
          <Checklist def={target} game={game} />
        </div>
      )}
      {cats.map((cat) => (
        <div key={cat} className="mb-4">
          <p className="mb-1 border-b-2 border-ink font-bold">{CATEGORY_LABEL[cat]}</p>
          <div className="grid grid-cols-1 gap-1">
            {ENDINGS.filter((e) => e.category === cat).map((e) => {
              const got = unlocked.includes(e.id);
              const pr = game ? endingProgress(e, game) : 0;
              const isTarget = game?.targetEnding === e.id;
              return (
                <div key={e.id} className={`border-2 border-ink p-1 ${isTarget ? 'bg-[#fff1c2]' : got ? 'bg-white' : 'bg-black/10'}`}>
                  <button className="flex w-full items-start gap-2 text-left" onClick={() => setOpen(open === e.id ? null : e.id)}>
                    <span className={`shrink-0 border-2 border-ink px-1 font-bold ${TIER_COLOR[e.tier]}`}>{e.tier}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">
                        {got ? e.title : '???'} {isTarget && '🎯'}
                      </span>
                      <span className="block text-[10px] opacity-70">{got ? e.epilogueText : '조건을 보려면 누르세요'}</span>
                      {game && (
                        <span className="mt-0.5 flex items-center gap-1 text-[9px]">
                          <span className="relative h-1.5 flex-1 overflow-hidden rounded border border-ink/50 bg-white">
                            <span className="absolute inset-y-0 left-0 bg-[#5bd6a8]" style={{ width: `${Math.round(pr * 100)}%` }} />
                          </span>
                          <span className="w-16 text-right">지금 {Math.round(pr * 100)}%</span>
                        </span>
                      )}
                    </span>
                  </button>
                  {open === e.id && (
                    <div className="pop-in mt-1 rounded border border-dashed border-ink/50 bg-white/80 p-1.5">
                      {game ? <Checklist def={e} game={game} /> : <p className="text-[10px]">조건: {e.conditionText}</p>}
                      {game && (
                        <button className={`pixel-btn mt-1 w-full py-1 text-[11px] ${isTarget ? 'bg-white' : 'bg-gold'}`} onClick={() => setTarget(e.id)}>
                          {isTarget ? '🎯 노리기 그만두기' : '🎯 이 엔딩 노리기'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 조건 한 줄씩: 지금 수치 / 필요한 수치 */
export function Checklist({ def, game }: { def: EndingDefinition; game: SaveState }) {
  const items = endingChecklist(def, game);
  return (
    <div className="mt-1 grid gap-0.5">
      {items.map((c, i) => (
        <div key={i} className="flex items-center gap-1 text-[10px]">
          <span className="w-4 shrink-0">{c.ok ? '✅' : '⬜'}</span>
          <span className="w-28 shrink-0 truncate">{c.label}</span>
          {c.flag ? (
            <span className="flex-1 opacity-70">{c.ok ? '달성' : '아직'}</span>
          ) : (
            <>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded border border-ink/40 bg-white">
                <span className={`absolute inset-y-0 left-0 ${c.ok ? 'bg-[#5bd6a8]' : 'bg-[#ffb347]'}`} style={{ width: `${Math.min(100, (c.have / Math.max(1, c.need)) * 100)}%` }} />
              </span>
              <span className="w-16 shrink-0 text-right">
                {c.have} / {c.max ? '≤' : ''}
                {c.need}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
