"""책상 없이 의자에만 앉아 쓰는 그림 요청서 → docs/seat_requests.xlsx
청소년 딸·청년 아들·청년 딸의 '책상 공부' 그림에는 큰 책상이 같이 그려져 있어 방 책상과 겹침 → 의자만 있는 그림으로 교체.
받은 그림: assets-src/seat-{teen|youth}-{son|daughter}.png (한 장에 한 명) → python3 scripts/build-sprites.py && HI=2 python3 scripts/build-sprites.py"""
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

src = open('scripts/make-sprite-requests.py', encoding='utf-8').read()
ns = {}
exec(src[src.index('STYLE = ('):src.index('ISO = (')], ns)
LOOK = ns['LOOK']

ITEMS = [
    ('TEEN', 'DAUGHTER', '청소년 딸', 'seat-teen-daughter.png', 'teenager girl, age 12-16 (SECOND row of the reference)',
     'long straight brown hair with bangs, sailor school uniform (white top, navy collar, red ribbon tie, navy pleated skirt), navy knee socks, brown loafers',
     'job-daughter / act-teen-daughter.png 또는 reference-daughter.png'),
    ('YOUTH', 'SON', '청년 아들', 'seat-youth-son.png', 'young man, age 17-19 (THIRD row of the reference)',
     'side-swept brown hair, olive-brown jacket over a white T-shirt, blue jeans, dark sneakers',
     'act-youth-son.png 또는 reference-son.png'),
    ('YOUTH', 'DAUGHTER', '청년 딸', 'seat-youth-daughter.png', 'young woman, age 17-19 (THIRD row of the reference)',
     'long wavy brown hair, gray cardigan over a black crop top, khaki pants, black flats',
     'act-youth-daughter.png 또는 reference-daughter.png'),
]


def prompt(gen, outfit):
    return (f"Create ONE pixel art sprite of the {gen} from the attached reference, sitting on a simple wooden chair and studying.\n"
            f"Outfit (must match the reference): {outfit}.\n"
            "POSE: seen from behind at a 3/4 angle (back view, turned toward the upper right), sitting on the chair, leaning slightly forward, "
            "both arms reaching forward at desk height, holding a pencil as if writing on a desk in front of them.\n"
            "IMPORTANT: draw ONLY the character and the chair. NO desk, NO table, NO paper, NO books in front — the game places its own desk there. "
            "Hands just float at desk height.\n"
            "Same pixel size, outline thickness and colors as the reference. Cute 16-bit pixel art with an original, cozy look of its own "
            "(do not imitate any specific existing game, studio, character or logo). Clean dark outlines, crisp pixels, no blur.\n"
            "Pure solid white (#FFFFFF) background, no floor, no shadow, no text, no watermark. Exactly one sprite in the center.")


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
    ('책상 없이 의자에 앉아 공부하는 그림 요청서 (3장)', 't'), ('', None),
    ('무엇에 쓰나요?', 'h'),
    ('방에서 아이가 책상 앞 의자에 앉아 공부하는 모습입니다. 지금 청소년 딸·청년 아들·청년 딸의 그림에는 큰 책상까지 그려져 있어서,', None),
    ('방 책상과 겹치지 않게 방 책상을 잠깐 숨기고 있습니다 (그 사이 책상이 작아 보임). 의자만 있는 그림을 받으면 어린이처럼 방 책상 앞에 바로 앉힙니다.', None),
    ('', None),
    ('만드는 순서', 'h'),
    ('1. "요청 목록"에서 한 줄씩 (그림 1장 = 1명).', None),
    ('2. [첨부할 기준 그림]을 같이 첨부하고 [프롬프트]를 통째로 붙여 넣습니다. 어린이 책상 공부 그림처럼 "의자에 앉아 앞으로 손을 뻗어 쓰는" 모습이 목표입니다.', None),
    ('3. 받은 그림을 [저장 파일명]으로 보내 주세요. 들어오는 대로 자동으로 바뀝니다.', None),
    ('', None),
    ('꼭 지켜야 할 것', 'h'),
    ('• 책상·종이·책 없이 (의자만)  • 등을 보이며 오른쪽 위를 향해 앉은 모습  • 손은 책상 높이에서 연필을 든 채', None),
    ('• 옷은 그 나이대 옷 그대로, 흰 배경에 한 명만', None),
]
for i, (t, k) in enumerate(lines, 1):
    c = ws.cell(row=i, column=2, value=t)
    c.font = TITLE if k == 't' else BOLD if k == 'h' else BODY
    c.alignment = WRAP
w2 = wb.create_sheet('요청 목록')
cols = [('#', 5), ('누구', 12), ('저장 파일명', 24), ('첨부할 기준 그림', 34), ('그림 내용 (한글)', 40), ('프롬프트 (그대로 복사)', 100), ('완료', 7)]
for j, (h, wdt) in enumerate(cols, 1):
    c = w2.cell(row=1, column=j, value=h)
    c.font, c.fill, c.alignment, c.border = HF, HDR, CEN, BOX
    w2.column_dimensions[c.column_letter].width = wdt
for i, (st, g, who, fname, gen, outfit, attach) in enumerate(ITEMS, 1):
    vals = [i, who, fname, attach, '나무 의자에 앉아 등을 보이며(오른쪽 위를 향해) 앞으로 손을 뻗어 연필로 쓰는 모습. 책상은 그리지 않음.', prompt(gen, outfit), None]
    for j, v in enumerate(vals, 1):
        c = w2.cell(row=i + 1, column=j, value=v)
        c.font, c.alignment, c.border = BODY, (CEN if j in (1, 7) else WRAP), BOX
    w2.cell(row=i + 1, column=7).fill = DONE
    w2.row_dimensions[i + 1].height = 230
w2.freeze_panes = 'A2'
wb.save('docs/seat_requests.xlsx')
print('docs/seat_requests.xlsx', len(ITEMS))
