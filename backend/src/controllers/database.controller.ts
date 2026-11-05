import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../database/client';

export async function databaseHealthController(_req: Request, res: Response): Promise<void> {
  try {
    await checkDatabaseConnection();
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
}
