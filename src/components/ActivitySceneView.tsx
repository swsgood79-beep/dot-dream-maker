import { useEffect, useState } from 'react';
import { SCENE_BEAT_MS, sceneBeats, sceneFor } from '../data/activityScenes';
import { sfx } from '../audio/sfx';
import type { WeekResult } from '../engine/simulation';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { readLight, type Light } from '../render/sceneLight';
import type { Gender } from '../types/game';
import { Sprite } from './Sprite';
import { ko } from './ui';

type Stage = 'CHILD' | 'TEEN' | 'YOUTH';

/** Gemini로 만든 장소 배경 (scripts/build-scenes.py → src/assets/scenes/{행동ID}.webp) */
const BG = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/scenes/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>).map(
    ([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v],
  ),
);
/** 활동 포즈 고해상도 원본 (scripts/build-sprites.py → src/assets/acts/{STAGE}_{G}_{동작}.webp) */
const HI = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/acts/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>).map(
    ([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v],
  ),
);
export const sceneBg = (id: string): string | undefined => BG[id];

/** 바깥 활동 중 방 대신 보여 주는 장소 장면 */
export function ActivitySceneView({ week, stage, gender }: { week: WeekResult; stage: Stage; gender: Gender }) {
  const sc = sceneFor(week);
  const beats = sceneBeats(week);
  // 단계: 0 도착 · 1 활동 중 · 2 결과 문장 · 3 결과 도장 + 획득
  const [phase, setPhase] = useState(0);
  const line = beats[Math.min(phase, beats.length - 1)] ?? '';
  const [typed, setTyped] = useState(0);
  const [light, setLight] = useState<Light | null>(null);
  useEffect(() => {
    const ts = SCENE_BEAT_MS.slice(1).map((ms, i) =>
      setTimeout(() => {
        setPhase(i + 1);
        if (i + 1 < 3) setTyped(0); // 도장 단계는 결과 문장을 그대로 둔다
        if (i + 1 === 3) sfx(week.outcome === 'GREAT' ? 'great' : week.outcome === 'FAIL' || week.outcome === 'RUNAWAY' ? 'fail' : 'stat');
      }, ms),
    );
    return () => ts.forEach(clearTimeout);
  }, [week]);
  useEffect(() => {
    if (typed >= line.length) return;
    const t = setTimeout(() => setTyped((n) => n + 1), 26);
    return () => clearTimeout(t);
  }, [typed, line]);
  const bgId = week.outcome === 'RUNAWAY' ? 'RUNAWAY' : week.actionId;
  useEffect(() => {
    const u = sceneBg(bgId);
    if (u) readLight(u, setLight);
  }, [bgId]);
  if (!sc) return null;
  // 결과(대성공·실패) 연출은 마지막 도장 단계에서
  const done = phase >= 3;
  const great = done && week.outcome === 'GREAT';
  const fail = done && (week.outcome === 'FAIL' || week.outcome === 'RUNAWAY');
  // 활동 포즈 그림이 있으면 그 동작으로 (대성공이어도 동작 그대로 폴짝)
  const actFrame = sc.act ? `${stage}_${gender}_${sc.act}` : '';
  const pose = fail ? 'tired' : actFrame && hasFrame(actFrame) ? sc.act! : great ? 'cheer' : sc.pose;
  const bg = sceneBg(week.outcome === 'RUNAWAY' ? 'RUNAWAY' : week.actionId);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(${sc.sky[0]}, ${sc.sky[1]})` }}>
      {bg ? (
        <>
          <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {/* 아이 쪽으로 빛이 모이고 가장자리는 살짝 어둡게 → 아이가 장면 안에 서 있는 느낌 */}
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 66%, rgba(255,246,220,.2), transparent 70%), radial-gradient(ellipse at 50% 55%, transparent 65%, rgba(20,16,30,.16))' }} />
        </>
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
        {/* 바닥에 닿는 그림자 (바닥 색으로) */}
        {bg && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{ bottom: -7, width: '78%', height: 16, borderRadius: '50%', background: `radial-gradient(closest-side, ${light?.shadow ?? 'rgba(0,0,0,.45)'}, transparent)` }}
          />
        )}
        <div className={great ? 'scene-hop' : fail ? 'scene-wobble' : ''}>
          <Sprite name={frameName(stage, gender, pose)} scale={2.1} light={bg ? light : null} hiSrc={HI[frameName(stage, gender, pose)]} />
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
      {/* 결과 도장 */}
      {done && (
        <div className="pointer-events-none absolute top-[26%] left-1/2 z-10 -translate-x-1/2">
          <span
            className="stamp-slam block rounded-md border-4 px-4 py-1 text-2xl font-bold whitespace-nowrap shadow-[4px_4px_0_rgba(0,0,0,.35)]"
            style={
              week.outcome === 'GREAT'
                ? { background: '#ffd84d', borderColor: '#c0392b', color: '#c0392b' }
                : week.outcome === 'FAIL' || week.outcome === 'RUNAWAY'
                  ? { background: '#d8dbe6', borderColor: '#5a5f73', color: '#3b3f4f' }
                  : { background: '#c8f5dc', borderColor: '#1b7a4a', color: '#1b7a4a' }
            }
          >
            {week.outcome === 'GREAT' ? '🌟 대성공!' : week.outcome === 'FAIL' ? '😵 실패...' : week.outcome === 'RUNAWAY' ? '🌧️ 가출...' : '✔ 성공'}
          </span>
        </div>
      )}
      {/* 이번 주 이야기 + 결과 */}
      <div className="absolute inset-x-3 bottom-3 rounded-lg border-3 border-ink bg-[#fffaf0] p-2 text-ink shadow-[3px_3px_0_rgba(0,0,0,.3)]">
        <p className="min-h-8 text-xs leading-snug">{line.slice(0, typed)}</p>
        {!done ? (
          // 진행 막대: 장면이 끝날 때까지 차오름
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full border border-ink bg-white">
            <div className="scene-progress h-full bg-[#5bd6a8]" />
          </div>
        ) : (
          <div className="mt-1 flex flex-wrap gap-1">
            {week.popups.slice(0, 6).map((p, i) => (
              <span key={i} className="pop-in rounded border border-ink bg-panel px-1 text-[10px] font-bold" style={{ animationDelay: `${0.25 + i * 0.12}s`, animationFillMode: 'both' }}>
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
        )}
      </div>
    </div>
  );
}
