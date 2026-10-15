import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import basicAuth from 'express-basic-auth';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './infrastructure/redis/redis-io.adapter';
import { Environment } from './common/enums';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = config.get<number>('app.port');
  const apiPrefix = config.get<string>('app.apiPrefix');
  const env = config.get<string>('app.env');
  const bodyLimit = config.get<string>('app.bodyLimit');
  const corsOrigin = config.get<string>('app.corsOrigin');
  const swaggerEnabled =
    config.get<boolean>('app.swaggerEnabled') && env !== Environment.Production;

  app.use(
    helmet({
      contentSecurityPolicy: swaggerEnabled ? false : undefined,
      crossOriginEmbedderPolicy: swaggerEnabled ? false : undefined,
    }),
  );
  app.use(compression());
  app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));

  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((item) => item.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  app.setGlobalPrefix(apiPrefix);
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const redisIoAdapter = new RedisIoAdapter(app, config);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  if (swaggerEnabled) {
    const swaggerUser = config.get<string>('app.swaggerUser');
    const swaggerPassword = config.get<string>('app.swaggerPassword');
    app.use(
      ['/api/docs', '/api-docs', '/docs', '/api/docs-json', '/api-docs-json', '/docs-json'],
      basicAuth({
        challenge: true,
        users: { [swaggerUser]: swaggerPassword },
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('King Queen Live API')
      .setDescription(
        [
          'All HTTP APIs are listed here (Admin, Reseller, Agency, App, Host).',
          '',
          '**App / Flutter** — filter tags: App Auth, App Security, App Reports, App Rooms, Host Portal.',
          'Login with `POST /api/v1/app/auth/login` `{ login, password, deviceId?, deviceName? }`, then Authorize with the accessToken.',
          'Host routes use the same app JWT (user must have a host profile).',
          '',
          '**Not REST (not in this list):** Socket.IO namespace `/live` event `ping` → `pong`. Live video, gifts, PK, chat are not built.',
        ].join('\n'),
      )
      .setVersion(config.get<string>('app.apiVersion'))
      .addBearerAuth()
      .addServer(`http://localhost:${port}`, 'Local')
      .addServer(`http://92.205.16.74:3000`, 'Server')
      .addTag('App Auth', 'Consumer and host login / me')
      .addTag('App Security', 'Devices, logout-all, self-freeze')
      .addTag('App Reports', 'User Report Center')
      .addTag('App Rooms', 'Room-admin mute')
      .addTag('Host Portal', 'Host rooms, SOS, complaints, PIN salary')
      .addTag('Admin Auth', 'Staff login, 2FA, forgot-password')
      .addTag('Admin Users', 'Users, Official flag, ID/device/live bans')
      .addTag('Admin Dashboard', 'KPI snapshot')
      .addTag('Admin Wallets', 'Manual coin adjust')
      .addTag('Admin Catalog', 'Frames, entries, badges, wallpapers')
      .addTag('Admin Resellers', 'Reseller CRUD, balance, permissions')
      .addTag('Admin Roles', 'Staff, roles, permissions')
      .addTag('Admin Audit', 'Immutable action log')
      .addTag('Admin Agencies', 'Agency CRUD and freeze')
      .addTag('Admin Hosts', 'Hosts, protection lock, freeze')
      .addTag('Admin Salary', 'Countries, rules, hours, 3-day hold payouts')
      .addTag('Admin Complaints', 'Fair-review queue')
      .addTag('Admin SOS', 'SOS queue')
      .addTag('Admin Rooms', 'Room list')
      .addTag('Admin Freezes', 'Master freeze / review')
      .addTag('Admin Fraud', 'Unusual coin-jump cases')
      .addTag('Admin Backups', 'Backup settings and runs')
      .addTag('Reseller Auth', 'Reseller login and OTP reset')
      .addTag('Reseller Portal', 'Coins, assign frames/entries/badges, reports')
      .addTag('Reseller Users', 'Lookup user by publicId')
      .addTag('Reseller SOS', 'Official/reseller SOS ack')
      .addTag('Agency Auth', 'Agency login')
      .addTag('Agency Portal', 'Share totals and host roster')
      .addTag('Auth', 'Shared refresh / logout')
      .addTag('Health', 'Liveness and readiness')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    const swaggerOptions = { useGlobalPrefix: false };
    SwaggerModule.setup('api/docs', app, document, swaggerOptions);
    SwaggerModule.setup('api-docs', app, document, swaggerOptions);
    SwaggerModule.setup('docs', app, document, swaggerOptions);
  }

  await app.listen(port);

  logger.log(`King Queen Live running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${env}`);
  if (swaggerEnabled) {
    logger.log(`Swagger: http://localhost:${port}/api/docs  (HTTP Basic ${config.get<string>('app.swaggerUser')})`);
  }
}

bootstrap();
