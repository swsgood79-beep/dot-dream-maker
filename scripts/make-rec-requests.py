"""관찰 카메라 배경 요청서 → docs/rec_requests.xlsx (시트 2장, 2×2 패널씩 = 8장면)
그림 스타일 지시는 make-sprite-requests.py 의 BG_STYLE(장소 배경과 같은 형식)을 그대로 쓴다.
받은 그림: assets-src/scene-s8.png, scene-s9.png → python3 scripts/build-scenes.py"""
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

src = open('scripts/make-sprite-requests.py', encoding='utf-8').read()
ns = {}
exec(src[src.index('BG_STYLE = ('):src.index('BGS = [')], ns)
BG_STYLE = ns['BG_STYLE']

# (게임 ID, 이름, 한글 설명, 쓰이는 곳, 영어 지시)
SHEETS = [
    ('S8', 'scene-s8.png', '관찰 ① 이상행동 장면', [
        ('REC_STRIKE', '학원 파업', '저녁의 아이 방: 바닥에 내던진 학원 가방, 흩어진 문제집, 한쪽에 침대', '💢 학원 파업 안내 창 · 관찰 카메라 화면',
         "a kid bedroom in the evening after refusing to go to the academy: a school backpack thrown on the floor on the left with workbooks spilling out, a messy bed on the right, orange sunset light through the window, slightly gloomy mood"),
        ('REC_LOCKED', '잠긴 방 안', '밤, 커튼을 친 어두운 방, 책상 스탠드 하나만 켜짐, 구석에 이불', '🔒 방문 잠금 관찰 카메라 화면',
         "a dark kid bedroom at night with the curtains closed: only a small desk lamp is on (left), a crumpled blanket in the corner on the right, a closed and locked door on the back wall, deep blue tones with one warm lamp glow"),
        ('REC_DELINQ', '밤 놀이터', '밤 놀이터: 그네, 멀리 편의점 불빛, 가로등 하나', '😈 삐딱해진 아이 안내 창 · 카메라 화면',
         "an empty playground late at night: a swing set on the left, a slide on the right, a single street lamp, the glow of a convenience store far in the background, dark navy sky, a little lonely"),
        ('REC_SILENT', '새벽 책상', '새벽까지 켜진 책상: 산더미 문제집, 스탠드, 창밖은 깜깜', '😶 말이 없어진 아이 안내 창 · 카메라 화면',
         "a study desk late at night: towering stacks of workbooks and papers on the left, a desk lamp casting a small circle of light, a wall clock showing very late, a pitch-dark window on the right, crumpled paper on the floor, heavy tired mood"),
    ]),
    ('S9', 'scene-s9.png', '관찰 ② 거리감·화해 장면', [
        ('REC_COLD', '말 없는 저녁 식탁', '저녁 식탁: 식은 밥 두 그릇, 빈 의자, 어둑한 부엌', '🧊 차가워진 마음 안내 창 · 카메라 화면',
         "a quiet family dining table in the evening: two bowls of rice going cold, an empty chair pushed back, dim kitchen light, a clock on the wall, cool gray-blue tones, distant and silent mood"),
        ('REC_DOOR', '닫힌 방문 앞 복도', '복도에서 본 닫힌 아이 방문, 문틈으로 새는 불빛', '🔒 방문 잠금 안내 창 (부모가 문 밖에 서 있는 시점)',
         "a home hallway in front of a closed kid bedroom door: warm light leaking from the gap under the door, a small blank sign hanging on the door knob (no text), wooden floor, dark hallway, seen from the parent's side"),
        ('REC_WARM', '따뜻한 화해', '포근한 거실 소파: 담요, 코코아 두 잔, 따뜻한 조명', '✨ 황금 처방을 고른 뒤 (화해 장면)',
         "a cozy living room at night after making up: a soft sofa with a fluffy blanket, two mugs of hot cocoa on a low table, warm lamp light, a sleepy cat cushion, very warm and safe mood"),
        ('REC_LETTER', '문 앞 편지와 간식', '닫힌 방문 앞 바닥: 쟁반 위 편지 한 장과 우유·쿠키', '✨ 방문 잠금 황금 처방 뒤 (편지와 간식을 두고 기다리기)',
         "the floor in front of a closed kid bedroom door: a small tray with a folded letter (no text), a glass of milk and cookies, the door is slightly opening with warm light coming out, gentle hopeful mood"),
    ]),
]

F = 'Arial'
HDR = PatternFill('solid', fgColor='3B2414')
HF = Font(name=F, bold=True, color='FFFFFF', size=10)
BODY = Font(name=F, size=10)
BOLD = Font(name=F, size=10, bold=True)
TITLE = Font(name=F, size=14, bold=True)
WRAP = Alignment(wrap_text=True, vertical='top')
CEN = Alignment(horizontal='center', vertical='top', wrap_text=True)
thin = Side(style='thin', color='999999')
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
DONE = PatternFill('solid', fgColor='FFF59D')
FILL = [PatternFill('solid', fgColor='E6EEF8'), PatternFill('solid', fgColor='FDE2E2')]

