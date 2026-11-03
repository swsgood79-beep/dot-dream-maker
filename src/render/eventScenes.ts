import { EVENT_MAP, PARENTING_EVENTS } from '../data/parentingData';
import type { Gender } from '../types/game';

/** 이벤트 장면 일러스트 (scripts/build-event-scenes.py → src/assets/events/{이벤트ID}_{SON|DAUGHTER}.jpg) */
const IMG = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/events/*.jpg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>).map(
    ([k, v]) => [k.split('/').pop()!.replace('.jpg', ''), v],
  ),
);

export function eventScene(id: string, gender: Gender): string | undefined {
  return IMG[`${id}_${gender}`];
}

/** 사진첩 사진(제목으로 저장됨) → 그 이벤트의 장면 그림 */
const TITLE_TO_ID: Record<string, string> = Object.fromEntries(PARENTING_EVENTS.map((e) => [e.title, e.id]));
const CUT_TITLE: Record<string, string> = { '초등학교 입학식': 'CS_SCHOOL', '어느새 훌쩍': 'CS_PUBERTY', '중학교 입학': 'CS_MIDDLE', '이제 거의 어른': 'CS_GROWN', '고3, 마지막 1년': 'CS_SENIOR' };
export function photoScene(title: string, gender: Gender): string | undefined {
  const id = TITLE_TO_ID[title] ?? CUT_TITLE[title];
  return id ? eventScene(id, gender) : undefined;
}
void EVENT_MAP;
