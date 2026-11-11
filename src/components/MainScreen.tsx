import { useEffect, useState } from 'react';
import { COMBO_MAP } from '../data/furnitureData';
import { displayStage } from '../engine/displayStage';
import { STAT_KEYS } from '../engine/simulation';
import { useGameStore } from '../store/useGameStore';
import { MonthResultModal } from './MonthResultModal';
import { Icon } from './Icon';
import { ContestModal, ContestReveal } from './ContestModal';
import { EventModal } from './EventModal';
import { CutsceneModal } from './CutsceneModal';
import { ReportCardModal } from './ReportCardModal';
import { DiaryModal } from './DiaryModal';
import { BirthdayModal } from './BirthdayModal';
import { SeasonFx } from './SeasonFx';
import { Tutorial } from './Tutorial';
import { RecModal } from './RecModal';
import { ActingAlertModal } from './ActingAlertModal';
import { UnlockModal } from './UnlockModal';
import { NightModal } from './NightModal';
import { autoStopReason } from '../engine/simulation';
import { planMode } from '../engine/negotiate';
import { TownModal } from './TownModal';
import { SpecialDayModal } from './SpecialDayModal';
import { YearReviewModal } from './YearReviewModal';
import { goalProgress } from '../engine/yearReview';
import { EmotionModal } from './EmotionModal';
import { HomeworkModal, LunchModal } from './ParentTouchModals';
import { CONTESTS } from '../engine/simulation';
import { WISH_MAP } from '../data/parentingData';
import { sfx } from '../audio/sfx';
import type { ContestId, MonthResult } from '../engine/simulation';
import { IsometricRoomCanvas } from './IsometricRoomCanvas';
import { HOME_BACKDROP } from '../render/homeDecor';
import { parentClass } from '../data/parentData';
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
  const autoLeft = useGameStore((s) => s.autoLeft);
  const stopAuto = useGameStore((s) => s.stopAuto);
  const doNegotiate = useGameStore((s) => s.doNegotiate);
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
  const [bdayShown, setBdayShown] = useState(false);
  const [specialShown, setSpecialShown] = useState<string | null>(null);
  const [emoShown, setEmoShown] = useState<string | null>(null);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [nightOpen, setNightOpen] = useState(false);
  const [townOpen, setTownOpen] = useState(false);
  const [hwOpen, setHwOpen] = useState(false);
  const [lunchOpen, setLunchOpen] = useState(false);
  // 이번 달 대회 (도시락)
  const contestThisMonth = (Object.keys(CONTESTS) as (keyof typeof CONTESTS)[]).find((k) => CONTESTS[k].month === game.month);
  const tutorialDone = useGameStore((s) => s.tutorialDone);
  const setTutorialDone = useGameStore((s) => s.setTutorialDone);
  // 첫 판의 첫 달에만 튜토리얼 (옛 저장으로 이어하는 중이면 보이지 않음)
  const showTutorial = !tutorialDone && game.age === 8 && game.month === 1 && !lastResult && !playing;
  // 대회 미니게임: 판정 후 결과 연출이 끝날 때까지 유지
  const [contestShown, setContestShown] = useState<{ id: ContestId; age: number } | null>(null);
  const contestOpen = playing ? null : (contestShown ?? game.pendingContest ?? null);
  useEffect(() => {
    if (!playing && game.pendingContest && !contestShown) setContestShown(game.pendingContest);
  }, [playing, game.pendingContest, contestShown]);
  // 새 달 시작 순서: 월간 결과 → 성장 컷신 → 성적표 → 육아 상황
  const idle0 = !lastResult && !playing && !contestOpen && !showTutorial;
  // 🪞 새해 첫 달: 지난 1년 돌아보기가 맨 먼저
  const openYear = idle0 && !!game.pendingYearReview;
  const idle = idle0 && !openYear;
  const openCut = idle && !eventShown && !reportShown ? (game.pendingCutscene ?? null) : null;
  // 새로 열린 콘텐츠: 성장 컷신 바로 뒤
  const openUnlock = idle && !openCut && !eventShown && !reportShown && !bdayShown && !!game.pendingUnlock;
  const openReport = idle && !openCut && !openUnlock && !eventShown && !bdayShown && (reportShown || !!game.pendingReport);
  const openBday = idle && !openCut && !openUnlock && !openReport && !eventShown && (bdayShown || !!game.pendingBirthday);
  const openEvent = idle && !openCut && !openUnlock && !openReport && !openBday ? (eventShown ?? game.pendingEvent ?? null) : null;
  // ✨ 특별한 하루: 육아 상황까지 끝난 뒤
  const openSpecial = idle && !openCut && !openUnlock && !openReport && !openBday && !openEvent && !eventShown ? (specialShown ?? game.pendingSpecial ?? null) : null;
  // 💗 감정의 순간: 그 밖의 창이 다 끝난 뒤
  const openEmotion = idle && !openCut && !openUnlock && !openReport && !openBday && !openEvent && !eventShown && !openSpecial ? (emoShown ?? game.pendingEmotion ?? null) : null;
  // 이상행동 안내: 새 달 창들이 다 끝난 뒤 한 번
  const markActingSeen = useGameStore((s) => s.markActingSeen);
  const openAlert = idle && !openCut && !openUnlock && !openReport && !openBday && !openEvent && !openSpecial && !openEmotion && !recOpen && !!game.acting && !game.acting.seen;
  const showContest = !!(lastResult && !playing && lastResult.contest && contestSeen !== lastResult);
  // ⏩ 연속 진행: 새 달 창(육아 상황 · 생일 · 특별한 하루 …)을 다 처리하면 같은 스케줄로 다음 달 자동 진행
  const anyWindow =
    openYear || !!openCut || openUnlock || openReport || openBday || !!openEvent || !!openSpecial || !!openEmotion || openAlert || recOpen || nightOpen || townOpen || hwOpen || lunchOpen || diaryOpen || tab !== null;
  useEffect(() => {
    if (autoLeft <= 0 || !idle0 || anyWindow || lastResult || playing) return;
    const t = setTimeout(() => {
      const st = useGameStore.getState();
      if (st.autoLeft > 0 && !st.lastResult && !st.playing) runMonth(st.autoLeft);
    }, 900);
    return () => clearTimeout(t);
  }, [autoLeft, idle0, anyWindow, lastResult, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const stress = game.status.stress;
  const stressColor = stress >= 80 ? '#e5484d' : stress >= 50 ? '#ff9f43' : '#5bd6a8';

  return (
    <div className="room-bg relative flex h-full flex-col" style={{ backgroundColor: HOME_BACKDROP[parentClass(game.parent)] }} data-tut-root>
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
                <Icon name={season(game.month)} size={20} title={STAGE_ICON[displayStage(game)]} />
              </div>
              <div className="hud-slot flex items-center gap-1 rounded px-2 py-1 font-bold" data-tut="gold">
                <Icon name="GOLD" size={18} />
                <span className="text-gold tabular-nums">{game.gold.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="hud-slot flex min-w-0 flex-1 items-center gap-1.5 rounded px-2 py-1" data-tut="stress">
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
        <button onClick={() => setTab('info')} className="mt-1 grid w-full grid-cols-6 gap-1 text-[10px]" data-tut="stats">
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
      <main className="relative min-h-0 flex-1" data-tut="canvas">
        <IsometricRoomCanvas
          placingId={placingId}
          onPlaced={() => setPlacingId(null)}
          playback={playing ? lastResult : null}
          onPlaybackDone={endPlayback}
        />
        <SeasonFx month={game.month} />
        {game.acting && !playing && !placingId && (
          <button
            onClick={() => {
              sfx('page');
              setRecOpen(true);
            }}
            className="pop-in absolute top-2 left-2 z-10 flex items-center gap-1 rounded border-2 border-ink bg-[#1b1f3b] px-2 py-1 text-[11px] font-bold text-white shadow-[2px_2px_0_rgba(0,0,0,.35)]"
          >
            <span className="rec-blink text-[#ff3b3b]">●</span> 🔍 관찰하기
          </button>
        )}
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
        {game.yearGoal && autoLeft === 0 && !playing && !placingId && (
          <div className="pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-full border-2 border-ink bg-[#fff6e5]/95 px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap shadow-[2px_2px_0_rgba(0,0,0,.3)]">
            🎯 {game.age}살 목표: {game.yearGoal.emoji} {game.yearGoal.title.replace(/ \(.*\)$/, '')} · <span className="text-accent">{goalProgress(game)}</span>
          </div>
        )}
        {autoLeft > 0 && !playing && (
          <div className="pop-in absolute top-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-ink bg-[#d8f0ff] px-2.5 py-1 text-[11px] font-bold whitespace-nowrap shadow-[2px_2px_0_rgba(0,0,0,.35)]">
            ⏩ 연속 진행 중 · {autoLeft}달 남음
            <button className="rounded-full border-2 border-ink bg-white px-1.5 text-[10px]" onClick={stopAuto}>
              멈추기
            </button>
          </div>
        )}
        {/* 부모의 손길: 잠든 아이 · 숙제 · 도시락 (선택, 방 왼쪽 아래) */}
        {!playing && !placingId && !lastResult && (
          <div className="absolute bottom-2 left-2 z-10 flex flex-col items-start gap-1">
            {!game.outingDone && (
              <button onClick={() => { sfx('door'); setTownOpen(true); }} className="pop-in flex items-center gap-1 rounded border-2 border-ink bg-[#8cc56f] px-2 py-1 text-[11px] font-bold text-ink shadow-[2px_2px_0_rgba(0,0,0,.35)]">
                <span className="animate-bounce">🗺️</span> 주말 나들이 가기
                {!(game.townRecent ?? []).length && <span className="ml-1 animate-pulse rounded border border-ink bg-[#ff6fae] px-1 text-[9px] text-white">NEW 눌러 보세요!</span>}
              </button>
            )}
            {contestThisMonth && !game.lunchbox && (
              <button onClick={() => { sfx('page'); setLunchOpen(true); }} className="pop-in flex items-center gap-1 rounded border-2 border-ink bg-[#fff1c2] px-2 py-1 text-[11px] font-bold text-ink shadow-[2px_2px_0_rgba(0,0,0,.35)]">
                🍱 {CONTESTS[contestThisMonth].title} 도시락 싸 주기
              </button>
            )}
            {game.homeworkAsk && (
              <button onClick={() => { sfx('page'); setHwOpen(true); }} className="pop-in flex items-center gap-1 rounded border-2 border-ink bg-white px-2 py-1 text-[11px] font-bold text-ink shadow-[2px_2px_0_rgba(0,0,0,.35)]">
                <span className="animate-bounce">✏️</span> 숙제를 들고 서성인다
              </button>
            )}
            {!game.nightVisited && (
              <button onClick={() => { sfx('page'); setNightOpen(true); }} className="pop-in flex items-center gap-1 rounded border-2 border-ink bg-[#2a2f5c] px-2 py-1 text-[11px] font-bold text-white shadow-[2px_2px_0_rgba(0,0,0,.35)]">
                🌙 잠든 아이 보러 가기
              </button>
            )}
          </div>
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
            data-tut={t.id}
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
            planMode(game.age) === 'NEGOTIATE' && !game.negoDone ? (
              <PixelButton
                className="w-full"
                color="bg-[#5bb8f0] !text-white"
                onClick={() => {
                  doNegotiate();
                  sfx('page');
                }}
              >
                💬 이렇게 이야기해 보기
              </PixelButton>
            ) : (
            <div className="flex gap-1.5">
              <PixelButton
                className="flex-1"
                color="bg-accent !text-white"
                onClick={() => {
                  setTab(null);
                  runMonth(1);
                }}
              >
                ▶ 이번 달 진행하기
              </PixelButton>
              <PixelButton
                className="shrink-0 !px-2 !text-xs"
                color="bg-[#5bb8f0] !text-white"
                onClick={() => {
                  setTab(null);
                  runMonth(3);
                }}
              >
                ⏩ 3달 연속
              </PixelButton>
            </div>
            )
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
      {lastResult && !playing && !showContest && !contestOpen && (
        <MonthResultModal
          key={`${game.age}-${game.month}`}
          result={lastResult}
          auto={autoLeft > 0 ? { left: autoLeft, stop: autoStopReason(game, lastResult), onStop: stopAuto } : undefined}
          onClose={() => {
            // 완전히 멈출 일이 아니면 연속 진행을 유지 → 새 달 창들을 다 본 뒤 아래 효과가 다음 달을 진행
            const stop = autoStopReason(game, lastResult);
            dismissResult();
            if (stop || lastResult.ending) stopAuto();
          }}
        />
      )}
      {showTutorial && (
        <Tutorial
          name={game.childName}
          onDone={() => {
            setTutorialDone(true);
            setTab('schedule');
          }}
        />
      )}
      {openAlert && (
        <ActingAlertModal
          onWatch={() => {
            markActingSeen();
            setRecOpen(true);
          }}
          onLater={() => markActingSeen()}
        />
      )}
      {recOpen && <RecModal onClose={() => setRecOpen(false)} />}
      {townOpen && <TownModal onClose={() => setTownOpen(false)} />}
      {nightOpen && <NightModal onClose={() => setNightOpen(false)} />}
      {hwOpen && <HomeworkModal onClose={() => setHwOpen(false)} />}
      {lunchOpen && contestThisMonth && <LunchModal contest={contestThisMonth} onClose={() => setLunchOpen(false)} />}
      {diaryOpen && <DiaryModal onClose={() => setDiaryOpen(false)} />}
      {openYear && <YearReviewModal />}
      {openCut && <CutsceneModal key={openCut} id={openCut} />}
      {openUnlock && <UnlockModal onClose={() => {}} />}
      {openReport && <ReportCardModal onPick={() => setReportShown(true)} onClose={() => setReportShown(false)} />}
      {openBday && <BirthdayModal onPick={() => setBdayShown(true)} onClose={() => setBdayShown(false)} />}
      {openEmotion && <EmotionModal key={openEmotion} id={openEmotion} onStart={() => setEmoShown(openEmotion)} onClose={() => setEmoShown(null)} />}
      {openSpecial && <SpecialDayModal key={openSpecial} id={openSpecial} onStart={() => setSpecialShown(openSpecial)} onClose={() => setSpecialShown(null)} />}
      {openEvent && <EventModal key={openEvent} id={openEvent} onPick={() => setEventShown(openEvent)} onClose={() => setEventShown(null)} />}
    </div>
  );
}
