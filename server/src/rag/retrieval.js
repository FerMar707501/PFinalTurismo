import { pool } from '../config/db.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 8;
const MAX_SEARCH_CHARS = 1000;
const MAX_CONTENT_CHARS = 1800;

export async function retrieveDocuments(query, { limit = DEFAULT_LIMIT } = {}) {
  const search = String(query ?? '').trim().slice(0, MAX_SEARCH_CHARS);

  if (!search) {
    return [];
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const [rows] = await pool.execute(
    `SELECT
       id,
       source_type,
       source_id,
       title,
       content,
       MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
     FROM documents
     WHERE MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)
     ORDER BY score DESC, id ASC
     LIMIT ${safeLimit}`,
    [search, search],
  );

  return rows.map((row) => ({
    documentId: Number(row.id),
    sourceType: row.source_type,
    sourceId: row.source_id === null ? null : Number(row.source_id),
    title: row.title,
    content: String(row.content).slice(0, MAX_CONTENT_CHARS),
    score: Number(row.score),
  }));
}

export function buildContext(sources) {
  if (!sources.length) {
    return [
      'No se encontraron documentos relevantes en el catálogo.',
      'Si no puedes responder con la información disponible, dilo claramente',
      'y no inventes destinos, precios, horarios ni actividades.',
    ].join(' ');
  }

  return sources
    .map(
      (source, index) =>
        `[Fuente ${index + 1}] ${source.title} (${source.sourceType})\n${source.content}`,
    )
    .join('\n\n');
}
