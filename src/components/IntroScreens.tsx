import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { ArtBackdrop, GameLogo } from './ArtBackdrop';
import { eventScene } from '../render/eventScenes';
import { endingArt } from '../render/endingArt';
import type { Gender } from '../types/game';

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

/** 게임을 켜면 가장 먼저 나오는 화면: 일러스트 배경 + 로고 + "화면을 터치하세요" (첫 터치로 소리도 켜짐) */
export function SplashScreen({ onStart }: { onStart: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="relative flex h-full flex-col items-center justify-center overflow-hidden text-center"
      onClick={() => {
        if (!ready) return;
        sfx('levelup');
        onStart();
      }}
    >
      <ArtBackdrop dim={0.55} band={[8, 34]} />
      <Stars n={14} />
      <div className="relative mt-24">
        <GameLogo size={1.05} />
        <p className="fade-up mt-4 text-sm text-white/85 drop-shadow-[0_2px_4px_#000]" style={{ animationDelay: '.8s' }}>
          작은 방에서 시작되는 12년의 성장 이야기
        </p>
      </div>
      <p className={`absolute bottom-24 text-sm font-bold tracking-[0.25em] text-white drop-shadow-[0_2px_4px_#000] ${ready ? 'animate-pulse' : 'opacity-0'}`}>TOUCH TO START</p>
      <p className="absolute bottom-3 text-[10px] text-white/45">© 2026 Dot Dream Maker</p>
    </div>
  );
}

/* ───────── 오프닝: 처음 한 번만 나오는 짧은 영상 같은 이야기 ───────── */
type Panel =
  | { kind: 'night'; text: string }
  | { kind: 'art'; id: string; g: Gender; text: string }
  | { kind: 'montage'; arts: [string, Gender][]; text: string }
  | { kind: 'logo'; text: string };
const PANELS: Panel[] = [
  { kind: 'night', text: '어느 봄날 밤,\n우리 집에 작은 기적이 찾아왔어요.' },
  { kind: 'art', id: 'CS_SCHOOL', g: 'DAUGHTER', text: '여덟 살.\n아직은 작고, 겁도 많고, 궁금한 것투성이.' },
  { kind: 'art', id: 'F_SLEEPOVER', g: 'SON', text: '친구와 뛰어놀고,' },
  { kind: 'art', id: 'T_DOOR_SLAM', g: 'DAUGHTER', text: '가끔은 문을 쾅 닫고,' },
  { kind: 'art', id: 'M_SORRY', g: 'SON', text: '그래도 다시 마주 앉아 화해하면서.' },
  { kind: 'art', id: 'Y_GRADUATION', g: 'DAUGHTER', text: '매달의 스케줄과 부모의 작은 선택 하나하나가\n아이를 만들어 갑니다.' },
  { kind: 'montage', arts: [['END_01', 'DAUGHTER'], ['END_14', 'SON'], ['END_18', 'DAUGHTER']], text: '스무 살이 되는 날,\n이 아이는 어떤 어른이 되어 있을까요?' },
  { kind: 'logo', text: '당신의 12년이 지금 시작됩니다.' },
];

