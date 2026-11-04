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
      <div className="flex h-full flex-col bg-[#2b2f5c] p-3">
        <p className="mb-2 text-center text-lg font-bold text-gold drop-shadow-[2px_2px_0_#000]">{mode === 'hall' ? '🏛️ 명예의 전당' : '🏅 업적'}</p>
        <div className="pixel-box flex-1 overflow-y-auto p-3">{mode === 'hall' ? <HallPanel /> : <AchievementPanel />}</div>
        <PixelButton className="mt-3" onClick={() => setMode('menu')}>← 돌아가기</PixelButton>
      </div>
    );
  }

  if (mode === 'book') {
    return (
      <div className="flex h-full flex-col bg-[#2b2f5c] p-3">
        <div className="pixel-box flex-1 overflow-y-auto p-3">
          <EncyclopediaPanel />
        </div>
        <PixelButton className="mt-3" onClick={() => setMode('menu')}>← 돌아가기</PixelButton>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden bg-gradient-to-b from-[#7ec8ff] via-[#bfe6ff] to-[#fff1d6] p-6 text-center">
      {/* 하늘 · 구름 · 언덕 */}
      <span className="cloud top-[8%] text-5xl" style={{ animationDuration: '38s' }}>☁️</span>
      <span className="cloud top-[22%] text-3xl" style={{ animationDuration: '52s', animationDelay: '-20s' }}>☁️</span>
      <span className="cloud top-[14%] text-4xl" style={{ animationDuration: '45s', animationDelay: '-33s' }}>☁️</span>
      <div className="pointer-events-none absolute inset-x-[-10%] bottom-0 h-[30%] rounded-t-[50%] bg-[#7cc96b]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[16%] bg-[#5aa84e]" />
      {mode === 'menu' && (
        <button
          onClick={() => setSettings(true)}
          className="absolute top-3 right-3 z-10 rounded border-2 border-ink bg-white px-2 py-1 text-sm shadow-[2px_2px_0_rgba(0,0,0,.35)]"
          title="설정"
        >
          ⚙️
        </button>
      )}
      <div className="relative">
        <h1 className="flex justify-center text-[34px] leading-none font-bold text-gold drop-shadow-[3px_3px_0_#1b1f3b]">
          {[...'도트 드림 메이커'].map((ch, i) => (
            <span key={i} className="logo-bounce inline-block" style={{ animationDelay: `${i * 0.08}s`, width: ch === ' ' ? 10 : undefined }}>
              {ch}
            </span>
          ))}
        </h1>
        <p className="mt-1 text-xs font-bold text-ink/70">Dot Dream Maker</p>
        <div className="mt-3 flex items-end justify-center gap-1">
          {['CHILD_SON_cheer', 'TEEN_DAUGHTER_stand', 'CAT_sit', 'YOUTH_SON_stand', 'CHILD_DAUGHTER_cheer'].map((n, i) => (
            <span key={n} className="bob inline-block" style={{ animationDelay: `${i * 0.2}s` }}>
              <Sprite name={n} />
            </span>
          ))}
        </div>
      </div>

      {mode === 'menu' && (
        <div className="relative z-10 flex w-full max-w-xs flex-col gap-2.5">
          {game && (
            <PixelButton color="bg-mint" onClick={onStart}>
              ▶ 이어하기 <span className="text-xs font-normal">({game.childName}, {game.age}세 {game.month}월)</span>
            </PixelButton>
          )}
          <PixelButton onClick={() => setMode('family')}>
            ✦ 새로 키우기 {playthrough > 1 && `(${playthrough}번째 아이)`}
          </PixelButton>
          <PixelButton color="bg-sky" onClick={() => setMode('book')}>
            👑 엔딩 도감 ({unlockedEndings.length}/{ENDINGS.length})
          </PixelButton>
          <div className="grid grid-cols-2 gap-2">
            <PixelButton color="bg-white" className="!text-xs" onClick={() => setMode('hall')}>
              🏛️ 명예의 전당 ({hallCount})
            </PixelButton>
            <PixelButton color="bg-white" className="!text-xs" onClick={() => setMode('ach')}>
              🏅 업적 ({achCount}/{ACHIEVEMENTS.length})
            </PixelButton>
          </div>
          <p className="mt-1 text-[10px] font-bold text-ink/60">v0.27.1 · 나이대 맞춤</p>
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
