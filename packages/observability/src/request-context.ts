import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

type RequestContext = { requestId: string };

const storage = new AsyncLocalStorage<RequestContext>();

export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/** Headers to forward on service-to-service calls so one request can be followed across logs. */
export function propagationHeaders(): Record<string, string> {
  const id = currentRequestId();
  return id ? { [REQUEST_ID_HEADER]: id } : {};
}

export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export type RequestContextOptions = {
  service: string;
  /** One JSON line per request on stdout. */
  accessLog?: boolean;
  /** Paths that should not be access-logged (health probes, metrics scrapes). */
  quietPaths?: RegExp;
};

export function requestContextMiddleware(opts: RequestContextOptions) {
  const quiet = opts.quietPaths ?? /^\/(api\/health|metrics)/;
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, requestId);
    const startedAt = process.hrtime.bigint();
    if (opts.accessLog && !quiet.test(req.path)) {
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
        process.stdout.write(
          `${JSON.stringify({
            level: res.statusCode >= 500 ? 'error' : 'info',
            time: new Date().toISOString(),
            service: opts.service,
            requestId,
            method: req.method,
            path: req.originalUrl.split('?')[0],
            status: res.statusCode,
            ms: Math.round(ms * 10) / 10,
          })}\n`,
        );
      });
    }
    storage.run({ requestId }, () => next());
  };
}
