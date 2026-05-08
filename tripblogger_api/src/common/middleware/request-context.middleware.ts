import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface RequestContextLocals {
  requestId: string;
  startAtMs: number;
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerId = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined;
  const requestId = headerId && headerId.length > 0 ? headerId : randomUUID();
  // Express' res.locals is untyped (and varies by @types/express versions); keep it simple.
  (res.locals as Partial<RequestContextLocals>).requestId = requestId;
  (res.locals as Partial<RequestContextLocals>).startAtMs = Date.now();
  res.setHeader('x-request-id', requestId);
  next();
}

