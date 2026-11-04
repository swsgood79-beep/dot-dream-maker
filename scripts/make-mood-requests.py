"""아이 상태(기분) 포즈 요청서 → docs/mood_requests.xlsx
방 안 도트 캐릭터가 상태가 나쁠 때 쓰는 동작·표정 12종 × 나이 3 × 성별 2 = 시트 6장 (각 3×4).
그림 스타일·캐릭터 설명은 make-sprite-requests.py 의 것을 그대로 가져온다.
받은 그림은 assets-src/mood-{child|teen|youth}-{son|daughter}.png 로 저장."""
import re
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

src = open('scripts/make-sprite-requests.py', encoding='utf-8').read()
ns = {}
exec(src[src.index('STYLE = ('):src.index('ISO = (')], ns)
STYLE, CHAR_REF, LOOK = ns['STYLE'], ns['CHAR_REF'], ns['LOOK']

OUT = 'docs/mood_requests.xlsx'
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
ROWFILL = [PatternFill('solid', fgColor=c) for c in ('FDE2E2', 'E6EEF8', 'EAF4E2')]
DONE = PatternFill('solid', fgColor='FFF59D')

# (키, 이름, 한글 설명, 게임에서 쓰는 때, 영어 지시)
MOODS = [
    ('sad', '슬픔', '고개를 숙이고 어깨가 축 처짐, 눈물이 글썽', '친밀도 40 이하일 때 방에 서 있는 모습',
     'standing with head down and drooping shoulders, teary eyes, sad face'),
    ('angry', '화남', '팔짱 끼고 볼을 부풀리며 찡그림', '학원 파업한 주, 타이르기 직후',
     'arms crossed, cheeks puffed, frowning angrily, stomping one foot'),
    ('cry', '울기', '두 주먹으로 눈을 비비며 엉엉 울기, 눈물 방울', '스트레스 90 이상, 말없는 스트레스(이상행동)',
     'crying loudly while rubbing both eyes with fists, big tear drops flying'),
    ('stressed', '머리 감싸기', '두 손으로 머리를 감싸 쥐고 괴로운 표정', '스트레스 70 이상',
     'holding the head with both hands, eyes squeezed shut, stressed and overwhelmed'),
    ('sulk', '웅크려 앉기', '바닥에 쪼그려 앉아 무릎을 끌어안고 얼굴을 반쯤 묻음', '방문이 잠겼을 때 (구석에 웅크림)',
     'sitting on the floor hugging the knees, face half hidden behind the knees, lonely'),
    ('back_sulk', '등 돌리기', '뒤돌아 서서 고개를 숙인 뒷모습 (얼굴 안 보임)', '마음이 멀어졌을 때 구석에서 등 돌림',
     'standing seen from behind (back view, face not visible), head down, shoulders slumped'),
    ('sick', '아픔', '빨간 볼에 이마에 손, 담요를 어깨에 두름', '아파서 쉬는 주',
     'feverish with red cheeks, one hand on the forehead, a small blanket wrapped around the shoulders'),
    ('phone', '폰만 보기', '무표정으로 스마트폰(유년은 휴대용 게임기)만 들여다봄', '차가운 마음 (대화 단절, 친밀도 30 이하)',
     'staring blankly at a smartphone held in both hands, expressionless, ignoring everyone (for the child: a handheld game console instead)'),
    ('rebel', '삐딱하게', '주머니에 손 넣고 짝다리, 곁눈질로 째려봄', '비행 40 이상',
     'standing with hands in pockets, weight on one leg, glaring sideways with a defiant look'),
    ('mope_walkA', '터덜터덜 걷기 1', '고개 숙이고 걷기 – 왼발 앞으로', '기분이 나쁠 때 방 안을 걸어 다닐 때 (1번 장)',
     'walking slowly with head down, left foot forward (walk frame 1)'),
    ('mope_walkB', '터덜터덜 걷기 2', '고개 숙이고 걷기 – 오른발 앞으로', '기분이 나쁠 때 방 안을 걸어 다닐 때 (2번 장)',
     'walking slowly with head down, right foot forward (walk frame 2, same direction as frame 1)'),
    ('sigh', '한숨', '어깨가 늘어지고 입에서 한숨 김이 나옴, 지친 눈', '지쳤을 때 (지금 유년기에는 지침 그림이 없음)',
     'exhausted, sighing with a small puff of breath, half-closed tired eyes, arms hanging'),
]
STAGES = [('CHILD', '유년', '8~11세', 'child, age 8-11 (FIRST row of the reference)'),
          ('TEEN', '청소년', '12~16세', 'teenager, age 12-16 (SECOND row of the reference)'),
          ('YOUTH', '청년', '17~19세', 'young adult, age 17-19 (THIRD row of the reference)')]
