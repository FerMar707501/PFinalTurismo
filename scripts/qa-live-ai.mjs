// Verificación en vivo de chat RAG y agentes con Groq real.
// Uso: node scripts/qa-live-ai.mjs [http://localhost:4000]
const base = (process.argv[2] ?? 'http://localhost:4000').replace(/\/$/, '');

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

const results = [];
function report(name, ok, detail) {
  results.push({ prueba: name, resultado: ok ? 'OK' : 'FALLÓ', detalle: detail });
}

// 1. Login
const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'demo@rutaia.local', password: 'Demo123!' }),
});
report('login usuario demo', login.status === 200, `estado ${login.status}`);
const token = login.body?.token;
const quotaBefore = login.body?.quota?.usedTokens ?? 0;

// 2. Servicios de IA habilitados (la API devuelve un array)
const services = await request('/api/services', { token });
const list = Array.isArray(services.body) ? services.body : services.body?.data;
const chatService = list?.find((service) => service.code === 'chat_rag');
report(
  'servicio chat_rag activo',
  Boolean(chatService?.enabled),
  chatService ? `modelo ${chatService.model}` : 'sin datos',
);

// 3. Primer mensaje del chat
const first = await request('/api/chat', {
  token,
  method: 'POST',
  body: JSON.stringify({
    message: '¿Qué actividades recomiendas en Cartagena para viajar con niños?',
  }),
});
const reply = first.body?.message?.content ?? '';
report(
  'POST /api/chat responde',
  first.status === 201 && reply.length > 0,
  `estado ${first.status} · ${reply.length} caracteres`,
);
report(
  'chat cita fuentes del RAG',
  (first.body?.sources?.length ?? 0) > 0,
  `${first.body?.sources?.length ?? 0} fuentes`,
);

// 4. Memoria de la conversación
const conversationId = first.body?.conversation?.id;
const second = await request('/api/chat', {
  token,
  method: 'POST',
  body: JSON.stringify({
    conversationId,
    message: '¿Y si llueve? Dame una alternativa bajo techo.',
  }),
});
report(
  'memoria de conversación',
  second.status === 201 && Boolean(second.body?.message?.content),
  `conversación ${conversationId}`,
);

// 5. Cuota actualizada
const usage = await request('/api/usage/me', { token });
const used = usage.body?.quota?.usedTokens ?? 0;
report(
  'tokens descontados de la cuota',
  used > quotaBefore,
  `${quotaBefore} → ${used} usados de ${usage.body?.quota?.limitTokens ?? 0}`,
);

// 6. Agente de itinerario
const itinerary = await request('/api/agents/itinerary', {
  token,
  method: 'POST',
  body: JSON.stringify({
    destinationId: 6,
    days: 3,
    travelers: 2,
    budget: 'medio',
    originCity: 'Bogotá',
    interests: ['café', 'naturaleza'],
    notes: 'Buscamos actividades tranquilas.',
  }),
});
const itineraryRun = itinerary.body?.run;
report(
  'agente de itinerario',
  itinerary.status === 201 && Boolean(itinerary.body?.answer),
  `estado ${itinerary.status} · ${itinerary.body?.steps?.length ?? 0} pasos · ${itineraryRun?.totalTokens ?? 0} tokens`,
);

// 7. Agente comparador
const compare = await request('/api/agents/compare', {
  token,
  method: 'POST',
  body: JSON.stringify({
    destinationIds: [1, 4],
    days: 3,
    travelers: 2,
    budget: 'medio',
    originCity: 'Bogotá',
    interests: ['playa', 'cultura'],
  }),
});
report(
  'agente comparador',
  compare.status === 201 && Boolean(compare.body?.answer),
  `estado ${compare.status} · ${compare.body?.steps?.length ?? 0} pasos · ${compare.body?.run?.totalTokens ?? 0} tokens`,
);

console.table(results);

if (reply) {
  console.log('\n--- Respuesta del chat (primeros 500 caracteres) ---');
  console.log(reply.slice(0, 500));
}

if (itinerary.body?.answer) {
  console.log('\n--- Itinerario (primeros 400 caracteres) ---');
  console.log(String(itinerary.body.answer).slice(0, 400));
}

if (results.some((result) => result.resultado !== 'OK')) {
  process.exitCode = 1;
}
