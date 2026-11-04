from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

# 실행: python3 scripts/make-sprite-requests.py (저장 후 LibreOffice로 재계산하면 진행률 수식 값이 채워짐)
OUT = 'docs/sprite_requests.xlsx'
F = 'Arial'
HDR_FILL = PatternFill('solid', fgColor='3B2414')
HDR_FONT = Font(name=F, bold=True, color='FFFFFF', size=10)
BODY = Font(name=F, size=10)
BOLD = Font(name=F, size=10, bold=True)
WRAP = Alignment(wrap_text=True, vertical='top')
CENTER = Alignment(horizontal='center', vertical='top', wrap_text=True)
thin = Side(style='thin', color='C8B8A0')
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
INPUT_FILL = PatternFill('solid', fgColor='FFF59D')
PRI_FILL = {1: 'FFD6D6', 2: 'FFE8C8', 3: 'FFF6D6', 4: 'E6F0DC', 5: 'DCEBF7', 6: 'EDE3F7', 7: 'FDE2F0'}

STYLE = ("Cute 16-bit pixel art with an original, cozy look of its own (do not imitate any specific existing game, studio, character or logo). "
         "Clean dark outlines, soft warm palette, crisp pixels with no anti-aliasing blur, no dithering noise. "
         "Pure solid white (#FFFFFF) background. No floor, no cast shadows, no text, no labels, no numbers, no watermark, no signature. "
         "Every sprite is fully separated from the others with large even gaps (at least half a sprite width); nothing overlaps or touches. "
         "Exactly the requested number of sprites in exactly the requested rows and columns: no duplicates, no extra objects, no empty cells. "
         "Leave the bottom-right corner of the image empty. Image size 2752x1536 (16:9).")
CHAR_REF = ("Attach reference-son.png / reference-daughter.png and use it as the exact reference: keep the same characters, faces, hairstyles, outfits, "
            "pixel size, outline thickness and colors. Characters face 3/4 toward the viewer, turned slightly to the right.")
LOOK = {
    'SON': ("Character design (must match): a cheerful boy with fluffy messy brown hair and big brown eyes. "
            "Child (row 1): white T-shirt, blue shorts, white and blue sneakers. "
            "Teen (row 2): spiky brown hair, slate-blue hoodie with white drawstrings, dark brown pants, gray sneakers. "
            "Young adult (row 3): side-swept brown hair, olive-brown jacket over a white T-shirt, blue jeans, dark sneakers."),
    'DAUGHTER': ("Character design (must match): a cheerful girl with brown hair and big brown eyes, rosy cheeks. "
                 "Child (row 1): brown pigtails with red ribbon bows, pink dress with white puff sleeves and a red bow, white socks, red shoes. "
                 "Teen (row 2): long straight brown hair with bangs, sailor school uniform (white top, navy collar, red ribbon tie, navy pleated skirt), navy knee socks, brown loafers. "
                 "Young adult (row 3): long wavy brown hair, teal eyes, gray cardigan over a black crop top, khaki pants, black flats."),
}
YOUTH_LOOK = {
    'SON': 'Base look: side-swept brown hair, big brown eyes, cheerful young man (age 19).',
    'DAUGHTER': 'Base look: long wavy brown hair, teal eyes, rosy cheeks, cheerful young woman (age 19).',
}
PARENT_LOOK = ("The mother has a short brown bob, gentle closed smiling eyes, a beige knit turtleneck sweater and brown pants. "
               "The cat is a chubby orange and white cat.")
ISO = ("Isometric 2:1 angle (like a cozy isometric room game). Each object stands on one invisible floor tile "
       "with its front facing the lower-left of the image. Draw objects at a consistent scale: a desk reaches the waist "
       "of a child character, a bed is one tile long.")

# ── 시트 정의: (순위, 시트ID, 저장 파일명, 행, 열, 설명, [(행,열,게임ID,이름,설명,칸수,필수여부)], 프롬프트 본문)
sheets = []
def grid(rows):
    out = []
    for r, row in enumerate(rows, 1):
        for c, item in enumerate(row, 1):
            if item is None: continue
            out.append((r, c) + item)
    return out

# 가구
F1 = [[('oak_desk','원목 책상','서랍 달린 나무 책상',1),('encyclopedia_shelf','백과사전 책장','알록달록한 책이 가득 꽂힌 키 큰 책장',1),('led_lamp','LED 스탠드','노란 불빛이 켜진 플로어 스탠드',1),('globe','지구본','작은 나무 받침대 위의 지구본',1)],
      [('anatomy_model','해부학 모형','받침대 위 인체 반쪽 해부 모형',1),('microscope_table','현미경 테이블','현미경이 올려진 하얀 실험 탁자',1),('medical_shelf','의학서적 책장','흰색·초록 의학책이 꽂힌 책장',1),('telescope','천체 망원경','삼각대 위 큰 천체 망원경',1)],
      [('planet_model','행성 모형','토성 고리가 있는 행성 모빌/모형',1),('zero_g_bed','무중력 캡슐 침대','하늘색으로 빛나는 우주선풍 캡슐 침대',1),('whiteboard','화이트보드','다리 달린 화이트보드, 색색 메모',1),('newspaper_stand','경제 신문 거치대','경제 신문이 걸린 나무 거치대',1)]]
F2 = [[('gaming_pc','고성능 게이밍 PC','책상 위 모니터+키보드+RGB 본체',1),('dual_monitor','듀얼 모니터','모니터 두 대가 놓인 책상',1),('stock_monitor','주식 모니터','초록·빨강 차트가 뜬 모니터 책상',1),('grand_piano','그랜드 피아노','검은 그랜드 피아노+빨간 의자 (가로 2칸)',2)],
      [('condenser_mic','콘덴서 마이크','스탠드에 꽂힌 방송용 마이크',1),('sound_booth','방음 부스','창이 달린 작은 보라색 방음 부스',1),('easel','이젤 캔버스','그림이 그려진 캔버스가 올려진 이젤',1),('plaster_bust','석고상','받침대 위 하얀 석고 흉상',1)],
      [('watercolor_kit','수채화 도구함','작은 탁자 위 물감 팔레트와 붓통',1),('ring_light','링라이트','스탠드에 달린 둥근 LED 조명',1),('broadcast_cam','방송용 카메라','삼각대 위 캠코더',1),('chroma_key','크로마키 배경','초록색 스크린 패널',1)]]
