"""스케줄 연출용 그림만 담은 요청서 (docs/scene_requests.xlsx).
실행: python3 scripts/make-scene-requests.py
프롬프트·칸 정의는 make-sprite-requests.py 의 7순위 시트를 그대로 가져온다."""
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

src = open('scripts/make-sprite-requests.py', encoding='utf-8').read().split('# ── 워크북')[0]
ns: dict = {}
exec(src, ns)
need = [x for x in ns['sheets'] if x[0] == 7 and x[1] != 'X1']

# ── 칸마다 한글 상세 설명 + 게임에서 쓰이는 곳
BG_KO = {
    'BG_EDU_01': ('종합 보습학원 교실', '뒷벽에 커다란 초록 칠판(글씨 없이), 왼쪽·오른쪽에 나무 책걸상, 벽시계, 창문 햇살. 가운데 아래는 비움.', '스케줄 [종합 보습학원]'),
    'BG_EDU_02': ('과학·의학 실험실', '하늘색 벽, 양옆 흰 실험대 위 현미경·색색 비커·시험관, 벽에 DNA 그림(글씨 없이).', '스케줄 [영재 과학·의학 학원]'),
    'BG_EDU_03': ('논술 토론 교실', '베이지 벽, 오른쪽 나무 연설대, 왼쪽 오래된 책장, 뒷벽에 빈 크림색 화이트보드.', '스케줄 [로스쿨 준비 논술반]'),
    'BG_EDU_04': ('밤의 코딩실', '남색·보라 톤의 어두운 방, 양옆 책상 위 빛나는 모니터, 뒷벽에 빈 큰 화면, 케이블과 게임패드.', '스케줄 [코딩·게임 제작 부트캠프]'),
    'BG_EDU_05': ('음악·댄스 연습 무대', '보라색 벽, 천장 스포트라이트가 가운데를 비춤, 왼쪽 전자 피아노, 오른쪽 마이크 스탠드, 벽 거울.', '스케줄 [실용음악·댄스 아카데미]'),
    'BG_EDU_06': ('미술 화실', '따뜻한 색 화실, 왼쪽 빈 캔버스를 올린 이젤, 오른쪽 물감통·붓이 놓인 탁자, 벽에 추상화 액자, 나무 바닥에 물감 자국.', '스케줄 [미술·웹툰 창작 화실]'),
    'BG_EDU_07': ('무술 도장', '초록·빨강 매트 바닥, 왼쪽 흰 도복이 걸린 옷걸이, 오른쪽 샌드백, 나무 벽에 메달 선반.', '스케줄 [유소년 체육·무술 도장]'),
    'BG_EDU_08': ('경제·리더십 회의실', '하늘색 벽, 왼쪽 긴 회의 탁자, 오른쪽 상승 막대그래프(숫자 없이)가 걸린 이젤, 뒷벽 빈 화이트보드.', '스케줄 [어린이 경제·리더십 스쿨]'),
    'BG_JOB_01': ('대청소하는 거실', '햇살 드는 가족 거실, 왼쪽 빨래 바구니, 오른쪽 양동이와 대걸레, 뒤에 소파, 나무 바닥.', '스케줄 [집안일 돕기]'),
    'BG_JOB_02': ('동네 베이커리', '크림색 가게, 왼쪽 빵·크루아상이 가득한 유리 진열대, 오른쪽 주황빛 벽돌 오븐, 뒷벽 바게트 선반.', '스케줄 [동네 베이커리 보조]'),
    'BG_JOB_03': ('도서관', '양옆 색색 책이 꽂힌 높은 책장, 나무 반납 카트, 화분, 큰 창으로 들어오는 은은한 빛.', '스케줄 [도서관 사서 도우미]'),
    'BG_JOB_04': ('동물병원', '민트색 벽, 왼쪽 흰 진료대, 오른쪽 졸린 강아지·고양이가 있는 케이지, 약 선반.', '스케줄 [동물병원 케어 알바]'),
    'BG_JOB_05': ('밤의 게임 회사', '보라·남색 톤 사무실, 양옆 모니터와 게임 컨트롤러가 놓인 책상, 뒷벽 빈 큰 화면, 커피잔, 빈 포스트잇.', '스케줄 [인디게임 QA 테스터]'),
    'BG_JOB_06': ('저녁 거리 버스킹', '보랏빛 저녁 하늘, 양옆 불 켜진 가게들, 가로등, 왼쪽 작은 앰프, 오른쪽 바닥에 열린 기타 케이스.', '스케줄 [거리 버스킹 공연]'),
    'BG_JOB_07': ('법률사무소', '베이지 벽, 왼쪽 서류 캐비닛과 서류 더미, 오른쪽 정의의 저울 조각상이 놓인 나무 책상, 두꺼운 법전 책장.', '스케줄 [법률사무소 문서 정리]'),
    'BG_JOB_08': ('밤 골목 (심부름)', '어두운 남색 골목, 벽돌 벽, 왼쪽 택배 상자 더미, 오른쪽 공사 바리케이드, 깜빡이는 가로등 하나.', '스케줄 [밤거리 심부름]'),
    'BG_REST_01': ('아이 방 휴식', '오후 햇살의 아늑한 아이 방, 왼쪽 분홍 이불 침대, 오른쪽 낮은 장 위 작은 TV, 바닥에 쿠션과 과자.', '스케줄 [방에서 휴식] (침대 가구가 없을 때)'),
    'BG_REST_02': ('밤 캠핑장', '별이 가득한 밤하늘과 초승달, 왼쪽 텐트, 오른쪽 타닥타닥 모닥불, 소나무, 풀밭.', '스케줄 [가족 캠핑·바캉스]'),
    'BG_OUT_SHOP': ('백화점', '분홍·흰색 매장, 왼쪽 알록달록한 옷걸이 진열대, 오른쪽 신발 진열대와 전신 거울, 쇼핑백.', '스케줄 [외출: 백화점 쇼핑]'),
    'BG_OUT_BOOK': ('동네 서점', '따뜻한 조명의 서점, 양옆 나무 책장, 신간 책 테이블, 독서 탁자 위 커피잔, 매달린 전등.', '스케줄 [외출: 서점 방문]'),
    'BG_OUT_SCI': ('과학관', '별이 그려진 남색 천장에 매달린 행성들, 왼쪽 큰 공룡 뼈, 오른쪽 큰 망원경, 작은 로켓 모형.', '스케줄 [외출: 과학관 견학]'),
    'BG_OUT_ARCADE': ('오락실', '보라색 벽 네온사인, 양옆 화면이 빛나는(글자 없는) 오락기 줄, 인형 뽑기 기계.', '스케줄 [외출: 오락실]'),
    'BG_OUT_RUINS': ('고대 유적', '주황빛 하늘의 사막, 왼쪽 거대한 돌 머리 석상, 오른쪽 부서진 돌기둥과 신전 문, 선인장, 해, 모래 바닥.', '스케줄 [외출: 고대 유적 탐방]'),
    'BG_OUT_ALLEY': ('뒷골목', '어두운 밤하늘의 달, 벽돌 벽에 알록달록한 낙서 무늬(글자 없이), 오른쪽 쓰레기통, 물웅덩이.', '스케줄 [외출: 뒷골목 배회]'),
    'BG_RUNAWAY': ('비 오는 밤 정류장', '푸른 회색 톤, 오른쪽 벤치가 있는 버스 정류장, 내리는 비, 가로등이 비친 물웅덩이. 쓸쓸한 분위기.', '아이가 가출한 주 (스트레스 폭발 후)'),
    'BG_CONTEST_SPORTS': ('체육대회 운동장', '파란 하늘, 달리기 트랙, 위에 걸린 만국기, 멀리 관중석 실루엣.', '5월 체육대회 창 배경 (선택)'),
    'BG_CONTEST_ARTFEST': ('예술제 강당 무대', '양옆 무거운 붉은 커튼, 따뜻한 무대 조명, 나무 무대 바닥, 앞쪽 어두운 객석.', '10월 예술제 창 배경 (선택)'),
    'BG_CONTEST_EXAM': ('기말시험 교실', '빈 답안지가 놓인 책상 줄, 빈 칠판, 벽시계, 조용한 오후 햇살.', '12월 기말시험 창 배경 (선택)'),
}
POSE_KO = {
    'bake': ('빵 쟁반 들기', '오븐 장갑을 끼고 갓 구운 빵이 담긴 쟁반을 들고 있음', '[동네 베이커리 보조]'),
    'sweep': ('빗자루질', '빗자루로 바닥을 쓰는 중', '[집안일 돕기]'),
    'guitar': ('통기타 버스킹', '서서 통기타를 치며 노래', '[거리 버스킹 공연]'),
    'dance': ('댄스', '한 팔을 번쩍 든 신나는 춤 동작', '[실용음악·댄스 아카데미]'),
    'kick': ('태권도 발차기', '높이 발차기 (옷은 원래 옷 그대로)', '[유소년 체육·무술 도장]'),
    'experiment': ('시험관 관찰', '보안경을 쓰고 시험관을 들어 올려 들여다봄', '[영재 과학·의학 학원]'),
    'pet': ('강아지 안기', '작은 갈색 강아지를 꼭 안고 있음', '[동물병원 케어 알바]'),
    'shopping': ('쇼핑백 들기', '양손에 알록달록한 쇼핑백, 신난 표정', '[외출: 백화점 쇼핑]'),
    'camp': ('마시멜로 굽기', '서서 긴 막대 끝의 구운 마시멜로를 들고 있음', '[가족 캠핑·바캉스] (선택)'),
    'arcade': ('오락기 조작', '조이스틱을 잡고 버튼을 누르며 흥분', '[외출: 오락실] (선택)'),
    'explore': ('지도와 손전등', '보물 지도와 손전등을 든 탐험 자세', '[외출: 고대 유적 탐방] (선택)'),
    'raise': ('손 번쩍 들기', '수업 시간에 한 손을 높이 들고 발표', '[종합 보습학원]·[논술반] (선택)'),
}

