import { useState } from 'react';
import { sfx } from '../audio/sfx';
import type { Effect } from '../data/parentingData';
import { HOMEWORK_WAY, LUNCH, type HomeworkWay, type Lunch } from '../engine/parentTouch';
import { growthStage } from '../engine/room';
import { CONTESTS, type ContestId } from '../engine/simulation';
import { frameName } from '../render/spriteCharacter';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { EffectChips, PixelButton } from './ui';

/** ✏️ 숙제 봐주기: 같이 풀기(퀴즈) / 정답 알려 주기 / 스스로 해 보라고 */
export function HomeworkModal({ onClose }: { onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const help = useGameStore((s) => s.helpHomework);
  const [hw] = useState(() => game.homeworkAsk!);
  const [mode, setMode] = useState<'ask' | 'quiz' | 'done'>('ask');
  const [res, setRes] = useState<{ delta: Effect; reply: string; correct?: boolean } | null>(null);
  const stage = growthStage(game.age);
  if (!hw) return null;
  const finish = (way: HomeworkWay, pick?: number) => {
    const r = help(way, pick);
    if (!r) return;
    sfx(r.correct === false ? 'page' : 'happy');
    setRes(r);
    setMode('done');
  };
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3">
      <div className="pixel-box pop-in w-full p-3 text-sm">
        <p className="mb-2 text-center text-lg font-bold">✏️ 숙제 좀 봐 줘...</p>
        <div className="room-bg mb-2 flex h-28 items-end justify-center gap-2 border-3 border-ink">
          <Sprite name={frameName(stage, game.gender, mode === 'done' ? (res?.correct === false ? 'stand' : 'cheer') : 'desk')} scale={1.4} />
        </div>
        <div className="mb-3 rounded border-2 border-ink bg-[#fffaf0] p-2 text-center">
          <p className="text-[11px] opacity-70">{game.childName}의 숙제</p>
          <p className="text-base font-bold">{hw.q}</p>
        </div>
        {mode === 'ask' && (
          <>
            <p className="mb-1 text-[11px] font-bold text-wood">"이거 모르겠어..." 어떻게 할까요?</p>
            <div className="grid gap-1.5">
              <button className="pixel-btn bg-white px-2 py-2 text-left text-xs" onClick={() => setMode('quiz')}>
                {HOMEWORK_WAY.TOGETHER.emoji} {HOMEWORK_WAY.TOGETHER.label} <span className="opacity-60">(직접 풀어 보기)</span>
              </button>
              <button className="pixel-btn bg-white px-2 py-2 text-left text-xs" onClick={() => finish('TELL')}>
                {HOMEWORK_WAY.TELL.emoji} {HOMEWORK_WAY.TELL.label}
              </button>
              <button className="pixel-btn bg-white px-2 py-2 text-left text-xs" onClick={() => finish('SELF')}>
                {HOMEWORK_WAY.SELF.emoji} {HOMEWORK_WAY.SELF.label}
              </button>
            </div>
          </>
        )}
        {mode === 'quiz' && (
          <>
            <p className="mb-1 text-center text-[11px] font-bold text-wood">정답은?</p>
            <div className="grid grid-cols-3 gap-1.5">
              {hw.options.map((o, i) => (
                <button key={i} className="pixel-btn bg-gold px-1 py-2.5 text-sm font-bold" onClick={() => finish('TOGETHER', i)}>
                  {o}
                </button>
              ))}
            </div>
          </>
        )}
        {mode === 'done' && res && (
          <div className="flex flex-col items-center gap-2">
            {res.correct !== undefined && (
              <p className={`pop-in text-lg font-bold ${res.correct ? 'text-emerald-700' : 'text-accent'}`}>{res.correct ? '⭕ 정답!' : `❌ 정답은 ${hw.options[hw.answer]}`}</p>
            )}
            <p className="w-full rounded-lg border-3 border-ink bg-white p-2 text-center text-xs">"{res.reply}"</p>
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

/** 🍱 대회 달: 도시락 싸 주기 (맞는 도시락이면 대회 점수 +8%) */
export function LunchModal({ contest, onClose }: { contest: ContestId; onClose: () => void }) {
  const pack = useGameStore((s) => s.packLunch);
  const [done, setDone] = useState<{ kind: Lunch; delta: Effect } | null>(null);
  const def = CONTESTS[contest];
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3">
      <div className="pixel-box pop-in w-full p-3 text-sm">
        <p className="text-center text-[11px] font-bold text-wood">
          {def.emoji} 이번 달은 {def.title}!
        </p>
        <p className="mb-3 text-center text-lg font-bold">🍱 도시락을 싸 줄까요?</p>
        {!done ? (
          <div className="grid gap-1.5">
            {(Object.keys(LUNCH) as Lunch[]).map((k) => (
              <button
                key={k}
                className="pixel-btn flex items-center gap-2 bg-white px-2 py-2 text-left text-xs"
                onClick={() => {
                  const d = pack(k);
                  if (!d) return;
                  sfx('happy');
                  setDone({ kind: k, delta: d });
                }}
              >
                <span className="text-2xl">{LUNCH[k].emoji}</span>
                <span>
                  <b className="block">{LUNCH[k].name}</b>
                  <span className="text-[10px] opacity-70">{LUNCH[k].desc}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="pop-in text-5xl">{LUNCH[done.kind].emoji}</span>
            <p className="w-full rounded-lg border-3 border-ink bg-white p-2 text-center text-xs">
              "{LUNCH[done.kind].stat === def.stat ? `우와, ${LUNCH[done.kind].name}! 힘이 난다! 꼭 잘할게!` : '고마워! 맛있게 먹을게~'}"
            </p>
            {LUNCH[done.kind].stat === def.stat && <p className="text-[11px] font-bold text-emerald-700">✨ 딱 맞는 도시락! 대회 점수 +8%</p>}
            <EffectChips fx={done.delta} />
            <PixelButton className="w-full" color="bg-mint" onClick={onClose}>
              확인
            </PixelButton>
          </div>
        )}
        {!done && (
          <button className="mt-2 w-full text-[11px] underline opacity-60" onClick={onClose}>
            다음에 (이번 달 안에는 방에서 다시 할 수 있어요)
          </button>
        )}
      </div>
    </div>
  );
}
