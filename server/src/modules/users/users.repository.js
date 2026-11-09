import { pool } from '../../config/db.js';

function selectColumns(includePassword = false) {
  const columns = [
    'id',
    'name',
    'email',
    'role',
    'token_limit_month',
    'active',
    'created_at',
    'updated_at',
  ];

  if (includePassword) {
    columns.push('password_hash');
  }

  return columns.join(', ');
}

export async function findUserRecordById(id) {
  const [rows] = await pool.execute(
    `SELECT ${selectColumns(false)} FROM users WHERE id = ? LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function findUserRecordByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT ${selectColumns(true)} FROM users WHERE email = ? LIMIT 1`,
    [email],
  );

  return rows[0] ?? null;
}

export function toPublicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    tokenLimitMonth: Number(row.token_limit_month),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
