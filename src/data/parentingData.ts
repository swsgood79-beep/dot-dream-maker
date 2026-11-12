import { hasBatchim, josa } from './josa';
export { hasBatchim, josa };
import { hasScreen, notPoor, owns } from '../engine/homeContext';
import type { StatKey } from '../types/game';
import type { SaveState } from '../engine/simulation';
import { ARC_EVENTS } from './arcData';
import { ENDINGS } from './endingData';
import { parentClass } from './parentData';

const ENDING_TITLE: Record<string, string> = Object.fromEntries(ENDINGS.map((e) => [e.id, e.title.replace(/ \(.*\)$/, '')]));
const ENDING_CATEGORY: Record<string, string> = Object.fromEntries(ENDINGS.map((e) => [e.id, e.category]));
/** 첫째가 직업 분야에 맞춰 들고 오는 가구 */
const VISIT_GIFT: Record<string, string> = {
  ELITE: 'encyclopedia_shelf',
  TECH: 'whiteboard',
  ENT: 'easel',
  BIZ: 'world_clock',
  ACTION: 'wooden_sword_rack',
  HIDDEN: 'globe',
  DARK: 'plant',
};

/** 선택지·부탁 결과로 바뀌는 수치 (스탯은 성장 곡선 없이 그대로 더함) */
export type EffectKey = StatKey | 'stress' | 'affection' | 'delinquency' | 'fame' | 'gold' | 'idea' | 'selfEsteem' | 'autonomy';
export type Effect = Partial<Record<EffectKey, number>>;

/** 양육 스타일: 다정 · 엄격 · 자율 */
export type ParentStyle = 'WARM' | 'STRICT' | 'FREE' | 'PROTECT';
export const STYLE_META: Record<ParentStyle, { label: string; emoji: string; desc: string }> = {
  WARM: { label: '다정한', emoji: '🤗', desc: '아이의 마음을 먼저 들어 주는 부모' },
  STRICT: { label: '엄격한', emoji: '📏', desc: '규칙과 책임을 가르치는 부모' },
  FREE: { label: '믿고 맡기는', emoji: '🕊️', desc: '스스로 해 보게 두는 부모' },
  PROTECT: { label: '감싸 주는', emoji: '🛡️', desc: '대신 막아 주고 해결해 주는 부모' },
};

export interface EventChoice {
  label: string;
  style: ParentStyle;
  fx: Effect;
  /** 아이의 반응 */
  reply: string;
  /** 이 선택으로 아이가 부탁을 하게 됨 */
  wish?: string;
  /** 닫혔던 마음이 열려 다시 부탁을 하게 됨 */
  reopenWishes?: boolean;
  /** 게임 플래그 추가 (예: FRIEND_AWAY) */
  flag?: string;
}

export interface ParentingEvent {
  id: string;
  emoji: string;
  title: string;
  /** {name}, {name이}, {name은}, {name을}, {name과} 치환. 함수면 상태에 따라 문장이 달라짐 */
  text: string | ((s: SaveState) => string);
  minAge: number;
  maxAge: number;
  months?: number[];
  cond?: (s: SaveState) => boolean;
  /** 기본 1. 조건이 맞을 때 더 자주 나오게 하려면 키운다 */
  weight?: number;
  choices: EventChoice[];
  /** 여러 달에 걸친 연속 이야기의 한 단계 */
  arc?: { id: string; step: number; variant?: string; final?: boolean; gap?: number };
  /** 선택 직후 추가 처리 (연속 이야기 분기 결과 정하기 등) */
  /** 선택 직후 추가 처리. 문자열을 돌려주면 아이 반응 뒤에 덧붙임 */
  onResolve?: (s: SaveState, style: ParentStyle) => string | void;
  /** 아이 옆에 함께 그릴 손님 스프라이트 */
  visitor?: (s: SaveState) => string | null;
}

export const eventText = (e: ParentingEvent, s: SaveState) => (typeof e.text === 'function' ? e.text(s) : e.text);

/** 예전 선택 기억: '이벤트ID:스타일' */
const mem = (s: SaveState, ...tags: string[]) => tags.some((t) => (s.memories ?? []).includes(t));

const friendHere = (s: SaveState) => !!s.friend && !s.flags.includes('FRIEND_AWAY');

const partTimeCount = (s: SaveState) =>
  Object.entries(s.actionCounts).reduce((a, [k, v]) => a + (k.startsWith('JOB_') ? v : 0), 0);

