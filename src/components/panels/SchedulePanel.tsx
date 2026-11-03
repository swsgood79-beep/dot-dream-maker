import { useState } from 'react';
import { ACTION_TYPE_LABEL, SCHEDULE_ACTIONS } from '../../data/scheduleData';
import { useGameStore } from '../../store/useGameStore';
import type { ScheduleAction } from '../../types/game';
import { PixelButton, StatChip } from '../ui';
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

export function SchedulePanel({ onRun }: { onRun: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const setSlot = useGameStore((s) => s.setScheduleSlot);
  const [slot, setSlot_] = useState(0);
  const wishTarget = game.wish && WISH_MAP[game.wish.id]?.kind === 'action' ? WISH_MAP[game.wish.id].target : null;
  const types: ScheduleAction['type'][] = ['EDUCATION', 'PART_TIME', 'REST', 'OUTING'];

  const monthCost = game.monthlySchedule.reduce((sum, id) => {
    const a = SCHEDULE_ACTIONS.find((x) => x.id === id);
    return sum + (a ? a.weeklyGoldDelta : 0);
  }, 0);
  const stressSum = game.monthlySchedule.reduce((sum, id) => sum + (SCHEDULE_ACTIONS.find((x) => x.id === id)?.weeklyStressDelta ?? 0), 0);

  return (
    <div className="text-xs">
      <div className="mb-3 grid grid-cols-4 gap-1">
        {game.monthlySchedule.map((id, i) => {
          const a = SCHEDULE_ACTIONS.find((x) => x.id === id)!;
          return (
            <button
              key={i}
              onClick={() => setSlot_(i)}
              className={`pixel-btn flex flex-col items-center px-1 py-2 ${slot === i ? 'bg-gold' : 'bg-white'}`}
            >
              <span className="text-[10px] opacity-70">{i + 1}주</span>
              <span className="text-xl">{a.emoji}</span>
              <span className="line-clamp-2 text-[10px] leading-tight">{a.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mb-3 flex justify-between border-2 border-ink bg-white px-2 py-1">
        <span>예상 골드 {monthCost >= 0 ? '+' : ''}{monthCost}G</span>
        <span>예상 스트레스 {stressSum >= 0 ? '+' : ''}{stressSum}</span>
      </div>
      {game.forcedRestWeeks > 0 && <p className="mb-2 text-accent">🤒 이번 달 {game.forcedRestWeeks}주는 강제 요양</p>}
      {game.runawayWeeks > 0 && <p className="mb-2 text-accent">🏃 이번 달 {game.runawayWeeks}주는 가출로 취소</p>}

      <p className="mb-1 font-bold">{slot + 1}주차 행동 선택</p>
      {types.map((t) => (
        <div key={t} className="mb-2">
          <p className="mb-1 text-[11px] font-bold text-wood">{ACTION_TYPE_LABEL[t]}</p>
          <div className="grid grid-cols-1 gap-1">
            {SCHEDULE_ACTIONS.filter((a) => a.type === t).map((a) => {
              const locked = a.minAge > game.age;
              const selected = game.monthlySchedule[slot] === a.id;
              return (
                <button
                  key={a.id}
                  disabled={locked}
                  onClick={() => {
                    setSlot(slot, a.id);
                    setSlot_((slot + 1) % 4);
                  }}
                  className={`flex items-center gap-2 border-2 border-ink px-2 py-1 text-left ${selected ? 'bg-gold' : 'bg-white'} ${locked ? 'opacity-40' : ''}`}
                >
                  <span className="text-lg">{a.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">
                      {a.name}
                      {locked && ` 🔒${a.minAge}세`}
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
      <PixelButton className="sticky bottom-0 mt-2 w-full" color="bg-accent !text-white" onClick={onRun}>
        ▶ 이번 달 진행하기
      </PixelButton>
    </div>
  );
}
