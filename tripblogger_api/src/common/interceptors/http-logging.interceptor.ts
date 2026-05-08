import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Request, Response } from 'express';

function safeJson(value: unknown): unknown {
  // Avoid circular structure errors
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return '[unserializable]';
  }
}

function maskSecrets(value: unknown): unknown {
  const SENSITIVE_KEYS = new Set([
    'password',
    'confirmPassword',
    'refreshToken',
    'accessToken',
    'token',
    'authorization',
    'jwt',
    'secret',
    'clientSecret',
  ]);

  if (Array.isArray(value)) return value.map(maskSecrets);
  if (!value || typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k) || SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[redacted]';
    } else {
      out[k] = maskSecrets(v);
    }
  }
  return out;
}

function pickClientIp(req: Request): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0]?.trim();
  if (Array.isArray(xff) && xff[0]) return String(xff[0]).split(',')[0]?.trim();
  return req.socket?.remoteAddress;
}

function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  const normalized = v.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  private emit(level: 'log' | 'error', payload: Record<string, unknown>, pretty: boolean) {
    const message = pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
    if (level === 'error') this.logger.error(message);
    else this.logger.log(message);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { sub?: string; role?: string } }>();
    const res = http.getResponse<Response>();

    const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
    const pretty = parseBool(process.env.LOG_HTTP_PRETTY, isDev);
    const includeHeaders = parseBool(process.env.LOG_HTTP_INCLUDE_HEADERS, false);
    const includeParams = parseBool(process.env.LOG_HTTP_INCLUDE_PARAMS, true);
    const includeContentType = parseBool(process.env.LOG_HTTP_INCLUDE_CONTENT_TYPE, true);
    const includeCookie = parseBool(process.env.LOG_HTTP_INCLUDE_COOKIE, false);
    const includeRequest = parseBool(process.env.LOG_HTTP_INCLUDE_REQUEST, true);
    const includeResponse = parseBool(process.env.LOG_HTTP_INCLUDE_RESPONSE, true);

    const requestId = res.locals?.requestId as string | undefined;
    const startedAt = (res.locals?.startAtMs as number | undefined) ?? Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = pickClientIp(req);
    const userId = req.user?.sub;
    const role = req.user?.role;

    const base: Record<string, unknown> = {
      ts: new Date().toISOString(),
      requestId,
      method,
      url,
      ip,
      userId,
      role,
    };

    const requestPart: Record<string, unknown> = {};
    if (includeParams) requestPart.params = maskSecrets(safeJson(req.params));
    if (includeRequest) {
      requestPart.query = maskSecrets(safeJson(req.query));
      requestPart.body = maskSecrets(safeJson(req.body));
    }
    if (includeHeaders) requestPart.headers = maskSecrets(safeJson(req.headers));
    if (includeContentType) {
      requestPart.contentType = req.headers['content-type'] ?? null;
      requestPart.accept = req.headers.accept ?? null;
    }
    if (includeCookie) requestPart.cookie = maskSecrets(safeJson(req.headers.cookie ?? null));
    if (req.headers['user-agent']) requestPart.userAgent = req.headers['user-agent'];

    this.emit('log', { ...base, request: requestPart }, pretty);

    return next.handle().pipe(
      tap((data) => {
        if (!includeResponse) return;
        const responsePart: Record<string, unknown> = {};
        const durationMs = Date.now() - startedAt;
        responsePart.statusCode = res.statusCode;
        responsePart.durationMs = durationMs;
        if (includeContentType) responsePart.contentType = res.getHeader('content-type') ?? null;
        responsePart.data = maskSecrets(safeJson(data));
        this.emit('log', { ...base, ts: new Date().toISOString(), response: responsePart }, pretty);
      }),
      catchError((err) => {
        if (!includeResponse) return throwError(() => err);
        const durationMs = Date.now() - startedAt;
        const responsePart: Record<string, unknown> = {
          statusCode: res.statusCode || 500,
          durationMs,
        };
        if (includeContentType) responsePart.contentType = res.getHeader('content-type') ?? null;
        responsePart.error = isDev
          ? { name: err?.name, message: err?.message, stack: err?.stack }
          : { name: err?.name, message: err?.message };
        this.emit('error', { ...base, ts: new Date().toISOString(), response: responsePart }, pretty);
        return throwError(() => err);
      }),
    );
  }
}

