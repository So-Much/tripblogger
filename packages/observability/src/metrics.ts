import type { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

export type ServiceMetrics = {
  registry: Registry;
  httpDuration: Histogram<'method' | 'route' | 'status'>;
  /** Times every request and answers `GET /metrics` itself (outside the `/api` prefix). */
  middleware: (req: Request, res: Response, next: NextFunction) => void;
  gauge: (name: string, help: string, collect: () => Promise<number> | number) => Gauge;
  counter: (name: string, help: string, labelNames?: string[]) => Counter;
};

/** Route template (e.g. `/api/trips/:id`) keeps label cardinality bounded. */
function routeLabel(req: Request): string {
  const path = (req.route as { path?: string } | undefined)?.path;
  return path ? `${req.baseUrl ?? ''}${path}` : 'unmatched';
}

export function createServiceMetrics(service: string): ServiceMetrics {
  const registry = new Registry();
  registry.setDefaultLabels({ service });
  collectDefaultMetrics({ register: registry });

  const httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  return {
    registry,
    httpDuration,
    middleware(req, res, next) {
      if (req.path === '/metrics') {
        if (req.method !== 'GET') return next();
        registry
          .metrics()
          .then((body) => {
            res.setHeader('Content-Type', registry.contentType);
            res.end(body);
          })
          .catch(next);
        return;
      }
      const end = httpDuration.startTimer();
      res.on('finish', () => end({ method: req.method, route: routeLabel(req), status: String(res.statusCode) }));
      next();
    },
    gauge(name, help, collect) {
      return new Gauge({
        name,
        help,
        registers: [registry],
        async collect() {
          try {
            this.set(await collect());
          } catch {
            this.set(-1);
          }
        },
      });
    },
    counter(name, help, labelNames = []) {
      return new Counter({ name, help, labelNames, registers: [registry] });
    },
  };
}
