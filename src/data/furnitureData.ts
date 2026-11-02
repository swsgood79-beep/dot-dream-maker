import type { ComboDefinition, FurnitureDefinition } from '../types/game';

/**
 * 가구 마스터 데이터.
 * 기획서는 "25종"이라 적혀 있지만 4.2장의 12종 콤보가 서로 다른 가구 36종을 요구하므로
 * 콤보 가구 36종 + 기초 가구 4종 = 총 40종으로 구성했다.
 */
const f = (d: Omit<FurnitureDefinition, 'width' | 'height' | 'spriteKey'> & Partial<FurnitureDefinition>): FurnitureDefinition => ({
  width: 1,
  height: 1,
  spriteKey: d.id,
  ...d,
});

export const FURNITURE: FurnitureDefinition[] = [
  // ── 기초 가구 (유년기)
  f({ id: 'basic_bed', name: '낡은 침대', costGold: 0, costIdea: 0, category: 'REST', auraBonus: {}, stressReductionBonus: 1 }),
  f({ id: 'globe', name: '지구본', costGold: 150, costIdea: 0, category: 'STUDY', auraBonus: { INT: 2 } }),
  f({ id: 'plant', name: '몬스테라 화분', costGold: 120, costIdea: 0, category: 'DECO', auraBonus: { MOR: 1 }, stressReductionBonus: 1 }),
  f({ id: 'toy_box', name: '장난감 상자', costGold: 100, costIdea: 0, category: 'DECO', auraBonus: { CHA: 1 } }),

  // CMB_01 맹모삼천지교 공부방
  f({ id: 'oak_desk', name: '원목 책상', costGold: 300, costIdea: 0, category: 'STUDY', auraBonus: { INT: 1 } }),
  f({ id: 'encyclopedia_shelf', name: '백과사전 책장', costGold: 400, costIdea: 0, category: 'STUDY', auraBonus: { INT: 3 } }),
  f({ id: 'led_lamp', name: 'LED 스탠드', costGold: 250, costIdea: 0, category: 'STUDY', auraBonus: { INT: 2 }, stressReductionBonus: 1 }),
  // CMB_02 꼬마 의학 연구실
  f({ id: 'anatomy_model', name: '해부학 모형', costGold: 600, costIdea: 5, category: 'STUDY', auraBonus: { INT: 2 }, aptitudeBonus: { APT_MED: 5 }, minAge: 10 }),
  f({ id: 'microscope_table', name: '현미경 테이블', costGold: 800, costIdea: 5, category: 'STUDY', auraBonus: { INT: 2, TEC: 1 }, minAge: 10 }),
  f({ id: 'medical_shelf', name: '의학서적 책장', costGold: 700, costIdea: 5, category: 'STUDY', auraBonus: { INT: 3 }, aptitudeBonus: { APT_MED: 5 }, minAge: 12 }),
  // CMB_03 인디 게임 개발실
  f({ id: 'gaming_pc', name: '고성능 게이밍 PC', costGold: 1500, costIdea: 10, category: 'TECH', auraBonus: { TEC: 3 }, aptitudeBonus: { APT_IT: 5 }, minAge: 12 }),
  f({ id: 'dual_monitor', name: '듀얼 모니터', costGold: 800, costIdea: 5, category: 'TECH', auraBonus: { TEC: 2 }, minAge: 12 }),
  f({ id: 'whiteboard', name: '화이트보드', costGold: 300, costIdea: 0, category: 'TECH', auraBonus: { INT: 1, TEC: 1 } }),
  // CMB_04 홈 레코딩 스튜디오
  f({ id: 'grand_piano', name: '그랜드 피아노', costGold: 2000, costIdea: 10, width: 2, category: 'ART', auraBonus: { ART: 4 } }),
  f({ id: 'condenser_mic', name: '콘덴서 마이크', costGold: 600, costIdea: 5, category: 'ART', auraBonus: { CHA: 2 }, aptitudeBonus: { APT_ENT: 5 }, minAge: 12 }),
  f({ id: 'sound_booth', name: '방음 부스', costGold: 1200, costIdea: 10, category: 'ART', auraBonus: { ART: 2 }, stressReductionBonus: 1, minAge: 12 }),
  // CMB_05 아틀리에 화실
  f({ id: 'easel', name: '이젤 캔버스', costGold: 350, costIdea: 0, category: 'ART', auraBonus: { ART: 3 } }),
  f({ id: 'plaster_bust', name: '석고상', costGold: 450, costIdea: 3, category: 'ART', auraBonus: { ART: 2 } }),
  f({ id: 'watercolor_kit', name: '수채화 도구함', costGold: 250, costIdea: 0, category: 'ART', auraBonus: { ART: 2, TEC: 1 } }),
  // CMB_06 홈 트레이닝 짐
  f({ id: 'treadmill', name: '런닝머신', costGold: 900, costIdea: 5, category: 'FITNESS', auraBonus: { STR: 3 }, minAge: 10 }),
  f({ id: 'dumbbell_rack', name: '덤벨 랙', costGold: 500, costIdea: 0, category: 'FITNESS', auraBonus: { STR: 3 }, minAge: 10 }),
  f({ id: 'full_mirror', name: '전신 거울', costGold: 300, costIdea: 0, category: 'FITNESS', auraBonus: { CHA: 2 } }),
  // CMB_07 월스트리트 주니어룸
  f({ id: 'newspaper_stand', name: '경제 신문 거치대', costGold: 300, costIdea: 3, category: 'STUDY', auraBonus: { INT: 2 }, aptitudeBonus: { APT_BIZ: 5 }, minAge: 12 }),
  f({ id: 'world_clock', name: '세계 시계', costGold: 400, costIdea: 3, category: 'DECO', auraBonus: { INT: 1, CHA: 1 } }),
  f({ id: 'stock_monitor', name: '주식 모니터', costGold: 1000, costIdea: 8, category: 'TECH', auraBonus: { INT: 2 }, aptitudeBonus: { APT_BIZ: 5 }, minAge: 15 }),
  // CMB_08 미슐랭 키친 코너
  f({ id: 'mini_oven', name: '미니 오븐', costGold: 500, costIdea: 3, category: 'TECH', auraBonus: { TEC: 2 }, minAge: 10 }),
  f({ id: 'kitchen_counter', name: '조리대', costGold: 700, costIdea: 3, width: 2, category: 'TECH', auraBonus: { TEC: 2, ART: 1 }, minAge: 10 }),
  f({ id: 'spice_rack', name: '향신료 선반', costGold: 250, costIdea: 0, category: 'TECH', auraBonus: { ART: 1, TEC: 1 } }),
  // CMB_09 크리에이터 방송국
  f({ id: 'ring_light', name: '링라이트 조명', costGold: 400, costIdea: 3, category: 'ART', auraBonus: { CHA: 2 }, minAge: 12 }),
  f({ id: 'broadcast_cam', name: '방송용 카메라', costGold: 1200, costIdea: 8, category: 'ART', auraBonus: { CHA: 3 }, aptitudeBonus: { APT_ENT: 5 }, minAge: 14 }),
  f({ id: 'chroma_key', name: '크로마키 배경', costGold: 500, costIdea: 3, category: 'ART', auraBonus: { CHA: 1, TEC: 1 }, minAge: 14 }),
  // CMB_10 우주 과학 관측소
  f({ id: 'telescope', name: '천체 망원경', costGold: 1100, costIdea: 8, category: 'STUDY', auraBonus: { INT: 3 } }),
  f({ id: 'planet_model', name: '행성 모형', costGold: 400, costIdea: 3, category: 'STUDY', auraBonus: { INT: 2 } }),
  f({ id: 'zero_g_bed', name: '무중력 캡슐 침대', costGold: 2500, costIdea: 15, category: 'REST', auraBonus: { STR: 2 }, stressReductionBonus: 3, minAge: 14 }),
  // CMB_11 힐링 테라피 가든
  f({ id: 'fluffy_bed', name: '푹신한 침대', costGold: 800, costIdea: 3, category: 'REST', auraBonus: {}, stressReductionBonus: 3 }),
  f({ id: 'aroma_diffuser', name: '아로마 디퓨저', costGold: 350, costIdea: 3, category: 'REST', auraBonus: { MOR: 1 }, stressReductionBonus: 2 }),
  f({ id: 'cat_cushion', name: '반려묘 쿠션', costGold: 300, costIdea: 0, category: 'REST', auraBonus: { MOR: 1, CHA: 1 }, stressReductionBonus: 2 }),
  // CMB_12 신비한 모험가의 방
  f({ id: 'treasure_chest', name: '고대 보물상자', costGold: 1500, costIdea: 15, category: 'DECO', auraBonus: { STR: 1, INT: 1 }, aptitudeBonus: { APT_ADV: 5 }, minAge: 12 }),
  f({ id: 'wooden_sword_rack', name: '목검 거치대', costGold: 450, costIdea: 3, category: 'FITNESS', auraBonus: { STR: 2 }, aptitudeBonus: { APT_ADV: 3 } }),
  f({ id: 'magic_rug', name: '마법진 러그', costGold: 900, costIdea: 10, category: 'DECO', auraBonus: { ART: 1, MOR: 1 }, aptitudeBonus: { APT_ADV: 3 }, minAge: 12 }),
];

