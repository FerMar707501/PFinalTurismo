import fs from 'node:fs';

/**
 * Utilidad de migración (solo desarrollo e idempotente).
 *
 * Mueve el handler `app.get('/')` (información de la API) a `${API_PREFIX}/`
 * para que la raíz quede libre para la SPA.
 */
const file = 'server/src/app.js';
let source = fs.readFileSync(file, 'utf8');

const rootBlock = `app.get('/', (_req, res) => {
  res.json({
    service: APP_NAME,
    version: APP_VERSION,
    environment: env.NODE_ENV,
    docs: \`\${API_PREFIX}/docs\`,
    health: \`\${API_PREFIX}/health\`,
    timestamp: new Date().toISOString(),
  });
});

`;

if (source.includes(rootBlock)) {
  source = source.replace(rootBlock, '');
}

// Evita duplicar el bloque de ${API_PREFIX}/ si ya existe.
if (!source.includes('app.get(`${API_PREFIX}/`, (_req, res)')) {
  source = source.replace(
    '// Alias cortos para enlaces de entrega',
    `app.get(\`\${API_PREFIX}/\`, (_req, res) => {
  res.json({
    service: APP_NAME,
    version: APP_VERSION,
    environment: env.NODE_ENV,
    docs: \`\${API_PREFIX}/docs\`,
    health: \`\${API_PREFIX}/health\`,
    timestamp: new Date().toISOString(),
  });
});

// Alias cortos para enlaces de entrega`,
  );
}

fs.writeFileSync(file, source, 'utf8');
console.log('app.js reorganizado');