wb = Workbook()
ws = wb.active
ws.title = '사용 방법'
ws.sheet_view.showGridLines = False
ws.column_dimensions['A'].width = 4
ws.column_dimensions['B'].width = 120
lines = [
    ('관찰 카메라 배경 요청서', 't'), ('', None),
    ('무엇에 쓰나요?', 'h'),
    ('아이에게 이상행동(학원 파업·방문 잠금·비행·말없는 스트레스·차가운 마음)이 생기면 먼저 안내 창이 뜨고, [관찰 카메라]를 켜면 캠코더 화면으로 아이를 봅니다.', None),
    ('지금은 그 장면 뒤가 단색 배경이라, 상황이 실감 나도록 장소 배경 8장을 넣으려고 합니다. 아이는 게임이 그 위에 그립니다 (상태 포즈 그림 사용).', None),
    ('', None),
    ('필요한 것: 시트 2장 (한 장에 장면 4개, 2×2) — 예전 장소 배경(S1~S7)과 똑같은 형식', 'h'),
    ('• 장면 안에 사람·글자는 넣지 않습니다. 가운데 아래쪽은 아이가 설 자리라 비워 둡니다.', None),
    ('• 첨부할 그림은 없어도 됩니다. 예전 장소 배경 시트(scene-s1.png 등)를 같이 첨부하면 그림체가 더 잘 맞습니다.', None),
    ('', None),
    ('만드는 순서', 'h'),
    ('1. "요청 목록" 탭의 [프롬프트] 칸을 통째로 복사해 Gemini에 붙여 넣습니다. (영어가 정상입니다.)', None),
    ('2. 받은 그림을 [저장 파일명]으로 보내 주세요. 이름이 달라도 S8/S9만 알려 주시면 됩니다.', None),
    ('3. "칸별 확인" 탭에서 각 칸이 게임 어디에 쓰이는지 볼 수 있습니다.', None),
    ('', None),
    ('그림이 없어도 게임은 지금처럼 동작합니다. 받는 대로 자동으로 바뀝니다.', None),
]
for i, (t, k) in enumerate(lines, 1):
    c = ws.cell(row=i, column=2, value=t)
    c.font = TITLE if k == 't' else BOLD if k == 'h' else BODY
    c.alignment = WRAP

w2 = wb.create_sheet('요청 목록')
cols = [('#', 5), ('시트', 8), ('저장 파일명', 16), ('내용', 22), ('구성', 7), ('들어갈 장면 (한글)', 46), ('프롬프트 (그대로 복사)', 110), ('완료', 7)]
for j, (h, wdt) in enumerate(cols, 1):
    c = w2.cell(row=1, column=j, value=h)
    c.font, c.fill, c.alignment, c.border = HF, HDR, CEN, BOX
    w2.column_dimensions[c.column_letter].width = wdt
w3 = wb.create_sheet('칸별 확인')
cols3 = [('시트', 8), ('칸', 10), ('게임 ID', 14), ('장면', 18), ('그림 설명 (한글)', 48), ('게임에서 쓰이는 곳', 44)]
for j, (h, wdt) in enumerate(cols3, 1):
    c = w3.cell(row=1, column=j, value=h)
    c.font, c.fill, c.alignment, c.border = HF, HDR, CEN, BOX
    w3.column_dimensions[c.column_letter].width = wdt
r3 = 2
for i, (sid, fname, title, cells) in enumerate(SHEETS, 1):
    pos = ['왼쪽 위', '오른쪽 위', '왼쪽 아래', '오른쪽 아래']
    lines_en = [f"Panel {k + 1} ({'top' if k < 2 else 'bottom'}-{'left' if k % 2 == 0 else 'right'}): {c[4]}." for k, c in enumerate(cells)]
    prompt = "Create a pixel art BACKGROUND sheet for a cozy child-raising sim game: 4 scenes seen through a parent's eyes when the child is struggling.\n" + BG_STYLE + '\n' + '\n'.join(lines_en)
    body = '\n'.join(f'{pos[k]}: {c[1]} — {c[2]}' for k, c in enumerate(cells))
    vals = [i, sid, fname, title, '2×2', body, prompt, None]
    for j, v in enumerate(vals, 1):
        c = w2.cell(row=i + 1, column=j, value=v)
        c.font, c.alignment, c.border = BODY, (CEN if j in (1, 2, 5, 8) else WRAP), BOX
    w2.cell(row=i + 1, column=8).fill = DONE
    w2.row_dimensions[i + 1].height = 300
    for k, cdef in enumerate(cells):
        vals3 = [sid, pos[k], cdef[0], cdef[1], cdef[2], cdef[3]]
        for j, v in enumerate(vals3, 1):
            c = w3.cell(row=r3, column=j, value=v)
            c.font, c.alignment, c.border = BODY, WRAP, BOX
            c.fill = FILL[i - 1]
        w3.row_dimensions[r3].height = 32
        r3 += 1
w2.freeze_panes = 'A2'
wb.save('docs/rec_requests.xlsx')
print('docs/rec_requests.xlsx', len(SHEETS), 'sheets')
