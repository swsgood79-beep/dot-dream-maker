import { useState } from 'react';
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
