import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';

let pool: Pool | undefined;

export function getDatabasePool(): Pool {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL não foi configurada. Defina-a no arquivo .env.');
  }

  pool ??= new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
  });

  return pool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> {
  return getDatabasePool().query<T>(text, values);
}

export async function checkDatabaseConnection(): Promise<void> {
  await query('SELECT 1 AS connected');
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
