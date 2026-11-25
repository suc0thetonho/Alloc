import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { query, withTransaction } from '../src/database/client';
import { createAdminToken } from '../src/auth/token';

vi.mock('../src/database/client', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

const mockedQuery = vi.mocked(query);
const mockedWithTransaction = vi.mocked(withTransaction);
const adminToken = createAdminToken({ id: '1', email: 'admin@alloc.local' });

beforeEach(() => {
  mockedQuery.mockReset();
  mockedWithTransaction.mockReset();
  mockedWithTransaction.mockImplementation(async (callback) => callback({ query: mockedQuery } as never));
});

describe('Allocations API', () => {
  it('calcula a disponibilidade diária com intervalo inclusivo e manutenção', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ id: '1', name: 'Retroescavadeira', total_units: 3, maintenance_units: 1 }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [
        { day: '2026-12-10', occupied_units: 1 },
        { day: '2026-12-11', occupied_units: 2 },
        { day: '2026-12-12', occupied_units: 1 },
      ], rowCount: 3 } as never);

    const response = await request(app).get('/api/v1/machines/1/availability?startDate=2026-12-10&endDate=2026-12-12');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      totalUnits: 3,
      maintenanceUnits: 1,
      maxAllocatedInPeriod: 2,
      availableQuantity: 0,
      isAvailable: false,
    }));
    expect(response.body.data.calendar).toHaveLength(3);
  });

  it('bloqueia criação administrativa sem estoque em algum dia do intervalo', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ id: '1', name: 'Retroescavadeira', total_units: 3, maintenance_units: 1 }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ day: '2026-12-10', occupied_units: 1 }, { day: '2026-12-11', occupied_units: 2 }], rowCount: 2 } as never);

    const response = await request(app)
      .post('/api/v1/admin/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ machineId: 1, customerName: 'Obra Teste', location: 'Pesqueira/PE', startDate: '2026-12-10', endDate: '2026-12-11', quantity: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('cria uma alocação persistente quando há unidades livres em todo o período', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ id: '1', name: 'Retroescavadeira', total_units: 3, maintenance_units: 1 }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ day: '2026-12-10', occupied_units: 0 }, { day: '2026-12-11', occupied_units: 1 }], rowCount: 2 } as never)
      .mockResolvedValueOnce({ rows: [{ id: '8', machine_id: '1', customer_name: 'Obra Teste', location: 'Pesqueira/PE', start_date: '2026-12-10', end_date: '2026-12-11', quantity: 1, status: 'ativa' }], rowCount: 1 } as never);

    const response = await request(app)
      .post('/api/v1/admin/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ machineId: 1, customerName: 'Obra Teste', location: 'Pesqueira/PE', startDate: '2026-12-10', endDate: '2026-12-11', quantity: 1 });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(expect.objectContaining({ id: '8', machineId: '1', quantity: 1, status: 'ativa' }));
    expect(mockedWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockedQuery.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it('valida intervalo e quantidade antes de consultar o banco', async () => {
    const response = await request(app)
      .post('/api/v1/admin/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ machineId: 1, customerName: 'Obra Teste', startDate: '2026-12-12', endDate: '2026-12-10', quantity: 0 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_ALLOCATION');
    expect(mockedQuery).not.toHaveBeenCalled();
  });
});
