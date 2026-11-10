import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from '../src/config/db.js';

/**
 * Inicializa la base a partir de db/schema.sql y db/seed.sql.
 * Útil para entornos gestionados donde no se puede montar el init de Docker.
 *
 * Uso:
 *   npm run db:setup                  (recrea y siembra; pide confirmación)
 *   npm run db:setup -- --force       (sin confirmación, para CI/CD)
 *   npm run db:setup -- --keep        (no hace nada si ya hay usuarios)
 *
 * Requiere el cliente `mysql` disponible (MYSQL_CLIENT) o ejecutar los SQL
 * manualmente. Usa las variables DB_* de server/.env.
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(currentDir, '../../db');
const schemaPath = path.join(dbDir, 'schema.sql');
const seedPath = path.join(dbDir, 'seed.sql');
const args = new Set(process.argv.slice(2));

async function countUsers() {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM users');
    return Number(rows[0]?.total ?? 0);
  } catch {
    // La tabla no existe todavía.
    return 0;
  }
}

function applyFile(client, file) {
  execFileSync(
    client,
    [
      '-h',
      process.env.DB_HOST,
      '-P',
      process.env.DB_PORT,
      '-u',
      process.env.DB_USER,
      process.env.DB_NAME,
    ],
    {
      input: fs.readFileSync(file),
      env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD },
      stdio: ['pipe', 'inherit', 'inherit'],
    },
  );
}

async function main() {
  const users = await countUsers();

  if (users > 0 && args.has('--keep')) {
    console.log(`La base ya tiene ${users} usuarios; no se modifica.`);
    return;
  }

  if (users > 0 && !args.has('--force')) {
    console.error(
      `La base ya tiene ${users} usuarios. Usa --force para recrearla o --keep para omitir.`,
    );
    process.exitCode = 1;
    return;
  }

  const client = process.env.MYSQL_CLIENT;

  if (!client) {
    console.error(
      'Define MYSQL_CLIENT con la ruta al cliente mysql (o ejecuta db/schema.sql y db/seed.sql manualmente).',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Aplicando esquema y datos de demostración en ${process.env.DB_NAME}…`,
  );
  applyFile(client, schemaPath);
  applyFile(client, seedPath);
  console.log('Base de datos inicializada.');
}

try {
  await main();
} finally {
  await closePool();
}
