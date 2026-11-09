// Cliente CDP mínimo para pruebas manuales del frontend.
// Uso: node scripts/qa-frontend.mjs
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'qa-screens');
fs.mkdirSync(OUT, { recursive: true });

const targets = await fetch('http://127.0.0.1:9222/json/list').then((r) =>
  r.json(),
);
const page = targets.find((item) => item.type === 'page');

if (!page) {
  throw new Error('No hay pestaña de Edge disponible en el puerto 9222.');
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const consoleMessages = [];

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(JSON.stringify(message.error)));
    } else {
      resolve(message.result);
    }
    return;
  }

  if (message.method === 'Runtime.consoleAPICalled') {
    const text = message.params.args
      .map((arg) => arg.value ?? arg.description ?? arg.type)
      .join(' ');
    consoleMessages.push(`[${message.params.type}] ${text}`);
  }

  if (message.method === 'Runtime.exceptionThrown') {
    consoleMessages.push(
      `[exception] ${
        message.params.exceptionDetails.exception?.description ??
        message.params.exceptionDetails.text
      }`,
    );
  }
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    );
  }

  return result.result.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickText(selector, text) {
  return evaluate(`(() => {
    const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
    const target = nodes.find((node) =>
      (node.textContent || '').trim().includes(${JSON.stringify(text)}),
    );
    if (!target) throw new Error('No se encontró: ' + ${JSON.stringify(text)});
    target.click();
    return true;
  })()`);
}

async function fill(selector, value) {
  return evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) throw new Error('No existe el campo ${selector}');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    ).set;
    setter.call(node, ${JSON.stringify(value)});
    node.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
}

async function shot(name, fullPage = true) {
  if (fullPage) {
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
    return;
  }

  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
}

async function overflowReport(label) {
  return evaluate(`(() => {
    const width = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.right > width + 2;
      })
      .slice(0, 8)
      .map((node) => node.className || node.tagName);
    return {
      label: ${JSON.stringify(label)},
      width,
      scrollWidth: document.documentElement.scrollWidth,
      offenders,
      text: document.body.innerText.slice(0, 260),
    };
  })()`);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await evaluate(`localStorage.clear(); sessionStorage.clear(); true`);
await send('Page.navigate', {
  url: 'http://127.0.0.1:4173/?r=' + Date.now() + '#/dashboard',
});
await sleep(2500);

const report = [];
report.push(await overflowReport('login'));
await shot('01-login');

await fill('input[name="email"]', 'admin@rutaia.local');
await fill('input[name="password"]', 'Admin123!');
await clickText('button', 'Entrar a RutaIA');
await sleep(3000);
report.push(await overflowReport('dashboard'));
await shot('02-dashboard');

const views = [
  ['catalog', '03-catalog'],
  ['chat', '04-chat'],
  ['itinerary', '05-itinerary'],
  ['compare', '06-compare'],
  ['runs', '07-runs'],
  ['usage', '08-usage'],
  ['admin', '09-admin'],
];

for (const [view, name] of views) {
  await evaluate(`window.location.hash = '#/${view}'`);
  await sleep(2200);
  report.push(await overflowReport(view));
  await shot(name);
}

await evaluate(`window.location.hash = '#/catalog'`);
await sleep(1600);
await clickText('.destination-card', 'Cartagena de Indias');
await sleep(1800);
await shot('10-catalog-detail', false);
report.push(await overflowReport('catalog-detail'));

await evaluate(`window.location.hash = '#/admin'`);
await sleep(1500);
for (const [label, index] of [
  ['Usuarios', '11-admin-users'],
  ['Destinos', '12-admin-destinations'],
  ['Actividades', '13-admin-activities'],
  ['Servicios IA', '14-admin-services'],
]) {
  await clickText('.admin-tab-btn', label);
  await sleep(1700);
  report.push(await overflowReport(`admin-${index}`));
  await shot(index);
}

await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await sleep(600);
for (const [view, name] of [
  ['chat', '15-mobile-chat'],
  ['dashboard', '16-mobile-dashboard'],
]) {
  await evaluate(`window.location.hash = '#/${view}'`);
  await sleep(1700);
  report.push(await overflowReport(`mobile-${view}`));
  await shot(name);
}

console.log(JSON.stringify(report, null, 2));
console.log('--- consola ---');
console.log(consoleMessages.join('\n') || 'sin mensajes');

ws.close();
