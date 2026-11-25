import { Request, Response } from 'express';
import { query } from '../database/client';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

type MachineRow = {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  purpose: string;
  description: string | null;
  image_url: string | null;
  origin: 'propria' | 'terceiros';
  partner_name: string | null;
  partner_contact: string | null;
  total_units: number;
  maintenance_units: number;
  available_units: number;
  ativo?: boolean;
};

type MachinePayload = {
  name?: unknown;
  type?: unknown;
  brand?: unknown;
  model?: unknown;
  purpose?: unknown;
  description?: unknown;
  imageUrl?: unknown;
  origin?: unknown;
  originType?: unknown;
  partnerName?: unknown;
  partnerContact?: unknown;
  totalUnits?: unknown;
  maintenanceUnits?: unknown;
};

const MACHINE_FIELDS = new Set([
  'name', 'type', 'brand', 'model', 'purpose', 'description', 'imageUrl',
  'origin', 'originType', 'partnerName', 'partnerContact', 'totalUnits', 'maintenanceUnits',
]);

const MACHINE_SELECT = `
  SELECT id::text, nome AS name, categoria AS type, marca AS brand,
         modelo AS model, finalidade AS purpose, descricao AS description,
         imagem_url, origem AS origin, nome_parceiro AS partner_name,
         contato_parceiro AS partner_contact,
         quantidade_total AS total_units,
         quantidade_manutencao AS maintenance_units,
         quantidade_total - quantidade_manutencao AS available_units,
         ativo
    FROM maquinas`;

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function machineData(machine: MachineRow, includeAdminFields = false) {
  return {
    id: machine.id,
    name: machine.name,
    type: machine.type,
    brand: machine.brand,
    model: machine.model,
    purpose: machine.purpose,
    description: machine.description,
    imageUrl: machine.image_url,
    origin: machine.origin,
    partnerName: machine.partner_name,
    totalUnits: machine.total_units,
    maintenanceUnits: machine.maintenance_units,
    availableUnits: machine.available_units,
    availableNow: machine.available_units > 0,
    ...(includeAdminFields ? { partnerContact: machine.partner_contact } : {}),
    ...(machine.ativo === undefined ? {} : { active: machine.ativo }),
  };
}

function errorResponse(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

function validText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function validOptionalText(value: unknown, maxLength: number): value is string | null {
  return value === null || (typeof value === 'string' && value.trim().length <= maxLength);
}

function parseMachineId(value: unknown): string | null {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) ? value : null;
}

function validateMachinePayload(body: MachinePayload, partial: boolean): string | null {
  const unknownFields = Object.keys(body).filter((field) => !MACHINE_FIELDS.has(field));
  if (unknownFields.length > 0) return `Campos não permitidos: ${unknownFields.join(', ')}.`;
  if (!partial && Object.keys(body).length === 0) return 'Informe os dados da máquina.';
  if (partial && Object.keys(body).length === 0) return 'Informe ao menos um campo para atualizar.';

  const requiredFields: Array<keyof MachinePayload> = ['name', 'type', 'brand', 'model', 'purpose'];
  for (const field of requiredFields) {
    if ((!partial || field in body) && !validText(body[field], field === 'purpose' ? 2000 : 120)) {
      return `O campo ${field} é obrigatório e deve ter tamanho válido.`;
    }
  }
  if ('description' in body && !validOptionalText(body.description, 2000)) return 'A descrição deve ter no máximo 2000 caracteres.';
  if ('imageUrl' in body && !validOptionalText(body.imageUrl, 2048)) return 'A imagem deve ter no máximo 2048 caracteres.';

  if ('partnerContact' in body && !validOptionalText(body.partnerContact, 255)) return 'partnerContact deve ter no máximo 255 caracteres.';
  for (const field of ['totalUnits', 'maintenanceUnits'] as const) {
    if (field in body && (!Number.isInteger(body[field]) || Number(body[field]) < 0)) {
      return `${field} deve ser um número inteiro não negativo.`;
    }
  }
  if ((!partial || 'totalUnits' in body) && (!Number.isInteger(body.totalUnits) || Number(body.totalUnits) < 0)) return 'totalUnits deve ser um número inteiro não negativo.';
  if (!partial && body.maintenanceUnits === undefined) body.maintenanceUnits = 0;
  if (body.totalUnits !== undefined && body.maintenanceUnits !== undefined && Number(body.maintenanceUnits) > Number(body.totalUnits)) {
    return 'maintenanceUnits não pode ser maior que totalUnits.';
  }

  const origin = body.originType ?? body.origin;
  if (origin !== undefined && origin !== null && !['OWN', 'PARTNER', 'propria', 'terceiros'].includes(String(origin))) {
    return 'origin deve ser propria ou terceiros (originType aceita OWN ou PARTNER).';
  }
  const normalizedOrigin = origin === 'OWN' ? 'propria' : origin === 'PARTNER' ? 'terceiros' : origin ?? 'propria';
  if (normalizedOrigin === 'terceiros' && (!validText(body.partnerName, 120) || !validText(body.partnerContact, 255))) return 'partnerName e partnerContact são obrigatórios para máquinas de terceiros.';
  if (normalizedOrigin === 'propria' && [body.partnerName, body.partnerContact].some((value) => value !== undefined && value !== null && String(value).trim() !== '')) return 'Os dados do parceiro devem ficar vazios para máquinas próprias.';
  return null;
}

