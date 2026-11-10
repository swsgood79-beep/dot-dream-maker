"""그림이 비어 있는 화면의 배경 요청서 → docs/bg2_requests.xlsx
특별한 하루 21곳 · 감정의 순간 · 성장 컷신 · 부모의 손길 창 · 관찰 카메라(기존 S8·S9)를 한 장에 4곳씩.
받은 그림: assets-src/bg2-{번호}.png (관찰 카메라는 scene-s8.png · scene-s9.png)"""
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

src = open('scripts/make-sprite-requests.py', encoding='utf-8').read()
ns = {}
exec(src[src.index('STYLE = ('):src.index('ISO = (')], ns)
ART = ns['STYLE'].split(' Pure solid white')[0]
rec = {}
rsrc = open('scripts/make-rec-requests.py', encoding='utf-8').read()
exec(rsrc[rsrc.index('SHEETS = ['):rsrc.index("F = 'Arial'")], rec)

NOPEOPLE = "NO people, NO characters, NO animals in the foreground, NO text, NO letters, NO numbers, NO logos, NO signs with writing, NO watermark."
RULE = ("LAYOUT: exactly 2 rows x 2 columns = 4 separate scene panels. Every panel is a LANDSCAPE rectangle with a 16:9 ratio "
        "and a thin dark outline, separated by wide pure white (#FFFFFF) gaps. Image size 2048x2048.\n"
        "VIEW: flat side view like a 2D stage set (NOT isometric, NOT top-down), camera at a child's eye level. The bottom 30% of every panel "
        "is floor or ground. Keep the CENTER-BOTTOM of every panel EMPTY (just floor) because game characters will stand there. "
        "Put furniture, buildings and props on the left and right sides and in the background.\n")

