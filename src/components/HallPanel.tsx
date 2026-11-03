import { ENDING_MAP } from '../data/endingData';
import { ACHIEVEMENTS } from '../data/legacyData';
import { PARENT_JOB_MAP } from '../data/parentData';
import { RELATION_META } from '../engine/psyche';
import { TEMPERAMENT_MAP } from '../data/temperamentData';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { TIER_COLOR } from './ui';

/** 🏛️ 명예의 전당: 지금까지 키운 아이들 */
export function HallPanel() {
  const hall = useGameStore((s) => s.hallOfFame) ?? [];
  if (!hall.length) return <p className="py-8 text-center text-xs opacity-70">아직 키운 아이가 없어요. 첫 아이를 성인식까지 키워 보세요!</p>;
  return (
    <div className="grid grid-cols-1 gap-2">
      {[...hall].reverse().map((h, i) => {
        const e = ENDING_MAP[h.endingId];
        const job = `JOB_${h.endingId}_${h.gender}`;
        const t = h.temperament ? TEMPERAMENT_MAP[h.temperament] : null;
        const p = h.parentJob && h.parentJob !== 'CUSTOM' ? PARENT_JOB_MAP[h.parentJob] : null;
        return (
          <div key={i} className="flex gap-2 rounded border-3 border-ink bg-[#fff6e5] p-2 text-ink">
            <div className="room-bg flex w-16 shrink-0 items-end justify-center border-2 border-ink">
              <Sprite name={hasFrame(job) ? job : frameName('YOUTH', h.gender, 'cheer')} scale={0.8} />
            </div>
            <div className="min-w-0 flex-1 text-[11px]">
              <p className="flex items-center gap-1">
                <b className="text-sm">{h.name}</b>
                <span className="opacity-60">· {h.playthrough}번째 아이</span>
                {h.dream && <span title="꿈을 이룸">🌟</span>}
                {h.relation && <span title={RELATION_META[h.relation].label}>{RELATION_META[h.relation].emoji}</span>}
              </p>
              <p className="flex items-center gap-1">
                <span className={`rounded border border-ink px-1 text-[9px] font-bold ${TIER_COLOR[e.tier]}`}>{e.tier}</span>
                <b>{e.title}</b>
              </p>
              <p className="text-[10px] opacity-70">
                {t ? `${t.emoji} ${t.label} 아이` : ''} {p ? `· ${p.emoji} ${p.label} 집` : h.parentJob === 'CUSTOM' ? '· 🏠 우리만의 집' : ''}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] italic opacity-80">“{h.quote}”</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 🏅 업적 30종 */
export function AchievementPanel() {
  const have = useGameStore((s) => s.achievements) ?? [];
  return (
    <div>
      <p className="mb-2 text-center text-xs font-bold">
        {have.length} / {ACHIEVEMENTS.length} 달성 · 새 업적 하나마다 다음 판 💡+3
      </p>
      <div className="grid grid-cols-1 gap-1">
        {ACHIEVEMENTS.map((a) => {
          const ok = have.includes(a.id);
          return (
            <div key={a.id} className={`flex items-center gap-2 rounded border-2 border-ink px-2 py-1 text-[11px] ${ok ? 'bg-[#fff1c2]' : 'bg-white opacity-55'}`}>
              <span className={`text-xl ${ok ? '' : 'grayscale'}`}>{ok ? a.emoji : '🔒'}</span>
              <span className="min-w-0 flex-1">
                <b>{a.name}</b>
                <span className="block text-[10px] opacity-70">{a.desc}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
