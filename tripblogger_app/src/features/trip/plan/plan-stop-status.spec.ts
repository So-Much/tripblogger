import { deriveStopDisplayStatus } from './plan-stop-status';

const base = {
  status: 'todo' as const,
  schedule: {
    id: 's1',
    arriveAt: '2026-08-22T09:00:00+07:00',
    startAt: '2026-08-22T09:00:00+07:00',
    endAt: '2026-08-22T10:00:00+07:00',
    departAt: '2026-08-22T10:15:00+07:00',
    idleMinutes: 0,
    skipped: false,
  },
};

describe('deriveStopDisplayStatus', () => {
  it('keeps skipped when stored as skipped', () => {
    expect(
      deriveStopDisplayStatus(
        { ...base, status: 'skipped' },
        new Date('2026-08-22T09:30:00+07:00'),
      ),
    ).toBe('skipped');
  });

  it('returns todo before arrive', () => {
    expect(deriveStopDisplayStatus(base, new Date('2026-08-22T08:00:00+07:00'))).toBe('todo');
  });

  it('returns doing during the visit window', () => {
    expect(deriveStopDisplayStatus(base, new Date('2026-08-22T09:30:00+07:00'))).toBe('doing');
  });

  it('returns done after depart', () => {
    expect(deriveStopDisplayStatus(base, new Date('2026-08-22T11:00:00+07:00'))).toBe('done');
  });
});
