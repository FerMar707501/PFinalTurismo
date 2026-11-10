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

import app from '../src/app.js';
import { generateChatCompletion } from '../src/ai/groqClient.js';
import { closePool, pool } from '../src/config/db.js';
import { AppError } from '../src/errors/AppError.js';

const mockGenerate = vi.mocked(generateChatCompletion);

let adminToken;
let demoToken;
let chatToken;
let lowQuotaToken;
let chatUserId;
let lowQuotaUserId;
let chatUserEmail;
let lowQuotaUserEmail;
let conversationId;

const stamp = Date.now();

const defaultCompletion = {
  content:
    'Según el catálogo, Cartagena de Indias es una excelente opción [1].',
  model: 'openai/gpt-oss-120b',
  usage: {
    promptTokens: 120,
    completionTokens: 80,
    totalTokens: 200,
  },
};

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

  chatUserEmail = `TEST_Fase4_Chat_${stamp}@rutaia.local`;
  const chatUser = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Usuario Chat Fase 4',
      email: chatUserEmail,
      password: 'Chat1234!',
      role: 'user',
      tokenLimitMonth: 50000,
    });

  expect(chatUser.status).toBe(201);
  chatUserId = chatUser.body.user.id;

  const chatLogin = await request(app).post('/api/auth/login').send({
    email: chatUserEmail,
    password: 'Chat1234!',
  });
  expect(chatLogin.status).toBe(200);
  chatToken = chatLogin.body.token;

  lowQuotaUserEmail = `TEST_Fase4_Low_${stamp}@rutaia.local`;
  const lowQuotaUser = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Usuario Sin Cuota Fase 4',
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
  mockGenerate.mockResolvedValue(defaultCompletion);
});

