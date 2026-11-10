import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from '../src/config/db.js';

/**
 * Inicializa la base PostgreSQL a partir de db/schema.postgres.sql y
 * db/seed.postgres.sql.
 *
 * Uso:
 *   npm run db:setup                  (recrea y siembra; pide confirmación)
 *   npm run db:setup -- --force       (sin confirmación, para CI/CD)
 *   npm run db:setup -- --keep        (no hace nada si ya hay usuarios)
 *   npm run db:setup -- --schema-only (solo crea las tablas)
 *
 * Usa DATABASE_URL o las variables DB_* de server/.env.
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(currentDir, '../../db');
const schemaPath = path.join(dbDir, 'schema.postgres.sql');
const seedPath = path.join(dbDir, 'seed.postgres.sql');
const args = new Set(process.argv.slice(2));

async function countUsers() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM users');
    return Number(rows[0]?.total ?? 0);
  } catch {
    // La tabla no existe todavía.
    return 0;
  }
}

async function applyFile(file) {
  const sql = fs.readFileSync(file, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
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

  console.log('Aplicando esquema PostgreSQL…');
  await applyFile(schemaPath);

  if (!args.has('--schema-only')) {
    console.log('Insertando datos de demostración…');
    await applyFile(seedPath);
  }

  console.log('Base de datos inicializada.');
}

try {
  await main();
} finally {
  await closePool();
}
