import pg from 'pg';
import { env } from './env.js';

const { Pool, types } = pg;

// numeric → number (DECIMAL de precios y coordenadas se usan como número en la API).
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));
// bigint (int8) → number, siempre que quepa en un entero seguro.
types.setTypeParser(20, (value) => (value === null ? null : Number(value)));
// int8 de COUNT(*) llega como string por defecto; ya convertido arriba.

function buildPoolConfig() {
  // DATABASE_URL tiene prioridad (Render, Heroku, Supabase…).
  if (env.DATABASE_URL) {
    const needsSsl =
      env.DATABASE_SSL === 'true' ||
      /sslmode=require/.test(env.DATABASE_URL) ||
      env.NODE_ENV === 'production';
    return {
      connectionString: env.DATABASE_URL,
      max: env.DB_CONNECTION_LIMIT,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    max: env.DB_CONNECTION_LIMIT,
    ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

export const pool = new Pool(buildPoolConfig());

pool.on('error', (error) => {
  console.error('[db] error en cliente inactivo:', error.message);
});

/**
 * Ejecuta una consulta y devuelve las filas.
 * Compatible con el uso anterior `const [rows] = await pool.execute(...)`.
 */
export async function query(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * Compatibilidad con el patrón `const [rows] = await pool.execute(sql, params)`
 * del código existente.
 *
 * Se usa `pool.query` (no `pool.query` con nombre) porque las consultas
 * dinámicas comparten plantilla con distinto número de parámetros y pg cachea
 * los planes de las sentencias preparadas.
 */
pool.execute = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return [result.rows, { affectedRows: result.rowCount, rows: result.rows }];
};

/**
 * Ejecuta una consulta dinámica (el SQL cambia según los filtros) y devuelve
 * las filas. Evita la caché de sentencias preparadas de pg.
 */
export async function queryRows(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function withTransaction(callback) {
  const client = await pool.connect();

  // Compatibilidad con el patrón `connection.execute(sql, params)`.
  if (!client.execute) {
    client.execute = async (sql, params = []) => {
      const result = await client.query(sql, params);
      return [result.rows, { affectedRows: result.rowCount, rows: result.rows }];
    };
  }

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection() {
  const { rows } = await pool.query('SELECT version() AS version');
  return rows[0]?.version ?? null;
}

export async function closePool() {
  await pool.end();
}