afterAll(async () => {
  try {
    await pool.execute(
      "UPDATE ai_services SET enabled = TRUE WHERE code = 'chat_rag'",
    );

    const userIds = [chatUserId, lowQuotaUserId].filter(Boolean);

    if (userIds.length > 0) {
      await pool.query('DELETE FROM usage_logs WHERE user_id = ANY($1::bigint[])', [
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

describe('Fase 4 — chat RAG', () => {
  it('exige autenticación', async () => {
    const response = await request(app).post('/api/chat').send({
      message: 'Hola',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('valida que el mensaje no esté vacío', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${chatToken}`)
      .send({ message: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('responde con RAG, guarda mensajes y registra tokens', async () => {
    const message = 'Quiero visitar Cartagena de Indias con niños';

    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${chatToken}`)
      .send({ message });

    expect(response.status).toBe(201);
    expect(response.body.conversation.id).toBeGreaterThan(0);
    expect(response.body.conversation.title).toContain('Cartagena');
    expect(response.body.message.role).toBe('assistant');
    expect(response.body.message.content).toContain('Cartagena');
    expect(response.body.userMessage.role).toBe('user');
    expect(response.body.usage.totalTokens).toBe(200);
    expect(response.body.quota.usedTokens).toBe(200);
    expect(response.body.sources.length).toBeGreaterThan(0);
    expect(
      response.body.sources.some((source) =>
        source.title.includes('Cartagena'),
      ),
    ).toBe(true);

    conversationId = response.body.conversation.id;

    const completionRequest = mockGenerate.mock.calls[0][0];
    expect(completionRequest.model).toBe('openai/gpt-oss-120b');
    expect(completionRequest.messages[0].content).toContain(
      'CONTEXTO RECUPERADO',
    );
    expect(completionRequest.messages.at(-1)).toEqual({
      role: 'user',
      content: message,
    });

    const [conversationRows] = await pool.execute(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId],
    );
    expect(Number(conversationRows[0].user_id)).toBe(chatUserId);

    const [messageRows] = await pool.execute(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id ASC',
      [conversationId],
    );
    expect(messageRows).toHaveLength(2);
    expect(messageRows[0].role).toBe('user');
    expect(messageRows[1].role).toBe('assistant');

    const storedSources =
      typeof messageRows[1].sources_json === 'string'
        ? JSON.parse(messageRows[1].sources_json)
        : messageRows[1].sources_json;
    expect(Array.isArray(storedSources)).toBe(true);
    expect(storedSources.length).toBeGreaterThan(0);

    const [usageRows] = await pool.execute(
      `SELECT * FROM usage_logs
       WHERE user_id = $1 AND status = 'success'
       ORDER BY id DESC LIMIT 1`,
      [chatUserId],
    );

    expect(usageRows[0]).toBeDefined();
    expect(Number(usageRows[0].total_tokens)).toBe(200);
    expect(Number(usageRows[0].conversation_id)).toBe(conversationId);
    expect(Number(usageRows[0].message_id)).toBe(
      Number(messageRows[1].id),
    );
  });

  it('mantiene la memoria y permite consultar el historial', async () => {
    const message = '¿Y qué actividades me recomiendas para niños?';

    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${chatToken}`)
      .send({ conversationId, message });

    expect(response.status).toBe(201);
    expect(response.body.conversation.id).toBe(conversationId);

    const completionRequest = mockGenerate.mock.calls[0][0];
    const promptContents = completionRequest.messages.map(
      (item) => item.content,
    );

    expect(promptContents).toContain(
      'Quiero visitar Cartagena de Indias con niños',
    );
    expect(promptContents).toContain(defaultCompletion.content);
    expect(promptContents.at(-1)).toBe(message);

    const list = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${chatToken}`);

    expect(list.status).toBe(200);
    const listedConversation = list.body.data.find(
      (item) => item.id === conversationId,
    );
    expect(listedConversation).toBeDefined();
    expect(listedConversation.messageCount).toBe(4);

    const detail = await request(app)
      .get(`/api/chat/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${chatToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.messages).toHaveLength(4);
    expect(detail.body.messages.map((item) => item.role)).toEqual([
      'user',
      'assistant',
      'user',
      'assistant',
    ]);

    const foreignDetail = await request(app)
      .get(`/api/chat/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${demoToken}`);

    expect(foreignDetail.status).toBe(404);
  });

  it('responde sin fuentes cuando el catálogo no tiene información', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${chatToken}`)
      .send({ message: 'Quiero un crucero a la luna' });

    expect(response.status).toBe(201);
    expect(response.body.sources).toEqual([]);

    const completionRequest = mockGenerate.mock.calls[0][0];
    expect(completionRequest.messages[0].content).toContain(
      'No se encontraron documentos relevantes',
    );
  });

  it('bloquea la solicitud cuando la cuota está agotada', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${lowQuotaToken}`)
      .send({ message: 'Hola, quiero viajar' });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('TOKEN_QUOTA_EXCEEDED');
    expect(mockGenerate).not.toHaveBeenCalled();

    const [usageRows] = await pool.execute(
      `SELECT * FROM usage_logs
       WHERE user_id = $1 AND status = 'blocked'
       ORDER BY id DESC LIMIT 1`,
      [lowQuotaUserId],
    );

    expect(usageRows[0]).toBeDefined();
    expect(usageRows[0].error_code).toBe('TOKEN_QUOTA_EXCEEDED');
    expect(Number(usageRows[0].total_tokens)).toBe(0);
  });

  it('registra los errores del proveedor de IA', async () => {
    mockGenerate.mockRejectedValueOnce(
      new AppError(
        502,
        'AI_UPSTREAM_ERROR',
        'Fallo simulado del proveedor de IA.',
      ),
    );

    const [beforeRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM conversations WHERE user_id = $1',
      [chatUserId],
    );

    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${chatToken}`)
      .send({ message: 'Mensaje con fallo del proveedor' });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('AI_UPSTREAM_ERROR');

    const [afterRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM conversations WHERE user_id = $1',
      [chatUserId],
    );
    expect(Number(afterRows[0].total)).toBe(Number(beforeRows[0].total));

    const [usageRows] = await pool.execute(
      `SELECT * FROM usage_logs
       WHERE user_id = $1 AND status = 'error'
       ORDER BY id DESC LIMIT 1`,
      [chatUserId],
    );

    expect(usageRows[0]).toBeDefined();
    expect(usageRows[0].error_code).toBe('AI_UPSTREAM_ERROR');
    expect(Number(usageRows[0].total_tokens)).toBe(0);
  });

  it('rechaza el chat si el servicio está desactivado', async () => {
    const disabled = await request(app)
      .patch('/api/services/chat_rag/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false });

    expect(disabled.status).toBe(200);

    try {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${chatToken}`)
        .send({ message: 'Hola' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SERVICE_DISABLED');
      expect(mockGenerate).not.toHaveBeenCalled();
    } finally {
      const enabled = await request(app)
        .patch('/api/services/chat_rag/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true });

      expect(enabled.status).toBe(200);
    }
  });

  it('la cuota refleja el consumo real registrado', async () => {
    const response = await request(app)
      .get('/api/usage/me')
      .set('Authorization', `Bearer ${chatToken}`);

    expect(response.status).toBe(200);

    const [usageRows] = await pool.execute(
      `SELECT COALESCE(SUM(total_tokens), 0) AS total
       FROM usage_logs
       WHERE user_id = $1 AND status = 'success'`,
      [chatUserId],
    );

    expect(response.body.quota.usedTokens).toBe(
      Number(usageRows[0].total),
    );
    expect(response.body.quota.usedTokens).toBe(600);
  });

  it('Swagger documenta los endpoints del chat', async () => {
    const response = await request(app).get('/api/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.paths['/chat']).toBeDefined();
    expect(response.body.paths['/chat/conversations']).toBeDefined();
    expect(
      response.body.paths['/chat/conversations/{id}'],
    ).toBeDefined();
  });
});
