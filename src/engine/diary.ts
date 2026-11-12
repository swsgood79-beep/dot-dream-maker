import { ACTION_MAP } from '../data/scheduleData';
import { WISH_MAP, fillName, type Effect, type ParentStyle } from '../data/parentingData';
import { CLUES_TO_REVEAL, TEMPERAMENT_MAP } from '../data/temperamentData';
import { growthStage } from './room';
import { applyEffect, recordStyle } from './parenting';
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

const STAGE_END = {
  CHILD: ['참 재미있었다!', '내일도 신나는 일이 있으면 좋겠다!', '이제 자야지. 안녕, 일기장!'],
  TEEN: ['...뭐, 나쁘진 않았다.', '아 몰라. 잠이나 자자.', '내일은 좀 덜 피곤했으면.'],
  YOUTH: ['내일은 좀 더 잘해 보자.', '어른이 되는 게 생각보다 어렵다.', '그래도 오늘의 나, 수고했어.'],
};

const TEMPER_SECRET = {
  SHY: '오늘 발표 시간에 손 들고 싶었는데 결국 못 들었다. 왜 나는 이렇게 떨릴까.',
  ACTIVE: '하루 종일 앉아 있으려니 몸이 근질근질했다. 운동장 열 바퀴 뛰고 싶다!',
  STUBBORN: '다들 내가 틀렸다는데, 난 아직도 내가 맞다고 생각한다.',
  SENSITIVE: '친구가 별 뜻 없이 한 말인데 하루 종일 마음에 걸린다.',
  EASYGOING: '숙제? 내일 하면 되지 뭐~ 오늘은 구름 구경했다.',
};

/** 이번 달 일기 쓰기: 비밀이 있으면 꼭, 없으면 가끔 */
/** 생일 선물 힌트 줄 (생일이 지나면 읽지 않은 일기에서 지운다) */
export const BDAY_MARK = '곧 내 생일이다!';

