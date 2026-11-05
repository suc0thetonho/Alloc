import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { query } from '../src/database/client';

vi.mock('../src/database/client', () => ({
  query: vi.fn(),
}));

const mockedQuery = vi.mocked(query);

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
});
