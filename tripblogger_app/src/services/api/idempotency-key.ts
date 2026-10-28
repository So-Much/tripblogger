/** Unique enough per request; the server scopes keys by user and route. */
export function newIdempotencyKey(now: number = Date.now(), random: () => number = Math.random): string {
  const rand = Array.from({ length: 4 }, () =>
    Math.floor(random() * 0x100000000)
      .toString(36)
      .padStart(7, '0'),
  ).join('');
  return `${now.toString(36)}-${rand}`;
}
