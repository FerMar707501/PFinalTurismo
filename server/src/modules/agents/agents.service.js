import { pool, withTransaction } from '../../config/db.js';
import { AGENT_MAX_STEPS, runToolAgent } from '../../agents/toolRunner.js';
import { AppError } from '../../errors/AppError.js';
import { AGENT_TOOLS, executeAgentTool } from '../../tools/agentTools.js';
import { getPagination } from '../../utils/pagination.js';
import { getServiceByCode } from '../services/services.service.js';
import {
  assertQuotaAvailable,
  estimateTokens,
  getQuotaForUser,
  recordUsage,
} from '../usage/usage.service.js';

const ITINERARY_SERVICE = 'agent_itinerary';
const COMPARE_SERVICE = 'agent_compare';
const MAX_TITLE_LENGTH = 200;
const TOOL_CONTEXT_RESERVE = 6000;

const BUDGET_LABELS = {
  bajo: 'económico',
  medio: 'medio',
  alto: 'alto',
};

function parseJson(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

function formatBudget(value) {
  return BUDGET_LABELS[value] ?? value;
}

function formatInterests(interests) {
  return interests.length > 0 ? interests.join(', ') : 'no especificados';
}

function truncateTitle(value) {
  const clean = String(value).replace(/\s+/g, ' ').trim();

  if (clean.length <= MAX_TITLE_LENGTH) {
    return clean;
  }

  return `${clean.slice(0, MAX_TITLE_LENGTH - 3)}...`;
}

async function getAgentService(code) {
  const service = await getServiceByCode(code, { isAdmin: true });

  if (!service.enabled) {
    throw new AppError(
      409,
      'SERVICE_DISABLED',
      `El servicio "${service.name}" está desactivado temporalmente.`,
    );
  }

  return service;
}

async function getActiveDestinations(ids) {
  const [rows] = await pool.query(
    `SELECT id, name, region, description, category, tags, lat, lng,
            price_level, best_season
     FROM destinations
     WHERE id IN (?) AND active = 1`,
    [ids],
  );
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  const missing = ids.filter((id) => !byId.has(Number(id)));

  if (missing.length > 0) {
    throw AppError.notFound(
      `Destino(s) no encontrado(s) o inactivo(s): ${missing.join(', ')}.`,
    );
  }

  return ids.map((id) => byId.get(Number(id)));
}

function estimateAgentTokens(service, systemPrompt, userPrompt) {
  const base = estimateTokens(
    [systemPrompt, userPrompt, JSON.stringify(AGENT_TOOLS)].join('\n'),
  );

  return base + TOOL_CONTEXT_RESERVE + service.maxTokens * AGENT_MAX_STEPS;
}

async function logUsageSafely(usage) {
  try {
    await recordUsage(usage);
  } catch (error) {
    console.error('[agents] No se pudo registrar el consumo:', error.message);
  }
}

async function persistAgentError({
  userId,
  serviceCode,
  input,
  error,
  steps,
  totalTokens,
  latencyMs,
}) {
  try {
    await pool.execute(
      `INSERT INTO agent_runs
         (user_id, service_code, input_json, output_json, steps_json,
          status, total_tokens, latency_ms)
       VALUES (?, ?, ?, ?, ?, 'error', ?, ?)`,
      [
        userId,
        serviceCode,
        JSON.stringify(input),
        JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
          },
        }),
        steps ? JSON.stringify(steps) : null,
        Math.max(0, Number(totalTokens) || 0),
        Math.max(0, Number(latencyMs) || 0),
      ],
    );
  } catch (logError) {
    console.error(
      '[agents] No se pudo registrar la ejecución fallida:',
      logError.message,
    );
  }
}

