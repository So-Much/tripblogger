import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';

export const IDEMPOTENCY_STORE = 'IDEMPOTENCY_STORE';
export const IDEMPOTENCY_HEADER = 'idempotency-key';

/** Subset of ioredis used here. */
export type IdempotencyStore = {
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
};

type StoredRecord =
  | { state: 'pending'; fp: string }
  | { state: 'done'; fp: string; status: number; body: unknown };

const PENDING_TTL_MS = 60_000;
const DONE_TTL_MS = 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

type Req = {
  method: string;
  headers: { [k: string]: unknown };
  body?: unknown;
  ip?: string;
  route?: { path?: string };
  baseUrl?: string;
  originalUrl?: string;
  user?: { sub?: string; id?: string };
};

/**
 * Replays the first response for a repeated `Idempotency-Key` (same user, same route, same body).
 * Requests without the header pass through unchanged.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(IDEMPOTENCY_STORE) private readonly store: IdempotencyStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Req>();
    const res = http.getResponse<{ status(code: number): unknown; setHeader(k: string, v: string): unknown }>();
    const header = req.headers[IDEMPOTENCY_HEADER];
    if (typeof header !== 'string' || header.length === 0) return next.handle();
    if (!KEY_PATTERN.test(header)) {
      throw new BadRequestException({ error: 'invalid_idempotency_key' });
    }

    const principal = req.user?.sub ?? req.user?.id ?? `ip:${req.ip ?? 'unknown'}`;
    const route = `${req.baseUrl ?? ''}${req.route?.path ?? req.originalUrl ?? ''}`;
    const key = `idem:${sha256(`${principal}|${req.method}|${route}|${header}`)}`;
    const fp = sha256(JSON.stringify(req.body ?? null));
    const reflect = Reflect as unknown as { getMetadata?: (key: string, target: object) => unknown };
    const status =
      (reflect.getMetadata?.('__httpCode__', context.getHandler()) as number | undefined) ??
      (req.method === 'POST' ? 201 : 200);

    return from(this.store.set(key, JSON.stringify({ state: 'pending', fp }), 'PX', PENDING_TTL_MS, 'NX')).pipe(
      mergeMap((acquired) => {
        if (acquired === 'OK') {
          return next.handle().pipe(
            mergeMap((body) =>
              from(
                this.store.set(key, JSON.stringify({ state: 'done', fp, status, body }), 'PX', DONE_TTL_MS),
              ).pipe(mergeMap(() => of(body))),
            ),
            catchError((err) => from(this.store.del(key)).pipe(mergeMap(() => throwError(() => err)))),
          );
        }
        return from(this.store.get(key)).pipe(
          mergeMap((raw) => {
            const existing = raw ? (JSON.parse(raw) as StoredRecord) : null;
            if (!existing) {
              throw new ConflictException({ error: 'idempotency_retry', message: 'Retry the request' });
            }
            if (existing.fp !== fp) {
              throw new UnprocessableEntityException({ error: 'idempotency_key_reused' });
            }
            if (existing.state === 'pending') {
              throw new ConflictException({ error: 'idempotency_in_progress' });
            }
            res.status(existing.status);
            res.setHeader('Idempotent-Replayed', 'true');
            return of(existing.body);
          }),
        );
      }),
    );
  }
}
