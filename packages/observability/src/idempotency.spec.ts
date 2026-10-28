import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import { IdempotencyInterceptor, type IdempotencyStore } from './idempotency';

function memoryStore(): IdempotencyStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async set(key, value, ...args) {
      if (args.includes('NX') && data.has(key)) return null;
      data.set(key, value);
      return 'OK';
    },
    async get(key) {
      return data.get(key) ?? null;
    },
    async del(key) {
      return data.delete(key) ? 1 : 0;
    },
  };
}

function ctx(body: unknown, key?: string) {
  const res = { statusCode: 0, headers: {} as Record<string, string> };
  const req = {
    method: 'POST',
    headers: key ? { 'idempotency-key': key } : {},
    body,
    route: { path: '/api/trips' },
    user: { sub: 'u1' },
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({
        status: (c: number) => (res.statusCode = c),
        setHeader: (k: string, v: string) => (res.headers[k] = v),
      }),
    }),
    getHandler: () => function handler() {},
  };
  return { context: context as never, res };
}

describe('IdempotencyInterceptor', () => {
  const KEY = 'abc12345-key';

  it('passes through when no key is sent', async () => {
    const store = memoryStore();
    const it = new IdempotencyInterceptor(store);
    const handle = jest.fn(() => of({ id: 1 }));
    await lastValueFrom(it.intercept(ctx({ a: 1 }).context, { handle }));
    await lastValueFrom(it.intercept(ctx({ a: 1 }).context, { handle }));
    expect(handle).toHaveBeenCalledTimes(2);
    expect(store.data.size).toBe(0);
  });

  it('replays the stored response for a repeated key', async () => {
    const store = memoryStore();
    const it = new IdempotencyInterceptor(store);
    const handle = jest.fn(() => of({ id: 'trip-1' }));
    const first = await lastValueFrom(it.intercept(ctx({ t: 'x' }, KEY).context, { handle }));
    const second = ctx({ t: 'x' }, KEY);
    const replay = await lastValueFrom(it.intercept(second.context, { handle }));
    expect(first).toEqual({ id: 'trip-1' });
    expect(replay).toEqual({ id: 'trip-1' });
    expect(handle).toHaveBeenCalledTimes(1);
    expect(second.res.statusCode).toBe(201);
    expect(second.res.headers['Idempotent-Replayed']).toBe('true');
  });

  it('rejects the same key with a different body', async () => {
    const store = memoryStore();
    const it = new IdempotencyInterceptor(store);
    await lastValueFrom(it.intercept(ctx({ t: 'x' }, KEY).context, { handle: () => of({}) }));
    await expect(
      lastValueFrom(it.intercept(ctx({ t: 'y' }, KEY).context, { handle: () => of({}) })),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('returns 409 while the first request is still running', async () => {
    const store = memoryStore();
    const it = new IdempotencyInterceptor(store);
    const neverCompletes = new Observable<unknown>(() => undefined);
    it.intercept(ctx({ t: 'x' }, KEY).context, { handle: () => neverCompletes }).subscribe();
    await new Promise((r) => setImmediate(r));
    await expect(
      lastValueFrom(it.intercept(ctx({ t: 'x' }, KEY).context, { handle: () => of({}) })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('frees the key when the handler fails so the client can retry', async () => {
    const store = memoryStore();
    const it = new IdempotencyInterceptor(store);
    await expect(
      lastValueFrom(it.intercept(ctx({ t: 'x' }, KEY).context, { handle: () => throwError(() => new Error('boom')) })),
    ).rejects.toThrow('boom');
    expect(store.data.size).toBe(0);
  });
});
