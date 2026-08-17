import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, raw, urlencoded, type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';

const CLIENT_HEADER = 'x-hiteam-client';
const CLIENT_PLATFORM_HEADER = 'x-hiteam-client-platform';
const CLIENT_VERSION_HEADER = 'x-hiteam-client-version';
const requestLogger = new Logger('ClientRequest');

function logClientRequest(request: Request, response: Response, startedAt: number) {
  const client = String(request.header(CLIENT_HEADER) ?? '').trim().toLowerCase();
  if (!client) return;

  const platform = String(request.header(CLIENT_PLATFORM_HEADER) ?? '').trim().toLowerCase();
  const version = String(request.header(CLIENT_VERSION_HEADER) ?? '').trim();
  const safeClient = ['mobile', 'web', 'web-admin-server'].includes(client) ? client : 'unknown';
  const safePlatform = /^[a-z0-9._-]{1,32}$/.test(platform) ? platform : 'unknown';
  const safeVersion = /^[a-z0-9._-]{1,64}$/.test(version) ? version : 'unknown';
  const durationMs = Date.now() - startedAt;

  requestLogger.log(
    `client=${safeClient} platform=${safePlatform} version=${safeVersion} ${request.method} ${request.path} status=${response.statusCode} durationMs=${durationMs}`,
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  app.setGlobalPrefix('api/v1');
  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    response.once('finish', () => logClientRequest(request, response, startedAt));
    next();
  });
  app.use('/api/v1/billing/webhook', raw({ type: 'application/json' }));
  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ extended: true, limit: '8mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
