import { FirstTip } from './FirstTip';
import { sceneBg } from './ActivitySceneView';

/** S7 대회 배경 (없으면 기존 그라데이션) */
const contestBg = (id: string) => {
  const u = sceneBg(`CONTEST_${id}`);
  return u ? `center 70% / cover no-repeat url(${u})` : undefined;
};
import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import type { ContestResult } from '../engine/simulation';
import { growthStage } from '../engine/room';
import { frameName } from '../render/spriteCharacter';
import type { Gender } from '../types/game';
import { Sprite } from './Sprite';
import { PixelButton, STAT_META } from './ui';
import { Icon } from './Icon';
import { CONTESTS, contestThreshold, type ContestId } from '../engine/simulation';
import { useGameStore } from '../store/useGameStore';
import { QuizGame, RhythmGame, SprintGame } from './Minigames';

const GAME_HELP: Record<ContestId, string> = {
  SPORTS: '달리기 타이밍 게임 — 초록 칸에서 화면을 눌러요 (3번)',
  ARTFEST: '리듬 게임 — 음표가 노란 선에 닿을 때 눌러요 (12개)',
  EXAM: '암산 퀴즈 — 시간 안에 정답을 골라요 (5문제)',
};

/** 대회 미니게임: 직접 도전하거나 응원만 하거나 → 결과 연출 */
export function ContestModal({ id, gender, age, onClose }: { id: ContestId; gender: Gender; age: number; onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const play = useGameStore((s) => s.playContest);
  const [phase, setPhase] = useState<'choose' | 'play' | 'score'>('choose');
  const [perf, setPerf] = useState(0);
  const [result, setResult] = useState<ContestResult | null>(null);
  const def = CONTESTS[id];
  const theme = THEME[id];
  const ease = Math.max(0.5, Math.min(1.5, game.stats[def.stat] / contestThreshold(age)));

  if (result) return <ContestReveal contest={result} gender={gender} age={age} onClose={onClose} />;

  const finish = (p: number | null) => {
    const r = play(p);
    if (r) setResult(r);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-3">
      <div className="wood-frame pop-in w-full overflow-hidden rounded-md">
        <div className="flex items-center justify-center gap-2 bg-accent py-1.5 text-sm font-bold text-white [text-shadow:1px_1px_0_#1b1f3b]">
          <span className="text-lg">{theme.icon}</span>
          {def.title}
          <span className="text-[10px] opacity-90">· {age}세</span>
        </div>
        {phase === 'choose' && (
          <>
            <div className="relative flex h-36 items-end justify-center" style={{ background: contestBg(id) ?? theme.bg }}>
              <span className="absolute top-2 left-2 rounded border-2 border-ink bg-[#fff6e5] px-1 text-[10px] font-bold">{theme.stage}</span>
              <Sprite name={frameName(growthStage(age), gender, 'stand')} scale={1.4} />
            </div>
            <div className="bg-[#fff6e5] p-3 text-xs">
              <p className="mb-1 text-center font-bold">
                {game.childName}의 {STAT_META[def.stat].label} {game.stats[def.stat]} · 우승 기준 {contestThreshold(age)}
              </p>
              <p className="mb-2 text-center text-[10px] opacity-70">{GAME_HELP[id]}</p>
              <FirstTip id="contest" text="1년에 세 번 대회가 열려요. 직접 미니게임을 하면 실력만큼 점수가 올라가요. 자신 없으면 응원만 해도 돼요." />
              <div className="grid grid-cols-2 gap-2">
                <PixelButton color="bg-gold" onClick={() => setPhase('play')}>
                  🎮 직접 도전
                </PixelButton>
                <PixelButton color="bg-white" onClick={() => finish(null)}>
                  🙌 응원만 하기
                </PixelButton>
              </div>
              <p className="mt-2 text-center text-[10px] opacity-60">직접 도전하면 실력에 따라 점수가 최대 +20%까지 올라가요</p>
            </div>
          </>
        )}
        {phase === 'play' && (
          <div className="bg-[#fff6e5] text-ink">
            {id === 'SPORTS' && <SprintGame ease={ease} onDone={(p) => (setPerf(p), setPhase('score'))} />}
            {id === 'ARTFEST' && <RhythmGame ease={ease} onDone={(p) => (setPerf(p), setPhase('score'))} />}
            {id === 'EXAM' && <QuizGame ease={ease} age={age} onDone={(p) => (setPerf(p), setPhase('score'))} />}
          </div>
        )}
        {phase === 'score' && (
          <div className="flex flex-col items-center gap-2 bg-[#fff6e5] p-4 text-ink">
            <p className="text-sm">미니게임 성적</p>
            <p className="text-4xl font-bold text-accent">{Math.round(perf * 100)}%</p>
            <p className="text-xs">{perf >= 0.85 ? '완벽한 컨디션!' : perf >= 0.6 ? '좋은 흐름이에요!' : perf >= 0.3 ? '조금 긴장했나 봐요' : '아쉬운 실수가 있었어요...'}</p>
            <PixelButton className="w-full" color="bg-gold" onClick={() => finish(perf)}>
              결과 발표 ▶
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}

const THEME: Record<ContestResult['id'], { icon: string; bg: string; stage: string; crowd: string }> = {
  SPORTS: { icon: '🏃', bg: 'linear-gradient(#8fd3ff, #c8f0ff 55%, #6fbf5a 55%, #4f9a45)', stage: '운동장', crowd: '📣' },
  ARTFEST: { icon: '🎭', bg: 'linear-gradient(#3a2a5c, #6b3fa0 60%, #8a5a35 60%, #6b4226)', stage: '강당 무대', crowd: '👏' },
  EXAM: { icon: '📝', bg: 'linear-gradient(#e8f0e0, #e8f0e0 62%, #b98048 62%, #8a5a35)', stage: '교실', crowd: '✏️' },
};

const RANK_LABEL = ['참가에 의의!', '우승!', '아깝게 2위', '3위 입상'];
const RANK_ICON = ['SPARKLE', 'TROPHY', 'MEDAL', 'MEDAL'];

/** 연간 대회 판정 연출: 인트로 → 점수 게이지 → 결과 도장 */
export function ContestReveal({ contest, gender, age, onClose }: { contest: ContestResult; gender: Gender; age: number; onClose: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'gauge' | 'result'>('intro');
  const [shown, setShown] = useState(0);
  const raf = useRef(0);
  const theme = THEME[contest.id];
  const max = Math.max(contest.threshold * 1.35, contest.score * 1.1, 10);
  const stage = growthStage(age);

  useEffect(() => {
    if (phase !== 'intro') return;
    const t = setTimeout(() => setPhase('gauge'), 900);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'gauge') return;
    sfx('drumroll');
    const start = performance.now();
    const DUR = 1700;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(contest.score * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else {
        setPhase('result');
        sfx(contest.win ? 'win' : 'lose');
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, contest.score, contest.win]);

  const skip = () => {
    cancelAnimationFrame(raf.current);
    setShown(contest.score);
    if (phase !== 'result') {
      setPhase('result');
      sfx(contest.win ? 'win' : 'lose');
    }
  };

  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const passed = shown >= contest.threshold;
  const kind = phase === 'result' ? (contest.win ? 'cheer' : 'stand') : 'stand';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-3" onClick={phase === 'result' ? undefined : skip}>
      <div className="wood-frame pop-in w-full overflow-hidden rounded-md" onClick={(e) => e.stopPropagation()}>
        {/* 제목 띠 */}
        <div className="flex items-center justify-center gap-2 bg-accent py-1.5 text-sm font-bold text-white [text-shadow:1px_1px_0_#1b1f3b]">
          <span className="text-lg">{theme.icon}</span>
          {contest.title}
          <span className="text-[10px] opacity-90">· {age}세</span>
        </div>

        {/* 무대 */}
        <div className="relative flex h-40 items-end justify-center" style={{ background: contestBg(contest.id) ?? theme.bg }}>
          <span className="absolute top-2 left-2 rounded border-2 border-ink bg-[#fff6e5] px-1 text-[10px] font-bold">{theme.stage}</span>
          {phase === 'result' && contest.win && (
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="confetti absolute top-0 h-2 w-1.5"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    background: ['#ff6fae', '#ffd84d', '#5bd6ff', '#5bd66b', '#ff7a59'][i % 5],
                    animationDelay: `${(i % 7) * 0.12}s`,
                  }}
                />
              ))}
            </div>
          )}
          <span className="absolute bottom-3 left-6 text-2xl opacity-80">{theme.crowd}</span>
          <span className="absolute right-6 bottom-3 text-2xl opacity-80">{theme.crowd}</span>
          <div className={`mb-1 ${phase === 'result' && contest.win ? 'animate-bounce' : ''}`}>
            <Sprite name={frameName(stage, gender, kind)} scale={1.4} />
          </div>
          {phase === 'result' && (
            <div
              className={`stamp absolute top-6 right-3 rotate-[-8deg] rounded border-4 px-2 py-1 text-lg font-bold ${
                contest.win ? 'border-[#c0392b] bg-gold text-[#c0392b]' : 'border-ink bg-white text-ink'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Icon name={RANK_ICON[contest.rank]} size={24} />
                {RANK_LABEL[contest.rank]}
              </span>
            </div>
          )}
        </div>

        {/* 점수 게이지 */}
        <div className="bg-[#fff6e5] p-3 text-xs">
          <div className="mb-1 flex items-center justify-between font-bold">
            <span>
              <Icon name={contest.stat} size={18} /> {STAT_META[contest.stat].label} 점수
            </span>
            <span className={`text-lg tabular-nums ${passed ? 'text-[#c0392b]' : 'text-ink'}`}>{phase === 'intro' ? '???' : shown}</span>
          </div>
          <div className="relative h-5 border-3 border-ink bg-[#2b2f5c]">
            <div
              className="h-full"
              style={{
                width: phase === 'intro' ? 0 : pct(shown),
                background: passed ? 'linear-gradient(#ffe680, #ffb020)' : 'linear-gradient(#9ff0ff, #4ac0f0)',
              }}
            />
            <div className="absolute top-[-6px] bottom-[-6px] w-0.5 bg-[#e5484d]" style={{ left: pct(contest.threshold) }} />
          </div>
          <div className="relative mt-1 h-4 text-[10px]">
            <span className="absolute -translate-x-1/2 font-bold whitespace-nowrap text-[#e5484d]" style={{ left: pct(contest.threshold) }}>
              ▲ 우승 기준 {contest.threshold}
            </span>
          </div>

          {phase === 'result' ? (
            <div className="pop-in mt-2 flex flex-col gap-2">
              <p className="text-center font-bold">
                {contest.win
                  ? '모두의 박수 속에 시상대에 올랐다!'
                  : contest.rank > 0
                    ? '조금만 더 했으면 우승이었는데!'
                    : `${STAT_META[contest.stat].label}을(를) 더 키워서 다시 도전하자.`}
              </p>
              {contest.rewards.length > 0 && (
                <div className="flex justify-center gap-1">
                  {contest.rewards.map((r) => (
                    <span key={r} className="rounded border-2 border-ink bg-gold px-1.5 py-0.5 font-bold">
                      {r}
                    </span>
                  ))}
                </div>
              )}
              <PixelButton color="bg-mint" className="w-full" onClick={onClose}>
                확인 ▶
              </PixelButton>
            </div>
          ) : (
            <p className="mt-2 text-center text-[10px] opacity-60">화면을 누르면 결과로 건너뜁니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
