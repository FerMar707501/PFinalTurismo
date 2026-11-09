import { pool } from '../../config/db.js';
import { AppError } from '../../errors/AppError.js';

export function serializeService(row, { includeSystemPrompt = false } = {}) {
  const service = {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    description: row.description,
    model: row.model,
    temperature: Number(row.temperature),
    maxTokens: Number(row.max_tokens),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeSystemPrompt) {
    service.systemPrompt = row.system_prompt;
  }

  return service;
}

export async function listServices({ isAdmin = false } = {}) {
  const [rows] = await pool.execute(
    `SELECT * FROM ai_services
     ${isAdmin ? '' : 'WHERE enabled = 1'}
     ORDER BY id ASC`,
  );

  return rows.map((row) =>
    serializeService(row, { includeSystemPrompt: isAdmin }),
  );
}

export async function getServiceByCode(code, { isAdmin = false } = {}) {
  const [rows] = await pool.execute(
    'SELECT * FROM ai_services WHERE code = ? LIMIT 1',
    [code],
  );

  const service = rows[0];

  if (!service || (!isAdmin && !service.enabled)) {
    throw AppError.notFound('Servicio de IA no encontrado.');
  }

  return serializeService(service, { includeSystemPrompt: isAdmin });
}

export async function updateService(code, data, { isAdmin = true } = {}) {
  const [rows] = await pool.execute(
    'SELECT id FROM ai_services WHERE code = ? LIMIT 1',
    [code],
  );

  if (!rows[0]) {
    throw AppError.notFound('Servicio de IA no encontrado.');
  }

  const fieldMap = {
    name: 'name',
    description: 'description',
    model: 'model',
    temperature: 'temperature',
    maxTokens: 'max_tokens',
    systemPrompt: 'system_prompt',
    enabled: 'enabled',
  };

  const updates = [];
  const params = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      updates.push(`${column} = ?`);
      params.push(
        typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key],
      );
    }
  }

  if (updates.length === 0) {
    throw AppError.badRequest('No hay campos para actualizar.');
  }

  await pool.execute(
    `UPDATE ai_services SET ${updates.join(', ')} WHERE code = ?`,
    [...params, code],
  );

  return getServiceByCode(code, { isAdmin });
}
