import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';

afterAll(async () => {
  await closePool();
});

describe('API base', () => {
  it('GET /api/ devuelve la información del servicio', async () => {
    const response = await request(app).get('/api/');

    expect(response.status).toBe(200);
    expect(response.body.service).toBe('RutaIA API');
    expect(response.body.docs).toBe('/api/docs');
    expect(response.body.health).toBe('/api/health');
  });

  it('GET /api/health responde 200 y confirma PostgreSQL', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database.status).toBe('up');
    expect(response.body.database.version).toMatch(/^PostgreSQL/);
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('GET /api/docs.json expone el documento OpenAPI', async () => {
    const response = await request(app).get('/api/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths['/health']).toBeDefined();
  });

  it('GET /api/docs/ sirve Swagger UI', async () => {
    const response = await request(app).get('/api/docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });

  it('GET /api incluye rate limit y no expone X-Powered-By', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['ratelimit-limit']).toBe('300');
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });

  it('CORS permite el origen configurado y rechaza otros', async () => {
    const allowed = await request(app)
      .get('/api')
      .set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );

    const denied = await request(app)
      .get('/api')
      .set('Origin', 'http://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('una ruta inexistente devuelve 404 con formato de error', async () => {
    const response = await request(app).get('/api/no-existe');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.requestId).toBeTruthy();
  });

  it('un JSON inválido devuelve 400', async () => {
    const response = await request(app)
      .post('/api/no-existe')
      .set('Content-Type', 'application/json')
      .send('{"nombre":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });
});
