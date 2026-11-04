import type { Pose } from './character';

/** 가구별 혼자 놀기: 어떤 포즈·활동 그림·말풍선으로 노는지 (없는 가구는 놀지 않음) */
export interface Hobby {
  pose: Pose;
  act?: string; // 활동 포즈 그림 키 (있으면)
  bubbles: string[];
  ms: number;
}
const H = (pose: Pose, bubbles: string[], ms = 4200, act?: string): Hobby => ({ pose, bubbles, ms, act });

export const FURNITURE_HOBBY: Record<string, Hobby> = {
  oak_desk: H('desk', ['✏️', '📝 숙제 중...', '🤔']),
  encyclopedia_shelf: H('read', ['📖', '📚 이거 재밌다!', '🧐']),
  led_lamp: H('read', ['📖', '💡']),
  globe: H('idle', ['🌍 여기 가 보고 싶다!', '🗺️'], 3200),
  anatomy_model: H('idle', ['🦴 신기하다...', '🫀'], 3200),
  microscope_table: H('desk', ['🔬', '🦠 우와!'], 4200, 'experiment'),
  medical_shelf: H('read', ['📗', '🩺']),
  telescope: H('idle', ['🔭 별 보인다!', '🌙'], 3600),
  planet_model: H('idle', ['🪐', '🚀 언젠가 우주로!'], 3200),
  whiteboard: H('idle', ['📝', '💡 아이디어!'], 3600, 'raise'),
  newspaper_stand: H('read', ['📰', '📈']),
  gaming_pc: H('pc', ['🎮', '🕹️ 한 판만 더!', '💻']),
  dual_monitor: H('pc', ['💻', '⌨️ 타닥타닥']),
  stock_monitor: H('pc', ['📈', '📉 앗...']),
  grand_piano: H('music', ['🎹', '🎵 ♪♬']),
  condenser_mic: H('music', ['🎤 아아~', '🎶']),
  sound_booth: H('music', ['🎧', '🎶']),
  easel: H('draw', ['🎨', '🖌️ 완성!']),
  plaster_bust: H('draw', ['✏️ 스케치 중', '🗿']),
  watercolor_kit: H('draw', ['🖌️', '🌈']),
  ring_light: H('idle', ['🤳 찰칵!', '✨'], 3200, 'dance'),
  broadcast_cam: H('idle', ['📹 안녕하세요 여러분!', '🎬'], 3600, 'raise'),
  chroma_key: H('idle', ['🎬 액션!', '💃'], 3600, 'dance'),
  treadmill: H('exercise', ['🏃 헉헉', '💦']),
  dumbbell_rack: H('exercise', ['💪', '🏋️ 하나, 둘!']),
  full_mirror: H('idle', ['🪞 오늘 괜찮은데?', '😎'], 3200),
  wooden_sword_rack: H('exercise', ['⚔️ 얍!', '🥋'], 3600, 'kick'),
  mini_oven: H('work', ['🍪 냄새 좋다~', '🥧'], 4200, 'bake'),
  kitchen_counter: H('work', ['🍳', '🥘 맛있겠다!'], 4200, 'bake'),
  spice_rack: H('work', ['🧂', '🌶️'], 3200),
  plant: H('idle', ['🌱 물 줄게~', '🪴 많이 컸네!'], 3000, 'sweep'),
  toy_box: H('cheer', ['🧸', '🚂 칙칙폭폭!'], 3200),
  treasure_chest: H('idle', ['💰 내 보물!', '🗝️'], 3200, 'explore'),
  magic_rug: H('cheer', ['✨ 수리수리 마수리!', '🔮'], 3200),
  world_clock: H('idle', ['🕰️ 벌써 이렇게 됐어?'], 2600),
  aroma_diffuser: H('idle', ['🌸 좋은 향기~', '😌'], 3200),
};

/** 혼잣말 생각 풍선 */
export const IDLE_THOUGHTS = ['🍰 간식 먹고 싶다', '☁️ ...', '🎵 흥얼흥얼', '😴 하암~', '🤔 뭐 하고 놀지?', '🐱 고양이 어디 갔지?', '🌤️ 날씨 좋다'];
