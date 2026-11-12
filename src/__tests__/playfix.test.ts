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