# (저장 파일명, 묶음 이름, [(게임 ID, 이름, 한글 설명, 쓰이는 곳, 영어 지시)])
SHEETS = [
    ('bg2-1.png', '특별한 하루 ① 명절·봄여름', [
        ('SP_SEOLLAL', '설날 세배', '설 아침 거실: 병풍, 상 위 떡국·한과, 복주머니, 따뜻한 햇살', '✨ 설날 세뱃돈',
         "a Korean family living room on Lunar New Year morning: a folding screen with a painted landscape on the back wall, a low table with rice cake soup and traditional sweets on the left, colorful lucky pouches, warm sunlight, festive red and gold accents"),
        ('SP_KITE', '연날리기 강둑', '바람 부는 강둑: 파란 하늘, 멀리 연들, 마른 풀, 강물', '✨ 연날리기',
         "a windy riverbank in early spring: wide bright blue sky with a few colorful kites flying far away, dry golden grass on the slope, a calm river in the distance, a small wooden bench on the right"),
        ('SP_PICNIC', '벚꽃 공원', '벚꽃이 흩날리는 공원: 돗자리, 도시락 바구니, 벚나무 터널', '✨ 벚꽃 가족사진',
         "a park in full cherry blossom: pink cherry trees on both sides forming an arch, falling petals in the air, a picnic mat with a basket and lunch boxes on the left, soft spring light"),
        ('SP_FIREFLY', '여름밤 캠핑', '계곡 옆 캠핑장 밤: 텐트, 모닥불, 반딧불이, 별', '✨ 여름밤 캠핑',
         "a camping site by a mountain stream on a summer night: a tent on the left, a crackling campfire on the right, glowing fireflies floating everywhere, tall pine trees, a starry dark-green and navy sky"),
    ]),
    ('bg2-2.png', '특별한 하루 ② 여름가을', [
        ('SP_BLACKOUT', '장마철 정전', '정전된 밤 거실: 촛불 하나, 창밖 번개와 비, 소파', '✨ 장마철 정전',
         "a living room during a power outage on a stormy night: one candle glowing on a low table, rain and a flash of lightning through the window on the right, a sofa with blankets on the left, very dark blue room lit only by warm candlelight"),
        ('SP_SHOOTING_STAR', '별똥별 옥상', '여름밤 아파트 옥상: 돗자리, 쏟아지는 별똥별, 은하수', '✨ 별똥별 쏟아지는 밤',
         "an apartment rooftop on a clear summer night: a picnic mat and pillows on the left, potted plants and a railing on the right, a huge sky full of stars, the Milky Way and several shooting stars streaking across"),
        ('SP_CHUSEOK', '추석 할머니 댁', '시골 한옥 마루: 큰 보름달, 송편 접시, 감나무', '✨ 추석 송편 빚기',
         "a traditional Korean countryside house porch (wooden maru floor) on a Chuseok evening: a big full moon, a persimmon tree with orange fruit on the right, a low table with a plate of half-moon rice cakes on the left, paper lanterns"),
        ('SP_HALLOWEEN', '할로윈 골목', '할로윈 밤 주택가: 호박 등불, 거미줄 장식, 보름달', '✨ 할로윈 사탕 모으기',
         "a cute neighborhood street on Halloween night: houses with glowing carved pumpkins on the steps, cobweb and bat decorations, warm windows, a big orange full moon in a purple sky, fun not scary"),
    ]),
    ('bg2-3.png', '특별한 하루 ③ 겨울·집 안', [
        ('SP_FIRST_SNOW', '첫눈 오는 마당', '눈 덮인 마당: 하얀 지붕, 눈 쌓인 나무, 내리는 눈', '✨ 첫눈 오는 날',
         "a house front yard covered in the first snow of winter: snow on the roof and fence, a snowy tree, gently falling snowflakes, soft white and pale blue, quiet and magical"),
        ('SP_GIMBAP', '김밥 만드는 부엌', '아침 부엌: 도마 위 김·밥·재료, 햇살 드는 창', '✨ 같이 김밥 말기',
         "a bright home kitchen on a weekend morning: a cutting board with seaweed, rice and colorful fillings (carrot, egg, spinach) on the counter on the left, a sunny window, hanging utensils on the right"),
        ('SP_MOVIE_NIGHT', '거실 영화관', '불 끈 거실: TV 화면 빛, 바닥에 이불과 팝콘', '✨ 거실 영화관',
         "a family living room turned into a home theater at night: lights off, the glow of a TV screen (blank, no image) on the back wall, blankets and cushions spread on the floor, a big bowl of popcorn, cozy blue light"),
        ('SP_CLEANUP', '대청소하는 아이 방', '대청소 중인 아이 방: 정리 상자, 쌓인 장난감, 빗자루, 열린 창', '✨ 대청소 날',
         "a kid bedroom in the middle of a big cleanup: open cardboard boxes, piles of toys and books on the left, a broom and a bucket on the right, the window wide open with fresh air, a little messy but cheerful"),
    ]),
    ('bg2-4.png', '특별한 하루 ④ 청소년·청년', [
        ('SP_FLEA_MARKET', '동네 벼룩시장', '주말 공원 벼룩시장: 돗자리 위 장난감·책, 천막, 풍선', '✨ 동네 벼룩시장',
         "a weekend flea market in a neighborhood park: picnic mats with used toys and books for sale, small colorful canopy tents on both sides, balloons, sunny day"),
        ('SP_TICKETING', '티켓팅하는 밤', '밤 방 책상: 빛나는 모니터, 핸드폰, 아이돌 포스터(글씨 없음)', '✨ 콘서트 티켓팅 대작전',
         "a teenager's room at night: a desk on the left with a glowing computer monitor (blank screen) and a smartphone, posters of an idol concert on the wall (no text, no faces), purple and pink neon light, exciting tense mood"),
        ('SP_RAMEN', '한밤의 야식 부엌', '밤 11시 부엌: 냄비에서 김 오르는 라면, 식탁 위 스탠드', '✨ 한밤의 야식 라면',
         "a home kitchen late at night: a pot of ramen steaming on the stove on the left, a small dining table with two bowls and a warm lamp on the right, dark window, cozy and quiet"),
        ('SP_PHOTO_BOOTH', '네 컷 사진관', '셀프 사진관 안: 알록달록 소품 벽, 머리띠·선글라스, 조명', '✨ 같이 네 컷 사진',
         "inside a self photo booth studio: a wall of cute props (headbands, sunglasses, hats) on the left, a bright ring light and a pastel backdrop curtain on the right, pink and lavender colors"),
    ]),
    ('bg2-5.png', '특별한 하루 ⑤', [
        ('SP_DRIVE', '빈 주차장 저녁', '텅 빈 마트 주차장: 주차선, 가로등, 노을', '✨ 빈 주차장 운전 연습',
         "an empty supermarket parking lot at sunset: painted parking lines, one small car parked on the left (no people), street lamps, a big orange and purple sunset sky"),
        ('SP_SECRET_VISIT', '아이의 알바 카페', '아담한 카페 안: 카운터, 커피 머신, 디저트 진열장', '✨ 아이의 알바 가게',
         "a cozy small cafe interior: a wooden counter with a coffee machine on the right, a dessert display case, small tables and plants on the left, warm afternoon light"),
        ('SP_TOOTH', '이 빠진 날 마당', '주택 마당: 낮은 기와지붕, 까치 한 마리 앉은 지붕', '✨ 흔들리던 이가 쏙!',
         "a small house yard with a low tiled roof clearly visible: a magpie sitting on the roof edge, a wooden fence, a little garden, blue afternoon sky"),
        ('SP_FRIEND_VISIT', '친구가 놀러 온 거실', '거실 낮은 탁자 위 간식, 보드게임, 풍선', '✨ 친구가 놀러 왔어요',
         "a bright family living room when friends visit: a low table with snacks and juice on the left, a board game box and cushions on the floor, a few balloons, cheerful afternoon"),
    ]),
    ('bg2-6.png', '특별한 하루 ⑥ + 감정의 순간 ①', [
        ('SP_STRAY_DOG', '동네 골목길', '조용한 동네 골목: 담벼락, 전봇대, 화분', '✨ 길 잃은 강아지',
         "a quiet residential alley: low walls, a utility pole, potted plants by the doors, a few fallen leaves, soft afternoon light"),
        ('EMO_MART', '마트 장난감 코너', '대형 마트 장난감 코너: 장난감 상자 진열대, 카트', '💗 마트 떼쓰기',
         "a supermarket toy aisle: shelves full of colorful toy boxes (no text) on both sides, a shopping cart on the right, bright store lights"),
        ('EMO_ROOM', '아이 방 (낮)', '평범한 아이 방 낮: 침대, 책상, 창문 햇살', '💗 놀림받은 날 · 찢어진 스케치북 · 학원 가기 싫어',
         "an ordinary kid bedroom in the daytime: a bed on the left, a small desk with a chair on the right, a window with sunlight, a few books and toys, calm"),
        ('EMO_LIVING', '거실 (보드게임)', '거실 바닥 위 보드게임 판, 쿠션, 소파', '💗 보드게임 엎기',
         "a family living room: a board game spread on the floor with game pieces, floor cushions, a sofa in the back, a lamp, afternoon light"),
    ]),
    ('bg2-7.png', '감정의 순간 ② + 성장 컷신 ①', [
        ('EMO_CAR', '돌아오는 차 안', '저녁 차 뒷좌석에서 본 실내: 창밖 도시 불빛', '💗 대회가 끝나고',
         "the back seat of a family car in the evening seen from inside: seats on both sides, city lights and street lamps passing outside the windows, quiet blue tones"),
        ('EMO_ENTRY', '현관', '집 현관: 신발장, 신발들, 현관문, 우산꽂이', '💗 "내 인생이야!"',
         "a home entrance hallway (Korean style): a shoe cabinet on the left, shoes on the floor, the front door in the back, an umbrella stand, evening light"),
        ('EMO_SOFA', '저녁 거실 소파', '저녁 거실 소파: 쿠션, 스탠드 조명, 창밖 노을', '💗 단톡방 · 거울 앞 · 뒤처진 것 같아 · 알바',
         "a living room sofa in the evening: a sofa with cushions, a floor lamp with warm light, a sunset glow through the window, a small side table, calm and a little lonely"),
        ('CS_SCHOOL', '초등학교 입학식', '초등학교 교문: 입학 축하 아치(글씨 없음), 벚꽃, 풍선', '🎬 초등학교 입학식',
         "an elementary school front gate on entrance ceremony day: a flower and balloon arch over the gate (no text), cherry blossoms, the school building behind, bright spring morning"),
    ]),
    ('bg2-8.png', '성장 컷신 ②', [
        ('CS_PUBERTY', '문틀 키 재기', '아침 거실 문틀: 연필로 그은 키 눈금 여러 줄', '🎬 어느새 훌쩍 (12세)',
         "a home doorway frame in the morning living room: many small pencil height marks drawn on the door frame (no numbers), a family photo on the wall, morning sunlight"),
        ('CS_MIDDLE', '중학교 교문', '중학교 교문: 큰 교복 학생 건물, 벚꽃 길', '🎬 중학교 입학 (14세)',
         "a middle school front gate in spring: a bigger, more grown-up school building, a cherry blossom path, a school flag, bright morning"),
        ('CS_GROWN', '노을 지는 골목', '노을 진 집 앞 골목: 길게 늘어진 그림자, 가로등', '🎬 이제 거의 어른 (17세)',
         "the street in front of the family house at sunset: long shadows, a street lamp just turning on, the house gate on the left, a warm orange and purple sky, nostalgic mood"),
        ('CS_SENIOR', '고3 밤 교실', '밤 자율학습 교실: 책 쌓인 책상들, 칠판(글씨 없음), 창밖 어둠', '🎬 고3, 마지막 1년 (19세)',
         "a high school classroom at night during self-study: rows of desks with stacked books, a blank chalkboard, fluorescent lights, a dark window, focused and tired mood"),
    ]),
    ('bg2-9.png', '부모의 손길 창', [
        ('PT_BDAY', '생일 파티 거실', '생일 거실: 케이크, 풍선, 가랜드(글씨 없음), 선물 상자', '🎂 생일 창',
         "a living room decorated for a birthday party: a cake with candles on a table, balloons, a paper garland (no text), wrapped gift boxes, warm festive light"),
        ('PT_HOMEWORK', '저녁의 공부 책상', '저녁 아이 방 책상: 스탠드, 펼친 공책, 연필꽂이', '✏️ 숙제 봐주기 창',
         "a kid's study desk in the evening: a desk lamp, an open notebook and textbook, a pencil holder, a small bookshelf, cozy warm light"),
        ('PT_LUNCH', '도시락 싸는 부엌', '이른 아침 부엌: 도시락통, 반찬 그릇, 밥솥', '🍱 도시락 싸 주기 창',
         "a kitchen early in the morning: open lunch boxes on the counter with small side dishes in bowls, a rice cooker, soft dawn light through the window"),
        ('PT_REPORT', '성적표 보는 식탁', '저녁 식탁: 봉투와 종이 한 장(글씨 없음), 찻잔', '📄 성적표 창',
         "a family dining table in the evening: an envelope and a blank sheet of paper on the table, two cups of tea, a pendant lamp above, calm serious mood"),
    ]),
]
# 관찰 카메라 (기존 요청서와 같은 내용·같은 파일명)
for code, fname, title, items in rec['SHEETS']:
    SHEETS.append((fname, f'관찰 카메라 {code} — {title}', items))


