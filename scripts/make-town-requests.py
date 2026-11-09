"""🗺️ 주말 나들이(v0.38) 그림 요청서 → docs/town_requests.xlsx
지금은 이모지·색으로 그려진 동네 지도, 장소 장면 배경, 동네 사람들을 일러스트로 바꾸기 위한 요청 목록.
받은 그림: assets-src/town/ 에 [저장 파일명]으로 넣으면 게임에 반영."""
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

src = open('scripts/make-sprite-requests.py', encoding='utf-8').read()
ns = {}
exec(src[src.index('STYLE = ('):src.index('ISO = (')], ns)
STYLE = ns['STYLE']
# 배경·지도용: 스프라이트 규칙(흰 배경·간격) 없이 그림체만
ART = STYLE.split(' Pure solid white')[0]

NOPEOPLE = "NO people, NO characters, NO animals in the foreground, NO text, NO letters, NO numbers, NO logos, NO signs with writing, NO watermark."

BG_RULE = ("LAYOUT: exactly 2 rows x 2 columns = 4 separate scene panels. Every panel is a LANDSCAPE rectangle with a 16:9 ratio "
           "and a thin dark outline, separated by wide pure white (#FFFFFF) gaps. Image size 2048x2048.\n"
           "VIEW: flat side view like a 2D stage set (NOT isometric, NOT top-down), camera at a child's eye level. The bottom 30% of every panel "
           "is ground. Keep the CENTER-BOTTOM of every panel EMPTY (just ground) because two game characters will stand there side by side. "
           "Put buildings and props on the left and right sides and in the background.\n")

LOCS = [
    # (파일, 패널 번호, 장소, 한글 설명, 영어 설명)
    ('town-bg-1.png', 1, '놀이터 공원', '미끄럼틀·그네가 있는 놀이터, 큰 나무, 꽃밭, 벤치, 파란 하늘.', 'a sunny neighborhood playground park: a slide and swings on the left, a big leafy tree and a bench on the right, flower beds, blue sky with soft clouds'),
    ('town-bg-1.png', 2, '학교 운동장', '흙 운동장, 뒤에 하얀 초등학교 건물(글씨 없음), 축구 골대, 철봉, 국기 게양대.', 'an elementary school playground: a white school building in the back (no text), a soccer goal on the left, pull-up bars and a flagpole on the right, dirt field'),
    ('town-bg-1.png', 3, '동네 상가', '작은 빵집(유리창에 빵), 문구점 앞 뽑기 기계, 분식집 포장마차, 풍선. 간판 글씨 없이.', 'a cozy small-town shopping street: a little bakery with bread in the window on the left, a stationery shop with a capsule toy machine and a street food cart on the right, balloons, no text on signs'),
    ('town-bg-1.png', 4, '강변 산책로', '강과 다리, 강가 자전거 길, 갈대, 강물에 반짝이는 햇빛.', 'a riverside walking path: a calm river with sparkles and a small bridge in the back, a bike path, reeds and grass on the sides'),
    ('town-bg-2.png', 1, '구립 도서관', '도서관 안: 높은 책장, 큰 창문 햇살, 열람 테이블, 화분.', 'inside a public library: tall bookshelves on the left and right, a big window with soft sunlight, reading tables, potted plants'),
    ('town-bg-2.png', 2, '번화가', '해 질 녘 번화가: 옷가게 쇼윈도, 버블티 가게, 작은 버스킹 무대, 네온 불빛. 글씨 없이.', 'a lively downtown street at dusk: a clothing store window on the left, a bubble tea shop on the right, a tiny busking stage with a mic stand, warm neon glow, no readable text'),
    ('town-bg-2.png', 3, 'PC방·노래방', '어두운 보랏빛 실내, 한쪽에 빛나는 PC 줄, 다른 쪽에 노래방 부스 문과 마이크. 글씨 없이.', 'a dim purple indoor hangout: a row of glowing gaming PCs on the left, a karaoke booth door with a microphone and disco light on the right, no text'),
    ('town-bg-2.png', 4, '대학가', '대학 캠퍼스: 붉은 벽돌 건물, 잔디밭, 큰 나무, 캠퍼스 카페. 글씨 없이.', 'a university campus: red brick buildings in the back, a green lawn, big trees, a small campus cafe with outdoor tables on the right, no text'),
]