async function executeAgent({
  user,
  service,
  serviceCode,
  input,
  title,
  systemPrompt,
  userPrompt,
}) {
  const estimatedTokens = estimateAgentTokens(
    service,
    systemPrompt,
    userPrompt,
  );

  try {
    await assertQuotaAvailable(user, estimatedTokens);
  } catch (error) {
    if (error instanceof AppError && error.code === 'TOKEN_QUOTA_EXCEEDED') {
      await logUsageSafely({
        userId: user.id,
        serviceCode,
        model: service.model,
        status: 'blocked',
        errorCode: error.code,
      });
    }

    throw error;
  }

  const startedAt = Date.now();
  let result;

  try {
    result = await runToolAgent({
      model: service.model,
      temperature: service.temperature,
      maxTokens: service.maxTokens,
      systemPrompt,
      userPrompt,
      tools: AGENT_TOOLS,
      executeTool: executeAgentTool,
      maxSteps: AGENT_MAX_STEPS,
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const agentError =
      error instanceof AppError
        ? error
        : new AppError(
            502,
            'AGENT_ERROR',
            'No se pudo completar la ejecución del agente.',
          );

    await logUsageSafely({
      userId: user.id,
      serviceCode,
      model: service.model,
      promptTokens: error.agentUsage?.promptTokens ?? 0,
      completionTokens: error.agentUsage?.completionTokens ?? 0,
      totalTokens: error.agentUsage?.totalTokens ?? 0,
      latencyMs,
      status: 'error',
      errorCode: agentError.code,
    });

    await persistAgentError({
      userId: user.id,
      serviceCode,
      input,
      error: agentError,
      steps: error.agentSteps,
      totalTokens: error.agentUsage?.totalTokens,
      latencyMs,
    });

    throw agentError;
  }

  const latencyMs = Date.now() - startedAt;
  const persisted = await withTransaction(async (connection) => {
    const [conversationResult] = await connection.execute(
      `INSERT INTO conversations
         (user_id, service_code, title, last_message_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP(6))`,
      [user.id, serviceCode, truncateTitle(title)],
    );
    const conversationId = Number(conversationResult.insertId);

    const [userMessageResult] = await connection.execute(
      `INSERT INTO messages
         (conversation_id, role, content, tokens_in, tokens_out)
       VALUES (?, 'user', ?, 0, 0)`,
      [conversationId, userPrompt],
    );

    const [assistantMessageResult] = await connection.execute(
      `INSERT INTO messages
         (conversation_id, role, content, sources_json, tokens_in, tokens_out)
       VALUES (?, 'assistant', ?, ?, ?, ?)`,
      [
        conversationId,
        result.content,
        result.sources.length > 0 ? JSON.stringify(result.sources) : null,
        result.usage.promptTokens,
        result.usage.completionTokens,
      ],
    );

    const output = {
      conversationId,
      answer: result.content,
      sources: result.sources,
      usage: result.usage,
    };
    const [runResult] = await connection.execute(
      `INSERT INTO agent_runs
         (user_id, service_code, input_json, output_json, steps_json,
          status, total_tokens, latency_ms)
       VALUES (?, ?, ?, ?, ?, 'success', ?, ?)`,
      [
        user.id,
        serviceCode,
        JSON.stringify(input),
        JSON.stringify(output),
        JSON.stringify(result.steps),
        result.usage.totalTokens,
        latencyMs,
      ],
    );

    await recordUsage(
      {
        userId: user.id,
        serviceCode,
        conversationId,
        messageId: assistantMessageResult.insertId,
        model: service.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        latencyMs,
        status: 'success',
      },
      connection,
    );

    return {
      runId: Number(runResult.insertId),
      conversationId,
      userMessageId: Number(userMessageResult.insertId),
      assistantMessageId: Number(assistantMessageResult.insertId),
    };
  });

  const quota = await getQuotaForUser(user);

  return {
    run: {
      id: persisted.runId,
      serviceCode,
      status: 'success',
      totalTokens: result.usage.totalTokens,
      latencyMs,
      createdAt: new Date().toISOString(),
    },
    conversationId: persisted.conversationId,
    answer: result.content,
    sources: result.sources,
    steps: result.steps,
    usage: {
      ...result.usage,
      latencyMs,
      model: service.model,
    },
    quota,
  };
}

export async function runItineraryAgent(user, input) {
  const service = await getAgentService(ITINERARY_SERVICE);
  const [destination] = await getActiveDestinations([input.destinationId]);
  const userPrompt = [
    `Planifica un itinerario de ${input.days} días (${Math.max(0, input.days - 1)} noches) en ${destination.name}, Colombia.`,
    `Datos del viaje: origen ${input.originCity}; ${input.travelers} viajero(s); presupuesto ${formatBudget(input.budget)}; intereses: ${formatInterests(input.interests)}.`,
    input.notes ? `Notas adicionales: ${input.notes}` : null,
    'Consulta la ficha del destino, sus actividades, el clima y la distancia desde la ciudad de origen antes de responder.',
    'Presenta el itinerario día por día con actividades, duración, costo estimado por persona, recomendaciones de clima y fuentes consultadas.',
    'Si algún dato externo no está disponible, indícalo y usa supuestos razonables sin inventar precios ni horarios.',
  ]
    .filter(Boolean)
    .join('\n');

  return executeAgent({
    user,
    service,
    serviceCode: ITINERARY_SERVICE,
    input,
    title: `Itinerario de ${input.days} días en ${destination.name}`,
    systemPrompt: service.systemPrompt,
    userPrompt,
  });
}

export async function runCompareAgent(user, input) {
  const service = await getAgentService(COMPARE_SERVICE);
  const destinations = await getActiveDestinations(input.destinationIds);
  const destinationList = destinations
    .map((destination) => `${destination.name} (ID ${destination.id})`)
    .join(', ');
  const userPrompt = [
    `Compara estos destinos de Colombia: ${destinationList}.`,
    `Datos del viaje: origen ${input.originCity}; ${input.travelers} viajero(s); duración estimada ${input.days} días; presupuesto ${formatBudget(input.budget)}; intereses: ${formatInterests(input.interests)}.`,
    'Consulta la ficha y las actividades de cada destino, el clima y la distancia desde la ciudad de origen.',
    'Presenta una tabla comparativa con costo estimado, clima, oferta de actividades y una recomendación final justificada.',
    'Si falta información de algún destino, dilo explícitamente y no inventes datos.',
  ].join('\n');

  return executeAgent({
    user,
    service,
    serviceCode: COMPARE_SERVICE,
    input,
    title: `Comparación: ${destinations.map((destination) => destination.name).join(' vs ')}`,
    systemPrompt: service.systemPrompt,
    userPrompt,
  });
}

function serializeRun(row, { includeSteps = false } = {}) {
  const run = {
    id: Number(row.id),
    serviceCode: row.service_code,
    status: row.status,
    totalTokens: Number(row.total_tokens),
    latencyMs: row.latency_ms === null ? null : Number(row.latency_ms),
    createdAt: row.created_at,
    input: parseJson(row.input_json),
    output: parseJson(row.output_json),
  };

  if (includeSteps) {
    run.steps = parseJson(row.steps_json) ?? [];
  }

  return run;
}

export async function listAgentRuns(
  userId,
  { page, limit, serviceCode, status },
) {
  const conditions = ['user_id = ?'];
  const params = [userId];

  if (serviceCode) {
    conditions.push('service_code = ?');
    params.push(serviceCode);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM agent_runs ${where}`,
    params,
  );
  const [rows] = await pool.execute(
    `SELECT * FROM agent_runs
     ${where}
     ORDER BY id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    data: rows.map((row) => serializeRun(row)),
    pagination: getPagination(page, limit, countRows[0]?.total),
  };
}

export async function getAgentRun(userId, runId) {
  const [rows] = await pool.execute(
    'SELECT * FROM agent_runs WHERE id = ? AND user_id = ? LIMIT 1',
    [runId, userId],
  );

  if (!rows[0]) {
    throw AppError.notFound('Ejecución de agente no encontrada.');
  }

  return { run: serializeRun(rows[0], { includeSteps: true }) };
}