def prompt(items):
    lines = '\n'.join(f"Panel {k} ({['top-left', 'top-right', 'bottom-left', 'bottom-right'][k]}): {it[4]}." for k, it in enumerate(items))
    return ("Create 4 pixel art background scenes for a cozy life-sim game about raising a child, one place per panel.\n" + ART + "\n" + RULE + lines + "\n" + NOPEOPLE)


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
    (f'비어 있는 화면 배경 요청서 (총 {len(SHEETS)}장 · {sum(len(s[2]) for s in SHEETS)}곳)', 't'), ('', None),
    ('무엇에 쓰나요?', 'h'),
    ('지금 색 그라데이션과 이모지로만 그려진 화면들의 배경입니다.', None),
    ('• 특별한 하루 21곳 (설날 · 캠핑 · 할로윈 · 첫눈 · 티켓팅 …)  • 감정의 순간 6곳  • 성장 컷신 5곳  • 부모의 손길 창 4곳 (생일 · 숙제 · 도시락 · 성적표)', None),
    ('• 관찰 카메라 8곳 (예전 요청서 rec_requests 와 같은 내용, 아직 안 받은 것)', None),
    ('', None),
    ('만드는 순서', 'h'),
    ('1. "요청 목록"에서 한 줄씩. [프롬프트]를 통째로 붙여 넣으면 한 장에 4곳이 나옵니다 (첨부할 그림 없음).', None),
    ('2. 주말 나들이 장소 배경(town-bg)과 같은 그림체·형식이면 가장 좋습니다. 원하면 그 그림을 같이 첨부해도 됩니다.', None),
    ('3. 받은 그림을 [저장 파일명]으로 보내 주세요 (압축 파일로 여러 장 한 번에 보내도 됩니다).', None),
    ('', None),
    ('꼭 지켜야 할 것', 'h'),
    ('• 사람·글씨 없이  • 가로로 긴 16:9 패널 4개  • 가운데 아래는 비워 둠 (아이 캐릭터가 서는 자리)', None),
]
for i, (t, k) in enumerate(lines, 1):
    c = ws.cell(row=i, column=2, value=t)
    c.font = TITLE if k == 't' else BOLD if k == 'h' else BODY
    c.alignment = WRAP

