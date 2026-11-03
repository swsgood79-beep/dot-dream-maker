import { useEffect, useState } from 'react';
import { playBgm, SEASON_TRACK, type TrackId } from './audio/bgm';
import { getAudio } from './audio/sfx';
import { useGameStore } from './store/useGameStore';
import { TitleScreen } from './components/TitleScreen';
import { MainScreen } from './components/MainScreen';
import { EndingScreen } from './components/EndingScreen';

export default function App() {
  const game = useGameStore((s) => s.game);
  const ending = useGameStore((s) => s.ending);
  const lastResult = useGameStore((s) => s.lastResult);
  const toasts = useGameStore((s) => s.toasts);
  const [screen, setScreen] = useState<'title' | 'game'>('title');

  // 엔딩은 월간 결과 모달을 닫은 뒤에 표시
  const showEnding = ending && !lastResult;
  const muted = useGameStore((s) => s.muted);
  const musicOn = useGameStore((s) => s.musicOn);
  const month = game?.month ?? 1;
  const [touched, setTouched] = useState(false);

  // 브라우저는 첫 터치 전에는 소리를 낼 수 없다
  useEffect(() => {
    const on = () => {
      getAudio();
      setTouched(true);
    };
    window.addEventListener('pointerdown', on, { once: true });
    return () => window.removeEventListener('pointerdown', on);
  }, []);

  // 화면·계절에 맞는 배경음악
  const track: TrackId | null =
    !touched || muted || !musicOn ? null : showEnding ? 'ENDING' : screen === 'game' && game ? SEASON_TRACK(month) : 'TITLE';
  useEffect(() => {
    try {
      playBgm(track);
    } catch {
      /* 오디오 불가 환경 */
    }
  }, [track]);

  return (
    <div className="flex h-full items-center justify-center">
      {/* 9:16 세로형 모바일 프레임 */}
      <div className="relative h-full max-h-[932px] w-full max-w-[430px] overflow-hidden sm:rounded-lg sm:border-4 sm:border-black" style={{ aspectRatio: '9 / 16' }}>
        {showEnding ? (
          <EndingScreen onDone={() => setScreen('title')} />
        ) : screen === 'game' && game ? (
          <MainScreen onTitle={() => setScreen('title')} />
        ) : (
          <TitleScreen onStart={() => setScreen('game')} />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-24 z-50 flex flex-col items-center gap-1">
          {toasts.map((t) => (
            <div key={t.id} className="pop-in border-3 border-ink bg-gold px-3 py-1 text-xs font-bold shadow-[3px_3px_0_#000]">
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
