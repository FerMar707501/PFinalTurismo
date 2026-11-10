import { pool } from '../config/db.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 8;
const MAX_SEARCH_CHARS = 1000;
const MAX_CONTENT_CHARS = 1800;

// Palabras vacías que no aportan a la recuperación.
const STOPWORDS = new Set([
  'a', 'al', 'algo', 'ante', 'antes', 'como', 'con', 'contra', 'cual',
  'cuando', 'de', 'del', 'desde', 'donde', 'dos', 'el', 'ella', 'ellas',
  'ellos', 'en', 'entre', 'era', 'es', 'esa', 'esas', 'ese', 'eso', 'esos',
  'esta', 'estas', 'este', 'esto', 'estos', 'fue', 'ha', 'hasta', 'hay',
  'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi', 'mis', 'mucho',
  'muy', 'no', 'nos', 'o', 'otra', 'otro', 'para', 'pero', 'poco', 'por',
  'porque', 'que', 'quien', 'se', 'sin', 'sobre', 'su', 'sus', 'tal',
  'tambien', 'te', 'tu', 'tus', 'un', 'una', 'uno', 'unos', 'y', 'ya',
]);

/**
 * Convierte el texto libre del usuario en una tsquery en español que une los
 * términos relevantes con OR, para que "playa con niños" encuentre documentos
 * que mencionen playa o niños.
 */
function buildTsQuery(search) {
  const terms = search
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9ñ]+/)
    .filter((term) => term.length >= 3 && !STOPWORDS.has(term));

  if (terms.length === 0) {
    return null;
  }

  return terms.map((term) => `${term}:*`).join(' | ');
}

export async function retrieveDocuments(query, { limit = DEFAULT_LIMIT } = {}) {
  const search = String(query ?? '').trim().slice(0, MAX_SEARCH_CHARS);

  if (!search) {
    return [];
  }

  const tsQuery = buildTsQuery(search);

  if (!tsQuery) {
    return [];
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const [rows] = await pool.execute(
    `SELECT
       d.id,
       d.source_type,
       d.source_id,
       d.title,
       d.content,
       ts_rank_cd(d.search_vector, to_tsquery('spanish', $1)) AS score
     FROM documents d
     WHERE d.search_vector @@ to_tsquery('spanish', $1)
     ORDER BY score DESC, d.id ASC
     LIMIT ${safeLimit}`,
    [tsQuery],
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
