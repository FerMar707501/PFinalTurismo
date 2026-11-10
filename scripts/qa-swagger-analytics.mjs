// Captura la sección de analítica de Swagger con un viewport alto.
const PORT = 9223;
const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) =>
  r.json(),
);
const page = targets.find((item) => item.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) =>
  ws.addEventListener('open', resolve, { once: true }),
);

let nextId = 1;
const pending = new Map();

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
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
    return { error: result.exceptionDetails.exception?.description };
  }
  return result.result.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fs = await import('node:fs');

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1400,
  deviceScaleFactor: 1,
  mobile: false,
});

const offset = await evaluate(`(() => {
  const tags = [...document.querySelectorAll('.opblock-tag')];
  const target = tags.find((node) => node.textContent.includes('Analítica'));
  if (!target) return null;
  return target.getBoundingClientRect().top + window.scrollY - 30;
})()`);

await evaluate(`window.scrollTo(0, ${Number(offset) || 0})`);
await sleep(800);

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
});
fs.writeFileSync(
  'docs/capturas/20-swagger-analitica.png',
  Buffer.from(shot.data, 'base64'),
);

console.log('offset:', offset);
ws.close();