F3 = [[('treadmill','런닝머신','회색 러닝머신',1),('dumbbell_rack','덤벨 랙','덤벨이 놓인 거치대',1),('full_mirror','전신 거울','나무 틀의 세워진 전신 거울',1),('mini_oven','미니 오븐','작은 받침 위 오렌지 불빛 오븐',1)],
      [('kitchen_counter','조리대','싱크대·가스레인지가 있는 흰 조리대 (가로 2칸)',2),('spice_rack','향신료 선반','양념병이 놓인 작은 선반',1),('basic_bed','낡은 침대','소박한 나무 싱글 침대, 분홍 이불',1),('fluffy_bed','푹신한 침대','두툼한 분홍 이불과 베개의 침대',1)],
      [('aroma_diffuser','아로마 디퓨저','작은 탁자 위 연기 나는 디퓨저',1),('cat_cushion','반려묘 쿠션','둥근 분홍 고양이 방석',1),('world_clock','세계 시계','나무 괘종시계',1),('plant','몬스테라 화분','토분에 심은 몬스테라',1)]]
F4 = [[('toy_box','장난감 상자','곰인형이 삐져나온 분홍 상자',1),('treasure_chest','고대 보물상자','금장식 빨간 보물상자',1),('wooden_sword_rack','목검 거치대','목검 두 자루가 걸린 거치대',1),('magic_rug','마법진 러그','바닥에 깔린 보라색 마법진 러그',1)]]

def furn_prompt(rows, title):
    lines = []
    for r, row in enumerate(rows, 1):
        lines.append(f"Row {r} (left to right): " + ', '.join(f"{c}) {it[2]}" for c, it in enumerate(row, 1)))
    return lines

furniture_sheets = [('F1','공부·과학 가구',F1),('F2','IT·음악·미술·방송 가구',F2),('F3','운동·주방·휴식 가구',F3),('F4','장식·모험 가구',F4)]
EN_FURN = {
 'oak_desk':'a wooden study desk with drawers','encyclopedia_shelf':'a tall bookshelf packed with colorful books','led_lamp':'a floor lamp glowing warm yellow','globe':'a globe on a small wooden stand',
 'anatomy_model':'a half-body anatomy model on a stand','microscope_table':'a white lab table with a microscope','medical_shelf':'a bookshelf with white and green medical books','telescope':'a large astronomy telescope on a tripod',
 'planet_model':'a Saturn planet model on a stand','zero_g_bed':'a futuristic glowing light-blue capsule bed','whiteboard':'a whiteboard on legs with colorful notes','newspaper_stand':'a wooden newspaper rack with financial newspapers',
 'gaming_pc':'a desk with a gaming monitor, keyboard and RGB PC tower','dual_monitor':'a desk with two monitors','stock_monitor':'a desk with a monitor showing green and red stock charts','grand_piano':'a black grand piano with a red bench (2 tiles wide)',
 'condenser_mic':'a studio condenser microphone on a stand','sound_booth':'a small purple soundproof booth with a window','easel':'an easel holding a painted canvas','plaster_bust':'a white plaster bust on a pedestal',
 'watercolor_kit':'a small table with a watercolor palette and brush cup','ring_light':'a round LED ring light on a stand','broadcast_cam':'a camcorder on a tripod','chroma_key':'a green chroma key screen panel',
 'treadmill':'a gray treadmill','dumbbell_rack':'a dumbbell rack with dumbbells','full_mirror':'a standing full-length mirror with a wooden frame','mini_oven':'a small oven glowing orange on a low stand',
 'kitchen_counter':'a white kitchen counter with sink and stove (2 tiles wide)','spice_rack':'a small spice rack with jars','basic_bed':'a simple wooden single bed with a pink blanket','fluffy_bed':'a fluffy bed with a thick pink comforter and pillows',
 'aroma_diffuser':'an aroma diffuser with soft steam on a small table','cat_cushion':'a round pink cat cushion','world_clock':'a wooden grandfather clock','plant':'a monstera plant in a terracotta pot',
 'toy_box':'a pink toy box with a teddy bear peeking out','treasure_chest':'a red treasure chest with gold trim','wooden_sword_rack':'a rack holding two wooden swords','magic_rug':'a purple rug with a magic circle pattern, lying flat on the floor'}
for sid, title, rows in furniture_sheets:
    items = grid([[ (f'{x[0]}', x[1], x[2], f'{x[3]}칸', '필수') for x in row] for row in rows])
    lines = []
    for r, row in enumerate(rows, 1):
        lines.append(f"Row {r}, left to right: " + '; '.join(f"({c}) {EN_FURN[it[0]]}" for c, it in enumerate(row, 1)) + '.')
    n_cols = max(len(r) for r in rows)
    prompt = (f"Create a pixel art furniture sprite sheet: {len(rows)} rows x {n_cols} columns, {sum(len(r) for r in rows)} separate objects.\n"
              + ISO + '\n' + '\n'.join(lines) + '\n' + STYLE)
    sheets.append((1, sid, f'furniture-{sid.lower()}.png', len(rows), n_cols, title, items, prompt, False))

# 행동 포즈 (아들/딸)
POSES = [('desk','책상 공부','의자에 앉아 책상에서 글씨 쓰기 (뒤에서 비스듬히)','sitting on a chair writing at a desk, seen from behind at an angle','필수'),
         ('exercise','운동','달리기 또는 덤벨 들기','exercising (jogging in place or lifting a dumbbell)','필수'),
         ('draw','그림 그리기','붓과 팔레트를 들고 그리기','painting with a brush and palette','필수'),
         ('music','노래·연주','마이크 들고 노래 또는 건반 연주','singing into a microphone','필수'),
         ('pc','컴퓨터','의자에 앉아 키보드 치기','sitting and typing on a laptop keyboard','필수'),
         ('work','알바','앞치마 차림으로 상자 들기','wearing an apron and carrying a cardboard box','필수'),
         ('sleep','잠자기','옆으로 누워 자기','lying down asleep','선택'),
         ('tired','지침','아프거나 지친 표정, 어깨 축 처짐','looking tired and sick, shoulders slumped','선택')]
