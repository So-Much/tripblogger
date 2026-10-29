import { newIdempotencyKey } from './idempotency-key';

describe('newIdempotencyKey', () => {
  it('matches the server-accepted pattern', () => {
    expect(newIdempotencyKey()).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
  });

  it('differs between calls', () => {
    const keys = new Set(Array.from({ length: 200 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(200);
  });
});
