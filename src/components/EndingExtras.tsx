import { photoScene } from '../render/eventScenes';
import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import type { EndingDefinition } from '../types/game';
import type { Photo, SaveState } from '../engine/simulation';
import { growthStage } from '../engine/room';
import { RELATION_META, relationEnding, type Relation } from '../engine/psyche';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { Sprite } from './Sprite';
import { PixelButton } from './ui';

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
  const [i, setI] = useState(0);
  const st = stages[i];
  const p = pickPage(game.photos ?? [], st);
  const style = PAGE_STYLE[st];
  return (
    <div className="pop-in flex w-full flex-1 flex-col items-center justify-center gap-3" key={i}>
      <p className="text-xs text-gold">📔 12년 동안 몰래 써 온 일기 ({i + 1}/3)</p>
      <div className={`w-full rounded-sm border-3 border-ink p-3 text-left shadow-[6px_6px_0_rgba(0,0,0,.35)] ${style.paper}`} style={{ transform: `rotate(${style.tilt}deg)` }}>
        <p className="mb-1 flex justify-between text-[11px] font-bold text-ink/60">
          <span>
            {style.deco} {p ? `${p.age}살` : ''} {style.title}
          </span>
          <span>{p ? `${p.month}월` : ''}</span>
        </p>
        {p && photoScene(p.title, game.gender) ? (
          <img src={photoScene(p.title, game.gender)} alt="" className="mb-2 aspect-video w-full border-2 border-ink object-cover" />
        ) : (
          <div className="room-bg mb-2 flex h-28 items-end justify-center border-2 border-ink">
            {p && <span className="mr-1 mb-8 text-3xl">{p.emoji}</span>}
            <Sprite name={frameName(st, game.gender, p?.pose ?? 'stand')} scale={1.2} />
          </div>
        )}
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
      </div>
      <PixelButton
        className="w-full"
        color="bg-gold"
        onClick={() => {
          sfx('page');
          if (i < 2) setI(i + 1);
          else onDone();
        }}
      >
        {i < 2 ? '다음 장 ▶' : '🎉 진로 발표!'}
      </PixelButton>
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
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= msgs.length) return;
    const t = setTimeout(() => {
      setShown((n) => n + 1);
      sfx(msgs[shown].from === 'sys' ? 'sad' : 'click');
    }, shown === 0 ? 700 : 1300);
    return () => clearTimeout(t);
  }, [shown, msgs]);
  const jobFrame = `JOB_${ending.id}_${game.gender}`;
  const dark = rel === 'HOLLOW';

  return (
    <div className="pop-in flex w-full flex-1 flex-col items-center gap-2">
      <p className="text-xs text-gold">📱 몇 년 뒤, 휴대폰이 울렸다</p>
      <div className="flex min-h-0 w-full max-w-[300px] flex-1 flex-col overflow-hidden rounded-[28px] border-[6px] border-[#1b1f3b] bg-[#1b1f3b] shadow-[6px_6px_0_rgba(0,0,0,.35)]">
        <div className="flex items-center gap-2 bg-[#2b2f5c] px-3 py-2 text-white">
          <span className={`flex h-9 w-9 items-end justify-center overflow-hidden rounded-full border-2 border-white ${dark ? 'bg-[#4a4f63] grayscale' : 'bg-[#bfe6ff]'}`}>
            <Sprite name={hasFrame(jobFrame) ? jobFrame : frameName('YOUTH', game.gender, 'stand')} scale={0.55} />
          </span>
          <span className="text-sm font-bold">{game.childName}</span>
          <span className="ml-auto text-[10px] opacity-60">{meta.emoji}</span>
        </div>
        <div className={`flex flex-1 flex-col gap-2 overflow-y-auto p-3 ${dark ? 'bg-[#3b3f4f]' : 'bg-[#b8d4ea]'}`}>
          {msgs.slice(0, shown).map((m, k) =>
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
          {shown < msgs.length && <p className="animate-pulse text-[11px] text-white/70">입력 중...</p>}
        </div>
      </div>
      {shown >= msgs.length && (
        <>
          <p className="pop-in rounded border-2 border-ink px-2 py-0.5 text-xs font-bold text-ink" style={{ background: meta.color }}>
            {meta.emoji} 관계 결말: {meta.label}
          </p>
          <PixelButton className="w-full" color="bg-gold" onClick={onDone}>
            {rel === 'HOLLOW' ? '...' : '📮 편지 읽기'}
          </PixelButton>
        </>
      )}
    </div>
  );
}
