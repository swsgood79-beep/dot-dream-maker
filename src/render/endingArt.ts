import manifest from './endingArtManifest.json';
import type { Gender } from '../types/game';

/** 직업 엔딩 일러스트 (scripts/build-ending-art.py → public/endings/{엔딩ID}_{SON|DAUGHTER}_{BRIGHT|DARK}.webp)
 * BRIGHT: 건강한 자립·평범한 거리 / DARK: 번아웃·절연·캥거루. 없으면 도트 장면으로 대신. */
const HAVE = new Set(manifest as string[]);
export type ArtMood = 'BRIGHT' | 'DARK';
export function endingArt(id: string, gender: Gender, mood: ArtMood): string | undefined {
  const key = `${id}_${gender}_${mood}`;
  if (HAVE.has(key)) return `endings/${key}.webp`;
  const other = `${id}_${gender}_${mood === 'DARK' ? 'BRIGHT' : 'DARK'}`;
  return mood === 'DARK' && HAVE.has(other) ? `endings/${other}.webp` : undefined; // 어두운 그림이 없으면 밝은 그림을 어둡게
}
export const hasDarkArt = (id: string, gender: Gender) => HAVE.has(`${id}_${gender}_DARK`);
