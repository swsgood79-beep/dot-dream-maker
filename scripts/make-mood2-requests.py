"""아이 감정 포즈 추가 요청서 → docs/mood2_requests.xlsx
감정의 순간 · 성적표 · 화해 장면에서 기존 기분 포즈(슬픔·화남·울기…)로는 표현이 안 되는 4가지.
아들·딸 각 1장, 한 장에 3줄(유년·청소년·청년) × 4칸.
받은 그림: assets-src/mood2-son.png · assets-src/mood2-daughter.png
→ python3 scripts/build-sprites.py && HI=2 python3 scripts/build-sprites.py && python3 scripts/build-portraits.py"""
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

src = open('scripts/make-sprite-requests.py', encoding='utf-8').read()
ns = {}
exec(src[src.index('STYLE = ('):src.index('ISO = (')], ns)
STYLE, CHAR_REF, LOOK = ns['STYLE'], ns['CHAR_REF'], ns['LOOK']

# (게임 키, 이름, 한글 설명, 게임에서 나오는 때, 영어 지시)
POSES = [
    ('tantrum', '떼쓰며 드러눕기', '바닥에 드러누워 팔다리를 버둥거리며 떼쓰는 모습, 입 크게 벌리고 엉엉',
     '💗 마트 장난감 떼쓰기 · 보드게임 엎기 (지금은 "화남" 그림으로 대신)',
     'lying on the floor on the back, kicking legs and waving arms in a tantrum, mouth wide open crying loudly (cute, not violent)'),
    ('relieved', '눈물 닦으며 미소', '눈가에 눈물이 남은 채 손등으로 닦으며 수줍게 웃음, 마음이 풀린 얼굴',
     '💗 감정의 순간을 잘 다독여 마음이 활짝 열렸을 때 (지금은 "만세" 그림 — 너무 들떠 보임)',
     'wiping a leftover tear with the back of one hand while smiling softly and shyly, relieved and comforted, slightly red nose'),
    ('nervous', '성적표 들고 눈치', '종이 한 장을 두 손으로 꼭 쥐고 위로 눈치 보는 모습, 어색한 웃음',
     '📜 성적표를 보여 줄 때 (지금은 "한숨" 그림으로 대신)',
     'holding a single sheet of paper tightly in both hands in front of the chest, glancing up nervously, awkward worried smile, shoulders raised'),
    ('hug', '안아 달라고 팔 벌리기', '두 팔을 앞으로 활짝 벌리고 다가오는 모습, 눈물 글썽 + 미소',
     '📹 관찰 카메라 화해 장면 · 💗 감정의 순간 최고의 결과 (지금은 "만세" 그림)',
     'stepping forward with both arms wide open asking for a hug, teary eyes with a warm smile'),
]
STAGES = ['child, age 8-11 (FIRST row of the reference)', 'teenager, age 12-16 (SECOND row of the reference)', 'young adult, age 17-19 (THIRD row of the reference)']
GENS = [('SON', '아들', 'boy', 'mood2-son.png'), ('DAUGHTER', '딸', 'girl', 'mood2-daughter.png')]


def prompt(g, gen_en):
    rows = '\n'.join(f"Row {r + 1} = the {STAGES[r]} in that age's outfit from the reference." for r in range(3))
    cols = '\n'.join(f"Column {c + 1}: {POSES[c][4]}." for c in range(4))
    return (f"Create a pixel art EMOTION POSE sprite sheet of the {gen_en} character: 3 rows x 4 columns = 12 full-body sprites.\n"
            + rows + "\nEvery row has the SAME 4 poses in this order:\n" + cols + "\n"
            "The feeling must read clearly from both the body pose and the face, even at small size. Keep it gentle and cute. "
            "Poses face 3/4 toward the viewer, turned slightly to the right (column 1 lies on the floor sideways).\n"
            + CHAR_REF + '\n' + LOOK[g] + '\n' + STYLE)


