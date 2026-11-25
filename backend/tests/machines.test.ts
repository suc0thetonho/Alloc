import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { query } from '../src/database/client';
import { createAdminToken } from '../src/auth/token';

vi.mock('../src/database/client', () => ({
  query: vi.fn(),
}));

const mockedQuery = vi.mocked(query);
const adminToken = createAdminToken({ id: '1', email: 'admin@alloc.local' });

describe('Machines API', () => {
  it('GET /api/v1/machines retorna máquinas no formato do catálogo', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({
        rows: [{
          id: '1',
          name: 'Retroescavadeira',
          type: 'retroescavadeira',
          brand: 'Caterpillar',
          model: '416F2',
          purpose: 'Escavação e movimentação de terra',
          description: null,
          image_url: null,
          origin: 'propria',
          partner_name: null,
          total_units: 3,
          maintenance_units: 1,
          available_units: 2,
        }],
        rowCount: 1,
      } as never);

    const response = await request(app).get('/api/v1/machines?type=retroescavadeira');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [expect.objectContaining({
        name: 'Retroescavadeira',
        origin: 'propria',
        totalUnits: 3,
        maintenanceUnits: 1,
        availableUnits: 2,
        availableNow: true,
      })],
      meta: { page: 1, limit: 12, total: 1 },
    });
  });

  it('retorna lista vazia quando não há máquinas', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const response = await request(app).get('/api/v1/machines');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [],
      meta: { page: 1, limit: 12, total: 0 },
    });
  });

  it('GET /api/v1/machines/:id retorna os detalhes de uma máquina ativa', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{
      id: '1', name: 'Retroescavadeira', type: 'retroescavadeira', brand: 'JCB', model: '3CX',
      purpose: 'Escavação', description: 'Máquina de teste', image_url: null, origin: 'propria',
      partner_name: null, total_units: 2, maintenance_units: 0, available_units: 2,
    }], rowCount: 1 } as never);

    const response = await request(app).get('/api/v1/machines/1');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ id: '1', model: '3CX', availableNow: true }));
  });

  it('protege o CRUD administrativo contra acesso sem token', async () => {
    const response = await request(app).post('/api/v1/admin/machines').send({});
    expect(response.status).toBe(401);
  });

  it('valida quantidade e campos obrigatórios no cadastro administrativo', async () => {
    const response = await request(app)
      .post('/api/v1/admin/machines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Gerador', totalUnits: 0, maintenanceUnits: 1 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_MACHINE');
  });

  it('cadastra uma máquina para o administrador', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{
      id: '10', name: 'Gerador', type: 'energia', brand: 'Honda', model: 'GX',
      purpose: 'Fornecer energia', description: null, image_url: null, origin: 'propria',
      partner_name: null, total_units: 2, maintenance_units: 0, available_units: 2, ativo: true,
    }], rowCount: 1 } as never);

    const response = await request(app)
      .post('/api/v1/admin/machines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Gerador', type: 'energia', brand: 'Honda', model: 'GX', purpose: 'Fornecer energia', totalUnits: 2 });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(expect.objectContaining({ id: '10', name: 'Gerador', totalUnits: 2 }));
    expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO maquinas'), expect.arrayContaining(['Gerador', 'energia', 'Honda', 'GX']));
  });

  it('diferencia máquina de terceiro e calcula 3 unidades com 1 em manutenção', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{
      id: '11', name: 'Retroescavadeira', type: 'escavacao', brand: 'JCB', model: '3CX',
      purpose: 'Escavar', description: null, image_url: null, origin: 'terceiros',
      partner_name: 'Parceiro Teste', partner_contact: 'contato@parceiro.test',
      total_units: 3, maintenance_units: 1, available_units: 2, ativo: true,
    }], rowCount: 1 } as never);

    const response = await request(app)
      .post('/api/v1/admin/machines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Retroescavadeira', type: 'escavacao', brand: 'JCB', model: '3CX', purpose: 'Escavar',
        originType: 'PARTNER', partnerName: 'Parceiro Teste', partnerContact: 'contato@parceiro.test',
        totalUnits: 3, maintenanceUnits: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(expect.objectContaining({ origin: 'terceiros', totalUnits: 3, maintenanceUnits: 1, availableUnits: 2 }));
    expect(response.body.data.partnerContact).toBe('contato@parceiro.test');
  });

  it('aceita estoque total igual a zero quando não há unidades em manutenção', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{
      id: '12', name: 'Máquina futura', type: 'teste', brand: 'Marca', model: 'Modelo',
      purpose: 'Cadastro futuro', description: null, image_url: null, origin: 'propria', partner_name: null,
      total_units: 0, maintenance_units: 0, available_units: 0, ativo: true,
    }], rowCount: 1 } as never);

    const response = await request(app)
      .post('/api/v1/admin/machines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Máquina futura', type: 'teste', brand: 'Marca', model: 'Modelo', purpose: 'Cadastro futuro', totalUnits: 0, maintenanceUnits: 0 });

    expect(response.status).toBe(201);
    expect(response.body.data.availableUnits).toBe(0);
    expect(response.body.data.availableNow).toBe(false);
  });
});
