const API = 'http://127.0.0.1:4000/api';

async function call(method, route, { token, body, apiKey } = {}) {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
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
  return { status: response.status, data, headers: response.headers };
}

const login = await call('POST', '/auth/login', {
  body: { email: 'admin@rutaia.local', password: 'Admin123!' },
});
const token = login.data.token;

const analytics = await call('GET', '/analytics/usage', { token });
console.log('analytics status', analytics.status);
console.log(
  JSON.stringify(
    {
      meta: analytics.data?.meta,
      totals: analytics.data?.totals,
      services: analytics.data?.byService,
      daily: analytics.data?.daily?.slice(-4),
      users: analytics.data?.byUser?.length,
    },
    null,
    2,
  ),
);

const csv = await call('GET', '/analytics/usage.csv?from=2026-11-01&to=2026-11-09', {
  token,
});
console.log('csv status', csv.status, csv.headers.get('content-type'));
console.log(String(csv.data).split('\r\n').slice(0, 4).join('\n'));

const created = await call('POST', '/analytics/clients', {
  token,
  body: { name: 'TEST_Fase7 Power BI' },
});
console.log('client', created.status, created.data);

if (created.status === 201) {
  const external = await call('GET', '/external/analytics/usage?from=2026-11-01', {
    apiKey: created.data.apiKey,
  });
  console.log('external', external.status, external.data?.totals);
  console.log('external client header', external.headers.get('x-api-client'));

  const unauthorized = await call('GET', '/external/analytics/usage');
  console.log('external sin key', unauthorized.status, unauthorized.data?.error);

  const disabled = await call(
    'PATCH',
    `/analytics/clients/${created.data.id}/status`,
    { token, body: { active: false } },
  );
  console.log('disable', disabled.status, disabled.data);

  const afterDisable = await call('GET', '/external/analytics/usage', {
    apiKey: created.data.apiKey,
  });
  console.log('external desactivada', afterDisable.status, afterDisable.data?.error);
}