GENS = [('SON', '아들', 'boy'), ('DAUGHTER', '딸', 'girl')]


def prompt(g, gen_en, st_en):
    who = st_en.split(' (')[0]
    rows = '\n'.join(f"Row {r + 1}, left to right: " + '; '.join(f"({c + 1}) {MOODS[r * 4 + c][4]}" for c in range(4)) + '.' for r in range(3))
    return (f"Create a pixel art EMOTION POSE sprite sheet of the {gen_en} character as a {st_en}: 3 rows x 4 columns = 12 full-body poses "
            "showing a child who is NOT okay (sad, angry, stressed, lonely). The feeling must read clearly from both the body pose and the face, "
            "even at small size. Keep it gentle and cute, never scary or violent. Each pose faces 3/4 toward the viewer, turned slightly to the right, "
            "except pose 6 which is a back view.\n"
            + CHAR_REF + '\n' + LOOK[g] + f"\nUse ONLY the {who} outfit from the reference for all 12 poses, same size as the reference.\n"
            + rows + '\n' + STYLE)


wb = Workbook()
ws = wb.active
ws.title = '사용 방법'
ws.sheet_view.showGridLines = False
ws.column_dimensions['A'].width = 4
ws.column_dimensions['B'].width = 120
lines = [
    ('아이 상태 포즈 요청서 (방 안 도트 캐릭터)', 't'),
    ('', None),
    ('무엇에 쓰나요?', 'h'),
    ('아이 상태가 나쁠 때(슬픔·화남·스트레스·방문 잠금·비행·아픔 등) 방 안을 돌아다니는 도트 캐릭터가 그 기분에 맞는 동작과 표정을 보여 줍니다.', None),
    ('지금은 기분이 나쁠 때 쓸 그림이 "지침" 1장(청소년·청년만)뿐이라, 유년기는 아무리 힘들어도 평소 모습 그대로입니다.', None),
    ('', None),
    ('필요한 것: 시트 6장 (아들/딸 × 유년/청소년/청년), 한 장에 포즈 12개 (3줄 × 4칸)', 'h'),
    ('예전 활동 포즈 시트(빵 쟁반·빗자루…)와 같은 형식입니다. 같은 방식으로 자동으로 잘라 게임에 넣습니다.', None),
    ('', None),
    ('만드는 순서', 'h'),
    ('1. "요청 목록" 탭에서 한 줄씩 진행합니다 (시트 6장).', None),
    ('2. [첨부할 기준 그림] 칸에 적힌 그림을 Gemini에 같이 첨부합니다. 예전에 받은 활동 포즈 시트(act-나이-성별.png)를 첨부하면 옷·얼굴·크기가 가장 잘 맞습니다.', None),
    ('3. [프롬프트] 칸을 통째로 복사해 붙여 넣습니다. (영어가 정상입니다. 이미지 모델이 영어 지시를 더 정확히 따릅니다.)', None),
    ('4. 받은 그림을 [저장 파일명]으로 저장해서 보내 주세요. 이름이 달라도 어떤 시트인지만 알려 주시면 됩니다.', None),
    ('', None),
    ('꼭 지켜야 할 것', 'h'),
    ('• 흰 배경, 12개 포즈가 서로 떨어져 있을 것 (붙어 있어도 자를 수는 있지만 깔끔하지 않음)', None),
    ('• 3줄 × 4칸 순서 그대로 (칸 순서로 어떤 동작인지 구분합니다)', None),
    ('• 옷은 그 나이대 옷 그대로, 크기는 활동 포즈와 비슷하게', None),
    ('• 6번 "등 돌리기"만 뒷모습, 나머지는 모두 비스듬히 앞을 보는 모습', None),
    ('• 10·11번 걷기 2장은 같은 방향(오른쪽 아래)을 보고 발만 번갈아', None),
    ('', None),
    ('일부 칸이 어색하게 나와도 괜찮습니다. 그 칸만 빼고 나머지를 쓰고, 빠진 동작은 원래 그림으로 대신합니다.', None),
]
for i, (t, k) in enumerate(lines, 1):
    c = ws.cell(row=i, column=2, value=t)
    c.font = TITLE if k == 't' else BOLD if k == 'h' else BODY
    c.alignment = WRAP

