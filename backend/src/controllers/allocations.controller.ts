import { Request, Response } from 'express';
import { query, withTransaction } from '../database/client';
import type { PoolClient } from 'pg';

type AllocationRow = {
  id: string;
  machine_id: string;
  machine_name?: string;
  customer_name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  quantity: number;
  status: 'ativa' | 'encerrada' | 'cancelada';
};

type MachineStockRow = {
  id: string;
  name: string;
  total_units: number;
  maintenance_units: number;
};

type AllocationPayload = {
  machineId?: unknown;
  customerName?: unknown;
  location?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  quantity?: unknown;
};

const ALLOCATION_FIELDS = new Set(['machineId', 'customerName', 'location', 'startDate', 'endDate', 'quantity']);

function errorResponse(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

function parseId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) ? value : null;
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validatePayload(body: AllocationPayload, partial: boolean): string | null {
  const unknownFields = Object.keys(body).filter((field) => !ALLOCATION_FIELDS.has(field));
  if (unknownFields.length > 0) return `Campos não permitidos: ${unknownFields.join(', ')}.`;
  if (Object.keys(body).length === 0) return partial ? 'Informe ao menos um campo para atualizar.' : 'Informe os dados da alocação.';

  if ((!partial || 'machineId' in body) && !parseId(body.machineId)) return 'machineId deve ser um número inteiro positivo.';
  if ((!partial || 'customerName' in body) && (typeof body.customerName !== 'string' || body.customerName.trim().length === 0 || body.customerName.trim().length > 120)) return 'customerName é obrigatório e deve ter até 120 caracteres.';
  if ('location' in body && body.location !== null && (typeof body.location !== 'string' || body.location.trim().length > 160)) return 'location deve ter até 160 caracteres.';
  if ((!partial || 'startDate' in body) && !isDate(body.startDate)) return 'startDate deve estar no formato YYYY-MM-DD.';
  if ((!partial || 'endDate' in body) && !isDate(body.endDate)) return 'endDate deve estar no formato YYYY-MM-DD.';
  if (body.startDate !== undefined && body.endDate !== undefined && String(body.endDate) < String(body.startDate)) return 'endDate deve ser igual ou posterior a startDate.';
  if ((!partial || 'quantity' in body) && (!Number.isInteger(body.quantity) || Number(body.quantity) <= 0)) return 'quantity deve ser um número inteiro maior que zero.';
  return null;
}

function allocationData(row: AllocationRow) {
  return {
    id: row.id,
    machineId: row.machine_id,
    ...(row.machine_name === undefined ? {} : { machineName: row.machine_name }),
    customerName: row.customer_name,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    quantity: row.quantity,
    status: row.status,
  };
}

function normalizedValues(body: AllocationPayload) {
  return {
    machineId: body.machineId,
    customerName: typeof body.customerName === 'string' ? body.customerName.trim() : body.customerName,
    location: typeof body.location === 'string' ? body.location.trim() : body.location ?? null,
    startDate: body.startDate,
    endDate: body.endDate,
    quantity: body.quantity,
  };
}

async function getMachineStock(machineId: string): Promise<MachineStockRow | undefined> {
  const result = await query<MachineStockRow>(
    `SELECT id::text, nome AS name, quantidade_total AS total_units,
            quantidade_manutencao AS maintenance_units
       FROM maquinas
      WHERE id = $1 AND ativo = TRUE`,
    [machineId],
  );
  return result.rows[0];
}

async function getMachineStockForUpdate(client: PoolClient, machineId: string): Promise<MachineStockRow | undefined> {
  const result = await client.query<MachineStockRow>(
    `SELECT id::text, nome AS name, quantidade_total AS total_units,
            quantidade_manutencao AS maintenance_units
       FROM maquinas
      WHERE id = $1 AND ativo = TRUE
      FOR UPDATE`,
    [machineId],
  );
  return result.rows[0];
}

async function getDailyAvailabilityForClient(client: PoolClient, machineId: string, startDate: string, endDate: string, excludeAllocationId?: string) {
  const result = await client.query<{ day: string; occupied_units: number }>(
    `WITH days AS (
       SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS day
     )
     SELECT days.day::text,
            COALESCE(SUM(a.quantidade), 0)::int AS occupied_units
       FROM days
       LEFT JOIN alocacoes a
         ON a.maquina_id = $1
        AND a.status = 'ativa'
        AND a.id <> COALESCE($4::bigint, 0)
        AND a.data_inicio <= days.day
        AND a.data_fim >= days.day
      GROUP BY days.day
      ORDER BY days.day`,
    [machineId, startDate, endDate, excludeAllocationId ?? null],
  );
  return result.rows;
}

