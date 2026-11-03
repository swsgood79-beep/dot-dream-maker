import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';

/**
 * 대회 미니게임 3종. 모두 onDone(perf: 0~1)로 끝난다.
 * ease: 아이 스탯 / 우승 기준 (0.5~1.5) — 잘 키운 아이일수록 판정이 너그럽다.
 */
type Props = { ease: number; onDone: (perf: number) => void };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* ───────── 체육대회: 타이밍 탭 3번 ───────── */
const ROUNDS = ['출발 신호!', '중간 스퍼트!', '결승선!'];
export function SprintGame({ ease, onDone }: Props) {
  const [round, setRound] = useState(0);
  const [pos, setPos] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const zoneW = 10 + Math.min(1.5, ease) * 10; // 우승 기준이면 20%
  const [center] = useState(() => ROUNDS.map(() => 25 + Math.random() * 50));
  const t0 = useRef(performance.now());
  const raf = useRef(0);

  useEffect(() => {
    t0.current = performance.now();
    const speed = 0.11 + round * 0.04; // %/ms
    const tick = (now: number) => {
      const d = ((now - t0.current) * speed) % 200;
      setPos(d < 100 ? d : 200 - d);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [round]);

  const tap = () => {
    if (scores.length > round) return;
    const off = Math.abs(pos - center[round]);
    const acc = off <= zoneW / 2 ? 1 - (off / (zoneW / 2)) * 0.3 : clamp01(1 - off / (zoneW * 1.6));
    sfx(acc >= 0.7 ? 'great' : acc > 0.3 ? 'stat' : 'fail');
    setFlash(acc >= 0.9 ? 'PERFECT!' : acc >= 0.7 ? 'GREAT!' : acc > 0.3 ? 'GOOD' : 'MISS...');
    const next = [...scores, acc];
    setScores(next);
    cancelAnimationFrame(raf.current);
    setTimeout(() => {
      setFlash(null);
      if (next.length >= ROUNDS.length) onDone(next.reduce((a, b) => a + b, 0) / next.length);
      else setRound(round + 1);
    }, 650);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-3" onPointerDown={tap}>
      <p className="text-sm font-bold">
        🏃 {ROUNDS[round]} <span className="text-[10px] opacity-60">({round + 1}/3)</span>
      </p>
      <div className="relative h-10 w-full border-3 border-ink bg-[#2b2f5c]">
        <div className="absolute top-0 bottom-0 bg-[#5bd66b]" style={{ left: `${center[round] - zoneW / 2}%`, width: `${zoneW}%` }} />
        <div className="absolute top-0 bottom-0 bg-[#ffe680]" style={{ left: `${center[round] - zoneW / 6}%`, width: `${zoneW / 3}%` }} />
        <div className="absolute -top-2 -bottom-2 w-1.5 -translate-x-1/2 bg-white shadow-[0_0_0_2px_#1b1f3b]" style={{ left: `${pos}%` }} />
      </div>
      <p className="h-6 text-lg font-bold text-accent">{flash}</p>
      <p className="text-[11px] opacity-70">초록 칸에 막대가 왔을 때 화면을 누르세요!</p>
    </div>
  );
}

/* ───────── 예술제: 3줄 리듬 ───────── */
const LANES = ['🎵', '🎶', '🎼'];
const FALL = 1500;
export function RhythmGame({ ease, onDone }: Props) {
  const [notes] = useState(() => {
    let t = 1200;
    return Array.from({ length: 12 }, () => {
      t += 520 + Math.random() * 260;
      return { t, lane: Math.floor(Math.random() * 3) };
    });
  });
  const [now, setNow] = useState(0);
  const [hit, setHit] = useState<Record<number, number>>({});
  const [flash, setFlash] = useState<{ text: string; lane: number } | null>(null);
  const start = useRef(performance.now());
  const done = useRef(false);
  const win = 110 * Math.min(1.5, Math.max(0.8, ease)); // 판정 범위(ms)
  const end = notes[notes.length - 1].t + 500;

  useEffect(() => {
    let raf = 0;
    const tick = (n: number) => {
      const t = n - start.current;
      setNow(t);
      if (t > end && !done.current) {
        done.current = true;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end]);

  useEffect(() => {
    if (now > end) {
      const total = notes.reduce((a, _, i) => a + (hit[i] ?? 0), 0);
      const t = setTimeout(() => onDone(total / notes.length), 300);
      return () => clearTimeout(t);
    }
  }, [now > end]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = (lane: number) => {
    let best = -1;
    let bd = Infinity;
    notes.forEach((n, i) => {
      if (n.lane !== lane || hit[i] !== undefined) return;
      const d = Math.abs(n.t - now);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best < 0 || bd > win * 2.5) return;
    const sc = bd <= win ? 1 : bd <= win * 2.5 ? 0.6 : 0;
    setHit((h) => ({ ...h, [best]: sc }));
    setFlash({ text: sc === 1 ? 'PERFECT' : 'GOOD', lane });
    sfx(sc === 1 ? 'great' : 'stat');
  };

  const hits = Object.values(hit).length;
  return (
    <div className="flex flex-col items-center gap-2 p-2">
      <p className="text-sm font-bold">
        🎭 박자에 맞춰 누르세요! <span className="text-[10px] opacity-60">({hits}/{notes.length})</span>
      </p>
      <div className="relative grid h-56 w-full grid-cols-3 overflow-hidden border-3 border-ink bg-[#2a1f45]">
        {LANES.map((_, l) => (
          <div key={l} className="relative border-r border-white/10">
            {notes.map((n, i) => {
              if (n.lane !== l || hit[i] !== undefined) return null;
              const y = 1 - (n.t - now) / FALL; // 0 = 위, 1 = 판정선
              if (y < -0.1 || y > 1.25) return null;
              return (
                <span
                  key={i}
                  className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
                  style={{ top: `${y * 85}%`, opacity: y > 1.08 ? 0.3 : 1 }}
                >
                  {LANES[l]}
                </span>
              );
            })}
            {flash?.lane === l && (
              <span key={hits} className="popup-float absolute top-[60%] left-1/2 -translate-x-1/2 text-xs font-bold text-gold">
                {flash.text}
              </span>
            )}
          </div>
        ))}
        <div className="absolute right-0 left-0 h-1 bg-gold" style={{ top: '85%' }} />
      </div>
      <div className="grid w-full grid-cols-3 gap-1.5">
        {LANES.map((e, l) => (
          <button key={l} className="pixel-btn bg-[#c48cff] py-3 text-xl" onPointerDown={() => press(l)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── 기말시험: 암산 퀴즈 5문제 ───────── */
function makeQuestion(age: number): { q: string; a: number; options: number[] } {
  const r = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
  let q = '';
  let a = 0;
  if (age <= 10) {
    const x = r(3, 30);
    const y = r(2, 20);
    if (Math.random() < 0.5) [q, a] = [`${x} + ${y}`, x + y];
    else [q, a] = [`${x + y} - ${y}`, x];
  } else if (age <= 13) {
    const x = r(3, 12);
    const y = r(3, 12);
    if (Math.random() < 0.5) [q, a] = [`${x} × ${y}`, x * y];
    else [q, a] = [`${x * y} ÷ ${y}`, x];
  } else if (age <= 16) {
    const x = r(2, 15);
    const b = r(3, 30);
    const c = r(2, 9);
    if (Math.random() < 0.5) [q, a] = [`□ + ${b} = ${x + b}`, x];
    else [q, a] = [`${c} × □ = ${c * x}`, x];
  } else {
    const x = r(2, 12);
    const y = r(2, 9);
    if (Math.random() < 0.5) [q, a] = [`${x}² - ${y}`, x * x - y];
    else [q, a] = [`2x + ${y} = ${2 * x + y}, x = ?`, x];
  }
  const set = new Set([a]);
  while (set.size < 3) set.add(a + r(-6, 6) || a + 7);
  return { q, a, options: [...set].sort(() => Math.random() - 0.5) };
}

export function QuizGame({ ease, onDone, age }: Props & { age: number }) {
  const [qs] = useState(() => Array.from({ length: 5 }, () => makeQuestion(age)));
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(1);
  const [scores, setScores] = useState<number[]>([]);
  const [mark, setMark] = useState<null | boolean>(null);
  const limit = 5500 * Math.min(1.4, Math.max(0.8, ease));
  const t0 = useRef(performance.now());

  const answer = (v: number | null) => {
    if (mark !== null) return;
    const ok = v === qs[i].a;
    const sc = ok ? 0.6 + 0.4 * left : 0;
    sfx(ok ? 'great' : 'fail');
    setMark(ok);
    const next = [...scores, sc];
    setScores(next);
    setTimeout(() => {
      setMark(null);
      if (next.length >= qs.length) onDone(next.reduce((a, b) => a + b, 0) / qs.length);
      else {
        setI(i + 1);
        t0.current = performance.now();
        setLeft(1);
      }
    }, 600);
  };

  useEffect(() => {
    if (mark !== null) return;
    let raf = 0;
    const tick = (n: number) => {
      const l = clamp01(1 - (n - t0.current) / limit);
      setLeft(l);
      if (l <= 0) answer(null);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, mark]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = qs[i];
  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <p className="text-sm font-bold">
        📝 {i + 1}번 문제 <span className="text-[10px] opacity-60">({i + 1}/5)</span>
      </p>
      <div className="h-2 w-full border-2 border-ink bg-white">
        <div className="h-full" style={{ width: `${left * 100}%`, background: left > 0.3 ? '#5bd66b' : '#e5484d' }} />
      </div>
      <p className="rounded border-3 border-ink bg-[#2f5d3a] px-4 py-3 text-2xl font-bold text-white">{q.q}</p>
      <div className="grid w-full grid-cols-3 gap-2">
        {q.options.map((o) => (
          <button
            key={o}
            className={`pixel-btn py-3 text-lg font-bold ${mark !== null && o === q.a ? 'bg-mint' : 'bg-white'}`}
            onClick={() => answer(o)}
          >
            {o}
          </button>
        ))}
      </div>
      <p className="h-6 text-lg font-bold">{mark === null ? '' : mark ? '⭕ 정답!' : '❌ 땡!'}</p>
    </div>
  );
}