STAGES = [('CHILD','유년(8~11세)'),('TEEN','청소년(12~16세)'),('YOUTH','청년(17~19세)')]
GEN = [('SON','아들','boy'),('DAUGHTER','딸','girl')]
for g, gk, gen_en in GEN:
    items = []
    for r,(st,stk) in enumerate(STAGES,1):
        for c,(pk,pn,pd,_,req) in enumerate(POSES,1):
            items.append((r,c,f'{st}_{g}_{pk}',f'{stk} {gk} · {pn}',pd,'-',req))
    prompt = (f"Create a pixel art action pose sprite sheet of the {gen_en} character: 3 rows x 8 columns.\n" + CHAR_REF + '\n' + LOOK[g] + '\n'
              "Row 1 = child (age 8-11, first row of the reference), Row 2 = teenager (age 12-16, school uniform/hoodie), Row 3 = young adult (age 17-19).\n"
              "Columns, left to right, the same in every row: " + '; '.join(f"({i}) {p[3]}" for i,p in enumerate(POSES,1)) + '.\n' + STYLE)
    sheets.append((2, f'P-{g}', f'{g.lower()}-pose-sheet.png', 3, 8, f'{gk} 행동 포즈', items, prompt, False))

# 뒷모습 걷기
BACK = [('back_stand','뒷모습 서기','등을 보이고 서 있기','standing, seen from behind'),
        ('back_walkA','뒷모습 걷기 A','왼발 내딛기','walking away from the viewer, left foot forward'),
        ('back_walkB','뒷모습 걷기 B','다리 모음 (교차)','walking away, legs passing together'),
        ('back_walkC','뒷모습 걷기 C','오른발 내딛기','walking away, right foot forward')]
for g, gk, gen_en in GEN:
    items = []
    for r,(st,stk) in enumerate(STAGES,1):
        for c,(bk,bn,bd,_) in enumerate(BACK,1):
            items.append((r,c,f'{st}_{g}_{bk}',f'{stk} {gk} · {bn}',bd,'-','필수'))
    prompt = (f"Create a pixel art back-view walking sprite sheet of the {gen_en} character: 3 rows x 4 columns.\n" + CHAR_REF.replace('Characters face 3/4 toward the viewer, turned slightly to the right.','Characters are seen from behind (3/4 back view, walking away toward the upper-left).') + '\n' + LOOK[g] + '\n'
              "Row 1 = child, Row 2 = teenager, Row 3 = young adult (same outfits as the reference).\n"
              "Columns, left to right: " + '; '.join(f"({i}) {b[3]}" for i,b in enumerate(BACK,1)) + '.\n' + STYLE)
    sheets.append((3, f'B-{g}', f'{g.lower()}-back-walk-sheet.png', 3, 4, f'{gk} 뒷모습 걷기', items, prompt, False))

# 부모님
PAR = [('stand','서기','기본 서기','standing'),('walkA','걷기 A','왼발 내딛기','walking, left foot forward'),('walkB','걷기 B','다리 모음','walking, legs passing together'),
       ('walkC','걷기 C','오른발 내딛기','walking, right foot forward'),('talk','대화','손짓하며 말하기','talking with a hand gesture'),('heart','칭찬','하트 띄우며 웃기','smiling with a small heart above'),('clap','박수','기뻐하며 박수','clapping happily')]
items = [(1,c,f'PARENT_{k}',f'엄마 · {n}',d,'-','필수') for c,(k,n,d,_) in enumerate(PAR,1)]
items += [(2,c,f'FATHER_{k}',f'아빠 · {n}',d,'-','선택') for c,(k,n,d,_) in enumerate(PAR,1)]
prompt = ("Create a pixel art parent NPC sprite sheet: 2 rows x 7 columns.\n"
          "Attach reference-parent-cat.png. Row 1 = the mother from the reference, keep her exactly the same. " + PARENT_LOOK + " "
          "Row 2 = a matching father character in the same style (friendly dad, short brown hair, cardigan).\n"
          "Columns, left to right, same in both rows: " + '; '.join(f"({i}) {p[3]}" for i,p in enumerate(PAR,1)) + '.\n'
          "Characters face 3/4 toward the viewer, turned slightly to the right.\n" + STYLE)
sheets.append((4, 'N1', 'parents-sheet.png', 2, 7, '부모님 (엄마 + 아빠)', items, prompt, False))

CAT = [('sit','앉기','앉아서 바라보기','sitting'),('walkA','걷기 A','걷기 1','walking, frame 1'),('walkB','걷기 B','걷기 2','walking, frame 2'),
       ('stretch','기지개','앞발 쭉 펴기','stretching'),('groom','그루밍','앞발 핥기','grooming its paw'),('loaf','식빵 자세','웅크리고 앉기','loaf pose')]
items = [(1,c,f'CAT_{k}',f'반려묘 · {n}',d,'-','필수') for c,(k,n,d,_) in enumerate(CAT,1)]
prompt = ("Create a pixel art cat sprite sheet: 1 row x 6 columns. The cat is the orange and white cat from the attached reference (the sleeping cat); keep the same colors and size.\n"
          "Left to right: " + '; '.join(f"({i}) {p[3]}" for i,p in enumerate(CAT,1)) + '. The cat faces slightly to the right.\n' + STYLE)
sheets.append((4, 'N2', 'cat-sheet.png', 1, 6, '반려묘', items, prompt, False))

