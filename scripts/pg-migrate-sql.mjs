import fs from 'node:fs';
import path from 'node:path';

/**
 * Utilidad de migración (solo desarrollo, idempotente).
 *
 * Dentro de las plantillas SQL (backticks que contienen SELECT/INSERT/UPDATE/
 * DELETE/WITH) convierte los marcadores `?` en `$1, $2…` y los cambios de
 * sintaxis MySQL → PostgreSQL necesarios en el proyecto.
 *
 * Reemplaza a los scripts anteriores que corrompían los archivos.
 *
 * Uso: node scripts/pg-migrate-sql.mjs <archivo> [archivo...]
 */
const files = process.argv.slice(2);

const TEXT_REPLACEMENTS = [
  // Agregados booleanos.
  ["COALESCE(SUM(ul.status = 'success'), 0)", "COALESCE(SUM(CASE WHEN ul.status = 'success' THEN 1 ELSE 0 END), 0)"],
  ["COALESCE(SUM(ul.status = 'blocked'), 0)", "COALESCE(SUM(CASE WHEN ul.status = 'blocked' THEN 1 ELSE 0 END), 0)"],
  ["COALESCE(SUM(ul.status = 'error'), 0)", "COALESCE(SUM(CASE WHEN ul.status = 'error' THEN 1 ELSE 0 END), 0)"],
  ["COALESCE(SUM(status = 'success'), 0)", "COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0)"],
  ["COALESCE(SUM(status = 'blocked'), 0)", "COALESCE(SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END), 0)"],
  // Funciones de fecha.
  ["DATE_FORMAT(ul.created_at, '%Y-%m')", "to_char(ul.created_at AT TIME ZONE 'UTC', 'YYYY-MM')"],
  ["DATE(ul.created_at)", "to_char(ul.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')"],
  // Booleanos en predicados.
  ['active = 1', 'active = TRUE'],
  ['active = 0', 'active = FALSE'],
  ['enabled = 1', 'enabled = TRUE'],
  ['enabled = 0', 'enabled = FALSE'],
  // Búsqueda insensible a mayúsculas.
  [' LIKE ?', ' ILIKE ?'],
  [' = VALUES(', ' = EXCLUDED.('],
  ['ON DUPLICATE KEY UPDATE', 'ON CONFLICT DO UPDATE'],
  ['CURRENT_TIMESTAMP(6)', 'CURRENT_TIMESTAMP'],
];

function convertTemplate(sql) {
  let counter = 0;
  return sql
    .replace(/IN \(\?\)/g, () => {
      counter += 1;
      return `= ANY($${counter}::bigint[])`;
    })
    .replace(/\?/g, () => {
      counter += 1;
      return `$${counter}`;
    });
}

function convertTextSql(sql) {
  let counter = 0;
  return sql
    .replace(/IN \(\?\)/g, () => {
      counter += 1;
      return `= ANY($${counter}::bigint[])`;
    })
    .replace(/\?/g, () => {
      counter += 1;
      return `$${counter}`;
    })
    .replace(/active = 1\b/g, 'active = TRUE')
    .replace(/active = 0\b/g, 'active = FALSE')
    .replace(/enabled = 1\b/g, 'enabled = TRUE')
    .replace(/enabled = 0\b/g, 'enabled = FALSE')
    .replace(/ LIKE \?/g, ' ILIKE ?')
    .replace(/ LIKE '/g, " ILIKE '");
}

for (const file of files) {
  const absolute = path.resolve(file);
  let source = fs.readFileSync(absolute, 'utf8');
  const before = source;

  // 1) Plantillas SQL.
  source = source.replace(/`([^`]*)`/g, (match, inner) => {
    if (!/(SELECT|INSERT|UPDATE|DELETE|WITH)\s/i.test(inner)) return match;
    return `\`${convertTemplate(inner)}\``;
  });

  // 2) Literales SQL de una sola línea.
  source = source.replace(/(['"])([^'"\n]*(?:SELECT|UPDATE|DELETE|INSERT)[^'"\n]*)\1/g, (match, q, inner) =>
    `${q}${convertTextSql(inner)}${q}`,
  );

  // 3) Texto general (funciones de fecha, booleanos sueltos en SQL multilínea).
  for (const [from, to] of TEXT_REPLACEMENTS.slice(0, 10)) {
    source = source.split(from).join(to);
  }

  if (source !== before) {
    fs.writeFileSync(absolute, source, 'utf8');
    console.log(`actualizado: ${file}`);
  } else {
    console.log(`sin cambios: ${file}`);
  }
}
