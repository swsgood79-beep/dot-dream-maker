import { ENDING_MAP } from '../data/endingData';
import { WISH_MAP, type Effect } from '../data/parentingData';
import { applyEffect } from './parenting';
import { growthStage } from './room';
import type { SaveState } from './simulation';

/* ───────── 🌙 잠든 아이 보러 가기 ───────── */
export type NightTouch = 'BLANKET' | 'PAT' | 'DOOR';
export const NIGHT_TOUCH: Record<NightTouch, { emoji: string; label: string; fx: Effect; after: string }> = {
  BLANKET: { emoji: '🛏️', label: '걷어찬 이불 덮어 주기', fx: { affection: 2, stress: -3 }, after: '이불을 끌어안고 몸을 동그랗게 만다. 쿨쿨...' },
  PAT: { emoji: '🤚', label: '살며시 머리 쓰다듬기', fx: { affection: 2, selfEsteem: 1 }, after: '자면서 살짝 웃는다. 좋은 꿈을 꾸나 보다.' },
  DOOR: { emoji: '🚪', label: '불 끄고 조용히 문 닫아 주기', fx: { autonomy: 1, stress: -1 }, after: '깊이 잠들었다. 내일도 힘내자.' },
};

/** 잠꼬대: 지금 아이 마음 한 조각 (없으면 null) */
export function sleepTalk(s: SaveState, rng: () => number = Math.random): string | null {
  if (rng() > 0.55) return null;
  const st = growthStage(s.age);
  if (s.acting) return `"...${s.acting.inner.replace(/[.…]+$/, '')}..." (잠결에 중얼거렸다)`;
  if (s.status.stress >= 70) return st === 'CHILD' ? '"...학원 가기 싫어... 음냐..."' : '"...시험... 망하면 어떡하지..."';
  if (s.status.affection <= 35) return '"...엄마... 아빠... 나 좀 봐 줘..."';
  const wish = s.wish ? WISH_MAP[s.wish.id] : null;
  if (wish && rng() < 0.6) return `"...${wish.text.replace(/[!~.]+$/, '')}... 음냐..."`;
  if (s.dreamJob && ENDING_MAP[s.dreamJob]) return `"...나 커서... ${ENDING_MAP[s.dreamJob].title.replace(/ \(.*\)$/, '')} 될 거야... 쿨..."`;
  return st === 'CHILD' ? '"...헤헤... 엄마 사랑해... 쿨..."' : '"...음... 고마워... 쿨쿨..."';
}

export function visitNight(s: SaveState, kind: NightTouch, rng: () => number = Math.random): { delta: Effect; talk: string | null } | null {
  if (s.nightVisited) return null;
  s.nightVisited = true;
  const talk = sleepTalk(s, rng);
  const delta = applyEffect(s, NIGHT_TOUCH[kind].fx);
  return { delta, talk };
}

/* ───────── ✏️ 숙제 봐주기 ───────── */
/** 나이에 맞는 문제 하나 (보기 3개) */
export function makeHomework(s: SaveState, rng: () => number = Math.random): { q: string; options: string[]; answer: number } {
  const r = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const st = growthStage(s.age);
  let q: string;
  let ans: number;
  if (st === 'CHILD') {
    if (rng() < 0.5) {
      const a = r(12, 48), b = r(7, 39);
      q = `${a} + ${b} = ?`;
      ans = a + b;
    } else {
      const a = r(3, 9), b = r(4, 9);
      q = `${a} × ${b} = ?`;
      ans = a * b;
    }
  } else if (st === 'TEEN') {
    const x = r(2, 9), a = r(2, 6), b = r(1, 15);
    q = `${a}x + ${b} = ${a * x + b} 일 때, x = ?`;
    ans = x;
  } else {
    const base = r(2, 9) * 2000, pct = [10, 20, 25, 30, 40][r(0, 4)];
    q = `${base.toLocaleString()}원짜리 물건을 ${pct}% 할인하면 얼마?`;
    ans = base * (1 - pct / 100);
  }
  // 오답 2개: 반복 없이 정해진 간격으로 (난수가 고정돼도 멈추지 않게)
  const step = st === 'YOUTH' ? Math.max(500, Math.round((ans * 0.1) / 100) * 100) : Math.max(1, r(1, Math.max(2, Math.round(ans * 0.15))));
  const wrong = [ans + step, ans - step > 0 ? ans - step : ans + step * 2];
  const opts = [ans, ...wrong];
  const k = Math.floor(rng() * 3) % 3; // 정답 자리 섞기
  [opts[0], opts[k]] = [opts[k], opts[0]];
  const fmt = (n: number) => (st === 'YOUTH' ? `${n.toLocaleString()}원` : `${n}`);
  return { q, options: opts.map(fmt), answer: opts.indexOf(ans) };
}

export type HomeworkWay = 'TOGETHER' | 'TELL' | 'SELF';
export const HOMEWORK_WAY: Record<HomeworkWay, { emoji: string; label: string }> = {
  TOGETHER: { emoji: '✍️', label: '같이 풀어 보자' },
  TELL: { emoji: '📖', label: '정답을 알려 준다' },
  SELF: { emoji: '🙅', label: '스스로 해 보라고 한다' },
};

/* ───────── 🍱 대회 도시락 ───────── */
export type Lunch = 'MEAT' | 'NUT' | 'CHARA';
export const LUNCH: Record<Lunch, { emoji: string; name: string; desc: string; stat: 'STR' | 'INT' | 'ART' }> = {
  MEAT: { emoji: '🍖', name: '든든한 고기 도시락', desc: '힘이 불끈! 체육대회에 딱', stat: 'STR' },
  NUT: { emoji: '🥜', name: '머리가 맑아지는 견과 도시락', desc: '집중력 쑥! 시험에 딱', stat: 'INT' },
  CHARA: { emoji: '🐱', name: '알록달록 캐릭터 도시락', desc: '기분이 몽글! 예술제에 딱', stat: 'ART' },
};
/** 대회 점수 배율: 그 대회에 맞는 도시락이면 +8% */
export const lunchBonus = (lunch: Lunch | null | undefined, stat: string) => (lunch && LUNCH[lunch].stat === stat ? 1.08 : 1);
