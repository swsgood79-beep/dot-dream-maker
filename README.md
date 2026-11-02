# 🏠✨ 도트 드림 메이커 (Dot Dream Maker)

아기자기한 2D 도트 방 꾸미기·가구 시너지 경영 + 다중 엔딩 육성 시뮬레이션 모바일 웹 게임.

부모가 되어 아들 또는 딸을 **8세 1월부터 19세 12월까지 144개월** 동안 키우며,
방에 가구를 배치해 **전문 구역 콤보**를 만들고 매달 4주 스케줄을 편성해 **50가지 직업 엔딩** 중 하나로 성장시킵니다.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm test         # 엔진 테스트
npm run build    # 배포 빌드 (dist/)
```

## 버전 로드맵

| 버전 | 내용 | 상태 |
| --- | --- | --- |
| v0.1.0 | 데이터 · 50종 엔딩 엔진 · 스토어 · 최소 플레이 UI | ✅ |
| v0.2.0 | 아이소메트릭 도트 방 렌더러 (Canvas), 픽셀 가구 스프라이트, 콤보 오라 하이라이트 | ⏳ |
| v0.3.0 | 성장 단계별 도트 캐릭터 · 가구로 이동하는 스케줄 실행 연출 · 플로팅 팝업 | ⏳ |
| v0.4.0 | 레트로 UI 모달 다듬기 · 연간 대회 이벤트 연출 · 엔딩 일러스트 · 효과음(ZzFX) | ⏳ |
| v0.5.0 | 밸런스 조정 · PWA/모바일 패키징 | ⏳ |

## 구조

```
src/
  types/game.ts           기획서 7장 데이터 스키마
  data/                   가구·콤보 / 스케줄 / 엔딩 마스터 데이터
  engine/room.ts          타일 배치, 콤보(맨해튼 2칸) 판정, 오라 합산
  engine/simulation.ts    월간 턴 진행 · 성장 공식 · 이벤트
  store/useGameStore.ts   Zustand 스토어 (localStorage 저장)
  components/             화면 / 패널 UI
```

변경 내역은 [CHANGELOG.md](./CHANGELOG.md) 참고.

폰트: [Galmuri](https://github.com/quiple/galmuri) (SIL Open Font License 1.1)