MAP_PROMPT = (
    "Create ONE top-down illustrated pixel art map of a small cozy town, image size 1600x1200 (4:3), filling the whole image edge to edge.\n" + ART + "\n"
    "VIEW: top-down / slightly tilted bird's-eye view, like a board game map. Light green grass, sandy dirt roads connecting places, "
    "a blue river along the bottom-left edge, little trees, houses and flowers scattered around.\n"
    "Draw these 8 places as small cute landmark buildings at these positions (x% from left, y% from top), connected by roads:\n"
    "1) playground park with a slide (20%, 30%)  2) elementary school (52%, 18%)  3) little bakery and shops (78%, 36%)  "
    "4) riverside path with a bridge (30%, 74%)  5) library (58%, 52%)  6) busy downtown with shops (82%, 70%)  "
    "7) PC cafe / karaoke building (56%, 84%)  8) university campus (14%, 54%).\n"
    "Leave a little empty space right under each landmark (the game puts a name label there).\n" + NOPEOPLE)

PEOPLE = [
    ('town-people-friend.png', '단짝 친구 (3행 x 2열)', '아이의 단짝. 1행 어린이, 2행 청소년, 3행 청년 / 왼쪽 남자, 오른쪽 여자.',
     "3 rows x 2 columns = 6 full-body sprites of the child's BEST FRIEND at three ages. Row 1 = child age 8-11, Row 2 = teenager age 12-16 in school uniform, "
     "Row 3 = young adult age 17-19 in casual clothes. Left column = boy, right column = girl. Friendly cheerful face, sporty casual style "
     "(a different person from the main character: different hair color and outfit)."),
    ('town-people-rival.png', '라이벌 (3행 x 2열)', '같은 반 라이벌. 1행 어린이, 2행 청소년, 3행 청년 / 왼쪽 남자, 오른쪽 여자. 자신만만한 표정.',
     "3 rows x 2 columns = 6 full-body sprites of a RIVAL classmate at three ages. Row 1 = child age 8-11, Row 2 = teenager age 12-16 in school uniform, "
     "Row 3 = young adult age 17-19. Left column = boy, right column = girl. Confident smirk, arms crossed or hand on hip, neat smart-looking style, "
     "black or dark navy hair."),
    ('town-people-crush.png', '좋아하는 아이 (2행 x 2열)', '첫사랑. 1행 청소년, 2행 청년 / 왼쪽 남자, 오른쪽 여자. 수줍게 웃는 얼굴.',
     "2 rows x 2 columns = 4 full-body sprites of a gentle CRUSH (first love). Row 1 = teenager age 13-16 in school uniform, Row 2 = young adult age 17-19 in "
     "soft casual clothes. Left column = boy, right column = girl. Shy kind smile, slightly blushing, holding a book or a drink."),
    ('town-people-adults.png', '동네 어른들 (1행 x 4열)', '왼쪽부터: 담임 선생님(여), 빵집 할머니, 대학생 선배(남), 대학생 선배(여).',
     "1 row x 4 columns = 4 full-body sprites of neighborhood adults: (1) a kind female elementary school teacher with glasses, cardigan and a book, "
     "(2) a warm smiling grandmother baker with an apron, white hair bun and a tray of bread, (3) a friendly male university student in a hoodie with a backpack, "
     "(4) a friendly female university student in a sweater with a tote bag."),
]


def people_prompt(desc):
    return (f"Create a pixel art character sprite sheet: {desc}\n"
            "Attach reference-son.png and reference-daughter.png ONLY as a style reference: use the SAME pixel size, head-to-body proportions, "
            "outline thickness and shading as those characters, but these are DIFFERENT people.\n"
            "Every sprite stands facing 3/4 toward the viewer, turned slightly to the LEFT (they will talk to the main character standing on their left). "
            "Same height scale per age as the reference rows.\n" + STYLE + "\n"
            "Pure solid white (#FFFFFF) background, wide white gaps between sprites, no floor, no shadow, no text, no watermark.")


