export const DEFAULT_CURRENCY = 'VND';

export function formatCurrency(
  amount: number,
  opts?: { language?: 'vi' | 'en'; currency?: string },
): string {
  const language = opts?.language ?? 'vi';
  const currency = opts?.currency ?? DEFAULT_CURRENCY;
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/** Parse digits from a money input (allows dots/commas/spaces). */
export function parseMoneyInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Display string while typing (grouped, no currency symbol). */
export function formatMoneyInput(raw: string): string {
  const n = parseMoneyInput(raw);
  if (n == null) return raw.replace(/[^\d]/g, '');
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function moneyInputFromAmount(amount: number | null | undefined): string {
  if (amount == null || amount <= 0) return '';
  return formatMoneyInput(String(Math.round(amount)));
}