function availabilityFromRows(machine: MachineStockRow, rows: Array<{ day: string; occupied_units: number }>, quantity: number) {
  const maintenanceAvailable = Math.max(0, machine.total_units - machine.maintenance_units);
  const days = rows.map((day) => ({
    date: day.day,
    occupiedUnits: Number(day.occupied_units),
    availableUnits: Math.max(0, maintenanceAvailable - Number(day.occupied_units)),
  }));
  return { days, available: days.every((day) => day.availableUnits >= quantity) };
}

async function getDailyAvailability(machineId: string, startDate: string, endDate: string, excludeAllocationId?: string) {
  const result = await query<{ day: string; occupied_units: number }>(
    `WITH days AS (
       SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS day
     )
     SELECT days.day::text,
            COALESCE(SUM(a.quantidade), 0)::int AS occupied_units
       FROM days
       LEFT JOIN alocacoes a
         ON a.maquina_id = $1
        AND a.status = 'ativa'
        AND a.id <> COALESCE($4::bigint, 0)
        AND a.data_inicio <= days.day
        AND a.data_fim >= days.day
      GROUP BY days.day
      ORDER BY days.day`,
    [machineId, startDate, endDate, excludeAllocationId ?? null],
  );
  return result.rows;
}

async function checkAvailability(machineId: string, startDate: string, endDate: string, quantity: number, excludeAllocationId?: string) {
  const machine = await getMachineStock(machineId);
  if (!machine) return { machine: undefined, days: [], available: false };
  const days = await getDailyAvailability(machineId, startDate, endDate, excludeAllocationId);
  const availability = availabilityFromRows(machine, days, quantity);
  return { machine, ...availability };
}

export async function getMachineAvailabilityController(req: Request, res: Response): Promise<void> {
  const machineId = parseId(req.params.id);
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  if (!machineId) return errorResponse(res, 400, 'INVALID_ID', 'O ID da máquina deve ser um número inteiro positivo.');
  if (!isDate(startDate) || !isDate(endDate)) return errorResponse(res, 422, 'INVALID_PERIOD', 'startDate e endDate são obrigatórios no formato YYYY-MM-DD.');
  if (endDate < startDate) return errorResponse(res, 422, 'INVALID_PERIOD', 'endDate deve ser igual ou posterior a startDate.');

  const result = await checkAvailability(machineId, startDate, endDate, 1);
  if (!result.machine) return errorResponse(res, 404, 'MACHINE_NOT_FOUND', 'Máquina não encontrada.');
  const maintenanceAvailable = Math.max(0, result.machine.total_units - result.machine.maintenance_units);
  const maxOccupied = result.days.reduce((max, day) => Math.max(max, day.occupiedUnits), 0);
  const availableQuantity = Math.max(0, maintenanceAvailable - maxOccupied);
  res.status(200).json({
    success: true,
    data: {
      machineId,
      period: { startDate, endDate },
      totalUnits: result.machine.total_units,
      maintenanceUnits: result.machine.maintenance_units,
      maxAllocatedInPeriod: maxOccupied,
      availableQuantity,
      isAvailable: availableQuantity > 0,
      calendar: result.days,
    },
  });
}

export async function listAllocationsController(req: Request, res: Response): Promise<void> {
  const values: unknown[] = [];
  const filters: string[] = [];
  if (typeof req.query.machineId === 'string' && parseId(req.query.machineId)) {
    values.push(req.query.machineId);
    filters.push(`a.maquina_id = $${values.length}`);
  }
  if (typeof req.query.status === 'string' && ['ativa', 'encerrada', 'cancelada'].includes(req.query.status)) {
    values.push(req.query.status);
    filters.push(`a.status = $${values.length}`);
  }
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await query<AllocationRow>(
    `SELECT a.id::text, a.maquina_id::text AS machine_id, m.nome AS machine_name,
            a.nome_cliente AS customer_name, a.local_servico AS location,
            a.data_inicio::text AS start_date, a.data_fim::text AS end_date,
            a.quantidade AS quantity, a.status
       FROM alocacoes a
       JOIN maquinas m ON m.id = a.maquina_id
       ${where}
      ORDER BY a.data_inicio, a.id`,
    values,
  );
  res.status(200).json({ success: true, data: result.rows.map(allocationData), meta: { total: result.rows.length } });
}

export async function getAllocationController(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'O ID da alocação deve ser um número inteiro positivo.');
  const result = await query<AllocationRow>(
    `SELECT a.id::text, a.maquina_id::text AS machine_id, m.nome AS machine_name,
            a.nome_cliente AS customer_name, a.local_servico AS location,
            a.data_inicio::text AS start_date, a.data_fim::text AS end_date,
            a.quantidade AS quantity, a.status
       FROM alocacoes a JOIN maquinas m ON m.id = a.maquina_id WHERE a.id = $1`,
    [id],
  );
  if (!result.rows[0]) return errorResponse(res, 404, 'ALLOCATION_NOT_FOUND', 'Alocação não encontrada.');
  res.status(200).json({ success: true, data: allocationData(result.rows[0]) });
}

