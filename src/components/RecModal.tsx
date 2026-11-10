import { useState } from 'react';
import { sfx } from '../audio/sfx';
import type { Effect } from '../data/parentingData';
import { ACTING_INFO, REC_CHOICES, REC_CLUES } from '../engine/psyche';
import { recBg } from './ActingAlertModal';
import { growthStage } from '../engine/room';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { EffectChips, PixelButton } from './ui';
import { FirstTip } from './FirstTip';
import { monthIndex } from '../engine/simulation';

/** 🔴 REC 관찰 카메라 (GDD 11.2): 겉말이 갈라지고 속마음이 드러나면 공감 코칭 선택지가 열린다 */
export function RecModal({ onClose }: { onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const resolve = useGameStore((s) => s.resolveActing);
  const [act] = useState(() => game.acting!);
  const [phase, setPhase] = useState<'outer' | 'crack' | 'inner'>('outer');
  const [res, setRes] = useState<{ reply: string; delta: Effect } | null>(null);
  // 단서 찾기: 뷰파인더 속 수상한 곳을 눌러 찾는다 (다 찾으면 황금 처방 효과 ×1.3)
  const [found, setFound] = useState<number[]>([]);
  if (!act) return null;
  const set = REC_CHOICES[act.kind];
  const stage = growthStage(game.age);
  // 겉으로는 화나고 웅크린 모습 → 속마음이 보이면 그 안의 슬픈 모습으로 (상태 포즈 그림이 있으면)
  const info = ACTING_INFO[act.kind];
  const want = res ? (res.delta.affection ?? 0) > 0 ? (hasFrame(`${stage}_${game.gender}_mood_hug`) ? 'mood_hug' : 'cheer') : info.innerPose : phase === 'inner' ? info.innerPose : info.pose;
  const pose = hasFrame(`${stage}_${game.gender}_${want}`) ? want : act.kind === 'STRIKE' || act.kind === 'SILENT' ? 'tired' : 'stand';
  const bg = recBg(act.kind, res && (res.delta.affection ?? 0) > 0 ? 'after' : 'view');

  const observe = () => {
    sfx('page');
    setPhase('crack');
    setTimeout(() => {
      setPhase('inner');
      sfx('chime');
    }, 750);
  };
  const choose = (c: 'gold' | 0 | 1) => {
    const r = resolve(c, found.length);
    if (r) {
      setRes(r);
      sfx(c === 'gold' ? 'happy' : 'sad');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black">
      {/* 뷰파인더 */}
      <div className="relative flex-1 overflow-hidden bg-[#20242e]">
        {bg ? <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : <div className="room-bg absolute inset-0 opacity-60" />}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent_0_3px,rgba(0,0,0,.18)_3px_4px)]" />
        {/* 모서리 프레임 */}
        {['top-3 left-3 border-t-4 border-l-4', 'top-3 right-3 border-t-4 border-r-4', 'bottom-3 left-3 border-b-4 border-l-4', 'bottom-3 right-3 border-b-4 border-r-4'].map((c) => (
          <span key={c} className={`absolute h-8 w-8 border-white/90 ${c}`} />
        ))}
        <p className="absolute top-5 left-6 flex items-center gap-1 text-sm font-bold text-white">
          <span className="rec-blink text-[#ff3b3b]">●</span> REC
        </p>
        <p className="absolute top-5 right-6 text-[11px] font-bold text-white/80">OBSERVATION MODE · D+{monthIndex(game)}</p>
        <p className="absolute bottom-5 left-6 text-[10px] text-white/60">🔋 ▮▮▮▯</p>

        {/* 단서 찾기: 수상한 곳 */}
        {phase === 'outer' &&
          !res &&
          REC_CLUES[act.kind].map((c, i) => {
            const got = found.includes(i);
            return (
              <button
                key={i}
                onClick={() => {
                  if (got) return;
                  sfx('chime');
                  setFound((f) => [...f, i]);
                }}
                className={`absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xl ${got ? 'bg-[#5bd6a8]/40 ring-2 ring-[#5bd6a8]' : 'clue-pulse bg-white/15 ring-2 ring-white/50'}`}
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
                aria-label="수상한 곳 살펴보기"
              >
                <span style={{ opacity: got ? 1 : 0.55, filter: got ? undefined : 'blur(1.5px)' }}>{c.emoji}</span>
                {got && <span className="absolute -top-1 -right-1 text-xs">✔</span>}
              </button>
            );
          })}
        {/* 아이 클로즈업 */}
        <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2">
          <div className={phase !== 'outer' ? 'rec-zoom origin-bottom' : ''}>
            <Sprite name={frameName(stage, game.gender, pose)} scale={2.4} />
          </div>
        </div>
        {/* 겉말 → 갈라짐 → 속마음 */}
        <div className="absolute top-[18%] right-4 left-4 flex justify-center">
          {phase !== 'inner' ? (
            <div className={`relative max-w-[85%] rounded-sm border-3 border-ink bg-white px-3 py-2 text-center text-sm font-bold text-ink shadow-[3px_3px_0_#000] ${phase === 'crack' ? 'bubble-crack' : ''}`}
              style={{ clipPath: 'polygon(0 8%, 6% 0, 94% 0, 100% 10%, 98% 50%, 100% 90%, 92% 100%, 60% 100%, 50% 115%, 42% 100%, 6% 100%, 0 88%, 3% 50%)' }}>
              💢 “{act.outer}”
            </div>
          ) : (
            <div className="pop-in relative max-w-[90%] rounded-2xl border-3 border-[#3b6fd8] bg-[#dbe8ff] px-3 py-2 text-center text-sm font-bold text-[#1d3c8a] shadow-[0_0_18px_#7fb0ff]">
              💙 속마음: “{act.inner}”
            </div>
          )}
        </div>
      </div>

      {/* 하단 선택 */}
      <div className="max-h-[48%] overflow-y-auto border-t-4 border-ink bg-panel p-3 text-xs text-ink">
        {!res ? (
          <>
            <FirstTip id="rec" text="아이의 겉말 뒤에는 진짜 마음이 숨어 있어요. 관찰하면 속마음이 보이고, 그 마음에 맞는 황금 처방이 열려요." />
            {phase === 'outer' && (
              <>
                <p className="mb-1 text-[11px] font-bold">🔎 방 안의 수상한 곳을 눌러 단서를 찾아보세요 ({found.length}/3)</p>
                <div className="mb-2 grid gap-1">
                  {found.map((i) => (
                    <p key={i} className="pop-in rounded border-2 border-ink bg-[#fff6e5] px-2 py-1 text-[11px] leading-snug">
                      {REC_CLUES[act.kind][i].emoji} {REC_CLUES[act.kind][i].text}
                    </p>
                  ))}
                  {found.length === 3 && <p className="pop-in rounded bg-gold px-2 py-0.5 text-center text-[11px] font-bold">✨ 단서를 모두 찾았어요! 황금 처방 효과 ×1.3</p>}
                </div>
                <PixelButton className="mb-2 w-full" color="bg-[#ff5b5b] !text-white" onClick={observe}>
                  🔍 속마음 들여다보기{found.length < 3 ? ` (단서 ${found.length}/3)` : ''}
                </PixelButton>
              </>
            )}
            {phase === 'inner' && found.length > 0 && (
              <p className="mb-1 text-[10px] opacity-70">찾은 단서: {found.map((i) => REC_CLUES[act.kind][i].emoji).join(' ')}{found.length === 3 ? ' · 처방 효과 ×1.3' : ''}</p>
            )}
            {phase === 'inner' && (
              <button className="pixel-btn pop-in mb-2 w-full bg-gold px-2 py-2.5 text-left text-xs font-bold" onClick={() => choose('gold')}>
                {set.gold.label}
              </button>
            )}
            <p className="mb-1 text-[10px] opacity-60">{phase === 'inner' ? '또는' : '바로 대응하기'}</p>
            <div className="grid grid-cols-1 gap-1.5">
              {set.others.map((o, i) => (
                <button key={i} className="pixel-btn bg-white px-2 py-2 text-left" onClick={() => choose(i as 0 | 1)} disabled={phase === 'crack'}>
                  {o.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-full rounded-lg border-3 border-ink bg-white p-2 text-center">“{res.reply}”</div>
            <EffectChips fx={res.delta} />
            <PixelButton className="w-full" color="bg-mint" onClick={onClose}>
              ⏹ 녹화 종료
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
