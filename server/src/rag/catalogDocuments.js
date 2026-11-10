const PRICE_LEVEL_LABELS = {
  1: 'económico',
  2: 'moderado',
  3: 'alto',
  4: 'lujo',
};

const priceFormatter = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 });

function formatPrice(value) {
  return `Q ${priceFormatter.format(Number(value ?? 0))} GTQ`;
}

export function buildDestinationContent(destination, activities) {
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

export function buildActivityContent(activity, destination) {
  return [
    `Actividad: ${activity.name}`,
    `Destino: ${destination.name} (${destination.region})`,
    `Categoría: ${activity.category}`,
    `Duración: ${activity.duration_min} minutos`,
    `Precio: ${formatPrice(activity.price)}`,
    `Descripción: ${activity.description}`,
  ].join('\n');
}

async function upsertDestinationDocument(
  connection,
  destination,
  activities,
) {
  const metadata = {
    destinationId: destination.id,
    region: destination.region,
    category: destination.category,
    tags: destination.tags,
    lat: destination.lat,
    lng: destination.lng,
    priceLevel: destination.price_level,
    bestSeason: destination.best_season,
    activityCount: activities.length,
  };

  await connection.query(
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
      buildDestinationContent(destination, activities),
      JSON.stringify(metadata),
    ],
  );
}

async function upsertActivityDocument(connection, activity, destination) {
  const metadata = {
    destinationId: destination.id,
    destinationName: destination.name,
    region: destination.region,
    category: activity.category,
    durationMin: activity.duration_min,
    price: activity.price,
    lat: activity.lat,
    lng: activity.lng,
  };

  await connection.query(
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
      JSON.stringify(metadata),
    ],
  );
}

export async function deleteDestinationDocuments(connection, destinationId) {
  await connection.execute(
    `DELETE FROM documents
     WHERE source_type = 'destination' AND source_id = $1`,
    [destinationId],
  );

  await connection.execute(
    `DELETE FROM documents
     WHERE source_type = 'activity'
       AND source_id IN (
         SELECT id FROM activities WHERE destination_id = $1
       )`,
    [destinationId],
  );
}

export async function syncDestinationDocument(connection, destinationId) {
  const [destinationRows] = await connection.execute(
    `SELECT id, name, region, description, category, tags, lat, lng,
            price_level, best_season, active
     FROM destinations
     WHERE id = $1`,
    [destinationId],
  );

  const destination = destinationRows[0];

  if (!destination || !destination.active) {
    await deleteDestinationDocuments(connection, destinationId);
    return;
  }

  const [activityRows] = await connection.execute(
    `SELECT id, destination_id, name, description, category,
            duration_min, price, lat, lng, active
     FROM activities
     WHERE destination_id = $1
     ORDER BY id`,
    [destinationId],
  );

  const activeActivities = activityRows.filter((activity) =>
    Boolean(activity.active),
  );

  await upsertDestinationDocument(
    connection,
    destination,
    activeActivities,
  );

  for (const activity of activeActivities) {
    await upsertActivityDocument(connection, activity, destination);
  }

  const inactiveIds = activityRows
    .filter((activity) => !activity.active)
    .map((activity) => activity.id);

  if (inactiveIds.length > 0) {
    await connection.query(
      `DELETE FROM documents
       WHERE source_type = 'activity' AND source_id = ANY($1::bigint[])`,
      [inactiveIds],
    );
  }
}
