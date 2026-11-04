"""직업 엔딩 일러스트 요청서 → docs/ending_art_requests.xlsx
엔딩 50종 × 시트 1장(2×2): [아들 밝음, 아들 지침, 딸 밝음, 딸 지침]
- 밝음(BRIGHT): 진로 발표 카드 · 🌱 건강한 자립 · ☕ 평범한 거리 엔딩의 스마트폰 사진
- 지침(DARK): 🥀 번아웃·절연 · 🧸 캥거루 엔딩의 스마트폰 사진
받은 그림: assets-src/ending-art/END_xx.png → python3 scripts/build-ending-art.py"""
import json
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

src = open('scripts/make-sprite-requests.py', encoding='utf-8').read()
ns = {}
exec(src[src.index('JOBS = ['):src.index('for g, gk, gen_en in GEN:', src.index('JOBS = ['))], ns)
OUTFIT = {f'END_{n}': en for n, _, en in ns['JOBS']}
ENDS = json.load(open('docs/endings.json', encoding='utf-8'))

# 일하는 장소 (그림 배경)
PLACE = {
    'END_01': 'a hospital operating room with surgical lights', 'END_02': 'a grand supreme courtroom with a wooden bench',
    'END_03': 'a courtroom with a witness stand', 'END_04': 'a high-tech research laboratory', 'END_05': 'a cozy animal clinic with pets',
    'END_06': 'a neat pharmacy with medicine shelves', 'END_07': 'a university lecture hall with a big blackboard',
    'END_08': 'a book signing event in a bookstore', 'END_09': 'a calm counseling room with a sofa and plants',
    'END_10': 'an elementary school classroom with children\'s drawings', 'END_11': 'a game studio stage at an award ceremony',
    'END_12': 'a robotics lab with a robot arm', 'END_13': 'a dark security operations room with many monitors',
    'END_14': 'a space station window with Earth outside', 'END_15': 'a construction site with a city skyline',
    'END_16': 'a modern startup office with monitors', 'END_17': 'an esports arena with a big screen and a crowd',
    'END_18': 'a concert stage with spotlights and light sticks', 'END_19': 'a film set with cameras and a director chair',
    'END_20': 'a home studio with a drawing tablet and webtoon pages', 'END_21': 'a concert hall stage with a grand piano',
    'END_22': 'a red carpet with camera flashes', 'END_23': 'a colorful streaming room with a ring light',
    'END_24': 'a fashion atelier with mannequins', 'END_25': 'a TV news studio with a desk', 'END_26': 'a city street at dusk with a small crowd',
    'END_27': 'a glass office tower top floor', 'END_28': 'a fine-dining restaurant kitchen', 'END_29': 'a trading floor with stock charts',
    'END_30': 'an embassy hall with flags', 'END_31': 'a sweet dessert shop counter', 'END_32': 'a flower shop full of bouquets',
    'END_33': 'a luxury hotel lobby', 'END_34': 'an office cubicle with a company ID badge', 'END_35': 'an Olympic podium in a stadium',
    'END_36': 'a sports stadium under lights', 'END_37': 'a military base', 'END_38': 'a police station office with case boards',
    'END_39': 'a fire station with a fire truck', 'END_40': 'an airplane cockpit above the clouds', 'END_41': 'a fantasy castle hall',
    'END_42': 'a magical tower with floating books and stars', 'END_43': 'a royal palace ballroom', 'END_44': 'a pixel-art theme park stage',
    'END_45': 'an ancient temple ruin with treasure', 'END_46': 'a cozy detective office on a rainy night', 'END_47': 'a rooftop at night under the moon',
    'END_48': 'a dim underground lounge', 'END_49': 'a world landmark view with a backpack', 'END_50': 'a messy bedroom with a TV and snacks',
}
LOOK = {
    'SON': 'the same boy from the reference, now a young man (age 20-25): side-swept brown hair, big brown eyes',
    'DAUGHTER': 'the same girl from the reference, now a young woman (age 20-25): long wavy brown hair, teal eyes, rosy cheeks',
}
STYLE = ("Cute 16-bit pixel art in the cozy style of Japanese management sim games (Kairosoft-like): crisp pixels, clean dark outlines, soft palette.\n"
         "LAYOUT: exactly 2 rows x 2 columns = 4 separate illustration panels. Every panel is a 4:3 landscape rectangle with a thin dark outline, "
         "separated by wide pure white (#FFFFFF) gaps; everything outside the panels is pure white. Image size 2048x1536.\n"
         "Each panel shows ONE grown-up character from the waist up (or full body), face clearly visible, in their workplace. "
         "Top row = the young man, bottom row = the young woman. Left column = BRIGHT version, right column = DARK version of the SAME place and outfit.\n"
         "BRIGHT: proud, happy smile, warm golden light, lively and successful.\n"
         "DARK: the same place late at night, almost empty, cold dim light, the character exhausted and hollow-eyed, slumped shoulders, lonely mood "
         "(sad but gentle, never scary).\n"
         "NO text, NO letters, NO numbers, NO logos, NO watermark, NO signature.")
