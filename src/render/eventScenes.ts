import { EVENT_MAP, PARENTING_EVENTS } from '../data/parentingData';
import type { Gender } from '../types/game';

import manifest from './eventManifest.json';
import { sceneStage } from '../data/sceneStage';
import { growthStage } from '../engine/room';

/** 이벤트 장면 일러스트 (고화질, scripts/build-event-hd.py → public/events/{이벤트ID}_{SON|DAUGHTER}.webp)
 * 단일 HTML 용량 제한 때문에 인라인하지 않고 게임 옆 파일로 둔다 (상대 경로). */
const HAVE = new Set(manifest as string[]);

/** age를 주면 그림 속 아이 나이대가 다를 때는 그림을 쓰지 않는다 (예: 10세인데 교복 입은 그림) */
export function eventScene(id: string, gender: Gender, age?: number): string | undefined {
  const key = `${id}_${gender}`;
  if (!HAVE.has(key)) return undefined;
  const st = sceneStage(id);
  if (age !== undefined && st && growthStage(Math.min(19, age)) !== st) return undefined;
  return `events/${key}.webp`;
}

/** 사진첩 사진(제목으로 저장됨) → 그 이벤트의 장면 그림 */
const TITLE_TO_ID: Record<string, string> = Object.fromEntries(PARENTING_EVENTS.map((e) => [e.title, e.id]));
const CUT_TITLE: Record<string, string> = { '초등학교 입학식': 'CS_SCHOOL', '어느새 훌쩍': 'CS_PUBERTY', '중학교 입학': 'CS_MIDDLE', '이제 거의 어른': 'CS_GROWN', '고3, 마지막 1년': 'CS_SENIOR' };
export function photoScene(title: string, gender: Gender, age?: number): string | undefined {
  const id = TITLE_TO_ID[title] ?? CUT_TITLE[title];
  return id ? eventScene(id, gender, age) : undefined;
}
void EVENT_MAP;
