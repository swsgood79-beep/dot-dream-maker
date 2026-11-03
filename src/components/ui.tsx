import { useEffect, useState, type ReactNode } from 'react';
import { furnitureSpriteUrl, hasFurnitureSprite, onFurnitureSheetReady } from '../render/furnitureSprites';
import type { AptitudeKey, StatKey } from '../types/game';
import { pixelIconUrl } from '../render/sprites';
import { sfx } from '../audio/sfx';
import { Icon } from './Icon';

export const STAT_META: Record<StatKey, { label: string; icon: string; color: string }> = {
  INT: { label: '지력', icon: '🧠', color: '#6ec3f4' },
  STR: { label: '체력', icon: '💪', color: '#ff7a59' },
  ART: { label: '감성', icon: '🎨', color: '#c48cff' },
  CHA: { label: '매력', icon: '💖', color: '#ff8fc0' },
  MOR: { label: '도덕', icon: '⚖️', color: '#5bd6a8' },
  TEC: { label: '기술', icon: '🛠️', color: '#ffcc4d' },
};

export const APT_META: Record<AptitudeKey, { label: string; icon: string }> = {
  APT_MED: { label: '의학', icon: '🩺' },
  APT_LAW: { label: '법률', icon: '⚖️' },
  APT_IT: { label: 'IT', icon: '💾' },
  APT_ENT: { label: '예술', icon: '🎬' },
  APT_BIZ: { label: '경영', icon: '📈' },
  APT_ADV: { label: '모험', icon: '🗡️' },
};

/** 화면 표시용 한글 이름 (엔진 내부 키 INT/APT_LAW 등 → 지력/법률) */
const KO_TOKEN: Record<string, string> = {
  APT_MED: '의학', APT_LAW: '법률', APT_IT: 'IT', APT_ENT: '예술', APT_BIZ: '경영', APT_ADV: '모험',
  INT: '지력', STR: '체력', ART: '감성', CHA: '매력', MOR: '도덕', TEC: '기술',
  Combo: '콤보',
};

/** 팝업·결과 문구의 영어 키를 한글로: "+12 INT" → "+12 지력", "APT_LAW Lv.3!" → "법률 Lv.3!", "Combo x1.3!" → "콤보 x1.3!" */
export function ko(text: string): string {
  return text.replace(/APT_[A-Z]+|\b(?:INT|STR|ART|CHA|MOR|TEC)\b|Combo/g, (m) => KO_TOKEN[m] ?? m);
}

export const TIER_COLOR: Record<string, string> = {
  SS: 'bg-gradient-to-r from-pink-400 via-yellow-300 to-sky-400',
  S: 'bg-yellow-300',
  A: 'bg-sky-300',
  B: 'bg-emerald-300',
  C: 'bg-stone-300',
};

export function PixelButton({
  children,
  onClick,
  color = 'bg-gold',
  className = '',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        sfx('click');
        onClick?.();
      }}
      className={`pixel-btn ${color} px-3 py-2 text-sm font-bold text-ink ${className}`}>
      {children}
    </button>
  );
}

export function Bar({ value, max, color, height = 'h-3' }: { value: number; max: number; color: string; height?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`w-full ${height} border-2 border-ink bg-white/70`}>
      <div className="h-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Sheet({
  title,
  icon,
  onClose,
  children,
  footer,
}: {
  title: string;
  icon?: string;
  onClose: () => void;
  children: ReactNode;
  /** 스크롤 영역 밖 맨 아래에 고정되는 버튼 줄 (목록을 가리지 않음) */
  footer?: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div className="pixel-box pop-in flex max-h-[78%] flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-3 border-ink bg-wood px-3 py-2 text-white">
          <span className="flex items-center gap-1.5 text-base font-bold">
            {icon && <Icon name={icon} size={22} />}
            {title}
          </span>
          <button onClick={onClose} className="text-lg leading-none">✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{children}</div>
        {footer && <div className="shrink-0 border-t-3 border-ink bg-panel-dark p-2">{footer}</div>}
      </div>
    </div>
  );
}

/** 가구 아이콘: 손그림 스프라이트가 있으면 그 그림, 없으면 코드 도트 아이콘 */
export function PixelIcon({ id, size = 28, className = '' }: { id: string; size?: number; className?: string }) {
  const [url, setUrl] = useState(() => furnitureSpriteUrl(id));
  useEffect(() => (hasFurnitureSprite(id) ? onFurnitureSheetReady(() => setUrl(furnitureSpriteUrl(id))) : undefined), [id]);
  const src = hasFurnitureSprite(id) ? url : pixelIconUrl(id);
  return (
    <span className={`inline-flex shrink-0 items-end justify-center ${className}`} style={{ width: size, height: size }}>
      {src && (
        <img
          src={src}
          alt=""
          style={
            hasFurnitureSprite(id)
              ? { imageRendering: 'pixelated', maxWidth: size, maxHeight: size, width: 'auto', height: 'auto' }
              : { imageRendering: 'pixelated', width: size, height: size }
          }
        />
      )}
    </span>
  );
}

/** 스탯/적성 아이콘 + 값 칩 (예: [뇌]+6) */
export function StatChip({ k, v, size = 14 }: { k: string; v: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
      <Icon name={k} size={size} title={ko(k)} />
      {v > 0 ? '+' : ''}
      {v}
    </span>
  );
}

const EFFECT_LABEL: Record<string, string> = {
  stress: '스트레스',
  affection: '친밀도',
  delinquency: '비행',
  fame: '명성',
  gold: '골드',
  idea: '영감',
};
const EFFECT_ICON: Record<string, string | null> = { stress: 'STRESS', fame: 'FAME', gold: 'GOLD', idea: 'IDEA', affection: null, delinquency: null };
const EFFECT_EMOJI: Record<string, string> = { affection: '❤️', delinquency: '😈' };
/** 수치가 오르면 나쁜 항목 */
const BAD_UP = new Set(['stress', 'delinquency']);

/** 선택지·부탁 결과 변화량 칩 */
export function EffectChips({ fx }: { fx: Partial<Record<string, number>> }) {
  const entries = Object.entries(fx).filter(([, v]) => v);
  if (!entries.length) return <span className="text-[10px] opacity-60">변화 없음</span>;
  return (
    <span className="flex flex-wrap justify-center gap-1">
      {entries.map(([k, v]) => {
        const good = BAD_UP.has(k) ? v! < 0 : v! > 0;
        const isStat = k in STAT_META;
        return (
          <span
            key={k}
            className={`inline-flex items-center gap-0.5 rounded border-2 border-ink px-1 py-0.5 text-[11px] font-bold ${good ? 'bg-[#d9f7e8]' : 'bg-[#ffe0dc]'}`}
          >
            {isStat || EFFECT_ICON[k] ? <Icon name={isStat ? k : EFFECT_ICON[k]!} size={14} /> : <span>{EFFECT_EMOJI[k]}</span>}
            {isStat ? STAT_META[k as StatKey].label : EFFECT_LABEL[k]} {v! > 0 ? '+' : ''}
            {v}
          </span>
        );
      })}
    </span>
  );
}
