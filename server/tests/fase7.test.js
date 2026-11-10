import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { closePool, pool } from '../src/config/db.js';

let adminToken;
let demoToken;
let clientId;
let apiKey;

const stamp = Date.now();
const serviceCode = 'chat_rag';
const today = new Date().toISOString().slice(0, 10);

async function insertUsage(userId, tokens, createdAt) {
  await pool.execute(
    `INSERT INTO usage_logs
       (user_id, service_code, model, prompt_tokens, completion_tokens,
        total_tokens, latency_ms, status, created_at)
     VALUES ($1, $2, 'openai/gpt-oss-120b', $3, $4, $5, 1200, 'success', $6)`,
    [userId, serviceCode, Math.floor(tokens / 2), tokens - Math.floor(tokens / 2), tokens, createdAt],
  );
}

beforeAll(async () => {
  const admin = await request(app).post('/api/auth/login').send({
    email: 'admin@rutaia.local',
    password: 'Admin123!',
  });
  adminToken = admin.body.token;

  const demo = await request(app).post('/api/auth/login').send({
    email: 'demo@rutaia.local',
    password: 'Demo123!',
  });
  demoToken = demo.body.token;

  const [users] = await pool.execute(
    "SELECT id, email FROM users WHERE email IN ('admin@rutaia.local', 'demo@rutaia.local') ORDER BY id ASC",
  );
  const byEmail = Object.fromEntries(
    users.map((user) => [user.email, Number(user.id)]),
  );

  // Datos deterministas dentro del rango probado.
  await insertUsage(byEmail['admin@rutaia.local'], 100, `${today} 09:00:00`);
  await insertUsage(byEmail['demo@rutaia.local'], 200, `${today} 10:00:00`);
  await insertUsage(byEmail['demo@rutaia.local'], 300, `${today} 11:00:00`);
});

afterAll(async () => {
  try {
    if (clientId) {
      await pool.execute('DELETE FROM api_clients WHERE id = $1', [clientId]);
    }

    await pool.execute(
      "DELETE FROM usage_logs WHERE service_code = $1 AND model = 'openai/gpt-oss-120b' AND created_at >= $2 AND total_tokens IN (100, 200, 300)",
      [serviceCode, `${today} 00:00:00`],
    );
  } finally {
    await closePool();
  }
});

describe('Fase 7 — analítica', () => {
  it('rechaza el reporte sin autenticación', async () => {
    const response = await request(app).get('/api/analytics/usage');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rechaza el reporte para usuarios que no son administradores', async () => {
    const response = await request(app)
      .get('/api/analytics/usage')
      .set('Authorization', `Bearer ${demoToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('devuelve el reporte con totales, series y desglose por servicio', async () => {
    const response = await request(app)
      .get('/api/analytics/usage')
      .query({ from: today, to: today })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.from).toBe(today);
    expect(response.body.meta.to).toBe(today);
    expect(response.body.meta.days).toBe(1);
    expect(response.body.totals.requests).toBeGreaterThanOrEqual(3);
    expect(response.body.totals.totalTokens).toBeGreaterThanOrEqual(600);
    expect(response.body.totals.successRate).toBeGreaterThan(0);
    expect(response.body.daily).toHaveLength(1);
    expect(response.body.daily[0].date).toBe(today);
    expect(
      response.body.byService.some((item) => item.serviceCode === serviceCode),
    ).toBe(true);
    expect(
      response.body.byUser.some((item) => item.email === 'demo@rutaia.local'),
    ).toBe(true);
  });

  it('valida el rango de fechas', async () => {
    const response = await request(app)
      .get('/api/analytics/usage')
      .query({ from: '2026-02-10', to: '2026-02-01' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('filtra por servicio', async () => {
    const response = await request(app)
      .get('/api/analytics/usage')
      .query({ from: today, to: today, serviceCode })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.byService).toHaveLength(1);
    expect(response.body.byService[0].serviceCode).toBe(serviceCode);
    expect(response.body.totals.totalTokens).toBeGreaterThanOrEqual(600);
  });

  it('exporta el reporte en CSV', async () => {
    const response = await request(app)
      .get('/api/analytics/usage.csv')
      .query({ from: today, to: today })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.text.split('\r\n')[0]).toContain('tokens_total');
    expect(response.text).toContain(today);
  });

  it('crea un cliente de API y entrega la clave una sola vez', async () => {
    const response = await request(app)
      .post('/api/analytics/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TEST_Fase7 ${stamp}` });

    expect(response.status).toBe(201);
    expect(response.body.apiKey).toMatch(/^rutaia_[a-f0-9]{48}$/);
    expect(response.body.scope).toBe('analytics:read');
    clientId = response.body.id;
    apiKey = response.body.apiKey;

    const list = await request(app)
      .get('/api/analytics/clients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.some((client) => client.id === clientId)).toBe(true);
    expect(list.body.data.find((client) => client.id === clientId)).not.toHaveProperty(
      'apiKey',
    );
  });

  it('expone el reporte a consumidores externos con X-API-Key', async () => {
    const response = await request(app)
      .get('/api/external/analytics/usage')
      .query({ from: today, to: today })
      .set('X-API-Key', apiKey);

    expect(response.status).toBe(200);
    expect(response.headers['x-api-client']).toContain('TEST_Fase7');
    expect(response.body.totals.totalTokens).toBeGreaterThanOrEqual(600);
  });

  it('rechaza una API key inexistente', async () => {
    const response = await request(app)
      .get('/api/external/analytics/usage')
      .set('X-API-Key', 'rutaia_invalidkey');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_API_KEY');
  });

  it('desactiva el cliente de API y bloquea su clave', async () => {
    const disabled = await request(app)
      .patch(`/api/analytics/clients/${clientId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });

    expect(disabled.status).toBe(200);
    expect(disabled.body.active).toBe(false);

    const blocked = await request(app)
      .get('/api/external/analytics/usage')
      .set('X-API-Key', apiKey);

    expect(blocked.status).toBe(401);
    expect(blocked.body.error.code).toBe('INVALID_API_KEY');
  });
});
