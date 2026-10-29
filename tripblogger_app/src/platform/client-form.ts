export type ClientForm = 'phone' | 'tablet' | 'desktop';

/** Phone, including a narrow browser. */
export const PHONE_MAX_WIDTH = 719;
/** Tablet, including a medium browser and a large native window. */
export const TABLET_MAX_WIDTH = 1099;

/** Reading column for feed and forms on a desktop browser. */
export const WEB_DESKTOP_COLUMN = 1120;

export function resolveClientForm(platform: string, width: number): ClientForm {
  const size = Number.isFinite(width) ? width : 0;
  if (size <= PHONE_MAX_WIDTH) return 'phone';
  // A native window never becomes a desktop site. A wide iPad stays a tablet.
  if (platform !== 'web' || size <= TABLET_MAX_WIDTH) return 'tablet';
  return 'desktop';
}

export function desktopColumnWidth(windowWidth: number): number {
  if (!Number.isFinite(windowWidth)) return WEB_DESKTOP_COLUMN;
  return Math.min(WEB_DESKTOP_COLUMN, Math.max(320, windowWidth - 48));
}

export function productColumnCount(form: ClientForm, windowWidth: number): number {
  if (form === 'phone') return 2;
  if (form === 'tablet') return 3;
  return Math.max(4, Math.min(5, Math.floor(windowWidth / 260)));
}
