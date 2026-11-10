import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import request from 'supertest';

vi.mock('../src/ai/groqClient.js', () => ({
  generateChatCompletion: vi.fn(),
}));

vi.mock('../src/tools/externalApis.js', () => ({
  getWeatherForecast: vi.fn(),
  getRouteDistance: vi.fn(),
  getWikipediaSummary: vi.fn(),
}));

import app from '../src/app.js';
import { generateChatCompletion } from '../src/ai/groqClient.js';
import { closePool, pool } from '../src/config/db.js';
import { AppError } from '../src/errors/AppError.js';
import {
  getRouteDistance,
  getWeatherForecast,
  getWikipediaSummary,
} from '../src/tools/externalApis.js';

const mockGenerate = vi.mocked(generateChatCompletion);
const mockWeather = vi.mocked(getWeatherForecast);
const mockRoute = vi.mocked(getRouteDistance);
const mockWikipedia = vi.mocked(getWikipediaSummary);

let adminToken;
let demoToken;
let agentToken;
let lowQuotaToken;
let agentUserId;
let lowQuotaUserId;
let agentUserEmail;
let lowQuotaUserEmail;
let itineraryRunId;
let itineraryConversationId;
let compareRunId;

const stamp = Date.now();
const MODEL = 'openai/gpt-oss-120b';

const weatherFixture = {
  location: 'Antigua Guatemala',
  timezone: 'America/Guatemala',
  days: [
    {
      date: '2026-11-10',
      weatherCode: 1,
      description: 'Mayormente despejado',
      temperatureMax: 24,
      temperatureMin: 15,
      precipitationProbability: 20,
    },
  ],
};

const routeFixture = {
  origin: 'Guatemala',
  destination: 'Antigua Guatemala',
  mode: 'driving',
  distanceKm: 290.5,
  durationMinutes: 360,
  durationHours: 6,
};

const wikiFixture = {
  title: 'Antigua Guatemala',
  extract: 'Antigua Guatemala es una ciudad colonial del departamento de Sacatepéquez.',
  url: 'https://es.wikipedia.org/wiki/Antigua_Guatemala',
  thumbnail: null,
};

function toolCall(name, args, id = `call_${name}_${Math.random()}`) {
  return {
    id,
    name,
    arguments: JSON.stringify(args),
  };
}

function parseJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function completion({
  content = '',
  toolCalls = [],
  promptTokens = 100,
  completionTokens = 50,
} = {}) {
  return {
    content,
    finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
    toolCalls,
    model: MODEL,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}

const itineraryAnswer =
  'Día 1: llegada a Antigua Guatemala y recorrido por el pueblo.\n' +
  'Día 2: Valle de Cocora y finca cafetera.\n' +
  'Día 3: pueblos del café y regreso.';

const compareAnswer =
  '| Destino | Clima | Costo estimado | Oferta |\n' +
  '|---|---|---|---|\n' +
  '| Antigua Guatemala | Templado | Medio | Centro histórico y volcanes |\n' +
  '| Lago de Atitlán y Sololá | Templado | Medio | Lago y cultura maya |\n' +
  'Recomendación: Antigua Guatemala por cercanía y presupuesto.';

beforeAll(async () => {
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@rutaia.local',
    password: 'Admin123!',
  });
  expect(adminLogin.status).toBe(200);
  adminToken = adminLogin.body.token;

  const demoLogin = await request(app).post('/api/auth/login').send({
    email: 'demo@rutaia.local',
    password: 'Demo123!',
  });
  expect(demoLogin.status).toBe(200);
  demoToken = demoLogin.body.token;

  agentUserEmail = `TEST_Fase5_Agent_${stamp}@rutaia.local`;
  const agentUser = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Usuario Agentes Fase 5',
      email: agentUserEmail,
      password: 'Agent1234!',
      role: 'user',
      tokenLimitMonth: 100000,
    });

  expect(agentUser.status).toBe(201);
  agentUserId = agentUser.body.user.id;

  const agentLogin = await request(app).post('/api/auth/login').send({
    email: agentUserEmail,
    password: 'Agent1234!',
  });
  expect(agentLogin.status).toBe(200);
  agentToken = agentLogin.body.token;

  lowQuotaUserEmail = `TEST_Fase5_Low_${stamp}@rutaia.local`;
  const lowQuotaUser = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Usuario Agentes Sin Cuota',
      email: lowQuotaUserEmail,
      password: 'Low1234!',
      role: 'user',
      tokenLimitMonth: 0,
    });

  expect(lowQuotaUser.status).toBe(201);
  lowQuotaUserId = lowQuotaUser.body.user.id;

  const lowQuotaLogin = await request(app).post('/api/auth/login').send({
    email: lowQuotaUserEmail,
    password: 'Low1234!',
  });
  expect(lowQuotaLogin.status).toBe(200);
  lowQuotaToken = lowQuotaLogin.body.token;
});

