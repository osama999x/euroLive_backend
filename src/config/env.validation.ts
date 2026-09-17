import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('King Queen Live'),
  API_PREFIX: Joi.string().default('api/v1'),
  API_VERSION: Joi.string().default('1.0.0'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('kql'),
  DB_PASSWORD: Joi.string().allow('').default('kql_secret'),
  DB_DATABASE: Joi.string().default('king_queen_live'),
  DB_SYNC: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_MAX: Joi.number().default(20),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_TTL: Joi.number().default(3600),
  REDIS_KEY_PREFIX: Joi.string().default('kql:'),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  SEED_ADMIN_EMAIL: Joi.string().email().default('admin@kinglive.local'),
  SEED_ADMIN_USERNAME: Joi.string().default('superadmin'),
  SEED_ADMIN_PASSWORD: Joi.string().default('ChangeMe@Admin1'),

  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().default(587),
  MAIL_USER: Joi.string().optional(),
  MAIL_PASSWORD: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),

  CORS_ORIGIN: Joi.string().default('*'),
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_USER: Joi.string().default('admin'),
  SWAGGER_PASSWORD: Joi.string().default('admin123'),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
  BODY_LIMIT: Joi.string().default('10mb'),
});