export async function createAllocationController(req: Request, res: Response): Promise<void> {
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as AllocationPayload;
  const validationError = validatePayload(body, false);
  if (validationError) return errorResponse(res, 422, 'INVALID_ALLOCATION', validationError);
  const values = normalizedValues(body);
  const result = await withTransaction(async (client) => {
    const machine = await getMachineStockForUpdate(client, String(values.machineId));
    if (!machine) return { kind: 'machine-not-found' as const };
    const rows = await getDailyAvailabilityForClient(client, String(values.machineId), String(values.startDate), String(values.endDate));
    const availability = availabilityFromRows(machine, rows, Number(values.quantity));
    if (!availability.available) return { kind: 'insufficient-stock' as const };
    const insertResult = await client.query<AllocationRow>(
      `INSERT INTO alocacoes (maquina_id, nome_cliente, local_servico, data_inicio, data_fim, quantidade)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id::text, maquina_id::text AS machine_id, nome_cliente AS customer_name,
                 local_servico AS location, data_inicio::text AS start_date,
                 data_fim::text AS end_date, quantidade AS quantity, status`,
      [values.machineId, values.customerName, values.location, values.startDate, values.endDate, values.quantity],
    );
    return { kind: 'created' as const, allocation: insertResult.rows[0] };
  });
  if (result.kind === 'machine-not-found') return errorResponse(res, 404, 'MACHINE_NOT_FOUND', 'Máquina não encontrada.');
  if (result.kind === 'insufficient-stock') return errorResponse(res, 409, 'INSUFFICIENT_STOCK', 'Não há unidades livres para todo o período informado.');
  res.status(201).json({ success: true, data: allocationData(result.allocation) });
}

export async function updateAllocationController(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'O ID da alocação deve ser um número inteiro positivo.');
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as AllocationPayload;
  const validationError = validatePayload(body, true);
  if (validationError) return errorResponse(res, 422, 'INVALID_ALLOCATION', validationError);
  const currentResult = await query<AllocationRow>('SELECT id::text, maquina_id::text AS machine_id, nome_cliente AS customer_name, local_servico AS location, data_inicio::text AS start_date, data_fim::text AS end_date, quantidade AS quantity, status FROM alocacoes WHERE id = $1', [id]);
  const current = currentResult.rows[0];
  if (!current) return errorResponse(res, 404, 'ALLOCATION_NOT_FOUND', 'Alocação não encontrada.');
  if (current.status !== 'ativa') return errorResponse(res, 409, 'ALLOCATION_CLOSED', 'Apenas alocações ativas podem ser atualizadas.');
  const merged = { machineId: body.machineId ?? current.machine_id, customerName: body.customerName ?? current.customer_name, location: body.location ?? current.location, startDate: body.startDate ?? current.start_date, endDate: body.endDate ?? current.end_date, quantity: body.quantity ?? current.quantity } as AllocationPayload;
  const mergedError = validatePayload(merged, false);
  if (mergedError) return errorResponse(res, 422, 'INVALID_ALLOCATION', mergedError);
  const values = normalizedValues(merged);
  const availability = await checkAvailability(String(values.machineId), String(values.startDate), String(values.endDate), Number(values.quantity), current.id);
  if (!availability.machine) return errorResponse(res, 404, 'MACHINE_NOT_FOUND', 'Máquina não encontrada.');
  if (!availability.available) return errorResponse(res, 409, 'INSUFFICIENT_STOCK', 'Não há unidades livres para todo o período informado.');
  const result = await query<AllocationRow>(
    `UPDATE alocacoes SET maquina_id = $1, nome_cliente = $2, local_servico = $3,
            data_inicio = $4, data_fim = $5, quantidade = $6
      WHERE id = $7
      RETURNING id::text, maquina_id::text AS machine_id, nome_cliente AS customer_name,
                local_servico AS location, data_inicio::text AS start_date,
                data_fim::text AS end_date, quantidade AS quantity, status`,
    [values.machineId, values.customerName, values.location, values.startDate, values.endDate, values.quantity, id],
  );
  res.status(200).json({ success: true, data: allocationData(result.rows[0]) });
}

export async function closeAllocationController(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'O ID da alocação deve ser um número inteiro positivo.');
  const result = await query<AllocationRow>(
    `UPDATE alocacoes SET status = 'encerrada' WHERE id = $1 AND status = 'ativa'
     RETURNING id::text, maquina_id::text AS machine_id, nome_cliente AS customer_name,
               local_servico AS location, data_inicio::text AS start_date,
               data_fim::text AS end_date, quantidade AS quantity, status`,
    [id],
  );
  if (!result.rows[0]) return errorResponse(res, 404, 'ALLOCATION_NOT_FOUND', 'Alocação ativa não encontrada.');
  res.status(200).json({ success: true, data: allocationData(result.rows[0]) });
}
