import { useState } from 'react';
import { NPCS } from '../data/townData';
import { peopleEnding } from '../engine/town';
import type { SaveState } from '../engine/simulation';
import { npcArt } from './TownModal';
import { PixelButton } from './ui';

/** 🎓 성인식 날 찾아온 사람들 → 🌅 20년 후 그 사람들 */
export function PeopleEndingView({ game, category, onDone }: { game: SaveState; category: string; onDone: () => void }) {
  const list = peopleEnding(game, category);
  const [later, setLater] = useState(false);
  const deep = list.filter((p) => p.tier === 2).length;
  return (
    <div className="pop-in flex min-h-0 w-full flex-1 flex-col items-center gap-2">
      <p className="text-lg font-bold text-gold">{later ? '🌅 20년 후, 그 사람들' : '🎓 성인식 날 찾아온 사람들'}</p>
      <p className="text-center text-[11px] opacity-80">
        {later ? '함께 자란 인연은 어른이 된 뒤에도 이어져요.' : deep >= 3 ? '주말마다 함께 다닌 동네가, 이렇게 많은 사람을 남겼어요.' : '12년 동안 만난 동네 사람들이 축하하러 왔어요.'}
      </p>
      <div className="min-h-0 w-full flex-1 overflow-y-auto">
        <div className="grid gap-1.5">
          {list.map((p, i) => {
            const art = npcArt(p.npc, p.npc === 'FRIEND' || p.npc === 'RIVAL' ? 'YOUTH' : 'ADULT', game.gender);
            return (
              <div
                key={`${later}-${p.npc}`}
                className={`float-in flex items-center gap-2 rounded border-3 border-ink p-2 text-left text-[12px] leading-relaxed ${p.tier === 2 ? 'bg-[#fff6e0] text-ink' : 'bg-[#1b1f3b]/70'}`}
                style={{ animationDelay: `${i * 0.35}s`, animationFillMode: 'both' }}
              >
                <span className="flex h-16 w-12 shrink-0 items-end justify-center">
                  {art ? <img src={art} alt="" className="max-h-16" draggable={false} /> : <span className="text-3xl">{NPCS[p.npc].emoji}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <b>
                    {p.label} <span className="text-[10px] font-normal opacity-70">· {NPCS[p.npc].tiers[p.tier]}</span>
                  </b>
                  <br />
                  {later ? p.later : p.ceremony}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <PixelButton className="w-full" color="bg-gold" onClick={() => (later ? onDone() : setLater(true))}>
        {later ? '🌅 그리고 우리 아이는...' : '20년 후 ▶'}
      </PixelButton>
    </div>
  );
}
