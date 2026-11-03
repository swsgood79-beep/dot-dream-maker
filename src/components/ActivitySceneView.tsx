import { useEffect, useState } from 'react';
import { sceneFor, sceneLine } from '../data/activityScenes';
import type { WeekResult } from '../engine/simulation';
import { frameName, hasFrame } from '../render/spriteCharacter';
import type { Gender } from '../types/game';
import { Sprite } from './Sprite';
import { ko } from './ui';

type Stage = 'CHILD' | 'TEEN' | 'YOUTH';

/** Gemini로 만든 장소 배경 (scripts/build-scenes.py → src/assets/scenes/{행동ID}.jpg) */
const BG = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/scenes/*.jpg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>).map(
    ([k, v]) => [k.split('/').pop()!.replace('.jpg', ''), v],
  ),
);
export const sceneBg = (id: string): string | undefined => BG[id];

/** 바깥 활동 중 방 대신 보여 주는 장소 장면 */
export function ActivitySceneView({ week, stage, gender }: { week: WeekResult; stage: Stage; gender: Gender }) {
  const sc = sceneFor(week);
  const line = sceneLine(week);
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    if (typed >= line.length) return;
    const t = setTimeout(() => setTyped((n) => n + 1), 28);
    return () => clearTimeout(t);
  }, [typed, line]);
  if (!sc) return null;
  const great = week.outcome === 'GREAT';
  const fail = week.outcome === 'FAIL';
  // 활동 포즈 그림이 있으면 그 동작으로 (대성공이어도 동작 그대로 폴짝)
  const actFrame = sc.act ? `${stage}_${gender}_${sc.act}` : '';
  const pose = fail ? 'tired' : actFrame && hasFrame(actFrame) ? sc.act! : great ? 'cheer' : sc.pose;
  const bg = sceneBg(week.outcome === 'RUNAWAY' ? 'RUNAWAY' : week.actionId);

  return (
    <div className="scene-in absolute inset-0 z-20 overflow-hidden" style={{ background: `linear-gradient(${sc.sky[0]}, ${sc.sky[1]})` }}>
      {bg ? (
        <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        /* 바닥 */
        <div className="absolute inset-x-0 bottom-0 h-[30%] border-t-4 border-black/20" style={{ background: sc.floor }} />
      )}
      {/* 장소 이름 */}
      <div className={`absolute top-10 left-1/2 -translate-x-1/2 rounded border-2 border-ink px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${sc.dark ? 'bg-[#fff6e5]' : 'bg-white'}`}>
        📍 {sc.place}
      </div>
      {/* 칠판·화면 */}
      {!bg && sc.board && (
        <div
          className="absolute top-[22%] left-1/2 -translate-x-1/2 rounded border-4 border-[#6b4a2a] px-3 py-2 text-center text-sm leading-snug font-bold whitespace-pre"
          style={{ background: sc.board.bg, color: sc.board.color }}
        >
          {sc.board.text}
        </div>
      )}
      {/* 소품 */}
      {!bg && sc.props.map(([e, x, y, size], i) => (
        <span key={i} className="absolute leading-none drop-shadow-[2px_2px_0_rgba(0,0,0,.25)]" style={{ left: `${x}%`, bottom: `${y + 22}%`, fontSize: size * 1.3, transform: 'translateX(-50%)' }}>
          {e}
        </span>
      ))}
      {/* 아이 + 효과 */}
      <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2">
        <div className={great ? 'scene-hop' : fail ? 'scene-wobble' : ''}>
          <Sprite name={frameName(stage, gender, pose)} scale={2.1} />
        </div>
        {(fail ? ['💦', '😵'] : sc.fx).concat(great ? ['✨', '⭐'] : []).map((e, i) => (
          <span
            key={i}
            className="scene-fx text-lg font-bold"
            style={{ left: `${20 + ((i * 37) % 60)}%`, top: '10%', animationDelay: `${i * 0.35}s`, ['--dx' as string]: `${(i % 2 ? 1 : -1) * (8 + i * 4)}px`, color: '#5bff8a' }}
          >
            {e}
          </span>
        ))}
      </div>
      {great && (
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="confetti absolute top-0 h-2 w-1.5" style={{ left: `${(i * 37) % 100}%`, background: ['#ff6fae', '#ffd84d', '#5bd6ff', '#5bd66b'][i % 4], animationDelay: `${(i % 6) * 0.12}s` }} />
          ))}
        </div>
      )}
      {fail && <div className="pointer-events-none absolute inset-0 bg-[#3a3f5c]/25" />}
      {/* 이번 주 결과 */}
      <div className="absolute inset-x-3 bottom-3 rounded-lg border-3 border-ink bg-[#fffaf0] p-2 text-ink shadow-[3px_3px_0_rgba(0,0,0,.3)]">
        <p className="min-h-8 text-xs leading-snug">{line.slice(0, typed)}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {week.popups.slice(0, 6).map((p, i) => (
            <span key={i} className="pop-in rounded border border-ink bg-panel px-1 text-[10px] font-bold" style={{ animationDelay: `${0.4 + i * 0.15}s`, animationFillMode: 'both' }}>
              {ko(p)}
            </span>
          ))}
          {week.goldDelta !== 0 && (
            <span className={`pop-in rounded border border-ink px-1 text-[10px] font-bold ${week.goldDelta > 0 ? 'bg-gold' : 'bg-white'}`}>
              {week.goldDelta > 0 ? '+' : ''}
              {week.goldDelta}G
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