w2 = wb.create_sheet('요청 목록')
cols = [('#', 5), ('묶음', 26), ('저장 파일명', 18), ('4곳 (게임 ID · 쓰이는 곳)', 54), ('그림 내용 (한글)', 54), ('프롬프트 (그대로 복사)', 100), ('완료', 7)]
for j, (h, wdt) in enumerate(cols, 1):
    c = w2.cell(row=1, column=j, value=h)
    c.font, c.fill, c.alignment, c.border = HF, HDR, CEN, BOX
    w2.column_dimensions[c.column_letter].width = wdt
for i, (fname, title, items) in enumerate(SHEETS, 1):
    where = '\n'.join(f"{k + 1}. {it[1]} ({it[0]}) — {it[3]}" for k, it in enumerate(items))
    ko = '\n'.join(f"{k + 1}. {it[1]}: {it[2]}" for k, it in enumerate(items))
    for j, v in enumerate([i, title, fname, where, ko, prompt(items), None], 1):
        c = w2.cell(row=i + 1, column=j, value=v)
        c.font, c.alignment, c.border = BODY, (CEN if j in (1, 7) else WRAP), BOX
    w2.cell(row=i + 1, column=7).fill = DONE
    w2.row_dimensions[i + 1].height = 250
w2.freeze_panes = 'A2'
wb.save('docs/bg2_requests.xlsx')
print('docs/bg2_requests.xlsx', len(SHEETS), sum(len(s[2]) for s in SHEETS))
