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
    'SELECT * FROM destinations WHERE id = $1 LIMIT 1',
    [id],
  );

  return rows[0] ?? null;
}

async function ensureUniqueDestination(name, region, excludeId = null) {
  const params = [name, region];
  let sql = 'SELECT id FROM destinations WHERE name = $1 AND region = $2';

  if (excludeId !== null) {
    sql += ' AND id <> $3';
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
  // Marcador posicional siguiente según los parámetros acumulados.
  const next = () => `$${params.length + 1}`;

  if (!isAdmin) {
    conditions.push('d.active = TRUE');
  } else if (active !== undefined) {
    conditions.push(`d.active = ${next()}`);
    params.push(Boolean(active));
  }

  if (search) {
    const a = next();
    params.push(`%${search}%`);
    const b = next();
    params.push(`%${search}%`);
    const c = next();
    params.push(`%${search}%`);
    conditions.push(
      `(d.name ILIKE ${a} OR d.region ILIKE ${b} OR d.description ILIKE ${c})`,
    );
  }
  if (region) {
    conditions.push(`d.region = ${next()}`);
    params.push(region);
  }
  if (category) {
    conditions.push(`d.category = ${next()}`);
    params.push(category);
  }
  if (tag) {
    conditions.push(`${next()} = ANY(string_to_array(d.tags, ','))`);
    params.push(tag);
  }
  if (priceLevel !== undefined) {
    conditions.push(`d.price_level = ${next()}`);
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
        WHERE a.destination_id = d.id AND a.active = TRUE) AS activity_count
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
        WHERE a.destination_id = d.id AND a.active = TRUE) AS activity_count
     FROM destinations d
     WHERE d.id = $1`,
    [id],
  );

  const destination = rows[0];

  if (!destination || (!isAdmin && !destination.active)) {
    throw AppError.notFound('Destino no encontrado.');
  }

  const activityConditions = ['a.destination_id = $1'];
  const activityParams = [id];

  if (!isAdmin) {
    activityConditions.push('a.active = TRUE');
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
    const { rows } = await connection.query(
      `INSERT INTO destinations
         (name, region, description, category, tags, lat, lng,
          price_level, best_season, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
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
        Boolean(data.active),
      ],
    );

    const newId = Number(rows[0].id);
    await syncDestinationDocument(connection, newId);
    return newId;
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
  const slot = () => `$${params.length + 1}`;

  if (data.name !== undefined) {
    updates.push(`name = ${slot()}`);
    params.push(data.name);
  }
  if (data.region !== undefined) {
    updates.push(`region = ${slot()}`);
    params.push(data.region);
  }
  if (data.description !== undefined) {
    updates.push(`description = ${slot()}`);
    params.push(data.description);
  }
  if (data.category !== undefined) {
    updates.push(`category = ${slot()}`);
    params.push(data.category);
  }
  if (data.tags !== undefined) {
    updates.push(`tags = ${slot()}`);
    params.push(data.tags || null);
  }
  if (data.lat !== undefined) {
    updates.push(`lat = ${slot()}`);
    params.push(data.lat);
  }
  if (data.lng !== undefined) {
    updates.push(`lng = ${slot()}`);
    params.push(data.lng);
  }
  if (data.priceLevel !== undefined) {
    updates.push(`price_level = ${slot()}`);
    params.push(data.priceLevel);
  }
  if (data.bestSeason !== undefined) {
    updates.push(`best_season = ${slot()}`);
    params.push(data.bestSeason || null);
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
      `UPDATE destinations SET ${updates.join(', ')} WHERE id = $${params.length + 1}`,
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
    await connection.query(
      'UPDATE destinations SET active = FALSE WHERE id = $1',
      [id],
    );
    await deleteDestinationDocuments(connection, id);
  });

  return {
    message: 'Destino desactivado correctamente.',
    destination: await getDestinationById(id, { isAdmin: true }),
  };
}