def bg_prompt(fname):
    rows = [x for x in LOCS if x[0] == fname]
    lines = '\n'.join(f"Panel {p} ({['top-left', 'top-right', 'bottom-left', 'bottom-right'][p - 1]}): {en}." for _, p, _, _, en in rows)
    return ("Create 4 pixel art background scenes for a cozy life-sim game, one place per panel.\n" + ART + "\n" + BG_RULE + lines + "\n" + NOPEOPLE)


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
    ('🗺️ 주말 나들이 그림 요청서 (총 7장)', 't'), ('', None),
    ('무엇에 쓰나요?', 'h'),
    ('v0.38 "주말 나들이"는 지금 동네 지도·장소·동네 사람들이 이모지와 색으로만 그려져 있습니다. 이 그림들이 들어오면 일러스트로 바뀝니다.', None),
    ('• 동네 지도 1장 — 나들이 첫 화면 (장소 8곳 위치가 정해져 있어 프롬프트대로 배치)', None),
    ('• 장소 배경 2장 (한 장에 4곳) — 장소에 들어가면 위쪽 장면. 가운데 아래는 아이와 동네 사람이 서므로 비워 둠', None),
    ('• 동네 사람 4장 — 단짝·라이벌(나이별)·좋아하는 아이·어른들. 아이 옆에 서서 이야기하는 모습', None),
    ('', None),
    ('만드는 순서', 'h'),
    ('1. "요청 목록"에서 한 줄씩. [프롬프트]를 통째로 붙여 넣습니다.', None),
    ('2. 사람 그림은 reference-son.png · reference-daughter.png 를 같이 첨부합니다 (그림체·크기 맞추기용, 같은 인물을 그리는 건 아님).', None),
    ('3. 받은 그림을 [저장 파일명]으로 보내 주세요. 들어오는 대로 잘라서 게임에 넣습니다.', None),
    ('', None),
    ('꼭 지켜야 할 것', 'h'),
    ('• 배경에는 사람·글씨 없이  • 배경 패널은 가로로 긴 16:9  • 사람은 흰 배경, 왼쪽을 살짝 바라보는 전신', None),
]
for i, (t, k) in enumerate(lines, 1):
    c = ws.cell(row=i, column=2, value=t)
    c.font = TITLE if k == 't' else BOLD if k == 'h' else BODY
    c.alignment = WRAP

rows = [('동네 지도', 'town-map.png', '없음', '위에서 내려다본 동네 지도. 놀이터·학교·빵집·강변·도서관·번화가·PC방·대학가 8곳이 길로 이어짐.', MAP_PROMPT)]
for fname in ['town-bg-1.png', 'town-bg-2.png']:
    names = ' / '.join(f"{p}. {n}" for f, p, n, _, _ in LOCS if f == fname)
    ko = '\n'.join(f"{p}. {n}: {k}" for f, p, n, k, _ in LOCS if f == fname)
    rows.append((f'장소 배경 ({names})', fname, '없음', ko, bg_prompt(fname)))
for fname, who, ko, desc in PEOPLE:
    rows.append((who, fname, 'reference-son.png + reference-daughter.png (그림체 참고용)', ko, people_prompt(desc)))

w2 = wb.create_sheet('요청 목록')
cols = [('#', 5), ('무엇', 26), ('저장 파일명', 24), ('첨부할 기준 그림', 26), ('그림 내용 (한글)', 48), ('프롬프트 (그대로 복사)', 100), ('완료', 7)]
for j, (h, wdt) in enumerate(cols, 1):
    c = w2.cell(row=1, column=j, value=h)
    c.font, c.fill, c.alignment, c.border = HF, HDR, CEN, BOX
    w2.column_dimensions[c.column_letter].width = wdt
for i, (what, fname, attach, ko, pr) in enumerate(rows, 1):
    for j, v in enumerate([i, what, fname, attach, ko, pr, None], 1):
        c = w2.cell(row=i + 1, column=j, value=v)
        c.font, c.alignment, c.border = BODY, (CEN if j in (1, 7) else WRAP), BOX
    w2.cell(row=i + 1, column=7).fill = DONE
    w2.row_dimensions[i + 1].height = 260
w2.freeze_panes = 'A2'
wb.save('docs/town_requests.xlsx')
print('docs/town_requests.xlsx', len(rows))
