import { CUTSCENE_MAP } from '../data/cutsceneData';
import { growthStage } from './room';
import type { SaveState } from './simulation';

/**
 * 화면에 보여 줄 성장 단계.
 * 12세·17세가 되는 달은 한 달 계산이 끝나자마자 나이가 바뀌지만,
 * 키가 훌쩍 크는 성장 컷신을 보기 전까지는 (그 달의 주차 연출 포함) 예전 모습 그대로 둔다.
 */
export function displayStage(g: SaveState) {
  const id = g.pendingCutscene;
  const cut = id ? CUTSCENE_MAP[id] : null;
  if (cut) {
    const tr = cut.lines(g).find((l) => l.kind === 'transform');
    if (tr && tr.kind === 'transform') return tr.from;
  }
  return growthStage(g.age);
}