OUT = 'docs/scene_requests.xlsx'
F = 'Arial'
HDR = PatternFill('solid', fgColor='3B2414')
HF = Font(name=F, bold=True, color='FFFFFF', size=10)
B = Font(name=F, size=10)
BB = Font(name=F, size=10, bold=True)
WRAP = Alignment(wrap_text=True, vertical='top')
CEN = Alignment(horizontal='center', vertical='top', wrap_text=True)
side = Side(style='thin', color='C8B8A0')
BOX = Border(left=side, right=side, top=side, bottom=side)
YEL = PatternFill('solid', fgColor='FFF59D')
BG_FILL = PatternFill('solid', fgColor='E6F0DC')
ACT_FILL = PatternFill('solid', fgColor='FDE2F0')

wb = Workbook()

# ── 1) 설명
ws0 = wb.active
ws0.title = '설명'
ws0.column_dimensions['A'].width = 3
ws0.column_dimensions['B'].width = 115
lines = [
    ('도트 드림 메이커 — 스케줄 연출 그림 요청서', 'title'),
    ('', None),
    ('이 그림들이 왜 필요한가요?', 'h'),
    ('한 달 스케줄을 진행하면 아이가 학원·알바·외출을 하러 문밖으로 나가고, 그동안 방 대신 "그 장소" 장면이 나옵니다 (v0.19).', None),
    ('지금은 이 장면을 색 배경 + 이모지로 임시로 그리고 있어서 게임 그림과 어울리지 않습니다. 아래 13장이 오면 진짜 도트 배경과 동작으로 바꿉니다.', None),
    ('', None),
    ('필요한 그림 (총 13장)', 'h'),
    ('① 장소 배경 7장 (S1~S7): 한 장에 세로형 장소 4곳씩 2×2. 학원 8곳 · 알바 8곳 · 휴식/외출 8곳 · 가출 1곳 · 대회 3곳(선택) = 28곳', None),
    ('② 활동 포즈 6장 (A-나이-성별): 한 장에 동작 12개씩 3×4. 아들/딸 × 유년/청소년/청년. 장소에 어울리는 동작(빵 쟁반, 빗자루, 기타, 발차기 등)', None),
    ('   → 앞쪽 8동작은 필수, 뒤쪽 4동작(마시멜로·오락기·지도·손 들기)은 선택입니다. 선택 동작이 이상하게 나와도 다시 안 그려도 됩니다.', None),
    ('', None),
    ('요청하는 방법', 'h'),
    ('1. [요청 목록] 탭에서 순서대로 한 줄씩 진행합니다. 배경(1~7번)부터 하는 걸 추천합니다. 가장 눈에 띄게 달라집니다.', None),
    ('2. [프롬프트] 칸을 통째로 복사해 Gemini에 붙여 넣습니다. (영어로 되어 있는 게 정상입니다. 이미지 모델은 영어 지시를 더 정확히 따릅니다.)', None),
    ('3. [첨부] 칸에 이미지 이름이 있으면 그 이미지를 같이 올립니다. 포즈 시트는 꼭 첨부해야 얼굴·옷이 기존 캐릭터와 같아집니다. 배경은 첨부 없음.', None),
    ('4. 결과를 [칸별 확인] 탭과 비교합니다. 칸 수·순서가 맞으면 [저장 이름]으로 저장해서 보내 주세요.', None),
    ('5. 다 된 줄은 [완료] 칸(노란 칸)에서 O를 고르면 위쪽 진행률이 올라갑니다.', None),
    ('', None),
    ('배경(S1~S7)에서 꼭 지켜야 할 것', 'h'),
    ('• 정면에서 본 무대 세트 같은 그림 (방처럼 비스듬한 아이소메트릭 X)', None),
    ('• 각 패널의 아래 30%는 바닥, 가운데 아래쪽은 비워 둠 → 게임이 아이 캐릭터를 그 자리에 세웁니다', None),
    ('• 사람·동물 캐릭터 없음 (동물병원 케이지 속 강아지·고양이만 예외), 글자·숫자·로고 없음', None),
    ('• 칠판·모니터·화면·간판은 빈칸 → 게임이 그 위에 수학 문제, 코드, HIGH SCORE 등을 직접 씁니다', None),
    ('• 패널 4개 사이와 바깥은 흰 여백 (자동으로 잘라내기 위해)', None),
    ('', None),
    ('포즈(A-…)에서 꼭 지켜야 할 것', 'h'),
    ('• 첨부한 기준 이미지와 같은 얼굴·머리·옷·도트 크기 (그 나이대 옷 하나로 12동작 전부)', None),
    ('• 흰 배경, 바닥·그림자·글자 없음, 그림끼리 넉넉히 떨어지게', None),
    ('• 몸은 살짝 오른쪽을 향한 3/4 정면 (왼쪽 방향은 게임이 좌우 반전해서 씁니다)', None),
    ('', None),
    ('자주 생기는 문제와 대처', 'h'),
    ('• 칸 수가 다르다 (예: 2×2인데 3개만) → 다시 생성. 단, 대부분 맞고 한두 칸만 이상하면 그대로 보내 주세요. 맞는 칸만 골라 씁니다.', None),
    ('• 배경에 사람이나 글자가 들어갔다 → 작게 들어간 정도면 괜찮습니다(지울 수 있음). 가운데를 크게 차지하면 다시 생성.', None),
    ('• 오른쪽 아래에 반짝이 워터마크가 붙었다 → 그대로 보내 주세요. 자동으로 지웁니다.', None),
    ('• 포즈 얼굴이 기존과 조금 다르다 → 괜찮습니다. 크기·색은 게임에 넣을 때 맞춥니다. 머리 모양·옷이 완전히 다르면 다시 생성.', None),
    ('• 배경이 가로로 길게 나왔다 → 괜찮습니다. 세로가 더 좋지만 잘라서 씁니다.', None),
    ('', None),
    ('보내 주시면 제가 하는 일', 'h'),
    ('assets-src/ 폴더에 넣고 → 칸마다 자동으로 잘라 → 장소 장면의 이모지 배경을 새 그림으로, 장면 속 아이 포즈를 새 동작으로 바꿔 → 화면 확인 후 새 버전으로 올립니다.', None),
]
for i, (t, k) in enumerate(lines, 1):
    c = ws0.cell(row=i, column=2, value=t)
    c.alignment = WRAP
    c.font = Font(name=F, size=16, bold=True, color='3B2414') if k == 'title' else (Font(name=F, size=12, bold=True, color='8A5A35') if k == 'h' else B)
