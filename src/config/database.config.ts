import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'kql',
  password: process.env.DB_PASSWORD || 'kql_secret',
  name: process.env.DB_DATABASE || 'king_queen_live',
  synchronize: process.env.DB_SYNC === 'true',
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.DB_SSL === 'true',
  poolMax: parseInt(process.env.DB_POOL_MAX, 10) || 20,
}));
