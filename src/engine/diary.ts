import { ACTION_MAP } from '../data/scheduleData';
import { WISH_MAP, fillName, type Effect, type ParentStyle } from '../data/parentingData';
import { CLUES_TO_REVEAL, TEMPERAMENT_MAP } from '../data/temperamentData';
import { growthStage } from './room';
import { applyEffect } from './parenting';
import { wantedGift } from '../data/birthdayData';
import type { ContestResult, Rng, SaveState, WeekResult } from './simulation';

/** 아이의 일기 한 편 */
export interface DiaryEntry {
  age: number;
  month: number;
  lines: string[];
  /** 비밀이 적혀 있음 (읽으면 부모가 알게 되는 것) */
  secret?: { kind: 'WISH' | 'TEMPER' | 'TRUANT' | 'STRESS' | 'LONELY' | 'CRUSH' | 'DREAM'; hint: string };
}

const STAGE_END = { CHILD: '참 재미있었다!', TEEN: '...뭐, 나쁘진 않았다.', YOUTH: '내일은 좀 더 잘해 보자.' };

const TEMPER_SECRET = {
  SHY: '오늘 발표 시간에 손 들고 싶었는데 결국 못 들었다. 왜 나는 이렇게 떨릴까.',
  ACTIVE: '하루 종일 앉아 있으려니 몸이 근질근질했다. 운동장 열 바퀴 뛰고 싶다!',
  STUBBORN: '다들 내가 틀렸다는데, 난 아직도 내가 맞다고 생각한다.',
  SENSITIVE: '친구가 별 뜻 없이 한 말인데 하루 종일 마음에 걸린다.',
  EASYGOING: '숙제? 내일 하면 되지 뭐~ 오늘은 구름 구경했다.',
};

