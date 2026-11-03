import { useState } from 'react';
import { Sprite } from './Sprite';
import { useGameStore } from '../store/useGameStore';
import type { Gender, StatKey } from '../types/game';
import { ENDINGS } from '../data/endingData';
import { PixelButton, STAT_META } from './ui';
import { Icon } from './Icon';
import { EncyclopediaPanel } from './panels/EncyclopediaPanel';
import { TEMPERAMENTS, type TemperamentId } from '../data/temperamentData';

const WISHES: { stat: StatKey; text: string }[] = [
  { stat: 'INT', text: '똑똑한 아이로' },
  { stat: 'STR', text: '튼튼한 아이로' },
  { stat: 'ART', text: '감성 풍부한 아이로' },
  { stat: 'CHA', text: '사랑스러운 아이로' },
  { stat: 'MOR', text: '착한 아이로' },
  { stat: 'TEC', text: '손재주 좋은 아이로' },
];

export function TitleScreen({ onStart }: { onStart: () => void }) {
  const { game, newGame, unlockedEndings, carryIdea, playthrough } = useGameStore();
  const [mode, setMode] = useState<'menu' | 'create' | 'book'>('menu');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('DAUGHTER');
  const [bonus, setBonus] = useState<StatKey>('INT');
  const [temper, setTemper] = useState<TemperamentId | 'RANDOM'>('RANDOM');
  // 엔딩을 한 번이라도 본 뒤부터 기질을 직접 고를 수 있다
  const canPickTemper = unlockedEndings.length > 0;

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
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#2b2f5c] to-[#4a3b6b] p-6 text-center">
      <div>
        <div className="flex items-end justify-center gap-1">
          <Sprite name="CHILD_SON_cheer" />
          <Sprite name="TEEN_DAUGHTER_stand" />
          <Sprite name="YOUTH_SON_stand" />
          <Sprite name="CHILD_DAUGHTER_cheer" />
        </div>
        <h1 className="mt-3 text-3xl font-bold text-gold drop-shadow-[3px_3px_0_#000]">도트 드림 메이커</h1>
        <p className="mt-1 text-xs text-white/80">Dot Dream Maker</p>
      </div>

      {mode === 'menu' && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          {game && (
            <PixelButton color="bg-mint" onClick={onStart}>
              ▶ 이어하기 ({game.childName}, {game.age}세 {game.month}월)
            </PixelButton>
          )}
          <PixelButton onClick={() => setMode('create')}>
            ✦ 새로 키우기 {playthrough > 1 && `(${playthrough}회차)`}
          </PixelButton>
          <PixelButton color="bg-sky" onClick={() => setMode('book')}>
            👑 엔딩 도감 ({unlockedEndings.length}/{ENDINGS.length})
          </PixelButton>
          <p className="mt-2 text-[10px] text-white/60">v0.10.0 · 성장 컷신과 학교 생활</p>
        </div>
      )}

      {mode === 'create' && (
        <div className="pixel-box w-full max-w-xs p-4 text-left text-sm">
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
            <PixelButton color="bg-white" onClick={() => setMode('menu')}>취소</PixelButton>
            <PixelButton
              className="flex-1"
              color="bg-mint"
              disabled={!name.trim()}
              onClick={() => {
                newGame(name.trim(), gender, bonus, canPickTemper ? temper : 'RANDOM');
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
