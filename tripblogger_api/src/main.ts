import './tracing';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import helmet from 'helmet';
import { requestContextMiddleware } from './common/middleware/request-context.middleware';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { HELMET_OPTIONS } from './config/http-security';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { metrics } from './config/otel/metrics';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bufferLogs: process.env.NODE_ENV !== 'test',
  });
  if (process.env.NODE_ENV !== 'test') {
    app.useLogger(app.get(Logger));
  }
  // Traefik is the only hop in front; trust it so req.ip (rate limiting) is the client.
  app.set('trust proxy', 1);
  // Serves /metrics outside the /api prefix, so Traefik never routes it publicly.
  app.use(metrics.middleware);
  app.use(helmet(HELMET_OPTIONS));
  app.use(requestContextMiddleware);
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  // With STORAGE_DRIVER=s3 the gateway serves /uploads straight from the bucket.
  if (process.env.STORAGE_DRIVER !== 's3') {
    app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  }
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
