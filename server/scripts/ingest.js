/**
 * Ingesta de documentos para el RAG.
 *
 * Genera un documento por destino y uno por actividad a partir del catálogo
 * almacenado en MySQL, con el texto enriquecido que se usará como contexto.
 *
 * Uso:
 *   npm run db:ingest
 */
import { pool, closePool } from '../src/config/db.js';

const PRICE_LEVEL_LABELS = {
  1: 'económico',
  2: 'moderado',
  3: 'alto',
  4: 'lujo',
};

const priceFormatter = new Intl.NumberFormat('es-CO');

function formatPrice(value) {
  return `$${priceFormatter.format(Number(value ?? 0))} COP`;
}

function buildDestinationContent(destination, activities) {
  const activityLines = activities.map(
    (activity) =>
      `- ${activity.name} (${activity.category}, ${activity.duration_min} min, ${formatPrice(activity.price)}): ${activity.description}`,
  );

  return [
    `Destino: ${destination.name}`,
    `Región: ${destination.region}`,
    `Categoría: ${destination.category}`,
    `Etiquetas: ${destination.tags ?? 'sin etiquetas'}`,
    `Nivel de precio: ${PRICE_LEVEL_LABELS[destination.price_level] ?? destination.price_level}`,
    `Mejor temporada: ${destination.best_season ?? 'todo el año'}`,
    `Descripción: ${destination.description}`,
    activityLines.length > 0
      ? `Actividades disponibles:\n${activityLines.join('\n')}`
      : 'Actividades disponibles: no registradas.',
  ].join('\n');
}

function buildActivityContent(activity, destination) {
  return [
    `Actividad: ${activity.name}`,
    `Destino: ${destination.name} (${destination.region})`,
    `Categoría: ${activity.category}`,
    `Duración: ${activity.duration_min} minutos`,
    `Precio: ${formatPrice(activity.price)}`,
    `Descripción: ${activity.description}`,
  ].join('\n');
}

async function ingestDocuments() {
  const [destinations] = await pool.query(
    `SELECT id, name, region, description, category, tags, lat, lng,
            price_level, best_season
     FROM destinations
     WHERE active = 1
     ORDER BY id`,
  );

  const [activities] = await pool.query(
    `SELECT id, destination_id, name, description, category,
            duration_min, price, lat, lng
     FROM activities
     WHERE active = 1
     ORDER BY destination_id, id`,
  );

  if (destinations.length === 0) {
    throw new Error(
      'No hay destinos activos. Ejecuta db/seed.sql antes de la ingesta.',
    );
  }

  const activitiesByDestination = new Map();
  for (const activity of activities) {
    const list = activitiesByDestination.get(activity.destination_id) ?? [];
    list.push(activity);
    activitiesByDestination.set(activity.destination_id, list);
  }

  const connection = await pool.getConnection();
  let destinationDocs = 0;
  let activityDocs = 0;

  try {
    await connection.beginTransaction();

    // Se actualizan los documentos existentes y se conservan los manuales.
    for (const destination of destinations) {
      const destinationActivities =
        activitiesByDestination.get(destination.id) ?? [];

      const metadata = {
        destinationId: destination.id,
        region: destination.region,
        category: destination.category,
        tags: destination.tags,
        lat: destination.lat,
        lng: destination.lng,
        priceLevel: destination.price_level,
        bestSeason: destination.best_season,
        activityCount: destinationActivities.length,
      };

      await connection.execute(
        `INSERT INTO documents
           (source_type, source_id, chunk_index, title, content, metadata)
         VALUES ('destination', ?, 0, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           content = VALUES(content),
           metadata = VALUES(metadata),
           updated_at = CURRENT_TIMESTAMP`,
        [
          destination.id,
          destination.name,
          buildDestinationContent(destination, destinationActivities),
          JSON.stringify(metadata),
        ],
      );
      destinationDocs += 1;

      for (const activity of destinationActivities) {
        const activityMetadata = {
          destinationId: destination.id,
          destinationName: destination.name,
          region: destination.region,
          category: activity.category,
          durationMin: activity.duration_min,
          price: activity.price,
          lat: activity.lat,
          lng: activity.lng,
        };

        await connection.execute(
          `INSERT INTO documents
             (source_type, source_id, chunk_index, title, content, metadata)
           VALUES ('activity', ?, 0, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             title = VALUES(title),
             content = VALUES(content),
             metadata = VALUES(metadata),
             updated_at = CURRENT_TIMESTAMP`,
          [
            activity.id,
            `${activity.name} — ${destination.name}`,
            buildActivityContent(activity, destination),
            JSON.stringify(activityMetadata),
          ],
        );
        activityDocs += 1;
      }
    }

    // Elimina documentos de destinos o actividades que ya no existen o están inactivos.
    const destinationIds = destinations.map((destination) => destination.id);
    const activityIds = activities.map((activity) => activity.id);

    if (destinationIds.length > 0) {
      await connection.query(
        "DELETE FROM documents WHERE source_type = 'destination' AND source_id NOT IN (?)",
        [destinationIds],
      );
    } else {
      await connection.query(
        "DELETE FROM documents WHERE source_type = 'destination'",
      );
    }

    if (activityIds.length > 0) {
      await connection.query(
        "DELETE FROM documents WHERE source_type = 'activity' AND source_id NOT IN (?)",
        [activityIds],
      );
    } else {
      await connection.query(
        "DELETE FROM documents WHERE source_type = 'activity'",
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { destinationDocs, activityDocs };
}

async function inspectRetrieval() {
  const sampleQueries = [
    'playa con niños',
    'pueblos coloniales y café',
    'buceo y arrecifes',
    'selva y río Amazonas',
    'rafting y aventura',
  ];

  for (const search of sampleQueries) {
    const [rows] = await pool.query(
      `SELECT id, title,
              ROUND(MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE), 3) AS score
       FROM documents
       WHERE MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)
       ORDER BY score DESC
       LIMIT 3`,
      [search, search],
    );

    console.log(`\nConsulta: "${search}"`);
    if (rows.length === 0) {
      console.log('  (sin resultados)');
      continue;
    }
    for (const row of rows) {
      console.log(`  [${row.score}] ${row.title} (doc #${row.id})`);
    }
  }
}

async function main() {
  console.log('Conectando a MySQL...');
  const [dbInfo] = await pool.query(
    'SELECT DATABASE() AS db, VERSION() AS version',
  );
  console.log(`Base de datos: ${dbInfo[0].db} (MySQL ${dbInfo[0].version})`);

  const startedAt = Date.now();
  const result = await ingestDocuments();
  const elapsed = Date.now() - startedAt;

  console.log(
    `\nIngesta completada en ${elapsed} ms: ` +
      `${result.destinationDocs} destinos y ${result.activityDocs} actividades.`,
  );

  const [counts] = await pool.query(
    `SELECT source_type, COUNT(*) AS total
     FROM documents
     GROUP BY source_type
     ORDER BY source_type`,
  );
  console.table(counts);

  await inspectRetrieval();
}

main()
  .catch((error) => {
    console.error('\nError durante la ingesta:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