export function OpeningScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(0);
  const p = PANELS[i];
  useEffect(() => setTyped(0), [i]);
  useEffect(() => {
    // 그림 미리 불러오기
    for (const q of PANELS) {
      const urls = q.kind === 'art' ? [eventScene(q.id, q.g)] : q.kind === 'montage' ? q.arts.map(([e, g]) => endingArt(e, g, 'BRIGHT')) : [];
      urls.forEach((u) => {
        if (!u) return;
        const im = new Image();
        im.src = u;
      });
    }
  }, []);
  useEffect(() => {
    if (typed >= p.text.length) {
      // 다 쓰면 잠시 뒤 자동으로 다음 장면 (마지막 로고는 터치 대기)
      if (p.kind === 'logo') return;
      const t = setTimeout(() => setI((n) => Math.min(PANELS.length - 1, n + 1)), 2300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTyped((n) => n + 1), 55);
    return () => clearTimeout(t);
  }, [typed, p]);

  const next = () => {
    if (typed < p.text.length) return setTyped(p.text.length);
    sfx('page');
    if (i >= PANELS.length - 1) onDone();
    else setI(i + 1);
  };

  return (
    <div className="relative h-full overflow-hidden bg-black" onClick={next}>
      {/* 장면 */}
      <div key={i} className="cine-in absolute inset-0">
        {p.kind === 'night' && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#070a22] via-[#141a46] to-[#2a2560]">
            <Stars n={40} />
            <span className="shooting absolute top-[18%] right-[10%] h-0.5 w-24 rounded-full bg-gradient-to-l from-white to-transparent" />
            <span className="absolute top-[14%] left-[18%] text-5xl drop-shadow-[0_0_24px_#fff8]">🌙</span>
            {/* 언덕 위 작은 집: 창문에 불이 켜짐 */}
            <svg className="absolute inset-x-0 bottom-0 w-full" viewBox="0 0 100 50" preserveAspectRatio="none" style={{ height: '42%' }}>
              <path d="M0 30 Q25 18 50 26 T100 22 L100 50 L0 50 Z" fill="#232a5a" />
              <path d="M0 38 Q30 28 60 36 T100 34 L100 50 L0 50 Z" fill="#161b3e" />
            </svg>
            <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2">
              <div className="relative h-16 w-20">
                <div className="absolute bottom-0 h-11 w-20 bg-[#3a4078] shadow-[0_0_0_2px_#22264a]" />
                <div className="absolute bottom-11 left-0 h-0 w-0 border-r-[40px] border-b-[22px] border-l-[40px] border-r-transparent border-b-[#4a4f8a] border-l-transparent" />
                <div className="window-glow absolute bottom-3 left-3 h-5 w-5 bg-[#ffd86b] shadow-[0_0_22px_8px_rgba(255,200,90,.55)]" />
                <div className="window-glow absolute bottom-3 right-3 h-5 w-5 bg-[#ffd86b] shadow-[0_0_22px_8px_rgba(255,200,90,.55)]" style={{ animationDelay: '2.1s' }} />
              </div>
            </div>
          </div>
        )}
        {p.kind === 'art' && eventScene(p.id, p.g) && (
          <>
            <img src={eventScene(p.id, p.g)} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover" style={{ filter: 'blur(18px) brightness(.45) saturate(1.2)' }} />
            {/* 그림 전체가 보이는 와이드 화면 (영화 장면처럼) */}
            <div className="absolute inset-x-0 top-[22%] aspect-[16/9] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,.6)]">
              <img src={eventScene(p.id, p.g)} alt="" className="kenburns h-full w-full object-cover" style={{ animationName: i % 2 ? 'kenburns-b' : 'kenburns-a', animationDuration: '7s' }} />
            </div>
          </>
        )}
        {p.kind === 'montage' && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#141838] via-[#2b2f5c] to-[#5a3f78]">
            <Stars n={22} />
            <div className="absolute inset-x-0 top-[14%] flex justify-center">
              {p.arts.map(([e, g], k) => {
                const u = endingArt(e, g, 'BRIGHT');
                return (
                  <div
                    key={e}
                    className="fade-up -mx-3 w-[38%] bg-white p-1 pb-4 shadow-[0_8px_18px_rgba(0,0,0,.5)]"
                    style={{ transform: `rotate(${(k - 1) * 8}deg) translateY(${k === 1 ? -10 : 8}px)`, animationDelay: `${0.25 + k * 0.45}s`, zIndex: k === 1 ? 2 : 1 }}
                  >
                    {u ? <img src={u} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] w-full bg-[#ddd]" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {p.kind === 'logo' && (
          <>
            <ArtBackdrop dim={0.6} band={[12, 34]} />
            <div className="absolute inset-0 flex items-center justify-center pt-24">
              <GameLogo size={1.1} />
            </div>
          </>
        )}
        {/* 아래쪽 어둡게 (자막 잘 보이게) */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
      </div>
      {/* 영화 화면 위아래 띠 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[7%] bg-black" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[7%] bg-black" />
      {/* 자막 */}
      <p className="absolute inset-x-6 bottom-[13%] min-h-16 text-center text-[17px] leading-relaxed font-bold whitespace-pre-line text-white drop-shadow-[0_2px_6px_#000]">
        {p.text.slice(0, typed)}
      </p>
      {p.kind === 'logo' && typed >= p.text.length && (
        <p className="fade-up absolute inset-x-0 bottom-[8.5%] text-center text-xs font-bold tracking-[0.25em] text-[#ffe9a8] animate-pulse">TOUCH TO START</p>
      )}
      <button
        className="absolute top-[8.5%] right-3 z-10 rounded-full border border-white/40 bg-black/40 px-3 py-1 text-[11px] font-bold text-white/90"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        건너뛰기 ▶▶
      </button>
      {/* 진행 막대 */}
      <div className="absolute inset-x-6 top-[3%] flex gap-1">
        {PANELS.map((_, k) => (
          <span key={k} className={`h-0.5 flex-1 rounded-full ${k <= i ? 'bg-white/90' : 'bg-white/25'}`} />
        ))}
      </div>
    </div>
  );
}