# 요청 목록
w2 = wb.create_sheet('요청 목록')
cols = [('#', 5), ('시트', 18), ('저장 파일명', 26), ('나이 · 성별', 16), ('구성', 8), ('첨부할 기준 그림', 34), ('프롬프트 (그대로 복사)', 110), ('완료', 7)]
for j, (h, wdt) in enumerate(cols, 1):
    c = w2.cell(row=1, column=j, value=h)
    c.font, c.fill, c.alignment, c.border = HF, HDR, CEN, BOX
    w2.column_dimensions[c.column_letter].width = wdt
r = 2
for g, gk, gen_en in GENS:
    for st, kst, ages, st_en in STAGES:
        vals = [r - 1, f'M-{st}-{g}', f'mood-{st.lower()}-{g.lower()}.png', f'{kst}({ages}) {gk}', '3×4',
                f'act-{st.lower()}-{g.lower()}.png (예전 활동 포즈 시트)\n또는 reference-{g.lower()}.png', prompt(g, gen_en, st_en), None]
        for j, v in enumerate(vals, 1):
            c = w2.cell(row=r, column=j, value=v)
            c.font, c.alignment, c.border = BODY, (CEN if j in (1, 5, 8) else WRAP), BOX
        w2.cell(row=r, column=8).fill = DONE
        w2.row_dimensions[r].height = 330
        r += 1
w2.freeze_panes = 'A2'

# 칸별 확인
w3 = wb.create_sheet('칸별 확인')
cols3 = [('칸 (줄-칸)', 10), ('게임 이름', 14), ('동작', 16), ('그림 설명 (한글)', 44), ('게임에서 나오는 때', 44), ('영어 지시 (프롬프트에 포함됨)', 70)]
for j, (h, wdt) in enumerate(cols3, 1):
    c = w3.cell(row=1, column=j, value=h)
    c.font, c.fill, c.alignment, c.border = HF, HDR, CEN, BOX
    w3.column_dimensions[c.column_letter].width = wdt
for i, (k, n, d, use, en) in enumerate(MOODS):
    vals = [f'{i // 4 + 1}-{i % 4 + 1}', k, n, d, use, en]
    for j, v in enumerate(vals, 1):
        c = w3.cell(row=i + 2, column=j, value=v)
        c.font, c.alignment, c.border = BODY, (CEN if j == 1 else WRAP), BOX
        c.fill = ROWFILL[i // 4]
    w3.row_dimensions[i + 2].height = 34
w3.freeze_panes = 'A2'

wb.save(OUT)
print(OUT, 'sheets', r - 2, 'poses', len(MOODS))
