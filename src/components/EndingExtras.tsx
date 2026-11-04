import { photoScene } from '../render/eventScenes';
import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import type { EndingDefinition } from '../types/game';
import type { Photo, SaveState } from '../engine/simulation';
import { growthStage } from '../engine/room';
import { ATTITUDE_META, RELATION_META, autonomy, dominantAttitude, relationEnding, selfEsteem, type Relation } from '../engine/psyche';
import { ENDING_SCENE } from '../data/endingScenes';
import { endingArt, hasDarkArt } from '../render/endingArt';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { Sprite } from './Sprite';
import { PixelButton, TIER_COLOR } from './ui';

/* ───────── ① 12년 비밀 일기 회상 (GDD 11.3) ───────── */
const SKIP = /생일|새해|우리 집에 온 날|우승|입상|1등|성적표/;
function pickPage(photos: Photo[], stage: 'CHILD' | 'TEEN' | 'YOUTH'): Photo | null {
  const list = photos.filter((p) => growthStage(Math.min(19, p.age)) === stage && !SKIP.test(p.title));
  if (!list.length) return photos.filter((p) => growthStage(Math.min(19, p.age)) === stage).slice(-1)[0] ?? null;
  return list[Math.floor(list.length / 2)];
}

const PAGE_STYLE = {
  CHILD: { title: '그림일기', paper: 'bg-[#fffbe6]', ink: 'text-[#d9480f]', deco: '🖍️', font: 'text-[15px] leading-7', tilt: -2 },
  TEEN: { title: '비밀 노트 🔒', paper: 'bg-[#e9ecf5]', ink: 'text-[#2b2f5c]', deco: '✒️', font: 'text-[13px] leading-6', tilt: 1.5 },
  YOUTH: { title: '진로 노트', paper: 'bg-[repeating-linear-gradient(#fff_0_19px,#d7e3f4_19px_20px)]', ink: 'text-[#1b1f3b]', deco: '📌', font: 'text-[12px] leading-5', tilt: -1 },
};

