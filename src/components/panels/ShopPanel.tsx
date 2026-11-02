import { useState } from 'react';
import { COMBOS, FURNITURE, FURNITURE_MAP } from '../../data/furnitureData';
import { useGameStore } from '../../store/useGameStore';
import type { FurnitureCategory } from '../../types/game';
import { FURNITURE_ICON, STAT_META } from '../ui';

const CAT_LABEL: Record<FurnitureCategory, string> = {
  STUDY: '📚 공부', ART: '🎨 예술', TECH: '🛠️ 기술', FITNESS: '💪 운동', REST: '🛏️ 휴식', DECO: '✨ 장식',
};

export function ShopPanel({ onPlaceMode }: { onPlaceMode: (furnitureId: string) => void }) {
  const game = useGameStore((s) => s.game)!;
  const buy = useGameStore((s) => s.buyFurniture);
  const [tab, setTab] = useState<'shop' | 'combo' | 'storage'>('shop');
  const [cat, setCat] = useState<FurnitureCategory>('STUDY');

  return (
    <div className="text-xs">
      <div className="mb-3 grid grid-cols-3 gap-1">
        {(['shop', 'combo', 'storage'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pixel-btn py-1 ${tab === t ? 'bg-gold' : 'bg-white'}`}>
            {t === 'shop' ? '🛒 상점' : t === 'combo' ? '✨ 콤보 가이드' : `📦 창고(${game.inventory.length})`}
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            {(Object.keys(CAT_LABEL) as FurnitureCategory[]).map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`border-2 border-ink px-2 py-0.5 ${cat === c ? 'bg-accent text-white' : 'bg-white'}`}>
                {CAT_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-1">
            {FURNITURE.filter((f) => f.category === cat).map((f) => {
              const locked = (f.minAge ?? 0) > game.age;
              const owned = game.collectedFurniture.includes(f.id);
              const afford = game.gold >= f.costGold && game.ideaPoints >= f.costIdea;
              const combo = COMBOS.find((c) => c.requiredFurnitureIds.includes(f.id));
              const aura = Object.entries(f.auraBonus).map(([k, v]) => `${STAT_META[k as keyof typeof STAT_META].icon}+${v}`);
              if (f.stressReductionBonus) aura.push(`😌-${f.stressReductionBonus}`);
              if (f.aptitudeBonus) Object.entries(f.aptitudeBonus).forEach(([k, v]) => aura.push(`${k.replace('APT_', '')}+${v}exp`));
              return (
                <div key={f.id} className="flex items-center gap-2 border-2 border-ink bg-white px-2 py-1">
                  <span className="text-2xl">{FURNITURE_ICON[f.id]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {f.name} {owned && <span className="text-emerald-700">✔</span>} {f.width > 1 && <span className="opacity-60">({f.width}칸)</span>}
                    </p>
                    <p className="text-[10px] opacity-70">오라: {aura.join(' ') || '-'}</p>
                    {combo && <p className="text-[10px] text-wood">콤보: {combo.name}</p>}
                  </div>
                  <button
                    disabled={locked || !afford}
                    onClick={() => buy(f.id)}
                    className="pixel-btn shrink-0 bg-gold px-2 py-1 text-[10px]"
                  >
                    {locked ? `🔒${f.minAge}세` : (
                      <>
                        {f.costGold}G
                        {f.costIdea > 0 && <><br />💡{f.costIdea}</>}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'combo' && (
        <div className="grid grid-cols-1 gap-1">
          <p className="mb-1 text-[10px] opacity-70">가구 3종을 서로 맨해튼 거리 2칸 이내로 배치하면 전문 구역 콤보가 발동해요.</p>
          {COMBOS.map((c) => {
            const active = game.activeCombos.includes(c.id);
            return (
              <div key={c.id} className={`border-2 border-ink px-2 py-1 ${active ? 'bg-mint' : 'bg-white'}`}>
                <p className="font-bold">{active ? '✨ ' : ''}{c.name} <span className="opacity-60">{c.id}</span></p>
                <p className="text-[10px]">
                  {c.requiredFurnitureIds.map((id) => (
                    <span key={id} className={game.collectedFurniture.includes(id) ? '' : 'opacity-40'}>
                      {FURNITURE_ICON[id]}{FURNITURE_MAP[id].name}{' '}
                    </span>
                  ))}
                </p>
                <p className="text-[10px] text-wood">{c.description}</p>
                <p className="text-[10px] opacity-60">관련 직업: {c.relatedJobs}</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'storage' && (
        <div className="grid grid-cols-1 gap-1">
          {game.inventory.length === 0 && <p className="opacity-60">창고가 비었어요. 방에서 가구를 선택해 '보관'할 수 있어요.</p>}
          {Array.from(new Set(game.inventory)).map((id) => (
            <div key={id} className="flex items-center gap-2 border-2 border-ink bg-white px-2 py-1">
              <span className="text-2xl">{FURNITURE_ICON[id]}</span>
              <span className="flex-1 font-bold">{FURNITURE_MAP[id].name} x{game.inventory.filter((x) => x === id).length}</span>
              <button className="pixel-btn bg-mint px-2 py-1" onClick={() => onPlaceMode(id)}>배치하기</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
