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

OUT = 'docs/scene_requests.xlsx'
F = 'Arial'
HDR = PatternFill('solid', fgColor='3B2414')
HF = Font(name=F, bold=True, color='FFFFFF', size=10)
B = Font(name=F, size=10)
BB = Font(name=F, size=10, bold=True)
WRAP = Alignment(wrap_text=True, vertical='top')
side = Side(style='thin', color='C8B8A0')
BOX = Border(left=side, right=side, top=side, bottom=side)
YEL = PatternFill('solid', fgColor='FFF59D')
BG_FILL = PatternFill('solid', fgColor='E6F0DC')
ACT_FILL = PatternFill('solid', fgColor='FDE2F0')

wb = Workbook()
ws = wb.active
ws.title = '요청 목록'
ws['A1'] = '스케줄 연출 그림 요청서 (13장)'
ws['A1'].font = Font(name=F, size=14, bold=True, color='3B2414')
ws['A2'] = '진행률'
ws['A2'].font = BB
ws['A3'] = '사용법: [프롬프트] 칸을 복사해 Gemini에 붙여 넣고, [첨부] 칸의 이미지를 같이 올리세요. 받은 그림은 [저장 이름]으로 보내 주시면 됩니다. 끝나면 [완료]에 O.'
ws['A3'].font = Font(name=F, size=9, italic=True, color='7A8290')
ws.merge_cells('A3:H3')

TOP = 5
heads = [('순서', 6), ('시트', 18), ('저장 이름', 22), ('무엇', 26), ('격자', 8), ('첨부', 22), ('프롬프트 (그대로 복사)', 100), ('완료', 8)]
for j, (h, w) in enumerate(heads, 1):
    c = ws.cell(row=TOP, column=j, value=h)
    c.font, c.fill, c.border, c.alignment = HF, HDR, BOX, Alignment(horizontal='center', vertical='center')
    ws.column_dimensions[chr(64 + j)].width = w
dv = DataValidation(type='list', formula1='"O,X"', allow_blank=True)
ws.add_data_validation(dv)

for i, (pri, sid, fname, rows, cols, title, items, prompt, _) in enumerate(need, 1):
    r = TOP + i
    is_bg = sid.startswith('S')
    attach = '없음' if is_bg else ('reference-son.png' if sid.endswith('-SON') else 'reference-daughter.png')
    vals = [i, sid, fname, title.replace('연출 배경 · ', '배경 · ').replace('활동 포즈 · ', '포즈 · '), f'{rows}×{cols}', attach, prompt, None]
    for j, v in enumerate(vals, 1):
        c = ws.cell(row=r, column=j, value=v)
        c.font, c.border, c.alignment = (BB if j in (2, 3) else B), BOX, WRAP
        if j <= 6:
            c.fill = BG_FILL if is_bg else ACT_FILL
    ws.cell(row=r, column=8).fill = YEL
    dv.add(ws.cell(row=r, column=8))
    ws.row_dimensions[r].height = 260
last = TOP + len(need)
ws['B2'] = f'=COUNTIF(H{TOP + 1}:H{last},"O")&" / {len(need)} 완료"'
ws['B2'].font = BB
ws.freeze_panes = ws.cell(row=TOP + 1, column=3)

# 칸별 상세: 결과 그림의 어느 칸이 무엇인지 (순서 확인용)
ws2 = wb.create_sheet('칸별 확인')
ws2['A1'] = '결과 그림 칸 확인 — 왼쪽→오른쪽, 위→아래 순서가 이대로여야 합니다'
ws2['A1'].font = Font(name=F, size=12, bold=True, color='3B2414')
h2 = [('시트', 18), ('행', 5), ('열', 5), ('장소 / 동작', 26), ('설명', 40), ('게임 ID', 26)]
for j, (h, w) in enumerate(h2, 1):
    c = ws2.cell(row=3, column=j, value=h)
    c.font, c.fill, c.border = HF, HDR, BOX
    ws2.column_dimensions[chr(64 + j)].width = w
r = 4
for (_, sid, _, _, _, _, items, _, _) in need:
    for (rr, cc, gid, name, desc, _, _) in items:
        for j, v in enumerate([sid, rr, cc, name, desc, gid], 1):
            c = ws2.cell(row=r, column=j, value=v)
            c.font, c.border, c.alignment = B, BOX, WRAP
            c.fill = BG_FILL if sid.startswith('S') else ACT_FILL
        r += 1
ws2.freeze_panes = 'A4'
wb.save(OUT)
print(OUT, len(need), 'sheets')
