import { pool } from '../../config/db.js';
import { AppError } from '../../errors/AppError.js';
import { hashPassword } from '../../utils/password.js';
import { getPagination } from '../../utils/pagination.js';
import {
  buildQuota,
  getCurrentPeriod,
  getQuotaForUser,
} from '../usage/usage.service.js';
import {
  findUserRecordByEmail,
  findUserRecordById,
  toPublicUser,
} from './users.repository.js';

async function countActiveAdminsExcluding(userId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE role = 'admin' AND active = TRUE AND id <> $1`,
    [userId],
  );

  return Number(rows[0]?.total ?? 0);
}

export async function listUsers(filters) {
  const { page, limit, search, role, active } = filters;
  const period = getCurrentPeriod();
  const conditions = [];
  const whereParams = [];
  // Los parámetros $1 y $2 son el periodo en la consulta principal.
  const offsetBase = 2;
  const next = () => `$${offsetBase + whereParams.length + 1}`;

  if (search) {
    const a = next();
    whereParams.push(`%${search}%`);
    const b = next();
    whereParams.push(`%${search}%`);
    conditions.push(`(u.name ILIKE ${a} OR u.email ILIKE ${b})`);
  }
  if (role) {
    conditions.push(`u.role = ${next()}`);
    whereParams.push(role);
  }
  if (active !== undefined) {
    conditions.push(`u.active = ${next()}`);
    whereParams.push(Boolean(active));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  // El conteo no necesita el periodo: sus marcadores empiezan en $1.
  const countWhere = where.replace(/\$(\d+)/g, (_, n) => `$${Number(n) - offsetBase}`);

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM users u ${countWhere}`,
    whereParams,
  );

  const [rows] = await pool.execute(
    `SELECT
       u.id, u.name, u.email, u.role, u.token_limit_month, u.active,
       u.created_at, u.updated_at,
       COALESCE(ul.used_tokens, 0) AS used_tokens_month,
       COALESCE(ul.successful_requests, 0) AS successful_requests_month,
       COALESCE(ul.blocked_requests, 0) AS blocked_requests_month
     FROM users u
     LEFT JOIN (
       SELECT
         user_id,
         SUM(CASE WHEN status = 'success' THEN total_tokens ELSE 0 END) AS used_tokens,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful_requests,
         SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked_requests
       FROM usage_logs
       WHERE created_at >= $1 AND created_at < $2
       GROUP BY user_id
     ) ul ON ul.user_id = u.id
     ${where}
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    [period.start, period.end, ...whereParams],
  );

  const data = rows.map((row) => {
    const user = toPublicUser(row);
    return {
      ...user,
      quota: buildQuota({
        limitTokens: user.tokenLimitMonth,
        usedTokens: row.used_tokens_month,
        successfulRequests: row.successful_requests_month,
        blockedRequests: row.blocked_requests_month,
        period,
      }),
    };
  });

  return {
    data,
    pagination: getPagination(page, limit, countRows[0]?.total),
  };
}

export async function getUserDetail(userId) {
  const record = await findUserRecordById(userId);

  if (!record) {
    throw AppError.notFound('Usuario no encontrado.');
  }

  const user = toPublicUser(record);
  const quota = await getQuotaForUser(user);

  return { user, quota };
}

export async function createUser(data) {
  const existing = await findUserRecordByEmail(data.email);

  if (existing) {
    throw new AppError(
      409,
      'EMAIL_IN_USE',
      'Ya existe un usuario con ese correo.',
    );
  }

  const passwordHash = await hashPassword(data.password);

  const [rows] = await pool.execute(
    `INSERT INTO users
       (name, email, password_hash, role, token_limit_month, active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      data.name,
      data.email,
      passwordHash,
      data.role,
      data.tokenLimitMonth,
      Boolean(data.active),
    ],
  );

  return getUserDetail(rows[0].id);
}

export async function updateUser(userId, data, actorId) {
  const target = await findUserRecordById(userId);

  if (!target) {
    throw AppError.notFound('Usuario no encontrado.');
  }

  if (Number(target.id) === Number(actorId)) {
    if (data.role !== undefined && data.role !== 'admin') {
      throw new AppError(
        409,
        'SELF_DEMOTION',
        'No puedes quitarte el rol de administrador.',
      );
    }

    if (data.active === false) {
      throw new AppError(
        409,
        'SELF_DEACTIVATION',
        'No puedes desactivar tu propia cuenta.',
      );
    }
  }

  if (data.email && data.email !== target.email) {
    const existing = await findUserRecordByEmail(data.email);
    if (existing && Number(existing.id) !== Number(userId)) {
      throw new AppError(
        409,
        'EMAIL_IN_USE',
        'Ya existe un usuario con ese correo.',
      );
    }
  }

  const losesAdminRole = data.role !== undefined && data.role !== 'admin';
  const becomesInactive = data.active === false;

  if (
    target.role === 'admin' &&
    Boolean(target.active) &&
    (losesAdminRole || becomesInactive)
  ) {
    const remainingAdmins = await countActiveAdminsExcluding(userId);
    if (remainingAdmins === 0) {
      throw new AppError(
        409,
        'LAST_ADMIN',
        'Debe existir al menos un administrador activo.',
      );
    }
  }

  const updates = [];
  const params = [];
  const slot = () => `$${params.length + 1}`;

  if (data.name !== undefined) {
    updates.push(`name = ${slot()}`);
    params.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push(`email = ${slot()}`);
    params.push(data.email);
  }
  if (data.password !== undefined) {
    updates.push(`password_hash = ${slot()}`);
    params.push(await hashPassword(data.password));
  }
  if (data.role !== undefined) {
    updates.push(`role = ${slot()}`);
    params.push(data.role);
  }
  if (data.tokenLimitMonth !== undefined) {
    updates.push(`token_limit_month = ${slot()}`);
    params.push(data.tokenLimitMonth);
  }
  if (data.active !== undefined) {
    updates.push(`active = ${slot()}`);
    params.push(Boolean(data.active));
  }

  if (updates.length === 0) {
    throw AppError.badRequest('No hay campos para actualizar.');
  }

  params.push(userId);

  await pool.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`,
    params,
  );

  return getUserDetail(userId);
}

export async function deactivateUser(userId, actorId) {
  const target = await findUserRecordById(userId);

  if (!target) {
    throw AppError.notFound('Usuario no encontrado.');
  }

  if (Number(target.id) === Number(actorId)) {
    throw new AppError(
      409,
      'SELF_DEACTIVATION',
      'No puedes desactivar tu propia cuenta.',
    );
  }

  if (target.role === 'admin' && Boolean(target.active)) {
    const remainingAdmins = await countActiveAdminsExcluding(userId);
    if (remainingAdmins === 0) {
      throw new AppError(
        409,
        'LAST_ADMIN',
        'Debe existir al menos un administrador activo.',
      );
    }
  }

  await pool.execute('UPDATE users SET active = FALSE WHERE id = $1', [userId]);

  return getUserDetail(userId);
}
