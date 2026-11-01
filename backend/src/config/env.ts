import dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis do arquivo .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
