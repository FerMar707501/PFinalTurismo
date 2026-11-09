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
     WHERE role = 'admin' AND active = 1 AND id <> ?`,
    [userId],
  );

  return Number(rows[0]?.total ?? 0);
}

export async function listUsers(filters) {
  const { page, limit, search, role, active } = filters;
  const period = getCurrentPeriod();
  const conditions = [];
  const whereParams = [];

  if (search) {
    conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
    whereParams.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    conditions.push('u.role = ?');
    whereParams.push(role);
  }
  if (active !== undefined) {
    conditions.push('u.active = ?');
    whereParams.push(active ? 1 : 0);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM users u ${where}`,
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
         SUM(status = 'success') AS successful_requests,
         SUM(status = 'blocked') AS blocked_requests
       FROM usage_logs
       WHERE created_at >= ? AND created_at < ?
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

  const [result] = await pool.execute(
    `INSERT INTO users
       (name, email, password_hash, role, token_limit_month, active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.email,
      passwordHash,
      data.role,
      data.tokenLimitMonth,
      data.active ? 1 : 0,
    ],
  );

  return getUserDetail(result.insertId);
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

  const losesAdminRole =
    data.role !== undefined && data.role !== 'admin';
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

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push('email = ?');
    params.push(data.email);
  }
  if (data.password !== undefined) {
    updates.push('password_hash = ?');
    params.push(await hashPassword(data.password));
  }
  if (data.role !== undefined) {
    updates.push('role = ?');
    params.push(data.role);
  }
  if (data.tokenLimitMonth !== undefined) {
    updates.push('token_limit_month = ?');
    params.push(data.tokenLimitMonth);
  }
  if (data.active !== undefined) {
    updates.push('active = ?');
    params.push(data.active ? 1 : 0);
  }

  if (updates.length === 0) {
    throw AppError.badRequest('No hay campos para actualizar.');
  }

  await pool.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    [...params, userId],
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

  await pool.execute('UPDATE users SET active = 0 WHERE id = ?', [userId]);

  return getUserDetail(userId);
}
