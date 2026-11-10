import { useState } from 'react';
import { Sprite } from './Sprite';
import { useGameStore } from '../store/useGameStore';
import type { Gender, StatKey } from '../types/game';
import { ENDINGS } from '../data/endingData';
import { PixelButton, STAT_META } from './ui';
import { Icon } from './Icon';
import { EncyclopediaPanel } from './panels/EncyclopediaPanel';
import { AchievementPanel, HallPanel } from './HallPanel';
import { ACHIEVEMENTS } from '../data/legacyData';
import { TEMPERAMENTS, type TemperamentId } from '../data/temperamentData';
import { DEFAULT_PARENT, PARENT_TOTAL, ABILITIES, type ParentProfile } from '../data/parentData';
import { ParentPicker } from './ParentPicker';
import { SettingsModal } from './SettingsModal';
import { ArtBackdrop, GameLogo } from './ArtBackdrop';
import { frameName } from '../render/spriteCharacter';
import { displayStage } from '../engine/displayStage';

const WISHES: { stat: StatKey; text: string }[] = [
  { stat: 'INT', text: '똑똑한 아이로' },
  { stat: 'STR', text: '튼튼한 아이로' },
  { stat: 'ART', text: '감성 풍부한 아이로' },
  { stat: 'CHA', text: '사랑스러운 아이로' },
  { stat: 'MOR', text: '착한 아이로' },
  { stat: 'TEC', text: '손재주 좋은 아이로' },
];

