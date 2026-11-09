import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../errors/AppError.js';
import {
  deleteDestinationDocuments,
  syncDestinationDocument,
} from '../../rag/catalogDocuments.js';
import { getPagination } from '../../utils/pagination.js';
import { serializeDestination } from './catalog.serializers.js';

async function findDestinationRecord(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM destinations WHERE id = ? LIMIT 1',
    [id],
  );

  return rows[0] ?? null;
}

async function ensureUniqueDestination(name, region, excludeId = null) {
  const params = [name, region];
  let sql =
    'SELECT id FROM destinations WHERE name = ? AND region = ?';

  if (excludeId !== null) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }

  sql += ' LIMIT 1';

  const [rows] = await pool.execute(sql, params);

  if (rows.length > 0) {
    throw new AppError(
      409,
      'DESTINATION_EXISTS',
      'Ya existe un destino con ese nombre y región.',
    );
  }
}

export async function listDestinations(filters, { isAdmin = false } = {}) {
  const {
    page,
    limit,
    search,
    region,
    category,
    tag,
    priceLevel,
    active,
  } = filters;
  const conditions = [];
  const params = [];

  if (!isAdmin) {
    conditions.push('d.active = 1');
  } else if (active !== undefined) {
    conditions.push('d.active = ?');
    params.push(active ? 1 : 0);
  }

  if (search) {
    conditions.push(
      '(d.name LIKE ? OR d.region LIKE ? OR d.description LIKE ?)',
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (region) {
    conditions.push('d.region = ?');
    params.push(region);
  }
  if (category) {
    conditions.push('d.category = ?');
    params.push(category);
  }
  if (tag) {
    conditions.push('FIND_IN_SET(?, d.tags)');
    params.push(tag);
  }
  if (priceLevel !== undefined) {
    conditions.push('d.price_level = ?');
    params.push(priceLevel);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM destinations d ${where}`,
    params,
  );

  const [rows] = await pool.execute(
    `SELECT
       d.*,
       (SELECT COUNT(*) FROM activities a
        WHERE a.destination_id = d.id AND a.active = 1) AS activity_count
     FROM destinations d
     ${where}
     ORDER BY d.name ASC, d.id ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    data: rows.map((row) => serializeDestination(row)),
    pagination: getPagination(page, limit, countRows[0]?.total),
  };
}

export async function getDestinationById(id, { isAdmin = false } = {}) {
  const [rows] = await pool.execute(
    `SELECT
       d.*,
       (SELECT COUNT(*) FROM activities a
        WHERE a.destination_id = d.id AND a.active = 1) AS activity_count
     FROM destinations d
     WHERE d.id = ?`,
    [id],
  );

  const destination = rows[0];

  if (!destination || (!isAdmin && !destination.active)) {
    throw AppError.notFound('Destino no encontrado.');
  }

  const activityConditions = ['a.destination_id = ?'];
  const activityParams = [id];

  if (!isAdmin) {
    activityConditions.push('a.active = 1');
  }

  const [activities] = await pool.execute(
    `SELECT a.*
     FROM activities a
     WHERE ${activityConditions.join(' AND ')}
     ORDER BY a.name ASC, a.id ASC`,
    activityParams,
  );

  return serializeDestination(destination, activities);
}

export async function createDestination(data) {
  await ensureUniqueDestination(data.name, data.region);

  const destinationId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO destinations
         (name, region, description, category, tags, lat, lng,
          price_level, best_season, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.region,
        data.description,
        data.category,
        data.tags || null,
        data.lat ?? null,
        data.lng ?? null,
        data.priceLevel,
        data.bestSeason || null,
        data.active ? 1 : 0,
      ],
    );

    await syncDestinationDocument(connection, result.insertId);
    return result.insertId;
  });

  return getDestinationById(destinationId, { isAdmin: true });
}

export async function updateDestination(id, data) {
  const current = await findDestinationRecord(id);

  if (!current) {
    throw AppError.notFound('Destino no encontrado.');
  }

  const nextName = data.name ?? current.name;
  const nextRegion = data.region ?? current.region;

  if (nextName !== current.name || nextRegion !== current.region) {
    await ensureUniqueDestination(nextName, nextRegion, id);
  }

  const updates = [];
  const params = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.region !== undefined) {
    updates.push('region = ?');
    params.push(data.region);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    params.push(data.category);
  }
  if (data.tags !== undefined) {
    updates.push('tags = ?');
    params.push(data.tags || null);
  }
  if (data.lat !== undefined) {
    updates.push('lat = ?');
    params.push(data.lat);
  }
  if (data.lng !== undefined) {
    updates.push('lng = ?');
    params.push(data.lng);
  }
  if (data.priceLevel !== undefined) {
    updates.push('price_level = ?');
    params.push(data.priceLevel);
  }
  if (data.bestSeason !== undefined) {
    updates.push('best_season = ?');
    params.push(data.bestSeason || null);
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
      `UPDATE destinations SET ${updates.join(', ')} WHERE id = ?`,
      [...params, id],
    );

    if (data.active === false) {
      await deleteDestinationDocuments(connection, id);
    } else {
      await syncDestinationDocument(connection, id);
    }
  });

  return getDestinationById(id, { isAdmin: true });
}

export async function deactivateDestination(id) {
  const current = await findDestinationRecord(id);

  if (!current) {
    throw AppError.notFound('Destino no encontrado.');
  }

  await withTransaction(async (connection) => {
    await connection.execute(
      'UPDATE destinations SET active = 0 WHERE id = ?',
      [id],
    );
    await deleteDestinationDocuments(connection, id);
  });

  return {
    message: 'Destino desactivado correctamente.',
    destination: await getDestinationById(id, { isAdmin: true }),
  };
}
