import crypto from 'node:crypto';
import { pool } from '../../config/db.js';
import { AppError } from '../../errors/AppError.js';

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function startOfUtcDay(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Normaliza el rango solicitado. Sin fechas se usan los últimos 30 días
 * (incluyendo hoy). El rango nunca supera un año.
 */
export function resolveRange({ from, to } = {}, now = new Date()) {
  const end = to ? new Date(`${to}T00:00:00Z`) : startOfUtcDay(now);
  const start = from
    ? new Date(`${from}T00:00:00Z`)
    : new Date(end.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw AppError.badRequest('El rango de fechas no es válido.');
  }

  if (start > end) {
    throw AppError.badRequest(
      'La fecha inicial no puede ser posterior a la final.',
    );
  }

  const days = Math.floor((end - start) / DAY_MS) + 1;

  if (days > MAX_RANGE_DAYS) {
    throw AppError.badRequest(
      `El rango máximo permitido es de ${MAX_RANGE_DAYS} días.`,
    );
  }

  return {
    from: toDateOnly(start),
    to: toDateOnly(end),
    start,
    // Límite superior exclusivo: incluye todo el día final.
    endExclusive: new Date(end.getTime() + DAY_MS),
    days,
  };
}

export function buildListParams(range, { serviceCode } = {}) {
  const params = [range.start, range.endExclusive];

  if (serviceCode) {
    params.push(serviceCode);
  }

  return params;
}

function serviceFilter(serviceCode) {
  return serviceCode ? 'AND ul.service_code = $3' : '';
}

function mapTotals(row = {}) {
  return {
    requests: Number(row.requests) || 0,
    successfulRequests: Number(row.successful_requests) || 0,
    blockedRequests: Number(row.blocked_requests) || 0,
    errorRequests: Number(row.error_requests) || 0,
    promptTokens: Number(row.prompt_tokens) || 0,
    completionTokens: Number(row.completion_tokens) || 0,
    totalTokens: Number(row.total_tokens) || 0,
    averageTokens: Math.round(Number(row.average_tokens) || 0),
    averageLatencyMs: Math.round(Number(row.average_latency_ms) || 0),
    activeUsers: Number(row.active_users) || 0,
  };
}

async function getTotals(range, filters) {
  const [rows] = await pool.execute(
    `SELECT
       COUNT(*) AS requests,
       COALESCE(SUM(CASE WHEN ul.status = 'success' THEN 1 ELSE 0 END), 0) AS successful_requests,
       COALESCE(SUM(CASE WHEN ul.status = 'blocked' THEN 1 ELSE 0 END), 0) AS blocked_requests,
       COALESCE(SUM(CASE WHEN ul.status = 'error' THEN 1 ELSE 0 END), 0) AS error_requests,
       COALESCE(SUM(ul.prompt_tokens), 0) AS prompt_tokens,
       COALESCE(SUM(ul.completion_tokens), 0) AS completion_tokens,
       COALESCE(SUM(ul.total_tokens), 0) AS total_tokens,
       COALESCE(ROUND(AVG(ul.total_tokens)), 0) AS average_tokens,
       COALESCE(ROUND(AVG(ul.latency_ms)), 0) AS average_latency_ms,
       COUNT(DISTINCT ul.user_id) AS active_users
     FROM usage_logs ul
     WHERE ul.created_at >= $1 AND ul.created_at < $2
       ${serviceFilter(filters.serviceCode)}`,
    buildListParams(range, filters),
  );

  return mapTotals(rows[0]);
}

async function getByService(range, filters) {
  const [rows] = await pool.execute(
    `SELECT
       ul.service_code,
       COUNT(*) AS requests,
       COALESCE(SUM(CASE WHEN ul.status = 'success' THEN 1 ELSE 0 END), 0) AS successful_requests,
       COALESCE(SUM(CASE WHEN ul.status = 'blocked' THEN 1 ELSE 0 END), 0) AS blocked_requests,
       COALESCE(SUM(CASE WHEN ul.status = 'error' THEN 1 ELSE 0 END), 0) AS error_requests,
       COALESCE(SUM(ul.prompt_tokens), 0) AS prompt_tokens,
       COALESCE(SUM(ul.completion_tokens), 0) AS completion_tokens,
       COALESCE(SUM(ul.total_tokens), 0) AS total_tokens,
       COALESCE(ROUND(AVG(ul.total_tokens)), 0) AS average_tokens,
       COALESCE(ROUND(AVG(ul.latency_ms)), 0) AS average_latency_ms,
       COUNT(DISTINCT ul.user_id) AS active_users
     FROM usage_logs ul
     WHERE ul.created_at >= $1 AND ul.created_at < $2
       ${serviceFilter(filters.serviceCode)}
     GROUP BY ul.service_code
     ORDER BY total_tokens DESC, requests DESC, ul.service_code ASC`,
    buildListParams(range, filters),
  );

  return rows.map((row) => ({
    serviceCode: row.service_code,
    ...mapTotals(row),
  }));
}

async function getDailySeries(range, filters) {
  const [rows] = await pool.execute(
    `SELECT
       to_char(ul.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
       COUNT(*) AS requests,
       COALESCE(SUM(CASE WHEN ul.status = 'success' THEN 1 ELSE 0 END), 0) AS successful_requests,
       COALESCE(SUM(CASE WHEN ul.status = 'blocked' THEN 1 ELSE 0 END), 0) AS blocked_requests,
       COALESCE(SUM(ul.total_tokens), 0) AS total_tokens,
       COALESCE(SUM(ul.prompt_tokens), 0) AS prompt_tokens,
       COALESCE(SUM(ul.completion_tokens), 0) AS completion_tokens
     FROM usage_logs ul
     WHERE ul.created_at >= $1 AND ul.created_at < $2
       ${serviceFilter(filters.serviceCode)}
     GROUP BY to_char(ul.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
     ORDER BY date ASC`,
    buildListParams(range, filters),
  );

  return rows.map((row) => ({
    date: toDateOnly(new Date(row.date)),
    requests: Number(row.requests) || 0,
    successfulRequests: Number(row.successful_requests) || 0,
    blockedRequests: Number(row.blocked_requests) || 0,
    totalTokens: Number(row.total_tokens) || 0,
    promptTokens: Number(row.prompt_tokens) || 0,
    completionTokens: Number(row.completion_tokens) || 0,
  }));
}

async function getMonthlySeries(range, filters) {
  const [rows] = await pool.execute(
    `SELECT
       to_char(ul.created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
       COUNT(*) AS requests,
       COALESCE(SUM(CASE WHEN ul.status = 'success' THEN 1 ELSE 0 END), 0) AS successful_requests,
       COALESCE(SUM(CASE WHEN ul.status = 'blocked' THEN 1 ELSE 0 END), 0) AS blocked_requests,
       COALESCE(SUM(ul.total_tokens), 0) AS total_tokens,
       COALESCE(SUM(ul.prompt_tokens), 0) AS prompt_tokens,
       COALESCE(SUM(ul.completion_tokens), 0) AS completion_tokens
     FROM usage_logs ul
     WHERE ul.created_at >= $1 AND ul.created_at < $2
       ${serviceFilter(filters.serviceCode)}
     GROUP BY to_char(ul.created_at AT TIME ZONE 'UTC', 'YYYY-MM')
     ORDER BY month ASC`,
    buildListParams(range, filters),
  );

  return rows.map((row) => ({
    month: row.month,
    requests: Number(row.requests) || 0,
    successfulRequests: Number(row.successful_requests) || 0,
    blockedRequests: Number(row.blocked_requests) || 0,
    totalTokens: Number(row.total_tokens) || 0,
    promptTokens: Number(row.prompt_tokens) || 0,
    completionTokens: Number(row.completion_tokens) || 0,
  }));
}

async function getByUser(range, filters) {
  const [rows] = await pool.execute(
    `SELECT
       ul.user_id,
       u.name,
       u.email,
       u.role,
       COALESCE(SUM(ul.total_tokens), 0) AS total_tokens,
       COUNT(*) AS requests,
       COALESCE(SUM(CASE WHEN ul.status = 'success' THEN 1 ELSE 0 END), 0) AS successful_requests,
       COALESCE(SUM(CASE WHEN ul.status = 'blocked' THEN 1 ELSE 0 END), 0) AS blocked_requests,
       COALESCE(SUM(CASE WHEN ul.status = 'error' THEN 1 ELSE 0 END), 0) AS error_requests,
       COALESCE(ROUND(AVG(ul.latency_ms)), 0) AS average_latency_ms
     FROM usage_logs ul
     JOIN users u ON u.id = ul.user_id
     WHERE ul.created_at >= $1 AND ul.created_at < $2
       ${serviceFilter(filters.serviceCode)}
     GROUP BY ul.user_id, u.name, u.email, u.role
     ORDER BY total_tokens DESC, requests DESC
     LIMIT 50`,
    buildListParams(range, filters),
  );

  return rows.map((row) => ({
    userId: Number(row.user_id),
    name: row.name,
    email: row.email,
    role: row.role,
    totalTokens: Number(row.total_tokens) || 0,
    requests: Number(row.requests) || 0,
    successfulRequests: Number(row.successful_requests) || 0,
    blockedRequests: Number(row.blocked_requests) || 0,
    errorRequests: Number(row.error_requests) || 0,
    averageLatencyMs: Number(row.average_latency_ms) || 0,
  }));
}

function addDerivedMetrics(data) {
  const { totals, byService } = data;
  const successRate =
    totals.requests > 0
      ? Math.round((totals.successfulRequests / totals.requests) * 10000) / 100
      : 0;

  return {
    ...data,
    totals: {
      ...totals,
      successRate,
    },
    byService: byService.map((item) => ({
      ...item,
      sharePercent:
        totals.totalTokens > 0
          ? Math.round((item.totalTokens / totals.totalTokens) * 10000) / 100
          : 0,
    })),
  };
}

export async function getUsageAnalytics(query = {}) {
  const range = resolveRange(query);
  const filters = { serviceCode: query.serviceCode || null };

  const [totals, byService, byUser, daily, monthly] = await Promise.all([
    getTotals(range, filters),
    getByService(range, filters),
    getByUser(range, filters),
    getDailySeries(range, filters),
    getMonthlySeries(range, filters),
  ]);

  return addDerivedMetrics({
    meta: {
      from: range.from,
      to: range.to,
      days: range.days,
      serviceCode: filters.serviceCode,
      generatedAt: new Date().toISOString(),
    },
    totals,
    byService,
    byUser,
    daily,
    monthly,
  });
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Un renglón por fecha, servicio y usuario: formato plano ideal para Power BI
 * o Excel, generado desde el mismo agregado que el reporte web.
 */
export async function getUsageCsv(query = {}) {
  const analytics = await getUsageAnalytics(query);
  const range = resolveRange(query);
  const filters = { serviceCode: query.serviceCode || null };
  const [rows] = await pool.execute(
    `SELECT
       to_char(ul.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
       ul.service_code,
       ul.model,
       u.name AS user_name,
       u.email AS user_email,
       ul.status,
       COUNT(*) AS requests,
       COALESCE(SUM(ul.prompt_tokens), 0) AS prompt_tokens,
       COALESCE(SUM(ul.completion_tokens), 0) AS completion_tokens,
       COALESCE(SUM(ul.total_tokens), 0) AS total_tokens,
       COALESCE(ROUND(AVG(ul.latency_ms)), 0) AS average_latency_ms
     FROM usage_logs ul
     JOIN users u ON u.id = ul.user_id
     WHERE ul.created_at >= $1 AND ul.created_at < $2
       ${serviceFilter(filters.serviceCode)}
     GROUP BY to_char(ul.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'), ul.service_code, ul.model, u.id,
              u.name, u.email, ul.status
     ORDER BY date ASC, ul.service_code ASC, u.email ASC, ul.status ASC`,
    buildListParams(range, filters),
  );

  const header = [
    'fecha',
    'servicio',
    'modelo',
    'usuario',
    'correo',
    'estado',
    'solicitudes',
    'tokens_entrada',
    'tokens_salida',
    'tokens_total',
    'latencia_promedio_ms',
  ];

  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push(
      [
        toDateOnly(new Date(row.date)),
        row.service_code,
        row.model,
        row.user_name,
        row.user_email,
        row.status,
        row.requests,
        row.prompt_tokens,
        row.completion_tokens,
        row.total_tokens,
        row.average_latency_ms,
      ]
        .map(csvCell)
        .join(','),
    );
  }

  return {
    filename: `rutaia-consumo-${analytics.meta.from}_${analytics.meta.to}.csv`,
    content: `\uFEFF${lines.join('\r\n')}\r\n`,
    analytics,
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export async function authenticateApiClient(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new AppError(
      401,
      'API_KEY_REQUIRED',
      'Debes enviar la cabecera X-API-Key.',
    );
  }

  const hash = sha256(apiKey);

  const [rows] = await pool.execute(
    `SELECT id, name, scope, active
     FROM api_clients
     WHERE key_hash = $1
     LIMIT 1`,
    [hash],
  );

  const client = rows[0];

  if (!client || !client.active) {
    throw new AppError(
      401,
      'INVALID_API_KEY',
      'La API key no es válida o está desactivada.',
    );
  }

  const scopes = String(client.scope)
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (!scopes.includes('analytics:read')) {
    throw new AppError(
      403,
      'INSUFFICIENT_SCOPE',
      'La API key no tiene el permiso analytics:read.',
    );
  }

  await pool.execute(
    'UPDATE api_clients SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
    [client.id],
  );

  return {
    id: Number(client.id),
    name: client.name,
    scopes,
  };
}

export async function listApiClients() {
  const [rows] = await pool.execute(
    `SELECT id, name, key_prefix, scope, active, last_used_at, created_at
     FROM api_clients
     ORDER BY id ASC`,
  );

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    keyPrefix: row.key_prefix,
    scope: row.scope,
    active: Boolean(row.active),
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  }));
}

export async function createApiClient({ name, scope = 'analytics:read' }) {
  const rawKey = `rutaia_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 14);

  const [result] = await pool.execute(
    `INSERT INTO api_clients (name, key_hash, key_prefix, scope, active)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id`,
    [name, keyHash, keyPrefix, scope],
  );

  return {
    id: Number(result[0].id),
    name,
    keyPrefix,
    scope,
    active: true,
    // La clave completa solo se entrega una vez, al crearla.
    apiKey: rawKey,
  };
}

export async function setApiClientStatus(id, active) {
  const [rows] = await pool.execute(
    'SELECT id, name FROM api_clients WHERE id = $1 LIMIT 1',
    [id],
  );

  if (!rows[0]) {
    throw AppError.notFound('Cliente de API no encontrado.');
  }

  await pool.execute('UPDATE api_clients SET active = $1 WHERE id = $2', [
    Boolean(active),
    id,
  ]);

  return {
    id: Number(id),
    name: rows[0].name,
    active: Boolean(active),
  };
}
