import { useEffect, useState, type ReactNode } from 'react';
import { furnitureSpriteUrl, hasFurnitureSprite, onFurnitureSheetReady } from '../render/furnitureSprites';
import type { AptitudeKey, StatKey } from '../types/game';
import { pixelIconUrl } from '../render/sprites';
import { sfx } from '../audio/sfx';

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

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div className="pixel-box pop-in flex max-h-[78%] flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-3 border-ink bg-wood px-3 py-2 text-white">
          <span className="font-bold">{title}</span>
          <button onClick={onClose} className="text-lg leading-none">✕</button>
        </div>
        <div className="overflow-y-auto p-3">{children}</div>
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
