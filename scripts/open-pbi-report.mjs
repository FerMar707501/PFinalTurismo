/**
 * Abre Power BI Desktop con una URL de API lista para conectar y deja el
 * archivo listo para "Guardar como .pbix".
 *
 * No puede crear el .pbix por sí mismo: el DataModel interno usa compresión
 * XPress9, que solo escribe Power BI Desktop. Este script prepara todo lo
 * demás para que el guardado sea el único paso manual.
 *
 * Uso: node scripts/open-pbi-report.mjs
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const KEY_FILE = path.join(process.env.TEMP ?? '.', 'rutaia-pbi-key.txt');
const PBI = 'C:\\Program Files\\WindowsApps\\Microsoft.MicrosoftPowerBIDesktop_2.159.1231.0_x64__8wekyb3d8bbwe\\bin\\PBIDesktop.exe';
const ENDPOINT =
  'http://localhost:4000/api/external/analytics/usage?from=2026-01-01&to=2026-12-31';

function readKey() {
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE, 'utf8').trim();
  }
  throw new Error(
    'No se encontró la API key. Créala en la app: Analítica → Conectar Power BI.',
  );
}

async function ensureApi() {
  try {
    const health = await fetch('http://localhost:4000/api/health');
    const body = await health.json();
    if (body.status !== 'ok') {
      throw new Error('La API no está saludable.');
    }
    return true;
  } catch {
    return false;
  }
}

const key = readKey();
const apiUp = await ensureApi();

console.log('==================================================');
console.log('  RutaIA · Reporte de Power BI');
console.log('==================================================');
console.log('');
console.log(`API en línea: ${apiUp ? 'sí' : 'NO (inicia npm run dev en server/)'}`);
console.log('');
console.log('Endpoint para "Obtener datos → Web → Avanzado":');
console.log(`  URL: ${ENDPOINT}`);
console.log(`  Cabecera: X-API-Key = ${key.slice(0, 12)}…${key.slice(-4)}`);
console.log('');
console.log('Pasos en Power BI Desktop:');
console.log('  1. Obtener datos → Web → Avanzado');
console.log('  2. Pega la URL y añade la cabecera X-API-Key');
console.log('  3. Aceptar → Transformar datos → expandir los registros');
console.log('  4. Cerrar y aplicar');
console.log('  5. Archivo → Guardar como → powerbi\\reporte_rutaia.pbix');
console.log('');

// Deja la clave en el portapapeles para pegarla sin errores.
try {
  execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `Set-Clipboard -Value '${key}'`,
  ]);
  console.log('La API key está en el portapapeles (Ctrl+V en el campo de la cabecera).');
} catch {
  console.log('Copia la clave desde la app (Conectar Power BI) si el portapapeles falla.');
}

console.log('');
console.log('Abriendo Power BI Desktop…');
spawn(PBI, [], { detached: true, stdio: 'ignore' }).unref();
