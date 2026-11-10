import { pool, closePool } from '../src/config/db.js';
import {
  buildActivityContent,
  buildDestinationContent,
} from '../src/rag/catalogDocuments.js';

/**
 * Ingesta de documentos para el RAG (PostgreSQL).
 *
 * Genera un documento por destino y uno por actividad a partir del catálogo,
 * con el texto enriquecido que se usará como contexto. La columna
 * `search_vector` se actualiza sola mediante un trigger.
 *
 * Uso:
 *   npm run db:ingest
 */
async function ingestDocuments() {
  const { rows: destinations } = await pool.query(
    `SELECT id, name, region, description, category, tags, lat, lng,
            price_level, best_season
     FROM destinations
     WHERE active = TRUE
     ORDER BY id`,
  );

  const { rows: activities } = await pool.query(
    `SELECT id, destination_id, name, description, category,
            duration_min, price, lat, lng
     FROM activities
     WHERE active = TRUE
     ORDER BY destination_id, id`,
  );

  if (destinations.length === 0) {
    throw new Error(
      'No hay destinos activos. Ejecuta npm run db:setup antes de la ingesta.',
    );
  }

  const activitiesByDestination = new Map();
  for (const activity of activities) {
    const list = activitiesByDestination.get(activity.destination_id) ?? [];
    list.push(activity);
    activitiesByDestination.set(activity.destination_id, list);
  }

  const client = await pool.connect();
  let destinationDocs = 0;
  let activityDocs = 0;

  try {
    await client.query('BEGIN');

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

      await client.query(
        `INSERT INTO documents
           (source_type, source_id, chunk_index, title, content, metadata)
         VALUES ('destination', $1, 0, $2, $3, $4::jsonb)
         ON CONFLICT (source_type, source_id, chunk_index) DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           metadata = EXCLUDED.metadata,
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

        await client.query(
          `INSERT INTO documents
             (source_type, source_id, chunk_index, title, content, metadata)
           VALUES ('activity', $1, 0, $2, $3, $4::jsonb)
           ON CONFLICT (source_type, source_id, chunk_index) DO UPDATE SET
             title = EXCLUDED.title,
             content = EXCLUDED.content,
             metadata = EXCLUDED.metadata,
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
    await client.query(
      `DELETE FROM documents
       WHERE source_type = 'destination' AND NOT (source_id = ANY($1::bigint[]))`,
      [destinations.map((destination) => destination.id)],
    );

    await client.query(
      `DELETE FROM documents
       WHERE source_type = 'activity' AND NOT (source_id = ANY($1::bigint[]))`,
      [activities.map((activity) => activity.id)],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { destinationDocs, activityDocs };
}

async function inspectRetrieval() {
  const sampleQueries = [
    'playa con niños',
    'pueblos coloniales y café',
    'volcanes y lava',
    'selva y ruinas mayas',
    'artesanía y mercados del altiplano',
    'lago de Atitlán en lancha',
  ];

  for (const search of sampleQueries) {
    const { rows } = await pool.query(
      `SELECT id, title,
              ROUND(ts_rank_cd(search_vector, q)::numeric, 3) AS score
       FROM documents, websearch_to_tsquery('spanish', $1) AS q
       WHERE search_vector @@ q
       ORDER BY score DESC
       LIMIT 3`,
      [search],
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
  console.log('Conectando a PostgreSQL…');
  const { rows: dbInfo } = await pool.query(
    'SELECT current_database() AS db, version() AS version',
  );
  console.log(
    `Base de datos: ${dbInfo[0].db} (${String(dbInfo[0].version).split(' ')[0]})`,
  );

  const startedAt = Date.now();
  const result = await ingestDocuments();
  const elapsed = Date.now() - startedAt;

  console.log(
    `\nIngesta completada en ${elapsed} ms: ` +
      `${result.destinationDocs} destinos y ${result.activityDocs} actividades.`,
  );

  const { rows: counts } = await pool.query(
    `SELECT source_type, COUNT(*)::int AS total
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
