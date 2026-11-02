import type {
  AptitudeKey,
  EndingCategory,
  EndingDefinition,
  EndingTier,
  GameState,
  StatKey,
} from '../types/game';
import { FURNITURE } from './furnitureData';

const TIER_PRIORITY: Record<EndingTier, number> = { SS: 1, S: 2, A: 3, B: 4, C: 5 };

type EndingInput = Omit<EndingDefinition, 'priority' | 'spriteKey'> & { priority?: number };
const e = (d: EndingInput): EndingDefinition => ({
  priority: TIER_PRIORITY[d.tier],
  spriteKey: d.id.toLowerCase(),
  ...d,
});

/** 기획서 6.2장 카테고리별 50종 직업 엔딩 조건 마스터 테이블 */
export const ENDINGS: EndingDefinition[] = [
  // ── [A] 엘리트 전문직 & 학술 계열 (10종)
  e({ id: 'END_01', title: '천재 외과의사', tier: 'S', category: 'ELITE', minStats: { INT: 800, TEC: 750, MOR: 600 }, minAptitudes: { APT_MED: 8 }, minFame: 150, conditionText: 'INT≥800, TEC≥750, MOR≥600 / APT_MED≥8, 명성≥150', epilogueText: '대학병원 수술실에서 생명을 구하는 명의가 되었다.' }),
  e({ id: 'END_02', title: '대법관 (판사)', tier: 'S', category: 'ELITE', minStats: { INT: 850, MOR: 800, CHA: 500 }, minAptitudes: { APT_LAW: 9 }, maxDelinquency: 0, conditionText: 'INT≥850, MOR≥800, CHA≥500 / APT_LAW≥9, 비행=0', epilogueText: '법복을 입고 정의의 판결봉을 두드리는 근엄한 대법관이 되었다.' }),
  e({ id: 'END_03', title: '에이스 변호사', tier: 'A', category: 'ELITE', minStats: { INT: 700, CHA: 700, MOR: 450 }, minAptitudes: { APT_LAW: 7 }, conditionText: 'INT≥700, CHA≥700, MOR≥450 / APT_LAW≥7', epilogueText: '법정에서 "이의 있소!" 역전 변론으로 승소를 이끄는 에이스 변호사.' }),
  e({ id: 'END_04', title: '노벨상 과학자', tier: 'S', category: 'ELITE', minStats: { INT: 880, TEC: 700, ART: 500 }, anyAptitudes: { APT_MED: 8, APT_IT: 8 }, conditionText: 'INT≥880, TEC≥700, ART≥500 / APT_MED≥8 또는 APT_IT≥8', epilogueText: '스톡홀름 시상식에서 메달을 수여받는 세계적 석학이 되었다.' }),
  e({ id: 'END_05', title: '수의사', tier: 'A', category: 'ELITE', minStats: { INT: 600, MOR: 650, TEC: 500 }, minAptitudes: { APT_MED: 6 }, requiredActionCounts: { JOB_04: 10 }, conditionText: 'INT≥600, MOR≥650, TEC≥500 / APT_MED≥6, 동물병원 알바 10회↑', epilogueText: '강아지·고양이들에게 둘러싸인 따뜻한 동물병원 원장님.' }),
  e({ id: 'END_06', title: '약사', tier: 'B', category: 'ELITE', minStats: { INT: 520, TEC: 450, MOR: 500 }, minAptitudes: { APT_MED: 5 }, conditionText: 'INT≥520, TEC≥450, MOR≥500 / APT_MED≥5', epilogueText: '깔끔한 약국 가운을 입고 친절하게 복약 지도하는 약사.' }),
  e({ id: 'END_07', title: '대학교수', tier: 'A', category: 'ELITE', minStats: { INT: 750, MOR: 600, CHA: 500 }, requiredActionCounts: { WIN_EXAM: 1 }, conditionText: 'INT≥750, MOR≥600, CHA≥500 / 기말시험(학술제) 우승 1회↑', epilogueText: '대형 강의실 칠판 앞에서 열정적으로 강의하는 교수님.' }),
  e({ id: 'END_08', title: '베스트셀러 작가', tier: 'A', category: 'ELITE', minStats: { INT: 650, ART: 750 }, requiredActionCounts: { JOB_03: 8 }, conditionText: 'INT≥650, ART≥750 / 도서관 알바 8회↑', epilogueText: '서점 사인회에 긴 줄이 늘어선 문학계 스타.' }),
  e({ id: 'END_09', title: '심리상담사', tier: 'B', category: 'ELITE', minStats: { INT: 500, MOR: 650, CHA: 550 }, minAffection: 85, conditionText: 'INT≥500, MOR≥650, CHA≥550 / 친밀도≥85', epilogueText: '아늑한 상담실에서 내담자의 마음을 치유하는 전문가.' }),
  e({ id: 'END_10', title: '초등학교 교사', tier: 'B', category: 'ELITE', minStats: { INT: 480, MOR: 600, CHA: 450 }, maxDelinquency: 10, conditionText: 'INT≥480, MOR≥600, CHA≥450 / 비행≤10', epilogueText: '아이들과 함께 교실에서 해맑게 웃는 인기 선생님.' }),

  // ── [B] IT·테크 계열 (7종)
  e({ id: 'END_11', title: '전설의 게임 개발자', tier: 'S', category: 'TECH', minStats: { TEC: 820, ART: 700, INT: 680 }, minAptitudes: { APT_IT: 8 }, requiredComboId: 'CMB_03', conditionText: 'TEC≥820, ART≥700, INT≥680 / APT_IT≥8, CMB_03 보유', epilogueText: '황금 트로피를 들고 올해의 게임상(GOTY)을 수상했다!' }),
  e({ id: 'END_12', title: 'AI 로봇공학자', tier: 'S', category: 'TECH', minStats: { INT: 800, TEC: 800 }, minAptitudes: { APT_IT: 8 }, conditionText: 'INT≥800, TEC≥800 / APT_IT≥8', epilogueText: '직접 만든 이족보행 도트 로봇과 하이파이브하는 연구소장.' }),
  e({ id: 'END_13', title: '화이트 해커', tier: 'A', category: 'TECH', minStats: { TEC: 720, INT: 680, MOR: 550 }, minAptitudes: { APT_IT: 7 }, conditionText: 'TEC≥720, INT≥680, MOR≥550 / APT_IT≥7', epilogueText: '다중 모니터 앞에서 글로벌 사이버 공격을 막는 영웅.' }),
  e({ id: 'END_14', title: '우주비행사', tier: 'S', category: 'TECH', minStats: { INT: 780, STR: 780, TEC: 650 }, requiredComboId: 'CMB_10', minFame: 200, conditionText: 'INT≥780, STR≥780, TEC≥650 / CMB_10 보유, 명성≥200', epilogueText: '우주복을 입고 달 표면에 깃발을 꽂는 감동적인 장면.' }),
  e({ id: 'END_15', title: '건축가', tier: 'A', category: 'TECH', minStats: { TEC: 650, ART: 650, INT: 550 }, minAptitudes: { APT_IT: 5 }, conditionText: 'TEC≥650, ART≥650, INT≥550 / APT_IT≥5', epilogueText: '안전모를 쓰고 자신이 설계한 랜드마크 빌딩을 바라본다.' }),
  e({ id: 'END_16', title: '풀스택 웹 개발자', tier: 'B', category: 'TECH', minStats: { TEC: 500, INT: 450 }, minAptitudes: { APT_IT: 5 }, conditionText: 'TEC≥500, INT≥450 / APT_IT≥5', epilogueText: 'IT 기업 라운지에서 커피를 마시며 코딩하는 개발자.' }),
  e({ id: 'END_17', title: '프로게이머 (e스포츠 황제)', tier: 'A', category: 'TECH', minStats: { TEC: 750, STR: 500, CHA: 550 }, requiredFlag: 'FLAG_GAME_CHAMP', conditionText: 'TEC≥750, STR≥500, CHA≥550 / 게임대회 우승 플래그', epilogueText: '대형 경기장 부스에서 우승컵을 들어 올리는 슈퍼스타.' }),

  // ── [C] 예술·대중문화 & 엔터테인먼트 (9종)
  e({ id: 'END_18', title: '글로벌 팝 아이돌', tier: 'S', category: 'ENT', minStats: { CHA: 850, ART: 750, STR: 600 }, minAptitudes: { APT_ENT: 8 }, minFame: 250, conditionText: 'CHA≥850, ART≥750, STR≥600 / APT_ENT≥8, 명성≥250', epilogueText: '화려한 콘서트 무대 중앙에서 응원봉 물결을 받는다.' }),
  e({ id: 'END_19', title: '칸 영화제 명감독', tier: 'S', category: 'ENT', minStats: { ART: 820, INT: 650, CHA: 650 }, minAptitudes: { APT_ENT: 8 }, conditionText: 'ART≥820, INT≥650, CHA≥650 / APT_ENT≥8', epilogueText: '레드카펫 위에서 황금종려상 트로피를 치켜든다.' }),
  e({ id: 'END_20', title: '인기 웹툰 작가', tier: 'A', category: 'ENT', minStats: { ART: 750, TEC: 650 }, requiredComboId: 'CMB_05', requiredActionCounts: { WIN_ARTFEST: 1 }, conditionText: 'ART≥750, TEC≥650 / CMB_05 보유, 예술제 입상', epilogueText: '마감 후 포털 실시간 1위 축전을 보며 감격하는 화실.' }),
  e({ id: 'END_21', title: '세계적 피아니스트', tier: 'A', category: 'ENT', minStats: { ART: 800, TEC: 600, MOR: 500 }, requiredComboId: 'CMB_04', conditionText: 'ART≥800, TEC≥600, MOR≥500 / CMB_04 보유', epilogueText: '오케스트라와 협연하며 기립박수를 받는 클래식 거장.' }),
  e({ id: 'END_22', title: '천만 영화배우', tier: 'A', category: 'ENT', minStats: { CHA: 780, ART: 680 }, minAptitudes: { APT_ENT: 7 }, minFame: 180, conditionText: 'CHA≥780, ART≥680 / APT_ENT≥7, 명성≥180', epilogueText: '촬영장 조명 아래에서 명연기를 펼치는 톱스타.' }),
  e({ id: 'END_23', title: '메가 인플루언서', tier: 'A', category: 'ENT', minStats: { CHA: 750, TEC: 500 }, requiredComboId: 'CMB_09', conditionText: 'CHA≥750, TEC≥500 / CMB_09 보유', epilogueText: '골드 버튼을 들고 백만 구독자 달성 기념 라이브 방송.' }),
  e({ id: 'END_24', title: '패션 디자이너', tier: 'A', category: 'ENT', minStats: { ART: 700, CHA: 600, TEC: 550 }, minAptitudes: { APT_ENT: 6 }, conditionText: 'ART≥700, CHA≥600, TEC≥550 / APT_ENT≥6', epilogueText: '파리 패션위크 런웨이 피날레에 등장해 인사하는 디자이너.' }),
  e({ id: 'END_25', title: '메인 뉴스 아나운서', tier: 'A', category: 'ENT', minStats: { CHA: 700, INT: 650, MOR: 600 }, anyAptitudes: { APT_LAW: 5, APT_ENT: 5 }, conditionText: 'CHA≥700, INT≥650, MOR≥600 / APT_LAW≥5 또는 APT_ENT≥5', epilogueText: '8시 메인 뉴스 데스크에서 신뢰감 있게 브리핑하는 앵커.' }),
  e({ id: 'END_26', title: '거리의 인디 뮤지션', tier: 'B', category: 'ENT', minStats: { ART: 480, CHA: 450 }, requiredActionCounts: { JOB_06: 8 }, conditionText: 'ART≥480, CHA≥450 / 버스킹 알바 8회↑', epilogueText: '홍대 거리에서 통기타를 치며 관객들과 호흡하는 예술가.' }),

  // ── [D] 비즈니스·요리 & 라이프스타일 (8종)
  e({ id: 'END_27', title: '글로벌 유니콘 CEO', tier: 'S', category: 'BIZ', minStats: { INT: 750, CHA: 800, TEC: 600 }, minAptitudes: { APT_BIZ: 8 }, minGold: 5000, conditionText: 'INT≥750, CHA≥800, TEC≥600 / APT_BIZ≥8, 골드≥5,000G', epilogueText: '고층 펜트하우스 집무실에서 타임지 표지 모델이 되었다.' }),
  e({ id: 'END_28', title: '미슐랭 3스타 셰프', tier: 'S', category: 'BIZ', minStats: { TEC: 800, ART: 700, STR: 550 }, requiredComboId: 'CMB_08', conditionText: 'TEC≥800, ART≥700, STR≥550 / CMB_08 보유', epilogueText: '하얀 셰프복을 입고 최고급 파인다이닝 주방을 지휘한다.' }),
  e({ id: 'END_29', title: '월스트리트 펀드매니저', tier: 'A', category: 'BIZ', minStats: { INT: 750, CHA: 600 }, minAptitudes: { APT_BIZ: 7 }, requiredComboId: 'CMB_07', conditionText: 'INT≥750, CHA≥600 / APT_BIZ≥7, CMB_07 보유', epilogueText: '증권거래소 전광판 앞에서 수백억 자산을 운용하는 귀재.' }),
  e({ id: 'END_30', title: '외교관', tier: 'A', category: 'BIZ', minStats: { INT: 720, CHA: 720, MOR: 650 }, minAptitudes: { APT_LAW: 6, APT_BIZ: 6 }, conditionText: 'INT≥720, CHA≥720, MOR≥650 / APT_LAW≥6, APT_BIZ≥6', epilogueText: 'UN 회의장에서 유창하게 연설하는 외교 사절.' }),
  e({ id: 'END_31', title: '파티시에 (디저트 명장)', tier: 'B', category: 'BIZ', minStats: { TEC: 550, ART: 550 }, requiredActionCounts: { JOB_02: 8 }, conditionText: 'TEC≥550, ART≥550 / 베이커리 알바 8회↑', epilogueText: '달콤한 케이크와 마카롱이 가득한 디저트 카페 사장님.' }),
  e({ id: 'END_32', title: '플로리스트', tier: 'B', category: 'BIZ', minStats: { ART: 500, CHA: 450, MOR: 500 }, requiredFlag: 'NO_BURST', conditionText: 'ART≥500, CHA≥450, MOR≥500 / 스트레스 관리 우수(폭발 0회)', epilogueText: '꽃향기 가득한 온실 공방에서 부케를 만드는 모습.' }),
  e({ id: 'END_33', title: '호텔 지배인', tier: 'B', category: 'BIZ', minStats: { CHA: 580, MOR: 550, INT: 480 }, minAptitudes: { APT_BIZ: 5 }, conditionText: 'CHA≥580, MOR≥550, INT≥480 / APT_BIZ≥5', epilogueText: '5성급 럭셔리 호텔 로비에서 VIP 고객을 맞이하는 지배인.' }),
  e({ id: 'END_34', title: '대기업 사원', tier: 'B', category: 'BIZ', minStats: { INT: 420, MOR: 400, CHA: 400 }, conditionText: 'INT≥420, MOR≥400, CHA≥400 / 기본 공채 통과', epilogueText: '사원증을 목에 걸고 당당하게 출근하는 사회초년생.' }),

  // ── [E] 체육·공공안전 & 액션 (6종)
  e({ id: 'END_35', title: '올림픽 금메달리스트', tier: 'S', category: 'ACTION', minStats: { STR: 880, TEC: 650, MOR: 550 }, requiredComboId: 'CMB_06', requiredActionCounts: { WIN_SPORTS: 3 }, conditionText: 'STR≥880, TEC≥650, MOR≥550 / CMB_06 보유, 체육대회 3회 우승', epilogueText: '시상대 맨 위에서 금메달을 깨물며 환호하는 국민 영웅.' }),
  e({ id: 'END_36', title: '프로 스포츠 슈퍼스타', tier: 'A', category: 'ACTION', minStats: { STR: 780, CHA: 600 }, minAptitudes: { APT_ADV: 7 }, minFame: 150, conditionText: 'STR≥780, CHA≥600 / APT_ADV≥7, 명성≥150', epilogueText: '수많은 팬들의 사인 요청을 받는 프랜차이즈 스타.' }),
  e({ id: 'END_37', title: '특수부대 장교', tier: 'A', category: 'ACTION', minStats: { STR: 750, MOR: 700, INT: 550 }, minAptitudes: { APT_ADV: 6 }, conditionText: 'STR≥750, MOR≥700, INT≥550 / APT_ADV≥6', epilogueText: '정복에 훈장을 달고 부대원들의 경례를 받는 엘리트 장교.' }),
  e({ id: 'END_38', title: '열혈 형사 (경찰 간부)', tier: 'A', category: 'ACTION', minStats: { STR: 680, INT: 600, MOR: 680 }, minAptitudes: { APT_LAW: 5 }, conditionText: 'STR≥680, INT≥600, MOR≥680 / APT_LAW≥5', epilogueText: '사건 현장에서 범인을 검거하고 수갑을 채우는 정의의 형사.' }),
  e({ id: 'END_39', title: '119 구조대원 (소방관)', tier: 'A', category: 'ACTION', minStats: { STR: 720, MOR: 750 }, maxDelinquency: 0, conditionText: 'STR≥720, MOR≥750 / 비행=0', epilogueText: '화마 속에서 시민을 구출하고 늠름하게 미소 짓는 영웅.' }),
  e({ id: 'END_40', title: '항공기 기장 (파일럿)', tier: 'A', category: 'ACTION', minStats: { INT: 680, TEC: 700, STR: 650 }, minAptitudes: { APT_IT: 5 }, conditionText: 'INT≥680, TEC≥700, STR≥650 / APT_IT≥5', epilogueText: '제복과 선글라스를 착용하고 여객기 조종석에 앉은 캡틴.' }),

  // ── [F] 판타지·오컬트 & 특수 히든 (6종)
  e({ id: 'END_41', title: '전설의 용사', tier: 'SS', category: 'HIDDEN', minStats: { STR: 850, MOR: 800, INT: 650 }, minAptitudes: { APT_ADV: 9 }, requiredComboId: 'CMB_12', requiredFlag: 'FLAG_HERO_SWORD', conditionText: 'STR≥850, MOR≥800, INT≥650 / APT_ADV≥9, CMB_12 + 성검 플래그', epilogueText: '성검을 뽑아 마왕을 물리치고 세계의 평화를 지킨 전설!' }),
  e({ id: 'END_42', title: '마법소녀 / 대마법사', tier: 'SS', category: 'HIDDEN', minStats: { ART: 820, INT: 800, MOR: 700 }, minAptitudes: { APT_ADV: 8 }, requiredFlag: 'FLAG_MAGIC_BOOK', conditionText: 'ART≥820, INT≥800, MOR≥700 / APT_ADV≥8, 마법서 플래그', epilogueText: '별빛 요술봉을 들고 하늘을 날며 도시를 수호하는 신비 엔딩.' }),
  e({ id: 'END_43', title: '왕실 공주 / 왕자 배우자', tier: 'SS', category: 'HIDDEN', minStats: { CHA: 900, INT: 700, ART: 700, MOR: 750 }, minFame: 350, requiredFlag: 'FLAG_ROYAL_BALL', conditionText: 'CHA≥900, INT≥700, ART≥700, MOR≥750 / 명성≥350, 왕실 무도회 플래그', epilogueText: '무도회에서 만난 왕족과 결혼하는 로열 엔딩.' }),
  e({ id: 'END_44', title: '도트 마스코트 계승자', tier: 'SS', category: 'HIDDEN', minStats: { INT: 650, STR: 650, ART: 650, CHA: 650, MOR: 650, TEC: 650 }, minFurnitureCollectionRate: 0.8, conditionText: '전 스탯≥650 / 가구 도감 80% 이상 수집', epilogueText: '황금 로봇 슈트를 물려받아 개발사를 이끄는 진엔딩.' }),
  e({ id: 'END_45', title: '고고학자 (보물 사냥꾼)', tier: 'A', category: 'HIDDEN', minStats: { INT: 650, STR: 650 }, minAptitudes: { APT_ADV: 7 }, requiredActionCounts: { OUT_RUINS: 5 }, conditionText: 'INT≥650, STR≥650 / APT_ADV≥7, 고대 유적 외출 5회↑', epilogueText: '중절모와 채찍을 들고 피라미드 황금 유물을 발굴하는 모험가.' }),
  e({ id: 'END_46', title: '미스터리 탐정', tier: 'A', category: 'HIDDEN', minStats: { INT: 750, TEC: 600, CHA: 500 }, minAptitudes: { APT_LAW: 6, APT_ADV: 6 }, conditionText: 'INT≥750, TEC≥600, CHA≥500 / APT_LAW≥6, APT_ADV≥6', epilogueText: '트렌치코트와 돋보기를 들고 미제 사건의 진범을 지목!' }),

  // ── [G] 다크·언더그라운드 & 코믹 폴백 (4종)
  e({ id: 'END_47', title: '세기의 괴도 (팬텀 시프)', tier: 'A', category: 'DARK', minStats: { TEC: 750, CHA: 750, STR: 650 }, maxStats: { MOR: 250 }, minDelinquency: 60, conditionText: 'TEC≥750, CHA≥750, STR≥650 / MOR≤250, 비행≥60', epilogueText: '달빛 아래 예고장을 날리고 박물관 보석을 훔쳐 사라지는 괴도.' }),
  e({ id: 'END_48', title: '지하세계 보스', tier: 'A', category: 'DARK', minStats: { STR: 750, CHA: 700, INT: 600 }, maxStats: { MOR: 150 }, minDelinquency: 80, conditionText: 'STR≥750, CHA≥700, INT≥600 / MOR≤150, 비행≥80', epilogueText: '검은 정장과 중절모를 쓰고 뒷골목을 평정한 카리스마 보스.' }),
  e({ id: 'END_49', title: '자유로운 세계여행가', tier: 'B', category: 'DARK', minStats: { STR: 450, CHA: 450 }, requiredActionCounts: { OUTING_TOTAL: 30 }, conditionText: 'STR≥450, CHA≥450 / 외출·바캉스 30회↑', epilogueText: '커다란 배낭을 메고 오대양 육대주를 누비는 유쾌한 노마드.' }),
  e({ id: 'END_50', title: '방구석 한량 (백수)', tier: 'C', category: 'DARK', minStats: {}, conditionText: '모든 상위 엔딩 조건 미달 시 기본 발령', epilogueText: '스무 살이 되었지만 아직 부모님 방에서 뒹굴거리며 진로를 고민 중!' }),
];

