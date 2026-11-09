import { useGameStore } from '../../store/useGameStore';
import { Sprite } from '../Sprite';
import { frameName } from '../../render/spriteCharacter';
import { APT_KEYS, STAT_KEYS } from '../../engine/simulation';
import { NPCS, type NpcId } from '../../data/townData';
import { person, relTier, townNames } from '../../engine/town';
import { displayStage } from '../../engine/displayStage';
import { APT_META, Bar, STAT_META } from '../ui';
import { Icon } from '../Icon';
import { STYLE_META, type ParentStyle } from '../../data/parentingData';
import { dominantStyle } from '../../engine/parenting';
import { CLUES_TO_REVEAL, TEMPERAMENT_MAP } from '../../data/temperamentData';
import { PhotoAlbum } from '../PhotoAlbum';
import { DiaryPage } from '../DiaryModal';
import { ENDING_MAP } from '../../data/endingData';
import { ATTITUDE_META, achieveRatio, autonomy, dominantAttitude, isColdRoom, selfEsteem, type Attitude } from '../../engine/psyche';
import { ABILITIES, ABILITY_META, describeParent } from '../../data/parentData';
import { useState } from 'react';

const STAGE_LABEL = { CHILD: '유년기', TEEN: '청소년기', YOUTH: '청년 준비기' };

/** 6대 스탯 육각형 레이더 차트 (SVG) */
function Radar({ values }: { values: number[] }) {
  const size = 180;
  const c = size / 2;
  const r = 70;
  const pt = (i: number, v: number) => {
    const ang = -Math.PI / 2 + (i * Math.PI * 2) / 6;
    return [c + Math.cos(ang) * r * v, c + Math.sin(ang) * r * v];
  };
  const poly = (v: number[]) => v.map((x, i) => pt(i, x).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-48">
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={poly(Array(6).fill(s))} fill="none" stroke="#1b1f3b" strokeOpacity={0.25} strokeWidth={1} />
      ))}
      <polygon points={poly(values.map((v) => v / 999))} fill="#ff7a59" fillOpacity={0.45} stroke="#ff7a59" strokeWidth={2} />
      {STAT_KEYS.map((k, i) => {
        const [x, y] = pt(i, 1.2);
        return (
          <text key={k} x={x} y={y} fontSize={10} textAnchor="middle" dominantBaseline="middle" fill="#1b1f3b">
            {STAT_META[k].label}
          </text>
        );
      })}
    </svg>
  );
}