F = 'Arial'
HDR = PatternFill('solid', fgColor='3B2414'); HF = Font(name=F, bold=True, color='FFFFFF', size=10)
BODY = Font(name=F, size=10); BOLD = Font(name=F, size=10, bold=True); TITLE = Font(name=F, size=14, bold=True)
WRAP = Alignment(wrap_text=True, vertical='top'); CEN = Alignment(horizontal='center', vertical='top', wrap_text=True)
thin = Side(style='thin', color='999999'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
DONE = PatternFill('solid', fgColor='FFF59D')

wb = Workbook()
ws = wb.active
ws.title = '사용 방법'
ws.sheet_view.showGridLines = False
ws.column_dimensions['A'].width = 4
ws.column_dimensions['B'].width = 110
lines = [
    ('아이 감정 포즈 추가 요청서 (2장)', 't'), ('', None),
    ('무엇에 쓰나요?', 'h'),
    ('감정의 순간 · 성적표 · 화해 장면에서 아이 모습을 상황에 맞췄는데, 기존 기분 포즈(슬픔·화남·울기·웅크림·한숨 등)로는 딱 맞는 그림이 없는 4가지입니다.', None),
    ('그림이 들어오기 전까지는 가장 가까운 기존 포즈로 대신 보여 주고, 받으면 자동으로 바뀝니다.', None),
    ('', None),
    ('만드는 순서', 'h'),
    ('1. "요청 목록"에서 아들·딸 한 줄씩 (그림 1장 = 3줄 × 4칸 = 12개).', None),
    ('2. 기준 그림으로 예전에 받은 기분 포즈 시트(mood-child/teen/youth-성별.png) 중 하나와 reference-성별.png 를 같이 첨부하면 옷·얼굴·크기가 가장 잘 맞습니다.', None),
    ('3. [프롬프트]를 통째로 붙여 넣고, 받은 그림을 [저장 파일명]으로 보내 주세요.', None),
    ('', None),
    ('꼭 지켜야 할 것', 'h'),
    ('• 흰 배경, 12개가 서로 떨어져 있을 것  • 줄 = 나이(유년·청소년·청년), 칸 순서 = 아래 4가지 동작 순서 그대로', None),
    ('', None),
    ('4가지 동작', 'h'),
] + [(f'{i + 1}. {p[1]} — {p[2]}  ▶ {p[3]}', None) for i, p in enumerate(POSES)]
for i, (t, k) in enumerate(lines, 1):
    c = ws.cell(row=i, column=2, value=t)
    c.font = TITLE if k == 't' else BOLD if k == 'h' else BODY
    c.alignment = WRAP

w2 = wb.create_sheet('요청 목록')
cols = [('#', 5), ('누구', 10), ('저장 파일명', 22), ('첨부할 기준 그림', 36), ('프롬프트 (그대로 복사)', 110), ('완료', 7)]
for j, (h, wdt) in enumerate(cols, 1):
    c = w2.cell(row=1, column=j, value=h)
    c.font, c.fill, c.alignment, c.border = HF, HDR, CEN, BOX
    w2.column_dimensions[c.column_letter].width = wdt
for i, (g, gk, gen_en, fname) in enumerate(GENS, 1):
    vals = [i, gk, fname, f'mood-teen-{g.lower()}.png (예전 기분 포즈 시트)\n+ reference-{g.lower()}.png', prompt(g, gen_en), None]
    for j, v in enumerate(vals, 1):
        c = w2.cell(row=i + 1, column=j, value=v)
        c.font, c.alignment, c.border = BODY, (CEN if j in (1, 6) else WRAP), BOX
    w2.cell(row=i + 1, column=6).fill = DONE
    w2.row_dimensions[i + 1].height = 330
w2.freeze_panes = 'A2'
wb.save('docs/mood2_requests.xlsx')
print('docs/mood2_requests.xlsx')