beforeEach(() => {
  mockGenerate.mockReset();
  mockGenerate.mockResolvedValue(
    completion({ content: 'Respuesta simulada de RutaIA.' }),
  );

  mockWeather.mockReset();
  mockWeather.mockResolvedValue(weatherFixture);

  mockRoute.mockReset();
  mockRoute.mockResolvedValue(routeFixture);

  mockWikipedia.mockReset();
  mockWikipedia.mockResolvedValue(wikiFixture);
});

afterAll(async () => {
  try {
    await pool.execute(
      `UPDATE ai_services
       SET enabled = TRUE
       WHERE code IN ('agent_itinerary', 'agent_compare')`,
    );

    const userIds = [agentUserId, lowQuotaUserId].filter(Boolean);

    if (userIds.length > 0) {
      await pool.query('DELETE FROM usage_logs WHERE user_id = ANY($1::bigint[])', [
        userIds,
      ]);
      await pool.query('DELETE FROM agent_runs WHERE user_id = ANY($1::bigint[])', [
        userIds,
      ]);
      await pool.query('DELETE FROM conversations WHERE user_id = ANY($1::bigint[])', [
        userIds,
      ]);
      await pool.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [userIds]);
    }
  } finally {
    await closePool();
  }
});

describe('Fase 5 — agentes multi-paso', () => {
  it('exige autenticación y valida los datos de entrada', async () => {
    const unauthorized = await request(app)
      .post('/api/agents/itinerary')
      .send({ destinationId: 1, days: 3 });

    expect(unauthorized.status).toBe(401);

    const invalid = await request(app)
      .post('/api/agents/itinerary')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ destinationId: 1 });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const duplicated = await request(app)
      .post('/api/agents/compare')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ destinationIds: [1, 1] });

    expect(duplicated.status).toBe(400);
    expect(duplicated.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('ejecuta el agente de itinerario con herramientas y fuentes', async () => {
    mockGenerate
      .mockResolvedValueOnce(
        completion({
          toolCalls: [
            toolCall('get_destination_info', { destinationId: 1 }, 'call_1'),
            toolCall(
              'list_destination_activities',
              { destinationId: 1, limit: 4 },
              'call_2',
            ),
          ],
        }),
      )
      .mockResolvedValueOnce(
        completion({
          toolCalls: [
            toolCall(
              'get_weather_forecast',
              { destinationId: 1, days: 3 },
              'call_3',
            ),
            toolCall(
              'get_route_distance',
              { destinationId: 1, originCity: 'Guatemala' },
              'call_4',
            ),
            toolCall(
              'get_wikipedia_summary',
              { destinationId: 1 },
              'call_5',
            ),
          ],
        }),
      )
      .mockResolvedValueOnce(completion({ content: itineraryAnswer }));

    const response = await request(app)
      .post('/api/agents/itinerary')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        destinationId: 1,
        days: 3,
        travelers: 2,
        budget: 'medio',
        originCity: 'Guatemala',
        interests: ['café', 'naturaleza'],
      });

    expect(response.status).toBe(201);
    expect(response.body.answer).toContain('Día 1');
    expect(response.body.steps).toHaveLength(3);
    expect(response.body.steps[0].results).toHaveLength(2);
    expect(response.body.steps[1].results).toHaveLength(3);
    expect(response.body.usage.totalTokens).toBe(450);
    expect(response.body.quota.usedTokens).toBe(450);
    expect(
      response.body.sources.some((source) => source.title === 'Antigua Guatemala'),
    ).toBe(true);
    expect(
      response.body.sources.some((source) => source.provider === 'Open-Meteo'),
    ).toBe(true);
    expect(
      response.body.sources.some((source) => source.provider === 'OSRM'),
    ).toBe(true);
    expect(
      response.body.sources.some((source) => source.provider === 'Wikipedia'),
    ).toBe(true);

    itineraryRunId = response.body.run.id;
    itineraryConversationId = response.body.conversationId;

    // Los pasos intermedios reciben las herramientas; el último paso no,
    // porque gpt-oss ignora tool_choice: 'none' y Groq responde 400.
    expect(mockGenerate.mock.calls[0][0].tools).toHaveLength(5);
    expect(mockGenerate.mock.calls[1][0].tools).toHaveLength(5);
    expect(mockGenerate.mock.calls[0][0].toolChoice).toBeUndefined();
    expect(mockWeather).toHaveBeenCalledWith(
      expect.objectContaining({ locationName: 'Antigua Guatemala', days: 3 }),
    );
    expect(mockRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        originCity: 'Guatemala',
        destinationName: 'Antigua Guatemala',
      }),
    );
    expect(mockWikipedia).toHaveBeenCalledWith('Antigua Guatemala');

    const [conversationRows] = await pool.execute(
      'SELECT * FROM conversations WHERE id = $1',
      [itineraryConversationId],
    );
    expect(conversationRows[0].service_code).toBe('agent_itinerary');
    expect(Number(conversationRows[0].user_id)).toBe(agentUserId);

    const [messageRows] = await pool.execute(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id ASC',
      [itineraryConversationId],
    );
    expect(messageRows).toHaveLength(2);
    expect(messageRows[1].content).toContain('Día 1');
    const storedSources = parseJson(messageRows[1].sources_json);
    expect(storedSources.length).toBeGreaterThan(0);

    const [runRows] = await pool.execute(
      'SELECT * FROM agent_runs WHERE id = $1',
      [itineraryRunId],
    );
    expect(runRows[0].status).toBe('success');
    expect(Number(runRows[0].total_tokens)).toBe(450);
    expect(parseJson(runRows[0].steps_json)).toHaveLength(3);
    expect(parseJson(runRows[0].output_json).answer).toContain('Día 1');

    const [usageRows] = await pool.execute(
      `SELECT * FROM usage_logs
       WHERE user_id = $1 AND service_code = 'agent_itinerary'
         AND status = 'success'
       ORDER BY id DESC LIMIT 1`,
      [agentUserId],
    );
    expect(Number(usageRows[0].total_tokens)).toBe(450);
    expect(Number(usageRows[0].conversation_id)).toBe(
      itineraryConversationId,
    );
    expect(Number(usageRows[0].message_id)).toBe(
      Number(messageRows[1].id),
    );
  });

  it('ejecuta el agente comparador con múltiples destinos', async () => {
    mockGenerate
      .mockResolvedValueOnce(
        completion({
          toolCalls: [
            toolCall('get_destination_info', { destinationId: 1 }, 'call_1'),
            toolCall('get_destination_info', { destinationId: 2 }, 'call_2'),
          ],
        }),
      )
      .mockResolvedValueOnce(
        completion({
          toolCalls: [
            toolCall(
              'list_destination_activities',
              { destinationId: 1, limit: 4 },
              'call_3',
            ),
            toolCall(
              'list_destination_activities',
              { destinationId: 2, limit: 4 },
              'call_4',
            ),
            toolCall(
              'get_weather_forecast',
              { destinationId: 1, days: 3 },
              'call_5',
            ),
            toolCall(
              'get_weather_forecast',
              { destinationId: 2, days: 3 },
              'call_6',
            ),
            toolCall(
              'get_route_distance',
              { destinationId: 1, originCity: 'Guatemala' },
              'call_7',
            ),
            toolCall(
              'get_route_distance',
              { destinationId: 2, originCity: 'Guatemala' },
              'call_8',
            ),
          ],
        }),
      )
      .mockResolvedValueOnce(completion({ content: compareAnswer }));

    const response = await request(app)
      .post('/api/agents/compare')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        destinationIds: [1, 4],
        days: 4,
        travelers: 2,
        budget: 'alto',
        originCity: 'Guatemala',
        interests: ['playa', 'cultura'],
      });

    expect(response.status).toBe(201);
    expect(response.body.answer).toContain('Recomendación');
    expect(response.body.steps).toHaveLength(3);
    expect(response.body.steps[1].results).toHaveLength(6);
    expect(response.body.usage.totalTokens).toBe(450);
    expect(response.body.quota.usedTokens).toBe(900);
    expect(
      response.body.sources.some(
        (source) => source.title === 'Antigua Guatemala',
      ),
    ).toBe(true);
    expect(
      response.body.sources.some((source) => source.title === 'Lago de Atitlán y Sololá'),
    ).toBe(true);

    compareRunId = response.body.run.id;

    const [runRows] = await pool.execute(
      'SELECT * FROM agent_runs WHERE id = $1',
      [compareRunId],
    );
    expect(runRows[0].service_code).toBe('agent_compare');
    expect(runRows[0].status).toBe('success');
    expect(parseJson(runRows[0].input_json).destinationIds).toEqual([1, 4]);
  });

  it('lista y consulta las ejecuciones propias', async () => {
    const list = await request(app)
      .get('/api/agents/runs')
      .set('Authorization', `Bearer ${agentToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(2);
    expect(list.body.data[0].serviceCode).toBe('agent_compare');
    expect(list.body.data[0].steps).toBeUndefined();

    const filtered = await request(app)
      .get('/api/agents/runs?serviceCode=agent_itinerary')
      .set('Authorization', `Bearer ${agentToken}`);

    expect(filtered.status).toBe(200);
    expect(filtered.body.data).toHaveLength(1);

    const detail = await request(app)
      .get(`/api/agents/runs/${itineraryRunId}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.run.steps).toHaveLength(3);
    expect(detail.body.run.input.destinationId).toBe(1);
    expect(detail.body.run.output.answer).toContain('Día 1');

    const foreign = await request(app)
      .get(`/api/agents/runs/${itineraryRunId}`)
      .set('Authorization', `Bearer ${demoToken}`);

    expect(foreign.status).toBe(404);
  });

  it('bloquea al agente cuando la cuota está agotada', async () => {
    const response = await request(app)
      .post('/api/agents/itinerary')
      .set('Authorization', `Bearer ${lowQuotaToken}`)
      .send({ destinationId: 1, days: 3 });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('TOKEN_QUOTA_EXCEEDED');
    expect(mockGenerate).not.toHaveBeenCalled();

    const [usageRows] = await pool.execute(
      `SELECT * FROM usage_logs
       WHERE user_id = $1 AND status = 'blocked'
       ORDER BY id DESC LIMIT 1`,
      [lowQuotaUserId],
    );
    expect(usageRows[0].service_code).toBe('agent_itinerary');
    expect(usageRows[0].error_code).toBe('TOKEN_QUOTA_EXCEEDED');

    const [runRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM agent_runs WHERE user_id = $1',
      [lowQuotaUserId],
    );
    expect(Number(runRows[0].total)).toBe(0);
  });

  it('registra las ejecuciones fallidas del agente', async () => {
    mockGenerate.mockRejectedValueOnce(
      new AppError(
        502,
        'AI_UPSTREAM_ERROR',
        'Fallo simulado del proveedor de IA.',
      ),
    );

    const [beforeRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM conversations WHERE user_id = $1',
      [agentUserId],
    );

    const response = await request(app)
      .post('/api/agents/itinerary')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ destinationId: 1, days: 2 });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('AI_UPSTREAM_ERROR');

    const [afterRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM conversations WHERE user_id = $1',
      [agentUserId],
    );
    expect(Number(afterRows[0].total)).toBe(Number(beforeRows[0].total));

    const [runRows] = await pool.execute(
      `SELECT * FROM agent_runs
       WHERE user_id = $1 AND status = 'error'
       ORDER BY id DESC LIMIT 1`,
      [agentUserId],
    );
    expect(runRows[0].service_code).toBe('agent_itinerary');
    expect(parseJson(runRows[0].output_json).error.code).toBe(
      'AI_UPSTREAM_ERROR',
    );
    expect(Number(runRows[0].total_tokens)).toBe(0);

    const [usageRows] = await pool.execute(
      `SELECT * FROM usage_logs
       WHERE user_id = $1 AND status = 'error'
       ORDER BY id DESC LIMIT 1`,
      [agentUserId],
    );
    expect(usageRows[0].error_code).toBe('AI_UPSTREAM_ERROR');
  });

  it('genera un resumen de respaldo cuando se agotan los pasos', async () => {
    // El modelo siempre pide otra herramienta: se alcanza AGENT_MAX_STEPS.
    for (let step = 0; step < 8; step += 1) {
      mockGenerate.mockResolvedValueOnce(
        completion({
          toolCalls: [
            toolCall('get_destination_info', { destinationId: 1 }, `call_${step}`),
          ],
        }),
      );
    }

    const response = await request(app)
      .post('/api/agents/itinerary')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ destinationId: 1, days: 2 });

    expect(response.status).toBe(201);
    expect(response.body.answer).toContain('Resumen elaborado');
    expect(response.body.steps.length).toBe(8);
  });

  it('continúa si una herramienta externa falla', async () => {
    mockWeather.mockRejectedValueOnce(
      new AppError(
        502,
        'EXTERNAL_API_ERROR',
        'Clima no disponible en este momento.',
      ),
    );
    mockGenerate
      .mockResolvedValueOnce(
        completion({
          toolCalls: [
            toolCall(
              'get_weather_forecast',
              { destinationId: 1, days: 3 },
              'call_1',
            ),
          ],
        }),
      )
      .mockResolvedValueOnce(
        completion({
          content:
            'No fue posible consultar el clima; el itinerario se presenta con un supuesto de clima templado.',
        }),
      );

    const response = await request(app)
      .post('/api/agents/itinerary')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ destinationId: 1, days: 3 });

    expect(response.status).toBe(201);
    expect(response.body.steps[0].results[0].ok).toBe(false);
    expect(response.body.steps[0].results[0].error.code).toBe(
      'EXTERNAL_API_ERROR',
    );
    expect(response.body.answer).toContain('No fue posible consultar el clima');
  });

  it('rechaza el agente si el servicio está desactivado', async () => {
    const disabled = await request(app)
      .patch('/api/services/agent_itinerary/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false });

    expect(disabled.status).toBe(200);

    try {
      const response = await request(app)
        .post('/api/agents/itinerary')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ destinationId: 1, days: 3 });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SERVICE_DISABLED');
      expect(mockGenerate).not.toHaveBeenCalled();
    } finally {
      const enabled = await request(app)
        .patch('/api/services/agent_itinerary/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true });

      expect(enabled.status).toBe(200);
    }
  });

  it('Swagger documenta los endpoints de los agentes', async () => {
    const response = await request(app).get('/api/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.paths['/agents/itinerary']).toBeDefined();
    expect(response.body.paths['/agents/compare']).toBeDefined();
    expect(response.body.paths['/agents/runs']).toBeDefined();
    expect(response.body.paths['/agents/runs/{id}']).toBeDefined();
    expect(itineraryConversationId).toBeGreaterThan(0);
  });
});

