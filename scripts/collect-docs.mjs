// Genera la colección de capturas de la entrega a partir de qa-screens.
// Uso: node scripts/collect-docs.mjs
import fs from 'node:fs';
import path from 'node:path';

const source = path.join(process.cwd(), 'qa-screens');
const target = path.join(process.cwd(), 'docs', 'capturas');
fs.mkdirSync(target, { recursive: true });

const mapping = {
  '01-login.png': '01-login.png',
  '02-dashboard.png': '02-inicio.png',
  '03-catalog.png': '03-catalogo.png',
  '04-chat.png': '04-chat-rag.png',
  '05-itinerary.png': '05-itinerario.png',
  '06-compare.png': '06-comparador.png',
  '07-runs.png': '07-historial-agentes.png',
  '08-usage.png': '08-cuota.png',
  '10-catalog-detail.png': '09-detalle-destino.png',
  '11-admin-users.png': '10-admin-usuarios.png',
  '12-admin-destinations.png': '11-admin-destinos.png',
  '13-admin-activities.png': '12-admin-actividades.png',
  '14-admin-services.png': '13-admin-servicios-ia.png',
  '15-mobile-chat.png': '14-movil-chat.png',
  '16-mobile-dashboard.png': '15-movil-inicio.png',
  '17-analytics.png': '16-analitica.png',
  '18-analytics-mobile.png': '17-analitica-movil.png',
  '19-powerbi.png': '18-powerbi-conexion.png',
};

let copied = 0;
const missing = [];

for (const [from, to] of Object.entries(mapping)) {
  const origin = path.join(source, from);
  if (!fs.existsSync(origin)) {
    missing.push(from);
    continue;
  }
  fs.copyFileSync(origin, path.join(target, to));
  copied += 1;
}

console.log(`Copiadas ${copied} capturas en docs/capturas.`);
if (missing.length) {
  console.log(`Faltan: ${missing.join(', ')}`);
  process.exitCode = 1;
}
