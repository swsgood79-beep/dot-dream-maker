import { useState } from 'react';
import { COMBO_MAP } from '../data/furnitureData';
import { growthStage } from '../engine/room';
import { STAT_KEYS } from '../engine/simulation';
import { useGameStore } from '../store/useGameStore';
import { MonthResultModal } from './MonthResultModal';
import { IsometricRoomCanvas } from './IsometricRoomCanvas';
import { Sheet, STAT_META } from './ui';
import { SchedulePanel } from './panels/SchedulePanel';
import { ShopPanel } from './panels/ShopPanel';
import { TalkPanel } from './panels/TalkPanel';
import { EncyclopediaPanel } from './panels/EncyclopediaPanel';
import { InfoPanel } from './panels/InfoPanel';

type Tab = 'schedule' | 'room' | 'talk' | 'book' | 'info';
const TABS: { id: Tab; icon: string; label: string; color: string }[] = [
  { id: 'schedule', icon: '📅', label: '스케줄', color: '#ff6fae' },
  { id: 'room', icon: '🛋️', label: '방꾸미기', color: '#ffc23c' },
  { id: 'talk', icon: '👟', label: '외출', color: '#5cc85c' },
  { id: 'book', icon: '👑', label: '엔딩도감', color: '#ef5a4a' },
  { id: 'info', icon: '📊', label: '내아이', color: '#3fb0ef' },
];

/** 계절 아이콘 */
function season(month: number) {
  if (month >= 3 && month <= 5) return '🌸';
  if (month >= 6 && month <= 8) return '☀️';
  if (month >= 9 && month <= 11) return '🍁';
  return '❄️';
}
const STAGE_ICON = { CHILD: '🐣', TEEN: '🐥', YOUTH: '🐓' };

export function MainScreen({ onTitle }: { onTitle: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const lastResult = useGameStore((s) => s.lastResult);
  const playing = useGameStore((s) => s.playing);
  const { runMonth, dismissResult, endPlayback } = useGameStore();
  const [tab, setTab] = useState<Tab | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);

  const stress = game.status.stress;
  const stressColor = stress >= 80 ? '#e5484d' : stress >= 50 ? '#ff9f43' : '#5bd6a8';

  return (
    <div className="room-bg relative flex h-full flex-col">
      {/* 상단 HUD — 나무 프레임 */}
      <header className="wood-frame relative z-10 shrink-0 p-1.5 text-xs">
        <div className="flex gap-1.5">
          <button
            onClick={() => setTab('schedule')}
            className="flex w-14 shrink-0 flex-col items-center justify-center rounded border-2 border-ink bg-[#fff6e5] leading-none shadow-[inset_0_-3px_0_#e0c9a0]"
            title="스케줄"
          >
            <span className="w-full rounded-t-sm bg-accent py-0.5 text-center text-[10px] font-bold text-white">{game.month}월</span>
            <span className="py-1 text-2xl">📅</span>
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex gap-1">
              <div className="hud-slot flex min-w-0 flex-1 items-center justify-between rounded px-2 py-1">
                <span className="truncate font-bold">
                  {game.age}세 <span className="text-gold">{game.month}월</span> · {game.childName}
                </span>
                <span className="rounded-sm border border-ink bg-sky/80 px-0.5 text-sm leading-tight" title={STAGE_ICON[growthStage(game.age)]}>
                  {season(game.month)}
                </span>
              </div>
              <div className="hud-slot flex items-center gap-1 rounded px-2 py-1 font-bold">
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-ink bg-gold text-[9px] text-ink">G</span>
                <span className="text-gold tabular-nums">{game.gold.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="hud-slot flex min-w-0 flex-1 items-center gap-1.5 rounded px-2 py-1">
                <span className="shrink-0 text-[11px]">😵 Stress</span>
                <div className="h-2.5 min-w-0 flex-1 border-2 border-ink bg-[#1b1f3b]">
                  <div className="h-full" style={{ width: `${stress}%`, background: stressColor }} />
                </div>
                <span className="shrink-0 tabular-nums">{stress}</span>
              </div>
              <div className="hud-slot flex items-center gap-1 rounded px-1.5 py-1 font-bold" title="영감 포인트">
                💡<span className="tabular-nums">{game.ideaPoints}</span>
              </div>
              <button onClick={onTitle} className="hud-slot rounded px-1.5" title="타이틀로">
                ⌂
              </button>
            </div>
          </div>
        </div>
        <button onClick={() => setTab('info')} className="mt-1 grid w-full grid-cols-6 gap-1 text-[10px]">
          {STAT_KEYS.map((k) => (
            <span
              key={k}
              className="flex items-center justify-center gap-0.5 rounded border-2 border-ink py-0.5 font-bold shadow-[inset_0_2px_0_rgba(255,255,255,.5)]"
              style={{ background: STAT_META[k].color }}
            >
              <span className="text-sm leading-none">{STAT_META[k].icon}</span>
              <span className="tabular-nums">{game.stats[k]}</span>
            </span>
          ))}
        </button>
      </header>

      {/* 중앙 룸 (64%) */}
      <main className="relative min-h-0 flex-1">
        <IsometricRoomCanvas
          placingId={placingId}
          onPlaced={() => setPlacingId(null)}
          playback={playing ? lastResult : null}
          onPlaybackDone={endPlayback}
        />
        {game.activeCombos.length > 0 && !playing && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {game.activeCombos.map((id) => (
              <span key={id} className="rounded border-2 border-ink bg-[#fff6e5]/90 px-1 text-[10px] font-bold shadow-[2px_2px_0_rgba(0,0,0,.3)]">✨ {COMBO_MAP[id].name}</span>
            ))}
          </div>
        )}
        {placingId && (
          <button className="absolute top-2 right-2 border-2 border-ink bg-white px-2 text-xs" onClick={() => setPlacingId(null)}>
            배치 취소
          </button>
        )}
      </main>

      {/* 하단 독 — 컬러 버튼 */}
      <nav className={`wood-frame grid shrink-0 grid-cols-5 gap-1.5 p-1.5 ${playing ? 'pointer-events-none opacity-60' : ''}`}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="dock-btn flex flex-col items-center py-1.5 text-[10px] font-bold" style={{ background: t.color }}>
            <span className="text-2xl leading-tight drop-shadow-[1px_1px_0_#1b1f3b]">{t.icon}</span>[{t.label}]
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

      {lastResult && !playing && <MonthResultModal result={lastResult} onClose={dismissResult} />}
    </div>
  );
}
