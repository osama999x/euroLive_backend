import * as Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('local', 'development', 'test', 'production', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),

  /**
   * Database config (MySQL with TypeORM)
   */
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(3306),
  DB_USERNAME: Joi.string().default('root'),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_DATABASE: Joi.string().default('rishtanagar'),

  /**
   * JWT Secrets
   */
  JWT_SECRET: Joi.string().default('your_jwt_secret_change_in_production'),
  REFRESH_KEY: Joi.string().default('your_refresh_key_change_in_production'),
  ACCESS_TOKEN_EXPIRES_IN: Joi.number().default(3600),
  REFRESH_KEY_EXPIRES_IN: Joi.number().default(36000),

  /**
   * Google OAuth
   */
  GOOGLE_CLIENT_ID: Joi.string().optional(),

  /**
   * Mail Config
   */
  MAIL_HOST: Joi.string().default('smtp.gmail.com'),
  MAIL_PORT: Joi.number().default(465),
  MAIL_ADDRESS: Joi.string().email().optional(),
  MAIL_PASSWORD: Joi.string().optional(),

  /**
   * Swagger Credentials
   */
  SWAGGER_USER: Joi.string().default('admin'),
  SWAGGER_PASSWORD: Joi.string().default('admin123'),
});