export function InfoPanel() {
  const game = useGameStore((s) => s.game)!;
  const [allPhotos, setAllPhotos] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const diaries = game.diaryRead ?? [];
  const temper = game.temperament ? TEMPERAMENT_MAP[game.temperament] : null;
  const photos = game.photos ?? [];
  const { stats, status, aptitudes } = game;
  return (
    <div className="text-xs">
      <p className="mb-2 text-sm font-bold">
        {game.childName} · {game.age}세 ({STAGE_LABEL[displayStage(game)]})
      </p>
      <div className="flex items-center justify-center gap-2">
        <Sprite name={frameName(displayStage(game), game.gender, 'stand')} />
        <Radar values={STAT_KEYS.map((k) => stats[k])} />
      </div>
      <div className="mb-3 grid grid-cols-1 gap-1">
        {STAT_KEYS.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="flex w-16 shrink-0 items-center gap-1"><Icon name={k} size={16} />{STAT_META[k].label}</span>
            <Bar value={stats[k]} max={999} color={STAT_META[k].color} />
            <span className="w-8 shrink-0 text-right">{stats[k]}</span>
          </div>
        ))}
      </div>
      <p className="mb-1 font-bold">상태</p>
      <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1">
        <span className="flex items-center gap-1"><Icon name="STRESS" size={14} /> 스트레스 {status.stress}/100</span>
        <span>❤️ 친밀도 {status.affection}/100</span>
        <span className="flex items-center gap-1"><Icon name="FAME" size={14} /> 명성 {status.fame}/500</span>
        <span>😈 비행 {status.delinquency}/100</span>
      </div>
      {game.dreamJob && ENDING_MAP[game.dreamJob] && (
        <div className="mb-3 rounded border-3 border-ink bg-[#fff1c2] p-2">
          <p className="font-bold">
            🌟 {game.childName}의 꿈: {ENDING_MAP[game.dreamJob].title}
          </p>
          <p className="mt-0.5 text-[10px] opacity-80">이루려면: {ENDING_MAP[game.dreamJob].conditionText}</p>
          <p className="text-[10px] text-accent">아이의 꿈을 엔딩으로 이뤄 주면 특별한 편지를 받아요</p>
        </div>
      )}
      <PeopleBox />
      {temper && (
        <>
          <p className="mb-1 font-bold">아이의 기질</p>
          <div className="mb-3 rounded border-2 border-ink bg-white p-2">
            {game.temperRevealed ? (
              <>
                <p className="text-sm font-bold">
                  {temper.emoji} {temper.label} 아이 <span className="text-[10px] font-normal opacity-70">— {temper.desc}</span>
                </p>
                <p className="mt-1 text-[10px] text-wood">💡 {temper.tip}</p>
              </>
            ) : (
              <p className="font-bold">
                ❓ 아직 어떤 아이인지 잘 모르겠어요{' '}
                <span className="text-[10px] font-normal opacity-70">
                  (관찰 단서 {game.clues?.length ?? 0}/{CLUES_TO_REVEAL})
                </span>
              </p>
            )}
            {(game.clues?.length ?? 0) > 0 && (
              <ul className="mt-1 list-none text-[10px] opacity-80">
                {[...new Set(game.clues)].map((c) => (
                  <li key={c}>🔍 {c}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      <p className="mb-1 font-bold">마음 상태</p>
      {(() => {
        const dom = dominantAttitude(game);
        const at = game.attitudes ?? { TIGER: 0, HELICOPTER: 0, NEGLECT: 0, COACHING: 0 };
        const ratio = Math.round(achieveRatio(game) * 100);
        return (
          <div className="mb-3 rounded border-2 border-ink bg-white p-2">
            {[
              ['🌟 자존감', selfEsteem(game), '#ffcc4d'],
              ['🧭 자율성', autonomy(game), '#6ec3f4'],
            ].map(([l, v, c]) => (
              <div key={l as string} className="mb-1 flex items-center gap-2">
                <span className="w-16 shrink-0">{l}</span>
                <Bar value={v as number} max={100} color={c as string} />
                <span className="w-8 shrink-0 text-right">{v}</span>
              </div>
            ))}
            <p className="mt-1">
              {dom ? (
                <>
                  {ATTITUDE_META[dom].emoji} 양육 태도: <b>{ATTITUDE_META[dom].label}</b>
                  <span className="block text-[10px] opacity-70">
                    {ATTITUDE_META[dom].desc} · 효과: {ATTITUDE_META[dom].short} · 오래가면: {ATTITUDE_META[dom].long}
                  </span>
                </>
              ) : (
                <span className="opacity-70">양육 태도가 아직 뚜렷하지 않아요</span>
              )}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-2 text-[10px] opacity-70">
              {(Object.keys(ATTITUDE_META) as Attitude[]).map((k) => (
                <span key={k}>
                  {ATTITUDE_META[k].emoji} {Math.round(at[k] ?? 0)}
                </span>
              ))}
            </p>
            <p className="mt-1 text-[10px]">
              🏠 방 공기: {isColdRoom(game) ? <b className="text-[#5a6fa0]">숨 막히는 방 (공부 가구 {ratio}%)</b> : `괜찮음 (공부 가구 ${ratio}%)`}
              {game.doorLocked && <b className="ml-1 text-accent">· 🔒 방문 잠김</b>}
            </p>
          </div>
        );
      })()}
      <p className="mb-1 font-bold">양육 일기</p>
      {(() => {
        const dom = dominantStyle(game);
        const p: Record<string, number> = game.parenting ?? { WARM: 0, STRICT: 0, FREE: 0, PROTECT: 0 };
        return (
          <div className="mb-3 rounded border-2 border-ink bg-white p-2">
            {game.parent && (
              <p className="mb-1 border-b border-dashed border-ink/30 pb-1">
                🏠 우리 집: <b>{describeParent(game.parent).emoji} {describeParent(game.parent).label}</b>{' '}
                <span className="text-[10px] opacity-70">
                  {ABILITIES.map((k) => `${ABILITY_META[k].emoji}${game.parent!.points[k]}`).join(' ')}
                </span>
              </p>
            )}
            <p className="mb-1">
              {dom ? (
                <>
                  {STYLE_META[dom].emoji} <b>{STYLE_META[dom].label} 부모</b> <span className="opacity-70">— {STYLE_META[dom].desc}</span>
                </>
              ) : (
                <span className="opacity-70">아직 육아 선택을 하지 않았어요</span>
              )}
            </p>
            <div className="flex gap-2 text-[10px]">
              {(Object.keys(STYLE_META) as ParentStyle[]).map((k) => (
                <span key={k}>
                  {STYLE_META[k].emoji} {STYLE_META[k].label} {p[k] ?? 0}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[10px] opacity-70">
              들어준 부탁 {game.wishesGranted ?? 0} · 못 들어준 부탁 {game.wishesFailed ?? 0} · 겪은 일 {game.seenEvents?.length ?? 0}가지
            </p>
          </div>
        );
      })()}
      <p className="mb-1 flex items-center justify-between font-bold">
        <span>📷 가족 사진첩 ({photos.length}장)</span>
        {photos.length > 6 && (
          <button className="text-[10px] underline" onClick={() => setAllPhotos((v) => !v)}>
            {allPhotos ? '최근 6장만' : '전체 보기'}
          </button>
        )}
      </p>
      <div className="mb-3 rounded border-2 border-ink bg-[#e9dcc0]">
        <PhotoAlbum photos={[...photos].reverse()} gender={game.gender} limit={allPhotos ? undefined : 6} />
      </div>
      {diaries.length > 0 && (
        <>
          <p className="mb-1 flex items-center justify-between font-bold">
            <span>📔 몰래 읽은 일기 ({diaries.length}편)</span>
            <button className="text-[10px] underline" onClick={() => setShowDiary((v) => !v)}>
              {showDiary ? '접기' : '펼치기'}
            </button>
          </p>
          {showDiary && (
            <div className="mb-3 flex flex-col gap-2">
              {[...diaries].reverse().map((d, i) => (
                <DiaryPage key={i} e={d} name={game.childName} />
              ))}
            </div>
          )}
        </>
      )}
      <p className="mb-1 font-bold">6대 분야 적성</p>
      <div className="grid grid-cols-1 gap-1">
        {APT_KEYS.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="flex w-16 shrink-0 items-center gap-1"><Icon name={k} size={16} />{APT_META[k].label}</span>
            <span className="w-10 shrink-0">Lv.{aptitudes[k].level}</span>
            <Bar value={aptitudes[k].exp} max={100} color="#6ec3f4" height="h-2" />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] opacity-60">
        업적: 체육대회 우승 {game.actionCounts.WIN_SPORTS ?? 0} · 예술제 입상 {game.actionCounts.WIN_ARTFEST ?? 0} · 기말 1등 {game.actionCounts.WIN_EXAM ?? 0}
      </p>
    </div>
  );
}


/** 🗺️ 주말 나들이에서 만난 동네 사람들과의 인연 */
function PeopleBox() {
  const game = useGameStore((s) => s.game)!;
  const vars = townNames(game);
  const met = (Object.keys(NPCS) as NpcId[]).filter((id) => person(game, id).met);
  return (
    <>
      <p className="mb-1 font-bold">동네 인연</p>
      <div className="mb-3 grid gap-1 rounded border-2 border-ink bg-white p-2">
        {met.length === 0 && <p className="text-[10px] opacity-70">🗺️ 주말 나들이에서 동네 사람들을 만나 보세요.</p>}
        {met.map((id) => {
          const p = person(game, id);
          const n = NPCS[id];
          const label = id === 'FRIEND' ? vars.friend : id === 'RIVAL' ? vars.rival : id === 'TEACHER' ? `${vars.teacher} 선생님` : id === 'GRANNY' ? '빵집 할머니' : `${vars.mentor} 선배`;
          return (
            <div key={id} className="flex items-center gap-1.5">
              <span className="w-24 shrink-0 truncate text-[11px] font-bold">
                {n.emoji} {label}
              </span>
              <span className="w-16 shrink-0 text-[10px] text-wood">{n.tiers[relTier(p.rel)]}</span>
              <Bar value={p.rel} max={100} color="#ff8fb1" />
              {(p.got ?? []).length > 0 && <span className="text-[10px]">🎁{p.got!.length}</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}
