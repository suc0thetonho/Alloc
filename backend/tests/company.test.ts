import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { query } from '../src/database/client';
import { createAdminToken } from '../src/auth/token';

vi.mock('../src/database/client', () => ({ query: vi.fn() }));

const mockedQuery = vi.mocked(query);
const adminToken = createAdminToken({ id: '1', email: 'admin@alloc.local' });

const companyRow = {
  id: '1', name: 'Alloc Máquinas', description: 'Locação de equipamentos', phone: '11999999999',
  whatsapp: '5511999999999', city: 'São Paulo', state: 'SP', logo_url: 'https://cdn.example.com/logo.png',
  primary_color: '#176B43',
};

describe('Company API', () => {
  it('consulta o perfil publicamente', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [companyRow], rowCount: 1 } as never);
    const response = await request(app).get('/api/v1/company');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ name: 'Alloc Máquinas', logoUrl: companyRow.logo_url }));
  });

  it('bloqueia atualização sem autenticação', async () => {
    const response = await request(app).patch('/api/v1/company').send({ name: 'Novo nome' });
    expect(response.status).toBe(401);
  });

  it('valida os campos do perfil', async () => {
    const response = await request(app)
      .patch('/api/v1/company')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ logoUrl: 'javascript:alert(1)' });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_LOGO_URL');
  });

  it('persiste e retorna os dados atualizados para o administrador', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ ...companyRow, name: 'Alloc Link', primary_color: '#123456' }], rowCount: 1 } as never);
    const response = await request(app)
      .patch('/api/v1/company')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alloc Link', primaryColor: '#123456' });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ name: 'Alloc Link', primaryColor: '#123456' }));
    expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE empresas SET nome = $1, cor_principal = $2'), ['Alloc Link', '#123456']);
  });

  it('retorna erro quando o perfil ainda não existe', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const response = await request(app).get('/api/v1/company');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('COMPANY_NOT_CONFIGURED');
  });
});
