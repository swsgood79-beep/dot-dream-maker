import { useState } from 'react';
import { ACTION_TYPE_LABEL, SCHEDULE_ACTIONS } from '../../data/scheduleData';
import { useGameStore } from '../../store/useGameStore';
import type { ScheduleAction } from '../../types/game';
import { StatChip } from '../ui';
import { WISH_MAP } from '../../data/parentingData';

function actionSummary(a: ScheduleAction) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      {Object.entries(a.weeklyStatGains).map(([k, v]) => (
        <StatChip key={k} k={k} v={v!} size={13} />
      ))}
      {a.aptitudeGain && <StatChip k={a.aptitudeGain.key} v={a.aptitudeGain.exp} size={13} />}
      {a.statusGains?.affection ? <span>❤️+{a.statusGains.affection}</span> : null}
      {a.statusGains?.fame ? <StatChip k="FAME" v={a.statusGains.fame} size={13} /> : null}
      {a.statusGains?.delinquency ? <span>😈+{a.statusGains.delinquency}</span> : null}
    </span>
  );
}

export function SchedulePanel() {
  const game = useGameStore((s) => s.game)!;
  const setSlot = useGameStore((s) => s.setScheduleSlot);
  const [slot, setSlot_] = useState(0);
  // 방금 넣은 행동 (확인 표시용)
  const [justSet, setJustSet] = useState<{ week: number; id: string; n: number } | null>(null);
  const wishTarget = game.wish && WISH_MAP[game.wish.id]?.kind === 'action' ? WISH_MAP[game.wish.id].target : null;
  const types: ScheduleAction['type'][] = ['EDUCATION', 'PART_TIME', 'REST', 'OUTING'];

  const monthCost = game.monthlySchedule.reduce((sum, id) => {
    const a = SCHEDULE_ACTIONS.find((x) => x.id === id);
    return sum + (a ? a.weeklyGoldDelta : 0);
  }, 0);
  const stressSum = game.monthlySchedule.reduce((sum, id) => sum + (SCHEDULE_ACTIONS.find((x) => x.id === id)?.weeklyStressDelta ?? 0), 0);

  return (
    <div className="text-xs">
      {/* 주차 칸은 목록을 내려도 위에 고정 → 지금 몇 주차를 고르는지 항상 보임 */}
      <div className="sticky -top-3 z-10 -mx-3 -mt-3 mb-2 border-b-2 border-ink/20 bg-panel px-3 pt-3 pb-2">
      <div className="mb-2 grid grid-cols-4 gap-1">
        {game.monthlySchedule.map((id, i) => {
          const a = SCHEDULE_ACTIONS.find((x) => x.id === id)!;
          return (
            <button
              key={justSet?.week === i ? `${i}-${justSet.n}` : i}
              onClick={() => {
                setSlot_(i);
                setJustSet(null);
              }}
              className={`pixel-btn flex flex-col items-center px-1 py-2 ${slot === i ? 'bg-gold' : justSet?.week === i ? 'pop-in bg-[#c8f5d0]' : 'bg-white'}`}
            >
              <span className="text-[10px] opacity-70">{i + 1}주</span>
              <span className="text-xl">{a.emoji}</span>
              <span className="line-clamp-2 text-[10px] leading-tight">{a.name}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between border-2 border-ink bg-white px-2 py-1">
        <span>예상 골드 {monthCost >= 0 ? '+' : ''}{monthCost}G</span>
        <span>예상 스트레스 {stressSum >= 0 ? '+' : ''}{stressSum}</span>
      </div>
      {justSet ? (
        <p key={justSet.n} className="pop-in mt-1 text-center text-[11px] font-bold text-emerald-700">
          ✅ {justSet.week + 1}주차 → {SCHEDULE_ACTIONS.find((x) => x.id === justSet.id)?.name}
          <span className="text-wood">
            {justSet.week === 3 ? ' · 4주 모두 정했어요!' : ` · 이제 ${slot + 1}주차를 고르세요`}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-center text-[11px] font-bold text-wood">▼ {slot + 1}주차에 할 일을 고르세요</p>
      )}
      </div>
      {game.forcedRestWeeks > 0 && <p className="mb-2 text-accent">🤒 이번 달 {game.forcedRestWeeks}주는 강제 요양</p>}
      {game.runawayWeeks > 0 && <p className="mb-2 text-accent">🏃 이번 달 {game.runawayWeeks}주는 가출로 취소</p>}

      {types.map((t) => (
        <div key={t} className="mb-2">
          <p className="mb-1 text-[11px] font-bold text-wood">{ACTION_TYPE_LABEL[t]}</p>
          <div className="grid grid-cols-1 gap-1">
            {SCHEDULE_ACTIONS.filter((a) => a.type === t).map((a) => {
              const locked = a.minAge > game.age;
              // 지금 고르는 주에 이미 들어 있는 행동은 색을 칠하지 않고 작은 표시만 (방금 누른 것과 헷갈리지 않게)
              const current = game.monthlySchedule[slot] === a.id;
              const flashed = justSet?.id === a.id;
              return (
                <button
                  key={a.id}
                  disabled={locked}
                  onClick={() => {
                    setSlot(slot, a.id);
                    setJustSet({ week: slot, id: a.id, n: (justSet?.n ?? 0) + 1 });
                    // 다음 주로 자동 이동 (4주차에서는 멈춤)
                    if (slot < 3) setSlot_(slot + 1);
                  }}
                  className={`flex items-center gap-2 border-2 border-ink px-2 py-1 text-left ${flashed ? 'bg-[#c8f5d0]' : 'bg-white'} ${locked ? 'opacity-40' : ''}`}
                >
                  <span className="text-lg">{a.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">
                      {a.name}
                      {locked && ` 🔒${a.minAge}세`}
                      {flashed && <span className="ml-1 rounded border border-ink bg-mint px-1 text-[9px]">✓ {justSet!.week + 1}주에 넣음</span>}
                      {current && !flashed && <span className="ml-1 rounded border border-dashed border-ink px-1 text-[9px] opacity-70">{slot + 1}주 현재</span>}
                      {wishTarget === a.id && <span className="ml-1 rounded border border-ink bg-[#fff1c2] px-1 text-[9px]">💭 아이가 원해요</span>}
                    </span>
                    <span className="block text-[10px] opacity-70">{actionSummary(a)}</span>
                  </span>
                  <span className="shrink-0 text-right text-[10px]">
                    <span className={a.weeklyGoldDelta < 0 ? 'text-red-600' : 'text-emerald-700'}>
                      {a.weeklyGoldDelta > 0 ? '+' : ''}{a.weeklyGoldDelta}G
                    </span>
                    <br />
                    😵{a.weeklyStressDelta > 0 ? '+' : ''}{a.weeklyStressDelta}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
