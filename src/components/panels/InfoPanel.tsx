import { useGameStore } from '../../store/useGameStore';
import { Sprite } from '../Sprite';
import { frameName } from '../../render/spriteCharacter';
import { APT_KEYS, STAT_KEYS } from '../../engine/simulation';
import { growthStage } from '../../engine/room';
import { APT_META, Bar, STAT_META } from '../ui';
import { Icon } from '../Icon';

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
  const { stats, status, aptitudes } = game;
  return (
    <div className="text-xs">
      <p className="mb-2 text-sm font-bold">
        {game.childName} · {game.age}세 ({STAGE_LABEL[growthStage(game.age)]})
      </p>
      <div className="flex items-center justify-center gap-2">
        <Sprite name={frameName(growthStage(game.age), game.gender, 'stand')} />
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