function normalizedMachineValues(body: MachinePayload) {
  const origin = body.originType ?? body.origin;
  return {
    name: typeof body.name === 'string' ? body.name.trim() : body.name,
    type: typeof body.type === 'string' ? body.type.trim() : body.type,
    brand: typeof body.brand === 'string' ? body.brand.trim() : body.brand,
    model: typeof body.model === 'string' ? body.model.trim() : body.model,
    purpose: typeof body.purpose === 'string' ? body.purpose.trim() : body.purpose,
    description: typeof body.description === 'string' ? body.description.trim() : body.description ?? null,
    imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.trim() : body.imageUrl ?? null,
    origin: origin === 'OWN' ? 'propria' : origin === 'PARTNER' ? 'terceiros' : origin ?? 'propria',
    partnerName: typeof body.partnerName === 'string' ? body.partnerName.trim() : body.partnerName ?? null,
    partnerContact: typeof body.partnerContact === 'string' ? body.partnerContact.trim() : body.partnerContact ?? null,
    totalUnits: body.totalUnits ?? 1,
    maintenanceUnits: body.maintenanceUnits ?? 0,
  };
}

export async function listMachinesController(req: Request, res: Response): Promise<void> {
  const page = positiveInteger(req.query.page, DEFAULT_PAGE);
  const limit = Math.min(positiveInteger(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = (page - 1) * limit;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const type = typeof req.query.type === 'string' ? req.query.type.trim() : '';
  const filters: string[] = ['ativo = TRUE'];
  const values: string[] = [];

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(nome ILIKE $${values.length} OR categoria ILIKE $${values.length} OR marca ILIKE $${values.length} OR modelo ILIKE $${values.length} OR finalidade ILIKE $${values.length})`);
  }

  if (type) {
    values.push(type);
    filters.push(`categoria = $${values.length}`);
  }

  const where = filters.join(' AND ');
  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM maquinas WHERE ${where}`,
    values,
  );

  const dataValues = [...values, String(limit), String(offset)];
  const machinesResult = await query<MachineRow>(
    `SELECT id::text, nome AS name, categoria AS type, marca AS brand,
            modelo AS model, finalidade AS purpose, descricao AS description,
            imagem_url, origem AS origin, nome_parceiro AS partner_name,
            contato_parceiro AS partner_contact,
            quantidade_total AS total_units,
            quantidade_manutencao AS maintenance_units,
            quantidade_total - quantidade_manutencao AS available_units
       FROM maquinas
      WHERE ${where}
      ORDER BY id
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`,
    dataValues,
  );

  const data = machinesResult.rows.map((machine) => machineData(machine));

  res.status(200).json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total: Number(countResult.rows[0]?.total ?? 0),
    },
  });
}

export async function getMachineController(req: Request, res: Response): Promise<void> {
  const id = parseMachineId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'O ID da máquina deve ser um número inteiro positivo.');
  const result = await query<MachineRow>(`${MACHINE_SELECT} WHERE id = $1 AND ativo = TRUE`, [id]);
  const machine = result.rows[0];
  if (!machine) return errorResponse(res, 404, 'MACHINE_NOT_FOUND', 'Máquina não encontrada.');
  res.status(200).json({ success: true, data: machineData(machine) });
}

export async function listAdminMachinesController(_req: Request, res: Response): Promise<void> {
  const result = await query<MachineRow>(`${MACHINE_SELECT} ORDER BY id`);
  res.status(200).json({ success: true, data: result.rows.map((machine) => machineData(machine, true)), meta: { total: result.rows.length } });
}

