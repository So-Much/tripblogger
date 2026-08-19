import { PLAN_DAY_PALETTE, planDayColor, planDayColorAlpha } from './plan-day-color';

describe('planDayColor', () => {
  it('returns a distinct color per day index', () => {
    const a = planDayColor(0);
    const b = planDayColor(1);
    const c = planDayColor(2);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it('cycles the palette after it is exhausted', () => {
    expect(planDayColor(PLAN_DAY_PALETTE.length)).toBe(planDayColor(0));
    expect(planDayColor(PLAN_DAY_PALETTE.length + 3)).toBe(planDayColor(3));
  });

  it('floors and clamps invalid indexes to the first color', () => {
    expect(planDayColor(-1)).toBe(planDayColor(0));
    expect(planDayColor(1.9)).toBe(planDayColor(1));
    expect(planDayColor(Number.NaN)).toBe(planDayColor(0));
  });

  it('uses hex colors with enough contrast for white marker text', () => {
    for (const color of PLAN_DAY_PALETTE) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
      const n = parseInt(color.slice(1), 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(luminance).toBeLessThan(0.55);
    }
  });
});

describe('planDayColorAlpha', () => {
  it('appends an alpha suffix for card fills', () => {
    expect(planDayColorAlpha(0, '22')).toBe(`${planDayColor(0)}22`);
    expect(planDayColorAlpha(1)).toBe(`${planDayColor(1)}22`);
  });
});
