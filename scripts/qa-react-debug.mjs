// Diagnóstico: captura errores y consulta el estado de React.
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
      `[exception] ${
        message.params.exceptionDetails.exception?.description ??
        message.params.exceptionDetails.text
      }`,
    );
  }
  if (message.method === 'Runtime.consoleAPICalled') {
    logs.push(
      `[${message.params.type}] ` +
        message.params.args
          .map((arg) => arg.value ?? arg.description ?? arg.type)
          .join(' '),
    );
  }
  if (message.method === 'Log.entryAdded') {
    logs.push(`[log:${message.params.entry.level}] ${message.params.entry.text}`);
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

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

console.log(
  'rutaia:',
  JSON.stringify(await evaluate('window.__rutaia ?? null')),
);

await send('Page.navigate', {
  url: `http://127.0.0.1:4173/?r=${Date.now()}#/dashboard`,
});
await sleep(2500);

console.log(
  'después de recargar:',
  JSON.stringify(
    await evaluate(`({
      hash: location.hash,
      rutaia: window.__rutaia ?? null,
      title: document.querySelector('main h1')?.textContent ?? null,
      body: document.body.innerText.slice(0, 80),
    })`),
    null,
    2,
  ),
);

console.log('--- logs ---');
console.log(logs.join('\n') || 'sin logs');
ws.close();

