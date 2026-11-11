// Capturas de pantalla de RutaIA con el diseño "atardecer".
//
// Requisitos:
//   - API local en http://localhost:4000  (cd server && npm run dev)
//   - Frontend en http://localhost:4173   (cd client && npm run build && npx vite preview --port 4173)
//   - Playwright instalado donde se ejecute este script.
//
// Uso:
//   node scripts/capturas.mjs
//   node scripts/capturas.mjs https://rutaia-api-q3y2.onrender.com   # contra producción
//
// Salida: docs/capturas/*.png
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'capturas');
const BASE = 'http://localhost:4173';
const API_TARGET = process.argv[2] ?? 'http://localhost:4000';

const ADMIN = { email: 'admin@rutaia.local', password: 'Admin123!' };

const log = (...args) => console.log('[capturas]', ...args);

async function newContext(browser, theme = 'light', viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addInitScript(
    ([t]) => {
      localStorage.setItem('rutaia_theme', t);
    },
    [theme],
  );

  // En local, el preview sirve la SPA pero no la API: se redirige /api al backend.
  await ctx.route('**/api/**', async (route) => {
    const url = route.request().url().replace(`${BASE}/api`, `${API_TARGET}/api`);
    try {
      const response = await route.fetch({ url });
      await route.fulfill({ response });
    } catch {
      await route.abort();
    }
  });

  return ctx;
}

async function login(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  if (await page.$('input[name="email"]')) {
    await page.fill('input[name="email"]', ADMIN.email);
    await page.fill('input[name="password"]', ADMIN.password);
    await page.click('.login-card button[type="submit"]');
    await page.waitForSelector('.sidebar', { timeout: 30000 });
    await page.waitForTimeout(1800);
  }
}

async function go(page, view, wait = 2200) {
  await page.evaluate((v) => {
    window.location.hash = `#${v}`;
  }, view);
  await page.waitForTimeout(wait);
}

async function shot(page, name, caption) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file });
  log(`${name} — ${caption}`);
}

async function main() {
  const browser = await chromium.launch();
  const errors = [];

  // ---------- Escritorio, tema claro ----------
  {
    const ctx = await newContext(browser, 'light');
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[escritorio] ${e.message}`));

    // 01 · Login
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await shot(page, '01-login.png', 'Inicio de sesión con el nuevo diseño atardecer');

    await login(page);
    await shot(page, '02-inicio.png', 'Panel del administrador: inicio');

    await go(page, 'catalog', 3000);
    await shot(page, '03-catalogo.png', 'Catálogo de destinos de Guatemala');

    // Ficha de destino: abre el primer destino del catálogo.
    const card = await page.$('.destination-card, .catalog-card, article a[href*="destination"]');
    if (card) {
      await card.click().catch(() => {});
      await page.waitForTimeout(2500);
      await shot(page, '09-detalle-destino.png', 'Ficha de destino con actividades');
    }

    await go(page, 'chat');
    await shot(page, '04-chat-rag.png', 'Chat RAG con sugerencias');

    await go(page, 'itinerary');
    await shot(page, '05-itinerario.png', 'Agente de itinerarios');

    await go(page, 'compare');
    await shot(page, '06-comparador.png', 'Comparador de destinos');

    await go(page, 'runs');
    await shot(page, '07-historial-agentes.png', 'Historial de ejecuciones de agentes');

    await go(page, 'usage');
    await shot(page, '08-cuota.png', 'Portal de cuota de tokens');

    await go(page, 'admin', 3000);
    await shot(page, '10-admin-usuarios.png', 'Administración de usuarios y cuotas');

    // Pestañas del panel de administración.
    for (const [index, name, caption] of [
      [1, '11-admin-destinos.png', 'Administración de destinos'],
      [2, '12-admin-actividades.png', 'Administración de actividades'],
      [3, '13-admin-servicios-ia.png', 'Configuración de servicios de IA'],
    ]) {
      const button = page.locator('.admin-tab-btn').nth(index);
      if (await button.count()) {
        await button.click({ timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await shot(page, name, caption);
      } else {
        errors.push(`[admin] no se encontró la pestaña índice ${index}`);
      }
    }

    await go(page, 'analytics', 3500);
    await shot(page, '16-analitica.png', 'Panel de analítica y consumo de IA');

    await go(page, 'powerbi', 2500);
    await shot(page, '18-powerbi-conexion.png', 'Conexión de Power BI y API keys');

    await ctx.close();
  }

  // ---------- Escritorio, tema oscuro ----------
  {
    const ctx = await newContext(browser, 'dark');
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[oscuro] ${e.message}`));
    await login(page);
    await go(page, 'dashboard', 2500);
    await shot(page, '21-modo-oscuro.png', 'Panel en modo oscuro');

    await go(page, 'chat', 2500);
    await shot(page, '22-chat-oscuro.png', 'Chat RAG en modo oscuro');
    await ctx.close();
  }

  // ---------- Móvil ----------
  {
    const ctx = await newContext(browser, 'light', { width: 414, height: 896 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[movil] ${e.message}`));
    await login(page);
    await go(page, 'dashboard', 2500);
    await shot(page, '15-movil-inicio.png', 'Inicio en vista móvil');

    await go(page, 'chat', 2500);
    await shot(page, '14-movil-chat.png', 'Chat en vista móvil');

    await go(page, 'analytics', 3500);
    await shot(page, '17-analitica-movil.png', 'Analítica en vista móvil');
    await ctx.close();
  }

  // ---------- Swagger ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[swagger] ${e.message}`));
    await page.goto(`${API_TARGET}/api/docs`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    await shot(page, '19-swagger.png', 'Swagger UI con los grupos de la API');

    // Despliega el grupo de analítica para la segunda captura.
    const tag = page.locator('.opblock-tag', { hasText: /^Anal[íi]tica/i }).first();
    if (await tag.count()) {
      await tag.scrollIntoViewIfNeeded().catch(() => {});
      await tag.click().catch(() => {});
      await page.waitForTimeout(1200);
      await tag.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(600);
      await shot(page, '20-swagger-analitica.png', 'Endpoints de analítica y API externa');
    } else {
      errors.push('[swagger] no se encontró el grupo "Analítica"');
    }
    await ctx.close();
  }

  await browser.close();

  if (errors.length) {
    console.error('\nErrores detectados en el navegador:');
    errors.forEach((e) => console.error(' -', e));
    process.exitCode = 1;
  } else {
    log('Listo. Sin errores de JavaScript.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
