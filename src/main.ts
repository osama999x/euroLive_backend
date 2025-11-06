import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import * as basicAuth from 'express-basic-auth';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const SWAGGER_ENVS = ['local', 'development', 'qa', 'staging'];
  const app = await NestFactory.create(AppModule);

  // Disable console logs in production
  if (process.env.NODE_ENV === 'production') {
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
  }

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS with proper configuration
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Rate limiting configuration
  const limiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 100, // Max 100 requests
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(
        '\n\x1b[41m\x1b[30m===== RATE LIMITER ALERT =====\x1b[0m\n' +
          '\x1b[33m🚨 Too many requests from IP:',
        req.ip,
        '🚨\x1b[0m\n',
      );

      res.status(429).json({
        message: 'Too many requests, please try again after 2 minutes.',
      });
    },
  });

  app.use(limiter);

  // Body parser configuration for large payloads
  app.use(json({ limit: '400mb' }));
  app.use(urlencoded({ limit: '400mb', extended: true }));

  // Swagger configuration
  if (SWAGGER_ENVS.includes(process.env.NODE_ENV)) {
    app.use(
      ['/api-docs', '/docs-json'],
      basicAuth({
        challenge: true,
        users: {
          [process.env.SWAGGER_USER]: process.env.SWAGGER_PASSWORD,
        },
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('RishtaNagar API Documentation')
      .setDescription(
        'Comprehensive API documentation for the RishtaNagar matrimonial platform, providing endpoints to manage users, authentication, cities, religions, and related operations.',
      )
      .addBearerAuth()
      .addServer('http://localhost:3000', 'Local Environment')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('\n\x1b[44m\x1b[1m===== SERVER STARTED =====\x1b[0m\n');
  console.log(`\x1b[36m🚀 Application running on:\x1b[0m \x1b[32mhttp://localhost:${port}\x1b[0m`);
  console.log(`\x1b[36m📚 API Documentation:\x1b[0m \x1b[32mhttp://localhost:${port}/api-docs\x1b[0m`);
  console.log(`\x1b[36m🌍 Environment:\x1b[0m \x1b[32m${process.env.NODE_ENV || 'development'}\x1b[0m`);
  console.log('\n\x1b[44m\x1b[1m==========================\x1b[0m\n');
}
bootstrap();
