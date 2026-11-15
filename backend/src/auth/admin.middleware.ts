import { NextFunction, Request, Response } from 'express';
import { verifyAdminToken } from './token';

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; email: string; role: 'ADMIN'; token: string };
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];
  const payload = scheme?.toLowerCase() === 'bearer' && token ? verifyAdminToken(token) : null;

  if (!payload) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Autenticação administrativa obrigatória.' },
    });
    return;
  }

  req.admin = { id: payload.sub, email: payload.email, role: payload.role, token };
  next();
}
