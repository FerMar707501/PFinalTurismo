// Diagnóstico rápido del frontend vía CDP.
// Uso: node scripts/qa-debug.mjs
const targets = await fetch('http://127.0.0.1:9222/json/list').then((r) => r.json());
const page = targets.find((item) => item.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

let nextId = 1;
const pending = new Map();
const logs = [];

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
    return;
  }
  if (message.method === 'Runtime.consoleAPICalled') {
    logs.push(`[${message.params.type}] ${message.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    logs.push(`[exception] ${message.params.exceptionDetails.exception?.description}`);
  }
  if (message.method === 'Network.loadingFailed') {
    logs.push(`[net-fail] ${message.params.errorText} ${message.params.blockedReason ?? ''}`);
  }
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result?.exceptionDetails) {
    return { error: result.exceptionDetails.exception?.description };
  }
  return result?.result?.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: 'http://127.0.0.1:4173/#/dashboard' });
await sleep(2000);

const loginResult = await evaluate(`(async () => {
  const response = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@rutaia.local', password: 'Admin123!' }),
  });
  return { status: response.status, text: (await response.text()).slice(0, 80) };
})()`);
console.log('login directo:', loginResult);

console.log(JSON.stringify(await evaluate(`(() => ({
  inputs: [...document.querySelectorAll('input')].map((node) => ({
    name: node.name,
    type: node.type,
    value: node.value,
  })),
  buttons: [...document.querySelectorAll('button')].map((node) => node.textContent.trim()).slice(0, 8),
}))()`), null, 2));

await evaluate(`(() => {
  const email = document.querySelector('input[name="email"]');
  const password = document.querySelector('input[name="password"]');
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(email, 'admin@rutaia.local');
  email.dispatchEvent(new Event('input', { bubbles: true }));
  set.call(password, 'Admin123!');
  password.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('button[type="submit"]').click();
  return true;
})()`);
await sleep(4000);

console.log(JSON.stringify(await evaluate(`(() => ({
  hash: location.hash,
  text: document.body.innerText.slice(0, 400),
  alerts: [...document.querySelectorAll('.inline-alert')].map((node) => node.innerText),
  cards: document.querySelectorAll('.destination-card').length,
  views: document.querySelectorAll('.nav-link').length,
}))()`), null, 2));

console.log('--- logs ---');
console.log(logs.join('\n') || 'sin logs');
ws.close();
