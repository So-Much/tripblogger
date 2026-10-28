import { currentRequestId, propagationHeaders, requestContextMiddleware } from './request-context';

function run(headers: Record<string, string>) {
  const res = { headers: {} as Record<string, string>, setHeader(k: string, v: string) { this.headers[k] = v; }, on() {} };
  const req = { headers, path: '/api/trips', originalUrl: '/api/trips', method: 'GET' };
  let seen: string | undefined;
  let forwarded: Record<string, string> = {};
  requestContextMiddleware({ service: 'test' })(req as never, res as never, () => {
    seen = currentRequestId();
    forwarded = propagationHeaders();
  });
  return { res, seen, forwarded };
}

describe('requestContextMiddleware', () => {
  it('keeps a valid incoming id and exposes it for forwarding', () => {
    const { res, seen, forwarded } = run({ 'x-request-id': 'abc-123' });
    expect(seen).toBe('abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
    expect(forwarded).toEqual({ 'x-request-id': 'abc-123' });
  });

  it('replaces a missing or unsafe id with a UUID', () => {
    const { seen } = run({ 'x-request-id': 'bad id\nwith newline' });
    expect(seen).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('has no id outside a request', () => {
    expect(currentRequestId()).toBeUndefined();
    expect(propagationHeaders()).toEqual({});
  });
});
