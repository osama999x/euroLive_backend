import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'King Queen Live',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  apiVersion: process.env.API_VERSION || '1.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  swaggerUser: process.env.SWAGGER_USER || 'admin',
  swaggerPassword: process.env.SWAGGER_PASSWORD || 'admin123',
  throttleTtl: parseInt(process.env.THROTTLE_TTL, 10) || 60000,
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  bodyLimit: process.env.BODY_LIMIT || '10mb',
}));
