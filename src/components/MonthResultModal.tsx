import { FirstTip } from './FirstTip';
import { useEffect, useState } from 'react';
import { COMBO_MAP } from '../data/furnitureData';
import type { MonthResult } from '../engine/simulation';
import { PixelButton, ko } from './ui';
import { sfx } from '../audio/sfx';

const OUTCOME_LABEL = {
  GREAT: { text: '대성공!', cls: 'bg-gold' },
  SUCCESS: { text: '성공', cls: 'bg-mint' },
  FAIL: { text: '실패', cls: 'bg-stone-300' },
  SICK: { text: '요양', cls: 'bg-sky' },
  RUNAWAY: { text: '가출', cls: 'bg-accent text-white' },
  NO_GOLD: { text: '골드부족', cls: 'bg-stone-300' },
  STRIKE: { text: '파업', cls: 'bg-[#7a8bb5] text-white' },
};

/** 1주~4주를 순차적으로 보여주는 월간 결과 모달 (팝업 텍스트가 솟아오름) */
export function MonthResultModal({ result, onClose }: { result: MonthResult; onClose: () => void }) {
  // 방 안 연출을 이미 봤으므로 주간 결과는 빠르게 펼친다
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= result.weeks.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 120);
    return () => clearTimeout(t);
  }, [shown, result.weeks.length]);
  const done = shown >= result.weeks.length;
  // 부탁을 들어줬거나 못 들어줬을 때 아이 반응 소리
  useEffect(() => {
    if (!done) return;
    if (result.events.some((e) => e.startsWith('💝'))) sfx('chime');
    else if (result.events.some((e) => e.startsWith('💔'))) sfx('sad');
  }, [done, result.events]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3">
      <div className="pixel-box pop-in max-h-full w-full overflow-y-auto p-3 text-xs">
        <p className="mb-2 text-center text-sm font-bold">📅 이번 달 결과</p>
        <FirstTip id="result" text="한 달 동안 오른 능력치와 스트레스가 정리돼요. '대성공'은 스트레스가 낮을 때 더 자주 나와요." />
        <div className="grid grid-cols-1 gap-1">
          {result.weeks.slice(0, shown).map((w) => (
            <div key={w.week} className="pop-in relative border-2 border-ink bg-white p-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] opacity-60">{w.week + 1}주</span>
                <span className="text-lg">{w.emoji}</span>
                <span className="flex-1 font-bold">{w.actionName}</span>
                <span className={`border-2 border-ink px-1 text-[10px] ${OUTCOME_LABEL[w.outcome].cls}`}>{OUTCOME_LABEL[w.outcome].text}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {w.popups.map((p, i) => (
                  <span key={i} className="float-in border border-ink bg-panel px-1 font-bold text-wood">{ko(p)}</span>
                ))}
                {w.goldDelta !== 0 && <span className="px-1">{w.goldDelta > 0 ? '+' : ''}{w.goldDelta}G</span>}
                <span className="px-1">😵{w.stressDelta > 0 ? '+' : ''}{w.stressDelta}</span>
              </div>
              {w.usedCombos.length > 0 && (
                <p className="mt-1 text-[10px] text-emerald-700">✨ {w.usedCombos.map((id) => COMBO_MAP[id].name).join(', ')}</p>
              )}
              {w.notes.map((n, i) => (
                <p key={i} className="text-[10px] text-accent">{ko(n)}</p>
              ))}
            </div>
          ))}
        </div>
        {done && (
          <div className="pop-in mt-2 border-2 border-ink bg-panel-dark p-2">
            {result.events.map((e, i) => (
              <p key={i}>{ko(e)}</p>
            ))}
          </div>
        )}
        <PixelButton className="mt-3 w-full" color={done ? 'bg-mint' : 'bg-white'} onClick={done ? onClose : () => setShown(result.weeks.length)}>
          {done ? (result.ending ? '🎓 성인식으로...' : '다음 달로 ▶') : '빨리 보기 ▶▶'}
        </PixelButton>
      </div>
    </div>
  );
}
