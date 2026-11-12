import { Request, Response } from 'express';
import { query } from '../database/client';
import { verifyPassword } from '../auth/password';
import { createAdminToken, revokeToken } from '../auth/token';
import { env } from '../config/env';

type AdminRow = { id: string; nome: string; email: string; password_hash: string; role: 'ADMIN' };

export async function loginController(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'E-mail e senha são obrigatórios.' },
    });
    return;
  }

  const result = await query<AdminRow>(
    `SELECT id::text, nome, email, password_hash, role
       FROM usuarios
      WHERE LOWER(email) = $1 AND ativo = TRUE
      LIMIT 1`,
    [email],
  );
  const admin = result.rows[0];

  if (!admin || admin.role !== 'ADMIN' || !verifyPassword(password, admin.password_hash)) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.' },
    });
    return;
  }

  const token = createAdminToken({ id: admin.id, email: admin.email });
  res.status(200).json({
    success: true,
    data: {
      token,
      tokenType: 'Bearer',
      expiresIn: env.JWT_EXPIRES_IN_SECONDS,
      user: { id: admin.id, name: admin.nome, email: admin.email, role: admin.role },
    },
  });
}

export function meController(req: Request, res: Response): void {
  res.status(200).json({ success: true, data: req.admin });
}

export function logoutController(req: Request, res: Response): void {
  if (req.admin?.token) revokeToken(req.admin.token);
  res.status(204).send();
}
