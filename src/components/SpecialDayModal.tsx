import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import type { Effect } from '../data/parentingData';
import { SPECIAL_MAP, type SpStep, type SpecialDay } from '../data/specialDays';
import { growthStage } from '../engine/room';
import { fillText, type SpecialPlay } from '../engine/specialDay';
import { hasFrame, frameName } from '../render/spriteCharacter';
import { FirstTip } from './FirstTip';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { sceneBg } from './ActivitySceneView';
import { npcArt } from './TownModal';
import atlas from '../render/characterAtlas.json';

const frameH = (stage: string, g: string) => (atlas as Record<string, { h: number }>)[`${stage}_${g}_stand`]?.h ?? 66;
import { EffectChips, PixelButton } from './ui';

type Done = { picks: number[]; score?: number; tier?: 0 | 1 | 2 };

/** ✨ 특별한 하루: 도입 → 놀이 단계들 → 결과 */
export function SpecialDayModal({ id, onStart, onClose }: { id: string; onStart: () => void; onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const play = useGameStore((s) => s.playSpecial);
  const day = SPECIAL_MAP[id];
  const [step, setStep] = useState(-1); // -1 도입, steps.length 결과
  const [acc, setAcc] = useState<SpecialPlay>({ picks: [], score: 0, tier: 1 });
  const [res, setRes] = useState<{ text: string; title: string; delta: Effect; photo: boolean } | null>(null);
  const [buildPicks, setBuildPicks] = useState<number[]>([]);
  const stage = growthStage(game.age);
  const name = game.childName;
  if (!day) return null;
  const next = (d: Done) => {
    const a: SpecialPlay = { picks: [...acc.picks, ...d.picks], score: d.score ?? acc.score, tier: d.tier ?? acc.tier };
    setAcc(a);
    if (step + 1 >= day.steps.length) {
      const r = play(a);
      sfx(r && (a.tier === 2 || day.steps[day.steps.length - 1].kind === 'pick') ? 'great' : 'happy');
      setRes(r);
    }
    setStep(step + 1);
  };
  const cur = step >= 0 && step < day.steps.length ? day.steps[step] : null;
  const pose = res ? ((res.delta.stress ?? 0) > 0 ? (hasFrame(`${stage}_${game.gender}_mood_sigh`) ? 'mood_sigh' : 'stand') : 'cheer') : 'stand';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-3">
      <div className="pop-in w-full overflow-hidden rounded-md border-3 border-ink text-sm shadow-[0_6px_0_rgba(0,0,0,.35)]">
        {/* 장면 */}
        <div className="relative h-60 overflow-hidden" style={{ background: `linear-gradient(${day.sky[0]}, ${day.sky[1]})` }}>
          {sceneBg(day.id) ? (
            <img src={sceneBg(day.id)} alt="" className="absolute inset-0 h-full w-full object-cover object-bottom" draggable={false} />
          ) : (
            day.deco.map((e, i) => (
              <span key={i} className="sp-float absolute select-none text-2xl opacity-80" style={{ left: `${8 + i * 34}%`, top: `${8 + (i % 2) * 10}%`, animationDelay: `${i * 0.7}s` }}>
                {e}
              </span>
            ))
          )}
          <span className="absolute top-2 left-2 rounded-full border-2 border-ink bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">★ 특별한 하루</span>
          {!cur && (
            <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-3">
              {day.id === 'SP_FRIEND_VISIT' && npcArt('FRIEND', stage, game.gender) ? (
                // 친구가 놀러 온 날: 이모지 대신 단짝 도트 그림 (아이 쪽을 바라봄)
                <img src={npcArt('FRIEND', stage, game.gender)} alt="" className="order-last" style={{ height: frameH(stage, game.gender) * 1.6 }} draggable={false} />
              ) : (
                <span className="sp-bob text-5xl drop-shadow-[0_3px_0_rgba(0,0,0,.3)]">{day.emoji}</span>
              )}
              <Sprite name={frameName(stage, game.gender, step < 0 ? 'stand' : pose)} scale={1.6} />
            </div>
          )}
          {cur?.kind === 'catch' && <CatchGame key={step} st={cur} onDone={(score, tier) => next({ picks: [-1], score, tier })} />}
          {cur?.kind === 'timing' && <TimingGame key={step} st={cur} onDone={(tier) => next({ picks: [-1], tier })} />}
          {cur?.kind === 'pick' && <PickScene key={step} day={day} st={cur} stage={stage} gender={game.gender} />}
          {cur?.kind === 'build' && <BuildPreview key={step} day={day} st={cur} picks={buildPicks} stage={stage} gender={game.gender} />}
        </div>
        {/* 아래 글·버튼 */}
        <div className="flex min-h-[230px] flex-col justify-center bg-[#fffaf0] p-3">
          {step < 0 && (
            <>
              <p className="mb-1 text-center text-lg font-bold">
                {day.emoji} {day.title}
              </p>
              <div className="mb-3 space-y-1 text-center text-xs leading-relaxed">
                {day.intro.map((l, i) => (
                  <p key={i}>{fillText(l, name, [], 0)}</p>
                ))}
              </div>
              <FirstTip id="special" text="가끔 이렇게 특별한 하루가 찾아와요. 직접 눌러서 하는 짧은 놀이예요. 잘할수록 결과가 좋아지고, 좋은 순간은 사진첩에 남아요." />
              <PixelButton className="w-full" onClick={() => {
                  sfx('chime');
                  onStart();
                  setStep(0);
                }}>
                시작!
              </PixelButton>
            </>
          )}
          {cur && (cur.kind === 'catch' || cur.kind === 'timing') && <p className="text-center text-sm font-bold">{fillText(cur.prompt, name, [], 0)}</p>}
          {cur?.kind === 'pick' && <PickButtons key={step} st={cur} name={name} onDone={(i) => next({ picks: [i] })} />}
          {cur?.kind === 'build' && (
            <BuildButtons
              key={step}
              st={cur}
              onChange={setBuildPicks}
              onDone={(p) => {
                setBuildPicks([]);
                next({ picks: p });
              }}
            />
          )}
          {step >= day.steps.length && res && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-base font-bold">{res.title}</p>
              <p className="text-center text-xs leading-relaxed">{res.text}</p>
              <EffectChips fx={res.delta} />
              {res.photo && <p className="text-[11px] font-bold text-wood">📷 사진첩에 저장됐어요</p>}
              <PixelButton className="w-full" onClick={onClose}>
                좋아!
              </PixelButton>
            </div>
          )}
          {step >= day.steps.length && !res && (
            <PixelButton className="w-full" onClick={onClose}>
              닫기
            </PixelButton>
          )}
        </div>
      </div>
    </div>
  );

}

