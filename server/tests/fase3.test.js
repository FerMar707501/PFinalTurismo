import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { closePool, pool } from '../src/config/db.js';

let adminToken;
let demoToken;
let adminLoginBody;
let demoLoginBody;
let testUserId;
let testUserEmail;
let testUserToken;
let destinationId;
let activityId;

const stamp = Date.now();
const destinationName = `TEST_Fase3_${stamp}`;

beforeAll(async () => {
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@rutaia.local',
    password: 'Admin123!',
  });
  expect(adminLogin.status).toBe(200);
  adminLoginBody = adminLogin.body;
  adminToken = adminLogin.body.token;

  const demoLogin = await request(app).post('/api/auth/login').send({
    email: 'demo@rutaia.local',
    password: 'Demo123!',
  });
  expect(demoLogin.status).toBe(200);
  demoLoginBody = demoLogin.body;
  demoToken = demoLogin.body.token;
});

afterAll(async () => {
  try {
    await pool.execute(
      "UPDATE ai_services SET enabled = TRUE WHERE code = 'chat_rag'",
    );

    if (destinationId) {
      const [activities] = await pool.execute(
        'SELECT id FROM activities WHERE destination_id = $1',
        [destinationId],
      );
      const activityIds = activities.map((activity) => Number(activity.id));

      if (activityIds.length > 0) {
        await pool.query(
          "DELETE FROM documents WHERE source_type = 'activity' AND source_id = ANY($1::bigint[])",
          [activityIds],
        );
      }

      await pool.execute(
        "DELETE FROM documents WHERE source_type = 'destination' AND source_id = $1",
        [destinationId],
      );
      await pool.execute('DELETE FROM destinations WHERE id = $1', [
        destinationId,
      ]);
    }

    if (testUserEmail) {
      await pool.execute('DELETE FROM users WHERE email = $1', [
        testUserEmail,
      ]);
    }
  } finally {
    await closePool();
  }
});

