import {
  clampBufferMinutes,
  clampTravelSeconds,
  formatTravelMinutes,
  parsePlanMinutes,
  travelMinutesToSeconds,
} from './plan-travel-minutes';

describe('formatTravelMinutes', () => {
  it('returns null while travel is unknown so the chip is not shown', () => {
    expect(formatTravelMinutes(null)).toBeNull();
  });

  it('floors OSRM zero / sub-minute legs to 1 minute', () => {
    expect(formatTravelMinutes(0)).toBe(1);
    expect(formatTravelMinutes(1)).toBe(1);
    expect(formatTravelMinutes(29)).toBe(1);
  });

  it('rounds whole minutes from stored OSRM seconds', () => {
    expect(formatTravelMinutes(30)).toBe(1);
    expect(formatTravelMinutes(60)).toBe(1);
    expect(formatTravelMinutes(89)).toBe(1);
    expect(formatTravelMinutes(90)).toBe(2);
    expect(formatTravelMinutes(600)).toBe(10);
  });
});

describe('clampTravelSeconds', () => {
  it('keeps unknown legs unknown (no client estimate)', () => {
    expect(clampTravelSeconds(null)).toBeNull();
  });

  it('clamps zero / negative OSRM results to 60 seconds', () => {
    expect(clampTravelSeconds(0)).toBe(60);
    expect(clampTravelSeconds(-5)).toBe(60);
  });

  it('leaves real routed durations intact', () => {
    expect(clampTravelSeconds(45)).toBe(45);
    expect(clampTravelSeconds(1000)).toBe(1000);
  });
});

describe('parsePlanMinutes', () => {
  it('parses whole-minute chips and rejects junk', () => {
    expect(parsePlanMinutes('12')).toBe(12);
    expect(parsePlanMinutes('  7 ')).toBe(7);
    expect(parsePlanMinutes('0')).toBe(0);
    expect(parsePlanMinutes('')).toBeNull();
    expect(parsePlanMinutes('1.5')).toBeNull();
    expect(parsePlanMinutes('abc')).toBeNull();
    expect(parsePlanMinutes('-3')).toBeNull();
  });
});

describe('travelMinutesToSeconds', () => {
  it('never persists a 0-minute travel leg (1 min floor)', () => {
    expect(travelMinutesToSeconds(0)).toBe(60);
    expect(travelMinutesToSeconds(1)).toBe(60);
    expect(travelMinutesToSeconds(12)).toBe(720);
  });
});

describe('clampBufferMinutes', () => {
  it('allows zero buffer and rejects negatives', () => {
    expect(clampBufferMinutes(0)).toBe(0);
    expect(clampBufferMinutes(15)).toBe(15);
    expect(clampBufferMinutes(-4)).toBe(0);
  });
});
