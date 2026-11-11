import { FirstTip } from './FirstTip';
import { useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { displayStage } from '../engine/displayStage';
import { buildReview, goalOptions, type YearGoal } from '../engine/yearReview';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { useGameStore } from '../store/useGameStore';
import { townText } from '../engine/town';
import type { StatKey } from '../types/game';
import { Icon } from './Icon';
import { Sprite } from './Sprite';
import { PixelButton, STAT_META } from './ui';

/** 🪞 연말 성장 거울: 지난 1년 → 내 선택이 남긴 것 → 새해 목표 */
export function YearReviewModal() {
  const game = useGameStore((s) => s.game)!;
  const finish = useGameStore((s) => s.finishYearReview);
  const rv = useMemo(() => buildReview(game), []); // eslint-disable-line react-hooks/exhaustive-deps
  const goals = useMemo(() => goalOptions(game), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [page, setPage] = useState(0);
  const [pick, setPick] = useState<YearGoal | null>(null);
  const stage = displayStage(game);
  const maxD = Math.max(10, ...Object.values(rv.statDelta));
  const next = () => {
    sfx('page');
    setPage(page + 1);
  };
  const pose = page === 0 ? 'cheer' : rv.mirrors.filter((m) => m.good).length >= rv.mirrors.length / 2 ? 'stand' : hasFrame(`${stage}_${game.gender}_mood_sigh`) ? 'mood_sigh' : 'stand';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-3">
      <div className="pop-in max-h-full w-full overflow-y-auto rounded-md border-3 border-ink bg-[#fffaf0] text-sm shadow-[0_6px_0_rgba(0,0,0,.35)]">
        <div className="bg-[linear-gradient(#2b2350,#5a3a7a)] px-3 pt-3 pb-2 text-center text-white">
          <p className="text-[11px] opacity-80">🎆 새해가 밝았어요</p>
          <p className="text-lg font-bold">🪞 {game.childName}의 {rv.age}살, 1년 돌아보기</p>
          <div className="mt-1 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i <= page ? 'bg-gold' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        {page === 0 && (
          <div className="p-3">
            <div className="mb-2 flex items-end justify-center gap-3">
              <Sprite name={frameName(stage, game.gender, pose)} scale={1.2} />
              <div className="pop-in mb-4 rounded-lg border-3 border-ink bg-gold px-3 py-1.5 text-center font-bold shadow-[2px_2px_0_rgba(0,0,0,.3)]">
                <p className="text-[10px]">올해의 상</p>
                <p className="text-sm">{rv.award}</p>
              </div>
            </div>
            <p className="mb-1 text-[11px] font-bold text-wood">📈 1년 동안 자란 만큼</p>
            <div className="mb-2 grid gap-1">
              {(Object.keys(rv.statDelta) as StatKey[]).map((k) => (
                <div key={k} className="flex items-center gap-1.5 text-[11px]">
                  <span className="flex w-14 items-center gap-1">
                    <Icon name={k} size={14} />
                    {STAT_META[k].label}
                  </span>
                  <span className="relative h-3 flex-1 overflow-hidden rounded border-2 border-ink bg-white">
                    <span className="absolute inset-y-0 left-0 transition-all duration-700" style={{ width: `${Math.max(0, (rv.statDelta[k] / maxD) * 100)}%`, background: STAT_META[k].color }} />
                  </span>
                  <span className="w-9 text-right font-bold">{rv.statDelta[k] >= 0 ? '+' : ''}{rv.statDelta[k]}</span>
                </div>
              ))}
            </div>
            <p className="mb-3 rounded border-2 border-ink bg-white px-2 py-1 text-center text-xs">💬 "{rv.comment}"</p>
            <PixelButton className="w-full" onClick={next}>
              내 선택이 남긴 것 보기 ▶
            </PixelButton>
          </div>
        )}

        {page === 1 && (
          <div className="p-3">
            <FirstTip id="mirror" text="해마다 지난 1년 동안의 선택이 아이에게 어떤 흔적을 남겼는지 보여 줘요. 초록 칸은 잘한 점, 빨간 칸은 다음 해에 바꿔 볼 점이에요." />
            <p className="mb-2 text-center text-sm font-bold">🪞 당신의 선택이 아이에게 남긴 것</p>
            <div className="mb-3 grid gap-2">
              {rv.mirrors.map((m, i) => (
                <div key={i} className={`pop-in rounded border-2 border-ink p-2 text-[11px] leading-snug ${m.good ? 'bg-[#e8f8ee]' : 'bg-[#fdeaea]'}`} style={{ animationDelay: `${i * 0.15}s` }}>
                  <p className="font-bold">
                    {m.icon} {m.did}
                  </p>
                  <p className="my-0.5 pl-4">→ {m.left}</p>
                  <p className="pl-4 text-[10px] opacity-75">💡 {m.tip}</p>
                </div>
              ))}
            </div>
            <PixelButton className="w-full" onClick={next}>
              새해 목표 정하기 ▶
            </PixelButton>
          </div>
        )}

        {page === 2 && (
          <div className="p-3">
            {rv.goal && (
              <div className={`pop-in mb-2 rounded border-2 border-ink p-2 text-center text-xs font-bold ${rv.goal.done ? 'bg-gold' : 'bg-[#eee]'}`}>
                {rv.goal.done ? '🎉 작년 목표 달성!' : '😢 작년 목표는 아쉽게 못 이뤘어요'} — {rv.goal.title}
                {rv.goal.done && <p className="text-[10px] font-normal">영감 +5 · 자존감 +5 · 친밀도 +3 · 사진첩에 저장</p>}
              </div>
            )}
            <p className="mb-1 text-center text-sm font-bold">🎯 {townText('{name}와(과)', { name: game.childName })} 함께 정하는 {game.age}살 목표</p>
            <p className="mb-2 text-center text-[10px] opacity-70">1년 동안 방 위쪽에 진행 상황이 보여요. 이루면 다음 새해에 보상!</p>
            <div className="mb-3 grid gap-1.5">
              {goals.map((g) => (
                <button key={g.id} className={`pixel-btn px-2 py-2 text-left text-xs ${pick?.id === g.id ? 'bg-gold' : 'bg-white'}`} onClick={() => (sfx('click'), setPick(g))}>
                  {g.emoji} {g.title}
                </button>
              ))}
            </div>
            <PixelButton
              className="w-full"
              color={pick ? 'bg-mint' : 'bg-white'}
              onClick={() => {
                sfx(pick ? 'happy' : 'page');
                finish(pick);
              }}
            >
              {pick ? '이 목표로 새해 시작! 🎆' : '목표 없이 시작하기'}
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