PRI = {'SS': 1, 'S': 1, 'A': 2, 'B': 3, 'C': 3}

F = 'Arial'
HDR = PatternFill('solid', fgColor='3B2414'); HF = Font(name=F, bold=True, color='FFFFFF', size=10)
BODY = Font(name=F, size=10); BOLD = Font(name=F, size=10, bold=True); TITLE = Font(name=F, size=14, bold=True)
WRAP = Alignment(wrap_text=True, vertical='top'); CEN = Alignment(horizontal='center', vertical='top', wrap_text=True)
thin = Side(style='thin', color='999999'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
DONE = PatternFill('solid', fgColor='FFF59D')
PFILL = {1: PatternFill('solid', fgColor='FFD6D6'), 2: PatternFill('solid', fgColor='FFF0C8'), 3: PatternFill('solid', fgColor='E6F0DC')}

wb = Workbook()
ws = wb.active
ws.title = '사용 방법'
ws.sheet_view.showGridLines = False
ws.column_dimensions['A'].width = 4
ws.column_dimensions['B'].width = 120
cnt = {p: sum(1 for e in ENDS if PRI[e['tier']] == p) for p in (1, 2, 3)}
lines = [
    ('직업 엔딩 일러스트 요청서', 't'), ('', None),
    ('무엇에 쓰나요?', 'h'),
    ('성인식에서 진로가 발표될 때와, 몇 년 뒤 아이가 보내는 스마트폰 메시지 속 "사진"으로 쓰입니다 (기획서 11.3 그림 7처럼).', None),
    ('같은 S급 외과의사라도 관계 결말에 따라 웃는 의사(밝음) / 새벽 병원에서 지친 의사(지침)로 다르게 보입니다.', None),
    ('그림이 없는 직업은 지금처럼 도트 캐릭터 장면으로 나오니, 받는 것부터 하나씩 채우면 됩니다.', None),
    ('', None),
    ('필요한 것: 엔딩 50종 × 시트 1장 (2×2 = 아들 밝음 · 아들 지침 · 딸 밝음 · 딸 지침)', 'h'),
    (f'우선순위: 1순위 SS·S급 {cnt[1]}장 → 2순위 A급 {cnt[2]}장 → 3순위 B·C급 {cnt[3]}장. 자주 나오는 엔딩은 B급이 많아서, 시간이 되면 3순위도 추천합니다.', None),
    ('', None),
    ('만드는 순서', 'h'),
    ('1. "요청 목록" 탭에서 한 줄씩 진행합니다.', None),
    ('2. [첨부할 기준 그림]을 함께 첨부합니다: 직업 의상 시트(job-son-N.png / job-daughter-N.png)에서 그 직업 칸이 있는 그림. 없으면 reference-son.png / reference-daughter.png.', None),
    ('3. [프롬프트] 칸을 통째로 복사해 Gemini에 붙여 넣습니다. (영어가 정상입니다.)', None),
    ('4. 받은 그림을 [저장 파일명]으로 저장해서 모아 보내 주세요 (압축 파일로 여러 장 한 번에 가능).', None),
    ('', None),
    ('꼭 지켜야 할 것', 'h'),
    ('• 위 줄 = 아들, 아래 줄 = 딸 / 왼쪽 = 밝음, 오른쪽 = 지침 (칸 위치로 구분합니다)', None),
    ('• 얼굴이 잘 보이게, 직업 의상은 직업 의상 시트와 같게', None),
    ('• 지침 버전은 같은 장소의 밤·빈 공간, 지친 표정 (무섭거나 폭력적이지 않게)', None),
    ('• 그림 안에 글자 없이', None),
]
for i, (t, k) in enumerate(lines, 1):
    c = ws.cell(row=i, column=2, value=t)
    c.font = TITLE if k == 't' else BOLD if k == 'h' else BODY
    c.alignment = WRAP

w2 = wb.create_sheet('요청 목록')
cols = [('#', 5), ('순위', 6), ('엔딩', 9), ('직업', 22), ('등급', 6), ('저장 파일명', 16), ('첨부할 기준 그림', 30), ('그림 내용 (한글)', 40), ('프롬프트 (그대로 복사)', 100), ('완료', 7)]
for j, (h, wdt) in enumerate(cols, 1):
    c = w2.cell(row=1, column=j, value=h)
    c.font, c.fill, c.alignment, c.border = HF, HDR, CEN, BOX
    w2.column_dimensions[c.column_letter].width = wdt
order = sorted(ENDS, key=lambda e: (PRI[e['tier']], e['id']))
for i, e in enumerate(order, 1):
    eid, pri = e['id'], PRI[e['tier']]
    n = int(eid[4:])
    sheet_no = (n - 1) // 9 + 1
    outfit = OUTFIT.get(eid, 'their job outfit')
    prompt = (f"Create a pixel art ENDING ILLUSTRATION sheet for a child-raising sim game: the grown-up child became a {e['title']} ({outfit}).\n"
              f"Place: {PLACE[eid]}.\nTop row: {LOOK['SON']}, wearing the job outfit ({outfit}).\n"
              f"Bottom row: {LOOK['DAUGHTER']}, wearing the job outfit ({outfit}).\n"
              "Attach job-son / job-daughter sheet (or reference-son.png / reference-daughter.png) and keep the same faces, hair and outfit design.\n" + STYLE)
    body = (f"장소: {PLACE[eid]}\n왼쪽 위: 아들 · 밝음 (뿌듯한 미소, 따뜻한 빛)\n오른쪽 위: 아들 · 지침 (같은 곳의 밤, 지친 눈)\n"
            "왼쪽 아래: 딸 · 밝음\n오른쪽 아래: 딸 · 지침")
    attach = f"job-son-{sheet_no}.png · job-daughter-{sheet_no}.png\n(없으면 reference-son.png · reference-daughter.png)"
    vals = [i, f'{pri}순위', eid, e['title'], e['tier'], f'{eid}.png', attach, body, prompt, None]
    for j, v in enumerate(vals, 1):
        c = w2.cell(row=i + 1, column=j, value=v)
        c.font, c.alignment, c.border = BODY, (CEN if j in (1, 2, 3, 5, 10) else WRAP), BOX
        if j <= 2:
            c.fill = PFILL[pri]
    w2.cell(row=i + 1, column=10).fill = DONE
    w2.row_dimensions[i + 1].height = 260
w2.freeze_panes = 'A2'

w3 = wb.create_sheet('칸 위치')
for r, row in enumerate([['', '왼쪽 (밝음)', '오른쪽 (지침)'], ['위 (아들)', '건강한 자립·평범 / 진로 발표 카드', '번아웃·절연 · 캥거루'], ['아래 (딸)', '건강한 자립·평범 / 진로 발표 카드', '번아웃·절연 · 캥거루']], 1):
    for c_, v in enumerate(row, 1):
        cell = w3.cell(row=r, column=c_, value=v)
        cell.font, cell.alignment, cell.border = (HF if r == 1 or c_ == 1 else BODY), CEN, BOX
        if r == 1 or c_ == 1:
            cell.fill = HDR
        w3.column_dimensions[cell.column_letter].width = 36
    w3.row_dimensions[r].height = 40
wb.save('docs/ending_art_requests.xlsx')
print('docs/ending_art_requests.xlsx', len(order), 'sheets', cnt)
