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
  total_units: number;
  maintenance_units: number;
  available_units: number;
};

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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
            quantidade_total AS total_units,
            quantidade_manutencao AS maintenance_units,
            quantidade_total - quantidade_manutencao AS available_units
       FROM maquinas
      WHERE ${where}
      ORDER BY id
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`,
    dataValues,
  );

  const data = machinesResult.rows.map((machine) => ({
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
  }));

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
