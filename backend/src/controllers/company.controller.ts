import { Request, Response } from 'express';
import { query } from '../database/client';

type CompanyRow = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  primary_color: string;
};

const COMPANY_SELECT = `
  SELECT id::text, nome AS name, descricao AS description, telefone AS phone,
         whatsapp, cidade AS city, estado AS state, logo_url, cor_principal AS primary_color
    FROM empresas
   ORDER BY id
   LIMIT 1`;

function toCompanyData(company: CompanyRow) {
  return {
    id: company.id,
    name: company.name,
    description: company.description,
    phone: company.phone,
    whatsapp: company.whatsapp,
    city: company.city,
    state: company.state,
    logoUrl: company.logo_url,
    primaryColor: company.primary_color,
  };
}

function errorResponse(res: Response, code: string, message: string): void {
  res.status(422).json({ success: false, error: { code, message } });
}

function validText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function validOptionalText(value: unknown, maxLength: number): value is string | null {
  return value === null || (typeof value === 'string' && value.trim().length <= maxLength);
}

function validLogoUrl(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string' || value.trim().length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function getCompanyController(_req: Request, res: Response): Promise<void> {
  const result = await query<CompanyRow>(COMPANY_SELECT);
  const company = result.rows[0];

  if (!company) {
    res.status(404).json({
      success: false,
      error: { code: 'COMPANY_NOT_CONFIGURED', message: 'Perfil da empresa ainda não foi configurado.' },
    });
    return;
  }

  res.status(200).json({ success: true, data: toCompanyData(company) });
}

export async function updateCompanyController(req: Request, res: Response): Promise<void> {
  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  const allowedFields = new Set(['name', 'description', 'phone', 'whatsapp', 'city', 'state', 'logoUrl', 'primaryColor']);
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));

  if (unknownFields.length > 0) {
    errorResponse(res, 'INVALID_FIELDS', `Campos não permitidos: ${unknownFields.join(', ')}.`);
    return;
  }

  if (Object.keys(body).length === 0) {
    errorResponse(res, 'EMPTY_UPDATE', 'Informe ao menos um campo para atualizar.');
    return;
  }

  if ('name' in body && !validText(body.name, 120)) {
    errorResponse(res, 'INVALID_NAME', 'O nome deve ter entre 1 e 120 caracteres.');
    return;
  }
  if ('description' in body && !validOptionalText(body.description, 2000)) {
    errorResponse(res, 'INVALID_DESCRIPTION', 'A descrição deve ter no máximo 2000 caracteres.');
    return;
  }
  for (const field of ['phone', 'whatsapp'] as const) {
    if (field in body && !validOptionalText(body[field], 25)) {
      errorResponse(res, `INVALID_${field.toUpperCase()}`, `${field} deve ter no máximo 25 caracteres.`);
      return;
    }
  }
  if ('city' in body && !validOptionalText(body.city, 100)) {
    errorResponse(res, 'INVALID_CITY', 'A cidade deve ter no máximo 100 caracteres.');
    return;
  }
  if ('state' in body && body.state !== null && (typeof body.state !== 'string' || !/^[A-Za-z]{2}$/.test(body.state))) {
    errorResponse(res, 'INVALID_STATE', 'O estado deve conter a sigla com 2 letras.');
    return;
  }
  if ('logoUrl' in body && !validLogoUrl(body.logoUrl)) {
    errorResponse(res, 'INVALID_LOGO_URL', 'A logo deve ser uma URL HTTP ou HTTPS válida.');
    return;
  }
  if ('primaryColor' in body && (typeof body.primaryColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.primaryColor))) {
    errorResponse(res, 'INVALID_PRIMARY_COLOR', 'A cor principal deve estar no formato hexadecimal #RRGGBB.');
    return;
  }

  const columnMap: Record<string, string> = {
    name: 'nome', description: 'descricao', phone: 'telefone', whatsapp: 'whatsapp',
    city: 'cidade', state: 'estado', logoUrl: 'logo_url', primaryColor: 'cor_principal',
  };
  const fields = Object.keys(body);
  const values = fields.map((field) => {
    const value = body[field];
    return typeof value === 'string' ? value.trim() : value;
  });
  const setClause = fields.map((field, index) => `${columnMap[field]} = $${index + 1}`).join(', ');
  const result = await query<CompanyRow>(
    `UPDATE empresas SET ${setClause}
      WHERE id = (SELECT id FROM empresas ORDER BY id LIMIT 1)
      RETURNING id::text, nome AS name, descricao AS description, telefone AS phone,
                whatsapp, cidade AS city, estado AS state, logo_url, cor_principal AS primary_color`,
    values,
  );
  const company = result.rows[0];

  if (!company) {
    res.status(404).json({
      success: false,
      error: { code: 'COMPANY_NOT_CONFIGURED', message: 'Perfil da empresa ainda não foi configurado.' },
    });
    return;
  }

  res.status(200).json({ success: true, data: toCompanyData(company) });
}
