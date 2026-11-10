import { useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { EMO_MAP, STEP_META, type EmoStage } from '../data/emotionData';
import { displayStage } from '../engine/displayStage';
import { emoOptions, emoSteps, emoText, eqLabel, type EmoPick, type EmoResult } from '../engine/emotion';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { sceneBg } from './ActivitySceneView';
import { EffectChips, PixelButton } from './ui';

const DOOR_START = 35;

/** 장면별 장소 배경 (docs/bg2_requests.xlsx · 관찰 카메라 배경과 공유) — 그림이 들어오면 자동으로 쓰임 */
const EMO_BG: Record<string, string> = {
  EC_TOY: 'EMO_MART', EC_TEASE: 'EMO_ROOM', EC_DRAWING: 'EMO_ROOM', EC_GAME: 'EMO_LIVING', EC_CONTEST: 'EMO_CAR', EC_STRIKE: 'REC_STRIKE',
  ET_EXAM: 'REC_DOOR', ET_FRIEND: 'EMO_SOFA', ET_LOOKS: 'EMO_ROOM', ET_CONTEST: 'EMO_CAR', ET_STRIKE: 'REC_STRIKE',
  EY_ANXIETY: 'REC_SILENT', EY_JOB: 'EMO_SOFA', EY_BEHIND: 'EMO_SOFA', EY_CONTEST: 'EMO_CAR', EY_STRIKE: 'EMO_ENTRY',
};

/** 💗 감정의 순간: 아이가 울거나 화낼 때, 4단계로 반응을 고른다 (감정 코칭) */
export function EmotionModal({ id, onStart, onClose }: { id: string; onStart: () => void; onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const play = useGameStore((s) => s.playEmotion);
  const sc = EMO_MAP[id];
  const stage = displayStage(game) as EmoStage;
  const steps = useMemo(() => (sc ? emoSteps(sc) : []), [sc]);
  const [phase, setPhase] = useState<'intro' | 'choose' | 'reply' | 'result'>('intro');
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<EmoPick[]>([]);
  const [door, setDoor] = useState(DOOR_START);
  const [line, setLine] = useState('');
  const [last, setLast] = useState<{ good: boolean; d: number } | null>(null);
  const [res, setRes] = useState<EmoResult | null>(null);
  // 단계마다 선택지 순서를 섞는다 (정답 위치가 늘 같지 않게)
  const opts = useMemo(() => {
    if (!sc || i >= steps.length) return [];
    const o = emoOptions(sc, steps[i], stage);
    return o.map((x) => ({ x, k: Math.random() })).sort((a, b) => a.k - b.k).map((z) => z.x);
  }, [sc, i, steps, stage]);
  if (!sc) return null;
  const T = (t: string) => emoText(game, t);

  const finish = (p: EmoPick[], shut: boolean) => {
    const r = play(p, shut);
    sfx(r && r.good === r.total ? 'great' : r && r.good * 2 >= r.total ? 'happy' : 'sad');
    setRes(r);
    setPhase('result');
  };
  const choose = (o: { pick: EmoPick; reply: string }) => {
    const good = o.pick === 'GOOD';
    const d = good ? 22 : -15;
    const nd = Math.max(0, Math.min(100, door + d));
    sfx(good ? 'happy' : 'page');
    setDoor(nd);
    setLast({ good, d });
    setPicks([...picks, o.pick]);
    setLine(nd <= 0 ? '...됐어. (마음의 문이 닫혀 버렸다)' : o.reply);
    setPhase('reply');
  };
  const next = () => {
    if (door <= 0) return finish(picks, true);
    if (i + 1 >= steps.length) return finish(picks, false);
    setI(i + 1);
    setPhase('choose');
  };

  const feel = phase === 'result' ? (res && res.good === res.total ? '🥰' : res && res.good * 2 >= res.total ? '🙂' : '😶') : door >= 70 ? '🙂' : door >= 45 ? '😌' : sc.feel;
  // 아이 모습: 처음엔 그 상황의 감정(울음·화남·웅크림…) → 마음의 문이 열릴수록 한숨 → 진정 → 결과
  // 'a|b' 는 a 그림이 있으면 a, 없으면 b (아직 안 받은 새 포즈 → 가장 가까운 기존 포즈)
  const pick = (k: string) => k.split('|').find((x) => x === 'stand' || x === 'cheer' || hasFrame(`${stage}_${game.gender}_${x}`)) ?? 'stand';
  const pose =
    phase === 'result' && res
      ? pick(res.shut ? 'mood_back_sulk' : res.good === res.total ? 'mood_relieved|cheer' : res.good * 2 >= res.total ? 'stand' : 'mood_sulk')
      : phase === 'intro' || door < 45
        ? pick(door <= 0 ? 'mood_back_sulk' : sc.pose)
        : door < 70
          ? pick('mood_sigh')
          : 'stand';
  const doorLabel = door >= 70 ? '활짝 열림' : door >= 45 ? '조금 열림' : door > 0 ? '살짝 틈' : '닫힘';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-3">
      <div className="pop-in w-full overflow-hidden rounded-md border-3 border-ink text-sm shadow-[0_6px_0_rgba(0,0,0,.35)]">
        <div className="flex items-center justify-between bg-[#7a3b52] px-3 py-1.5 text-white">
          <span className="text-sm font-bold">💗 감정의 순간</span>
          <span className="text-[11px] font-bold opacity-90">
            {sc.emoji} {sc.title}
          </span>
        </div>

        {/* 장면: 아이 + 감정 + 말풍선 + 마음의 문 */}
        <div className="relative h-56 overflow-hidden" style={{ background: 'linear-gradient(#fbe3ea, #f3d2c2)' }}>
          {sceneBg(EMO_BG[sc.id] ?? '') && <img src={sceneBg(EMO_BG[sc.id])} alt="" className="absolute inset-0 h-full w-full object-cover object-bottom" draggable={false} />}
          {(
            <div className="absolute top-2 right-2 left-2 rounded-md bg-white/80 px-1.5 pt-0.5 pb-1">
              <div className="mb-0.5 flex justify-between text-[10px] font-bold text-ink/80">
                <span>🚪 마음의 문</span>
                <span>{doorLabel}</span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded border-2 border-ink bg-white">
                <div className="absolute inset-y-0 left-0 bg-[#ff8fb1] transition-all duration-500" style={{ width: `${door}%` }} />
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-6 flex items-end gap-1">
            <Sprite name={frameName(stage, game.gender, pose)} scale={2} />
            <span className="sp-bob mb-24 text-3xl drop-shadow-[0_2px_0_rgba(0,0,0,.25)]">{feel}</span>
          </div>
          <div className="pop-in absolute top-12 right-3 max-w-[58%] rounded-xl border-3 border-ink bg-white px-2.5 py-2 text-xs leading-relaxed font-bold" key={`${phase}${i}`}>
            {phase === 'intro' || (phase === 'choose' && i === 0) ? `"${T(sc.cry)}"` : phase === 'result' ? (res?.shut ? '......' : `"${T(steps.length && res && res.good === res.total ? '고마워. 이제 좀 괜찮아.' : res && res.good * 2 >= res.total ? '...응. 조금 나아졌어.' : '......')}"`) : line.startsWith('(') ? T(line) : `"${T(line)}"`}
          </div>
          {last && phase === 'reply' && (
            <span className={`pop-in absolute right-3 bottom-3 rounded-full border-2 border-ink px-2 py-0.5 text-[11px] font-bold ${last.good ? 'bg-[#c9f5df]' : 'bg-[#ffd0d0]'}`}>
              🚪 마음의 문 {last.d > 0 ? `+${last.d}` : last.d}
            </span>
          )}
        </div>

        <div className="flex min-h-[230px] flex-col justify-center bg-[#fffaf0] p-3">
          {phase === 'intro' && (
            <>
              <p className="mb-3 text-center text-xs leading-relaxed">{T(sc.scene)}</p>
              <PixelButton
                className="w-full"
                color="bg-[#ff8fb1]"
                onClick={() => {
                  onStart();
                  setPhase('choose');
                }}
              >
                다가가기
              </PixelButton>
            </>
          )}

          {phase === 'choose' && (
            <>
              <p className="mb-1 text-center text-[10px] font-bold text-wood">
                {i + 1} / {steps.length}
              </p>
              <p className="mb-2 text-center text-sm font-bold">{steps[i] === 'LIMIT' ? `'${sc.limit!.behavior}'는 어떻게 할까요?` : STEP_META[steps[i]].ask}</p>
              <div className="grid gap-1.5">
                {opts.map((o, k) => (
                  <button key={k} className="pixel-btn bg-white px-2 py-2 text-left text-xs leading-snug" onClick={() => choose(o)}>
                    {T(o.text)}
                  </button>
                ))}
              </div>
            </>
          )}

          {phase === 'reply' && (
            <PixelButton className="w-full" onClick={next}>
              {door <= 0 ? '...' : i + 1 >= steps.length ? '마무리' : '다음'}
            </PixelButton>
          )}

          {phase === 'result' && res && (
            <div className="flex flex-col gap-2">
              <p className="text-center text-base font-bold">
                {res.shut ? '🚪 아이가 마음을 닫았어요' : res.good === res.total ? '💗 아이 마음이 활짝 열렸어요' : res.good * 2 >= res.total ? '🙂 조금은 마음이 풀렸어요' : '😶 아이 마음이 아직 닫혀 있어요'}
              </p>
              <div className="grid gap-1 rounded border-2 border-ink bg-white p-2">
                {steps.map((st, k) => {
                  const p = res.picks[k];
                  const mark = p === undefined ? '—' : p === 'GOOD' ? '✅' : '❌';
                  return (
                    <div key={st} className="text-[11px] leading-snug">
                      <span className="font-bold">
                        {mark} {k + 1}. {STEP_META[st].title}
                      </span>
                      {p !== 'GOOD' && <p className="pl-5 opacity-75">💡 {STEP_META[st].why}</p>}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center">
                <EffectChips fx={res.delta} />
              </div>
              <div className="rounded border-2 border-ink bg-[#fff1c2] px-2 py-1 text-center text-[11px] font-bold">
                🧠 감정 조절력 {res.eqBefore} → {res.eqAfter} <span className="font-normal">({eqLabel(res.eqAfter)})</span>
              </div>
              <p className="text-center text-[10px] opacity-70">이 4단계는 실제 육아에서 '감정 코칭'이라고 부르는 방법이에요. 감정 조절력이 자라면 스트레스가 터지기 전에 먼저 털어놓고, 학원 파업도 줄어요.</p>
              <PixelButton className="w-full" onClick={onClose}>
                닫기
              </PixelButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
