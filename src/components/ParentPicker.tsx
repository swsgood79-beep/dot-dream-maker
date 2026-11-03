import { sfx } from '../audio/sfx';
import {
  ABILITIES,
  ABILITY_META,
  PARENT_JOBS,
  PARENT_JOB_MAP,
  PARENT_MAX,
  PARENT_TOTAL,
  parentAllowanceMul,
  parentStartGold,
  randomParent,
  type ParentProfile,
} from '../data/parentData';

/** "우리 집은 어떤 집?" — 직업 프리셋 · 직접 조정 · 🎲 랜덤 */
export function ParentPicker({ value, onChange }: { value: ParentProfile; onChange: (p: ParentProfile) => void }) {
  const used = ABILITIES.reduce((a, k) => a + value.points[k], 0);
  const left = PARENT_TOTAL - used;
  const set = (k: (typeof ABILITIES)[number], d: number) => {
    const v = value.points[k] + d;
    if (v < 0 || v > PARENT_MAX || (d > 0 && left <= 0)) return;
    sfx('click');
    const points = { ...value.points, [k]: v };
    const match = PARENT_JOBS.find((j) => ABILITIES.every((a) => j.points[a] === points[a]));
    onChange({ job: match?.id ?? 'CUSTOM', points });
  };
  const job = value.job !== 'CUSTOM' ? PARENT_JOB_MAP[value.job] : null;
  const allowance = Math.round(300 * parentAllowanceMul(value.points));

  return (
    <div>
      <div className="mb-2 grid grid-cols-4 gap-1">
        {PARENT_JOBS.map((j) => (
          <button
            key={j.id}
            onClick={() => {
              sfx('click');
              onChange({ job: j.id, points: { ...j.points } });
            }}
            className={`pixel-btn flex flex-col items-center px-0.5 py-1 text-[10px] leading-tight ${value.job === j.id ? 'bg-gold' : 'bg-white'}`}
          >
            <span className="text-lg">{j.emoji}</span>
            {j.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          sfx('page');
          onChange(randomParent());
        }}
        className="pixel-btn mb-2 w-full bg-sky py-1.5 text-xs"
      >
        🎲 주사위로 정하기
      </button>
      <p className="mb-1 text-center text-[11px]">
        {job ? (
          <>
            <b>
              {job.emoji} {job.label}
            </b>{' '}
            <span className="opacity-70">— {job.desc}</span>
          </>
        ) : (
          <b>🏠 우리만의 집 (직접 설정)</b>
        )}
      </p>
      <div className="rounded border-2 border-ink bg-[#fff6e5] p-1.5">
        {ABILITIES.map((k) => (
          <div key={k} className="flex items-center gap-1 py-0.5 text-[11px]">
            <span className="w-16 shrink-0 font-bold">
              {ABILITY_META[k].emoji} {ABILITY_META[k].label}
            </span>
            <button className="pixel-btn w-5 bg-white text-xs leading-none" onClick={() => set(k, -1)} disabled={value.points[k] <= 0}>
              −
            </button>
            <span className="flex gap-0.5">
              {Array.from({ length: PARENT_MAX }).map((_, i) => (
                <span key={i} className={`h-3 w-3 border-2 border-ink ${i < value.points[k] ? 'bg-accent' : 'bg-white'}`} />
              ))}
            </span>
            <button className="pixel-btn w-5 bg-white text-xs leading-none" onClick={() => set(k, 1)} disabled={value.points[k] >= PARENT_MAX || left <= 0}>
              +
            </button>
            <span className="min-w-0 flex-1 truncate text-[9px] opacity-60">{ABILITY_META[k].desc}</span>
          </div>
        ))}
        <p className="mt-1 flex justify-between border-t border-dashed border-ink/40 pt-1 text-[10px]">
          <span>
            남은 포인트 <b className={left ? 'text-accent' : ''}>{left}</b> / {PARENT_TOTAL}
          </span>
          <span className="opacity-70">
            시작 {parentStartGold(value.points).toLocaleString()}G · 지원금 {allowance}G~
          </span>
        </p>
      </div>
    </div>
  );
}
