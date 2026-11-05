import { checkDatabaseConnection, closeDatabasePool } from './client';

async function main(): Promise<void> {
  try {
    await checkDatabaseConnection();
    console.log('Consulta de teste executada com sucesso: SELECT 1');
  } catch (error) {
    console.error('Falha na consulta de teste ao banco:', error);
    process.exitCode = 1;
  } finally {
    await closeDatabasePool();
  }
}

void main();