export function DiaryRecap({ game, onDone }: { game: SaveState; onDone: () => void }) {
  const stages: ('CHILD' | 'TEEN' | 'YOUTH')[] = ['CHILD', 'TEEN', 'YOUTH'];
  const pages = stages.map((st) => ({ st, p: pickPage(game.photos ?? [], st) }));
  const [shown, setShown] = useState(0); // 폴라로이드가 한 장씩 놓인다
  const [zoom, setZoom] = useState<number | null>(null);
  useEffect(() => {
    if (shown >= 3) return;
    const t = setTimeout(() => {
      setShown((n) => n + 1);
      sfx('page');
    }, shown === 0 ? 400 : 650);
    return () => clearTimeout(t);
  }, [shown]);
  const dom = dominantAttitude(game);
  const LABEL = { CHILD: '크레파스 그림일기', TEEN: '비밀 노트', YOUTH: '진로 노트' };
  const TILT = [-3, 2.5, -2];

  const pic = (st: 'CHILD' | 'TEEN' | 'YOUTH', p: Photo | null, cls: string) => {
    const img = p ? photoScene(p.title, game.gender, p.age) : undefined;
    return img ? (
      <img src={img} alt="" className={`w-full object-cover ${cls}`} />
    ) : (
      <div className={`room-bg flex w-full items-end justify-center ${cls}`}>
        {p && <span className="mr-1 mb-6 text-2xl">{p.emoji}</span>}
        <Sprite name={frameName(st, game.gender, p?.pose ?? 'stand')} scale={1} />
      </div>
    );
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2">
      <div className="text-center">
        <p className="text-base font-bold text-gold drop-shadow-[2px_2px_0_#000]">📔 12년 비밀 일기 회상</p>
        <p className="text-[11px] opacity-70">19세 성인식 날, 책상 서랍 속에서 찾은 세 권의 기록</p>
      </div>
      {/* 폴라로이드 3장 */}
      <div className="flex min-h-0 w-full flex-1 flex-col justify-center">
        {pages.map(({ st, p }, i) => {
          const age = p?.age ?? (st === 'CHILD' ? 9 : st === 'TEEN' ? 14 : 18);
          return (
            <button
              key={st}
              onClick={() => {
                sfx('click');
                setZoom(i);
              }}
              className={`relative w-[86%] bg-white p-1.5 pb-1 text-left shadow-[4px_5px_0_rgba(0,0,0,.4)] transition-all duration-500 ${i % 2 ? 'self-end' : 'self-start'} ${i ? 'mt-2.5' : ''}`}
              style={{ transform: `rotate(${TILT[i]}deg) translateY(${i < shown ? 0 : 40}px)`, opacity: i < shown ? 1 : 0 }}
            >
              <span className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-4deg] bg-[#ffe9a8]/80" />
              {pic(st, p, 'aspect-[16/6.5] border border-ink/30')}
              <p className="mt-1 flex items-baseline justify-between text-[11px] font-bold text-ink">
                <span>
                  {age}세 · {LABEL[st]}
                </span>
                <span className="text-[9px] opacity-50">눌러서 펼치기</span>
              </p>
              <p className="truncate text-[10px] text-ink/70">{p ? `「${p.title}」 ${p.caption}` : '이 시절 일기장은 비어 있다...'}</p>
            </button>
          );
        })}
      </div>
      {/* 양육 요약 */}
      <div className="w-full rounded border-2 border-ink bg-[#fff6e5] px-2 py-1 text-center text-[11px] text-ink" style={{ opacity: shown >= 3 ? 1 : 0, transition: 'opacity .5s' }}>
        <b>양육 태도:</b> {dom ? `${ATTITUDE_META[dom].emoji} ${ATTITUDE_META[dom].label}` : '🌈 골고루 (뚜렷한 태도 없음)'}
        <br />
        🌟 자존감 {selfEsteem(game)} · ❤️ 친밀도 {game.status.affection} · 🧭 자율성 {autonomy(game)}
      </div>
      <PixelButton
        className="w-full"
        color="bg-gold"
        onClick={() => {
          sfx('page');
          onDone();
        }}
      >
        🎉 진로 발표 보기
      </PixelButton>

      {/* 펼쳐 보기 */}
      {zoom !== null && (() => {
        const { st, p } = pages[zoom];
        const style = PAGE_STYLE[st];
        return (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setZoom(null)}>
            <div className={`pop-in w-full rounded-sm border-3 border-ink p-3 text-left shadow-[6px_6px_0_rgba(0,0,0,.35)] ${style.paper}`} style={{ transform: `rotate(${style.tilt}deg)` }}>
              <p className="mb-1 flex justify-between text-[11px] font-bold text-ink/60">
                <span>
                  {style.deco} {p ? `${p.age}살` : ''} {style.title}
                </span>
                <span>{p ? `${p.month}월` : ''}</span>
              </p>
              {pic(st, p, 'mb-2 aspect-video border-2 border-ink')}
              <p className={`font-bold ${style.ink} ${style.font}`}>
                {p ? (
                  <>
                    오늘은 「{p.title}」.
                    <br />
                    {p.caption}
                  </>
                ) : (
                  '이 시절 일기장은 비어 있다...'
                )}
              </p>
              <p className="mt-2 text-center text-[10px] text-ink/50">화면을 누르면 닫혀요</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ───────── ② 스마트폰 메시지 관계 엔딩 (GDD 11.3) ───────── */
function messages(r: Relation, job: string, name: string): { from: 'kid' | 'sys' | 'me'; text: string }[] {
  switch (r) {
    case 'HEALTHY':
      return [
        { from: 'kid', text: '엄마 아빠!! 나 첫 월급 탔어요 💸' },
        { from: 'kid', text: `${job}, 생각보다 힘들지만 진짜 재밌어요.` },
        { from: 'kid', text: '믿어 주셔서 감사해요. 이번 주말에 본가 갈게요! 맛있는 거 사 갈게 ❤️' },
        { from: 'me', text: '우리 딸/아들 최고! 조심히 와 💕' },
      ];
    case 'HOLLOW':
      return [
        { from: 'kid', text: `원하시던 대로 ${job} 됐잖아요.` },
        { from: 'kid', text: '이제 제발 연락하지 마세요.' },
        { from: 'sys', text: `[${name}님이 대화방을 나갔습니다]` },
      ];
    case 'DEPENDENT':
      return [
        { from: 'kid', text: '엄마... 회사 사람들이 나만 미워하는 것 같아 😢' },
        { from: 'kid', text: `${job} 일, 나 혼자서는 못 하겠어.` },
        { from: 'kid', text: '내일 엄마가 대신 전화해 주면 안 돼? 응? 아빠가 해 줘도 돼...' },
      ];
    default:
      return [
        { from: 'kid', text: '엄마 아빠 잘 지내? 요즘 너무 바빠서 연락 못 했네 😅' },
        { from: 'kid', text: `${job} 일 겨우 적응했어. 다음 달엔 꼭 갈게!` },
        { from: 'me', text: '밥 잘 챙겨 먹고! 기다릴게 🍚' },
      ];
  }
}

export function PhoneEnding({ game, ending, onDone }: { game: SaveState; ending: EndingDefinition; onDone: () => void }) {
  const rel = relationEnding(game);
  const meta = RELATION_META[rel];
  const job = ending.id === 'END_50' ? '백수 생활' : ending.title.replace(/ \(.*\)$/, '');
  const msgs = messages(rel, job, game.childName).map((m) => (m.from === 'me' ? { ...m, text: m.text.replace('딸/아들', game.gender === 'SON' ? '아들' : '딸') } : m));
  // 첫 메시지는 아이가 보낸 사진 (지금 모습)
  const total = msgs.length + 1;
  const [shown, setShown] = useState(0);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (shown >= total) return;
    const t = setTimeout(() => {
      setShown((n) => n + 1);
      const m = shown === 0 ? null : msgs[shown - 1];
      sfx(m?.from === 'sys' ? 'sad' : 'click');
    }, shown === 0 ? 700 : 1300);
    return () => clearTimeout(t);
  }, [shown, total, msgs, round]);
  const jobFrame = `JOB_${ending.id}_${game.gender}`;
  const dark = rel === 'HOLLOW';
  const sad = rel === 'HOLLOW' || rel === 'DEPENDENT';
  const art = endingArt(ending.id, game.gender, sad ? 'DARK' : 'BRIGHT');
  // 어두운 그림이 따로 없으면 밝은 그림·도트 장면에 어두운 필터
  const dim = sad && !(art && hasDarkArt(ending.id, game.gender));
  const scene = ENDING_SCENE[ending.id] ?? { bg: '🏠', prop: '✨', sky: ['#bfe9ff', '#ffffff'] as [string, string] };

  const photo = (
    <div className="relative w-[82%] overflow-hidden rounded-xl border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,.35)]">
      {art ? (
        <img src={art} alt="" className="aspect-[4/3] w-full object-cover" style={dim ? { filter: rel === 'HOLLOW' ? 'grayscale(.7) brightness(.6) contrast(1.1)' : 'saturate(.6) brightness(.85) hue-rotate(-10deg)' } : undefined} />
      ) : (
        <div className="relative flex aspect-[4/3] w-full items-end justify-center overflow-hidden" style={{ background: `linear-gradient(${scene.sky[0]}, ${scene.sky[1]})` }}>
          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-6xl opacity-70">{scene.bg}</span>
          <div className="relative mb-1">
            <Sprite name={hasFrame(jobFrame) ? jobFrame : frameName('YOUTH', game.gender, sad ? 'tired' : 'cheer')} scale={1.5} />
          </div>
          {dim && <div className="absolute inset-0" style={{ background: rel === 'HOLLOW' ? 'rgba(15,15,35,.62)' : 'rgba(40,60,110,.3)' }} />}
        </div>
      )}
      {rel === 'HOLLOW' && <span className="absolute right-1 bottom-1 rounded bg-black/50 px-1 text-[9px] text-white/80">새벽 3시, 퇴근길</span>}
    </div>
  );

  return (
    <div className="pop-in flex min-h-0 w-full flex-1 flex-col items-center gap-2">
      <p className="text-xs text-gold">📱 몇 년 뒤, 휴대폰이 울렸다</p>
      {/* 엔딩 제목 */}
      <div className="w-full max-w-[300px] rounded border-2 border-ink bg-[#fff6e5] px-2 py-1 text-center text-ink">
        <p className="text-sm font-bold">
          <span className={`mr-1 rounded border border-ink px-1 text-[11px] ${TIER_COLOR[ending.tier]}`}>{ending.tier}급</span>
          {job}
        </p>
        <p className="text-[10px] font-bold" style={{ color: dark ? '#5a5f73' : '#1b1f3b' }}>
          {meta.emoji} {meta.label} · ❤️ 친밀도 {game.status.affection} · 🌟 자존감 {selfEsteem(game)}
        </p>
      </div>
      <div className="flex min-h-0 w-full max-w-[300px] flex-1 flex-col overflow-hidden rounded-[28px] border-[6px] border-[#1b1f3b] bg-[#1b1f3b] shadow-[6px_6px_0_rgba(0,0,0,.35)]">
        <div className="flex items-center gap-2 bg-[#2b2f5c] px-3 py-2 text-white">
          <span className={`flex h-9 w-9 items-end justify-center overflow-hidden rounded-full border-2 border-white ${dark ? 'bg-[#4a4f63] grayscale' : 'bg-[#bfe6ff]'}`}>
            <Sprite name={hasFrame(jobFrame) ? jobFrame : frameName('YOUTH', game.gender, 'stand')} scale={0.55} />
          </span>
          <span className="text-sm font-bold">{game.childName}</span>
          <span className="ml-auto text-[10px] opacity-60">{meta.emoji}</span>
        </div>
        <div key={round} className={`flex flex-1 flex-col gap-2 overflow-y-auto p-3 ${dark ? 'bg-[#3b3f4f]' : 'bg-[#b8d4ea]'}`}>
          {shown >= 1 && <div className="pop-in flex justify-start">{photo}</div>}
          {msgs.slice(0, Math.max(0, shown - 1)).map((m, k) =>
            m.from === 'sys' ? (
              <p key={k} className="pop-in mx-auto rounded-full bg-black/30 px-3 py-1 text-[11px] text-white">
                {m.text}
              </p>
            ) : (
              <div key={k} className={`pop-in flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <span className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-[12px] leading-snug text-ink ${m.from === 'me' ? 'bg-[#ffe95b]' : 'bg-white'}`}>{m.text}</span>
              </div>
            ),
          )}
          {shown < total && <p className="animate-pulse text-[11px] text-white/70">입력 중...</p>}
        </div>
      </div>
      {shown >= total && (
        <div className="pop-in flex w-full gap-2">
          <PixelButton
            className="flex-1"
            color="bg-white"
            onClick={() => {
              setShown(0);
              setRound((r) => r + 1);
            }}
          >
            ↺ 다시 보기
          </PixelButton>
          <PixelButton className="flex-[2]" color="bg-gold" onClick={onDone}>
            {rel === 'HOLLOW' ? '... 다음 ▶' : '📮 편지 읽기 ▶'}
          </PixelButton>
        </div>
      )}
    </div>
  );
}
