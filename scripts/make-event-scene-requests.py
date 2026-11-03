"""육아 이벤트·성장 컷신 장면 일러스트 요청서 (docs/event_scene_requests.xlsx).
사람 대신 사물·공간 중심 구도 → 한 장으로 아들/딸, 모든 나이에 사용.
실행: python3 scripts/make-event-scene-requests.py docs/event_list.json"""
import json, sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

events = {e['id']: e for e in json.load(open(sys.argv[1], encoding='utf-8'))}

# (ID, 분류, 한글 그림 설명, 영어 프롬프트)
S = [
 # 유년기
 ('C_FRIEND_FIGHT','유년기','하교 후 현관: 내팽개친 책가방, 끊어진 우정 팔찌, 발로 차 놓은 운동화 한 짝, 노을빛','a messy entryway after school: a schoolbag thrown on the floor, a torn friendship bracelet, one sneaker kicked aside, warm sunset light through the door'),
 ('C_BROKEN_VASE','유년기','거실 바닥에 깨진 꽃병과 흩어진 꽃, 옆에 굴러온 축구공, 소파 뒤로 삐죽 나온 작은 그림자','a living room floor with a shattered flower vase and scattered flowers, a soccer ball rolled beside it, a small shadow peeking from behind the sofa'),
 ('C_HOMEWORK','유년기','밤 10시 책상: 산더미 같은 방학 숙제 문제집, 하얀 그림일기장, 켜진 스탠드, 벽시계 10시','a child desk at night piled with summer homework workbooks and a blank picture diary, desk lamp on, a wall clock showing ten o\'clock'),
 ('C_SPARROW','유년기','작은 두 손 위 날개 다친 참새, 옆에 솜을 깐 신발 상자 둥지','two small cupped hands holding a tiny sparrow with an injured wing, a shoebox nest lined with cotton beside it'),
 ('C_FEVER','유년기','새벽 2시 어두운 방: 베개 위 젖은 수건, 협탁의 체온계·물컵·약, 은은한 달빛','a dark bedroom at 2 a.m.: a pillow with a damp folded towel, a thermometer, a glass of water and medicine on the nightstand, soft moonlight'),
 ('C_DREAM','유년기','잠들기 전 침대: 이불 위에 펼친 직업 그림책(글자 없이), 창밖 별, 작은 수면등','a cozy bed at night with a picture book about jobs open on the blanket (pictures only), stars outside the window, a small night light'),
 ('C_STAGE_FRIGHT','유년기','침대 위 이불 동굴, 옆에 학예회 대본(글자 없이)과 반짝이 무대 의상','a blanket fort on a bed, a school-play script (no readable text) and a sparkly stage costume hanging next to it'),
 ('C_SMARTPHONE','유년기','교실 책상마다 반짝이는 스마트폰, 가운데 한 자리만 텅 빈 책상','classroom desks where every desk has a shiny smartphone except one empty desk in the center'),
 ('C_SKIP_ACADEMY','유년기','늦은 오후 울리는 집 전화기, 문 옆에 그대로 놓인 학원 가방','a ringing home telephone on a side table with motion lines, an unused academy bag left by the door, late afternoon light'),
 ('C_CHRISTMAS','유년기','크리스마스트리 아래 포장된 선물들, 걸어 둔 양말, 산타를 위한 우유와 쿠키','a Christmas tree with wrapped presents underneath, a hanging stocking, milk and cookies left out for Santa'),
 ('C_PARENTS_DAY','유년기','식탁 위 삐뚤빼뚤한 종이 카네이션과 크레파스 편지(낙서만, 글자 없이)','a kitchen table with a handmade paper carnation and a crayon letter (scribbles and hearts only, no readable text)'),
 ('C_BAD_TEST','유년기','책가방 속에서 삐져나온 구겨진 받아쓰기 시험지, 빨간 X 표시 가득(숫자 없이)','a crumpled spelling test paper peeking out of a schoolbag, covered with red X marks (no numbers)'),
 ('C_CHORES','유년기','설거지한 접시가 쌓인 싱크대, 아직 거품이 묻어 있음, 앞에 작은 디딤대','a kitchen sink with a stack of just-washed dishes still covered in soap bubbles, a small step stool in front of it'),
 # 청소년기
 ('T_DOOR_SLAM','청소년기','방금 쾅 닫힌 방문, 문고리에 큰 X 그림 팻말, 진동 효과 선, 어두운 복도','a bedroom door that was just slammed, a door-hanger sign with a big X symbol, motion lines, a dim hallway'),
 ('T_CRUSH','청소년기','화장대 거울 앞 빗, 향수병, 작은 하트 포스트잇, 반짝이는 빛','a dresser mirror with a hairbrush, a cologne bottle and a small heart sticky note, sparkly light'),
 ('T_LATE_GAME','청소년기','새벽 2시 깜깜한 방, 모니터 불빛만, 헤드셋과 에너지 음료 캔','a dark room at 2 a.m. lit only by a glowing gaming monitor, a headset and an energy drink can on the desk'),
 ('T_SMOKE','청소년기','빨래 바구니 위 교복 셔츠에서 희미하게 피어오르는 회색 연기, 어두운 세탁실','a school uniform shirt on top of a laundry basket with a faint gray smoke wisp rising from it, a dim laundry room'),
 ('T_BULLY','청소년기','이불 속 어둠에서 빛나는 휴대폰, 화면 가득 화난 기호의 말풍선(글자 없이)','a phone glowing under a dark blanket, its screen full of chat bubbles with angry symbols (no text)'),
 ('T_CLUB','청소년기','학교 게시판 동아리 포스터 두 장: 춤추는 실루엣 / 로봇 그림 (글자 없이)','a school bulletin board with two club posters side by side: a dancing silhouette and a robot drawing (no text)'),
 ('T_HAIR','청소년기','미용실 거울과 알록달록한 염색 색상표, 가위','a hair salon mirror with a colorful hair-dye swatch chart and scissors'),
 ('T_PARTTIME','청소년기','밤 편의점 계산대, 걸어 둔 유니폼 앞치마, 형광등','a convenience store counter at night with a uniform apron hanging and a cash register, bright fluorescent light'),
 ('T_EXAM_TEARS','청소년기','늦은 밤 책상: 눈물 자국 난 노트, 휴지, 부모님이 가져다준 김 나는 라면','a late-night desk with tear-stained notebooks and tissues, and a steaming bowl of ramen brought in on a tray'),
 ('T_YOUTUBE','청소년기','책상 위 삼각대에 꽂은 폰, 링라이트, 빨간 녹화 버튼','a desk with a phone on a small tripod, a ring light, and a glowing red record button icon'),
 ('T_SLEEPOVER','청소년기','밤 현관: 빵빵하게 싼 배낭과 잠옷, 반쯤 열린 문 밖 어두운 거리','an entryway at night with a packed overnight backpack and pajamas, the front door half open to a dark street'),
 ('T_BODY','청소년기','욕실 벽 키 재기 눈금(지난번보다 훌쩍 높아진 표시), 거울, 수건 — 귀엽고 건전하게','a bathroom wall growth chart with a new mark much higher than before, a mirror and a towel (cute and wholesome)'),
 ('T_FIGHT_PARENT','청소년기','저녁 식탁: 엎어진 숟가락, 반쯤 먹은 밥, 홱 밀어 둔 의자 하나','a dinner table with a knocked-over spoon, a half-eaten meal and one chair pushed back abruptly'),
 # 청년기
 ('Y_ART_SCHOOL','청년기','방 한쪽 가득한 스케치북과 캔버스, 미대 포트폴리오 파일, 바닥의 물감 자국','a bedroom corner filled with sketchbooks and canvases, an art school portfolio folder, paint stains on the floor'),
 ('Y_SUNEUNG','청년기','수능 전날 밤 책상: 수험표, 따뜻한 우유 한 잔, 하트만 그린 응원 쪽지','the night before the big exam: an exam admission card, a mug of warm milk and a small cheering note with only a heart on the desk'),
 ('Y_FIRST_PAY','청년기','거실 탁자 위 리본 묶은 작은 선물 상자와 월급 봉투','a small gift box with a ribbon and a pay envelope on the living room table'),
 ('Y_BURNOUT','청년기','캄캄한 방 침대 위 웅크린 이불 더미, 바닥에 흩어진 문제집, 작은 스탠드 하나','a dark room with a curled-up blanket mound on the bed and workbooks scattered on the floor, a single small lamp'),
 ('Y_LICENSE','청년기','운전 연습 차 안: 운전대, 대시보드의 초록 새싹 초보 마크','a driving school car interior: a steering wheel and a green leaf beginner-driver badge on the dashboard'),
 ('Y_GRADUATION','청년기','고등학교 졸업: 커다란 꽃다발, 리본 묶은 졸업장, 흩날리는 꽃잎','a high school graduation: a big flower bouquet, a rolled diploma with a ribbon, falling flower petals'),
 ('Y_CURFEW','청년기','자정 넘은 현관: 켜진 현관등, 12시 넘은 시계, 배터리 다 된 휴대폰','an entryway after midnight: the porch light on, a clock past twelve, a phone showing a dead battery icon'),
 ('Y_VOLUNTEER','청년기','보육원 놀이방: 그림책, 블록 장난감, 의자에 걸린 봉사 앞치마','a cheerful orphanage playroom with picture books, toy blocks and a volunteer apron on a chair'),
 ('A_HOLIDAY_MONEY','명절','명절 상차림, 빨간 세뱃돈 봉투, 곱게 접힌 작은 한복','a Korean holiday setting: a traditional table with festive food, a red money envelope and a small folded hanbok'),
 # 부모 직업
 ('P_DOCTOR','부모 직업','병원 진료실 책상 위 진짜 청진기와 장난감 청진기','a hospital exam room desk with a real stethoscope and a small toy stethoscope side by side'),
 ('P_PROFESSOR','부모 직업','맨 뒷자리에서 본 대학 강의실, 큰 칠판의 분필 그림(글자 없이)','a university lecture hall seen from the back row, a big blackboard with chalk diagrams (no readable text)'),
 ('P_ARTIST','부모 직업','좁은 작업실: 이젤, 물감 튜브, 텅 빈 돼지저금통','a small cramped art studio with an easel, paint tubes and an empty piggy bank'),
 ('P_COACH','부모 직업','새벽 6시 운동장, 큰 운동화와 작은 운동화 한 켤레씩','a school field at 6 a.m. dawn with two pairs of running shoes, one big and one small'),
 ('P_CHEF','부모 직업','주방 도마 위 삐뚤게 썬 당근, 아이용 작은 앞치마','a kitchen cutting board with clumsily cut carrots and a tiny kid apron'),
 ('P_DEVELOPER','부모 직업','책상 위 노트북의 알록달록 코드 줄(글자 없이), 분해된 컴퓨터 부품','a desk with a laptop showing colorful code lines (abstract, no letters) and disassembled computer parts'),
 ('P_OFFICE','부모 직업','늦은 밤 현관: 벗어 둔 서류가방과 넥타이, 계단에서 기다리다 놓인 곰인형','a late-night entryway: a briefcase and loosened tie by the door, a teddy bear left waiting on the step'),
 ('P_SHOP','부모 직업','동네 가게 계산대와 사탕 병들, 작은 앞치마','a cozy neighborhood corner shop counter with candy jars and a tiny apron'),
 # 형편
 ('K_RICH','집안 형편','넓은 공부방: 빽빽한 과외 시간표(색 블록만), 교재 다섯 권, 창밖 놀이터','a luxurious study room with a packed weekly timetable (colored blocks only), five different textbooks, and a playground visible through the window'),
 ('K_MIDDLE','집안 형편','가족 외식 식당 테이블: 돈가스와 음료, 그림만 있는 메뉴판','a family restaurant table with pork cutlets and drinks, a picture-only menu'),
 ('K_WORKING','집안 형편','작은 식탁 위 불어 버린 라면 두 그릇, 9시 벽시계, 어두운 조명','a small kitchen table with two bowls of soggy ramen waiting, a wall clock at nine, dim light'),
 ('K_POOR','집안 형편','낡은 책가방 위 구겨진 가정통신문(글자 없이)과 작은 수학여행 버스 그림','a crumpled school notice (no text) with a small drawing of a field-trip bus, on top of a worn-out schoolbag'),
 # 다회차 · 단짝
 ('V_VISIT','다회차','현관: 커다란 리본 선물 상자, 아이 신발 옆 어른 구두','an entryway with a big ribboned gift box and a pair of grown-up dress shoes beside small kid shoes'),
 ('F_SLEEPOVER','단짝 친구','친구 방 이층침대, 베개 싸움으로 날리는 깃털','a friend\'s bedroom with bunk beds, pillows and feathers floating from a pillow fight'),
 ('F_MOVING','단짝 친구','이삿짐 트럭과 상자들, 손 흔드는 두 작은 그림자','a moving truck on a street with boxes, and two small shadows waving goodbye'),
 ('F_TEEN_FIGHT','단짝 친구','학교 복도 사물함 앞, 서로 등 돌린 두 개의 가방','a school hallway with lockers and two schoolbags facing away from each other'),
 ('F_REUNION','단짝 친구','휴대폰 화면 속 하이파이브 하는 두 손 사진, 반짝임','a phone screen showing a photo of two hands doing a high five (no text), sparkles'),
 # 기억
 ('M_VASE_WARM','기억','새 꽃병의 싱그러운 꽃, 옆에 어릴 적 사진 액자','a new flower vase with fresh flowers next to a framed old photo of a little child (simple, face not detailed)'),
 ('M_VASE_STRICT','기억','금이 간 채 다시 붙인 오래된 꽃병, 오후 햇살','an old vase glued back together with visible cracks, soft afternoon light'),
 ('M_SPARROW','기억','창틀에 앉은 참새, 옆에 반창고 붙은 낡은 신발 상자','a sparrow perched on a windowsill next to an old shoebox with a bandage on it'),
 ('M_FEVER','기억','서로 꼭 잡은 두 손 (어른 손과 다 큰 아이 손), 따뜻한 빛','two hands holding each other, an adult hand and a teenager\'s hand, warm light'),
 ('M_DREAM_FREE','기억','어릴 적 직업 그림책 옆에 놓인 고등학생의 플래너','an open childhood picture book about jobs beside a high schooler\'s planner'),
 ('M_DREAM_STRICT','기억','작은 그림 위로 무거운 그림자를 드리운 의학·법학 책 더미','a tall stack of medical and law books casting a heavy shadow over a small child\'s drawing'),
 ('M_DREAM_WARM','기억','코르크보드에 꽂힌 작은 소방관 옷 사진','a photo of a tiny firefighter costume pinned to a corkboard'),
 ('M_SANTA','기억','의자에 벗어 둔 산타 모자와 양말, 벽에 비친 부모 그림자','a Santa hat and a Christmas stocking left on a chair, a parent\'s silhouette on the wall'),
 ('M_PHONE','기억','다 읽은 책이 가득한 책장 위에 놓인 낡은 폴더폰','a bookshelf full of well-read books with an old flip phone on top'),
 ('M_BULLY','기억','엎어 둔 휴대폰 옆 작은 방패 모양 배지, 아침 햇살','a phone lying face down next to a small shield-shaped badge, morning sunlight'),
 ('M_SORRY','기억','저녁 식탁의 보글보글 김치찌개 냄비와 찻잔 두 개','a family dinner table with a bubbling kimchi stew pot and two cups of tea'),
 ('M_WISH_CLOSED','기억','먼지 쌓인 자물쇠 상자, 틈으로 삐져나온 소원 쪽지들','a small dusty locked box with folded wish notes peeking out'),
 # 연속 이야기
 ('A_REBEL_1','반항기','식탁 위에 던져 둔 헤드폰, 비어 있는 의자들, 화난 낙서 구름','a dinner table with headphones tossed on it, empty chairs and an angry scribble cloud in the air'),
 ('A_REBEL_2','반항기','밤 11시 현관문, 벽시계, 빛나는 휴대폰 알림(글자 없이)','a front door at 11 p.m., a wall clock and glowing phone notifications (no text)'),
 ('A_REBEL_3','반항기','현관에 놓인 짐 싼 가방, 신어 둔 신발, 반쯤 열린 문','a packed travel bag by the front door, shoes on the step, the door half open'),
 ('A_REBEL_4','반항기','아침 햇살 드는 책상 위 작은 하트가 그려진 접힌 쪽지','a folded note with a small heart on a desk, morning sunlight through the window'),
 ('A_LOVE_1','첫사랑','베개 위에서 하트 이모지로 빛나는 휴대폰, 반짝임','a phone glowing with heart emojis on a pillow, sparkles'),
 ('A_LOVE_2','첫사랑','책상 위 하트 스티커로 봉한 편지와 달력','a sealed love letter with a heart sticker on a desk next to a calendar'),
 ('A_LOVE_3Y','첫사랑','비 오는 길에 나란히 선 분홍·파랑 우산 두 개','two umbrellas side by side in the rain, one pink and one blue'),
 ('A_LOVE_3N','첫사랑','침대 위 이불 더미와 주변의 휴지, 빗물 흐르는 창','a blanket mound on a bed with tissues around it, rain running down the window'),
 ('A_LOVE_3W','첫사랑','살짝 열린 서랍 속 전하지 못한 편지, 창밖 벚꽃','a slightly open drawer with an unsent letter inside, cherry blossoms outside the window'),
 ('A_DREAM_1','진로','학교 진로 상담실: 그림만 있는 직업 안내 책자, 마주 놓인 의자 두 개','a school counseling room with a career brochure (pictures only) and two chairs facing each other'),
 ('A_DREAM_2C','진로','닫힌 방문 아래로 새어 나오는 불빛, 문틈으로 밀어 넣은 꿈 그림','a closed bedroom door with light leaking under it and a drawing of a dream pushed under the door'),
 ('A_DREAM_2O','진로','벽에 붙인 큰 계획표, 알록달록 포스트잇, 맨 위의 별','a big plan chart on the wall covered with colorful sticky notes and a star at the top'),
 # 성장 컷신
 ('CS_SCHOOL','성장 컷신','벚꽃 핀 초등학교 교문 앞, 몸보다 큰 새 책가방','an elementary school gate with cherry blossoms, an oversized new backpack on the ground'),
 ('CS_PUBERTY','성장 컷신','문틀에 연필로 그은 키 눈금들, 맨 위 새 눈금이 훌쩍','a door frame with pencil height marks, the newest mark much higher than the rest'),
 ('CS_MIDDLE','성장 컷신','거울 앞에 걸린 새 중학교 교복','a brand-new middle school uniform hanging in front of a mirror'),
 ('CS_GROWN','성장 컷신','아침 햇살 드는 현관, 어른 크기의 운동화','a front entryway in morning light with a pair of grown-up sized sneakers'),
 ('CS_SENIOR','성장 컷신','책상 위 쌓인 문제집과 D-250 카운트다운 메모(모양만)','a desk with stacked workbooks and a countdown note (shape only, no numbers)'),
]
CUT_INFO = {'CS_SCHOOL': ('초등학교 입학식', '8세 3월'), 'CS_PUBERTY': ('어느새 훌쩍', '12세 1월'), 'CS_MIDDLE': ('중학교 입학', '14세 3월'),
            'CS_GROWN': ('이제 거의 어른', '17세 1월'), 'CS_SENIOR': ('고3, 마지막 1년', '19세 3월')}
