import type { EndingDefinition } from '../types/game';
import type { SaveState } from '../engine/simulation';
import { dominantStyle } from '../engine/parenting';
import { TEMPERAMENT_MAP } from './temperamentData';

/** 예전 선택(이벤트ID:스타일)이 편지 속 한 문장이 된다 */
export const MEMORY_LINES: Record<string, string> = {
  'C_FRIEND_FIGHT:WARM': '친구랑 싸운 날 끝까지 들어 줘서, 먼저 사과할 용기가 났어요.',
  'C_BROKEN_VASE:WARM': '꽃병을 깼던 날, 혼내지 않고 기다려 줘서 정직이 뭔지 배웠어요.',
  'C_BROKEN_VASE:STRICT': '꽃병 깼던 날 무서워서 거짓말했던 거, 이제야 진짜로 사과해요.',
  'C_SPARROW:WARM': '같이 참새를 돌봤던 일주일은 제 인생에서 가장 따뜻한 기억 중 하나예요.',
  'C_FEVER:WARM': '열나던 밤에 잡아 준 손, 아직도 기억나요.',
  'C_FEVER:STRICT': '아파도 할 일은 해야 한다던 말 덕분에 끈기가 생긴 것 같아요.',
  'C_DREAM:FREE': '좋아하는 걸 하라던 그 말이 제 나침반이었어요.',
  'C_DREAM:STRICT': '의사나 변호사가 되라던 말, 가끔은 부담이었지만 덕분에 열심히 공부했어요.',
  'C_DREAM:WARM': '직업 체험관에서 입어 본 소방관 옷, 그게 제 첫 꿈이었어요.',
  'C_CHRISTMAS:WARM': '머리맡의 게임기... 산타가 누군지 사실 알고 있었어요. 헤헤.',
  'C_PARENTS_DAY:WARM': '삐뚤빼뚤한 편지를 안아 줬던 그날처럼, 이번 편지도 꼭 안아 주세요.',
  'C_PARENTS_DAY:STRICT': '맞춤법 고쳐 주셨던 거 기억나요. 이번 편지는 하나도 안 틀렸죠?',
  'C_SMARTPHONE:STRICT': '폰 안 사 주신 거 엄청 원망했는데, 덕분에 책을 정말 많이 읽었어요.',
  'C_HOMEWORK:WARM': '방학 숙제를 같이 해 주던 밤이 가끔 그리워요.',
  'T_DOOR_SLAM:WARM': '쾅 닫힌 방문 앞에서 노크하고 기다려 줘서 고마웠어요.',
  'T_LATE_GAME:WARM': '새벽에 같이 게임했던 거, 사실 엄청 재밌었어요.',
  'T_SMOKE:WARM': '제가 엇나갈 뻔했을 때 화내지 않고 이유를 물어봐 줘서 돌아올 수 있었어요.',
  'T_CRUSH:WARM': '편지 쓰는 거 도와준 거, 그 사람한텐 영원히 비밀이에요!',
  'T_BULLY:WARM': '힘들었을 때 "네 편이야"라고 해 준 말, 평생 잊지 않을게요.',
  'T_BULLY:STRICT': '선생님께 바로 찾아가 주셨던 거, 그때는 창피했지만 정말 고마웠어요.',
  'T_FIGHT_PARENT:WARM': '먼저 사과해 주셨던 날, 어른도 사과할 수 있다는 걸 배웠어요.',
  'T_FIGHT_PARENT:STRICT': '말버릇 혼났던 날은 서운했지만, 요즘 예의 바르다는 말을 자주 들어요.',
  'T_EXAM_TEARS:WARM': '시험 기간에 끓여 준 라면이 세상에서 제일 맛있었어요.',
  'Y_ART_SCHOOL:WARM': '미대 간다고 했을 때 응원해 준 거, 정말 큰 힘이 됐어요.',
  'Y_ART_SCHOOL:STRICT': '미대를 반대하셨던 거, 그때는 미웠는데 이제 조금은 이해해요.',
  'Y_SUNEUNG:WARM': '수능 전날 건네준 따뜻한 우유 맛, 잊지 못할 거예요.',
  'Y_BURNOUT:WARM': '다 그만두고 싶다던 날, 쉬어도 된다고 해 줘서 다시 일어설 수 있었어요.',
  'Y_FIRST_PAY:WARM': '첫 월급 선물 받고 우시던 모습, 사실 저도 몰래 울었어요.',
};

