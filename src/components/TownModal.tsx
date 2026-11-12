import { useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { LOCS, LOC_MAP, NPCS, type LocId, type NpcId, type TownEnc } from '../data/townData';
import { displayStage } from '../engine/displayStage';
import { availableLocs, person, pickEncounter, relTier, townNames, townText, type TownOutcome } from '../engine/town';
import { frameName } from '../render/spriteCharacter';
import { FirstTip } from './FirstTip';
import { useGameStore } from '../store/useGameStore';
import atlas from '../render/characterAtlas.json';
import townMapUrl from '../assets/town-map.webp';
import { CatchGame, PickButtons, TimingGame } from './SpecialDayModal';
import { Sprite } from './Sprite';
import { EffectChips, PixelButton, short } from './ui';

/** 장소 배경 일러스트 (src/assets/town/{장소}.webp) */
const PLACE_BG: Partial<Record<LocId, string>> = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/town/*.webp', { eager: true, import: 'default' }) as Record<string, string>).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]),
);

/** 동네 사람 도트 그림 (src/assets/people/{NPC}-{STAGE}-{SON|DAUGHTER}.webp) */
const PEOPLE_ART: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/people/*.webp', { eager: true, import: 'default' }) as Record<string, string>).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]),
);
/** 단짝·라이벌은 아이와 같은 성별·같은 나이대 */
export function npcArt(id: NpcId, stage: string, gender: 'SON' | 'DAUGHTER'): string | undefined {
  return PEOPLE_ART[`${id}-${stage}-${gender}`] ?? PEOPLE_ART[`${id}-${gender}`] ?? PEOPLE_ART[`${id}-ADULT`];
}
/** 어른(선생님·할머니·대학생 선배)은 아이 나이와 상관없이 어른 키 (청년 아이 키 기준) */
const ADULT_H: Partial<Record<NpcId, number>> = { TEACHER: 1.02, GRANNY: 0.94, MENTOR: 1.0 };

const TIMES = [
  { label: '오전', emoji: '🌤️', tint: 'rgba(255,250,220,0)' },
  { label: '오후', emoji: '☀️', tint: 'rgba(255,200,120,.12)' },
  { label: '저녁', emoji: '🌇', tint: 'rgba(255,120,80,.22)' },
];

type Log = { time: number; loc: LocId; title: string; reply: string; out: TownOutcome };

/** 🗺️ 주말 나들이: 오전·오후·저녁 세 번 장소를 골라 동네를 돌아다닌다 */
export function TownModal({ onClose }: { onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const resolve = useGameStore((s) => s.townResolve);
  const finish = useGameStore((s) => s.finishOuting);
  const [slot, setSlot] = useState(0);
  const [view, setView] = useState<'map' | 'enc' | 'res' | 'end'>('map');
  const [enc, setEnc] = useState<{ e: TownEnc; loc: LocId } | null>(null);
  const [out, setOut] = useState<TownOutcome | null>(null);
  const [log, setLog] = useState<Log[]>([]);
  const vars = useMemo(() => townNames(game), [game]);
  const T = (t: string) => townText(t, vars);
  const stage = displayStage(game);
  const adultH = ((atlas as Record<string, { h: number }>)[frameName('YOUTH', game.gender, 'stand')]?.h ?? 84) * 2;
  const childH = ((atlas as Record<string, { h: number }>)[frameName(stage, game.gender, 'stand')]?.h ?? 60) * 2;
  const open = availableLocs(game).map((l) => l.id);
  const visited = log.map((l) => l.loc);
  const time = TIMES[Math.min(slot, 2)];

  const go = (loc: LocId) => {
    sfx('door');
    setEnc({ e: pickEncounter(game, loc), loc });
    setView('enc');
  };
  const done = (pick: number) => {
    if (!enc) return;
    const r = resolve(enc.e.id, pick);
    if (!r) return;
    sfx(r.rel?.tierUp || r.rel?.perk ? 'great' : 'happy');
    setOut(r);
    setLog((l) => [...l, { time: slot, loc: enc.loc, title: T(enc.e.title), reply: r.reply, out: r }]);
    setView('res');
  };
  const next = () => {
    if (slot >= 2) {
      setView('end');
      return;
    }
    setSlot(slot + 1);
    setEnc(null);
    setOut(null);
    setView('map');
  };
  const goHome = () => {
    finish();
    onClose();
  };

  const loc = enc ? LOC_MAP[enc.loc] : null;
  const npc = enc?.e.npc ? NPCS[enc.e.npc] : null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-3">
      <div className="pop-in w-full overflow-hidden rounded-md border-3 border-ink text-sm shadow-[0_6px_0_rgba(0,0,0,.35)]">
        {/* 머리줄: 시간 */}
        <div className="flex items-center justify-between bg-[#3b2414] px-3 py-1.5 text-white">
          <span className="text-sm font-bold">🗺️ 주말 나들이</span>
          <span className="flex gap-1">
            {TIMES.map((t, i) => (
              <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${i === slot && view !== 'end' ? 'bg-gold text-ink' : i < slot || view === 'end' ? 'bg-white/20 text-white/60 line-through' : 'bg-white/10 text-white/70'}`}>
                {t.emoji} {t.label}
              </span>
            ))}
          </span>
        </div>

        {/* 지도 */}
        {view === 'map' && (
          <>
            <div className="bg-[#fffaf0] px-3 pt-2">
              <FirstTip id="town" text="한 달에 한 번, 아이와 동네를 돌아다닐 수 있어요. 오전·오후·저녁 세 곳을 고르면 동네 사람을 만나거나 작은 일이 생겨요. 자주 만날수록 사이가 깊어지고, 그 인연은 엔딩까지 이어져요." />
            </div>
            <TownMap open={open} visited={visited} onGo={go} game={game} tint={time.tint} />
            <div className="flex items-center justify-between gap-2 bg-[#fffaf0] p-3">
              <p className="text-xs font-bold">
                {time.emoji} {time.label}에는 어디로 갈까요?
              </p>
              <button className="pixel-btn bg-white px-2 py-1 text-[11px]" onClick={() => (log.length ? setView('end') : goHome())}>
                🏠 집에 갈래
              </button>
            </div>
          </>
        )}

        {/* 장소: 만남 / 놀이 */}
        {(view === 'enc' || view === 'res') && enc && loc && (
          <>
            <div className="relative h-56 overflow-hidden" style={{ background: `linear-gradient(${loc.sky[0]}, ${loc.sky[1]})` }}>
              {PLACE_BG[loc.id] ? (
                <img src={PLACE_BG[loc.id]} alt="" className="absolute inset-0 h-full w-full object-cover object-bottom" draggable={false} />
              ) : (
                loc.props.map((p, i) => (
                  <span key={i} className="sp-float absolute text-3xl opacity-80" style={{ left: `${6 + i * 36}%`, top: `${10 + (i % 2) * 12}%`, animationDelay: `${i * 0.8}s` }}>
                    {p}
                  </span>
                ))
              )}
              <div className="pointer-events-none absolute inset-0" style={{ background: time.tint }} />
              <span className="absolute top-2 left-2 rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[10px] font-bold">
                📍 {loc.name}
              </span>
              {!(view === 'enc' && enc.e.game && enc.e.game.kind !== 'pick') && (
                <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-6">
                  <Sprite name={frameName(stage, game.gender, view === 'res' && out && (out.rel?.tierUp || out.rel?.perk) ? 'cheer' : 'stand')} scale={2} />
                  {npc ? (
                    <div className={`flex flex-col items-center ${npcArt(enc.e.npc!, stage, game.gender) ? 'relative' : ''}`}>
                      {npcArt(enc.e.npc!, stage, game.gender) ? (
                        <img
                          src={npcArt(enc.e.npc!, stage, game.gender)}
                          alt=""
                          draggable={false}
                          className="drop-shadow-[0_2px_0_rgba(0,0,0,.25)]"
                          // 그림이 이미 아이 쪽(왼쪽)을 보고 있으므로 뒤집지 않음. 키는 같은 나이의 아이와 비슷하게
                          style={{ height: ADULT_H[enc.e.npc!] ? adultH * ADULT_H[enc.e.npc!]! : childH }}
                        />
                      ) : (
                        <span className="sp-bob flex h-16 w-16 items-center justify-center rounded-full border-3 border-ink bg-white text-4xl shadow-[0_3px_0_rgba(0,0,0,.3)]">{npc.emoji}</span>
                      )}
                      <span className={`rounded border-2 border-ink bg-gold px-1.5 text-[10px] font-bold whitespace-nowrap ${npcArt(enc.e.npc!, stage, game.gender) ? 'absolute -top-6' : 'mt-1'}`}>{npcLabel(enc.e.npc!, vars)}</span>
                    </div>
                  ) : (
                    <span className="sp-bob text-5xl drop-shadow-[0_3px_0_rgba(0,0,0,.3)]">{enc.e.emoji}</span>
                  )}
                </div>
              )}
              {view === 'enc' && enc.e.game?.kind === 'catch' && <CatchGame st={{ ...enc.e.game, prompt: T(enc.e.game.prompt) }} onDone={(_, tier) => done(tier)} />}
              {view === 'enc' && enc.e.game?.kind === 'timing' && <TimingGame st={enc.e.game} onDone={(tier) => done(tier)} />}
            </div>
            <div className="flex min-h-[200px] flex-col justify-center bg-[#fffaf0] p-3">
              {view === 'enc' && (
                <>
                  <p className="mb-1 text-center text-base font-bold">
                    {enc.e.emoji} {T(enc.e.title)}
                  </p>
                  <p className="mb-3 text-center text-xs leading-relaxed">{T(enc.e.text)}</p>
                  {enc.e.choices && (
                    <div className="grid gap-1.5">
                      {enc.e.choices.map((c, i) => (
                        <button key={i} className="pixel-btn bg-white px-2 py-2 text-left text-xs disabled:opacity-45" disabled={short(c.fx, game.gold)} onClick={() => done(i)}>
                          {T(c.label)}
                          {short(c.fx, game.gold) && <span className="ml-1 font-bold text-[#e5484d]">(돈 부족)</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {enc.e.game?.kind === 'pick' && <PickButtons st={{ ...enc.e.game, prompt: T(enc.e.game.prompt) }} name={game.childName} onDone={done} />}
                  {enc.e.game && enc.e.game.kind !== 'pick' && <p className="text-center text-sm font-bold">{T(enc.e.game.prompt)}</p>}
                </>
              )}
              {view === 'res' && out && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-center text-xs leading-relaxed">{out.reply}</p>
                  <EffectChips fx={out.delta} />
                  {out.rel && <RelLine o={out} vars={vars} />}
                  <PixelButton className="w-full" onClick={next}>
                    {slot >= 2 ? '🏠 오늘 하루 마무리' : `다음 장소로 (${TIMES[slot + 1].label})`}
                  </PixelButton>
                </div>
              )}
            </div>
          </>
        )}

        {/* 하루 요약 */}
        {view === 'end' && (
          <div className="bg-[#fffaf0] p-3">
            <p className="mb-2 text-center text-base font-bold">🌙 오늘의 나들이</p>
            <div className="mb-3 grid gap-1.5">
              {log.map((l, i) => (
                <div key={i} className="rounded border-2 border-ink bg-white p-2 text-[11px]">
                  <p className="font-bold">
                    {TIMES[l.time].emoji} {TIMES[l.time].label} · {LOC_MAP[l.loc].emoji} {LOC_MAP[l.loc].name} — {l.title}
                  </p>
                  <p className="opacity-80">{l.reply}</p>
                </div>
              ))}
            </div>
            <PixelButton className="w-full" onClick={goHome}>
              집으로 돌아가기
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}

function npcLabel(id: NpcId, vars: Record<string, string>) {
  if (id === 'FRIEND') return vars.friend;
  if (id === 'RIVAL') return vars.rival;
  if (id === 'TEACHER') return `${vars.teacher} 선생님`;
  if (id === 'GRANNY') return '빵집 할머니';
  return `${vars.mentor} 선배`;
}

function RelLine({ o, vars }: { o: TownOutcome; vars: Record<string, string> }) {
  const r = o.rel!;
  const n = NPCS[r.npc];
  if (r.perk)
    return (
      <p className="pop-in rounded-lg border-2 border-ink bg-gold px-2 py-1 text-center text-[11px] font-bold">
        🎁 인연 보상 · {npcLabel(r.npc, vars)} — {r.perk}
      </p>
    );
  return (
    <div className="w-full">
      <div className="mb-0.5 flex justify-between text-[11px] font-bold">
        <span>
          {n.emoji} {npcLabel(r.npc, vars)} · {n.tiers[relTier(r.after)]}
          {r.tierUp && <span className="ml-1 text-accent">▲ 사이가 가까워졌어요!</span>}
        </span>
        <span className="text-[#e5484d]">💗 +{r.after - r.before}</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded border-2 border-ink bg-white">
        <div className="absolute inset-y-0 left-0 bg-[#ff8fb1] transition-all duration-700" style={{ width: `${r.after}%` }} />
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-ink/30" />
      </div>
    </div>
  );
}

/** 동네 지도: 그림 위 건물을 누르면 그곳으로. 아직 못 가는 곳은 어둡게 잠금 */
function TownMap({ open, visited, onGo, game, tint }: { open: LocId[]; visited: LocId[]; onGo: (l: LocId) => void; game: Parameters<typeof person>[0]; tint: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#8cc56f]">
      <img src={townMapUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="pointer-events-none absolute inset-0" style={{ background: tint }} />
      {LOCS.map((l) => {
        const ok = open.includes(l.id);
        const been = visited.includes(l.id);
        const people = (Object.keys(NPCS) as NpcId[]).filter((id) => NPCS[id].homes.includes(l.id) && person(game, id).met);
        return (
          <button
            key={l.id}
            disabled={!ok || been}
            onClick={() => onGo(l.id)}
            className="group absolute flex h-[24%] w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-end disabled:cursor-not-allowed"
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
          >
            {/* 잠긴 곳·다녀온 곳은 건물을 어둡게 */}
            {(!ok || been) && <span className={`absolute inset-[6%] rounded-xl ${ok ? 'bg-white/35' : 'bg-[#1d1a2a]/55'}`} />}
            {ok && !been && <span className="absolute inset-[4%] rounded-xl border-2 border-dashed border-white/0 transition group-hover:border-white/90 group-active:bg-white/20" />}
            {ok && people.length > 0 && (
              <span className="absolute top-0 right-0 flex rounded-full border-2 border-ink bg-white px-0.5 text-xs leading-tight">
                {people.map((id) => (
                  <span key={id}>{NPCS[id].emoji}</span>
                ))}
              </span>
            )}
            {!ok && <span className="absolute top-[26%] text-xl drop-shadow-[0_2px_0_rgba(0,0,0,.5)]">🔒</span>}
            <span
              className={`relative mb-[-6%] rounded-md border-2 border-ink px-1.5 py-px text-[10px] font-bold whitespace-nowrap shadow-[0_2px_0_rgba(0,0,0,.35)] ${
                ok ? (been ? 'bg-[#d9d2c4] text-ink/60' : 'sp-bob bg-white text-ink') : 'bg-[#3a3550] text-white/80'
              }`}
              style={ok && !been ? { animationDelay: `${(l.x + l.y) / 60}s` } : undefined}
            >
              {been ? '✅ ' : ok ? `${l.emoji} ` : ''}
              {ok ? l.name : `${l.minAge}세부터`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
