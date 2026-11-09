import fs from 'node:fs';
import path from 'node:path';

const API = 'http://127.0.0.1:4000/api';
const OUT = path.join(process.cwd(), 'qa-screens');
fs.mkdirSync(OUT, { recursive: true });

async function call(method, route, { token, body } = {}) {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(
      `${method} ${route} -> ${response.status}: ${data?.error?.message ?? text}`,
    );
  }
  return data;
}

const login = await call('POST', '/auth/login', {
  body: { email: 'admin@rutaia.local', password: 'Admin123!' },
});
const token = login.token;
const suffix = Date.now().toString().slice(-7);

const user = await call('POST', '/users', {
  token,
  body: {
    name: `QA Fase6 ${suffix}`,
    email: `qa.fase6.${suffix}@rutaia.local`,
    password: 'QaFase6!2026',
    role: 'user',
    tokenLimitMonth: 250000,
    active: true,
  },
});
const destination = await call('POST', '/destinations', {
  token,
  body: {
    name: `Destino QA ${suffix}`,
    region: 'Región QA',
    category: 'Pruebas automatizadas',
    description:
      'Destino temporal creado para validar el formulario de administración y el detalle del catálogo durante la verificación visual.',
    tags: 'qa, pruebas, temporal',
    lat: 4.6,
    lng: -74.08,
    priceLevel: 2,
    bestSeason: 'Todo el año',
    active: true,
  },
});
const activity = await call('POST', '/activities', {
  token,
  body: {
    destinationId: destination.id,
    name: `Actividad QA ${suffix}`,
    description: 'Actividad temporal para verificar el formulario de actividades.',
    category: 'pruebas',
    durationMin: 90,
    price: 45000,
    active: true,
  },
});

const checks = [];
checks.push(['usuario creado', user.user?.email === `qa.fase6.${suffix}@rutaia.local`]);
checks.push([
  'usuario actualizado',
  (
    await call('PATCH', `/users/${user.user.id}`, {
      token,
      body: { tokenLimitMonth: 300000 },
    })
  ).user.tokenLimitMonth === 300000,
]);
checks.push([
  'destino actualizado',
  (
    await call('PATCH', `/destinations/${destination.id}`, {
      token,
      body: { bestSeason: 'Diciembre a marzo', priceLevel: 3 },
    })
  ).bestSeason === 'Diciembre a marzo',
]);
checks.push([
  'actividad actualizada',
  (
    await call('PATCH', `/activities/${activity.id}`, {
      token,
      body: { price: 52000 },
    })
  ).price === 52000,
]);
checks.push([
  'detalle del destino incluye actividad',
  (
    await call('GET', `/destinations/${destination.id}`, { token })
  ).activities.some((item) => item.id === activity.id),
]);

await call('DELETE', `/activities/${activity.id}`, { token });
await call('DELETE', `/destinations/${destination.id}`, { token });
await call('DELETE', `/users/${user.user.id}`, { token });

checks.push([
  'actividad desactivada',
  (await call('GET', `/activities/${activity.id}`, { token })).active === false,
]);
checks.push([
  'destino desactivado',
  (await call('GET', `/destinations/${destination.id}`, { token })).active === false,
]);
checks.push([
  'usuario desactivado',
  (await call('GET', `/users/${user.user.id}`, { token })).user.active === false,
]);

console.table(
  checks.map(([name, ok]) => ({ verificación: name, resultado: ok ? 'OK' : 'FALLÓ' })),
);

if (checks.some(([, ok]) => !ok)) {
  process.exitCode = 1;
}
