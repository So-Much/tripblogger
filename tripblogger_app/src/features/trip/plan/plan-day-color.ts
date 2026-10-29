/** Distinct hues for plan-day chains (map polylines + Overview cards). */
export const PLAN_DAY_PALETTE = [
  '#0F766E',
  '#C2410C',
  '#1D4ED8',
  '#7C3AED',
  '#B45309',
  '#BE123C',
  '#047857',
  '#4338CA',
] as const;

/** Map dayIndex → palette color; cycles if the trip is longer than the palette. */
export function planDayColor(dayIndex: number): string {
  const i = Number.isFinite(dayIndex) ? Math.max(0, Math.floor(dayIndex)) : 0;
  return PLAN_DAY_PALETTE[i % PLAN_DAY_PALETTE.length];
}

/** Same color with an 8-digit alpha suffix for card fills. */
export function planDayColorAlpha(dayIndex: number, alphaHex = '22'): string {
  return `${planDayColor(dayIndex)}${alphaHex}`;
}
