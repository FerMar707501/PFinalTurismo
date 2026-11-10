// Captura la vista de Power BI y crea una API key temporal.
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
    pending.get(message.id)(message.result);
    pending.delete(message.id);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    logs.push(
      `[exception] ${message.params.exceptionDetails.exception?.description}`,
    );
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
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description);
  }
  return result.result.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});

await evaluate(`window.location.hash = '#/powerbi'`);
await sleep(2200);

const before = await evaluate(`(() => ({
  title: document.querySelector('.page-head h1')?.textContent,
  rows: document.querySelectorAll('.client-row').length,
  endpoint: document.querySelector('.endpoint-box code')?.textContent,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
}))()`);

await evaluate(`(() => {
  const input = [...document.querySelectorAll('input')].find(
    (node) => node.placeholder === 'Power BI · Consumo IA',
  );
  const set = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  ).set;
  set.call(input, 'TEST_Fase7 QA visual');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  [...document.querySelectorAll('button')]
    .find((node) => node.textContent.includes('Generar API key'))
    .click();
  return true;
})()`);
await sleep(2000);

const after = await evaluate(`(() => ({
  rows: document.querySelectorAll('.client-row').length,
  keyVisible: Boolean(document.querySelector('.new-key code')),
  toast: [...document.querySelectorAll('.toast')].map((node) => node.innerText),
}))()`);

const { data } = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
});
const fs = await import('node:fs');
fs.writeFileSync('qa-screens/19-powerbi.png', Buffer.from(data, 'base64'));

console.log(JSON.stringify({ before, after }, null, 2));
console.log(logs.join('\n') || 'sin excepciones');
ws.close();

