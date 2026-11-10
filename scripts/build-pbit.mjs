/**
 * Genera el modelo tabular de RutaIA en formato TMDL dentro de powerbi/modelo/.
 *
 * El TMDL se puede abrir en herramientas como Tabular Editor, o consultar como
 * referencia para recrear el modelo en Power BI Desktop. El .pbix final debe
 * guardarse desde Power BI Desktop: su DataModel usa compresión XPress9, que
 * solo escribe esa aplicación.
 *
 * Uso: node scripts/build-pbit.mjs [url-api]
 */
import fs from 'node:fs';
import path from 'node:path';

const API_URL =
  process.argv[2] ??
  'http://localhost:4000/api/external/analytics/usage';
const OUT = path.join(process.cwd(), 'powerbi', 'modelo');

const FROM = '2026-01-01';
const TO = '2026-12-31';

// --------------------------------------------------------------- expresiones
function mExpression(section) {
  const rows =
    section === 'totals'
      ? [
          '    totales = Json.Document(respuesta)[totals],',
          '    tabla = #table(Record.FieldNames(totales), {Record.FieldValues(totales)})',
        ]
      : [
          `    registros = Json.Document(respuesta)[${section}],`,
          '    tabla = Table.FromRecords(registros)',
        ];

  return [
    'let',
    `    url = "${API_URL}?from=${FROM}&to=${TO}",`,
    '    respuesta = Web.Contents(url, [Headers = [#"X-API-Key" = ApiKey]]),',
    ...rows,
    'in',
    '    tabla',
  ];
}

// ------------------------------------------------------------------- columnas
const SCHEMAS = {
  Totales: {
    section: 'totals',
    columns: [
      ['requests', 'Int64'],
      ['successfulRequests', 'Int64'],
      ['blockedRequests', 'Int64'],
      ['errorRequests', 'Int64'],
      ['promptTokens', 'Int64'],
      ['completionTokens', 'Int64'],
      ['totalTokens', 'Int64'],
      ['averageTokens', 'Int64'],
      ['averageLatencyMs', 'Int64'],
      ['activeUsers', 'Int64'],
      ['successRate', 'Double'],
    ],
    measures: [
      ['Total de tokens', 'SUM(Totales[totalTokens])', '#,##0'],
      ['Solicitudes', 'SUM(Totales[requests])', '#,##0'],
      [
        'Tasa de éxito',
        'DIVIDE(SUM(Totales[successfulRequests]), SUM(Totales[requests]))',
        '0.00%',
      ],
      ['Latencia media', 'AVERAGE(Totales[averageLatencyMs])', '#,##0'],
      [
        'Promedio diario de tokens',
        'DIVIDE(SUM(Totales[totalTokens]), COUNTROWS(Diario))',
        '#,##0',
      ],
    ],
  },
  Servicios: {
    section: 'byService',
    columns: [
      ['serviceCode', 'String'],
      ['requests', 'Int64'],
      ['successfulRequests', 'Int64'],
      ['blockedRequests', 'Int64'],
      ['errorRequests', 'Int64'],
      ['promptTokens', 'Int64'],
      ['completionTokens', 'Int64'],
      ['totalTokens', 'Int64'],
      ['averageTokens', 'Int64'],
      ['averageLatencyMs', 'Int64'],
      ['activeUsers', 'Int64'],
      ['sharePercent', 'Double'],
    ],
  },
  Usuarios: {
    section: 'byUser',
    columns: [
      ['userId', 'Int64'],
      ['name', 'String'],
      ['email', 'String'],
      ['role', 'String'],
      ['totalTokens', 'Int64'],
      ['requests', 'Int64'],
      ['successfulRequests', 'Int64'],
      ['blockedRequests', 'Int64'],
      ['errorRequests', 'Int64'],
      ['averageLatencyMs', 'Int64'],
    ],
  },
  Diario: {
    section: 'daily',
    columns: [
      ['date', 'DateTime'],
      ['requests', 'Int64'],
      ['successfulRequests', 'Int64'],
      ['blockedRequests', 'Int64'],
      ['totalTokens', 'Int64'],
      ['promptTokens', 'Int64'],
      ['completionTokens', 'Int64'],
    ],
  },
  Mensual: {
    section: 'monthly',
    columns: [
      ['month', 'String'],
      ['requests', 'Int64'],
      ['successfulRequests', 'Int64'],
      ['blockedRequests', 'Int64'],
      ['totalTokens', 'Int64'],
      ['promptTokens', 'Int64'],
      ['completionTokens', 'Int64'],
    ],
  },
};

function indent(text, size) {
  const pad = '\t'.repeat(size);
  return text
    .split('\n')
    .map((line) => (line.trim() ? `${pad}${line}` : line))
    .join('\n');
}

function buildTable(name, schema) {
  const expression = mExpression(schema.section).join('\n');
  const columns = schema.columns
    .map(
      ([column, type]) =>
        `\tcolumn ${column}\n\t\tdataType: ${type}\n\t\tsummarizeBy: none\n\t\tsourceColumn: ${column}`,
    )
    .join('\n\n');

  const measures = (schema.measures ?? [])
    .map(
      ([measureName, dax, format]) =>
        `\tmeasure '${measureName}' = ${dax}\n\t\tformatString: ${format}`,
    )
    .join('\n\n');

  return [
    `table ${name}`,
    columns,
    measures,
    '',
    `\tpartition ${name}-Partition = m`,
    '\t\tmode: import',
    '\t\tsource =',
    indent(expression, 3),
    '',
  ]
    .filter((part) => part !== '')
    .join('\n');
}

// ----------------------------------------------------------------- generación
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'tables'), { recursive: true });

const tableRefs = Object.keys(SCHEMAS)
  .map((name) => `ref table ${name}`)
  .join('\n');

fs.writeFileSync(
  path.join(OUT, 'database.tmdl'),
  ['database RutaIA', '\tcompatibilityLevel: 1570', ''].join('\n'),
  'utf8',
);

fs.writeFileSync(
  path.join(OUT, 'model.tmdl'),
  [
    'model Model',
    '\tculture: es-CO',
    '\tdefaultPowerBIDataSourceVersion: powerBI_V3',
    '',
    tableRefs,
    '',
  ].join('\n'),
  'utf8',
);

fs.writeFileSync(
  path.join(OUT, 'expressions.tmdl'),
  [
    'expression ApiKey =',
    '\t\t"rutaia_CLAVE_DE_API" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]',
    '\tannotation PBI_IsParameterQuery = true',
    '',
  ].join('\n'),
  'utf8',
);

for (const [name, schema] of Object.entries(SCHEMAS)) {
  fs.writeFileSync(
    path.join(OUT, 'tables', `${name}.tmdl`),
    buildTable(name, schema),
    'utf8',
  );
}

console.log(`Modelo TMDL generado en ${OUT}`);
console.log(`Tablas: ${Object.keys(SCHEMAS).join(', ')}`);
console.log(`Endpoint: ${API_URL}`);
console.log('');
console.log('Para el .pbix: abre Power BI Desktop y sigue powerbi/README.md.');
console.log('El DataModel usa XPress9 y solo Power BI Desktop puede escribirlo.');
