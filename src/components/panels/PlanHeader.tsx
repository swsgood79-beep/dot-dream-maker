import { SCHEDULE_ACTIONS } from '../../data/scheduleData';
import { displayStage } from '../../engine/displayStage';
import { ADVICE_META, defianceOf, planMode, SUPPORT_META, trustOf, type Advice, type Support } from '../../engine/negotiate';
import { frameName, hasFrame } from '../../render/spriteCharacter';
import { useGameStore } from '../../store/useGameStore';
import { Sprite } from '../Sprite';
import { useState } from 'react';
import { sfx } from '../../audio/sfx';

const act = (id: string) => SCHEDULE_ACTIONS.find((a) => a.id === id)!;

/** 🤝 청소년 협상 · 🕊️ 청년 자율: 스케줄 창 맨 위 아이 계획 + 신뢰·반발 */
export function PlanHeader() {
  const game = useGameStore((s) => s.game)!;
  const mode = planMode(game.age);
  const stage = displayStage(game);
  const lines = useGameStore((s) => s.negoLines);
  if (mode === 'PARENT') return null;
  const trust = trustOf(game);
  const def = defianceOf(game);
  const want = game.childWant ?? game.monthlySchedule;
  const moodPick = (k: string) => (hasFrame(`${stage}_${game.gender}_${k}`) ? k : 'stand');
  const pose = lines ? (lines.some((l) => l.how === 'FORCE') ? moodPick('mood_sulk') : 'cheer') : def >= 50 ? moodPick('mood_rebel') : 'stand';
  const say =
    mode === 'AUTONOMY'
      ? '이번 달은 이렇게 할게. 내가 정했어!'
      : lines
        ? lines.some((l) => l.how === 'FORCE')
          ? '...알았다고.'
          : '좋아, 그렇게 하자!'
        : '이번 달엔 이거 하고 싶어!';
  return (
    <div className="mb-2 rounded border-2 border-ink bg-[#fff6e5] p-2">
      <div className="flex items-end gap-2">
        <Sprite name={frameName(stage, game.gender, pose)} scale={0.9} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 rounded-lg border-2 border-ink bg-white px-2 py-1 text-[11px] font-bold">"{say}"</p>
          <div className="flex gap-1">
            {want.map((id, i) => (
              <span key={i} className="flex-1 rounded border border-ink/40 bg-white px-0.5 text-center text-[10px] leading-tight">
                {act(id).emoji}
                <br />
                <span className="opacity-70">{i + 1}주</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-2 text-[10px] font-bold">
        <Meter label="🤝 신뢰" v={trust} color="#5bd6a8" />
        <Meter label="😤 반발" v={def} color="#e5484d" />
      </div>
      <p className="mt-1 text-[10px] leading-snug opacity-75">
        {mode === 'NEGOTIATE'
          ? '아래에서 칸을 바꾸면 💬 설득하거나 ✋ 강제로 정할 수 있어요. 그대로 둔 칸은 ✨자기주도 (능력치 +20% · 스트레스 -20%). 강제할수록 반발이 쌓여 파업할 수 있어요.'
          : '청년기에는 아이가 스스로 정해요. 부모는 한 달에 한 번 뒷받침만 할 수 있어요. 믿음(신뢰)이 클수록 진로 상담을 잘 따라요.'}
      </p>
      {mode === 'NEGOTIATE' && lines && <NegoResult />}
      {mode === 'AUTONOMY' && <SupportCards />}
    </div>
  );
}

function Meter({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-12 shrink-0">{label}</span>
      <span className="relative h-2 flex-1 overflow-hidden rounded border border-ink bg-white">
        <span className="absolute inset-y-0 left-0" style={{ width: `${v}%`, background: color }} />
      </span>
      <span className="w-6 text-right">{v}</span>
    </span>
  );
}

function NegoResult() {
  const lines = useGameStore((s) => s.negoLines)!;
  const TAG = { OK: '✨ 자기주도', ASK_OK: '💬 설득 성공', ASK_NO: '💬 설득 실패 → 아이 뜻대로', FORCE: '✋ 강제' } as const;
  const BG = { OK: 'bg-[#e0f7ea]', ASK_OK: 'bg-[#e6f0ff]', ASK_NO: 'bg-[#fff1c2]', FORCE: 'bg-[#ffe0e0]' } as const;
  return (
    <div className="pop-in mt-2 grid gap-1">
      {lines.map((l) => (
        <div key={l.week} className={`rounded border border-ink/50 px-1.5 py-1 text-[10px] ${BG[l.how]}`}>
          <b>
            {l.week + 1}주 {act(l.how === 'ASK_NO' ? l.want : l.ask).emoji} {act(l.how === 'ASK_NO' ? l.want : l.ask).name}
          </b>{' '}
          · {TAG[l.how]}
          <br />
          <span className="opacity-80">"{l.reply}"</span>
        </div>
      ))}
    </div>
  );
}

function SupportCards() {
  const game = useGameStore((s) => s.game)!;
  const choose = useGameStore((s) => s.chooseSupport);
  const [advice, setAdvice] = useState(false);
  if (game.support) {
    const m = SUPPORT_META[game.support];
    return (
      <p className="pop-in mt-2 rounded border-2 border-ink bg-[#e0f7ea] px-2 py-1 text-center text-[11px] font-bold">
        이번 달 뒷받침: {m.emoji} {m.label}
        {game.support === 'ADVICE' && game.advice && ` — ${ADVICE_META[game.advice].emoji} ${ADVICE_META[game.advice].label}`}
      </p>
    );
  }
  if (advice)
    return (
      <div className="pop-in mt-2 grid grid-cols-2 gap-1">
        {(Object.keys(ADVICE_META) as Advice[]).map((k) => (
          <button
            key={k}
            className="pixel-btn bg-white px-1 py-1.5 text-[10px]"
            onClick={() => {
              if (choose('ADVICE', k)) sfx('happy');
            }}
          >
            {ADVICE_META[k].emoji} {ADVICE_META[k].label}
          </button>
        ))}
      </div>
    );
  return (
    <div className="mt-2 grid gap-1">
      <p className="text-[11px] font-bold text-wood">이번 달, 어떻게 도와줄까요? (1장)</p>
      {(Object.keys(SUPPORT_META) as Support[]).map((k) => (
        <button
          key={k}
          className="pixel-btn flex items-center gap-2 bg-white px-2 py-1 text-left text-[11px]"
          onClick={() => {
            if (k === 'ADVICE') return setAdvice(true);
            if (choose(k)) sfx('happy');
          }}
        >
          <span className="text-xl">{SUPPORT_META[k].emoji}</span>
          <span className="flex-1">
            <b>{SUPPORT_META[k].label}</b>
            {SUPPORT_META[k].cost ? ` · ${SUPPORT_META[k].cost}G` : ''}
            <br />
            <span className="opacity-70">{SUPPORT_META[k].desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