export async function getAdminMachineController(req: Request, res: Response): Promise<void> {
  const id = parseMachineId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'O ID da máquina deve ser um número inteiro positivo.');
  const result = await query<MachineRow>(`${MACHINE_SELECT} WHERE id = $1`, [id]);
  const machine = result.rows[0];
  if (!machine) return errorResponse(res, 404, 'MACHINE_NOT_FOUND', 'Máquina não encontrada.');
  res.status(200).json({ success: true, data: machineData(machine) });
}

export async function createMachineController(req: Request, res: Response): Promise<void> {
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as MachinePayload;
  const validationError = validateMachinePayload(body, false);
  if (validationError) return errorResponse(res, 422, 'INVALID_MACHINE', validationError);
  const values = normalizedMachineValues(body);
  const result = await query<MachineRow>(
    `INSERT INTO maquinas
      (empresa_id, nome, categoria, marca, modelo, finalidade, descricao, imagem_url,
       origem, nome_parceiro, contato_parceiro, quantidade_total, quantidade_manutencao)
     SELECT id, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
       FROM empresas ORDER BY id LIMIT 1
     RETURNING id::text, nome AS name, categoria AS type, marca AS brand, modelo AS model,
               finalidade AS purpose, descricao AS description, imagem_url,
               origem AS origin, nome_parceiro AS partner_name, contato_parceiro AS partner_contact,
               quantidade_total AS total_units, quantidade_manutencao AS maintenance_units,
               quantidade_total - quantidade_manutencao AS available_units, ativo`,
    [values.name, values.type, values.brand, values.model, values.purpose, values.description,
      values.imageUrl, values.origin, values.partnerName, values.partnerContact, values.totalUnits, values.maintenanceUnits],
  );
  const machine = result.rows[0];
  if (!machine) return errorResponse(res, 404, 'COMPANY_NOT_CONFIGURED', 'Nenhuma empresa está configurada para receber máquinas.');
  res.status(201).json({ success: true, data: machineData(machine, true) });
}

export async function updateMachineController(req: Request, res: Response): Promise<void> {
  const id = parseMachineId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'O ID da máquina deve ser um número inteiro positivo.');
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as MachinePayload;
  const validationError = validateMachinePayload(body, true);
  if (validationError) return errorResponse(res, 422, 'INVALID_MACHINE', validationError);
  const values = normalizedMachineValues(body);
  const columnMap: Record<string, string> = {
    name: 'nome', type: 'categoria', brand: 'marca', model: 'modelo', purpose: 'finalidade',
    description: 'descricao', imageUrl: 'imagem_url', origin: 'origem', partnerName: 'nome_parceiro', partnerContact: 'contato_parceiro',
    totalUnits: 'quantidade_total', maintenanceUnits: 'quantidade_manutencao',
  };
  const fields = Object.keys(body).filter((field) => field !== 'originType');
  if (body.originType !== undefined && !fields.includes('origin')) fields.push('origin');
  const updateValues = fields.map((field) => values[field as keyof typeof values]);
  const setClause = fields.map((field, index) => `${columnMap[field]} = $${index + 1}`).join(', ');
  const result = await query<MachineRow>(
    `UPDATE maquinas SET ${setClause} WHERE id = $${updateValues.length + 1}
     RETURNING id::text, nome AS name, categoria AS type, marca AS brand, modelo AS model,
               finalidade AS purpose, descricao AS description, imagem_url,
               origem AS origin, nome_parceiro AS partner_name, contato_parceiro AS partner_contact,
               quantidade_total AS total_units, quantidade_manutencao AS maintenance_units,
               quantidade_total - quantidade_manutencao AS available_units, ativo`,
    [...updateValues, id],
  );
  const machine = result.rows[0];
  if (!machine) return errorResponse(res, 404, 'MACHINE_NOT_FOUND', 'Máquina não encontrada.');
  res.status(200).json({ success: true, data: machineData(machine, true) });
}

export async function deleteMachineController(req: Request, res: Response): Promise<void> {
  const id = parseMachineId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'O ID da máquina deve ser um número inteiro positivo.');
  const result = await query(`UPDATE maquinas SET ativo = FALSE WHERE id = $1 AND ativo = TRUE`, [id]);
  if (result.rowCount === 0) return errorResponse(res, 404, 'MACHINE_NOT_FOUND', 'Máquina não encontrada.');
  res.status(204).send();
}
