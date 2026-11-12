import { describe, expect, it } from 'vitest';
import { PARENTING_EVENTS } from '../data/parentingData';
import { TOWN_ENCS } from '../data/townData';
import { SPECIAL_DAYS, SPECIAL_MAP } from '../data/specialDays';
import { short } from '../components/ui';
import { eligibleSpecials } from '../engine/specialDay';
import { createNewGame } from '../engine/simulation';
const createNewSave = () => createNewGame('하나', 'DAUGHTER', 'INT', []);

describe('플레이 테스트 수정 (v0.44.4)', () => {
  it('0원이어도 고를 수 있는 선택지가 늘 있다', () => {
    for (const e of PARENTING_EVENTS) expect(e.choices.some((c) => !short(c.fx, 0)), e.id).toBe(true);
    for (const e of TOWN_ENCS) if (e.choices) expect(e.choices.some((c) => !short(c.fx, 0)), e.id).toBe(true);
    for (const d of SPECIAL_DAYS) for (const st of d.steps) if (st.kind === 'pick') expect(st.options.some((o) => !short(o.fx, 0)), d.id).toBe(true);
  });
  it('가진 돈보다 비싼 선택만 막는다', () => {
    expect(short({ gold: -300 }, 269)).toBe(true);
    expect(short({ gold: -300 }, 300)).toBe(false);
    expect(short({ gold: 50 }, 0)).toBe(false);
  });
  it('계절이 없는 일상 이벤트는 한 판에 한 번만', () => {
    const s = createNewSave();
    s.age = 15;
    s.specialSeen = ['SP_GIMBAP:CHILD', 'SP_STRAY_DOG:CHILD'];
    const ids = eligibleSpecials(s).map((d) => d.id);
    expect(ids).not.toContain('SP_GIMBAP');
    expect(ids).not.toContain('SP_STRAY_DOG');
  });
  it('나이에 안 맞는 장면이 없다', () => {
    expect(SPECIAL_MAP.SP_BLACKOUT.maxAge).toBeLessThanOrEqual(11);
    expect(SPECIAL_MAP.SP_FIRST_SNOW.maxAge).toBeLessThanOrEqual(14);
  });
  it('알바 가게 방문은 베이커리 알바를 한 아이만', () => {
    const s = createNewSave();
    s.age = 18;
    s.actionCounts = { JOB_06: 5 };
    expect(SPECIAL_MAP.SP_SECRET_VISIT.need!(s)).toBe(false);
    s.actionCounts = { JOB_02: 3 };
    expect(SPECIAL_MAP.SP_SECRET_VISIT.need!(s)).toBe(true);
  });
});

import { EVENT_MAP, eventText } from '../data/parentingData';
import { josa } from '../data/josa';
import { GIFT_PRICE, HOMEMADE_GIFT, giftOptions, giveGift } from '../data/birthdayData';
import { writeDiary } from '../engine/diary';

describe('플레이 테스트 수정 2 (v0.44.5)', () => {
  it('조사가 받침에 맞게 붙는다', () => {
    expect(josa('수의사', '이', '가')).toBe('수의사가');
    expect(josa('약사', '이', '가')).toBe('약사가');
    expect(josa('공무원', '이', '가')).toBe('공무원이');
  });
  it('학년에 맞는 시기: 19세=고3 → 졸업 앨범은 고3 봄, 운전면허는 수능 뒤', () => {
    const g = EVENT_MAP.Y_GRADUATION;
    expect(g.minAge).toBe(19);
    expect(g.months!.every((m) => m >= 3 && m <= 11)).toBe(true);
    expect(EVENT_MAP.Y_LICENSE.minAge).toBe(19);
  });
  it('차 없는 집은 운전면허 이야기도 다르게', () => {
    const poor = createNewSave();
    poor.parent = { ...poor.parent!, job: 'DAYLABOR' } as typeof poor.parent;
    expect(eventText(EVENT_MAP.Y_LICENSE, poor)).not.toContain('드라이브');
  });
  it('선물 살 돈이 없으면 손편지와 생일상 (무료)', () => {
    const s = createNewSave();
    s.age = 13;
    s.pendingBirthday = true;
    s.gold = GIFT_PRICE.TEEN - 1;
    const paid = giveGift(s, giftOptions(s)[0]);
    expect(paid.reply).toBe('');
    expect(s.gold).toBe(GIFT_PRICE.TEEN - 1);
    const free = giveGift(s, HOMEMADE_GIFT);
    expect(free.reply.length).toBeGreaterThan(0);
    expect(s.gold).toBe(GIFT_PRICE.TEEN - 1);
  });
  it('일기에 이(가) 같은 괄호 조사나 (위험) 표시가 남지 않는다', () => {
    const s = createNewSave();
    s.age = 17;
    s.stats = { ...s.stats, INT: 900 };
    for (let i = 0; i < 40; i++) {
      let x = i + 1;
      writeDiary(s, [{ actionId: 'JOB_08', actionType: 'PART_TIME', outcome: 'GREAT' } as never], undefined, () => ((x = (x * 16807) % 2147483647) / 2147483647));
      for (const l of s.diaryNew?.lines ?? []) expect(l).not.toMatch(/\(가\)|\(위험\)/);
    }
  });
});
