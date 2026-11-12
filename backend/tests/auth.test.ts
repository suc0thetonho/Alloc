import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { query } from '../src/database/client';
import { hashPassword } from '../src/auth/password';

vi.mock('../src/database/client', () => ({ query: vi.fn() }));

const mockedQuery = vi.mocked(query);

describe('Admin authentication', () => {
  it('mantém o catálogo público', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const response = await request(app).get('/api/v1/machines');
    expect(response.status).toBe(200);
  });

  it('bloqueia área administrativa sem token', async () => {
    const response = await request(app).get('/api/v1/admin/health');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('faz login, acessa rota protegida e invalida o token no logout', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: '1', nome: 'Admin', email: 'admin@alloc.local', password_hash: hashPassword('SenhaSegura!'), role: 'ADMIN' }],
      rowCount: 1,
    } as never);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ADMIN@ALLOC.LOCAL', password: 'SenhaSegura!' });
    expect(login.status).toBe(200);
    expect(login.body.data.token).toEqual(expect.any(String));

    const token = login.body.data.token as string;
    expect((await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/admin/health').set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`)).status).toBe(204);
    expect((await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  it('rejeita credenciais inválidas', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const response = await request(app).post('/api/v1/auth/login').send({ email: 'admin@alloc.local', password: 'errada' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