assert len(S) == 81, len(S)
missing = [k for k in events if k not in {x[0] for x in S}]
assert not missing, missing

STYLE = ("Cute 16-bit pixel art in the cozy style of Japanese management sim games (Kairosoft-like): crisp pixels, clean dark outlines, soft warm palette.\n"
         "LAYOUT: exactly 2 rows x 2 columns = 4 separate scene panels. Every panel is a WIDE 16:9 rectangle with a thin dark outline, "
         "separated by wide pure white (#FFFFFF) gaps; everything outside the panels is pure white. Image size 2752x1536.\n"
         "COMPOSITION: each panel is a still-life story scene that tells what happened through OBJECTS and the PLACE. "
         "Do NOT draw any full person or face. At most show hands, feet, a shadow or a silhouette, so the scene works for both a boy and a girl.\n"
         "NO text, NO letters, NO numbers, NO logos, NO watermark, NO signature.")
CHUNK = 4
sheets = [S[i:i + CHUNK] for i in range(0, len(S), CHUNK)]

F = 'Arial'
HDR = PatternFill('solid', fgColor='3B2414'); HF = Font(name=F, bold=True, color='FFFFFF', size=10)
B = Font(name=F, size=10); BB = Font(name=F, size=10, bold=True)
WRAP = Alignment(wrap_text=True, vertical='top'); CEN = Alignment(horizontal='center', vertical='top', wrap_text=True)
side = Side(style='thin', color='C8B8A0'); BOX = Border(left=side, right=side, top=side, bottom=side)
YEL = PatternFill('solid', fgColor='FFF59D')
CAT_FILL = {'유년기': 'FFF1D6', '청소년기': 'E3ECFA', '청년기': 'EDE3F7', '명절': 'FDE2E2', '부모 직업': 'E6F0DC', '집안 형편': 'F5EBDD',
            '다회차': 'FFF6D6', '단짝 친구': 'DFF3EE', '기억': 'F2EFE6', '반항기': 'F8DCDC', '첫사랑': 'FCE4F0', '진로': 'E0F2F7', '성장 컷신': 'E8F5E1'}