# UI 아이콘
ICONS = [
 [('ICON_INT','지력','뇌','a pink brain'),('ICON_STR','체력','근육 팔','a flexed arm'),('ICON_ART','감성','팔레트','a paint palette'),('ICON_CHA','매력','하트','a red heart'),('ICON_MOR','도덕','저울','balance scales'),('ICON_TEC','기술','공구','a wrench and hammer'),('ICON_GOLD','골드','금화 G','a gold coin with the letter G'),('ICON_IDEA','영감','전구','a glowing light bulb')],
 [('ICON_APT_MED','의학','청진기','a stethoscope'),('ICON_APT_LAW','법률','법봉','a judge gavel'),('ICON_APT_IT','IT','노트북','a laptop'),('ICON_APT_ENT','예술','클래퍼보드','a movie clapperboard'),('ICON_APT_BIZ','경영','상승 그래프','a rising chart'),('ICON_APT_ADV','모험','검','a sword'),('ICON_STRESS','스트레스','찡그린 얼굴','a stressed face'),('ICON_FAME','명성','별','a yellow star')],
 [('ICON_NAV_SCHEDULE','스케줄','달력','a calendar'),('ICON_NAV_ROOM','방꾸미기','소파와 망치','a sofa with a hammer'),('ICON_NAV_OUTING','외출','운동화','red sneakers'),('ICON_NAV_BOOK','엔딩도감','왕관 책','a book with a crown'),('ICON_NAV_INFO','내 아이','물음표 책','a book with a question mark'),('ICON_HOME','타이틀','집','a small house'),('ICON_SOUND_ON','소리 켜기','스피커','a speaker with sound waves'),('ICON_SOUND_OFF','소리 끄기','음소거 스피커','a muted speaker')],
 [('ICON_SPRING','봄','벚꽃','a cherry blossom'),('ICON_SUMMER','여름','해','a sun'),('ICON_AUTUMN','가을','단풍잎','a maple leaf'),('ICON_WINTER','겨울','눈결정','a snowflake'),('ICON_TROPHY','트로피','트로피','a gold trophy'),('ICON_MEDAL','메달','메달','a medal'),('ICON_STORAGE','창고','상자','a cardboard box'),('ICON_SPARKLE','반짝이','반짝이','a sparkle')]]
items = []
for r,row in enumerate(ICONS,1):
    for c,(k,n,d,_) in enumerate(row,1):
        items.append((r,c,k,n,d,'-','필수'))
prompt = ("Create a pixel art UI icon sheet: 4 rows x 8 columns, 32 square icons, each about the same size, bold and readable at small size.\n"
          + '\n'.join(f"Row {r}, left to right: " + '; '.join(f"({c}) {it[3]}" for c,it in enumerate(row,1)) + '.' for r,row in enumerate(ICONS,1)) + '\n' + STYLE)
sheets.append((5, 'U1', 'ui-icons.png', 4, 8, 'UI 아이콘', items, prompt, False))

# 직업 의상
JOBS = [('01','천재 외과의사','surgeon in scrubs and cap'),('02','대법관 (판사)','supreme court judge in black robe with gavel'),('03','에이스 변호사','lawyer in a suit pointing "objection"'),('04','노벨상 과학자','scientist in lab coat holding a medal'),('05','수의사','veterinarian holding a puppy'),('06','약사','pharmacist in white gown with medicine'),('07','대학교수','professor with glasses and a book'),('08','베스트셀러 작가','novelist holding a fountain pen and book'),('09','심리상담사','counselor with a clipboard, gentle smile'),
        ('10','초등학교 교사','elementary teacher with an apple and pointer'),('11','전설의 게임 개발자','game developer holding a golden trophy'),('12','AI 로봇공학자','robotics engineer with a small robot'),('13','화이트 해커','white-hat hacker with headset and laptop'),('14','우주비행사','astronaut in a spacesuit holding the helmet'),('15','건축가','architect with a hard hat and blueprint'),('16','풀스택 웹 개발자','developer with a hoodie and coffee mug'),('17','프로게이머','esports pro in team jersey with headset'),('18','글로벌 팝 아이돌','pop idol in a sparkling stage outfit with mic'),
        ('19','칸 영화제 명감독','film director with beret and megaphone'),('20','인기 웹툰 작가','webtoon artist with a drawing tablet'),('21','세계적 피아니스트','pianist in a tailcoat/gown bowing'),('22','천만 영화배우','movie star in sunglasses on a red carpet pose'),('23','메가 인플루언서','influencer holding a gold play button'),('24','패션 디자이너','fashion designer with measuring tape'),('25','메인 뉴스 아나운서','news anchor in a suit holding papers'),('26','거리의 인디 뮤지션','street musician with an acoustic guitar'),('27','글로벌 유니콘 CEO','CEO in a sharp suit with a briefcase'),
        ('28','미슐랭 3스타 셰프','chef in white uniform and tall hat'),('29','월스트리트 펀드매니저','fund manager in a vest with a tablet'),('30','외교관','diplomat in a formal suit with a flag pin'),('31','파티시에','pastry chef holding a cake'),('32','플로리스트','florist holding a bouquet'),('33','호텔 지배인','hotel manager in a uniform with a bell'),('34','대기업 사원','new office worker with an ID badge'),('35','올림픽 금메달리스트','athlete in tracksuit biting a gold medal'),('36','프로 스포츠 슈퍼스타','pro athlete in a team uniform with a ball'),
        ('37','특수부대 장교','special forces officer in uniform saluting'),('38','열혈 형사','detective in a trench coat with a badge'),('39','119 구조대원','firefighter in gear with a helmet'),('40','항공기 기장','airline pilot in uniform with sunglasses'),('41','전설의 용사','legendary hero with a holy sword and armor'),('42','마법소녀 / 대마법사','magical girl / wizard with a star wand'),('43','왕실 공주 / 왕자 배우자','royal princess / prince in a gown or royal suit with crown'),('44','도트 드림 마스코트','wearing a fluffy orange-and-white cat mascot costume (like the family cat) with the hood down, holding a golden sketchbook'),('45','고고학자','archaeologist with fedora and whip'),
        ('46','미스터리 탐정','detective with deerstalker hat and magnifying glass'),('47','세기의 괴도','phantom thief with a cape, mask and a jewel'),('48','지하세계 보스','mafia boss in a black suit and fedora'),('49','자유로운 세계여행가','traveler with a big backpack and map'),('50','방구석 한량 (백수)','lazy young adult in pajamas holding popcorn')]