/* ───────── 잡기 ───────── */
type Item = { k: number; e: string; bad: boolean; x: number; y: number; vx: number; vy: number; ph: number };

export function CatchGame({ st, onDone }: { st: Extract<SpStep, { kind: 'catch' }>; onDone: (score: number, tier: 0 | 1 | 2) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(st.seconds);
  const [pops, setPops] = useState<{ k: number; x: number; y: number; t: string }[]>([]);
  const [over, setOver] = useState(false);
  const scoreRef = useRef(0);
  const seq = useRef(1);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const t0 = last;
    let spawnAt = 0;
    const every = (st.seconds * 1000) / (st.goal * 1.7);
    const loop = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      const el = (now - t0) / 1000;
      setLeft(Math.max(0, Math.ceil(st.seconds - el)));
      if (el >= st.seconds) {
        setOver(true);
        setItems([]);
        const sc = scoreRef.current;
        const tier: 0 | 1 | 2 = sc >= st.goal ? 2 : sc >= Math.ceil(st.goal * 0.55) ? 1 : 0;
        sfx(tier === 2 ? 'win' : 'stat');
        setTimeout(() => onDone(sc, tier), 1000);
        return;
      }
      setItems((list) => {
        const out = list
          .map((it) => {
            const ph = it.ph + dt;
            const wob = st.motion === 'float' ? Math.sin(ph * 2.4) * 18 : 0;
            return { ...it, ph, x: it.x + (it.vx + wob) * dt, y: it.y + it.vy * dt };
          })
          .filter((it) => it.y > -40 && it.y < 260 && it.x > -40 && it.x < 400);
        if (now - t0 > spawnAt) {
          spawnAt += every * (0.7 + Math.random() * 0.6);
          const bad = !!st.bad?.length && Math.random() < 0.22;
          const e = bad ? st.bad![0] : st.items[Math.floor(Math.random() * st.items.length)];
          const base = { k: seq.current++, e, bad, ph: Math.random() * 6 };
          if (st.motion === 'fall') out.push({ ...base, x: 20 + Math.random() * 280, y: -30, vx: 0, vy: 70 + Math.random() * 50 });
          else if (st.motion === 'float') out.push({ ...base, x: 20 + Math.random() * 280, y: 250, vx: 0, vy: -(45 + Math.random() * 30) });
          else out.push({ ...base, x: 220 + Math.random() * 160, y: -30, vx: -(200 + Math.random() * 80), vy: 120 + Math.random() * 40 });
        }
        return out;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const tap = (it: Item) => {
    setItems((l) => l.filter((x) => x.k !== it.k));
    const d = it.bad ? -1 : 1;
    scoreRef.current = Math.max(0, scoreRef.current + d);
    setScore(scoreRef.current);
    sfx(it.bad ? 'fail' : 'click');
    const p = { k: it.k, x: it.x, y: it.y, t: it.bad ? '-1' : '+1' };
    setPops((l) => [...l.slice(-5), p]);
  };
  return (
    <div className="absolute inset-0 touch-none">
      <div className="absolute top-2 right-2 flex gap-1 text-xs font-bold">
        <span className="rounded border-2 border-ink bg-white px-1.5">⏱ {left}</span>
        <span className="rounded border-2 border-ink bg-gold px-1.5">
          {score} / {st.goal}
        </span>
      </div>
      {items.map((it) => (
        <button
          key={it.k}
          className="absolute flex h-12 w-12 items-center justify-center text-3xl select-none"
          style={{ left: it.x - 24, top: it.y - 24, filter: st.motion === 'streak' ? 'drop-shadow(8px -5px 6px rgba(255,255,200,.7))' : undefined }}
          onPointerDown={() => tap(it)}
        >
          {it.e}
        </button>
      ))}
      {pops.map((p) => (
        <span key={p.k} className="sp-pop pointer-events-none absolute text-sm font-bold text-white drop-shadow-[0_1px_0_#000]" style={{ left: p.x, top: p.y - 20 }}>
          {p.t}
        </span>
      ))}
      {over && (
        <div className="pop-in absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg border-3 border-ink bg-white px-4 py-2 text-xl font-bold">{score}개!</span>
        </div>
      )}
    </div>
  );
}

/* ───────── 타이밍 ───────── */
export function TimingGame({ st, onDone }: { st: Extract<SpStep, { kind: 'timing' }>; onDone: (tier: 0 | 1 | 2) => void }) {
  const [round, setRound] = useState(0);
  const [pos, setPos] = useState(0);
  const [center, setCenter] = useState(() => 25 + Math.random() * 50);
  const [fb, setFb] = useState<{ t: string; ok: boolean } | null>(null);
  const [marks, setMarks] = useState<number[]>([]);
  const posRef = useRef(0);
  const lock = useRef(false);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + Math.random() * 600;
    const loop = (now: number) => {
      if (!lock.current) {
        const v = (Math.sin(((now - t0) / 1000) * st.speed * 2.6) + 1) / 2;
        posRef.current = v * 100;
        setPos(posRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [st.speed, round]);
  const press = () => {
    if (lock.current) return;
    lock.current = true;
    const d = Math.abs(posRef.current - center);
    const pt = d <= st.zone * 0.25 ? 2 : d <= st.zone / 2 ? 1 : 0;
    sfx(pt === 2 ? 'great' : pt ? 'click' : 'fail');
    setFb({ t: pt === 2 ? `완벽! ${st.hitText}` : pt ? st.hitText : st.missText, ok: pt > 0 });
    const m = [...marks, pt];
    setMarks(m);
    setTimeout(() => {
      setFb(null);
      if (m.length >= st.rounds) {
        const avg = m.reduce((a, b) => a + b, 0) / st.rounds;
        onDone(avg >= 1.5 ? 2 : avg >= 0.75 ? 1 : 0);
        return;
      }
      setCenter(25 + Math.random() * 50);
      setRound((r) => r + 1);
      lock.current = false;
    }, 900);
  };
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6" onPointerDown={press}>
      <div className="flex gap-1">
        {Array.from({ length: st.rounds }).map((_, i) => (
          <span key={i} className={`h-3 w-3 rounded-full border-2 border-ink ${i < marks.length ? (marks[i] === 2 ? 'bg-gold' : marks[i] ? 'bg-[#5bd6a8]' : 'bg-[#e5484d]') : 'bg-white/70'}`} />
        ))}
      </div>
      <span className={`text-5xl ${fb ? (fb.ok ? 'sp-bob' : 'sp-shake') : ''}`}>{st.icon}</span>
      <div className="relative h-7 w-full rounded-md border-3 border-ink bg-white/85">
        <div className="absolute inset-y-0 bg-[#5bd6a8]/70" style={{ left: `${center - st.zone / 2}%`, width: `${st.zone}%` }} />
        <div className="absolute inset-y-0 bg-gold" style={{ left: `${center - st.zone * 0.125}%`, width: `${st.zone * 0.25}%` }} />
        <div className="absolute -top-1.5 -bottom-1.5 w-1.5 -translate-x-1/2 rounded bg-ink" style={{ left: `${pos}%` }} />
      </div>
      <span className={`h-6 text-base font-bold drop-shadow-[0_1px_0_rgba(0,0,0,.5)] ${fb?.ok ? 'text-[#fff3a0]' : 'text-white'}`}>{fb ? fb.t : '화면을 톡!'}</span>
    </div>
  );
}

/* ───────── 고르기 ───────── */
function PickScene({ day, st, stage, gender }: { day: SpecialDay; st: Extract<SpStep, { kind: 'pick' }>; stage: ReturnType<typeof growthStage>; gender: 'SON' | 'DAUGHTER' }) {
  return (
    <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-3">
      {day.id === 'SP_FRIEND_VISIT' && npcArt('FRIEND', stage, gender) ? (
        <img src={npcArt('FRIEND', stage, gender)} alt="" className="order-last" style={{ height: frameH(stage, gender) * 1.6 }} draggable={false} />
      ) : (
        <span className="sp-bob text-4xl">{st.hidden ? '🧧' : day.emoji}</span>
      )}
      <Sprite name={frameName(stage, gender, 'stand')} scale={1.6} />
    </div>
  );
}

export function PickButtons({ st, name, onDone }: { st: Extract<SpStep, { kind: 'pick' }>; name: string; onDone: (i: number) => void }) {
  // 뒤집힌 카드는 순서를 섞어 둔다 (어떤 봉투가 큰지 모르게)
  const order = useMemo(() => {
    const o = st.options.map((_, i) => i);
    if (st.hidden) o.sort(() => Math.random() - 0.5);
    return o;
  }, [st]);
  const [open, setOpen] = useState<number | null>(null);
  const choose = (slot: number) => {
    if (open !== null) return;
    const i = order[slot];
    if (!st.hidden) {
      sfx('click');
      onDone(i);
      return;
    }
    setOpen(slot);
    sfx('chime');
    setTimeout(() => onDone(i), 1300);
  };
  return (
    <>
      <p className="mb-2 text-center text-sm font-bold">{fillText(st.prompt, name, [], 0)}</p>
      {st.hidden ? (
        <div className="grid grid-cols-3 gap-2">
          {order.map((oi, slot) => (
            <button key={slot} className={`pixel-btn flex h-20 flex-col items-center justify-center ${open === slot ? 'bg-gold' : open !== null ? 'bg-white opacity-50' : st.back ? 'bg-[#8fd3ff]' : 'bg-[#e85a5a]'}`} onClick={() => choose(slot)}>
              {open === slot ? (
                <span className="pop-in flex flex-col items-center">
                  <span className="text-3xl">{st.options[oi].emoji}</span>
                  <span className="text-xs font-bold">{st.options[oi].label}</span>
                </span>
              ) : (
                <span className="text-3xl">{st.back ?? '🧧'}</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-1.5">
          {order.map((oi, slot) => (
            <button key={slot} className="pixel-btn bg-white px-2 py-2 text-left text-xs" onClick={() => choose(slot)}>
              {st.options[oi].emoji} {st.options[oi].label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ───────── 꾸미기 ───────── */
function BuildPreview({ day, st, picks, stage, gender }: { day: SpecialDay; st: Extract<SpStep, { kind: 'build' }>; picks: number[]; stage: ReturnType<typeof growthStage>; gender: 'SON' | 'DAUGHTER' }) {
  const chosen = st.slots.map((sl, i) => (picks[i] !== undefined ? sl.options[picks[i]].emoji : null));
  const snow = day.id === 'SP_FIRST_SNOW';
  return (
    <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-4">
      {snow ? (
        <div className="relative flex flex-col items-center">
          <span className="h-9 text-4xl leading-none">{chosen[0] ?? ''}</span>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-3 border-ink bg-white">
            <span className="text-xs">• •</span>
            <span className="absolute top-6 text-xl">{chosen[1] ?? ''}</span>
          </div>
          <span className="-my-1 z-10 h-7 text-2xl leading-none">{chosen[2] ?? ''}</span>
          <div className="h-20 w-20 rounded-full border-3 border-ink bg-white" />
        </div>
      ) : (
        <div className="relative">
          <Sprite name={frameName(stage, gender, 'stand')} scale={1.8} />
          {chosen.map(
            (c, i) =>
              c && (
                <span key={i} className="pop-in absolute text-3xl drop-shadow-[0_2px_0_rgba(0,0,0,.35)]" style={i === 0 ? { left: -30, top: 10 } : { right: -30, bottom: 6 }}>
                  {c}
                </span>
              ),
          )}
        </div>
      )}
    </div>
  );
}

function BuildButtons({ st, onChange, onDone }: { st: Extract<SpStep, { kind: 'build' }>; onChange: (p: number[]) => void; onDone: (p: number[]) => void }) {
  const [p, setP] = useState<number[]>([]);
  const all = st.slots.every((_, i) => p[i] !== undefined);
  return (
    <>
      <p className="mb-2 text-center text-sm font-bold">{st.prompt}</p>
      <div className="mb-2 grid gap-1.5">
        {st.slots.map((sl, si) => (
          <div key={si} className="flex items-center gap-1.5">
            <span className="w-12 shrink-0 text-[11px] font-bold text-wood">{sl.label}</span>
            {sl.options.map((o, oi) => (
              <button
                key={oi}
                className={`pixel-btn flex flex-1 flex-col items-center py-1 text-[10px] ${p[si] === oi ? 'bg-gold' : 'bg-white'}`}
                onClick={() => {
                  const n = [...p];
                  n[si] = oi;
                  setP(n);
                  onChange(n);
                  sfx('click');
                }}
              >
                <span className="text-xl">{o.emoji}</span>
                {o.label}
              </button>
            ))}
          </div>
        ))}
      </div>
      <PixelButton className="w-full" disabled={!all} onClick={() => all && onDone(p)}>
        완성!
      </PixelButton>
    </>
  );
}