export const FURNITURE_MAP: Record<string, FurnitureDefinition> = Object.fromEntries(FURNITURE.map((x) => [x.id, x]));

/** 기획서 4.2장 대표 가구 콤보(전문 구역) 12선 */
export const COMBOS: ComboDefinition[] = [
  {
    id: 'CMB_01', name: '맹모삼천지교 공부방', requiredFurnitureIds: ['oak_desk', 'encyclopedia_shelf', 'led_lamp'],
    statMultiplierBonus: { INT: 0.3 }, stressMultiplier: -0.15, appliesTo: ['EDUCATION'],
    description: '공부 시 INT 획득량 +30%, 스트레스 증가 -15%', relatedJobs: '판사, 변호사, 교수',
  },
  {
    id: 'CMB_02', name: '꼬마 의학 연구실', requiredFurnitureIds: ['anatomy_model', 'microscope_table', 'medical_shelf'],
    statMultiplierBonus: { INT: 0.2 }, aptitudeExpBonus: { APT_MED: 0.5 }, appliesTo: ['EDUCATION', 'PART_TIME'],
    description: '공부 시 INT +20%, APT_MED 경험치 +50%', relatedJobs: '외과의사, 수의사, 약사',
  },
  {
    id: 'CMB_03', name: '인디 게임 개발실', requiredFurnitureIds: ['gaming_pc', 'dual_monitor', 'whiteboard'],
    statMultiplierBonus: { TEC: 0.35 }, aptitudeExpBonus: { APT_IT: 0.5 }, appliesTo: ['EDUCATION', 'PART_TIME'],
    description: '코딩 시 TEC +35%, APT_IT 경험치 +50%', relatedJobs: '게임 개발자, AI 엔지니어',
  },
  {
    id: 'CMB_04', name: '홈 레코딩 스튜디오', requiredFurnitureIds: ['grand_piano', 'condenser_mic', 'sound_booth'],
    statMultiplierBonus: { ART: 0.3, CHA: 0.15 }, appliesTo: ['EDUCATION', 'PART_TIME'],
    description: '예술 연습 시 ART +30%, CHA +15%', relatedJobs: '아이돌, 작곡가, 피아니스트',
  },
  {
    id: 'CMB_05', name: '아틀리에 화실', requiredFurnitureIds: ['easel', 'plaster_bust', 'watercolor_kit'],
    statMultiplierBonus: { ART: 0.35 }, appliesTo: ['EDUCATION'],
    description: '미술 연습 시 ART +35%, 감성 대성공 확률 +20%', relatedJobs: '웹툰 작가, 화가, 건축가',
  },
  {
    id: 'CMB_06', name: '홈 트레이닝 짐', requiredFurnitureIds: ['treadmill', 'dumbbell_rack', 'full_mirror'],
    statMultiplierBonus: { STR: 0.35 }, appliesTo: ['EDUCATION', 'PART_TIME'],
    description: '운동 시 STR +35%, 질병 발생 확률 -50%', relatedJobs: '스포츠 스타, 소방관, 특전사',
  },
  {
    id: 'CMB_07', name: '월스트리트 주니어룸', requiredFurnitureIds: ['newspaper_stand', 'world_clock', 'stock_monitor'],
    statMultiplierBonus: { INT: 0.15 }, aptitudeExpBonus: { APT_BIZ: 0.5 }, wageBonus: 0.2, appliesTo: ['EDUCATION', 'PART_TIME'],
    description: '비즈니스 학습 시 INT +15%, APT_BIZ +50%, 알바 보수 +20%', relatedJobs: '대기업 CEO, 펀드매니저',
  },
  {
    id: 'CMB_08', name: '미슐랭 키친 코너', requiredFurnitureIds: ['mini_oven', 'kitchen_counter', 'spice_rack'],
    statMultiplierBonus: { TEC: 0.3 }, monthlyEffects: { affection: 2 }, appliesTo: ['EDUCATION', 'PART_TIME'],
    description: '가사/요리 시 TEC +30%, 가족 친밀도 매월 +2', relatedJobs: '스타 셰프, 파티시에',
  },
  {
    id: 'CMB_09', name: '크리에이터 방송국', requiredFurnitureIds: ['ring_light', 'broadcast_cam', 'chroma_key'],
    statMultiplierBonus: { CHA: 0.4 }, appliesTo: ['EDUCATION', 'PART_TIME'],
    description: '방송/화술 연습 시 CHA +40%, 명성 획득 +25%', relatedJobs: '스트리머, 아나운서, 배우',
  },
  {
    id: 'CMB_10', name: '우주 과학 관측소', requiredFurnitureIds: ['telescope', 'planet_model', 'zero_g_bed'],
    statMultiplierBonus: { INT: 0.25, STR: 0.15 }, appliesTo: ['EDUCATION'],
    description: '과학 학습 시 INT +25%, STR +15%, 우주 이벤트 해금', relatedJobs: '우주비행사, 천체물리학자',
  },
  {
    id: 'CMB_11', name: '힐링 테라피 가든', requiredFurnitureIds: ['fluffy_bed', 'aroma_diffuser', 'cat_cushion'],
    statMultiplierBonus: {}, restBonus: 0.4, monthlyEffects: { MOR: 1 }, appliesTo: ['REST'],
    description: '휴식 시 스트레스 회복량 +40%, MOR 매월 +1', relatedJobs: '전 직업 공용 컨디션 관리',
  },
  {
    id: 'CMB_12', name: '신비한 모험가의 방', requiredFurnitureIds: ['treasure_chest', 'wooden_sword_rack', 'magic_rug'],
    statMultiplierBonus: { STR: 0.25 }, aptitudeExpBonus: { APT_ADV: 0.5 }, appliesTo: ['EDUCATION', 'OUTING'],
    description: '무술/탐험 시 STR +25%, APT_ADV +50%, 판타지 이벤트 해금', relatedJobs: '용사, 마법소녀, 고고학자',
  },
];

export const COMBO_MAP: Record<string, ComboDefinition> = Object.fromEntries(COMBOS.map((c) => [c.id, c]));
