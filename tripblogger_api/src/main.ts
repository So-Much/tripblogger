import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { requestContextMiddleware } from './common/middleware/request-context.middleware';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  app.use(requestContextMiddleware);
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  const uploadsDir = join(process.cwd(), 'uploads');
  const avatarDir = join(uploadsDir, 'avatars');
  const postsDir = join(uploadsDir, 'posts');
  if (!existsSync(avatarDir)) mkdirSync(avatarDir, { recursive: true });
  if (!existsSync(postsDir)) mkdirSync(postsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
