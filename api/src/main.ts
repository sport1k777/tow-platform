import 'reflect-metadata';
import 'dotenv/config';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http-exception.filter';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const origins = env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',').map((item) => item.trim());
  app.enableCors({ origin: origins });
  app.enableShutdownHooks();

  await app.listen(env.PORT);
  Logger.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start API: ${message}`);
  process.exit(1);
});
