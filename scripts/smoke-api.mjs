// Verificación de humo de una API desplegada.
// Uso: node scripts/smoke-api.mjs https://mi-api.onrender.com
const base = (process.argv[2] ?? 'http://localhost:4000').replace(/\/$/, '');
const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ prueba: name, resultado: 'OK' });
  } catch (error) {
    checks.push({ prueba: name, resultado: `FALLÓ: ${error.message}` });
    process.exitCode = 1;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: { Accept: 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, headers: response.headers };
}

let adminToken;

await check('health check 200 y MySQL arriba', async () => {
  const { status, body } = await request('/api/health');
  if (status !== 200) throw new Error(`estado ${status}`);
  if (body.database?.status !== 'up') throw new Error('MySQL no responde');
});

await check('OpenAPI expuesto', async () => {
  const { status, body } = await request('/api/docs.json');
  if (status !== 200 || !body.paths) throw new Error(`estado ${status}`);
  for (const path of ['/analytics/usage', '/external/analytics/usage']) {
    if (!body.paths[path]) throw new Error(`falta ${path}`);
  }
});

await check('login de administrador', async () => {
  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL ?? 'admin@rutaia.local',
      password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
    }),
  });

  if (login.status !== 200) throw new Error(`estado ${login.status}`);
  adminToken = login.body.token;
  if (!adminToken) throw new Error('sin token');
});

await check('catálogo público', async () => {
  const { status, body } = await request('/api/destinations?limit=3');
  if (status !== 200) throw new Error(`estado ${status}`);
  if (!body.data?.length) throw new Error('catálogo vacío');
});

await check('reporte de analítica (admin)', async () => {
  const { status, body } = await request('/api/analytics/usage', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (status !== 200) throw new Error(`estado ${status}`);
  if (!body.totals || !body.meta) throw new Error('respuesta incompleta');
});

await check('reporte externo exige API key', async () => {
  const { status, body } = await request('/api/external/analytics/usage');
  if (status !== 401) throw new Error(`estado ${status}`);
  if (body.error?.code !== 'API_KEY_REQUIRED') {
    throw new Error('código de error inesperado');
  }
});

console.table(checks);
