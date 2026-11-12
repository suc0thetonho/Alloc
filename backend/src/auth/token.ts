import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

export type AdminTokenPayload = {
  sub: string;
  email: string;
  role: 'ADMIN';
  jti: string;
  iat: number;
  exp: number;
};

const revokedTokens = new Set<string>();

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function sign(value: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(value).digest('base64url');
}

export function createAdminToken(user: { id: string; email: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: AdminTokenPayload = {
    sub: user.id,
    email: user.email,
    role: 'ADMIN',
    jti: randomUUID(),
    iat: now,
    exp: now + env.JWT_EXPIRES_IN_SECONDS,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${header}.${encodedPayload}.${sign(`${header}.${encodedPayload}`)}`;
}

export function revokeToken(token: string): void {
  revokedTokens.add(token);
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    if (!token || revokedTokens.has(token)) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, encodedPayload, signature] = parts;
    const expectedSignature = sign(`${header}.${encodedPayload}`);
    const received = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as AdminTokenPayload;
    if (payload.role !== 'ADMIN' || !payload.sub || !payload.email || !payload.jti) return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