ws0.sheet_view.showGridLines = False

# ── 2) 요청 목록
ws = wb.create_sheet('요청 목록')
ws['A1'] = '스케줄 연출 그림 요청 목록 (13장)'
ws['A1'].font = Font(name=F, size=14, bold=True, color='3B2414')
ws['A2'] = '진행률'
ws['A2'].font = BB
TOP = 4
heads = [('순서', 6), ('시트', 17), ('저장 이름', 21), ('무엇', 20), ('격자', 7), ('첨부', 20),
         ('게임에서 쓰이는 곳', 34), ('들어갈 내용 (한글 설명)', 46), ('프롬프트 (그대로 복사)', 90), ('완료', 7)]
for j, (h, w) in enumerate(heads, 1):
    c = ws.cell(row=TOP, column=j, value=h)
    c.font, c.fill, c.border, c.alignment = HF, HDR, BOX, Alignment(horizontal='center', vertical='center', wrap_text=True)
    ws.column_dimensions[chr(64 + j)].width = w
dv = DataValidation(type='list', formula1='"O,X"', allow_blank=True)
ws.add_data_validation(dv)

for i, (pri, sid, fname, rows, cols, title, items, prompt, _) in enumerate(need, 1):
    r = TOP + i
    is_bg = sid.startswith('S')
    if is_bg:
        attach = '없음'
        use = '\n'.join(f'• {BG_KO[it[2]][2]}' for it in items)
        body = '\n'.join(f"{'①②③④'[k]} {'위' if k < 2 else '아래'} {'왼쪽' if k % 2 == 0 else '오른쪽'} — {BG_KO[it[2]][0]}: {BG_KO[it[2]][1]}" for k, it in enumerate(items))
    else:
        attach = 'reference-son.png' if sid.endswith('-SON') else 'reference-daughter.png'
        stage = {'CHILD': '유년기(8~11세) 옷', 'TEEN': '청소년기(12~16세) 교복', 'YOUTH': '청년기(17~19세) 옷'}[sid.split('-')[1]]
        use = '바깥 활동 장면 속 아이 동작\n' + '\n'.join(f'• {POSE_KO[k][0]} → {POSE_KO[k][2]}' for k in POSE_KO)
        body = f'{stage} 그대로 12동작 (3줄 × 4칸)\n' + '\n'.join(
            f"{r_}줄: " + ' / '.join(f"{c_}) {POSE_KO[list(POSE_KO)[(r_ - 1) * 4 + c_ - 1]][0]}" for c_ in range(1, 5)) for r_ in range(1, 4))
    vals = [i, sid, fname, title.replace('연출 배경 · ', '배경 · ').replace('활동 포즈 · ', '포즈 · '), f'{rows}×{cols}', attach, use, body, prompt, None]
    for j, v in enumerate(vals, 1):
        c = ws.cell(row=r, column=j, value=v)
        c.font = BB if j in (2, 3) else B
        c.border, c.alignment = BOX, (CEN if j in (1, 5) else WRAP)
        if j <= 8:
            c.fill = BG_FILL if is_bg else ACT_FILL
    ws.cell(row=r, column=10).fill = YEL
    dv.add(ws.cell(row=r, column=10))
    ws.row_dimensions[r].height = 300