export function writeDiary(s: SaveState, weeks: WeekResult[], contest: ContestResult | undefined, rng: Rng) {
  const stage = growthStage(s.age);
  const lines: string[] = [];
  // 가장 많이 한 일
  const counts: Record<string, number> = {};
  for (const w of weeks) if (w.outcome !== 'RUNAWAY') counts[w.actionId] = (counts[w.actionId] ?? 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const a = top ? ACTION_MAP[top] : null;
  if (a) {
    // 학원 종류에 맞는 한마디 (체육·예술 학원에서 '숙제'를 말하면 어색하므로 따로)
    const eduChild: Record<string, string> = {
      EDU_05: '연습, 연습, 또 연습. 다리가 후들후들하다.',
      EDU_06: '손에 물감이 지워지지 않는다. 그래도 재밌다.',
      EDU_07: '온몸이 쑤신다. 그래도 발차기가 늘었다!',
    };
    if (a.type === 'EDUCATION') lines.push(stage === 'CHILD' ? `이번 달은 ${a.name}에 많이 갔다. ${eduChild[a.id] ?? '숙제가 산더미다.'}` : `${a.name}. 또 ${a.name}. 내 인생은 학원이다.`);
    else if (a.id === 'JOB_01') lines.push(stage === 'CHILD' ? '집안일을 도왔다. 걸레질은 생각보다 힘들다!' : '집안일을 거들었다. 엄마 아빠는 이걸 매일 했구나.');
    else if (a.type === 'PART_TIME') lines.push(`${a.name.replace(/ \(.*\)$/, '')}에서 일했다. ${['돈 버는 건 생각보다 힘들다.', '첫 주보다는 손이 빨라졌다.', '퇴근길에 산 붕어빵이 제일 맛있었다.'][Math.floor(rng() * 3)]}`);
    else if (a.id === 'REST_02') lines.push(stage === 'CHILD' ? '가족끼리 캠핑을 갔다. 마시멜로 최고!' : '가족 캠핑. 귀찮았는데... 사실 좀 좋았다.');
    else if (a.type === 'OUTING') lines.push(`${a.name.replace('외출: ', '')}! ${stage === 'CHILD' ? '신났다!' : '오랜만에 숨통이 트였다.'}`);
    else lines.push(stage === 'CHILD' ? '하루 종일 뒹굴뒹굴했다. 최고!' : '이번 달은 좀 쉬었다. 충전 완료.');
  }
  if (weeks.some((w) => w.outcome === 'GREAT') && rng() < 0.5)
    lines.push(['오늘은 뭐든 술술 됐다. 나 좀 천재인가?', '칭찬받았다! 기분 최고.', '어려웠던 게 갑자기 이해됐다. 이 맛에 하나 봐.'][Math.floor(rng() * 3)]);
  if (contest) lines.push(contest.win ? (contest.id === 'EXAM' ? `${contest.title}에서 1등!!! 꿈인가?` : `${contest.title}에서 이겼다!!! 꿈인가?`) : `${contest.title}... 아쉬웠다. 다음엔 꼭.`);
  // 일기는 다음 달에 읽히므로, 생일 두 달 전에 써야 생일 한 달 전에 읽힌다 (생일 선물보다 먼저)
  if (s.birthMonth && s.birthMonth === ((s.month + 1) % 12) + 1) {
    lines.push(`${BDAY_MARK} ${wantedGift(s).emoji} ${wantedGift(s).name} 받고 싶다... 말할까 말까.`);
  }
  if (rng() < 0.25) lines.push(['고양이가 또 내 침대에서 잤다.', '저녁 반찬이 맛있었다.', '창밖에 비가 왔다. 왠지 좋았다.'][Math.floor(rng() * 3)]);

  // 비밀 (우선순위 높은 것 하나)
  let secret: DiaryEntry['secret'];
  const temper = s.temperament ? TEMPERAMENT_MAP[s.temperament] : null;
  const wish = s.wish ? WISH_MAP[s.wish.id] : null;
  if (s.status.delinquency >= 20 && rng() < 0.6) {
    secret = { kind: 'TRUANT', hint: '요즘 몰래 나쁜 짓을 하는 것 같아요. 타이르기나 대화가 필요해 보여요.' };
    // 그달에 학원을 다녔을 때만 '학원 빼먹고' (알바·외출만 한 달엔 다른 말)
    const edu = weeks.some((w) => ACTION_MAP[w.actionId]?.type === 'EDUCATION');
    const bad =
      stage === 'CHILD'
        ? edu
          ? ['오늘 학원 안 가고 놀이터에 있었다. 엄마 아빠한텐 비밀.', '학원 차 안 타고 문구점에서 놀았다. 들키면 끝장.']
          : ['동네 애들이랑 해 질 때까지 놀았다. 엄마 아빠한텐 비밀.', '친구 따라 몰래 오락실 갔다. 비밀!']
        : edu
          ? ['오늘 학원 빼먹고 애들이랑 PC방 갔다. 절대 비밀.', '학원 앞까지 갔다가 그냥 돌아섰다. 아무도 모르겠지.']
          : ['애들이랑 밤늦게까지 돌아다녔다. 절대 비밀.', '집에는 도서관 간다고 했다. ...미안.'];
    lines.push(bad[Math.floor(rng() * bad.length)]);
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
  } else if (stage !== 'CHILD' && s.age >= 14 && s.stats.CHA >= 250 && s.lastDiarySecret !== 'CRUSH' && rng() < 0.25) {
    secret = { kind: 'CRUSH', hint: '좋아하는 사람이 생겼나 봐요. 모른 척해 주는 게 좋겠어요.' };
    lines.push(fillName(['{friend}한테도 말 못 한 비밀. 좋아하는 사람이 생겼다.', '오늘 복도에서 눈이 마주쳤다. 하루 종일 그 생각만 났다.', '답장이 3분 만에 왔다. ...이거 무슨 뜻이지?'][Math.floor(rng() * 3)], s.childName, s.friend));
  } else if (s.age >= 15 && s.lastDiarySecret !== 'DREAM' && rng() < 0.2) {
    const keys = ['INT', 'STR', 'ART', 'CHA', 'MOR', 'TEC'] as const;
    const best = keys.reduce((x, y) => (s.stats[y] > s.stats[x] ? y : x));
    const LIKE = { INT: '공부가', STR: '운동이', ART: '그림이랑 음악이', CHA: '사람들 앞에 서는 게', MOR: '누군가를 돕는 게', TEC: '뭔가 만드는 게' };
    const LIKE_HINT = { INT: '공부', STR: '운동', ART: '그림이랑 음악', CHA: '사람들 앞에 서는 것', MOR: '누군가를 돕는 것', TEC: '뭔가 만드는 것' };
    secret = { kind: 'DREAM', hint: `${LIKE_HINT[best]}에 마음이 있어요. 진로에 참고해 보세요.` };
    lines.push([`사실 나는 ${LIKE[best]} 제일 좋다. 이걸로 먹고살 수 있을까?`, `요즘은 ${LIKE[best]} 제일 재밌다. 이게 꿈이라는 걸까?`, `진로 조사서에 뭐라고 쓰지... ${LIKE_HINT[best]}? 그걸로 직업이 될까?`][Math.floor(rng() * 3)]);
  }
  if (!secret && rng() >= 0.35) return; // 평범한 달은 가끔만 일기를 쓴다
  lines.push(STAGE_END[stage][Math.floor(rng() * STAGE_END[stage].length)]);
  s.lastDiarySecret = secret?.kind;
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
  recordStyle(s, c.style);
  s.memories = [...(s.memories ?? []), `DIARY_CAUGHT:${c.style}`];
  return { reply: c.reply, delta };
}