const STYLE_LINE = {
  WARM: '언제나 제 이야기를 먼저 들어 주고 제 편이 되어 줘서 고마워요.',
  STRICT: '엄하게 키워 주셔서 가끔은 서운했지만, 덕분에 바르게 자랄 수 있었어요.',
  FREE: '저를 믿고 맡겨 주셔서, 스스로 선택하는 법을 배웠어요.',
};

const TEMPER_LINE = {
  SHY: '어릴 때 겁 많고 낯가리던 저, 기억하죠? 이제는 사람들 앞에서도 제법 말 잘해요.',
  ACTIVE: '하루도 가만히 있지 않던 저 때문에 정말 바빴죠? 그 에너지, 이제 좋은 데 쓸게요.',
  STUBBORN: '고집 부리던 저 때문에 많이 속상하셨죠. 그 고집으로 여기까지 왔어요.',
  SENSITIVE: '작은 일에도 잘 울던 저를 늘 다독여 줘서 고마워요.',
  EASYGOING: '늘 느릿느릿하던 저 때문에 속 터지셨죠? 그래도 결국 다 해냈어요. 헤헤.',
};

/** 고른 기억 중 앞·가운데·끝에서 하나씩 (최대 3줄) */
function pickMemories(memories: string[]) {
  const lines = memories.filter((m) => MEMORY_LINES[m]);
  if (lines.length <= 3) return lines;
  return [lines[0], lines[Math.floor(lines.length / 2)], lines[lines.length - 1]];
}

/** 12년의 선택·기억·부탁으로 엔딩 편지를 쓴다 */
export function buildLetter(s: SaveState, ending: EndingDefinition): { greeting: string; body: string[]; closing: string } {
  const aff = s.status.affection;
  const body: string[] = [];
  const t = s.temperament ? TEMPERAMENT_MAP[s.temperament] : null;
  if (t) body.push(TEMPER_LINE[t.id]);
  for (const m of pickMemories(s.memories ?? [])) body.push(MEMORY_LINES[m]);

  const granted = s.wishesGranted ?? 0;
  const failed = s.wishesFailed ?? 0;
  if (granted >= 6 && granted > failed * 2) body.push('제 부탁 하나하나 들어주느라 고생 많으셨죠. 다 기억하고 있어요.');
  else if (failed > granted) body.push('가끔은 제 말을 들어주지 않아서 서운했어요. 그래도 이제는 그때 사정도 조금 알 것 같아요.');

  const style = dominantStyle(s);
  if (style) body.push(STYLE_LINE[style]);
  if (s.burstCount >= 2) body.push('힘들어서 많이 아팠던 날들도 있었지만, 그때마다 곁에 있어 줘서 버틸 수 있었어요.');

  if (ending.id === 'END_50') body.push('아직 뭘 해야 할지 모르겠지만... 천천히, 제 길을 찾아볼게요. 조금만 더 기다려 주세요.');
  else body.push(`이제 저는 '${ending.title}'(으)로 첫걸음을 내디뎌요. 지켜봐 주세요.`);

  return {
    greeting: aff >= 40 ? '사랑하는 엄마 아빠에게' : '엄마 아빠에게',
    body,
    closing: aff >= 80 ? '정말 많이 사랑해요 💕' : aff >= 50 ? '항상 고마워요.' : '...그래도, 고마워요.',
  };
}
