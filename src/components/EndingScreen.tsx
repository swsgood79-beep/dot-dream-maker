import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CATEGORY_LABEL, ENDINGS } from '../data/endingData';
import { CATEGORY_COLOR, ENDING_SCENE } from '../data/endingScenes';
import { growthStage } from '../engine/room';
import { STAT_KEYS, type GrowthSnapshot } from '../engine/simulation';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { useGameStore } from '../store/useGameStore';
import type { CharacterStats, StatKey } from '../types/game';
import { Sprite } from './Sprite';
import { Bar, PixelButton, STAT_META, TIER_COLOR } from './ui';
import { Icon } from './Icon';
import { STYLE_META } from '../data/parentingData';
import { dominantStyle } from '../engine/parenting';
import { PhotoAlbum } from './PhotoAlbum';
import { buildLetter } from '../data/letterData';
import { TEMPERAMENT_MAP } from '../data/temperamentData';

type Step = 'intro' | 'album' | 'photos' | 'drum' | 'reveal' | 'letter';

const STAGE_TITLE = { CHILD: '유년기', TEEN: '청소년기', YOUTH: '청년기' };

function topStat(stats: CharacterStats): StatKey {
  return STAT_KEYS.reduce((a, b) => (stats[b] > stats[a] ? b : a), STAT_KEYS[0]);
}

/** 앨범에 실을 장면: 입학(8세), 중학생(12세), 고등학생(17세), 성인식(19세 12월) */
function albumPages(history: GrowthSnapshot[] | undefined, finalStats: CharacterStats, fame: number): GrowthSnapshot[] {
  const pick = (age: number) => history?.find((h) => h.age === age);
  const pages = [pick(8), pick(12), pick(17)].filter((x): x is GrowthSnapshot => !!x);
  pages.push(history?.find((h) => h.age === 20) ?? { age: 20, stats: finalStats, fame });
  return pages;
}

function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 45);
    return () => clearTimeout(t);
  }, [n, text]);
  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span className="animate-pulse">▌</span>}
    </span>
  );
}

