import { useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import type { Effect } from '../data/parentingData';
import { computeReport, REPORT_REACTIONS } from '../engine/school';
import { useGameStore } from '../store/useGameStore';
import { EffectChips, PixelButton } from './ui';

const GRADE_COLOR = (r: number) => (r >= 1.15 ? 'text-[#2b8a3e]' : r >= 0.9 ? 'text-[#1971c2]' : r >= 0.65 ? 'text-ink' : 'text-accent');

/** 성적표 + 담임 선생님 말씀 → 부모의 반응 */
export function ReportCardModal({ onPick, onClose }: { onPick: () => void; onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const react = useGameStore((s) => s.reactReport);
  const card = useMemo(() => computeReport(game), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [res, setRes] = useState<{ reply: string; delta: Effect } | null>(null);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3">
      <div className="pop-in max-h-full w-full overflow-y-auto rounded-sm border-3 border-ink bg-[#fffdf3] p-3 text-xs text-ink shadow-[6px_6px_0_rgba(0,0,0,.35)]">
        <p className="text-center text-[10px] opacity-60">가정통신문</p>
        <p className="mb-2 text-center text-lg font-bold">
          📜 {card.school} {card.term} 성적표
        </p>
        <table className="mb-2 w-full border-2 border-ink text-center">
          <tbody>
            {card.subjects.map((s) => (
              <tr key={s.name} className="border-b border-ink/30">
                <td className="border-r border-ink/30 py-1 font-bold">{s.name}</td>
                <td className={`py-1 text-base font-bold ${GRADE_COLOR(s.ratio)}`}>{s.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mb-3 rounded border-2 border-dashed border-ink/50 bg-white p-2">
          <p className="mb-0.5 font-bold">✏️ 담임 선생님 말씀</p>
          <p className="leading-relaxed">
            {game.childName} 학생은 {card.comments.join(' ')}
          </p>
        </div>
        {!res ? (
          <>
            <p className="mb-1 text-[11px] font-bold text-wood">성적표를 본 아이가 눈치를 살펴요. 뭐라고 할까요?</p>
            <div className="grid grid-cols-1 gap-1.5">
              {REPORT_REACTIONS.map((r) => (
                <button
                  key={r.style}
                  className="pixel-btn bg-white px-2 py-2 text-left"
                  onClick={() => {
                    onPick();
                    const out = react(r.style);
                    if (!out) return;
                    sfx((out.delta.affection ?? 0) >= 0 ? 'stat' : 'fail');
                    setRes(out);
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-full rounded-lg border-3 border-ink bg-white p-2 text-center">“{res.reply}”</div>
            <EffectChips fx={res.delta} />
            <PixelButton className="w-full" color="bg-mint" onClick={onClose}>
              확인
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