/** 실제 육아에서 겪을 법한 상황들 (나이대별) */
export const PARENTING_EVENTS: ParentingEvent[] = [
  // ───────── 유년기 (8~11세)
  {
    id: 'C_FRIEND_FIGHT', emoji: '😤', title: '친구랑 싸웠어요', minAge: 8, maxAge: 11,
    text: '{name이} 친구랑 싸웠다며 씩씩대며 들어왔어요. 눈가가 빨개요.',
    choices: [
      { label: '무슨 일인지 끝까지 들어 준다', style: 'WARM', fx: { affection: 5, stress: -8, CHA: 5 }, reply: '...사실 내가 먼저 놀렸어. 내일 사과할래.' },
      { label: '먼저 사과하라고 한다', style: 'STRICT', fx: { MOR: 12, stress: 5, affection: -2 }, reply: '...알았어. 사과할게.' },
      { label: '애들끼리 알아서 하게 둔다', style: 'FREE', fx: { CHA: 4, STR: 3, stress: -3 }, reply: '흥, 다음 주엔 걔랑 다시 놀 거야!' },
    ],
  },
  {
    id: 'C_BROKEN_VASE', emoji: '🏺', title: '깨진 꽃병', minAge: 8, maxAge: 11,
    text: '거실 꽃병이 깨져 있어요. {name은} 모른 척 만화를 보고 있어요.',
    choices: [
      { label: '솔직히 말하면 혼내지 않겠다고 한다', style: 'WARM', fx: { MOR: 15, affection: 3 }, reply: '...공 차다가 깼어요. 죄송해요.' },
      { label: '누가 그랬냐고 엄하게 묻는다', style: 'STRICT', fx: { MOR: 6, stress: 8, affection: -4 }, reply: '(울먹) 내가 그런 거 아니란 말이야...' },
      { label: '조용히 치우고 넘어간다', style: 'FREE', fx: { stress: -2, delinquency: 2 }, reply: '(휴... 안 들켰다)' },
    ],
  },
  {
    id: 'C_HOMEWORK', emoji: '📓', title: '밀린 방학 숙제', minAge: 8, maxAge: 11, months: [2, 8],
    text: '개학 전날 밤 10시. {name이} 방학 숙제를 하나도 안 했대요.',
    choices: [
      { label: '옆에 앉아 같이 한다', style: 'WARM', fx: { INT: 8, ART: 6, affection: 4, stress: 3 }, reply: '엄마 아빠랑 하니까 금방 끝났다!' },
      { label: '다 할 때까지 못 잔다', style: 'STRICT', fx: { INT: 12, MOR: 5, stress: 12 }, reply: '(꾸벅꾸벅) ...다 했어요...' },
      { label: '선생님께 혼나 보는 것도 경험', style: 'FREE', fx: { MOR: 8, stress: -3 }, reply: '선생님한테 혼났어... 다음엔 미리 할래.' },
    ],
  },
  {
    id: 'C_SPARROW', emoji: '🐦', title: '다친 참새', minAge: 8, maxAge: 11,
    text: '{name이} 날개를 다친 참새를 두 손에 감싸 안고 왔어요. "살려 줄 수 있어?"',
    choices: [
      { label: '상자에 집을 만들어 같이 돌본다', style: 'WARM', fx: { MOR: 10, affection: 6, stress: -4 }, reply: '일주일 만에 날아갔어! 잘 가, 짹짹아!' },
      { label: '동물병원에 데려간다', style: 'STRICT', fx: { MOR: 8, INT: 6, gold: -100 }, reply: '수의사 선생님 멋있다... 나도 동물 고쳐 주고 싶어.' },
      { label: '자연은 자연에게 맡기자고 한다', style: 'FREE', fx: { INT: 5, MOR: 3 }, reply: '...그래도 내일 또 보러 가 볼래.' },
    ],
  },
  {
    id: 'C_FEVER', emoji: '🤒', title: '한밤중의 열', minAge: 8, maxAge: 11, weight: 1.5,
    cond: (s) => s.status.stress >= 30,
    text: '새벽 2시, {name이} 열이 펄펄 끓어요. 요즘 너무 무리했나 봐요.',
    choices: [
      { label: '밤새 곁에서 간호한다', style: 'WARM', fx: { stress: -20, affection: 10 }, reply: '(잠결에) ...엄마 아빠 손 시원해서 좋아.' },
      { label: '병원 다녀와서 학교에 보낸다', style: 'STRICT', fx: { stress: 4, MOR: 5, gold: -100 }, reply: '주사 무서웠는데... 안 울었어요.' },
      { label: '하루 학교를 쉬게 한다', style: 'FREE', fx: { stress: -14, affection: 4 }, reply: '오늘은 하루 종일 누워서 만화 봐도 돼?' },
    ],
  },
  {
    id: 'C_DREAM', emoji: '🌟', title: '나 커서 뭐 될까?', minAge: 8, maxAge: 10,
    text: '잠들기 전, {name이} 물어요. "나 커서 뭐가 되면 좋겠어?"',
    choices: [
      { label: '네가 좋아하는 걸 하면 돼', style: 'FREE', fx: { stress: -5, affection: 5, ART: 5 }, reply: '그럼 나 다 해 볼래!' },
      { label: '의사나 변호사 어때?', style: 'STRICT', fx: { INT: 10, stress: 4 }, reply: '음... 그럼 공부 열심히 해야겠네.' },
      { label: '주말에 직업 체험관에 가 보자', style: 'WARM', fx: { gold: -150, CHA: 5, INT: 5, TEC: 5, affection: 4 }, reply: '소방관 옷 입어 봤어! 진짜 멋있었어!' },
    ],
  },
  {
    id: 'C_STAGE_FRIGHT', emoji: '🎭', title: '학예회가 무서워요', minAge: 8, maxAge: 11, months: [10, 11, 12],
    text: '학예회에서 대사를 까먹을까 봐 무섭대요. {name이} 이불 속에 숨었어요.',
    choices: [
      { label: '집에서 같이 연습한다', style: 'WARM', fx: { CHA: 12, ART: 6, affection: 4 }, reply: '(학예회 끝나고) 박수 엄청 많이 받았어!' },
      { label: '틀려도 괜찮다고 말해 준다', style: 'FREE', fx: { stress: -8, CHA: 6 }, reply: '한 줄 까먹었는데... 그냥 웃으니까 다들 웃었어!' },
      { label: '실수하면 안 된다고 다짐시킨다', style: 'STRICT', fx: { CHA: 8, MOR: 4, stress: 10 }, reply: '(덜덜) ...한 글자도 안 틀렸어요.' },
    ],
  },
  {
    id: 'C_SMARTPHONE', emoji: '📱', title: '나만 폰이 없어!', minAge: 10, maxAge: 11,
    text: '"우리 반에서 나만 스마트폰 없단 말이야!" {name이} 발을 동동 굴러요.',
    choices: [
      { label: '사 주고 사용 규칙을 같이 정한다', style: 'WARM', fx: { gold: -400, TEC: 12, affection: 6 }, reply: '하루 1시간! 약속 지킬게!' },
      { label: '중학생 될 때까지는 안 된다', style: 'STRICT', fx: { MOR: 6, INT: 4, affection: -5, stress: 5 }, reply: '...치, 알았어.' },
      { label: '용돈을 모아서 사라고 한다', style: 'FREE', fx: { MOR: 8, TEC: 5 }, reply: '좋아, 저금통 꽉 채울 거야!' },
    ],
  },
  {
    id: 'C_SKIP_ACADEMY', emoji: '📞', title: '학원 선생님의 전화', minAge: 9, maxAge: 11,
    cond: (s) => s.status.stress >= 35,
    text: '"{name이} 오늘 학원에 안 왔어요." 학원 선생님의 전화예요.',
    choices: [
      { label: '왜 빠졌는지 먼저 물어본다', style: 'WARM', fx: { stress: -8, affection: 4 }, reply: '...학원이 너무 힘들어서. 거짓말해서 미안해요.' },
      { label: '크게 혼낸다', style: 'STRICT', fx: { MOR: 10, stress: 10, affection: -6, delinquency: -3 }, reply: '(훌쩍) 다시는 안 그럴게요...' },
      { label: '힘들면 쉬어도 된다고 한다', style: 'FREE', fx: { stress: -14, delinquency: 2 }, reply: '진짜? 고마워! (놀이터로 뛰어감)' },
    ],
  },
  {
    id: 'C_CHRISTMAS', emoji: '🎄', title: '크리스마스 선물', minAge: 8, maxAge: 11, months: [12],
    text: '"산타 할아버지한테 게임기 달라고 편지 쓸 거야!" {name이} 들떠 있어요.',
    choices: [
      { label: '머리맡에 게임기를 몰래 둔다', style: 'WARM', fx: { gold: -300, TEC: 6, affection: 8, stress: -10 }, flag: 'GOT_CONSOLE', reply: '산타 할아버지 진짜 있었어!!!' },
      { label: '책을 선물한다', style: 'STRICT', fx: { INT: 10, affection: -1 }, reply: '...고마워요. (게임기 갖고 싶었는데)' },
      { label: '같이 트리를 꾸미며 하루를 보낸다', style: 'FREE', fx: { ART: 8, MOR: 4, affection: 5 }, reply: '우리 트리가 세상에서 제일 예뻐!' },
    ],
  },
  {
    id: 'C_PARENTS_DAY', emoji: '🌹', title: '어버이날 편지', minAge: 8, maxAge: 12, months: [5],
    text: '{name이} 삐뚤빼뚤 카네이션과 편지를 내밀어요. "사랑해요"가 "사랑헤요"라고 적혀 있어요.',
    choices: [
      { label: '꼭 안아 준다', style: 'WARM', fx: { affection: 8, stress: -6, MOR: 5 }, reply: '헤헤, 내년에도 써 줄게!' },
      { label: '틀린 글자를 고쳐 준다', style: 'STRICT', fx: { INT: 6, affection: -3 }, reply: '...다음엔 안 틀릴게.' },
      { label: '냉장고에 자랑스럽게 붙여 둔다', style: 'FREE', fx: { ART: 6, affection: 5 }, reply: '손님 오면 꼭 보여 줘야 돼!' },
    ],
  },
  {
    id: 'C_BAD_TEST', emoji: '💯', title: '받아쓰기 30점', minAge: 8, maxAge: 10,
    cond: (s) => s.stats.INT < 150 + (s.age - 8) * 60,
    text: '{name이} 받아쓰기 30점짜리 시험지를 가방 깊숙이 숨겨 놨어요.',
    choices: [
      { label: '어디서 틀렸는지 같이 본다', style: 'WARM', fx: { INT: 10, affection: 3 }, reply: '받침이 헷갈렸어... 이제 알겠다!' },
      { label: '매일 받아쓰기 10개씩 연습', style: 'STRICT', fx: { INT: 15, stress: 10 }, reply: '(다음 주) 90점 받았어요!' },
      { label: '다음에 잘하면 된다고 한다', style: 'FREE', fx: { stress: -6, affection: 2 }, reply: '응! 다음엔 50점 받을 거야!' },
    ],
  },
  {
    id: 'C_CHORES', emoji: '🍽️', title: '설거지했어요!', minAge: 8, maxAge: 12,
    text: '"내가 설거지 다 했어! 칭찬해 줘!" 그릇에 아직 거품이 묻어 있어요.',
    choices: [
      { label: '칭찬을 퍼붓는다', style: 'WARM', fx: { affection: 6, MOR: 6 }, reply: '내일은 빨래도 개 줄게!' },
      { label: '거품이 남았다고 다시 하게 한다', style: 'STRICT', fx: { TEC: 8, MOR: 4, affection: -4 }, reply: '...뽀득뽀득. 이제 됐지?' },
      { label: '고맙다며 용돈 500원을 준다', style: 'FREE', fx: { gold: -50, MOR: 4, affection: 3 }, reply: '앗싸! 매일 할래!' },
    ],
  },

  // ───────── 청소년기 (12~16세)
  {
    id: 'T_DOOR_SLAM', emoji: '🚪', title: '쾅! 닫힌 방문', minAge: 12, maxAge: 15,
    text: '"내 방에 들어오지 마!" 사춘기가 시작됐나 봐요. 방문이 쾅 닫혔어요.',
    choices: [
      { label: '노크하고 기다린다', style: 'WARM', fx: { affection: 5, stress: -6 }, reply: '(문틈으로) ...아까는 미안.' },
      { label: '문을 열고 들어가 이야기한다', style: 'STRICT', fx: { MOR: 5, affection: -6, stress: 6 }, reply: '나가라니까!!' },
      { label: '그럴 때라 생각하고 둔다', style: 'FREE', fx: { stress: -4 }, reply: '(이어폰 끼고 음악 듣는 중)' },
    ],
  },
  {
    id: 'T_CRUSH', emoji: '💌', title: '거울 앞의 시간', minAge: 13, maxAge: 16,
    text: '요즘 {name이} 거울 앞에 오래 있어요. 좋아하는 사람이 생긴 것 같아요.',
    choices: [
      { label: '모른 척 응원한다', style: 'FREE', fx: { CHA: 12, stress: -6 }, reply: '(콧노래) ♪~' },
      { label: '공부할 때라고 단속한다', style: 'STRICT', fx: { INT: 8, affection: -6, stress: 6 }, reply: '아무 일도 없거든?!' },
      { label: '편지 쓰는 걸 살짝 도와준다', style: 'WARM', fx: { ART: 8, CHA: 8, affection: 6 }, reply: '(얼굴 빨개짐) 이거 비밀이야!!' },
    ],
  },
  {
    id: 'T_LATE_GAME', emoji: '🎮', title: '새벽 2시의 게임 소리', minAge: 12, maxAge: 16,
    cond: hasScreen, // 컴퓨터·게임기가 있어야
    text: (s) => `새벽 2시인데 {name}의 방에서 ${owns(s, 'gaming_pc', 'dual_monitor', 'stock_monitor', 'broadcast_cam') ? '키보드 두드리는' : '게임기 버튼'} 소리가 들려요.`,
    choices: [
      { label: '같이 한 판 하고 시간 약속을 잡는다', style: 'WARM', fx: { TEC: 6, affection: 5, stress: -4 }, reply: '엄마 아빠 생각보다 잘하네? 11시까지만 할게.' },
      { label: '게임기를 압수한다', style: 'STRICT', fx: { MOR: 6, delinquency: -3, affection: -8, stress: 8 }, reply: '...(말 안 함)' },
      { label: '자기 생활은 스스로 책임지게 둔다', style: 'FREE', fx: { TEC: 8, stress: 6, delinquency: 2 }, reply: '(다음 날 지각) ...알람을 못 들었어.' },
    ],
  },
  {
    id: 'T_SMOKE', emoji: '🚬', title: '옷에 밴 냄새', minAge: 13, maxAge: 16, weight: 2,
    cond: (s) => s.status.delinquency >= 20,
    text: '빨래하려던 {name}의 교복에서 담배 냄새가 나요.',
    choices: [
      { label: '차분하게 이유를 묻는다', style: 'WARM', fx: { delinquency: -10, affection: 3, stress: -4 }, reply: '친구들이 다 해서... 나도 싫었어. 안 할게.' },
      { label: '용돈을 끊고 외출 금지', style: 'STRICT', fx: { delinquency: -6, affection: -8, stress: 12 }, reply: '...(쾅)' },
      { label: '못 본 척한다', style: 'FREE', fx: { delinquency: 6, stress: -3 }, reply: '(눈치 못 챘겠지?)' },
    ],
  },
  {
    id: 'T_BULLY', emoji: '💬', title: '단톡방', minAge: 12, maxAge: 16,
    cond: (s) => s.status.affection >= 40,
    text: '{name이} 힘들게 털어놨어요. 반 단톡방에서 따돌림을 당하고 있대요.',
    choices: [
      { label: '네 편이라고 말하고 함께 방법을 찾는다', style: 'WARM', fx: { stress: -15, affection: 8, CHA: 4 }, reply: '말하길 잘했다... 고마워.' },
      { label: '담임 선생님과 바로 상담한다', style: 'STRICT', fx: { stress: -10, MOR: 6, affection: 3 }, reply: '선생님이 반 분위기를 바꿔 주셨어.' },
      { label: '당당하게 맞서라고 한다', style: 'FREE', fx: { STR: 8, CHA: 6, stress: 6, delinquency: 3 }, reply: '할 말 다 했어. 이제 아무도 못 건드려.' },
    ],
  },
  {
    id: 'T_CLUB', emoji: '🏫', title: '동아리 고민', minAge: 12, maxAge: 14, months: [3, 4],
    text: '"댄스 동아리랑 과학 동아리 중에 뭐 하지?" {name이} 고민 중이에요.',
    choices: [
      { label: '댄스 동아리!', style: 'FREE', fx: { ART: 10, CHA: 10, STR: 5 }, reply: '첫 공연 때 꼭 보러 와!' },
      { label: '과학 동아리가 도움 될 거야', style: 'STRICT', fx: { INT: 10, TEC: 10 }, reply: '로봇 만들기 대회 나간대!' },
      { label: '둘 다 체험해 보고 정하자', style: 'WARM', fx: { ART: 5, INT: 5, CHA: 4, affection: 4 }, reply: '결국... 둘 다 하기로 했어!' },
    ],
  },
  {
    id: 'T_HAIR', emoji: '💇', title: '염색하고 싶어', minAge: 13, maxAge: 16, months: [1, 2, 7, 8],
    text: '"방학 동안만 머리 염색하면 안 돼?" {name이} 사진을 내밀어요.',
    choices: [
      { label: '같이 미용실에 간다', style: 'WARM', fx: { gold: -150, CHA: 12, affection: 8 }, reply: '어때? 잘 어울리지?' },
      { label: '학생이 무슨 염색이냐', style: 'STRICT', fx: { MOR: 6, affection: -6, stress: 4 }, reply: '...다른 애들은 다 하는데.' },
      { label: '개학 전에 되돌리는 조건으로 허락', style: 'FREE', fx: { CHA: 8, stress: -8, MOR: 3 }, reply: '약속! 개학 전날 검정으로 돌릴게.' },
    ],
  },
  {
    id: 'T_PARTTIME', emoji: '🏪', title: '알바 해 보고 싶어', minAge: 15, maxAge: 16,
    text: '"편의점 알바 해 보고 싶어. 내 돈 벌어 보고 싶어!"',
    choices: [
      { label: '주말에만, 귀가 시간 지키기', style: 'WARM', fx: { gold: 150, MOR: 8, affection: 3 }, reply: '첫 월급 타면 치킨 쏠게!' },
      { label: '공부부터 하라고 한다', style: 'STRICT', fx: { INT: 8, affection: -4 }, reply: '...알았어.' },
      { label: '좋은 경험이니 해 보라고 한다', style: 'FREE', fx: { gold: 300, MOR: 5, STR: 5, stress: 6 }, reply: '손님 응대 생각보다 어렵다...' },
    ],
  },
  {
    id: 'T_EXAM_TEARS', emoji: '😢', title: '시험 기간의 눈물', minAge: 12, maxAge: 16, months: [4, 6, 10, 12], weight: 2,
    cond: (s) => s.status.stress >= 45,
    text: '시험 기간. {name이} 밤새 책상에 엎드려 울면서 공부하고 있어요.',
    choices: [
      { label: '야식을 만들어 주고 토닥인다', style: 'WARM', fx: { stress: -15, affection: 6 }, reply: '(라면 먹으며) ...조금 힘이 난다.' },
      { label: '조금만 더 힘내자고 한다', style: 'STRICT', fx: { INT: 12, stress: 8 }, reply: '...응. 끝까지 해 볼게.' },
      { label: '시험 끝나면 놀이공원 가자', style: 'FREE', fx: { stress: -10, gold: -200, affection: 4 }, reply: '진짜지? 약속했다!' },
    ],
  },
  {
    id: 'T_YOUTUBE', emoji: '📹', title: '유튜버가 될래', minAge: 13, maxAge: 16,
    cond: (s) => s.stats.CHA >= 200,
    text: '"나 유튜브 채널 만들 거야! 구독자 백만 명 찍을 거야!"',
    choices: [
      { label: '응원하며 장비를 알아봐 준다', style: 'WARM', fx: { CHA: 8, TEC: 6, affection: 6 }, reply: '조명만 있으면 완벽할 텐데...', wish: 'W_RINGLIGHT' },
      { label: '얼굴 공개는 안 된다', style: 'STRICT', fx: { TEC: 6, MOR: 4, affection: -2 }, reply: '그럼 손만 나오는 요리 채널 해야지.' },
      { label: '알아서 해 보라고 한다', style: 'FREE', fx: { CHA: 6, TEC: 6, fame: 3, stress: 3 }, reply: '첫 영상 조회수 12! (그중 10번은 나)' },
    ],
  },
  {
    id: 'T_SLEEPOVER', emoji: '🌙', title: '처음 듣는 친구 이름', minAge: 13, maxAge: 16,
    cond: (s) => s.status.delinquency >= 10,
    text: '"오늘 친구 집에서 자고 올게." 그런데 처음 듣는 이름이에요.',
    choices: [
      { label: '그 친구를 우리 집에 초대하자고 한다', style: 'WARM', fx: { CHA: 6, delinquency: -4, affection: 5, gold: -100 }, reply: '걔 생각보다 착하지? 엄마 아빠가 해 준 떡볶이 맛있대.' },
      { label: '친구 부모님께 전화로 확인한다', style: 'STRICT', fx: { delinquency: -6, affection: -4 }, reply: '...창피하게 왜 전화해!' },
      { label: '믿고 보낸다', style: 'FREE', fx: { affection: 4, delinquency: 5, stress: -8 }, reply: '(다음 날 아침) 다녀왔습니다~' },
    ],
  },
  {
    id: 'T_BODY', emoji: '🌱', title: '몸이 이상해', minAge: 12, maxAge: 14,
    text: '"나 요즘 좀 이상한 것 같아..." {name이} 몸이 변하는 게 고민이래요.',
    choices: [
      { label: '솔직하고 차분하게 설명해 준다', style: 'WARM', fx: { stress: -10, affection: 8, MOR: 5 }, reply: '다들 그런 거구나. 이제 안 무서워.' },
      { label: '좋은 책을 건네준다', style: 'STRICT', fx: { INT: 8, stress: -4 }, reply: '(책 읽는 중) ...아하.' },
      { label: '보건 선생님께 여쭤보라고 한다', style: 'FREE', fx: { stress: -2, CHA: 3 }, reply: '...알았어. 물어볼게.' },
    ],
  },
  {
    id: 'T_FIGHT_PARENT', emoji: '💥', title: '"엄마 아빠가 뭘 알아!"', minAge: 14, maxAge: 16,
    cond: (s) => s.status.stress >= 40 || s.status.affection < 50,
    text: '저녁 식탁에서 말다툼이 났어요. {name이} "엄마 아빠가 뭘 알아!"라고 소리쳤어요.',
    choices: [
      { label: '먼저 사과하고 마음을 묻는다', style: 'WARM', fx: { affection: 8, stress: -10 }, reply: '...나도 소리 질러서 미안해.' },
      { label: '예의 없는 말버릇을 따끔하게 혼낸다', style: 'STRICT', fx: { MOR: 8, affection: -8, stress: 8 }, reply: '(방문 쾅)' },
      { label: '서로 진정할 시간을 갖는다', style: 'FREE', fx: { stress: -5, affection: 2 }, reply: '(밤에 쪽지) 아까는 미안. 사실 학교에서 속상한 일 있었어.' },
    ],
  },

  // ───────── 청년기 (17~19세)
  {
    id: 'Y_ART_SCHOOL', emoji: '🎨', title: '폭탄선언', minAge: 17, maxAge: 18,
    cond: (s) => s.stats.ART >= 300,
    text: '"나 미대 갈래. 그림 그리는 게 제일 행복해." {name}의 폭탄선언!',
    choices: [
      { label: '네 꿈을 응원한다', style: 'WARM', fx: { ART: 15, stress: -10, affection: 8 }, reply: '고마워... 진짜 열심히 할게.' },
      { label: '안정적인 길로 가라고 설득한다', style: 'STRICT', fx: { INT: 12, stress: 12, affection: -8 }, reply: '...생각해 볼게.' },
      { label: '1년 해 보고 다시 이야기하자', style: 'FREE', fx: { ART: 8, INT: 6, MOR: 4 }, reply: '좋아. 결과로 보여 줄게.' },
    ],
  },
  {
    id: 'Y_SUNEUNG', emoji: '📝', title: '수능 전날 밤', minAge: 19, maxAge: 19, months: [11],
    text: '수능 전날 밤. {name이} 잠을 못 이루고 거실을 서성여요.',
    choices: [
      { label: '따뜻한 우유를 건네며 괜찮다고 한다', style: 'WARM', fx: { stress: -20, affection: 8 }, reply: '...그동안 고마웠어. 잘 보고 올게.' },
      { label: '마지막으로 오답 노트를 같이 본다', style: 'STRICT', fx: { INT: 15, stress: 10 }, reply: '이 문제 나오면 무조건 맞힌다!' },
      { label: '동네를 한 바퀴 같이 걷는다', style: 'FREE', fx: { stress: -12, STR: 4, affection: 4 }, reply: '바람 쐬니까 좀 낫다.' },
    ],
  },
  {
    id: 'Y_FIRST_PAY', emoji: '🎁', title: '첫 월급 선물', minAge: 17, maxAge: 19,
    cond: (s) => partTimeCount(s) >= 6,
    text: '{name이} 알바비로 산 선물을 쑥스럽게 내밀어요. "그동안 고마워서..."',
    choices: [
      { label: '고맙다며 꼭 안아 준다', style: 'WARM', fx: { affection: 10, MOR: 8 }, reply: '울지 마~ 나도 울잖아...' },
      { label: '돈은 저축하라고 한다', style: 'STRICT', fx: { gold: 200, MOR: 4, affection: -2 }, reply: '...알았어. 그래도 받아 줘.' },
      { label: '같이 맛있는 걸 먹으러 간다', style: 'FREE', fx: { affection: 6, stress: -10, gold: -100 }, reply: '오늘은 내가 쏠게! 아, 반반 할까?' },
    ],
  },
  {
    id: 'Y_BURNOUT', emoji: '🕯️', title: '다 그만두고 싶어', minAge: 16, maxAge: 19, weight: 2,
    cond: (s) => s.status.stress >= 55,
    text: '"다 그만두고 싶어..." {name이} 많이 지쳐 보여요.',
    choices: [
      { label: '푹 쉬자고 한다', style: 'WARM', fx: { stress: -28, affection: 6 }, reply: '...고마워. 조금만 쉬면 다시 할 수 있을 것 같아.' },
      { label: '여기서 포기하면 후회한다고 한다', style: 'STRICT', fx: { MOR: 10, INT: 6, stress: 10 }, reply: '...알아. 알고 있어.' },
      { label: '혼자 여행을 다녀오라고 한다', style: 'FREE', fx: { gold: -300, stress: -25, STR: 5, CHA: 5 }, reply: '바다 보고 왔어. 머리가 맑아졌어.' },
    ],
  },
  {
    id: 'Y_LICENSE', emoji: '🚗', title: '운전면허', minAge: 19, maxAge: 19, months: [12],
    text: (s) => (notPoor(s) ? '"수능도 끝났으니 운전면허 따고 싶어. 엄마 아빠 태우고 드라이브 갈래!"' : '"수능도 끝났으니 운전면허 따고 싶어. 나중에 차 사면 엄마 아빠 제일 먼저 태워 줄게!"'),
    choices: [
      { label: '학원비를 지원해 준다', style: 'WARM', fx: { gold: -400, TEC: 10, STR: 5, affection: 4 }, reply: '한 번에 합격! 면허증 사진 봐 봐, 잘 나왔지?' },
      { label: '시험 끝나고 따라고 한다', style: 'STRICT', fx: { INT: 6, affection: -2 }, reply: '...알았어. 그때 꼭 따게 해 줘.' },
      { label: '직접 돈 벌어서 따라고 한다', style: 'FREE', fx: { MOR: 8, TEC: 5 }, reply: '알바비 모아서 땄어! 내 힘으로!' },
    ],
  },
  {
    // 19세 = 고3 (졸업식은 게임이 끝난 뒤인 다음 해 2월) → 고3 봄의 졸업 앨범 촬영
    id: 'Y_GRADUATION', emoji: '🎓', title: '졸업 앨범 촬영', minAge: 19, maxAge: 19, months: [5, 6],
    text: '오늘은 {name}의 고등학교 졸업 앨범 촬영 날이에요. 아침부터 거울 앞을 떠나질 않아요.',
    choices: [
      { label: '새 옷을 한 벌 사 준다', style: 'WARM', fx: { affection: 10, stress: -10, gold: -100 }, reply: '사진 진짜 잘 나왔어! 친구들이 옷 어디서 샀냐고 물어봤어!' },
      { label: '앞으로를 위한 조언을 건넨다', style: 'STRICT', fx: { MOR: 6, INT: 6 }, reply: '...명심할게. 진짜 졸업이 얼마 안 남았네.' },
      { label: '친구들과 놀다 오라고 한다', style: 'FREE', fx: { CHA: 6, stress: -8 }, reply: '촬영 끝나고 다 같이 노래방 갔다 왔어!' },
    ],
  },
  {
    id: 'Y_CURFEW', emoji: '🕛', title: '자정이 넘었는데', minAge: 17, maxAge: 19,
    text: '밤 12시가 넘었는데 {name이} 아직 안 들어왔어요. 전화도 안 받아요.',
    choices: [
      { label: '데리러 간다', style: 'WARM', fx: { affection: 5, delinquency: -3 }, reply: '배터리가 나갔어... 걱정시켜서 미안.' },
      { label: '통금을 한 시간 앞당긴다', style: 'STRICT', fx: { delinquency: -5, affection: -6, MOR: 5 }, reply: '나 이제 열여덟이라고!' },
      { label: '다 컸으니 믿고 기다린다', style: 'FREE', fx: { affection: 3, delinquency: 4, CHA: 5 }, reply: '(새벽 1시) 다녀왔어... 미안.' },
    ],
  },
  {
    id: 'Y_VOLUNTEER', emoji: '🤝', title: '봉사 활동', minAge: 16, maxAge: 19,
    cond: (s) => s.stats.MOR >= 250,
    text: '"주말마다 보육원에 봉사 활동 가 보려고."',
    choices: [
      { label: '같이 간다', style: 'WARM', fx: { MOR: 15, affection: 6, STR: 4 }, reply: '애들이 엄마 아빠 좋아하더라!' },
      { label: '스펙에도 좋으니 꾸준히 하라고 한다', style: 'STRICT', fx: { MOR: 10, INT: 4 }, reply: '스펙 때문 아니거든... 그래도 꾸준히 할게.' },
      { label: '네 뜻대로 하라고 한다', style: 'FREE', fx: { MOR: 12, CHA: 4 }, reply: '애들이 다음 주에도 오래!' },
    ],
  },

  // ───────── 명절 (모든 나이)
  {
    id: 'A_HOLIDAY_MONEY', emoji: '🧧', title: '명절 용돈', minAge: 8, maxAge: 16, months: [1, 2, 9],
    text: '할머니 댁에서 {name이} 용돈 봉투를 두둑하게 받아 왔어요.',
    choices: [
      { label: '반은 저금, 반은 쓰고 싶은 데 쓰기', style: 'WARM', fx: { gold: 200, MOR: 3, affection: 3 }, reply: '반은 저금통, 반은 떡볶이!' },
      { label: '전부 통장에 저금한다', style: 'STRICT', fx: { gold: 300, MOR: 5, affection: -2 }, reply: '...통장 숫자가 늘어나는 건 좋다.' },
      { label: '네 돈이니 네가 알아서', style: 'FREE', fx: { stress: -10, affection: 4, gold: 100 }, reply: '앗싸! 문구점 털러 가자!' },
    ],
  },

  // ───────── 부모 직업 (우리 집만의 상황)
  {
    id: 'P_DOCTOR', emoji: '🩺', title: '엄마 아빠의 병원', minAge: 9, maxAge: 13, weight: 2,
    cond: (s) => s.parent?.job === 'DOCTOR',
    text: '"엄마 아빠 일하는 병원에 따라가 보고 싶어! 청진기 진짜로 해 봐도 돼?"',
    choices: [
      { label: '쉬는 날 병원 견학을 시켜 준다', style: 'WARM', fx: { INT: 8, MOR: 6, affection: 5 }, reply: '심장 소리 들었어! 쿵쿵 진짜 빨라!' },
      { label: '병원은 위험하다며 의학책을 건넨다', style: 'STRICT', fx: { INT: 10, affection: -3 }, reply: '...그림이 좀 무섭긴 한데 재밌다.' },
      { label: '장난감 청진기로 병원 놀이를 한다', style: 'FREE', fx: { CHA: 5, stress: -6, affection: 4 }, reply: '환자분~ 어디가 아프세요? 사탕 처방이에요!' },
    ],
  },
  {
    id: 'P_PROFESSOR', emoji: '🎓', title: '연구실 구경', minAge: 10, maxAge: 15, weight: 2,
    cond: (s) => s.parent?.job === 'PROFESSOR',
    text: '"엄마 아빠 대학교 연구실에 가 보고 싶어. 대학생 언니 오빠들은 뭐 해?"',
    choices: [
      { label: '강의를 맨 뒷자리에서 듣게 해 준다', style: 'WARM', fx: { INT: 10, CHA: 3, affection: 5 }, reply: '하나도 못 알아들었는데... 멋있었어!' },
      { label: '대학은 공부를 열심히 해야 갈 수 있다고 한다', style: 'STRICT', fx: { INT: 8, MOR: 3, stress: 5 }, reply: '...그럼 오늘부터 열심히 해 볼게.' },
      { label: '캠퍼스 잔디밭에서 같이 도시락을 먹는다', style: 'FREE', fx: { stress: -8, affection: 6 }, reply: '대학교는 공원 같다! 나중에 꼭 다닐래.' },
    ],
  },
  {
    id: 'P_ARTIST', emoji: '🎨', title: '"그림으론 돈 못 번대"', minAge: 8, maxAge: 12, weight: 2,
    cond: (s) => s.parent?.job === 'ARTIST',
    text: '{name이} 시무룩해요. "친구가 그러는데... 엄마 아빠처럼 그림 그리면 돈 못 번대."',
    choices: [
      { label: '좋아하는 일을 하는 행복을 이야기해 준다', style: 'WARM', fx: { ART: 6, affection: 8, stress: -5 }, reply: '...그럼 우리 집은 행복 부자네!' },
      { label: '현실도 중요하다고 솔직하게 말한다', style: 'STRICT', fx: { INT: 6, MOR: 5, affection: -2 }, reply: '그래서 엄마 아빠가 밤늦게까지 일하는 거구나.' },
      { label: '작업실에서 같이 그림을 그린다', style: 'FREE', fx: { ART: 12, stress: -4 }, reply: '내 그림이 엄마 아빠 그림 옆에 걸렸어!' },
    ],
  },
  {
    id: 'P_COACH', emoji: '🏃', title: '새벽 6시 조깅', minAge: 8, maxAge: 12, weight: 2,
    cond: (s) => s.parent?.job === 'COACH',
    text: '주말 아침 6시. 운동화를 신고 {name}의 방문을 열었어요. "조깅 가자!" "...으으응..."',
    choices: [
      { label: '천천히 걸으면서 이야기만 하자고 한다', style: 'WARM', fx: { STR: 6, affection: 6, stress: -4 }, reply: '해 뜨는 거 처음 봤어. 예쁘다...' },
      { label: '이불을 걷고 끌고 나간다', style: 'STRICT', fx: { STR: 12, MOR: 3, stress: 8, affection: -4 }, reply: '(헉헉) ...다음 주에도 가는 거야...?' },
      { label: '오늘은 푹 자게 둔다', style: 'FREE', fx: { stress: -10, affection: 3 }, reply: '(쿨쿨) ...음냐... 다음 주에 갈게...' },
    ],
  },
  {
    id: 'P_CHEF', emoji: '🍳', title: '나도 요리할래!', minAge: 9, maxAge: 14, weight: 2,
    cond: (s) => s.parent?.job === 'CHEF',
    text: '"나도 엄마 아빠처럼 요리하고 싶어! 칼 써 봐도 돼?"',
    choices: [
      { label: '옆에서 손을 잡고 같이 한다', style: 'WARM', fx: { TEC: 8, affection: 6 }, reply: '내가 썬 당근 들어간 카레! 세상에서 제일 맛있어!' },
      { label: '칼질 기본기부터 연습시킨다', style: 'STRICT', fx: { TEC: 12, MOR: 3, stress: 5 }, reply: '감자 열 개 깎았어... 손목 아파...' },
      { label: '마음대로 해 보라고 부엌을 내준다', style: 'FREE', fx: { TEC: 6, ART: 6, stress: -5 }, reply: '(부엌 엉망) ...맛은 있지? 그치?' },
    ],
  },
  {
    id: 'P_DEVELOPER', emoji: '💻', title: '엄마 아빠는 무슨 일 해?', minAge: 10, maxAge: 15, weight: 2,
    cond: (s) => s.parent?.job === 'DEVELOPER',
    text: '"엄마 아빠는 컴퓨터로 맨날 뭐 해? 게임 만드는 거야?"',
    choices: [
      { label: '간단한 코딩을 같이 해 본다', style: 'WARM', fx: { TEC: 10, INT: 4, affection: 5 }, reply: '내가 쓴 글자가 화면에서 움직여! 마법 같아!' },
      { label: '수학을 잘해야 한다고 알려 준다', style: 'STRICT', fx: { INT: 10, stress: 5 }, reply: '수학이랑 컴퓨터가 친구였구나...' },
      { label: '옛날 컴퓨터를 분해하게 해 준다', style: 'FREE', fx: { TEC: 12, stress: -3 }, reply: '나사가 47개 나왔어! ...다시 조립은 못 하겠어.' },
    ],
  },
  {
    id: 'P_OFFICE', emoji: '🌙', title: '왜 맨날 늦게 와?', minAge: 8, maxAge: 12, weight: 2,
    cond: (s) => s.parent?.job === 'OFFICE',
    text: '야근하고 밤늦게 들어오자, 아직 안 잔 {name이} 물어요. "엄마 아빠는 왜 맨날 늦게 와?"',
    choices: [
      { label: '미안하다며 이번 주말은 꼭 함께 보내자고 한다', style: 'WARM', fx: { affection: 8, stress: -6 }, reply: '약속! 새끼손가락 걸어!' },
      { label: '우리 가족을 위해 일하는 거라고 설명한다', style: 'STRICT', fx: { MOR: 8, affection: -2 }, reply: '...알아. 그래도 보고 싶었어.' },
      { label: '내일부터 점심시간에 영상 통화하자고 한다', style: 'FREE', fx: { affection: 5, CHA: 4 }, reply: '내일 12시! 알람 맞춰 놨어!' },
    ],
  },
  {
    id: 'P_SHOP', emoji: '🏪', title: '가게 일 도울래!', minAge: 8, maxAge: 13, weight: 2,
    cond: (s) => s.parent?.job === 'SHOP',
    text: '"나도 가게에서 손님한테 인사하고 계산해 볼래!"',
    choices: [
      { label: '앞치마를 입혀 같이 가게를 본다', style: 'WARM', fx: { CHA: 8, MOR: 4, affection: 5 }, reply: '단골 할머니가 사탕 주셨어!' },
      { label: '거스름돈 계산부터 정확히 하게 한다', style: 'STRICT', fx: { INT: 8, TEC: 4, stress: 4 }, reply: '3천 원 내셨으니까... 1,200원! 맞지?' },
      { label: '하고 싶은 만큼만 하라고 한다', style: 'FREE', fx: { CHA: 6, gold: 50, stress: -3 }, reply: '용돈 벌었다! 오늘 장사 잘됐어!' },
    ],
  },

  // ───────── 집안 형편 (계층별)
  {
    id: 'K_RICH', emoji: '💎', title: '과외 선생님만 다섯 명', minAge: 10, maxAge: 15, weight: 2,
    cond: (s) => parentClass(s.parent) === 'RICH',
    text: '수학, 영어, 피아노, 골프, 중국어... {name이} 지친 얼굴로 말해요. "나도 친구들이랑 놀이터 가고 싶어."',
    choices: [
      { label: '과외를 몇 개 줄이고 놀 시간을 준다', style: 'WARM', fx: { stress: -15, affection: 8, CHA: 4 }, reply: '진짜?! 오늘 처음으로 떡볶이 사 먹어 봤어!' },
      { label: '지금 고생해야 나중에 편하다고 한다', style: 'STRICT', fx: { INT: 12, TEC: 6, stress: 12, affection: -5 }, reply: '...나중은 언제 오는데?' },
      { label: '무엇을 계속할지 직접 고르게 한다', style: 'FREE', fx: { stress: -8, MOR: 5, ART: 5 }, reply: '피아노만 남길래. 그건 진짜 좋아하거든.' },
    ],
  },
  {
    id: 'K_MIDDLE', emoji: '🍖', title: '주말 가족 외식', minAge: 8, maxAge: 16, weight: 1.5,
    cond: (s) => parentClass(s.parent) === 'MIDDLE',
    text: '이번 주말은 한 달에 한 번 가족 외식 날! "오늘은 내가 메뉴 고를래!"',
    choices: [
      { label: '아이가 고른 곳으로 간다', style: 'WARM', fx: { affection: 6, stress: -6, gold: -100 }, reply: '돈가스 최고! 다음 달에도 여기 오자!' },
      { label: '골고루 먹을 수 있는 한식집으로', style: 'STRICT', fx: { STR: 4, MOR: 3, gold: -80 }, reply: '...나물도 먹었어. 칭찬해 줘.' },
      { label: '집에서 같이 요리해 먹자고 한다', style: 'FREE', fx: { TEC: 6, affection: 4 }, reply: '내가 만든 김밥이 제일 맛있다!' },
    ],
  },
  {
    id: 'K_WORKING', emoji: '🔑', title: '혼자 기다리는 저녁', minAge: 8, maxAge: 13, weight: 2,
    cond: (s) => parentClass(s.parent) === 'WORKING',
    text: '일이 늦게 끝나 밤 9시에 들어왔어요. {name이} 식탁에 라면 두 개를 끓여 놓고 기다리고 있었어요.',
    choices: [
      { label: '꼭 안아 주고 같이 라면을 먹는다', style: 'WARM', fx: { affection: 10, stress: -6 }, reply: '불었지? 그래도 같이 먹으니까 맛있다.' },
      { label: '불 쓰면 위험하다고 주의를 준다', style: 'STRICT', fx: { MOR: 6, TEC: 3, affection: -3 }, reply: '...조심했단 말이야. 다음엔 전자레인지 쓸게.' },
      { label: '"다 컸네!" 하고 칭찬해 준다', style: 'FREE', fx: { TEC: 5, CHA: 3, affection: 5 }, reply: '헤헤. 내일은 계란도 넣어 볼게!' },
    ],
  },
  {
    id: 'K_POOR', emoji: '🚌', title: '수학여행비', minAge: 12, maxAge: 17, weight: 2.5,
    cond: (s) => parentClass(s.parent) === 'POOR',
    text: '가정통신문에 수학여행비 30만 원. {name이} 종이를 슬쩍 구겨 가방에 넣는 걸 봤어요. "...나 안 가도 돼."',
    choices: [
      { label: '무리해서라도 보내 준다', style: 'WARM', fx: { gold: -300, affection: 10, CHA: 5, stress: -8 }, reply: '(공항에서 문자) 고마워. 진짜 진짜 고마워. 사진 많이 찍어 올게.' },
      { label: '형편을 솔직하게 이야기하고 함께 방법을 찾는다', style: 'STRICT', fx: { MOR: 10, INT: 4, affection: 3 }, reply: '학교에 지원 제도가 있대! 선생님이 도와주신대.' },
      { label: '아이가 알바로 보태겠다는 걸 허락한다', style: 'FREE', fx: { gold: -100, TEC: 5, MOR: 6, stress: 4 }, reply: '전단지 돌려서 반은 내가 냈어! 나 좀 멋있지?' },
    ],
  },

  // ───────── 이전 판에 키운 아이가 어른이 되어 찾아온다
  {
    id: 'V_VISIT', emoji: '🎁', title: '어른이 된 첫째의 방문', minAge: 9, maxAge: 13, weight: 8,
    cond: (s) => !!s.prevChild,
    visitor: (s) => (s.prevChild ? `JOB_${s.prevChild.endingId}_${s.prevChild.gender}` : null),
    text: (s) => {
      const p = s.prevChild!;
      const t = ENDING_TITLE[p.endingId] ?? '어른';
      return `띵동! 현관에 ${p.name}${hasBatchim(p.name) ? '이' : '가'} 서 있어요. ${josa(t, '이', '가')} 된 첫째가 커다란 선물 상자를 들고 동생을 보러 왔대요!`;
    },
    choices: [
      { label: '저녁을 차려 다 같이 먹는다', style: 'WARM', fx: { affection: 6, stress: -8 }, reply: '우와... 나도 크면 저렇게 멋있어질 거야!' },
      { label: '동생에게 해 줄 조언을 부탁한다', style: 'STRICT', fx: { INT: 6, MOR: 6 }, reply: '엄마 아빠 말씀 잘 들으래. ...근데 다 듣진 말래! ㅋㅋ' },
      { label: '둘이 실컷 놀게 둔다', style: 'FREE', fx: { CHA: 6, stress: -12 }, reply: '하루 종일 같이 놀았어! 다음에 또 온대!' },
    ],
    onResolve: (s) => {
      const p = s.prevChild!;
      const fid = VISIT_GIFT[ENDING_CATEGORY[p.endingId] ?? 'BIZ'] ?? 'plant';
      s.inventory.push(fid);
      if (!s.collectedFurniture.includes(fid)) s.collectedFurniture.push(fid);
      s.prevChild = undefined; // 한 판에 한 번
      return `(🎁 첫째가 쓰던 가구를 선물로 받았다! → 방꾸미기 창고)`;
    },
  },

  // ───────── 단짝 친구
  {
    id: 'F_SLEEPOVER', emoji: '🛌', title: '단짝네서 자고 올래', minAge: 9, maxAge: 12, weight: 1.5,
    cond: friendHere,
    text: '"{friend}네 집에서 자고 와도 돼? 응? 제발~"',
    choices: [
      { label: '과일 바구니를 들려 보낸다', style: 'WARM', fx: { CHA: 6, affection: 4, gold: -50 }, reply: '{friend}네 엄마가 예의 바르다고 칭찬했어!' },
      { label: '아직은 이르다고 한다', style: 'STRICT', fx: { MOR: 3, affection: -4 }, reply: '...다른 애들은 다 가는데.' },
      { label: '{friend}를 우리 집으로 초대하자', style: 'FREE', fx: { CHA: 8, affection: 3, gold: -100 }, reply: '밤새 베개 싸움 했어! 최고의 날이야!' },
    ],
  },
  {
    id: 'F_MOVING', emoji: '🚚', title: '단짝의 전학', minAge: 10, maxAge: 11, weight: 1.2,
    cond: friendHere,
    text: '{name이} 울면서 들어왔어요. "{friend}가 다음 주에 멀리 전학 간대..."',
    choices: [
      { label: '작별 편지 쓰는 걸 도와준다', style: 'WARM', fx: { ART: 8, affection: 6, stress: -5 }, reply: '편지에 우리 집 주소 적었어. 꼭 답장 준대.', flag: 'FRIEND_AWAY' },
      { label: '새 친구를 사귀면 된다고 한다', style: 'STRICT', fx: { CHA: 5, stress: 6, affection: -2 }, reply: '...{friend} 같은 애는 없단 말이야.', flag: 'FRIEND_AWAY' },
      { label: '마지막 날 실컷 놀게 해 준다', style: 'FREE', fx: { stress: -10, STR: 4, affection: 3 }, reply: '놀이공원에서 사진 100장 찍었어!', flag: 'FRIEND_AWAY' },
    ],
  },
  {
    id: 'F_TEEN_FIGHT', emoji: '💔', title: '단짝과의 냉전', minAge: 13, maxAge: 16, weight: 1.5,
    cond: friendHere,
    text: '{friend}랑 크게 싸웠대요. 일주일째 말을 안 한다는데, 화해하는 법을 모르겠대요.',
    choices: [
      { label: '내 친구와 화해했던 이야기를 해 준다', style: 'WARM', fx: { CHA: 6, affection: 6, stress: -6 }, reply: '...먼저 연락해 볼게. 엄마 아빠도 그랬구나.' },
      { label: '잘못한 게 있으면 먼저 사과하라고 한다', style: 'STRICT', fx: { MOR: 8, stress: 4 }, reply: '내가 먼저 사과했어. 걔도 미안하대.' },
      { label: '시간이 해결해 줄 거라고 한다', style: 'FREE', fx: { stress: -4, CHA: 3 }, reply: '(일주일 뒤) 급식실에서 자연스럽게 화해했어 ㅋㅋ' },
    ],
  },
  {
    id: 'F_REUNION', emoji: '📲', title: '다시 만난 단짝', minAge: 16, maxAge: 19, weight: 2,
    cond: (s) => !!s.friend && s.flags.includes('FRIEND_AWAY'),
    text: '"엄마 아빠! SNS에서 {friend}를 찾았어! 초등학교 때 전학 간 {friend} 기억나?"',
    choices: [
      { label: '이번 방학에 만나러 다녀오라고 한다', style: 'WARM', fx: { affection: 6, CHA: 6, stress: -10, gold: -200 }, reply: '하나도 안 변했어! 아니, 키는 엄청 컸어!' },
      { label: '시험 끝나고 만나라고 한다', style: 'STRICT', fx: { INT: 5, affection: -2 }, reply: '...응. 시험 끝나는 날 만나기로 했어.' },
      { label: '반갑겠다~ 실컷 연락해', style: 'FREE', fx: { CHA: 5, stress: -6 }, reply: '밤새 통화했어. 걔도 나 보고 싶었대!' },
    ],
  },

  // ───────── 기억: 예전에 했던 선택이 몇 년 뒤 돌아온다
  {
    id: 'M_VASE_WARM', emoji: '🏺', title: '그때 그 꽃병', minAge: 13, maxAge: 17, weight: 3,
    cond: (s) => mem(s, 'C_BROKEN_VASE:WARM'),
    text: '{name이} 불쑥 말해요. "어릴 때 꽃병 깬 거 기억나? 그때 혼내지 않아서... 그 뒤로 솔직하게 말하는 게 하나도 안 무서웠어."',
    choices: [
      { label: '그때 솔직하게 말해 줘서 고마웠어', style: 'WARM', fx: { affection: 8, MOR: 5 }, reply: '앞으로도 뭐든 말할게.' },
      { label: '앞으로도 지금처럼 정직하게 살자', style: 'STRICT', fx: { MOR: 8, affection: 4 }, reply: '응. 약속.' },
      { label: '근데 그 꽃병 꽤 비쌌다?', style: 'FREE', fx: { affection: 5, CHA: 3 }, reply: '헉... 알바비로 갚을게! ㅋㅋ' },
    ],
  },
  {
    id: 'M_VASE_STRICT', emoji: '🏺', title: '늦은 고백', minAge: 13, maxAge: 17, weight: 3,
    cond: (s) => mem(s, 'C_BROKEN_VASE:STRICT'),
    text: '"어릴 때 꽃병 기억나? 사실 그거 내가 깼어. 그때 너무 무서워서 말을 못 했어..."',
    choices: [
      { label: '말해 줘서 고마워. 그때 무섭게 해서 미안해', style: 'WARM', fx: { affection: 10, stress: -5, MOR: 5 }, reply: '...나도 미안해. 이제 다 털어놔서 시원하다.' },
      { label: '거짓말은 나쁜 거야', style: 'STRICT', fx: { MOR: 6, affection: -4 }, reply: '...그러니까 이제라도 말한 거잖아.' },
      { label: '다 지난 일이지 뭐', style: 'FREE', fx: { affection: 4, stress: -3 }, reply: '헤헤, 그치?' },
    ],
  },
  {
    id: 'M_SPARROW', emoji: '🐦', title: '그 참새 기억나?', minAge: 14, maxAge: 19, weight: 3,
    cond: (s) => mem(s, 'C_SPARROW:WARM', 'C_SPARROW:STRICT'),
    text: '"어릴 때 그 참새 기억나? 그때부터 아픈 동물을 보면 그냥 못 지나치겠어."',
    choices: [
      { label: '넌 마음이 참 따뜻한 아이야', style: 'WARM', fx: { MOR: 8, affection: 5 }, reply: '엄마 아빠 닮아서 그래.' },
      { label: '그 마음으로 수의사를 해 보는 건 어때?', style: 'STRICT', fx: { INT: 6, MOR: 4 }, reply: '수의사... 생각해 볼게!' },
      { label: '네 마음 가는 대로 해', style: 'FREE', fx: { MOR: 6, CHA: 2 }, reply: '이번 주에 유기견 보호소 가 보려고.' },
    ],
  },
  {
    id: 'M_FEVER', emoji: '🌙', title: '잡아 준 손', minAge: 14, maxAge: 19, weight: 3,
    cond: (s) => mem(s, 'C_FEVER:WARM'),
    text: '"나 어릴 때 열났을 때 밤새 손 잡아 준 거... 아직도 기억나."',
    choices: [
      { label: '너도 아프면 언제든 말해', style: 'WARM', fx: { affection: 10, stress: -8 }, reply: '...응. 이제 내가 간호해 줄 차례야.' },
      { label: '이제 건강 관리는 스스로 해야지', style: 'STRICT', fx: { STR: 6, MOR: 4 }, reply: '알지~ 요즘 운동도 해.' },
      { label: '기억력 좋네~', style: 'FREE', fx: { affection: 5 }, reply: '그런 건 안 잊어버려.' },
    ],
  },
  {
    id: 'M_DREAM_FREE', emoji: '🌟', title: '좋아하는 걸 하라던 말', minAge: 17, maxAge: 19, weight: 3,
    cond: (s) => mem(s, 'C_DREAM:FREE'),
    text: '"어릴 때 커서 뭐 될지 물었을 때 \'좋아하는 거 하면 돼\'라고 했던 거 기억나? 그 말 덕분에 여기까지 왔어."',
    choices: [
      { label: '지금도 그 생각엔 변함없어', style: 'FREE', fx: { stress: -10, affection: 6 }, reply: '고마워. 끝까지 가 볼게.' },
      { label: '대신 책임도 네 몫이야', style: 'STRICT', fx: { MOR: 6, INT: 4 }, reply: '응, 알아.' },
      { label: '네가 자랑스러워', style: 'WARM', fx: { affection: 10 }, reply: '(울컥) ...갑자기 왜 그래.' },
    ],
  },
  {
    id: 'M_DREAM_STRICT', emoji: '🌟', title: '의사나 변호사', minAge: 17, maxAge: 19, weight: 3,
    cond: (s) => mem(s, 'C_DREAM:STRICT'),
    text: '"어릴 때 의사나 변호사 하라고 했던 거 기억나? ...솔직히 그거 꽤 부담이었어."',
    choices: [
      { label: '몰랐어. 미안해, 네 꿈을 말해 줄래?', style: 'WARM', fx: { affection: 10, stress: -10 }, reply: '...사실 하고 싶은 게 있어. 들어 줄래?' },
      { label: '그래도 덕분에 열심히 했잖아', style: 'STRICT', fx: { INT: 8, affection: -4 }, reply: '...그건 그렇지만.' },
      { label: '이제 네가 정하면 돼', style: 'FREE', fx: { stress: -8, affection: 4 }, reply: '진짜? 고마워.' },
    ],
  },
  {
    id: 'M_DREAM_WARM', emoji: '🚒', title: '첫 번째 꿈', minAge: 17, maxAge: 19, weight: 3,
    cond: (s) => mem(s, 'C_DREAM:WARM'),
    text: '"직업 체험관 갔던 거 기억나? 소방관 옷 입어 본 날, 처음으로 꿈이라는 걸 생각해 봤어."',
    choices: [
      { label: '그날 네 눈이 반짝였지', style: 'WARM', fx: { affection: 8, CHA: 3 }, reply: '사진 아직 있어? 보고 싶다!' },
      { label: '그 꿈은 아직 있니?', style: 'STRICT', fx: { MOR: 5, INT: 3 }, reply: '음... 모양은 좀 바뀌었지만 아직 있어.' },
      { label: '또 가 볼까?', style: 'FREE', fx: { stress: -8, affection: 4 }, reply: '이 나이에? ...좋아!' },
    ],
  },
  {
    id: 'M_SANTA', emoji: '🎅', title: '산타의 정체', minAge: 13, maxAge: 16, weight: 3, months: [12],
    cond: (s) => mem(s, 'C_CHRISTMAS:WARM'),
    text: '"사실... 산타가 엄마 아빠였던 거, 2학년 때부터 알았어. 근데 모른 척하는 게 더 재밌었어."',
    choices: [
      { label: '올해도 양말 걸어 둘래?', style: 'WARM', fx: { affection: 8, stress: -6 }, reply: '당연하지! 큰 양말로!' },
      { label: '이제 네가 산타 해 볼래?', style: 'FREE', fx: { MOR: 6, CHA: 4 }, reply: '좋아! 동네 꼬마들한테 선물 돌릴래.' },
      { label: '알면서 선물은 다 받았구나?', style: 'STRICT', fx: { affection: 4, CHA: 3 }, reply: '헤헤, 그건 그거고!' },
    ],
  },
  {
    id: 'M_PHONE', emoji: '📱', title: '폰 없던 시절', minAge: 15, maxAge: 18, weight: 3,
    cond: (s) => mem(s, 'C_SMARTPHONE:STRICT'),
    text: '"초등학생 때 폰 안 사 준 거 엄청 원망했는데... 지금 보니 우리 반에서 책은 내가 제일 많이 읽었더라."',
    choices: [
      { label: '그때 서운했지? 미안했어', style: 'WARM', fx: { affection: 8 }, reply: '이제 괜찮아. 고마운 게 더 커.' },
      { label: '거봐, 다 이유가 있었다니까', style: 'STRICT', fx: { INT: 5, affection: 2 }, reply: '네네~ 엄마 아빠 말이 맞았어요~' },
      { label: '그래도 원망은 했구나?', style: 'FREE', fx: { affection: 4, CHA: 3 }, reply: '조금? 아주 조금!' },
    ],
  },
  {
    id: 'M_BULLY', emoji: '🛡️', title: '네 편', minAge: 17, maxAge: 19, weight: 3,
    cond: (s) => mem(s, 'T_BULLY:WARM', 'T_BULLY:STRICT'),
    text: '"예전에 단톡방 일 기억나? 그때 엄마 아빠가 내 편이 되어 준 게... 제일 큰 힘이었어."',
    choices: [
      { label: '언제까지나 네 편이야', style: 'WARM', fx: { affection: 10, stress: -8 }, reply: '...알아. 그래서 버틸 수 있었어.' },
      { label: '이제 네가 누군가의 편이 되어 줘', style: 'STRICT', fx: { MOR: 10 }, reply: '응. 요즘 전학 온 애 챙기고 있어.' },
      { label: '잘 이겨 낸 건 너야', style: 'FREE', fx: { CHA: 6, affection: 5 }, reply: '헤헤. 그런가?' },
    ],
  },
  {
    id: 'M_SORRY', emoji: '🙏', title: '어른도 사과할 수 있구나', minAge: 17, maxAge: 19, weight: 3,
    cond: (s) => mem(s, 'T_FIGHT_PARENT:WARM'),
    text: '"그때 저녁 먹다 싸웠을 때, 엄마 아빠가 먼저 사과했잖아. 어른도 사과할 수 있구나, 그때 처음 알았어."',
    choices: [
      { label: '너도 그때 사과해 줬잖아', style: 'WARM', fx: { affection: 8, MOR: 4 }, reply: '닮았나 봐, 우리.' },
      { label: '잘못하면 누구든 사과해야지', style: 'STRICT', fx: { MOR: 8 }, reply: '응. 나도 그렇게 살 거야.' },
      { label: '그날 반찬이 뭐였더라?', style: 'FREE', fx: { affection: 5, stress: -5 }, reply: '김치찌개! 그건 확실해. ㅋㅋ' },
    ],
  },
  {
    id: 'M_WISH_CLOSED', emoji: '🔒', title: '닫힌 마음', minAge: 10, maxAge: 19, weight: 4,
    cond: (s) => !!s.wishClosed,
    text: '요즘 {name이} 아무것도 해 달라고 하지 않아요. 이유를 물으니 "어차피 말해도 안 들어줄 거잖아."',
    choices: [
      { label: '미안해. 이번엔 꼭 들어줄게', style: 'WARM', fx: { affection: 8, stress: -5 }, reply: '...진짜지? 그럼 하나만 말해 볼게.', reopenWishes: true },
      { label: '부모도 사정이 있는 거야', style: 'STRICT', fx: { MOR: 4, affection: -5 }, reply: '...응. 알아. 그러니까 이제 안 말하는 거야.' },
      { label: '스스로 해결하는 것도 좋지', style: 'FREE', fx: { MOR: 3, TEC: 3, affection: -2 }, reply: '...그래. 혼자 할게.' },
    ],
  },
];