wb = Workbook()
ws0 = wb.active; ws0.title = '설명'
ws0.column_dimensions['A'].width = 3; ws0.column_dimensions['B'].width = 115
lines = [
 ('도트 드림 메이커 — 이벤트 장면 일러스트 요청서', 'title'), ('', None),
 ('무엇에 쓰나요?', 'h'),
 ('육아 상황(이벤트)이 생기면 뜨는 창의 위쪽에 지금은 도트 캐릭터만 서 있습니다. 여기에 그 상황을 보여 주는 장면 그림을 넣습니다.', None),
 ('성장 컷신(입학식·사춘기·중학교·어른·고3) 5편의 배경에도 같은 방식으로 씁니다.', None), ('', None),
 ('몇 장이 필요한가요?', 'h'),
 (f'장면 {len(S)}개 = 이벤트 76개 + 성장 컷신 5개. 한 장에 4장면(2×2)씩 → 총 {len(sheets)}장 요청 (마지막 장은 1장면).', None),
 ('[장면 목록] 탭에 장면마다 언제 나오는지(나이·상황), 한글 그림 설명, 들어갈 시트·칸이 있습니다.', None), ('', None),
 ('왜 사람이 없는 그림인가요? (중요)', 'h'),
 ('같은 이벤트라도 아이가 아들일 수도 딸일 수도 있고, 8살일 수도 15살일 수도 있습니다. 아이를 그리면 장면마다 2~6장이 필요합니다.', None),
 ('그래서 "깨진 꽃병과 굴러온 축구공", "이마 위 젖은 수건과 체온계"처럼 사물과 공간으로 상황을 보여 주는 구도로 요청합니다. 한 장으로 모든 아이에게 씁니다.', None),
 ('사람은 손·발·그림자·실루엣 정도만 나와도 괜찮습니다. 얼굴이 나오면 다시 생성하거나, 작게 나왔다면 그대로 보내 주세요.', None),
 ('게임에서는 이 그림 아래쪽에 지금처럼 우리 아이 도트 캐릭터가 함께 서서 반응합니다.', None), ('', None),
 ('요청하는 방법', 'h'),
 ('1. [요청 목록] 탭에서 한 줄씩 [프롬프트] 칸을 통째로 복사해 Gemini에 붙여 넣습니다. 첨부 이미지는 필요 없습니다.', None),
 ('2. 결과를 [장면 목록]과 비교해 4칸이 순서대로(위 왼쪽 → 위 오른쪽 → 아래 왼쪽 → 아래 오른쪽) 맞는지 확인합니다.', None),
 ('3. [저장 이름]으로 저장해 보내 주세요. 칸별로 잘라 이벤트 창에 넣습니다.', None),
 ('4. 다 된 줄은 [완료] 칸에 O. 순서는 자유지만 유년기(E01~E04)부터 하면 첫 판에서 바로 보입니다.', None), ('', None),
 ('자주 생기는 문제', 'h'),
 ('• 칸이 3개거나 5개 → 다시 생성. 한 칸만 이상하면 그대로 보내 주세요(그 장면만 다음에 다시 요청).', None),
 ('• 글자가 들어갔다 → 작은 글자는 지울 수 있으니 그대로 보내 주세요. 크게 들어갔으면 다시 생성.', None),
 ('• 오른쪽 아래 반짝이 워터마크 → 자동으로 지웁니다.', None),
 ('• 패널이 정사각형·세로로 나왔다 → 괜찮습니다. 가로로 긴 게 가장 좋지만 잘라서 씁니다.', None),
]
for i, (t, k) in enumerate(lines, 1):
    c = ws0.cell(row=i, column=2, value=t); c.alignment = WRAP
    c.font = Font(name=F, size=16, bold=True, color='3B2414') if k == 'title' else (Font(name=F, size=12, bold=True, color='8A5A35') if k == 'h' else B)
