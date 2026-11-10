import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../errors/AppError.js';
import { syncDestinationDocument } from '../../rag/catalogDocuments.js';
import { getPagination } from '../../utils/pagination.js';
import { serializeActivity } from './catalog.serializers.js';

async function findActivityRecord(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM activities WHERE id = $1 LIMIT 1',
    [id],
  );

  return rows[0] ?? null;
}

async function findDestinationRecord(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, active FROM destinations WHERE id = $1 LIMIT 1',
    [id],
  );

  return rows[0] ?? null;
}

async function ensureUniqueActivity(destinationId, name, excludeId = null) {
  const params = [destinationId, name];
  let sql = 'SELECT id FROM activities WHERE destination_id = $1 AND name = $2';

  if (excludeId !== null) {
    sql += ' AND id <> $3';
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
  const next = () => `$${params.length + 1}`;

  if (!isAdmin) {
    conditions.push('a.active = TRUE', 'd.active = TRUE');
  } else if (active !== undefined) {
    conditions.push(`a.active = ${next()}`);
    params.push(Boolean(active));
  }

  if (search) {
    const a = next();
    params.push(`%${search}%`);
    const b = next();
    params.push(`%${search}%`);
    conditions.push(`(a.name ILIKE ${a} OR a.description ILIKE ${b})`);
  }
  if (destinationId !== undefined) {
    conditions.push(`a.destination_id = ${next()}`);
    params.push(destinationId);
  }
  if (category) {
    conditions.push(`a.category = ${next()}`);
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
     WHERE a.id = $1`,
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
    const { rows } = await connection.query(
      `INSERT INTO activities
         (destination_id, name, description, category,
          duration_min, price, lat, lng, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        data.destinationId,
        data.name,
        data.description,
        data.category,
        data.durationMin,
        data.price,
        data.lat ?? null,
        data.lng ?? null,
        Boolean(data.active),
      ],
    );

    await syncDestinationDocument(connection, data.destinationId);
    return Number(rows[0].id);
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
  const slot = () => `$${params.length + 1}`;

  if (data.destinationId !== undefined) {
    updates.push(`destination_id = ${slot()}`);
    params.push(data.destinationId);
  }
  if (data.name !== undefined) {
    updates.push(`name = ${slot()}`);
    params.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push(`description = ${slot()}`);
    params.push(data.description);
  }
  if (data.category !== undefined) {
    updates.push(`category = ${slot()}`);
    params.push(data.category);
  }
  if (data.durationMin !== undefined) {
    updates.push(`duration_min = ${slot()}`);
    params.push(data.durationMin);
  }
  if (data.price !== undefined) {
    updates.push(`price = ${slot()}`);
    params.push(data.price);
  }
  if (data.lat !== undefined) {
    updates.push(`lat = ${slot()}`);
    params.push(data.lat);
  }
  if (data.lng !== undefined) {
    updates.push(`lng = ${slot()}`);
    params.push(data.lng);
  }
  if (data.active !== undefined) {
    updates.push(`active = ${slot()}`);
    params.push(Boolean(data.active));
  }

  if (updates.length === 0) {
    throw AppError.badRequest('No hay campos para actualizar.');
  }

  await withTransaction(async (connection) => {
    await connection.query(
      `UPDATE activities SET ${updates.join(', ')} WHERE id = $${params.length + 1}`,
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
    await connection.query(
      'UPDATE activities SET active = FALSE WHERE id = $1',
      [id],
    );
    await syncDestinationDocument(connection, current.destination_id);
  });

  return {
    message: 'Actividad desactivada correctamente.',
    activity: await getActivityById(id, { isAdmin: true }),
  };
}