PARENTING_EVENTS.push(...ARC_EVENTS);
export const EVENT_MAP: Record<string, ParentingEvent> = Object.fromEntries(PARENTING_EVENTS.map((e) => [e.id, e]));

/* ───────── 아이의 부탁 ───────── */
export interface WishDef {
  id: string;
  emoji: string;
  /** 아이의 말 */
  text: string;
  minAge: number;
  maxAge: number;
  /** 들어주는 방법: 해당 행동을 n주 하기 / 가구 배치 / 이번 달 대화 */
  kind: 'action' | 'furniture' | 'talk';
  target?: string;
  count?: number;
  hint: string;
  cond?: (s: SaveState) => boolean;
  /** 이벤트 선택지로만 생기는 부탁 */
  eventOnly?: boolean;
  reward: Effect;
  done: string;
}

export const WISH_MONTHS = 3;
export const WISH_FAIL: Effect = { affection: -6, stress: 6 };

export const WISHES: WishDef[] = [
  { id: 'W_PIANO', emoji: '🎹', text: '나 피아노랑 노래 배우고 싶어!', minAge: 8, maxAge: 12, kind: 'action', target: 'EDU_05', count: 2, hint: '실용음악·댄스 아카데미 2주', reward: { ART: 15, affection: 8 }, done: '♪ 엄마 아빠 들어 봐! 나 이거 칠 수 있어!' },
  { id: 'W_TAEKWONDO', emoji: '🥋', text: '친구들처럼 태권도 다니고 싶어!', minAge: 8, maxAge: 11, kind: 'action', target: 'EDU_07', count: 2, hint: '체육·무술 도장 2주', reward: { STR: 15, affection: 8 }, done: '얍! 노란 띠 땄어!' },
  { id: 'W_DRAW', emoji: '🖍️', text: '그림 학원 다니고 싶어!', minAge: 8, maxAge: 14, kind: 'action', target: 'EDU_06', count: 2, hint: '미술·웹툰 창작 화실 2주', reward: { ART: 15, affection: 8 }, done: '이거 엄마 아빠 그린 거야!' },
  { id: 'W_CODING', emoji: '💻', text: '나도 게임 직접 만들어 보고 싶어!', minAge: 10, maxAge: 16, kind: 'action', target: 'EDU_04', count: 2, hint: '코딩·게임 제작 부트캠프 2주', reward: { TEC: 15, affection: 8 }, done: '내가 만든 게임 해 볼래? 점프만 되긴 하는데!' },
  { id: 'W_CAMPING', emoji: '🏕️', text: '우리 가족 캠핑 가자~!', minAge: 8, maxAge: 19, kind: 'action', target: 'REST_02', count: 1, hint: '가족 캠핑·바캉스 1주', reward: { affection: 12, stress: -10 }, done: '별 진짜 많았다! 또 가자!' },
  { id: 'W_SCIENCE', emoji: '🔭', text: '과학관에 공룡 보러 가고 싶어!', minAge: 8, maxAge: 12, kind: 'action', target: 'OUT_SCI', count: 1, hint: '외출: 과학관 견학 1주', reward: { INT: 10, TEC: 5, affection: 6 }, done: '티라노 이빨이 내 손보다 컸어!' },
  { id: 'W_BOOKSTORE', emoji: '📕', text: '서점 가서 새 책 고르고 싶어.', minAge: 8, maxAge: 16, kind: 'action', target: 'OUT_BOOK', count: 1, hint: '외출: 서점 방문 1주', reward: { INT: 8, ART: 5, affection: 6 }, done: '이 책 벌써 반이나 읽었어!' },
  { id: 'W_ARCADE', emoji: '👾', text: '오락실 한 번만 가 보고 싶어!', minAge: 10, maxAge: 16, kind: 'action', target: 'OUT_ARCADE', count: 1, hint: '외출: 오락실 1주', reward: { stress: -12, TEC: 5, affection: 6 }, done: '최고 기록 세웠어! 이름 새겨 놓고 왔어!' },
  { id: 'W_RUINS', emoji: '🗿', text: '진짜 유적 탐험 가 보고 싶어!', minAge: 10, maxAge: 16, kind: 'action', target: 'OUT_RUINS', count: 1, hint: '외출: 고대 유적 탐방 1주', reward: { STR: 8, INT: 6, affection: 6 }, done: '이상한 문양 찾았어! 이거 보물 지도일지도?' },
  { id: 'W_SHOPPING', emoji: '🛍️', text: '새 옷 사러 같이 가자~', minAge: 12, maxAge: 19, kind: 'action', target: 'OUT_SHOP', count: 1, hint: '외출: 백화점 쇼핑 1주', reward: { CHA: 10, affection: 8 }, done: '이거 입고 학교 가면 다들 놀라겠지?' },
  { id: 'W_BAKERY', emoji: '🥐', text: '빵집에서 알바 해 보고 싶어!', minAge: 12, maxAge: 19, kind: 'action', target: 'JOB_02', count: 2, hint: '동네 베이커리 보조 2주', reward: { TEC: 10, MOR: 5, affection: 6 }, done: '내가 만든 크루아상이야! 맛있지?' },
  { id: 'W_BUSKING', emoji: '🎸', text: '길거리 버스킹 해 보고 싶어!', minAge: 15, maxAge: 19, kind: 'action', target: 'JOB_06', count: 1, hint: '거리 버스킹 공연 1주', reward: { CHA: 10, ART: 6, fame: 5, affection: 6 }, done: '사람들이 박수 쳐 줬어! 떨렸는데 최고였어!' },
  { id: 'W_REST', emoji: '😪', text: '요즘 너무 피곤해... 좀 쉬고 싶어.', minAge: 8, maxAge: 19, kind: 'action', target: 'REST_01', count: 2, hint: '방에서 휴식 2주', cond: (s) => s.status.stress >= 45, reward: { stress: -10, affection: 8 }, done: '푹 쉬었더니 살 것 같아. 고마워.' },
  { id: 'W_TALK', emoji: '💭', text: '...나 얘기 좀 들어 줄 수 있어?', minAge: 10, maxAge: 19, kind: 'talk', hint: '외출 메뉴에서 대화하기', cond: (s) => s.status.affection < 60, reward: { affection: 10, stress: -8 }, done: '털어놓으니까 마음이 가벼워졌어.' },
  { id: 'W_DESK', emoji: '🪑', text: '나만의 책상 갖고 싶어!', minAge: 8, maxAge: 12, kind: 'furniture', target: 'oak_desk', hint: '원목 책상 배치', reward: { INT: 10, affection: 8 }, done: '이제 여기서 숙제할 거야!' },
  { id: 'W_CAT_CUSHION', emoji: '🐱', text: '고양이 전용 쿠션 사 주면 안 돼?', minAge: 8, maxAge: 15, kind: 'furniture', target: 'cat_cushion', hint: '반려묘 쿠션 배치', reward: { MOR: 6, affection: 10 }, done: '봐 봐! 바로 올라가서 잠들었어!' },
  { id: 'W_EASEL', emoji: '🖼️', text: '내 방에 이젤 있으면 좋겠다~', minAge: 8, maxAge: 16, kind: 'furniture', target: 'easel', hint: '이젤 캔버스 배치', cond: (s) => s.stats.ART >= 80, reward: { ART: 12, affection: 8 }, done: '첫 작품 제목은 "우리 가족"이야!' },
  { id: 'W_MIRROR', emoji: '🪞', text: '전신 거울 갖고 싶어. 옷 입은 거 보게.', minAge: 12, maxAge: 19, kind: 'furniture', target: 'full_mirror', hint: '전신 거울 배치', reward: { CHA: 10, affection: 8 }, done: '오늘 코디 어때? 완벽하지?' },
  { id: 'W_PC', emoji: '🖥️', text: '좋은 컴퓨터 갖고 싶어... 진짜 열심히 쓸게!', minAge: 13, maxAge: 19, kind: 'furniture', target: 'gaming_pc', hint: '고성능 게이밍 PC 배치', cond: (s) => s.stats.TEC >= 200, reward: { TEC: 20, affection: 12 }, done: '우와아아! 세상에서 제일 고마워!!' },
  { id: 'W_RINGLIGHT', emoji: '💡', text: '방송용 링라이트 있으면 진짜 잘할 수 있는데...', minAge: 12, maxAge: 19, kind: 'furniture', target: 'ring_light', hint: '링라이트 조명 배치', eventOnly: true, reward: { CHA: 12, fame: 5, affection: 10 }, done: '조명 켜니까 화면이 완전 달라! 첫 라이브 한다!' },
];

export const WISH_MAP: Record<string, WishDef> = Object.fromEntries(WISHES.map((w) => [w.id, w]));

/* ───────── 문장 치환 (조사 자동) ───────── */

export function fillName(text: string, name: string, friend = '친구') {
  const b = hasBatchim(name);
  // 친구는 부르는 이름으로: 받침 있으면 '서연이', 없으면 '지호' → 뒤에 조사를 붙여도 자연스럽다
  const call = hasBatchim(friend) ? friend + '이' : friend;
  return text
    .replace(/\{friend\}/g, call)
    .replace(/\{name이\}/g, name + (b ? '이' : '가'))
    .replace(/\{name은\}/g, name + (b ? '은' : '는'))
    .replace(/\{name을\}/g, name + (b ? '을' : '를'))
    .replace(/\{name과\}/g, name + (b ? '과' : '와'))
    .replace(/\{name\}/g, name);
}
