import dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis do arquivo .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DATABASE_URL: process.env.DATABASE_URL,
  DB_POOL_MAX: Number(process.env.DB_POOL_MAX) || 10,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-change-this-secret',
  JWT_EXPIRES_IN_SECONDS: Number(process.env.JWT_EXPIRES_IN_SECONDS) || 3600,
};