/** 이번 달 일기 쓰기: 비밀이 있으면 꼭, 없으면 가끔 */
export function writeDiary(s: SaveState, weeks: WeekResult[], contest: ContestResult | undefined, rng: Rng) {
  const stage = growthStage(s.age);
  const lines: string[] = [];
  // 가장 많이 한 일
  const counts: Record<string, number> = {};
  for (const w of weeks) if (w.outcome !== 'RUNAWAY') counts[w.actionId] = (counts[w.actionId] ?? 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const a = top ? ACTION_MAP[top] : null;
  if (a) {
    if (a.type === 'EDUCATION') lines.push(stage === 'CHILD' ? `이번 달은 ${a.name}에 많이 갔다. 숙제가 산더미다.` : `${a.name}. 또 ${a.name}. 내 인생은 학원이다.`);
    else if (a.type === 'PART_TIME') lines.push(`${a.name}을(를) 했다. 돈 버는 건 생각보다 힘들다.`);
    else if (a.type === 'OUTING') lines.push(`${a.name.replace('외출: ', '')}! ${stage === 'CHILD' ? '신났다!' : '오랜만에 숨통이 트였다.'}`);
    else lines.push(stage === 'CHILD' ? '하루 종일 뒹굴뒹굴했다. 최고!' : '이번 달은 좀 쉬었다. 충전 완료.');
  }
  if (weeks.some((w) => w.outcome === 'GREAT')) lines.push('오늘은 뭐든 술술 됐다. 나 좀 천재인가?');
  if (contest) lines.push(contest.win ? `${contest.title}에서 이겼다!!! 꿈인가?` : `${contest.title}... 아쉬웠다. 다음엔 꼭.`);
  if (s.birthMonth && s.birthMonth === (s.month % 12) + 1) {
    lines.push(`다음 달이 내 생일이다! ${wantedGift(s).emoji} ${wantedGift(s).name} 받고 싶다... 말할까 말까.`);
  }
  if (rng() < 0.25) lines.push(['고양이가 또 내 침대에서 잤다.', '저녁 반찬이 맛있었다.', '창밖에 비가 왔다. 왠지 좋았다.'][Math.floor(rng() * 3)]);

  // 비밀 (우선순위 높은 것 하나)
  let secret: DiaryEntry['secret'];
  const temper = s.temperament ? TEMPERAMENT_MAP[s.temperament] : null;
  const wish = s.wish ? WISH_MAP[s.wish.id] : null;
  if (s.status.delinquency >= 20 && rng() < 0.6) {
    secret = { kind: 'TRUANT', hint: '요즘 몰래 나쁜 짓을 하는 것 같아요. 타이르기나 대화가 필요해 보여요.' };
    lines.push(stage === 'CHILD' ? '오늘 학원 안 가고 놀이터에 있었다. 엄마 아빠한텐 비밀.' : '오늘 학원 빼먹고 애들이랑 PC방 갔다. 절대 비밀.');
  } else if (s.status.stress >= 60) {
    secret = { kind: 'STRESS', hint: '많이 지쳐 있어요. 휴식이나 캠핑을 넣어 주세요.' };
    lines.push('요즘 너무 힘들다. 근데 말하면 걱정할까 봐 말을 못 하겠다.');
  } else if (s.status.affection < 40) {
    secret = { kind: 'LONELY', hint: '부모님과 멀어졌다고 느끼고 있어요. 대화와 칭찬이 필요해요.' };
    lines.push('엄마 아빠는 내 마음을 하나도 모른다. ...그래도 가끔은 알아줬으면.');
  } else if (wish && rng() < 0.7) {
    secret = { kind: 'WISH', hint: `부탁을 정말 기다리고 있어요: ${wish.hint}` };
    lines.push(`"${wish.text}" ...진짜 들어줄까? 매일 기대하고 있다.`);
  } else if (temper && !s.temperRevealed && rng() < 0.6) {
    secret = { kind: 'TEMPER', hint: '아이의 성격에 대한 단서를 얻었어요.' };
    lines.push(TEMPER_SECRET[temper.id]);
  } else if (stage !== 'CHILD' && s.age >= 14 && s.stats.CHA >= 250 && rng() < 0.25) {
    secret = { kind: 'CRUSH', hint: '좋아하는 사람이 생겼나 봐요. 모른 척해 주는 게 좋겠어요.' };
    lines.push(fillName('{friend}한테도 말 못 한 비밀. 좋아하는 사람이 생겼다.', s.childName, s.friend));
  } else if (s.age >= 15 && rng() < 0.2) {
    const keys = ['INT', 'STR', 'ART', 'CHA', 'MOR', 'TEC'] as const;
    const best = keys.reduce((x, y) => (s.stats[y] > s.stats[x] ? y : x));
    const LIKE = { INT: '공부', STR: '운동', ART: '그림이랑 음악', CHA: '사람들 앞에 서는 것', MOR: '누군가를 돕는 것', TEC: '뭔가 만드는 것' };
    secret = { kind: 'DREAM', hint: `${LIKE[best]}에 마음이 있어요. 진로에 참고해 보세요.` };
    lines.push(`사실 나는 ${LIKE[best]}이(가) 제일 좋다. 이걸로 먹고살 수 있을까?`);
  }
  if (!secret && rng() >= 0.35) return; // 평범한 달은 가끔만 일기를 쓴다
  lines.push(STAGE_END[stage]);
  s.diaryNew = { age: s.age, month: s.month, lines, secret };
}

/** 몰래 읽다 들킬 확률: 사춘기일수록, 예민·고집 센 아이일수록 높다 */
export function caughtChance(s: SaveState) {
  const st = growthStage(s.age);
  let p = st === 'CHILD' ? 0.1 : st === 'TEEN' ? 0.28 : 0.15;
  if (s.temperament === 'SENSITIVE' || s.temperament === 'STUBBORN') p += 0.07;
  return p;
}

/** 일기를 몰래 읽는다 → 비밀 공개 (기질 단서 포함), 들켰는지 */
export function readDiary(s: SaveState, rng: Rng) {
  const e = s.diaryNew;
  if (!e) return null;
  s.diaryNew = null;
  s.diaryRead = [...(s.diaryRead ?? []), e].slice(-60);
  let clue: string | undefined;
  if (e.secret?.kind === 'TEMPER' && s.temperament && !s.temperRevealed) {
    clue = `(일기) ${e.lines.find((l) => l === TEMPER_SECRET[s.temperament!])}`;
    s.clues = [...(s.clues ?? []), clue];
    if (s.clues.length >= CLUES_TO_REVEAL) {
      s.temperRevealed = true;
      s.temperRevealedAge = s.age;
    }
  }
  const caught = rng() < caughtChance(s);
  if (caught) s.diaryCaught = (s.diaryCaught ?? 0) + 1;
  return { entry: e, caught, clue, revealed: !!clue && s.temperRevealed };
}

/** 일기를 읽지 않고 그냥 둔다 */
export function skipDiary(s: SaveState) {
  if (!s.diaryNew) return;
  s.diaryNew = null;
  s.diaryRespected = (s.diaryRespected ?? 0) + 1;
}

/** "내 일기 읽었어?!" — 들켰을 때 부모의 대응 */
export const CAUGHT_CHOICES: { label: string; style: ParentStyle; fx: Effect; reply: string }[] = [
  { label: '진심으로 사과한다', style: 'WARM', fx: { affection: -5, stress: 4 }, reply: '...다시는 읽지 마. 약속해. (새끼손가락)' },
  { label: '걱정돼서 그랬다고 이유를 댄다', style: 'STRICT', fx: { affection: -12, stress: 8, MOR: 3 }, reply: '걱정되면 물어보면 되잖아! (방문 쾅)' },
  { label: '웃으며 얼버무린다', style: 'FREE', fx: { affection: -8, stress: 5 }, reply: '...안 웃겨. 자물쇠 달 거야.' },
];

export function respondCaught(s: SaveState, i: number) {
  const c = CAUGHT_CHOICES[i];
  const delta = applyEffect(s, c.fx);
  s.parenting = { WARM: 0, STRICT: 0, FREE: 0, ...s.parenting };
  s.parenting[c.style] += 1;
  s.memories = [...(s.memories ?? []), `DIARY_CAUGHT:${c.style}`];
  return { reply: c.reply, delta };
}