export function EndingScreen({ onDone }: { onDone: () => void }) {
  const { ending, game, unlockedEndings, finishEnding } = useGameStore();
  const [step, setStep] = useState<Step>('intro');
  const [page, setPage] = useState(0);
  const pages = useMemo(
    () => (game ? albumPages(game.history, game.stats, game.status.fame) : []),
    [game],
  );

  useEffect(() => {
    if (step !== 'drum') return;
    sfx('drumroll');
    const t = setTimeout(() => {
      setStep('reveal');
      sfx('ending');
    }, 1700);
    return () => clearTimeout(t);
  }, [step]);

  if (!ending || !game) return null;
  const scene = ENDING_SCENE[ending.id] ?? ENDING_SCENE.END_50;
  const jobFrame = `JOB_${ending.id}_${game.gender}`;

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-b from-[#1b1f3b] to-[#4a3b6b] p-4 text-center text-white">
      {step === 'intro' && (
        <div className="pop-in flex flex-col items-center gap-4">
          <p className="text-sm text-gold">🎓 19세 12월</p>
          <h1 className="text-3xl font-bold text-gold drop-shadow-[3px_3px_0_#000]">성인식</h1>
          <p className="text-xs opacity-80">
            {game.childName}의 12년, 144개월의 성장 이야기가 끝났습니다.
            <br />
            오늘, 어른이 된 {game.childName}의 진로가 발표됩니다.
          </p>
          <div className="flex items-end gap-3">
            <Sprite name={frameName('YOUTH', game.gender, 'stand')} scale={1.6} />
          </div>
          <PixelButton color="bg-gold" onClick={() => setStep('album')}>
            📷 성장 앨범 펼치기
          </PixelButton>
        </div>
      )}

      {step === 'album' && pages[page] && (
        <div key={page} className="pop-in flex w-full flex-col items-center gap-3">
          <p className="text-xs text-gold">📷 성장 앨범 {page + 1} / {pages.length}</p>
          {(() => {
            const snap = pages[page];
            const st = growthStage(Math.min(19, snap.age));
            const best = topStat(snap.stats);
            const label = snap.age === 20 ? '19세 12월 · 성인식' : snap.age === 8 ? '8세 · 초등학교 입학' : `${snap.age}세 · ${STAGE_TITLE[st]}`;
            return (
              <div className="w-full rotate-[-1.5deg] rounded-sm bg-[#fff6e5] p-3 pb-4 text-ink shadow-[6px_6px_0_rgba(0,0,0,.35)]">
                <div className="room-bg flex h-36 items-end justify-center border-3 border-ink">
                  <Sprite name={frameName(st, game.gender, snap.age === 20 ? 'cheer' : 'stand')} scale={1.5} />
                </div>
                <p className="mt-2 text-sm font-bold">{label}</p>
                <p className="mb-2 text-[10px] opacity-70">
                  가장 빛난 재능: <Icon name={best} size={14} /> {STAT_META[best].label} {snap.stats[best]} · <Icon name="FAME" size={14} /> 명성 {snap.fame}
                </p>
                <div className="grid grid-cols-1 gap-0.5 text-[10px]">
                  {STAT_KEYS.map((k) => (
                    <div key={k} className="flex items-center gap-1">
                      <span className="w-12 shrink-0 text-left">
                        <Icon name={k} size={13} /> {STAT_META[k].label}
                      </span>
                      <Bar value={snap.stats[k]} max={999} color={STAT_META[k].color} height="h-2" />
                      <span className="w-7 shrink-0 text-right tabular-nums">{snap.stats[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="flex w-full gap-2">
            <PixelButton color="bg-white" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ◀
            </PixelButton>
            {page < pages.length - 1 ? (
              <PixelButton className="flex-1" color="bg-sky" onClick={() => setPage((p) => p + 1)}>
                다음 장 ▶
              </PixelButton>
            ) : (
              <PixelButton
                className="flex-1"
                color="bg-gold"
                onClick={() => setStep((game.photos?.length ?? 0) > 1 ? 'photos' : 'drum')}
              >
                {(game.photos?.length ?? 0) > 1 ? '📷 가족 사진첩 ▶' : '🎉 진로 발표!'}
              </PixelButton>
            )}
          </div>
        </div>
      )}

      {step === 'photos' && (
        <div className="pop-in flex min-h-0 w-full flex-1 flex-col items-center gap-2">
          <p className="text-xs text-gold">📷 가족 사진첩 · {game.photos!.length}장의 추억</p>
          <div className="min-h-0 w-full flex-1 overflow-y-auto rounded border-3 border-ink bg-[#e9dcc0]">
            <PhotoAlbum photos={game.photos!} gender={game.gender} />
          </div>
          <PixelButton className="w-full" color="bg-gold" onClick={() => setStep('drum')}>
            🎉 진로 발표!
          </PixelButton>
        </div>
      )}

      {step === 'letter' &&
        (() => {
          const l = buildLetter(game, ending);
          const t = game.temperament && game.temperRevealed ? TEMPERAMENT_MAP[game.temperament] : null;
          return (
            <div className="pop-in flex min-h-0 w-full flex-1 flex-col items-center gap-2">
              <p className="text-xs text-gold">📮 {game.childName}의 편지</p>
              <div className="min-h-0 w-full flex-1 overflow-y-auto rounded-sm border-3 border-ink bg-[repeating-linear-gradient(#fffaf0_0_22px,#e8dcc4_22px_23px)] p-3 text-left text-[13px] leading-[23px] text-ink">
                <p className="font-bold">{l.greeting},</p>
                <br />
                {l.body.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <br />
                <p>{l.closing}</p>
                <p className="text-right">— {game.childName} 올림</p>
              </div>
              {t && (
                <p className="text-[10px] opacity-80">
                  {t.emoji} {t.label} 아이 · 들어준 부탁 {game.wishesGranted ?? 0}번 · 함께한 사건 {game.seenEvents?.length ?? 0}가지
                </p>
              )}
              <PixelButton
                className="w-full"
                color="bg-gold"
                onClick={() => {
                  finishEnding();
                  onDone();
                }}
              >
                타이틀로 (다음 회차 💡 30% 인계)
              </PixelButton>
            </div>
          );
        })()}

      {step === 'drum' && (
        <div className="flex flex-col items-center gap-3">
          <p className="animate-pulse text-2xl font-bold text-gold">두구두구두구…</p>
          <Sprite name={frameName('YOUTH', game.gender, 'stand')} scale={1.6} />
        </div>
      )}

      {step === 'reveal' && (
        <div className="pop-in flex w-full flex-col items-center gap-3">
          {/* 직업 엔딩 일러스트 카드 */}
          <div className="wood-frame w-full overflow-hidden rounded-md">
            <div
              className="relative flex h-56 items-end justify-center overflow-hidden"
              style={{ background: `linear-gradient(${scene.sky[0]}, ${scene.sky[1]})` }}
            >
              <div className="rays absolute top-1/2 left-1/2 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2" />
              <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[88px] leading-none opacity-90 drop-shadow-[4px_4px_0_rgba(0,0,0,.25)]">
                {scene.bg}
              </span>
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="twinkle absolute text-sm"
                  style={{ left: `${8 + ((i * 41) % 84)}%`, top: `${10 + ((i * 23) % 50)}%`, animationDelay: `${i * 0.18}s` }}
                >
                  ✦
                </span>
              ))}
              <div className="relative mb-2 flex items-end">
                {hasFrame(jobFrame) ? (
                  // 직업 의상 그림이 있으면 그 그림 (소품은 그림에 포함)
                  <Sprite name={jobFrame} scale={1.9} />
                ) : (
                  <>
                    <Sprite name={frameName('YOUTH', game.gender, ending.tier === 'C' ? 'stand' : 'cheer')} scale={1.7} />
                    <span className="-ml-2 mb-6 text-4xl drop-shadow-[2px_2px_0_rgba(0,0,0,.35)]">{scene.prop}</span>
                  </>
                )}
              </div>
              <span
                className={`stamp absolute top-3 right-3 rounded border-3 border-ink px-2 py-0.5 text-xl font-bold text-ink ${TIER_COLOR[ending.tier]}`}
              >
                {ending.tier}
              </span>
              <span
                className="absolute top-3 left-3 rounded border-2 border-ink px-1 text-[10px] font-bold text-white"
                style={{ background: CATEGORY_COLOR[ending.category] }}
              >
                {CATEGORY_LABEL[ending.category]}
              </span>
            </div>
            <div className="bg-[#fff6e5] p-3 text-ink">
              <p className="text-[10px] opacity-60">{ending.id}</p>
              <h2 className="text-2xl font-bold">{ending.title}</h2>
              <p className="mt-2 min-h-10 text-sm">
                <Typewriter text={`${game.childName}은(는) ${ending.epilogueText}`} />
              </p>
              {(() => {
                const dom = dominantStyle(game);
                if (!dom) return null;
                return (
                  <p className="mt-2 border-t-2 border-dashed border-ink/30 pt-1 text-[11px] opacity-80">
                    {STYLE_META[dom].emoji} {STYLE_META[dom].label} 부모님 곁에서 자랐어요 · 들어준 부탁 {game.wishesGranted ?? 0}번
                  </p>
                );
              })()}
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-1 text-[10px] text-ink">
            {STAT_KEYS.map((k) => (
              <span key={k} className="rounded border-2 border-ink bg-white px-1 py-0.5">
                <Icon name={k} size={14} /> {STAT_META[k].label} {game.stats[k]}
              </span>
            ))}
          </div>
          <p className="text-xs">
            👑 엔딩 도감 {unlockedEndings.length} / {ENDINGS.length} · 도감에 등록되었습니다
          </p>
          <PixelButton color="bg-gold" onClick={() => setStep('letter')}>
            📮 {game.childName}의 편지 읽기
          </PixelButton>
        </div>
      )}
    </div>
  );
}