ws0.sheet_view.showGridLines = False

ws = wb.create_sheet('요청 목록')
ws['A1'] = f'이벤트 장면 요청 목록 ({len(sheets)}장 · {len(S)}장면)'; ws['A1'].font = Font(name=F, size=14, bold=True, color='3B2414')
ws['A2'] = '진행률'; ws['A2'].font = BB
TOP = 4
heads = [('순서', 6), ('시트', 8), ('저장 이름', 18), ('분류', 14), ('들어갈 장면 4개', 52), ('프롬프트 (그대로 복사)', 95), ('완료', 7)]
for j, (h, w) in enumerate(heads, 1):
    c = ws.cell(row=TOP, column=j, value=h); c.font, c.fill, c.border = HF, HDR, BOX
    c.alignment = Alignment(horizontal='center', vertical='center'); ws.column_dimensions[chr(64 + j)].width = w
dv = DataValidation(type='list', formula1='"O,X"', allow_blank=True); ws.add_data_validation(dv)
POS = ['① 위 왼쪽', '② 위 오른쪽', '③ 아래 왼쪽', '④ 아래 오른쪽']
for i, chunk in enumerate(sheets, 1):
    r = TOP + i; sid = f'E{i:02d}'
    def title_of(x):
        return events[x[0]]['title'] if x[0] in events else CUT_INFO[x[0]][0]
    cats = ' · '.join(dict.fromkeys(x[1] for x in chunk))
    scenes = '\n'.join(f'{POS[k]} [{title_of(x)}] {x[2]}' for k, x in enumerate(chunk))
    n = len(chunk)
    style = STYLE if n == 4 else STYLE.replace('exactly 2 rows x 2 columns = 4 separate scene panels', 'exactly 1 scene panel in the center')
    prompt = (f"Create a pixel art EVENT SCENE sheet for a cozy child-raising sim game ({n} scenes).\n" + style + '\n'
              + '\n'.join(f"Panel {k + 1} ({['top-left', 'top-right', 'bottom-left', 'bottom-right'][k] if n == 4 else 'center'}): {x[3]}." for k, x in enumerate(chunk)))
    vals = [i, sid, f'event-{sid.lower()}.png', cats, scenes, prompt, None]
    for j, v in enumerate(vals, 1):
        c = ws.cell(row=r, column=j, value=v); c.font = BB if j in (2, 3) else B
        c.border, c.alignment = BOX, (CEN if j in (1, 2) else WRAP)
        if j <= 5: c.fill = PatternFill('solid', fgColor=CAT_FILL.get(chunk[0][1], 'FFFFFF'))
    ws.cell(row=r, column=7).fill = YEL; dv.add(ws.cell(row=r, column=7))
    ws.row_dimensions[r].height = 230
