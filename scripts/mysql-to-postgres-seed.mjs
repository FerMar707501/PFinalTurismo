/**
 * Convierte db/seed.sql (MySQL) a db/seed.postgres.sql.
 *
 * Cambios aplicados:
 *  - Elimina `USE rutaia;` y `SET NAMES/time_zone` (equivalentes en PostgreSQL).
 *  - `1`/`0` de las columnas booleanas (active, enabled) → TRUE/FALSE.
 *  - `DATE_SUB(NOW(), INTERVAL n DAY)`  → `NOW() - INTERVAL 'n days'`.
 *  - `DATE_ADD(x, INTERVAL n MINUTE)`   → `x + INTERVAL 'n minutes'`.
 *  - `JSON_ARRAY(JSON_OBJECT(...))`     → `'[...]'::jsonb`.
 *  - `INSERT INTO ... (id, ...) VALUES (n, ...)` → se conservan los IDs y al
 *    final se reajustan las secuencias IDENTITY.
 *
 * Uso: node scripts/mysql-to-postgres-seed.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'db', 'seed.sql');
const OUT = path.join(ROOT, 'db', 'seed.postgres.sql');

let sql = fs.readFileSync(SRC, 'utf8');

// Cabecera: fuera instrucciones exclusivas de MySQL.
sql = sql.replace(/^USE rutaia;\s*$/gim, '');
sql = sql.replace(/^SET NAMES utf8mb4;\s*$/gim, '');
sql = sql.replace(/^SET time_zone = '\+00:00';\s*$/gim, '');

// Funciones de fecha.
sql = sql.replace(
  /DATE_SUB\(\s*NOW\(\),\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
  "NOW() - INTERVAL '$1 days'",
);
sql = sql.replace(
  /DATE_ADD\(\s*(DATE_SUB\(\s*NOW\(\),\s*INTERVAL\s+(\d+)\s+DAY\s*\))\s*,\s*INTERVAL\s+(\d+)\s+MINUTE\s*\)/gi,
  "(NOW() - INTERVAL '$2 days') + INTERVAL '$3 minutes'",
);
sql = sql.replace(
  /DATE_SUB\(\s*NOW\(\),\s*INTERVAL\s+(\d+)\s+HOUR\s*\)/gi,
  "NOW() - INTERVAL '$1 hours'",
);
sql = sql.replace(
  /DATE_ADD\(\s*NOW\(\)\s*-\s*INTERVAL\s+'(\d+)\s+days?'\s*,\s*INTERVAL\s+(\d+)\s+MINUTE\s*\)/gi,
  "(NOW() - INTERVAL '$1 days') + INTERVAL '$2 minutes'",
);
sql = sql.replace(
  /DATE_ADD\(\s*NOW\(\),\s*INTERVAL\s+(\d+)\s+(MINUTE|HOUR|DAY)\s*\)/gi,
  (_, n, unit) => `NOW() + INTERVAL '${n} ${unit.toLowerCase()}s'`,
);

// JSON_ARRAY(JSON_OBJECT(...), ...) → jsonb literal.
// Se buscan los bloques con paréntesis balanceados, no una regex plana.
function convertJsonArrays(text) {
  let result = text;
  let start = result.indexOf('JSON_ARRAY(');
  while (start !== -1) {
    let depth = 1;
    let i = start + 'JSON_ARRAY('.length;
    let inString = false;
    let prev = '';
    for (; i < result.length && depth > 0; i += 1) {
      const char = result[i];
      if (char === "'" && prev !== '\\') inString = !inString;
      if (!inString) {
        if (char === '(') depth += 1;
        else if (char === ')') depth -= 1;
      }
      prev = char;
    }
    const end = i; // índice justo después del ')' de cierre
    const inner = result.slice(start + 'JSON_ARRAY('.length, end - 1);
    const objects = [];
    let cursor = 0;
    while (cursor < inner.length) {
      const objStart = inner.indexOf('JSON_OBJECT(', cursor);
      if (objStart === -1) break;
      let d = 1;
      let j = objStart + 'JSON_OBJECT('.length;
      let str = false;
      let p = '';
      for (; j < inner.length && d > 0; j += 1) {
        const ch = inner[j];
        if (ch === "'" && p !== '\\') str = !str;
        if (!str) {
          if (ch === '(') d += 1;
          else if (ch === ')') d -= 1;
        }
        p = ch;
      }
      const body = inner.slice(objStart + 'JSON_OBJECT('.length, j - 1);
      const pairs = [];
      const pairRe = /'([^']*)'\s*,\s*('(?:[^']|'')*'|\d+|NULL)/g;
      let m;
      while ((m = pairRe.exec(body)) !== null) {
        const [, key, raw] = m;
        let value;
        if (raw === 'NULL') {
          value = 'null';
        } else if (raw.startsWith("'")) {
          // Se conserva como literal JSON entre comillas dobles.
          value = `"${raw.slice(1, -1).replace(/''/g, "''")}"`;
        } else {
          value = raw;
        }
        pairs.push(`"${key}": ${value}`);
      }
      objects.push(`{${pairs.join(', ')}}`);
      cursor = j;
    }
    result =
      `${result.slice(0, start)}'[${objects.join(', ')}]'::jsonb` +
      result.slice(end);
    start = result.indexOf('JSON_ARRAY(');
  }
  return result;
}

sql = convertJsonArrays(sql);

// Booleanos: solo en las tablas con columna booleana.
const booleanTables = [
  { table: 'users', columns: ['active'] },
  { table: 'destinations', columns: ['active'] },
  { table: 'activities', columns: ['active'] },
  { table: 'ai_services', columns: ['enabled'] },
];

for (const { table, columns } of booleanTables) {
  const insertRe = new RegExp(
    `(INSERT INTO ${table}\\s*\\(([^)]*)\\)\\s*VALUES)([\\s\\S]*?);`,
    'i',
  );
  sql = sql.replace(insertRe, (match, head, columnList, values) => {
    const cols = columnList
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter((c) => !c.startsWith('--'));
    const indexes = columns
      .map((col) => cols.indexOf(col))
      .filter((i) => i >= 0);

    // Divide los VALUES por filas (cada fila empieza con "(" precedido por
    // coma o salto de línea).
    const rows = [];
    let depth = 0;
    let current = '';
    let inString = false;
    let previous = '';
    for (const char of values) {
      if (char === "'" && previous !== '\\') inString = !inString;
      if (!inString) {
        if (char === '(' && depth === 0) {
          current = '(';
          depth = 1;
          previous = char;
          continue;
        }
        if (char === '(') depth += 1;
        if (char === ')') {
          depth -= 1;
          current += char;
          if (depth === 0) {
            rows.push(current);
            current = '';
            previous = char;
            continue;
          }
        }
      }
      if (depth > 0) current += char;
      previous = char;
    }

    const patched = rows.map((row) => {
      const fields = [];
      let buf = '';
      let d = 0;
      let inStr = false;
      let prev = '';
      // Ignora los paréntesis externos.
      for (const char of row.slice(1, -1)) {
        if (char === "'" && prev !== '\\') inStr = !inStr;
        if (!inStr) {
          if (char === '(') d += 1;
          if (char === ')') d -= 1;
          if (char === ',' && d === 0) {
            fields.push(buf);
            buf = '';
            prev = char;
            continue;
          }
        }
        buf += char;
        prev = char;
      }
      fields.push(buf);

      for (const index of indexes) {
        const value = fields[index]?.trim();
        if (value === '1') fields[index] = ' TRUE';
        else if (value === '0') fields[index] = ' FALSE';
      }

      return `(${fields.join(',')})`;
    });

    return `${head}\n  ${patched.join(',\n  ')};`;
  });
}

// Reajuste de secuencias al final.
sql += `

-- ------------------------------------------------------------
-- Sincroniza las secuencias IDENTITY con los IDs insertados
-- ------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users', 'id'),
              COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('destinations', 'id'),
              COALESCE((SELECT MAX(id) FROM destinations), 1));
SELECT setval(pg_get_serial_sequence('activities', 'id'),
              COALESCE((SELECT MAX(id) FROM activities), 1));
SELECT setval(pg_get_serial_sequence('ai_services', 'id'),
              COALESCE((SELECT MAX(id) FROM ai_services), 1));
SELECT setval(pg_get_serial_sequence('conversations', 'id'),
              COALESCE((SELECT MAX(id) FROM conversations), 1));
SELECT setval(pg_get_serial_sequence('messages', 'id'),
              COALESCE((SELECT MAX(id) FROM messages), 1));
SELECT setval(pg_get_serial_sequence('usage_logs', 'id'),
              COALESCE((SELECT MAX(id) FROM usage_logs), 1));
`;

fs.writeFileSync(OUT, sql, 'utf8');
console.log(`Generado: ${OUT}`);
