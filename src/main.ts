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

  app.use(helmet());
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

  const swaggerEnabled =
    config.get<boolean>('app.swaggerEnabled') && env !== Environment.Production;

  if (swaggerEnabled) {
    app.use(
      ['/api-docs', '/docs-json'],
      basicAuth({
        challenge: true,
        users: {
          [config.get<string>('app.swaggerUser')]: config.get<string>('app.swaggerPassword'),
        },
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('King Queen Live API')
      .setDescription('King Queen Live application API')
      .setVersion(config.get<string>('app.apiVersion'))
      .addBearerAuth()
      .addServer(`http://localhost:${port}`, 'Local')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);
  }

  await app.listen(port);

  logger.log(`King Queen Live running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${env}`);
  if (swaggerEnabled) {
    logger.log(`Swagger: http://localhost:${port}/api-docs`);
  }
}

bootstrap();
