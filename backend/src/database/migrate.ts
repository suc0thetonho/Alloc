import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { closeDatabasePool, query } from './client';

const schemaPath = path.resolve(
  process.cwd(),
  '..',
  'database',
  'Banco de Dados',
  'banco de dados',
  '01_estrutura_inicial.sql',
);

async function main(): Promise<void> {
  try {
    const schema = await readFile(schemaPath, 'utf8');
    await query(schema);
    console.log(`Esquema inicial aplicado a partir de ${schemaPath}`);
  } catch (error) {
    console.error('Falha ao aplicar o esquema inicial:', error);
    process.exitCode = 1;
  } finally {
    await closeDatabasePool();
  }
}

void main();
