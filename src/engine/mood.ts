import type { SaveState } from './simulation';

/** 방 안 아이 머리 위 기분 말풍선: 지금 상태를 이모티콘 하나로 (위에서부터 먼저 맞는 것) */
export type MoodLevel = 'great' | 'good' | 'ok' | 'bad' | 'severe';
export interface Mood {
  emoji: string;
  label: string; // 눌렀을 때·접근성용 짧은 설명
  level: MoodLevel;
}

export function childMood(s: SaveState): Mood {
  const { stress, affection, delinquency } = s.status;
  if (s.forcedRestWeeks > 0) return { emoji: '🤒', label: '아파요', level: 'severe' };
  if (s.runawayWeeks > 0) return { emoji: '🎒', label: '집을 나갔다 돌아왔어요', level: 'severe' };
  if (stress >= 90) return { emoji: '😭', label: '너무 힘들어요 (스트레스 매우 높음)', level: 'severe' };
  if (s.doorLocked) return { emoji: '🔒', label: '방문을 잠갔어요', level: 'severe' };
  if (affection <= 30) return { emoji: '💔', label: '마음이 멀어졌어요 (친밀도 낮음)', level: 'severe' };
  if (stress >= 70) return { emoji: '😣', label: '스트레스가 많아요', level: 'bad' };
  if (delinquency >= 40) return { emoji: '😒', label: '삐딱해졌어요 (비행)', level: 'bad' };
  if (affection <= 40) return { emoji: '😢', label: '서운해요 (친밀도 낮음)', level: 'bad' };
  if (stress >= 50) return { emoji: '😓', label: '조금 지쳤어요', level: 'ok' };
  if (s.acting) return { emoji: '❓', label: '평소와 달라요 (관찰해 보세요)', level: 'bad' };
  if (affection >= 75 && stress < 30) return { emoji: '🥰', label: '아주 행복해요', level: 'great' };
  if (affection >= 55 && stress < 40) return { emoji: '😊', label: '기분 좋아요', level: 'good' };
  return { emoji: '🙂', label: '평범해요', level: 'ok' };
}

export const MOOD_STYLE: Record<MoodLevel, { bg: string; border: string; pulse: boolean }> = {
  great: { bg: '#ffeef5', border: '#e86a9a', pulse: false },
  good: { bg: '#fffbea', border: '#1b1f3b', pulse: false },
  ok: { bg: '#ffffff', border: '#1b1f3b', pulse: false },
  bad: { bg: '#e8eefa', border: '#5a6fa0', pulse: true },
  severe: { bg: '#ffe3e3', border: '#e5484d', pulse: true },
};

/* ───────── 상태 포즈 (방 안 도트 캐릭터) ───────── */
export type MoodAnim = 'cry' | 'shake' | 'stomp' | 'breath' | 'sway';
export interface MoodPose {
  key: string; // 아틀라스 {STAGE}_{G}_mood_{key}
  anim: MoodAnim;
  mope: boolean; // 걸을 때 고개 숙이고 터덜터덜 (mope_walkA/B)
  fx?: 'tears' | 'sweat';
  alt?: string; // 몇 초마다 번갈아 보여 줄 다른 포즈
}

/** 지금 상태에 맞는 서 있는 모습 · 걷는 모습. 기분이 괜찮으면 null (평소 모습) */
export function moodPose(s: SaveState): MoodPose | null {
  const { stress, affection, delinquency } = s.status;
  if (s.forcedRestWeeks > 0) return { key: 'sick', anim: 'sway', mope: true };
  if (stress >= 90) return { key: 'cry', anim: 'cry', mope: true, fx: 'tears', alt: 'stressed' };
  if (s.doorLocked) return { key: 'sulk', anim: 'breath', mope: true, alt: 'back_sulk' };
  if (affection <= 30) return { key: 'back_sulk', anim: 'breath', mope: true, alt: 'phone' };
  if (s.runawayWeeks > 0) return { key: 'sad', anim: 'breath', mope: true };
  if (stress >= 70) return { key: 'stressed', anim: 'shake', mope: true, fx: 'sweat', alt: 'sigh' };
  if (delinquency >= 40) return { key: 'rebel', anim: 'breath', mope: false, alt: 'phone' };
  if (s.acting?.kind === 'STRIKE' || s.talkKind === 'scold') return { key: 'angry', anim: 'stomp', mope: false };
  if (affection <= 40) return { key: 'sad', anim: 'breath', mope: true, alt: 'sigh' };
  if (s.acting) return { key: 'sad', anim: 'breath', mope: true };
  if (stress >= 50) return { key: 'sigh', anim: 'breath', mope: false };
  return null;
}
