/** Public label: custom display name only; username only when display name is unset. */
export function resolvePublicDisplayName(
  displayName: string | null | undefined,
  username: string | null | undefined,
  fallback = 'Thành viên',
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const user = username?.trim();
  if (user) return user;
  return fallback;
}

export function hasCustomDisplayName(displayName: string | null | undefined): boolean {
  return Boolean(displayName?.trim());
}
