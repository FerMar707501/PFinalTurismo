import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../errors/AppError.js';
import { syncDestinationDocument } from '../../rag/catalogDocuments.js';
import { getPagination } from '../../utils/pagination.js';
import { serializeActivity } from './catalog.serializers.js';

async function findActivityRecord(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM activities WHERE id = ? LIMIT 1',
    [id],
  );

  return rows[0] ?? null;
}

async function findDestinationRecord(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, active FROM destinations WHERE id = ? LIMIT 1',
    [id],
  );

  return rows[0] ?? null;
}

async function ensureUniqueActivity(
  destinationId,
  name,
  excludeId = null,
) {
  const params = [destinationId, name];
  let sql =
    'SELECT id FROM activities WHERE destination_id = ? AND name = ?';

  if (excludeId !== null) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }

  sql += ' LIMIT 1';

  const [rows] = await pool.execute(sql, params);

  if (rows.length > 0) {
    throw new AppError(
      409,
      'ACTIVITY_EXISTS',
      'Ya existe una actividad con ese nombre en el destino.',
    );
  }
}

export async function listActivities(filters, { isAdmin = false } = {}) {
  const { page, limit, search, destinationId, category, active } = filters;
  const conditions = [];
  const params = [];

  if (!isAdmin) {
    conditions.push('a.active = 1', 'd.active = 1');
  } else if (active !== undefined) {
    conditions.push('a.active = ?');
    params.push(active ? 1 : 0);
  }

  if (search) {
    conditions.push('(a.name LIKE ? OR a.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (destinationId !== undefined) {
    conditions.push('a.destination_id = ?');
    params.push(destinationId);
  }
  if (category) {
    conditions.push('a.category = ?');
    params.push(category);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM activities a
     JOIN destinations d ON d.id = a.destination_id
     ${where}`,
    params,
  );

  const [rows] = await pool.execute(
    `SELECT
       a.*,
       d.name AS destination_name,
       d.region AS destination_region,
       d.active AS destination_active
     FROM activities a
     JOIN destinations d ON d.id = a.destination_id
     ${where}
     ORDER BY d.name ASC, a.name ASC, a.id ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    data: rows.map((row) => serializeActivity(row)),
    pagination: getPagination(page, limit, countRows[0]?.total),
  };
}

export async function getActivityById(id, { isAdmin = false } = {}) {
  const [rows] = await pool.execute(
    `SELECT
       a.*,
       d.name AS destination_name,
       d.region AS destination_region,
       d.active AS destination_active
     FROM activities a
     JOIN destinations d ON d.id = a.destination_id
     WHERE a.id = ?`,
    [id],
  );

  const activity = rows[0];

  if (
    !activity ||
    (!isAdmin && (!activity.active || !activity.destination_active))
  ) {
    throw AppError.notFound('Actividad no encontrada.');
  }

  return serializeActivity(activity);
}

export async function createActivity(data) {
  const destination = await findDestinationRecord(data.destinationId);

  if (!destination) {
    throw AppError.notFound('El destino indicado no existe.');
  }

  await ensureUniqueActivity(data.destinationId, data.name);

  const activityId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO activities
         (destination_id, name, description, category,
          duration_min, price, lat, lng, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.destinationId,
        data.name,
        data.description,
        data.category,
        data.durationMin,
        data.price,
        data.lat ?? null,
        data.lng ?? null,
        data.active ? 1 : 0,
      ],
    );

    await syncDestinationDocument(connection, data.destinationId);
    return result.insertId;
  });

  return getActivityById(activityId, { isAdmin: true });
}

export async function updateActivity(id, data) {
  const current = await findActivityRecord(id);

  if (!current) {
    throw AppError.notFound('Actividad no encontrada.');
  }

  const nextDestinationId = data.destinationId ?? current.destination_id;

  if (data.destinationId !== undefined) {
    const destination = await findDestinationRecord(data.destinationId);
    if (!destination) {
      throw AppError.notFound('El destino indicado no existe.');
    }
  }

  const nextName = data.name ?? current.name;
  await ensureUniqueActivity(nextDestinationId, nextName, id);

  const updates = [];
  const params = [];

  if (data.destinationId !== undefined) {
    updates.push('destination_id = ?');
    params.push(data.destinationId);
  }
  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    params.push(data.category);
  }
  if (data.durationMin !== undefined) {
    updates.push('duration_min = ?');
    params.push(data.durationMin);
  }
  if (data.price !== undefined) {
    updates.push('price = ?');
    params.push(data.price);
  }
  if (data.lat !== undefined) {
    updates.push('lat = ?');
    params.push(data.lat);
  }
  if (data.lng !== undefined) {
    updates.push('lng = ?');
    params.push(data.lng);
  }
  if (data.active !== undefined) {
    updates.push('active = ?');
    params.push(data.active ? 1 : 0);
  }

  if (updates.length === 0) {
    throw AppError.badRequest('No hay campos para actualizar.');
  }

  await withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE activities SET ${updates.join(', ')} WHERE id = ?`,
      [...params, id],
    );

    const destinationsToSync = new Set([
      Number(current.destination_id),
      Number(nextDestinationId),
    ]);

    for (const destinationId of destinationsToSync) {
      await syncDestinationDocument(connection, destinationId);
    }
  });

  return getActivityById(id, { isAdmin: true });
}

export async function deactivateActivity(id) {
  const current = await findActivityRecord(id);

  if (!current) {
    throw AppError.notFound('Actividad no encontrada.');
  }

  await withTransaction(async (connection) => {
    await connection.execute(
      'UPDATE activities SET active = 0 WHERE id = ?',
      [id],
    );
    await syncDestinationDocument(connection, current.destination_id);
  });

  return {
    message: 'Actividad desactivada correctamente.',
    activity: await getActivityById(id, { isAdmin: true }),
  };
}
