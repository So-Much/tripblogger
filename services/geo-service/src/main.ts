import './tracing';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { requestContextMiddleware } from '@tripblogger/observability';
import { AppModule } from './app.module';
import { metrics } from './observability';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  // Traefik is the only hop in front; trust it so req.ip (rate limiting) is the client.
  app.set('trust proxy', 1);
  app.use(requestContextMiddleware({ service: 'geo-service', accessLog: true }));
  // Serves /metrics outside the /api prefix, so Traefik never routes it publicly.
  app.use(metrics.middleware);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3003);
  await app.listen(port);
}

bootstrap();