describe('Fase 3 — autenticación', () => {
  it('inicia sesión como administrador y devuelve JWT y cuota', () => {
    expect(adminLoginBody.token).toBeTruthy();
    expect(adminLoginBody.tokenType).toBe('Bearer');
    expect(adminLoginBody.user.role).toBe('admin');
    expect(adminLoginBody.user).not.toHaveProperty('password_hash');
    expect(adminLoginBody.quota.limitTokens).toBe(500000);
  });

  it('rechaza credenciales incorrectas', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@rutaia.local',
      password: 'ClaveIncorrecta123!',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('devuelve el usuario autenticado en /auth/me', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${demoToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('demo@rutaia.local');
    expect(response.body.quota.period).toMatch(/^\d{4}-\d{2}$/);
    expect(response.body.quota.remainingTokens).toBe(
      response.body.quota.limitTokens - response.body.quota.usedTokens,
    );
  });

  it('exige token en /auth/me', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rechaza un correo inválido con error de validación', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'no-es-un-correo',
      password: 'x',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Fase 3 — usuarios y roles', () => {
  it('un usuario normal no puede listar usuarios', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${demoToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('un administrador lista usuarios con su cuota', async () => {
    const response = await request(app)
      .get('/api/users?limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(3);
    expect(response.body.data[0].quota).toBeDefined();
    expect(response.body.data[0].quota.limitTokens).toBeGreaterThanOrEqual(0);
  });

  it('crea un usuario y permite su login', async () => {
    testUserEmail = `test-fase3-${stamp}@rutaia.local`;

    const created = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Usuario Fase 3',
        email: testUserEmail,
        password: 'Test1234!',
        role: 'user',
        tokenLimitMonth: 12345,
      });

    expect(created.status).toBe(201);
    expect(created.body.user.email).toBe(testUserEmail);
    expect(created.body.user.active).toBe(true);
    expect(created.body.quota.limitTokens).toBe(12345);
    testUserId = created.body.user.id;

    const login = await request(app).post('/api/auth/login').send({
      email: testUserEmail,
      password: 'Test1234!',
    });

    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('user');
    expect(login.body.quota.limitTokens).toBe(12345);
    testUserToken = login.body.token;
  });

  it('encuentra el usuario por búsqueda', async () => {
    const response = await request(app)
      .get(`/api/users?search=${encodeURIComponent(testUserEmail)}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.data[0].id).toBe(testUserId);
  });

  it('no permite repetir el correo de otro usuario', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Correo Duplicado',
        email: 'demo@rutaia.local',
        password: 'Test1234!',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('actualiza la cuota del usuario a cero y la marca excedida', async () => {
    const updated = await request(app)
      .patch(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tokenLimitMonth: 0 });

    expect(updated.status).toBe(200);
    expect(updated.body.quota.limitTokens).toBe(0);
    expect(updated.body.quota.exceeded).toBe(true);

    const usage = await request(app)
      .get('/api/usage/me')
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(usage.status).toBe(200);
    expect(usage.body.quota.limitTokens).toBe(0);
    expect(usage.body.quota.exceeded).toBe(true);
  });

  it('un administrador no puede desactivarse a sí mismo', async () => {
    const response = await request(app)
      .patch('/api/users/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SELF_DEACTIVATION');
  });

  it('desactiva un usuario y bloquea su login', async () => {
    const deactivated = await request(app)
      .delete(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deactivated.status).toBe(200);
    expect(deactivated.body.user.active).toBe(false);

    const login = await request(app).post('/api/auth/login').send({
      email: testUserEmail,
      password: 'Test1234!',
    });

    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('USER_INACTIVE');
  });

  it('reactiva un usuario y permite su login de nuevo', async () => {
    const reactivated = await request(app)
      .patch(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true });

    expect(reactivated.status).toBe(200);
    expect(reactivated.body.user.active).toBe(true);

    const login = await request(app).post('/api/auth/login').send({
      email: testUserEmail,
      password: 'Test1234!',
    });

    expect(login.status).toBe(200);
  });
});

describe('Fase 3 — catálogo y sincronización RAG', () => {
  it('lista destinos activos públicamente', async () => {
    const response = await request(app).get('/api/destinations?limit=5');

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((destination) => destination.active)).toBe(
      true,
    );
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(12);
  });

  it('crea un destino como administrador', async () => {
    const response = await request(app)
      .post('/api/destinations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: destinationName,
        region: 'Región de prueba',
        description:
          'Destino creado por las pruebas automáticas de la Fase 3.',
        category: 'Pruebas',
        tags: ['test', 'fase3'],
        lat: 4.5,
        lng: -74.1,
        priceLevel: 2,
        bestSeason: 'Todo el año',
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe(destinationName);
    expect(response.body.tags).toEqual(['test', 'fase3']);
    expect(response.body.active).toBe(true);
    destinationId = response.body.id;
  });

  it('crea una actividad asociada al destino', async () => {
    const response = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        destinationId,
        name: 'Actividad de prueba Fase 3',
        description:
          'Actividad creada por las pruebas automáticas de la Fase 3.',
        category: 'Pruebas',
        durationMin: 60,
        price: 10000,
        lat: 4.5,
        lng: -74.1,
      });

    expect(response.status).toBe(201);
    expect(response.body.destinationId).toBe(destinationId);
    expect(response.body.destinationName).toBe(destinationName);
    expect(response.body.active).toBe(true);
    activityId = response.body.id;
  });

  it('el destino público incluye su actividad', async () => {
    const response = await request(app).get(`/api/destinations/${destinationId}`);

    expect(response.status).toBe(200);
    expect(response.body.activityCount).toBe(1);
    expect(response.body.activities.some((activity) => activity.id === activityId)).toBe(
      true,
    );
  });

  it('actualiza el destino y sincroniza los documentos del RAG', async () => {
    const updatedName = `${destinationName} actualizado`;

    const response = await request(app)
      .patch(`/api/destinations/${destinationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: updatedName });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe(updatedName);

    const [destinationDocs] = await pool.execute(
      "SELECT title FROM documents WHERE source_type = 'destination' AND source_id = $1",
      [destinationId],
    );
    const [activityDocs] = await pool.execute(
      "SELECT title FROM documents WHERE source_type = 'activity' AND source_id = $1",
      [activityId],
    );

    expect(destinationDocs[0]?.title).toBe(updatedName);
    expect(activityDocs[0]?.title).toContain(updatedName);
  });

  it('actualiza una actividad y sincroniza los documentos del RAG', async () => {
    const updatedName = 'Actividad de prueba Fase 3 actualizada';

    const response = await request(app)
      .patch(`/api/activities/${activityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: updatedName,
        durationMin: 90,
        price: 12000,
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe(updatedName);
    expect(response.body.durationMin).toBe(90);
    expect(response.body.price).toBe(12000);

    const [docs] = await pool.execute(
      `SELECT title, content
       FROM documents
       WHERE source_type = 'activity' AND source_id = $1`,
      [activityId],
    );

    expect(docs[0]?.title).toContain(updatedName);
    expect(docs[0]?.content).toContain('90 minutos');
  });

  it('desactiva una actividad y la oculta al público', async () => {
    const response = await request(app)
      .delete(`/api/activities/${activityId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.activity.active).toBe(false);

    const publicResponse = await request(app).get(
      `/api/activities/${activityId}`,
    );
    expect(publicResponse.status).toBe(404);

    const adminResponse = await request(app)
      .get(`/api/activities/${activityId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.active).toBe(false);

    const [docs] = await pool.execute(
      "SELECT COUNT(*) AS total FROM documents WHERE source_type = 'activity' AND source_id = $1",
      [activityId],
    );
    expect(Number(docs[0].total)).toBe(0);
  });

  it('desactiva un destino y lo oculta al público', async () => {
    const response = await request(app)
      .delete(`/api/destinations/${destinationId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.destination.active).toBe(false);

    const publicResponse = await request(app).get(
      `/api/destinations/${destinationId}`,
    );
    expect(publicResponse.status).toBe(404);

    const adminResponse = await request(app)
      .get(`/api/destinations/${destinationId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.active).toBe(false);

    const [docs] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM documents
       WHERE (source_type = 'destination' AND source_id = $1)
          OR (source_type = 'activity' AND source_id = $2)`,
      [destinationId, activityId],
    );
    expect(Number(docs[0].total)).toBe(0);
  });

  it('el administrador puede filtrar destinos inactivos', async () => {
    const adminResponse = await request(app)
      .get(
        `/api/destinations?active=false&search=${encodeURIComponent(
          `${destinationName} actualizado`,
        )}`,
      )
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminResponse.status).toBe(200);
    expect(
      adminResponse.body.data.some(
        (destination) => destination.id === destinationId,
      ),
    ).toBe(true);

    const publicResponse = await request(app).get(
      `/api/destinations?active=false&search=${encodeURIComponent(
        `${destinationName} actualizado`,
      )}`,
    );

    expect(publicResponse.status).toBe(200);
    expect(
      publicResponse.body.data.some(
        (destination) => destination.id === destinationId,
      ),
    ).toBe(false);
  });
});

describe('Fase 3 — servicios de IA', () => {
  it('lista solo servicios habilitados para el público', async () => {
    const response = await request(app).get('/api/services');

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(3);
    expect(response.body.every((service) => service.enabled)).toBe(true);
    expect(response.body.every((service) => !service.systemPrompt)).toBe(true);
  });

  it('el administrador ve el system prompt', async () => {
    const response = await request(app)
      .get('/api/services')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(3);
    expect(response.body[0].systemPrompt).toBeTruthy();
  });

  it('actualiza la configuración de un servicio de IA', async () => {
    const current = await request(app)
      .get('/api/services/chat_rag')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(current.status).toBe(200);
    const originalMaxTokens = current.body.maxTokens;

    try {
      const updated = await request(app)
        .patch('/api/services/chat_rag')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxTokens: originalMaxTokens + 1 });

      expect(updated.status).toBe(200);
      expect(updated.body.maxTokens).toBe(originalMaxTokens + 1);
    } finally {
      const restored = await request(app)
        .patch('/api/services/chat_rag')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxTokens: originalMaxTokens });

      expect(restored.status).toBe(200);
      expect(restored.body.maxTokens).toBe(originalMaxTokens);
    }
  });

  it('desactiva y reactiva un servicio de IA', async () => {
    const disabled = await request(app)
      .patch('/api/services/chat_rag/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false });

    expect(disabled.status).toBe(200);
    expect(disabled.body.enabled).toBe(false);

    try {
      const publicResponse = await request(app).get(
        '/api/services/chat_rag',
      );
      expect(publicResponse.status).toBe(404);

      const adminResponse = await request(app)
        .get('/api/services/chat_rag')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.enabled).toBe(false);
    } finally {
      const enabled = await request(app)
        .patch('/api/services/chat_rag/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true });
      expect(enabled.status).toBe(200);
    }
  });

  it('rechaza una temperatura fuera de rango', async () => {
    const response = await request(app)
      .patch('/api/services/chat_rag')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ temperature: 3 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Fase 3 — consumo y documentación', () => {
  it('el usuario demo consulta su cuota mensual', async () => {
    const response = await request(app)
      .get('/api/usage/me')
      .set('Authorization', `Bearer ${demoToken}`);

    expect(response.status).toBe(200);
    expect(response.body.quota.limitTokens).toBe(50000);
    expect(response.body.quota.usedTokens).toBeGreaterThan(0);
    expect(response.body.quota.remainingTokens).toBe(
      response.body.quota.limitTokens - response.body.quota.usedTokens,
    );
    expect(response.body.quota.period).toMatch(/^\d{4}-\d{2}$/);
  });

  it('el administrador consulta la cuota de un usuario', async () => {
    const response = await request(app)
      .get('/api/users/2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(2);
    expect(response.body.quota.limitTokens).toBe(50000);
  });

  it('Swagger documenta los endpoints de la Fase 3', async () => {
    const response = await request(app).get('/api/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths['/auth/login']).toBeDefined();
    expect(response.body.paths['/users']).toBeDefined();
    expect(response.body.paths['/destinations']).toBeDefined();
    expect(response.body.paths['/activities']).toBeDefined();
    expect(response.body.paths['/services/{code}/status']).toBeDefined();
    expect(response.body.paths['/usage/me']).toBeDefined();
  });
});
