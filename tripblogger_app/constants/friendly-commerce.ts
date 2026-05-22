/** Friendly design tokens for TripBlogger commerce (radius, spacing, typography). */

export const FriendlyRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const FriendlySpace = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FriendlyType = {
  caption: 14,
  body: 16,
  title: 18,
  section: 24,
  display: 32,
} as const;

/** 8-digit hex suffix alpha on #RRGGBB */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  const base = hex.length === 7 ? hex : hex.slice(0, 7);
  return `${base}${a}`;
}