last = TOP + len(sheets)
ws['B2'] = f'=COUNTIF(G{TOP + 1}:G{last},"O")&" / {len(sheets)} 완료"'; ws['B2'].font = BB
ws.freeze_panes = ws.cell(row=TOP + 1, column=3)

ws2 = wb.create_sheet('장면 목록')
ws2['A1'] = f'장면 {len(S)}개 — 이벤트가 언제 나오고 어떤 그림이 필요한지'; ws2['A1'].font = Font(name=F, size=12, bold=True, color='3B2414')
h2 = [('시트', 7), ('칸', 12), ('분류', 11), ('이벤트 이름', 22), ('나오는 때', 12), ('게임 속 상황 (이벤트 문장)', 50), ('그림 설명', 55), ('이벤트 ID', 17)]
for j, (h, w) in enumerate(h2, 1):
    c = ws2.cell(row=3, column=j, value=h); c.font, c.fill, c.border = HF, HDR, BOX; ws2.column_dimensions[chr(64 + j)].width = w
r = 4
for i, chunk in enumerate(sheets, 1):
    for k, x in enumerate(chunk):
        e = events.get(x[0])
        if e:
            name, when, text = e['title'], f"{e['age'].replace('-', '~')}세", e['text']
        else:
            name, when = CUT_INFO[x[0]]; text = '성장 컷신 (화면을 누르며 넘기는 장면)'
        if text == '(동적)': text = '(앞 단계 선택에 따라 문장이 달라짐)'
        for j, v in enumerate([f'E{i:02d}', POS[k] if len(chunk) == 4 else '가운데', x[1], name, when, text, x[2], x[0]], 1):
            c = ws2.cell(row=r, column=j, value=v); c.font, c.border, c.alignment = B, BOX, WRAP
            c.fill = PatternFill('solid', fgColor=CAT_FILL.get(x[1], 'FFFFFF'))
        r += 1
ws2.freeze_panes = 'A4'; ws2.auto_filter.ref = f'A3:H{r - 1}'
wb.save('docs/event_scene_requests.xlsx')
print('docs/event_scene_requests.xlsx', len(sheets), 'sheets', len(S), 'scenes')