export function TitleScreen({ onStart, onOpening }: { onStart: () => void; onOpening: () => void }) {
  const { game, newGame, unlockedEndings, carryIdea, playthrough } = useGameStore();
  const [mode, setMode] = useState<'menu' | 'family' | 'create' | 'book' | 'hall' | 'ach'>('menu');
  const [settings, setSettings] = useState(false);
  const hallCount = useGameStore((s) => s.hallOfFame?.length ?? 0);
  const achCount = useGameStore((s) => s.achievements?.length ?? 0);
  const [parent, setParent] = useState<ParentProfile>(DEFAULT_PARENT);
  const parentReady = ABILITIES.reduce((a, k) => a + parent.points[k], 0) === PARENT_TOTAL;
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('DAUGHTER');
  const [bonus, setBonus] = useState<StatKey>('INT');
  const [temper, setTemper] = useState<TemperamentId | 'RANDOM'>('RANDOM');
  const [birthMonth, setBirthMonth] = useState(() => 1 + Math.floor(Math.random() * 12));
  // 엔딩을 한 번이라도 본 뒤부터 기질을 직접 고를 수 있다
  const canPickTemper = unlockedEndings.length > 0;

  if (mode === 'hall' || mode === 'ach') {
    return (
      <div className="flex h-full flex-col bg-gradient-to-b from-[#141838] to-[#2b2f5c] p-3">
        <p className="mb-2 text-center text-lg font-bold text-gold drop-shadow-[2px_2px_0_#000]">{mode === 'hall' ? '🏛️ 명예의 전당' : '🏅 업적'}</p>
        <div className="pixel-box flex-1 overflow-y-auto p-3">{mode === 'hall' ? <HallPanel /> : <AchievementPanel />}</div>
        <PixelButton className="mt-3" onClick={() => setMode('menu')}>← 돌아가기</PixelButton>
      </div>
    );
  }

  if (mode === 'book') {
    return (
      <div className="flex h-full flex-col bg-gradient-to-b from-[#141838] to-[#2b2f5c] p-3">
        <div className="pixel-box flex-1 overflow-y-auto p-3">
          <EncyclopediaPanel />
        </div>
        <PixelButton className="mt-3" onClick={() => setMode('menu')}>← 돌아가기</PixelButton>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden p-6 text-center">
      {/* 고화질 일러스트가 천천히 바뀌는 배경 */}
      <ArtBackdrop dim={mode === 'menu' ? 0.5 : 0.7} band={[4, 30]} />
      {mode === 'menu' && (
        <button
          onClick={() => setSettings(true)}
          className="menu-glass absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-base text-white"
          title="설정"
        >
          ⚙️
        </button>
      )}
      <div className={`relative ${mode === 'menu' ? 'mt-20 mb-2' : 'scale-75'}`}>
        <GameLogo size={mode === 'menu' ? 1 : 0.8} />
      </div>

      {mode === 'menu' && (
        <div className="fade-up relative z-10 flex w-full max-w-xs flex-col gap-2" style={{ animationDelay: '.5s' }}>
          {game && (
            <button
              onClick={onStart}
              className="pixel-btn flex items-center gap-3 bg-gradient-to-b from-[#ffe27a] to-[#f2b632] px-3 py-2 text-left text-ink"
            >
              <span className="flex h-12 w-12 shrink-0 items-end justify-center overflow-hidden rounded-full border-2 border-ink bg-[#fff6e0]">
                <Sprite name={frameName(displayStage(game), game.gender, 'cheer')} scale={0.7} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-base">▶ 이어하기</b>
                <span className="block truncate text-[11px] opacity-75">
                  {game.childName} · {game.age}세 {game.month}월
                </span>
              </span>
            </button>
          )}
          <div className="menu-glass overflow-hidden rounded-lg border border-white/25 text-left text-white shadow-[0_8px_24px_rgba(0,0,0,.4)]">
            {[
              { icon: '✦', label: '새로 키우기', sub: playthrough > 1 ? `${playthrough}번째 아이` : '첫 아이를 맞이해요', on: () => setMode('family') },
              { icon: '👑', label: '엔딩 도감', sub: `${unlockedEndings.length} / ${ENDINGS.length}`, on: () => setMode('book') },
              { icon: '🏛️', label: '명예의 전당', sub: `${hallCount}명의 아이`, on: () => setMode('hall') },
              { icon: '🏅', label: '업적', sub: `${achCount} / ${ACHIEVEMENTS.length}`, on: () => setMode('ach') },
            ].map((m, k) => (
              <button key={m.label} onClick={m.on} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-white/15 ${k ? 'border-t border-white/12' : ''}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/12 text-base">{m.icon}</span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{m.label}</b>
                  <span className="block text-[10px] text-white/60">{m.sub}</span>
                </span>
                <span className="text-white/50">›</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] font-bold text-white/45">v0.39.10 · 감정 다루기</p>
        </div>
      )}
      {settings && <SettingsModal onClose={() => setSettings(false)} onOpening={onOpening} />}

      {mode === 'family' && (
        <div className="pixel-box relative z-10 max-h-[72%] w-full max-w-xs overflow-y-auto p-3 text-left text-sm">
          <p className="mb-1 font-bold">🏠 우리 집은 어떤 집?</p>
          <p className="mb-2 text-[10px] opacity-70">부모의 직업을 고르거나 능력치를 직접 나눠 주세요. 주사위로 정할 수도 있어요.</p>
          <ParentPicker value={parent} onChange={setParent} />
          <div className="mt-3 flex gap-2">
            <PixelButton color="bg-white" onClick={() => setMode('menu')}>취소</PixelButton>
            <PixelButton className="flex-1" color="bg-mint" disabled={!parentReady} onClick={() => setMode('create')}>
              {parentReady ? '다음: 아이 정하기 ▶' : '포인트를 모두 나눠 주세요'}
            </PixelButton>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <div className="pixel-box relative z-10 max-h-[72%] w-full max-w-xs overflow-y-auto p-4 text-left text-sm">
          <p className="mb-2 font-bold">아이의 성별</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(['SON', 'DAUGHTER'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`pixel-btn py-3 ${gender === g ? 'bg-accent text-white' : 'bg-white'}`}
              >
                {g === 'SON' ? '👦 아들' : '👧 딸'}
              </button>
            ))}
          </div>
          <p className="mb-2 font-bold">이름</p>
          <input
            value={name}
            maxLength={8}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 지어주세요"
            className="mb-4 w-full border-3 border-ink bg-white px-2 py-2 outline-none"
          />
          <p className="mb-2 font-bold">생일</p>
          <div className="mb-4 flex items-center gap-2">
            <select
              value={birthMonth}
              onChange={(e) => setBirthMonth(Number(e.target.value))}
              className="border-3 border-ink bg-white px-2 py-1.5"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}월
                </option>
              ))}
            </select>
            <span className="text-[11px] opacity-70">🎂 매년 이 달에 생일 파티를 열어요</span>
          </div>
          <p className="mb-2 font-bold">부모의 소원 (초기 보너스)</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {WISHES.map((w) => (
              <button
                key={w.stat}
                onClick={() => setBonus(w.stat)}
                className={`pixel-btn px-1 py-2 text-xs ${bonus === w.stat ? 'bg-gold' : 'bg-white'}`}
              >
                <Icon name={w.stat} size={18} /> {w.text}
                <br />
                <span className="text-[10px] opacity-70">{STAT_META[w.stat].label} +30</span>
              </button>
            ))}
          </div>
          <p className="mb-2 font-bold">아이의 기질</p>
          {canPickTemper ? (
            <div className="mb-4 grid grid-cols-3 gap-1.5">
              {(['RANDOM', ...TEMPERAMENTS.map((t) => t.id)] as const).map((id) => {
                const t = id === 'RANDOM' ? null : TEMPERAMENTS.find((x) => x.id === id)!;
                return (
                  <button
                    key={id}
                    onClick={() => setTemper(id)}
                    title={t?.desc ?? '키우면서 알아가요'}
                    className={`pixel-btn px-1 py-1.5 text-[11px] ${temper === id ? 'bg-gold' : 'bg-white'}`}
                  >
                    {t ? `${t.emoji} ${t.label}` : '🎲 랜덤(비밀)'}
                  </button>
                );
              })}
              <p className="col-span-3 text-[10px] opacity-70">
                {temper === 'RANDOM' ? '키우면서 관찰 노트로 알아가요' : TEMPERAMENTS.find((x) => x.id === temper)!.desc}
              </p>
            </div>
          ) : (
            <p className="mb-4 rounded border-2 border-dashed border-ink/40 p-2 text-[11px] opacity-80">
              🎲 아이마다 타고난 기질이 있어요. 어떤 아이인지는 키우면서 알게 돼요.
              <br />
              <span className="opacity-70">(엔딩을 한 번 보면 다음부터 직접 고를 수 있어요)</span>
            </p>
          )}
          {carryIdea > 0 && <p className="mb-3 text-xs text-wood">💡 이전 회차에서 영감 포인트 {carryIdea} 인계!</p>}
          <div className="flex gap-2">
            <PixelButton color="bg-white" onClick={() => setMode('family')}>◀ 이전</PixelButton>
            <PixelButton
              className="flex-1"
              color="bg-mint"
              disabled={!name.trim()}
              onClick={() => {
                newGame(name.trim(), gender, bonus, canPickTemper ? temper : 'RANDOM', parent, birthMonth);
                onStart();
              }}
            >
              키우기 시작!
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}
