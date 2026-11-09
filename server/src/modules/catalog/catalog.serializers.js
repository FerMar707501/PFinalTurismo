export function serializeDestination(row, activities = undefined) {
  const destination = {
    id: Number(row.id),
    name: row.name,
    region: row.region,
    description: row.description,
    category: row.category,
    tags: row.tags
      ? row.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    lat:
      row.lat === null || row.lat === undefined ? null : Number(row.lat),
    lng:
      row.lng === null || row.lng === undefined ? null : Number(row.lng),
    priceLevel: Number(row.price_level),
    bestSeason: row.best_season ?? null,
    active: Boolean(row.active),
    activityCount:
      row.activity_count !== undefined && row.activity_count !== null
        ? Number(row.activity_count)
        : activities
          ? activities.length
          : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (activities !== undefined) {
    destination.activities = activities.map(serializeActivity);
  }

  return destination;
}

export function serializeActivity(row) {
  const activity = {
    id: Number(row.id),
    destinationId: Number(row.destination_id),
    destinationName: row.destination_name ?? null,
    destinationRegion: row.destination_region ?? null,
    name: row.name,
    description: row.description,
    category: row.category,
    durationMin: Number(row.duration_min),
    price: Number(row.price),
    lat:
      row.lat === null || row.lat === undefined ? null : Number(row.lat),
    lng:
      row.lng === null || row.lng === undefined ? null : Number(row.lng),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (
    row.destination_active !== undefined &&
    row.destination_active !== null
  ) {
    activity.destinationActive = Boolean(row.destination_active);
  }

  return activity;
}
