// Captura Swagger UI y documenta los endpoints nuevos de la Fase 7.
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
const logs = [];

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    logs.push(message.params.exceptionDetails.exception?.description);
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
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});

await send('Page.navigate', { url: 'http://localhost:4000/api/docs' });
await sleep(3000);

const info = await evaluate(`(() => ({
  title: document.title,
  ops: document.querySelectorAll('.opblock').length,
  tags: [...document.querySelectorAll('.opblock-tag')].map((node) => node.textContent.trim().slice(0, 40)),
}))()`);

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
});
fs.writeFileSync('docs/capturas/19-swagger.png', Buffer.from(shot.data, 'base64'));

console.log(JSON.stringify(info, null, 2));
console.log(logs.join('\n') || 'sin excepciones');
ws.close();