for g, gk, gen_en in GEN:
    for s in range(6):
        chunk = [j for j in JOBS[s*9:(s+1)*9] if j[0] != '44']  # 44번 엔딩 삭제 (v0.29.4)
        rows = (len(chunk)+2)//3
        items = []
        for i,(num,name,en) in enumerate(chunk):
            items.append((i//3+1, i%3+1, f'JOB_END_{num}_{g}', f'END_{num} {name} ({gk})', en, '-', '선택'))
        prompt = (f"Create a pixel art sprite sheet of the young adult {gen_en} character (age 19, third row of the attached reference) dressed for different careers: "
                  f"{rows} rows x 3 columns, {len(chunk)} full-body sprites in a proud pose.\n" + CHAR_REF + '\n' + YOUTH_LOOK[g] + '\n'
                  + '\n'.join(f"Row {r+1}, left to right: " + '; '.join(f"({c+1}) {chunk[r*3+c][2]}" for c in range(3) if r*3+c < len(chunk)) + '.' for r in range(rows)) + '\n' + STYLE)
        sheets.append((6, f'J{s+1}-{g}', f'job-{g.lower()}-{s+1}.png', rows, 3, f'직업 의상 {gk} {s*9+1}~{s*9+len(chunk)}번', items, prompt, False))

# ── 7순위: 스케줄 연출 (v0.19) ──────────────────────────────
# 장소 배경: 세로 3:4 패널 4장씩. 칠판·화면 글씨와 아이 캐릭터는 게임이 위에 그리므로 비워 둔다.
BG_STYLE = ("Cute 16-bit pixel art with an original, cozy look of its own (do not imitate any specific existing game, studio, character or logo): crisp pixels, no blur, "
            "clean dark outlines, soft warm palette.\n"
            "LAYOUT: exactly 2 rows x 2 columns = 4 separate scene panels. Every panel is a PORTRAIT rectangle with a 3:4 ratio "
            "(taller than wide) and a thin dark outline. Panels are separated by wide pure white (#FFFFFF) gaps, and the whole "
            "image background around the panels is pure white. Image size 2048x2048.\n"
            "VIEW: flat side view like a 2D stage set (NOT isometric), camera at a child's eye level. The bottom 30% of every panel "
            "is floor or ground. Keep the CENTER-BOTTOM third of every panel EMPTY (just floor) because a game character will be "
            "drawn standing there. Put props on the left and right sides and on the back wall.\n"
            "NO people, NO characters, NO text, NO letters, NO numbers, NO logos, NO watermark, NO signature. "
            "Blackboards, screens and signs must be BLANK (the game writes on them).")
BGS = [
 ('S1', '학원 ①', [
   ('BG_EDU_01', '종합 보습학원 교실', '칠판 교실, 나무 책걸상, 벽시계', 'a cozy after-school academy classroom: a large BLANK dark-green blackboard on the back wall, two small wooden student desks with chairs on the left and right, a round wall clock, warm daylight from a window'),
   ('BG_EDU_02', '영재 과학·의학 학원', '실험실, 현미경, 비커', 'a bright science lab classroom: white lab benches on both sides with a microscope, colorful beakers and test tubes, a DNA poster (no text), light-blue walls'),
   ('BG_EDU_03', '논술반 교실', '토론 교실, 단상, 책장', 'a calm debate classroom: a small wooden podium on the right, bookshelves with old books on the left, a BLANK cream-colored whiteboard on the back wall, beige walls'),
   ('BG_EDU_04', '코딩 부트캠프', '어두운 코딩실, 모니터', 'a dark coding lab at night: desks with glowing monitors on both sides, a large BLANK dark screen on the back wall, cables and a game controller, navy and purple tones with screen glow')]),
 ('S2', '학원 ②', [
   ('BG_EDU_05', '실용음악·댄스 아카데미', '보라 무대, 조명, 피아노', 'a music and dance practice stage: purple walls, a spotlight cone from the ceiling onto the empty center, a digital piano on the left, a microphone stand on the right, a wall mirror'),
   ('BG_EDU_06', '미술·웹툰 화실', '화실, 이젤, 물감', 'a warm art studio: an easel with a blank canvas on the left, a table with paint jars and brushes on the right, framed paintings on the wall (abstract, no text), paint stains on the wooden floor'),
   ('BG_EDU_07', '체육·무술 도장', '도장 매트, 도복 걸이', 'a martial arts dojo: green and red floor mats, a rack with hanging white uniforms on the left, a punching bag on the right, a wooden wall with a medal shelf'),
   ('BG_EDU_08', '경제·리더십 스쿨', '회의실, 그래프 보드', 'a kids business school meeting room: a long table on the left, an easel with a rising bar chart (no numbers) on the right, a BLANK whiteboard on the back wall, light-blue walls')]),
 ('S3', '아르바이트 ①', [
   ('BG_JOB_01', '집 대청소', '거실, 빨래 바구니, 양동이', 'a cozy family living room during cleaning day: a laundry basket on the left, a bucket and mop on the right, a sofa against the back wall, sunlight through curtains, wooden floor'),
   ('BG_JOB_02', '동네 베이커리', '빵 진열대, 오븐', 'a small neighborhood bakery: a glass display case full of bread and croissants on the left, a brick oven glowing orange on the right, shelves of baguettes on the back wall, warm cream tones'),
   ('BG_JOB_03', '도서관', '높은 책장, 대출 데스크', 'a quiet library: tall bookshelves full of colorful books on both sides, a wooden return cart, a potted plant, soft light from tall windows'),
   ('BG_JOB_04', '동물병원', '진료대, 케이지', 'a friendly animal clinic: a white exam table on the left, animal cages with a sleepy puppy and kitten on the right, a medicine shelf, mint-green walls')]),
 ('S4', '아르바이트 ②', [
   ('BG_JOB_05', '인디게임 회사', '어두운 사무실, 모니터', 'an indie game studio office at night: desks with monitors and game controllers on both sides, a BLANK big screen on the back wall, coffee cups, sticky notes (blank), purple and navy tones'),
   ('BG_JOB_06', '저녁 거리 버스킹', '밤 거리, 가로등', 'a lively city street at dusk: shop fronts with warm lights on both sides, a street lamp, a small amplifier on the left, an open guitar case on the ground on the right, purple evening sky'),
   ('BG_JOB_07', '법률사무소', '서류 캐비닛, 책상', 'a tidy law office: filing cabinets and stacks of folders on the left, a wooden desk with a balance-scale statue on the right, bookshelves of thick law books, beige walls'),
   ('BG_JOB_08', '밤거리 골목', '어두운 골목, 상자', 'a dim back alley at night: brick walls, cardboard boxes and a delivery crate on the left, a construction barrier on the right, a single flickering street light, dark blue tones')]),
 ('S5', '휴식·외출 ①', [
   ('BG_REST_01', '방에서 휴식', '아늑한 방, 침대, TV', 'a cozy kid bedroom for relaxing: a bed with a pink blanket on the left, a small TV on a low cabinet on the right, cushions and snacks on the floor, warm afternoon light'),
   ('BG_REST_02', '가족 캠핑', '밤 숲, 텐트, 모닥불', 'a family campsite at night: a tent on the left, a crackling campfire on the right, pine trees, a starry sky with a crescent moon, grassy ground'),
   ('BG_OUT_SHOP', '백화점', '옷 진열대, 쇼윈도', 'a bright department store floor: clothing racks with colorful clothes on the left, a shoe display and a standing mirror on the right, shopping bags, pink and white tones'),
   ('BG_OUT_BOOK', '동네 서점', '책 진열대, 카페 테이블', 'a warm neighborhood bookstore: wooden bookshelves on both sides, a table of new books, a small coffee cup on a reading table, hanging lamps')]),
 ('S6', '휴식·외출 ②', [
   ('BG_OUT_SCI', '과학관', '공룡 화석, 행성 모형', 'a science museum hall: a big dinosaur skeleton on the left, a large telescope on the right, planets hanging from the dark-blue starry ceiling, a small rocket model'),
   ('BG_OUT_ARCADE', '오락실', '오락기, 네온', 'a retro arcade: rows of colorful arcade cabinets with BLANK glowing screens on both sides, neon lights on the dark purple walls, a claw machine'),
   ('BG_OUT_RUINS', '고대 유적', '석상, 기둥, 사막', 'ancient ruins in the desert: a giant stone head statue on the left, broken stone pillars and a temple gate on the right, cactus, a bright sun in an orange sky, sandy ground'),
   ('BG_OUT_ALLEY', '뒷골목', '낙서 벽, 쓰레기통', 'a gloomy back street: a brick wall with colorful graffiti shapes (no letters), trash bins on the right, puddles, a moon in the dark sky')]),
 ('S7', '가출·대회', [
   ('BG_RUNAWAY', '가출 (비 오는 정류장)', '비 오는 밤 버스 정류장', 'a lonely bus stop on a rainy night: a bus shelter with a bench on the right, rain falling, puddles reflecting a street light, dark blue-gray tones'),
   ('BG_CONTEST_SPORTS', '체육대회 운동장', '운동장, 만국기, 관중석', 'a school sports field on sports day: a running track, colorful pennant flags strung overhead, bleachers with a crowd silhouette in the distance, blue sky'),
   ('BG_CONTEST_ARTFEST', '예술제 강당 무대', '강당 무대, 붉은 커튼', 'a school auditorium stage: heavy red curtains on both sides, warm stage lights, a wooden stage floor, dark audience seats in the front'),
   ('BG_CONTEST_EXAM', '기말시험 교실', '시험 교실, 책상 줄', 'a classroom during a final exam: rows of student desks with answer sheets (blank), a BLANK blackboard, a wall clock, quiet afternoon light')]),
]
BG_EN = {'S1': 'academies 1', 'S2': 'academies 2', 'S3': 'part-time jobs 1', 'S4': 'part-time jobs 2', 'S5': 'rest and outings 1', 'S6': 'rest and outings 2', 'S7': 'runaway night and school contests'}
for sid, title, cells in BGS:
    items = [(i // 2 + 1, i % 2 + 1, gid, kname, kdesc, '-', '필수' if sid != 'S7' else ('필수' if gid == 'BG_RUNAWAY' else '선택')) for i, (gid, kname, kdesc, _) in enumerate(cells)]
    lines = [f"Panel {i + 1} ({'top' if i < 2 else 'bottom'}-{'left' if i % 2 == 0 else 'right'}): {c[3]}." for i, c in enumerate(cells)]
    prompt = f"Create a pixel art BACKGROUND sheet for a cozy child-raising sim game: 4 location scenes ({BG_EN[sid]}).\n" + BG_STYLE + '\n' + '\n'.join(lines)
    sheets.append((7, sid, f'scene-{sid.lower()}.png', 2, 2, f'연출 배경 · {title}', items, prompt, False))

# 활동 포즈 12종: 나이대·성별마다 1장씩 (36장을 한 번에 그리면 칸이 틀어지기 쉬움)
ACTS = [('bake', '빵 굽기', '빵이 담긴 쟁반 들기', 'holding a baking tray with fresh bread, wearing oven mitts'),
        ('sweep', '청소', '빗자루로 쓸기', 'sweeping the floor with a broom'),
        ('guitar', '버스킹', '통기타 치며 노래', 'standing and playing an acoustic guitar while singing'),
        ('dance', '댄스', '한 팔 들고 춤추기', 'dancing with one arm raised, energetic pose'),
        ('kick', '태권도', '발차기', 'doing a taekwondo high kick (keep the same outfit)'),
        ('experiment', '실험', '시험관 들고 관찰', 'wearing safety goggles and holding up a test tube to look at it'),
        ('pet', '동물 돌보기', '강아지 안기', 'hugging a small brown puppy'),
        ('shopping', '쇼핑', '쇼핑백 양손에 들기', 'holding colorful shopping bags in both hands, happy'),
        ('camp', '캠핑', '마시멜로 굽기', 'standing and holding a long stick with a toasted marshmallow'),
        ('arcade', '오락', '조이스틱 잡고 게임', 'gripping an arcade joystick and pressing buttons, excited'),
        ('explore', '탐험', '지도와 손전등', 'holding a treasure map and a flashlight, adventurous'),
        ('raise', '발표', '손 번쩍 들기', 'raising one hand high to answer in class')]
STAGE_EN = {'CHILD': ('child, age 8-11 (FIRST row of the reference)', '유년'),
            'TEEN': ('teenager, age 12-16 (SECOND row of the reference)', '청소년'),
            'YOUTH': ('young adult, age 17-19 (THIRD row of the reference)', '청년')}
for g, gk, gen_en in GEN:
    for st, _ in STAGES:
        en, kst = STAGE_EN[st]
        items = [(i // 4 + 1, i % 4 + 1, f'{st}_{g}_{k}', f'{kst} {gk} · {n}', d, '-', '필수' if i < 8 else '선택') for i, (k, n, d, _) in enumerate(ACTS)]
        prompt = (f"Create a pixel art ACTION POSE sprite sheet of the {gen_en} character as a {en}: 3 rows x 4 columns = 12 full-body poses, "
                  "each pose holding the described prop.\n" + CHAR_REF + '\n' + LOOK[g] + f"\nUse ONLY the {en.split(' (')[0]} outfit from the reference for all 12 poses.\n"
                  + '\n'.join(f"Row {r + 1}, left to right: " + '; '.join(f"({c + 1}) {ACTS[r * 4 + c][3]}" for c in range(4)) + '.' for r in range(3)) + '\n' + STYLE)
        sheets.append((7, f'A-{st}-{g}', f'act-{st.lower()}-{g.lower()}.png', 3, 4, f'활동 포즈 · {kst} {gk}', items, prompt, False))

# 효과 아이콘 16종 (지금은 이모지로 대신하는 것)
FX = [[('FX_NOTE', '음표', 'a single music note'), ('FX_NOTES', '겹음표', 'two beamed music notes'), ('FX_SWEAT', '땀방울', 'a blue sweat drop'), ('FX_SPARKLE', '반짝', 'a four-point sparkle')],
      [('FX_PAINT', '물감', 'a colorful paint splash'), ('FX_STAR', '별', 'a yellow star'), ('FX_HEART', '하트', 'a small pink heart'), ('FX_COIN', '동전', 'a gold coin')],
      [('FX_ZZZ', '잠', 'the letters Zzz as a sleep symbol (only exception to the no-text rule)'), ('FX_STEAM', '김', 'a white steam puff'), ('FX_BUBBLE', '거품', 'a soap bubble'), ('FX_BULB', '아이디어', 'a glowing light bulb')],
      [('FX_BUG', '버그', 'a small green cartoon bug'), ('FX_GEM', '보석', 'a blue gem'), ('FX_IMPACT', '타격', 'an orange comic impact burst'), ('FX_RAIN', '빗방울', 'a falling rain drop')]]
items = [(r + 1, c + 1, k, n, d, '-', '선택') for r, row in enumerate(FX) for c, (k, n, d) in enumerate(row)]
prompt = ("Create a pixel art EFFECT ICON sheet: 4 rows x 4 columns, 16 small effect icons that float above a character, all the same size, bold, readable at 16 pixels.\n"
          + '\n'.join(f"Row {r + 1}, left to right: " + '; '.join(f"({c + 1}) {it[2]}" for c, it in enumerate(row)) + '.' for r, row in enumerate(FX)) + '\n' + STYLE)
sheets.append((7, 'X1', 'fx-icons.png', 4, 4, '연출 효과 아이콘', items, prompt, False))

# 부모님 캐릭터는 사용하지 않기로 함 → N1 시트 제외, 반려묘 프롬프트의 엄마 설명 제거
sheets = [x for x in sheets if x[1] != 'N1']

# ── 워크북
wb = Workbook()

# 1) 사용법
ws = wb.active
ws.title = '사용법'
ws.column_dimensions['A'].width = 4
ws.column_dimensions['B'].width = 110
rows = [
 ('도트 드림 메이커 — 스프라이트 제작 요청서', 'title'),
 ('', None),
 ('이 파일 사용법', 'h'),
 ('1. [시트 목록] 탭에서 한 줄씩 [Gemini 프롬프트] 칸을 복사해 Gemini에 붙여넣습니다.', None),
 ('2. 캐릭터 시트를 요청할 때는 기준 이미지를 함께 첨부합니다: 아들 → reference-son.png, 딸 → reference-daughter.png, 부모님·반려묘 → reference-parent-cat.png (docs/reference/ 폴더, 같이 보내드린 파일). 프롬프트에 외형 설명도 들어 있어 첨부를 잊어도 비슷하게 나오고, 얼굴이 조금 달라도 게임에 넣을 때 맞춰 넣습니다.', None),
 ('3. 받은 이미지를 [저장 파일명] 이름으로 저장해서 보내주세요. 그러면 assets-src/ 에 넣고 자동으로 잘라 게임에 적용합니다.', None),
 ('4. 완료한 시트는 [시트 목록]의 [완료] 칸(노란 칸)에 O 를 선택하세요. 상단 진행률이 자동 계산됩니다.', None),
 ('5. [전체 스프라이트] 탭은 시트 안에서 각 그림이 들어갈 칸(행·열)과 게임 내 ID입니다. 순서가 틀리면 다른 그림으로 인식되니 Gemini 결과의 순서를 꼭 확인하세요.', None),
 ('', None),
 ('꼭 지켜야 할 규칙 (자동 잘라내기 조건)', 'h'),
 ('• 배경은 순수한 흰색 단색. 바닥, 그림자, 글자, 숫자, 워터마크 없음 (워터마크가 그림에 붙으면 지우기 어렵습니다)', None),
 ('• 그림끼리 붙거나 겹치지 않게 넉넉히 띄우기 (그림 폭의 절반 이상)', None),
 ('• 정해진 행 × 열 격자, 왼쪽→오른쪽 · 위→아래 순서 그대로. 칸 수가 다르면 다시 생성해 주세요', None),
 ('• 캐릭터는 기존 시트와 같은 도트 크기·외곽선·색감, 몸을 살짝 오른쪽으로 튼 3/4 정면 (왼쪽은 게임이 좌우 반전)', None),
 ('• 가구는 2:1 아이소메트릭 시점, 정면이 화면 왼쪽 아래를 향하게 (반대 방향은 게임이 좌우 반전)', None),
 ('• 이미지 크기는 2752×1536(16:9) 정도면 충분', None),
 ('', None),
 ('우선순위', 'h'),
 ('1순위 가구(4장) → 2순위 행동 포즈(2장) → 3순위 뒷모습 걷기(2장) → 4순위 반려묘(1장) → 5순위 UI 아이콘(1장) → 6순위 직업 의상(선택, 12장) → 7순위 스케줄 연출(배경 7장 · 활동 포즈 6장 · 효과 1장)', None),
 ('7순위 연출 배경(S1~S7)은 흰 배경 규칙의 예외입니다: 패널 안은 장소 그림으로 꽉 채우고, 패널 바깥 여백만 흰색. 사람·글자는 넣지 않습니다(칠판·화면은 빈칸).', None),
 ('[필수/선택] 칸이 "선택"인 그림은 없어도 게임이 동작합니다 (예: 아빠, 잠자기 포즈, 직업 의상).', None),
 ('', None),
 ('색 표시: 노란 칸 = 직접 입력하는 칸 (완료 여부)', None),
]
for i,(text,kind) in enumerate(rows,1):
    c = ws.cell(row=i, column=2, value=text)
    c.alignment = WRAP
    c.font = Font(name=F, size=16, bold=True, color='3B2414') if kind=='title' else (Font(name=F, size=12, bold=True, color='8A5A35') if kind=='h' else BODY)
ws.sheet_view.showGridLines = False

# 2) 시트 목록
ws2 = wb.create_sheet('시트 목록')
hdr = ['순위','시트 ID','시트 내용','저장 파일명','행','열','그림 수(필수)','그림 수(선택)','완료','Gemini 프롬프트 (복사해서 사용)']
widths = [6,13,24,28,5,5,9,9,7,110]
TOP = 4
ws2['A1'] = '스프라이트 시트 목록'; ws2['A1'].font = Font(name=F, size=14, bold=True, color='3B2414')
ws2['A2'] = '진행률'; ws2['A2'].font = BOLD
for j,(h,w) in enumerate(zip(hdr,widths),1):
    c = ws2.cell(row=TOP, column=j, value=h)
    c.font = HDR_FONT; c.fill = HDR_FILL; c.alignment = CENTER; c.border = BOX
    ws2.column_dimensions[get_column_letter(j)].width = w
dv = DataValidation(type='list', formula1='"O,X"', allow_blank=True)
ws2.add_data_validation(dv)
first = TOP+1
for i,(pri,sid,fname,nr,nc,title,items,prompt,_) in enumerate(sheets):
    r = first+i
    if sid.endswith('-SON'):
        prompt = prompt.replace('reference-son.png / reference-daughter.png and use it', 'reference-son.png and use it')
    elif sid.endswith('-DAUGHTER'):
        prompt = prompt.replace('reference-son.png / reference-daughter.png and use it', 'reference-daughter.png and use it')
    vals = [pri,sid,title,fname,nr,nc,None,None,None,prompt]
    for j,v in enumerate(vals,1):
        c = ws2.cell(row=r, column=j, value=v)
        c.font = BODY; c.border = BOX
        c.alignment = WRAP if j in (3,4,10) else CENTER
        c.fill = PatternFill('solid', fgColor=PRI_FILL[pri])
    ws2.cell(row=r, column=7, value=f"=COUNTIFS('전체 스프라이트'!$A:$A,B{r},'전체 스프라이트'!$I:$I,\"필수\")")
    ws2.cell(row=r, column=8, value=f"=COUNTIFS('전체 스프라이트'!$A:$A,B{r},'전체 스프라이트'!$I:$I,\"선택\")")
    done = ws2.cell(row=r, column=9, value='O' if sid in ('F1', 'F2', 'F3', 'F4', 'B-SON', 'B-DAUGHTER', 'P-SON', 'P-DAUGHTER', 'N2', 'U1', 'J1-SON', 'J2-SON', 'J3-SON', 'J4-SON', 'J5-SON', 'J6-SON', 'J1-DAUGHTER', 'J2-DAUGHTER', 'J3-DAUGHTER', 'J4-DAUGHTER', 'J5-DAUGHTER', 'J6-DAUGHTER') else None)
    done.fill = INPUT_FILL
    dv.add(done)
    ws2.row_dimensions[r].height = 150
last = first+len(sheets)-1
ws2['B2'] = f'=COUNTIF(I{first}:I{last},"O")&" / "&COUNTA(B{first}:B{last})&" 시트 완료"'
ws2['D2'] = '전체 그림 수'; ws2['D2'].font = BOLD
ws2['E2'] = f'=SUM(G{first}:H{last})'
ws2['F2'] = '필수'; ws2['G2'] = f'=SUM(G{first}:G{last})'
ws2['H2'] = None
for cell in ('B2','E2','G2'): ws2[cell].font = BOLD
ws2.freeze_panes = ws2.cell(row=first, column=3)
ws2.auto_filter.ref = f'A{TOP}:J{last}'
# 예시 행 설명
ws2.cell(row=last+2, column=1, value='※ [완료] 칸에 O/X 를 고르면 위 진행률이 바뀝니다. [그림 수] 는 [전체 스프라이트] 탭에서 자동 집계됩니다.').font = Font(name=F, size=9, italic=True, color='7A8290')

# 3) 전체 스프라이트
ws3 = wb.create_sheet('전체 스프라이트')
hdr3 = ['시트 ID','순위','저장 파일명','행','열','게임 내 ID','이름','설명 / 포즈','필수/선택','크기(가구 칸)']
w3 = [13,6,28,5,5,28,30,46,9,11]
for j,(h,w) in enumerate(zip(hdr3,w3),1):
    c = ws3.cell(row=1, column=j, value=h)
    c.font = HDR_FONT; c.fill = HDR_FILL; c.alignment = CENTER; c.border = BOX
    ws3.column_dimensions[get_column_letter(j)].width = w
r = 2
for pri,sid,fname,nr,nc,title,items,prompt,_ in sheets:
    for (row,col,gid,name,desc,size,req) in items:
        vals = [sid,pri,fname,row,col,gid,name,desc,req,size]
        for j,v in enumerate(vals,1):
            c = ws3.cell(row=r, column=j, value=v)
            c.font = BODY; c.border = BOX
            c.alignment = WRAP if j in (6,7,8) else CENTER
            c.fill = PatternFill('solid', fgColor=PRI_FILL[pri])
        r += 1
ws3.freeze_panes = 'A2'
ws3.auto_filter.ref = f'A1:J{r-1}'

# 4) 이미 있는 것
ws4 = wb.create_sheet('이미 있음')
ws4.column_dimensions['A'].width = 34; ws4.column_dimensions['B'].width = 70
for j,h in enumerate(['원본 파일','내용'],1):
    c = ws4.cell(row=1, column=j, value=h); c.font = HDR_FONT; c.fill = HDR_FILL; c.border = BOX
have = [('assets-src/character-sheet.png','아이 3단계 × 아들·딸 서기/독서/만세, 반려묘 수면 — Gemini 첨부용 기준 이미지'),
        ('assets-src/son-walk-sheet.png','아들 3단계 × 서기, 걷기 3장, 독서, 만세'),
        ('assets-src/daughter-walk-sheet.png','딸 3단계 × 서기, 걷기 3장, 독서, 만세')]
for i,(a,b) in enumerate(have,2):
    for j,v in enumerate((a,b),1):
        c = ws4.cell(row=i, column=j, value=v); c.font = BODY; c.border = BOX; c.alignment = WRAP

wb.save(OUT)
print('sheets', len(sheets), 'sprites', r-2)