export const ENDING_MAP: Record<string, EndingDefinition> = Object.fromEntries(ENDINGS.map((x) => [x.id, x]));

export const CATEGORY_LABEL: Record<EndingCategory, string> = {
  ELITE: '엘리트 전문직 & 학술',
  TECH: 'IT·테크',
  ENT: '예술·엔터테인먼트',
  BIZ: '비즈니스·라이프스타일',
  ACTION: '체육·공공안전',
  HIDDEN: '판타지·히든',
  DARK: '다크·폴백',
};

/** 게임 상태에 대해 엔딩 조건을 충족하는지 검사 */
export function meetsEnding(def: EndingDefinition, state: GameState, collectionRate = 0): boolean {
  for (const [k, v] of Object.entries(def.minStats) as [StatKey, number][]) {
    if (state.stats[k] < v) return false;
  }
  if (def.maxStats) {
    for (const [k, v] of Object.entries(def.maxStats) as [StatKey, number][]) {
      if (state.stats[k] > v) return false;
    }
  }
  if (def.minAptitudes) {
    for (const [k, v] of Object.entries(def.minAptitudes) as [AptitudeKey, number][]) {
      if (state.aptitudes[k].level < v) return false;
    }
  }
  if (def.anyAptitudes) {
    const ok = (Object.entries(def.anyAptitudes) as [AptitudeKey, number][]).some(([k, v]) => state.aptitudes[k].level >= v);
    if (!ok) return false;
  }
  const s = state.status;
  if (def.minFame !== undefined && s.fame < def.minFame) return false;
  if (def.minAffection !== undefined && s.affection < def.minAffection) return false;
  if (def.maxDelinquency !== undefined && s.delinquency > def.maxDelinquency) return false;
  if (def.minDelinquency !== undefined && s.delinquency < def.minDelinquency) return false;
  if (def.minGold !== undefined && state.gold < def.minGold) return false;
  if (def.requiredComboId && !state.activeCombos.includes(def.requiredComboId) && !state.flags.includes(`COMBO:${def.requiredComboId}`)) return false;
  if (def.requiredFlag && !state.flags.includes(def.requiredFlag)) return false;
  if (def.requiredActionCounts) {
    for (const [k, v] of Object.entries(def.requiredActionCounts)) {
      if ((state.actionCounts[k] ?? 0) < v) return false;
    }
  }
  if (def.minFurnitureCollectionRate !== undefined && collectionRate < def.minFurnitureCollectionRate) return false;
  return true;
}

const requiredStatSum = (def: EndingDefinition) => Object.values(def.minStats).reduce((a, b) => a + (b ?? 0), 0);

/**
 * 6.1 엔딩 판정 우선순위 알고리즘.
 * Priority 1 → 5 순서대로 검사, 같은 우선순위 내에서는 요구 스탯 총합이 가장 높은 엔딩 1개를 선택.
 */
export function evaluateEnding(state: GameState, collectedFurnitureIds: string[] = []): EndingDefinition {
  const collectionRate = collectedFurnitureIds.length / FURNITURE.length;
  for (let p = 1; p <= 5; p++) {
    const candidates = ENDINGS.filter((d) => d.priority === p && meetsEnding(d, state, collectionRate));
    if (candidates.length) {
      return candidates.sort((a, b) => requiredStatSum(b) - requiredStatSum(a))[0];
    }
  }
  return ENDING_MAP.END_50;
}