last = TOP + len(need)
ws['B2'] = f'=COUNTIF(J{TOP + 1}:J{last},"O")&" / {len(need)} 완료"'
ws['B2'].font = BB
ws.freeze_panes = ws.cell(row=TOP + 1, column=3)

# ── 3) 칸별 확인
ws2 = wb.create_sheet('칸별 확인')
ws2['A1'] = '결과 그림 칸 확인 — 왼쪽→오른쪽, 위→아래 순서가 이대로여야 합니다'
ws2['A1'].font = Font(name=F, size=12, bold=True, color='3B2414')
h2 = [('시트', 17), ('행', 5), ('열', 5), ('장소 / 동작', 22), ('그림 설명', 60), ('게임에서 쓰이는 곳', 34), ('필수/선택', 9), ('게임 ID', 26)]
for j, (h, w) in enumerate(h2, 1):
    c = ws2.cell(row=3, column=j, value=h)
    c.font, c.fill, c.border = HF, HDR, BOX
    ws2.column_dimensions[chr(64 + j)].width = w
r = 4
for (_, sid, _, _, _, _, items, _, _) in need:
    for (rr, cc, gid, name, desc, _, req) in items:
        if sid.startswith('S'):
            nm, ds, us = BG_KO[gid]
        else:
            k = gid.split('_', 2)[2]
            nm, ds, us = POSE_KO[k][0], POSE_KO[k][1], POSE_KO[k][2]
        for j, v in enumerate([sid, rr, cc, nm, ds, us, req, gid], 1):
            c = ws2.cell(row=r, column=j, value=v)
            c.font, c.border, c.alignment = B, BOX, WRAP
            c.fill = BG_FILL if sid.startswith('S') else ACT_FILL
        r += 1
ws2.freeze_panes = 'A4'
wb.save(OUT)
print(OUT, len(need), 'sheets', r - 4, 'cells')
