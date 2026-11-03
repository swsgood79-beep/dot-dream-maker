import { useEffect, useState } from 'react';
import { COMBO_MAP } from '../data/furnitureData';
import { growthStage } from '../engine/room';
import { STAT_KEYS } from '../engine/simulation';
import { useGameStore } from '../store/useGameStore';
import { MonthResultModal } from './MonthResultModal';
import { Icon } from './Icon';
import { ContestModal, ContestReveal } from './ContestModal';
import { EventModal } from './EventModal';
import { CutsceneModal } from './CutsceneModal';
import { ReportCardModal } from './ReportCardModal';
import { DiaryModal } from './DiaryModal';
import { WISH_MAP } from '../data/parentingData';
import { sfx } from '../audio/sfx';
import type { ContestId, MonthResult } from '../engine/simulation';
import { IsometricRoomCanvas } from './IsometricRoomCanvas';
import { PixelButton, Sheet, STAT_META } from './ui';
import { SchedulePanel } from './panels/SchedulePanel';
import { ShopPanel } from './panels/ShopPanel';
import { TalkPanel } from './panels/TalkPanel';
import { EncyclopediaPanel } from './panels/EncyclopediaPanel';
import { InfoPanel } from './panels/InfoPanel';

type Tab = 'schedule' | 'room' | 'talk' | 'book' | 'info';
const TABS: { id: Tab; icon: string; label: string; color: string }[] = [
  { id: 'schedule', icon: 'NAV_SCHEDULE', label: '스케줄', color: '#ff6fae' },
  { id: 'room', icon: 'NAV_ROOM', label: '방꾸미기', color: '#ffc23c' },
  { id: 'talk', icon: 'NAV_OUTING', label: '외출', color: '#5cc85c' },
  { id: 'book', icon: 'NAV_BOOK', label: '엔딩도감', color: '#ef5a4a' },
  { id: 'info', icon: 'NAV_INFO', label: '내아이', color: '#3fb0ef' },
];

/** 계절 아이콘 */
function season(month: number) {
  if (month >= 3 && month <= 5) return 'SPRING';
  if (month >= 6 && month <= 8) return 'SUMMER';
  if (month >= 9 && month <= 11) return 'AUTUMN';
  return 'WINTER';
}
const STAGE_ICON = { CHILD: '🐣', TEEN: '🐥', YOUTH: '🐓' };

