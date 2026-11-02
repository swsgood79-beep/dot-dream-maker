import { useState } from 'react';
import { COMBO_MAP } from '../data/furnitureData';
import { growthStage } from '../engine/room';
import { STAT_KEYS } from '../engine/simulation';
import { useGameStore } from '../store/useGameStore';
import { MonthResultModal } from './MonthResultModal';
import { IsometricRoomCanvas } from './IsometricRoomCanvas';
import { Bar, Sheet, STAT_META } from './ui';
import { SchedulePanel } from './panels/SchedulePanel';
import { ShopPanel } from './panels/ShopPanel';
import { TalkPanel } from './panels/TalkPanel';
import { EncyclopediaPanel } from './panels/EncyclopediaPanel';
import { InfoPanel } from './panels/InfoPanel';

type Tab = 'schedule' | 'room' | 'talk' | 'book' | 'info';
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'schedule', icon: '📅', label: '스케줄' },
  { id: 'room', icon: '🛋️', label: '방 꾸미기' },
  { id: 'talk', icon: '👟', label: '대화' },
  { id: 'book', icon: '👑', label: '엔딩 도감' },
  { id: 'info', icon: '📊', label: '내 아이' },
];
const STAGE_ICON = { CHILD: '🐣', TEEN: '🐥', YOUTH: '🐓' };

export function MainScreen({ onTitle }: { onTitle: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const lastResult = useGameStore((s) => s.lastResult);
  const { runMonth, dismissResult } = useGameStore();
  const [tab, setTab] = useState<Tab | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);

  const stress = game.status.stress;
  const stressColor = stress >= 80 ? '#e5484d' : stress >= 50 ? '#ff9f43' : '#5bd6a8';

  return (
    <div className="relative flex h-full flex-col bg-[#2b2f5c]">
      {/* 상단 HUD (18%) */}
      <header className="pixel-box m-2 mb-0 shrink-0 p-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onTitle} className="border-2 border-ink bg-accent px-2 py-1 font-bold text-white">
              {game.age}세 {game.month}월
            </button>
            <span title={growthStage(game.age)}>{STAGE_ICON[growthStage(game.age)]}</span>
            <span className="font-bold">{game.childName}</span>
          </div>
          <div className="flex items-center gap-2 font-bold">
            <span className="text-wood">🪙 {game.gold.toLocaleString()}G</span>
            <span>💡 {game.ideaPoints}</span>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="shrink-0">STRESS {stress}/100</span>
          <Bar value={stress} max={100} color={stressColor} />
        </div>
        <button onClick={() => setTab('info')} className="mt-1 grid w-full grid-cols-6 gap-1 text-[10px]">
          {STAT_KEYS.map((k) => (
            <span key={k} className="border border-ink bg-white px-0.5 text-center">
              {STAT_META[k].icon}{game.stats[k]}
            </span>
          ))}
        </button>
      </header>

      {/* 중앙 룸 (64%) */}
      <main className="relative min-h-0 flex-1">
        <IsometricRoomCanvas placingId={placingId} onPlaced={() => setPlacingId(null)} />
        {game.activeCombos.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {game.activeCombos.map((id) => (
              <span key={id} className="border-2 border-ink bg-mint px-1 text-[10px] font-bold">✨ {COMBO_MAP[id].name}</span>
            ))}
          </div>
        )}
        {placingId && (
          <button className="absolute top-2 right-2 border-2 border-ink bg-white px-2 text-xs" onClick={() => setPlacingId(null)}>
            배치 취소
          </button>
        )}
      </main>

      {/* 하단 독 (18%) */}
      <nav className="m-2 mt-0 grid shrink-0 grid-cols-5 gap-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="pixel-btn flex flex-col items-center bg-panel py-1.5 text-[10px] font-bold">
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'schedule' && (
        <Sheet title={`📅 ${game.month}월 스케줄 편성`} onClose={() => setTab(null)}>
          <SchedulePanel
            onRun={() => {
              setTab(null);
              runMonth();
            }}
          />
        </Sheet>
      )}
      {tab === 'room' && (
        <Sheet title="🛋️ 방 꾸미기" onClose={() => setTab(null)}>
          <ShopPanel
            onPlaceMode={(id) => {
              setPlacingId(id);
              setTab(null);
            }}
          />
        </Sheet>
      )}
      {tab === 'talk' && (
        <Sheet title="👟 외출 / 대화" onClose={() => setTab(null)}>
          <TalkPanel />
        </Sheet>
      )}
      {tab === 'book' && (
        <Sheet title="👑 엔딩 도감" onClose={() => setTab(null)}>
          <EncyclopediaPanel />
        </Sheet>
      )}
      {tab === 'info' && (
        <Sheet title="📊 내 아이 정보" onClose={() => setTab(null)}>
          <InfoPanel />
        </Sheet>
      )}

      {lastResult && <MonthResultModal result={lastResult} onClose={dismissResult} />}
    </div>
  );
}
