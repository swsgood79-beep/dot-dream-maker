import { useEffect, useState } from 'react';
import { eventScene } from '../render/eventScenes';
import type { Gender } from '../types/game';

/** 고화질 이벤트 일러스트가 천천히 다가가며(켄 번스) 서서히 바뀌는 배경 */
export const TITLE_SLIDES: [string, Gender][] = [
  ['CS_SCHOOL', 'DAUGHTER'],
  ['C_CHRISTMAS', 'SON'],
  ['F_SLEEPOVER', 'DAUGHTER'],
  ['T_CLUB', 'SON'],
  ['CS_MIDDLE', 'DAUGHTER'],
  ['Y_GRADUATION', 'SON'],
];

export function ArtBackdrop({ slides = TITLE_SLIDES, ms = 6500, dim = 0.45, band = [6, 36] }: { slides?: [string, Gender][]; ms?: number; dim?: number; band?: [number, number] }) {
  const urls = slides.map(([id, g]) => eventScene(id, g)).filter(Boolean) as string[];
  const [i, setI] = useState(0);
  useEffect(() => {
    // 다음 그림 미리 불러오기
    urls.forEach((u) => {
      const im = new Image();
      im.src = u;
    });
    const t = setInterval(() => setI((n) => (n + 1) % Math.max(1, urls.length)), ms);
    return () => clearInterval(t);
  }, [urls.length, ms]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0d1030]">
      {urls.map((u, k) => (
        <div key={u} className={`absolute inset-0 transition-opacity duration-[1800ms] ${k === i ? 'opacity-100' : 'opacity-0'}`}>
          {/* 뒤: 같은 그림을 크게 흐리게 (분위기) */}
          <img src={u} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover" style={{ filter: 'blur(18px) brightness(.55) saturate(1.2)' }} />
          {/* 앞: 그림 전체가 보이게 (세로 화면에서 확대해 흐려지지 않게) — 위아래 가장자리는 부드럽게 */}
          <div className="absolute inset-x-0" style={{ top: `${band[0]}%`, height: `${band[1]}%`, WebkitMaskImage: 'linear-gradient(transparent, #000 14%, #000 86%, transparent)', maskImage: 'linear-gradient(transparent, #000 14%, #000 86%, transparent)' }}>
            <img
              src={u}
              alt=""
              className={`h-full w-full object-cover ${k === i ? 'kenburns' : ''}`}
              style={{ animationDuration: `${ms + 2000}ms`, animationName: k % 2 ? 'kenburns-b' : 'kenburns-a' }}
            />
          </div>
        </div>
      ))}
      <div className="absolute inset-0" style={{ background: `linear-gradient(rgba(13,16,48,${dim * 0.5}), rgba(13,16,48,${dim * 0.15}) 30%, rgba(13,16,48,${dim * 0.6}) 60%, rgba(13,16,48,.9))` }} />
    </div>
  );
}

/** 금빛 게임 로고 (두 줄) */
export function GameLogo({ size = 1 }: { size?: number }) {
  return (
    <div className="logo-rise relative flex flex-col items-center">
      <p className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-[0.45em] text-[#ffe9a8]/80" style={{ fontSize: 10 * size }}>
        <span className="h-px w-8 bg-[#ffe9a8]/60" />
        DOT DREAM MAKER
        <span className="h-px w-8 bg-[#ffe9a8]/60" />
      </p>
      <h1 className="logo-text leading-[0.95] font-bold" style={{ fontSize: 46 * size }}>
        도트 드림
        <br />
        메이커
      </h1>
    </div>
  );
}
