import { photoScene } from '../render/eventScenes';
import type { Gender } from '../types/game';
import type { Photo } from '../engine/simulation';
import { growthStage } from '../engine/room';
import { frameName } from '../render/spriteCharacter';
import { Sprite } from './Sprite';

/** 폴라로이드 한 장 */
export function PhotoCard({ p, gender, tilt = 0 }: { p: Photo; gender: Gender; tilt?: number }) {
  return (
    <div className="bg-[#fffdf6] p-1.5 pb-2 text-ink shadow-[3px_3px_0_rgba(0,0,0,.3)]" style={{ transform: `rotate(${tilt}deg)` }}>
      {photoScene(p.title, gender, p.age) ? (
        <img src={photoScene(p.title, gender, p.age)} alt="" className="h-20 w-full border-2 border-ink object-cover" />
      ) : (
        <div className="room-bg relative flex h-20 items-end justify-center overflow-hidden border-2 border-ink">
          <span className="absolute top-0.5 left-1 text-2xl drop-shadow-[1px_1px_0_rgba(0,0,0,.3)]">{p.emoji}</span>
          <Sprite name={frameName(growthStage(Math.min(19, p.age)), gender, p.pose)} scale={0.85} />
        </div>
      )}
      <p className="mt-1 truncate text-[11px] font-bold">{p.title}</p>
      <p className="text-[9px] opacity-60">
        {p.age}세 {p.month}월
      </p>
      <p className="line-clamp-2 text-[9px] leading-tight opacity-80">{p.caption}</p>
    </div>
  );
}

export function PhotoAlbum({ photos, gender, limit }: { photos: Photo[]; gender: Gender; limit?: number }) {
  const list = limit ? photos.slice(0, limit) : photos;
  return (
    <div className="grid grid-cols-2 gap-2.5 p-1">
      {list.map((p, i) => (
        <PhotoCard key={i} p={p} gender={gender} tilt={((i * 37) % 5) - 2} />
      ))}
    </div>
  );
}
