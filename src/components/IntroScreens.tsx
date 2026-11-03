import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { Sprite } from './Sprite';

/** 반짝이는 밤하늘 배경 */
function Stars({ n = 24 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="twinkle absolute text-white"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 70}%`, fontSize: 6 + (i % 3) * 3, animationDelay: `${(i % 7) * 0.3}s` }}
        >
          ✦
        </span>
      ))}
    </>
  );
}

const LOGO = '도트 드림 메이커';

/** 게임을 켜면 가장 먼저 나오는 화면: 로고 + "화면을 터치하세요" (첫 터치로 소리도 켜짐) */
export function SplashScreen({ onStart }: { onStart: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#141838] via-[#2b2f5c] to-[#6b4a8a] text-center"
      onClick={() => {
        if (!ready) return;
        sfx('levelup');
        onStart();
      }}
    >
      <Stars />
      {/* 언덕 위의 집 */}
      <div className="absolute inset-x-0 bottom-0 h-40 rounded-t-[50%] bg-[#2f6b4a]" />
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-6xl drop-shadow-[0_0_14px_#ffd84d]">🏠</div>
      <p className="relative mb-2 text-[11px] tracking-[0.3em] text-white/60">DOT DREAM MAKER</p>
      <h1 className="relative flex text-[40px] leading-none font-bold text-gold drop-shadow-[3px_3px_0_#000]">
        {[...LOGO].map((ch, i) => (
          <span key={i} className="logo-bounce inline-block" style={{ animationDelay: `${i * 0.08}s`, width: ch === ' ' ? 12 : undefined }}>
            {ch}
          </span>
        ))}
      </h1>
      <p className="relative mt-3 text-sm text-white/85">작은 방에서 시작되는 12년의 성장 이야기</p>
      <div className="relative mt-8 flex items-end gap-2">
        <span className="bob inline-block" style={{ animationDelay: '0s' }}>
          <Sprite name="CHILD_SON_cheer" scale={1.1} />
        </span>
        <span className="bob inline-block" style={{ animationDelay: '.3s' }}>
          <Sprite name="CAT_sit" scale={1.1} />
        </span>
        <span className="bob inline-block" style={{ animationDelay: '.6s' }}>
          <Sprite name="CHILD_DAUGHTER_cheer" scale={1.1} />
        </span>
      </div>
      <p className={`relative mt-12 text-base font-bold text-white ${ready ? 'animate-pulse' : 'opacity-0'}`}>▶ 화면을 터치하세요</p>
      <p className="absolute bottom-3 text-[10px] text-white/50">© 2026 Dot Dream Maker</p>
    </div>
  );
}

/* ───────── 오프닝: 처음 한 번만 나오는 짧은 이야기 ───────── */
const PANELS: { sky: string; text: string; sprites: string[]; emoji?: string }[] = [
  { sky: 'from-[#141838] to-[#3a3a7a]', emoji: '🌙', text: '어느 봄날 밤,\n우리 집에 작은 기적이 찾아왔어요.', sprites: [] },
  { sky: 'from-[#ffd6e7] to-[#fff6d6]', text: '여덟 살.\n아직은 작고, 겁도 많고,\n궁금한 것투성이인 아이.', sprites: ['CHILD_DAUGHTER_stand', 'CHILD_SON_stand'] },
  { sky: 'from-[#c9e4ff] to-[#f5e8ff]', text: '앞으로 12년.\n공부하고, 뛰어놀고, 다투고, 화해하면서\n아이는 쑥쑥 자라날 거예요.', sprites: ['CHILD_SON_cheer', 'TEEN_DAUGHTER_stand', 'YOUTH_SON_stand'] },
  { sky: 'from-[#ffe2c4] to-[#fff6d6]', emoji: '🏠', text: '매달의 스케줄, 방 안의 가구,\n그리고 부모의 작은 선택 하나하나가\n아이를 만들어 갑니다.', sprites: ['CAT_sit'] },
  { sky: 'from-[#2b2f5c] to-[#6b4a8a]', text: '스무 살이 되는 날,\n이 아이는 어떤 어른이 되어 있을까요?', sprites: ['JOB_END_01_DAUGHTER', 'JOB_END_14_SON', 'JOB_END_18_DAUGHTER'] },
];

export function OpeningScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(0);
  const p = PANELS[i];
  useEffect(() => setTyped(0), [i]);
  useEffect(() => {
    if (typed >= p.text.length) return;
    const t = setTimeout(() => setTyped((n) => n + 1), 45);
    return () => clearTimeout(t);
  }, [typed, p.text]);
  const dark = i === 0 || i === PANELS.length - 1;

  const next = () => {
    if (typed < p.text.length) return setTyped(p.text.length);
    sfx('page');
    if (i >= PANELS.length - 1) onDone();
    else setI(i + 1);
  };

  return (
    <div className={`relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b ${p.sky} px-6 text-center`} onClick={next}>
      {dark && <Stars n={16} />}
      <button
        className="absolute top-3 right-3 z-10 rounded border-2 border-ink bg-white/80 px-2 py-0.5 text-[11px] font-bold"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        건너뛰기 ▶▶
      </button>
      <div key={i} className="pop-in flex min-h-40 items-end justify-center gap-2">
        {p.emoji && <span className="text-7xl drop-shadow-[0_0_16px_#fff6]">{p.emoji}</span>}
        {p.sprites.map((s) => (
          <Sprite key={s} name={s} scale={1.4} />
        ))}
      </div>
      <p className={`mt-8 min-h-24 text-base leading-relaxed font-bold whitespace-pre-line ${dark ? 'text-white' : 'text-ink'}`}>
        {p.text.slice(0, typed)}
      </p>
      <div className="absolute bottom-6 flex gap-1.5">
        {PANELS.map((_, k) => (
          <span key={k} className={`h-2 w-2 rounded-full border border-ink ${k === i ? 'bg-gold' : 'bg-white/60'}`} />
        ))}
      </div>
      <p className={`absolute bottom-12 text-[11px] ${dark ? 'text-white/60' : 'text-ink/60'}`}>{typed >= p.text.length ? '화면을 누르면 다음으로' : ''}</p>
    </div>
  );
}
