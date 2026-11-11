import type { Relation } from '../engine/psyche';

/** 성인식 엔딩 무대: 단계마다 배경·조명·효과가 바뀐다 (내용 뒤에 깔림) */
type Stage = 'intro' | 'album' | 'photos' | 'recap' | 'drum' | 'reveal' | 'phone' | 'letter' | 'people' | 'later';
const rnd = (i: number, k: number) => ((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1 + 1) % 1;

const TIER_FX: Record<string, { confetti: number; fireworks: number; colors: string[] }> = {
  SS: { confetti: 60, fireworks: 5, colors: ['#ffd84d', '#ff6fae', '#5bd6ff', '#b98bff', '#ffffff'] },
  S: { confetti: 46, fireworks: 3, colors: ['#ffd84d', '#ff9f43', '#ffffff', '#ff6fae'] },
  A: { confetti: 34, fireworks: 1, colors: ['#5bd6ff', '#5bd66b', '#ffd84d', '#ff6fae'] },
  B: { confetti: 22, fireworks: 0, colors: ['#9fd8ff', '#ffe3a3', '#c9f0c0'] },
  C: { confetti: 10, fireworks: 0, colors: ['#c8c8d8', '#e8dcc8'] },
};

/** 진로 발표 분위기: festive 축하 / gloomy 처진 결말(방구석 한량) / shady 어둠의 길(괴도·지하세계 보스) */
export type RevealMood = 'festive' | 'gloomy' | 'shady';
export function revealMood(id: string): RevealMood {
  if (id === 'END_50') return 'gloomy';
  if (id === 'END_47' || id === 'END_48') return 'shady';
  return 'festive';
}
export const REVEAL_RIBBON: Record<RevealMood, { text: (tier: string) => string; color: string }> = {
  festive: { text: (t) => (t === 'C' ? '🎓 진로 발표' : t === 'B' ? '🎉 축하해요!' : `🏆 ${t}급 엔딩 달성!`), color: '' },
  gloomy: { text: () => '😶 ...진로 발표', color: '#c9c9d4' },
  shady: { text: () => '🌙 어둠 속의 길', color: '#c9a8ff' },
};

export function EndingBackdrop({ step, tier, art: brightArt, darkArt, sky, rel, mood = 'festive' }: { step: Stage; tier: string; art?: string; darkArt?: string; sky: [string, string]; rel: Relation; mood?: RevealMood }) {
  // 처진 결말·어둠의 길은 그 직업의 어두운 그림(밤·빈 공간)을 배경으로
  const art = mood !== 'festive' && darkArt ? darkArt : brightArt;
  const stage = step === 'intro' || step === 'drum';
  const reveal = step === 'reveal';
  const party = reveal && mood === 'festive';
  const gloomy = reveal && mood === 'gloomy';
  const shady = reveal && mood === 'shady';
  const late = step === 'letter' || step === 'people' || step === 'later';
  const phone = step === 'phone';
  const cold = phone && rel === 'HOLLOW';
  const fx = TIER_FX[tier] ?? TIER_FX.B;

  const base = late
    ? 'linear-gradient(#2a1f4a 0%, #8a4a6a 45%, #f2a65a 80%, #ffd89a 100%)'
    : cold
      ? 'linear-gradient(#0e1018, #1d2230 60%, #2a2f3d)'
      : phone
        ? 'linear-gradient(#141a33, #2a2547 60%, #4a3256)'
        : 'linear-gradient(#0d1030 0%, #1f1b4a 45%, #46306b 100%)';

  return (
    <div className="ending-bg pointer-events-none absolute inset-0 overflow-hidden" style={{ background: base }}>
      {/* 진로 발표: 그 직업 그림을 크게 흐리게 깔고 빛줄기 */}
      {reveal && (
        <>
          {art ? (
            <img
              src={art}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover ${gloomy || shady ? 'scale-110' : 'scale-125'}`}
              style={{ filter: gloomy ? 'blur(4px) grayscale(.55) brightness(.5)' : shady ? 'blur(5px) brightness(.45) saturate(.85) hue-rotate(-15deg)' : 'blur(14px) brightness(.55) saturate(1.25)' }}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(${sky[0]}, ${sky[1]})`, filter: gloomy ? 'grayscale(.8) brightness(.45)' : 'brightness(.6)' }} />
          )}
          {party && <div className="rays-gold absolute top-[38%] left-1/2 h-[180vmax] w-[180vmax] -translate-x-1/2 -translate-y-1/2" />}
          {party && <div className="ending-flash absolute inset-0 bg-white" />}
          {/* 처진 결말: 어두운 방에 깜빡이는 TV 불빛 · 떠다니는 먼지 */}
          {gloomy && (
            <>
              <div className="absolute inset-0 bg-[#2a2f3d]/45" />
              <div className="tv-flicker absolute bottom-0 left-0 h-2/3 w-2/3" style={{ background: 'radial-gradient(ellipse at 15% 85%, rgba(120,170,255,.38), transparent 65%)' }} />
              {Array.from({ length: 26 }).map((_, i) => (
                <span key={`d${i}`} className="dust absolute rounded-full bg-[#d8d0c0]/60" style={{ left: `${rnd(i, 30) * 100}%`, top: `${rnd(i, 31) * 100}%`, width: 2 + rnd(i, 32) * 2, height: 2 + rnd(i, 32) * 2, animationDelay: `${rnd(i, 33) * 8}s`, animationDuration: `${8 + rnd(i, 34) * 6}s` }} />
              ))}
            </>
          )}
          {/* 어둠의 길: 밤하늘 서치라이트 · 낮게 깔린 연기 · 반짝이는 보석빛 */}
          {shady && (
            <>
              <div className="absolute inset-0 bg-[#160c2a]/50" />
              <div className="searchlight absolute bottom-0 left-[12%] h-[120%] w-24 origin-bottom" />
              <div className="searchlight absolute right-[12%] bottom-0 h-[120%] w-24 origin-bottom" style={{ animationDelay: '-2.2s', animationDirection: 'reverse' }} />
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={`m${i}`} className="smoke absolute rounded-full" style={{ left: `${-10 + rnd(i, 35) * 90}%`, bottom: `${-8 + rnd(i, 36) * 18}%`, width: 160 + rnd(i, 37) * 120, height: 90 + rnd(i, 37) * 60, background: 'radial-gradient(closest-side, rgba(150,120,190,.35), transparent)', animationDelay: `${rnd(i, 38) * 6}s` }} />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={`g${i}`} className="twinkle absolute text-[10px] text-[#d9b4ff]" style={{ left: `${rnd(i, 39) * 100}%`, top: `${rnd(i, 40) * 60}%`, animationDelay: `${rnd(i, 41) * 2}s` }}>
                  ✦
                </span>
              ))}
            </>
          )}
        </>
      )}

      {/* 별 */}
      {!late && !gloomy &&
        Array.from({ length: 46 }).map((_, i) => (
          <span
            key={`s${i}`}
            className="twinkle absolute rounded-full bg-white"
            style={{ left: `${rnd(i, 1) * 100}%`, top: `${rnd(i, 2) * (reveal ? 100 : 62)}%`, width: rnd(i, 3) > 0.8 ? 3 : 2, height: rnd(i, 3) > 0.8 ? 3 : 2, animationDelay: `${rnd(i, 4) * 2}s`, opacity: 0.8 }}
          />
        ))}

      {/* 번지는 불빛 (보케) */}
      {!cold && !gloomy &&
        Array.from({ length: 12 }).map((_, i) => {
          const c = late ? ['#ffd89a', '#ffb36b', '#fff1c2'][i % 3] : ['#ff9fd0', '#9fd8ff', '#ffd84d', '#b98bff'][i % 4];
          const s = 30 + rnd(i, 5) * 70;
          return (
            <span
              key={`b${i}`}
              className="bokeh absolute rounded-full"
              style={{ left: `${rnd(i, 6) * 100}%`, top: `${30 + rnd(i, 7) * 70}%`, width: s, height: s, background: `radial-gradient(circle, ${c}66, ${c}00 70%)`, animationDelay: `${rnd(i, 8) * 6}s`, animationDuration: `${7 + rnd(i, 9) * 6}s` }}
            />
          );
        })}

      {/* 성인식 무대: 전구 장식 + 커튼 + 스포트라이트 */}
      {(stage || reveal) && (
        <>
          <svg className="absolute top-6 left-0 h-16 w-full" viewBox="0 0 100 16" preserveAspectRatio="none">
            <path d="M0 2 Q25 14 50 4 Q75 14 100 2" stroke="#3b2a1a" strokeWidth="0.6" fill="none" />
          </svg>
          {Array.from({ length: 11 }).map((_, i) => {
            const x = 4 + i * 9.2;
            const y = 4 + Math.sin((x / 100) * Math.PI * 2) * -4 + 6;
            return (
              <span
                key={`l${i}`}
                className={`absolute h-2.5 w-2 rounded-b-full ${gloomy || shady ? 'opacity-30' : 'bulb'}`}
                style={{ left: `${x}%`, top: `${26 + y * 3.2}px`, background: ['#ffd84d', '#ff6fae', '#5bd6ff', '#5bd66b'][i % 4], color: ['#ffd84d', '#ff6fae', '#5bd6ff', '#5bd66b'][i % 4], animationDelay: `${(i % 4) * 0.35}s` }}
              />
            );
          })}
          <div className={`curtain curtain-l absolute top-0 bottom-0 left-0 w-[52%] ${reveal ? 'curtain-open-l' : step === 'drum' ? 'curtain-close' : ''}`} />
          <div className={`curtain curtain-r absolute top-0 right-0 bottom-0 w-[52%] ${reveal ? 'curtain-open-r' : step === 'drum' ? 'curtain-close' : ''}`} />
          <div className="absolute top-0 right-0 left-0 h-7 bg-[repeating-linear-gradient(90deg,#8e1f2e_0_18px,#6e1622_18px_22px)] shadow-[0_4px_8px_rgba(0,0,0,.4)]" />
          {!reveal && <div className={`spotlight absolute top-0 left-1/2 h-full w-[70%] -translate-x-1/2 ${step === 'drum' ? 'spot-sweep' : ''}`} />}
        </>
      )}

      {/* 꽃가루 + 불꽃놀이 */}
      {party &&
        Array.from({ length: fx.confetti }).map((_, i) => (
          <span
            key={`c${i}`}
            className="confetti-full absolute top-0"
            style={{ left: `${rnd(i, 10) * 100}%`, width: 4 + rnd(i, 11) * 4, height: 6 + rnd(i, 12) * 6, background: fx.colors[i % fx.colors.length], animationDelay: `${0.3 + rnd(i, 13) * 3}s`, animationDuration: `${2.6 + rnd(i, 14) * 2.4}s` }}
          />
        ))}
      {party &&
        Array.from({ length: fx.fireworks }).map((_, i) => (
          <div key={`f${i}`} className="firework absolute" style={{ left: `${15 + rnd(i, 15) * 70}%`, top: `${8 + rnd(i, 16) * 30}%`, animationDelay: `${0.6 + i * 0.7}s` }}>
            {Array.from({ length: 12 }).map((_, k) => (
              <span key={k} className="spark" style={{ ['--a' as string]: `${k * 30}deg`, background: fx.colors[(i + k) % fx.colors.length], animationDelay: `${0.6 + i * 0.7}s` }} />
            ))}
          </div>
        ))}

      {/* 절연: 차가운 빗줄기 */}
      {cold &&
        Array.from({ length: 40 }).map((_, i) => (
          <span key={`r${i}`} className="rain absolute top-0 w-px bg-[#9fb3d0]/50" style={{ left: `${rnd(i, 17) * 100}%`, height: 14 + rnd(i, 18) * 16, animationDelay: `${rnd(i, 19) * 1.2}s`, animationDuration: `${0.7 + rnd(i, 20) * 0.5}s` }} />
        ))}

      {/* 노을 속 꽃잎 */}
      {late &&
        Array.from({ length: 16 }).map((_, i) => (
          <span key={`p${i}`} className="petal absolute top-0 h-2 w-2.5 rounded-[60%_0]" style={{ left: `${rnd(i, 21) * 100}%`, background: '#ffd0e0', animationDelay: `${rnd(i, 22) * 6}s`, animationDuration: `${6 + rnd(i, 23) * 4}s` }} />
        ))}

      {/* 비네트 */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,.55))' }} />
    </div>
  );
}

/** 진로 발표 카드 위 리본 배너 */
export function Ribbon({ text, color }: { text: string; color: string }) {
  return (
    <div className="ribbon-in relative z-20 -mb-4 flex justify-center">
      <span className="absolute top-2 left-[8%] h-7 w-10 bg-[#7a1f2e]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 30% 50%)' }} />
      <span className="absolute top-2 right-[8%] h-7 w-10 bg-[#7a1f2e]" style={{ clipPath: 'polygon(0 0, 100% 0, 70% 50%, 100% 100%, 0 100%)' }} />
      <span className="relative rounded-sm border-2 border-ink px-6 py-1 text-base font-bold text-ink shadow-[3px_3px_0_rgba(0,0,0,.35)]" style={{ background: color }}>
        {text}
      </span>
    </div>
  );
}
