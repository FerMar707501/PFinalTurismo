// Verificación visual de la Fase 7 con CDP.
// Requisitos: API en 4000, preview en 4173 y Edge/Chrome con 9222.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'qa-screens');
fs.mkdirSync(OUT, { recursive: true });

const targets = await fetch('http://127.0.0.1:9222/json/list').then((r) =>
  r.json(),
);
const page = targets.find((item) => item.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) =>
  ws.addEventListener('open', resolve, { once: true }),
);

let nextId = 1;
const pending = new Map();
const logs = [];

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
    logs.push(
      `[${message.params.type}] ` +
        message.params.args
          .map((arg) => arg.value ?? arg.description ?? arg.type)
          .join(' '),
    );
  }
  if (message.method === 'Runtime.exceptionThrown') {
    logs.push(
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

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

await evaluate('localStorage.clear(); sessionStorage.clear(); true');
await send('Page.navigate', {
  url: `http://127.0.0.1:4173/?r=${Date.now()}#/dashboard`,
});
await sleep(2200);

await evaluate(`(() => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const email = document.querySelector('input[name="email"]');
  const password = document.querySelector('input[name="password"]');
  set.call(email, 'admin@rutaia.local');
  email.dispatchEvent(new Event('input', { bubbles: true }));
  set.call(password, 'Admin123!');
  password.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('button[type="submit"]').click();
  return true;
})()`);
await sleep(2600);

await evaluate(`window.location.hash = '#/analytics'`);
await sleep(2600);

const summary = await evaluate(`(() => ({
  hash: location.hash,
  title: document.querySelector('.page-head h1')?.textContent,
  kpis: [...document.querySelectorAll('.analytics-kpis .stat-card strong')].map((node) => node.textContent),
  bars: document.querySelectorAll('.chart-bar').length,
  services: [...document.querySelectorAll('.breakdown-row strong')].map((node) => node.textContent),
  tables: document.querySelectorAll('.analytics-table').length,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  alerts: [...document.querySelectorAll('.inline-alert')].map((node) => node.innerText),
}))()`);

const { data } = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
});
fs.writeFileSync(path.join(OUT, '17-analytics.png'), Buffer.from(data, 'base64'));

await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await sleep(700);
const mobile = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
});
fs.writeFileSync(
  path.join(OUT, '18-analytics-mobile.png'),
  Buffer.from(mobile.data, 'base64'),
);

console.log(JSON.stringify(summary, null, 2));
console.log('--- consola ---');
console.log(logs.join('\n') || 'sin mensajes');
ws.close();