export function MainScreen({ onTitle }: { onTitle: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const lastResult = useGameStore((s) => s.lastResult);
  const playing = useGameStore((s) => s.playing);
  const { runMonth, dismissResult, endPlayback } = useGameStore();
  const [tab, setTab] = useState<Tab | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [contestSeen, setContestSeen] = useState<MonthResult | null>(null);
  const muted = useGameStore((s) => s.muted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const musicOn = useGameStore((s) => s.musicOn);
  const toggleMusic = useGameStore((s) => s.toggleMusic);
  // 선택 후 아이 반응을 보여 주는 동안 모달을 유지하기 위해 표시 중인 상황 ID를 따로 보관
  const [eventShown, setEventShown] = useState<string | null>(null);
  const [reportShown, setReportShown] = useState(false);
  const [diaryOpen, setDiaryOpen] = useState(false);
  // 대회 미니게임: 판정 후 결과 연출이 끝날 때까지 유지
  const [contestShown, setContestShown] = useState<{ id: ContestId; age: number } | null>(null);
  const contestOpen = playing ? null : (contestShown ?? game.pendingContest ?? null);
  useEffect(() => {
    if (!playing && game.pendingContest && !contestShown) setContestShown(game.pendingContest);
  }, [playing, game.pendingContest, contestShown]);
  // 새 달 시작 순서: 월간 결과 → 성장 컷신 → 성적표 → 육아 상황
  const idle = !lastResult && !playing && !contestOpen;
  const openCut = idle && !eventShown && !reportShown ? (game.pendingCutscene ?? null) : null;
  const openReport = idle && !openCut && !eventShown && (reportShown || !!game.pendingReport);
  const openEvent = idle && !openCut && !openReport ? (eventShown ?? game.pendingEvent ?? null) : null;
  const showContest = !!(lastResult && !playing && lastResult.contest && contestSeen !== lastResult);

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
            <Icon name="NAV_SCHEDULE" size={30} className="my-0.5" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex gap-1">
              <div className="hud-slot flex min-w-0 flex-1 items-center justify-between rounded px-2 py-1">
                <span className="truncate font-bold">
                  {game.age}세 <span className="text-gold">{game.month}월</span> · {game.childName}
                </span>
                <Icon name={season(game.month)} size={20} title={STAGE_ICON[growthStage(game.age)]} />
              </div>
              <div className="hud-slot flex items-center gap-1 rounded px-2 py-1 font-bold">
                <Icon name="GOLD" size={18} />
                <span className="text-gold tabular-nums">{game.gold.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="hud-slot flex min-w-0 flex-1 items-center gap-1.5 rounded px-2 py-1">
                <Icon name="STRESS" size={16} />
                <span className="shrink-0 text-[11px]">스트레스</span>
                <div className="h-2.5 min-w-0 flex-1 border-2 border-ink bg-[#1b1f3b]">
                  <div className="h-full" style={{ width: `${stress}%`, background: stressColor }} />
                </div>
                <span className="shrink-0 tabular-nums">{stress}</span>
              </div>
              <div className="hud-slot flex items-center gap-1 rounded px-1.5 py-1 font-bold" title="영감 포인트">
                <Icon name="IDEA" size={16} />
                <span className="tabular-nums">{game.ideaPoints}</span>
              </div>
              <button onClick={toggleMute} className="hud-slot rounded px-1" title={muted ? '소리 켜기' : '소리 끄기'}>
                <Icon name={muted ? 'SOUND_OFF' : 'SOUND_ON'} size={18} />
              </button>
              <button onClick={toggleMusic} className="hud-slot rounded px-1 text-[13px] leading-none" title={musicOn ? '배경음악 끄기' : '배경음악 켜기'}>
                <span className={musicOn ? '' : 'opacity-35 grayscale'}>🎵</span>
              </button>
              <button onClick={onTitle} className="hud-slot rounded px-1" title="타이틀로">
                <Icon name="HOME" size={18} />
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
              <Icon name={k} size={15} title={STAT_META[k].label} />
              <span className="tabular-nums">{game.stats[k]}</span>
            </span>
          ))}
        </button>
        {game.wish && WISH_MAP[game.wish.id] && (() => {
          const w = WISH_MAP[game.wish.id];
          const goal = w.kind === 'action' ? (w.count ?? 1) : 1;
          return (
            <button
              onClick={() => setTab(w.kind === 'talk' ? 'talk' : w.kind === 'furniture' ? 'room' : 'schedule')}
              className="mt-1 flex w-full items-center gap-1.5 rounded border-2 border-ink bg-[#fff6e5] px-2 py-0.5 text-left text-[10px]"
              title="아이의 부탁"
            >
              <span className="text-sm">{w.emoji}</span>
              <span className="min-w-0 flex-1 truncate">
                <b>“{w.text}”</b> <span className="opacity-70">· {w.hint}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-accent">
                {game.wish.progress}/{goal} · {game.wish.left}달
              </span>
            </button>
          );
        })()}
      </header>

      {/* 중앙 룸 (64%) */}
      <main className="relative min-h-0 flex-1">
        <IsometricRoomCanvas
          placingId={placingId}
          onPlaced={() => setPlacingId(null)}
          playback={playing ? lastResult : null}
          onPlaybackDone={endPlayback}
        />
        {game.diaryNew && !playing && !placingId && (
          <button
            onClick={() => {
              sfx('page');
              setDiaryOpen(true);
            }}
            className="pop-in absolute top-2 right-2 z-10 flex items-center gap-1 rounded border-2 border-ink bg-[#fff6e5] px-2 py-1 text-[11px] font-bold shadow-[2px_2px_0_rgba(0,0,0,.35)]"
          >
            <span className="animate-bounce text-base">📔</span> 일기장이 놓여 있다
          </button>
        )}
        {game.activeCombos.length > 0 && !playing && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {game.activeCombos.map((id) => (
              <span key={id} className="rounded border-2 border-ink bg-[#fff6e5]/90 px-1 text-[10px] font-bold shadow-[2px_2px_0_rgba(0,0,0,.3)]">
                <Icon name="SPARKLE" size={12} /> {COMBO_MAP[id].name}
              </span>
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
          <button
            key={t.id}
            onClick={() => {
              sfx('page');
              setTab(t.id);
            }}
            className="dock-btn flex flex-col items-center py-1.5 text-[10px] font-bold" style={{ background: t.color }}>
            <Icon name={t.icon} size={30} className="drop-shadow-[1px_1px_0_#1b1f3b]" />
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'schedule' && (
        <Sheet
          icon="NAV_SCHEDULE"
          title={`${game.month}월 스케줄 편성`}
          onClose={() => setTab(null)}
          footer={
            <PixelButton
              className="w-full"
              color="bg-accent !text-white"
              onClick={() => {
                setTab(null);
                runMonth();
              }}
            >
              ▶ 이번 달 진행하기
            </PixelButton>
          }
        >
          <SchedulePanel />
        </Sheet>
      )}
      {tab === 'room' && (
        <Sheet icon="NAV_ROOM" title="방 꾸미기" onClose={() => setTab(null)}>
          <ShopPanel
            onPlaceMode={(id) => {
              setPlacingId(id);
              setTab(null);
            }}
          />
        </Sheet>
      )}
      {tab === 'talk' && (
        <Sheet icon="NAV_OUTING" title="외출 / 대화" onClose={() => setTab(null)}>
          <TalkPanel />
        </Sheet>
      )}
      {tab === 'book' && (
        <Sheet icon="NAV_BOOK" title="엔딩 도감" onClose={() => setTab(null)}>
          <EncyclopediaPanel />
        </Sheet>
      )}
      {tab === 'info' && (
        <Sheet icon="NAV_INFO" title="내 아이 정보" onClose={() => setTab(null)}>
          <InfoPanel />
        </Sheet>
      )}

      {showContest && lastResult?.contest && (
        <ContestReveal contest={lastResult.contest} gender={game.gender} age={lastResult.contest.age} onClose={() => setContestSeen(lastResult)} />
      )}
      {contestOpen && (
        <ContestModal
          key={`${contestOpen.age}-${contestOpen.id}`}
          id={contestOpen.id}
          gender={game.gender}
          age={contestOpen.age}
          onClose={() => setContestShown(null)}
        />
      )}
      {lastResult && !playing && !showContest && !contestOpen && <MonthResultModal result={lastResult} onClose={dismissResult} />}
      {diaryOpen && <DiaryModal onClose={() => setDiaryOpen(false)} />}
      {openCut && <CutsceneModal key={openCut} id={openCut} />}
      {openReport && <ReportCardModal onPick={() => setReportShown(true)} onClose={() => setReportShown(false)} />}
      {openEvent && <EventModal key={openEvent} id={openEvent} onPick={() => setEventShown(openEvent)} onClose={() => setEventShown(null)} />}
    </div>
  );
}
