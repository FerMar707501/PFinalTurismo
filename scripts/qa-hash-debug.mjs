// Diagnóstico: window.__rutaia y navegación por hash.
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

await send('Page.enable');
await send('Runtime.enable');

console.log(
  'estado hash actual:',
  JSON.stringify(
    await evaluate(`({
      hash: location.hash,
      rutaia: window.__rutaia ?? null,
      scripts: [...document.scripts].map((node) => node.src),
    })`),
    null,
    2,
  ),
);

console.log(
  'pushState:',
  JSON.stringify(
    await evaluate(`(() => {
      history.pushState(null, '', '/#/analytics');
      return { hash: location.hash, rutaia: window.__rutaia ?? null };
    })()`),
    null,
    2,
  ),
);

await new Promise((resolve) => setTimeout(resolve, 1200));

console.log(
  'después:',
  JSON.stringify(
    await evaluate(`({
      hash: location.hash,
      title: document.querySelector('.page-head h1')?.textContent ?? null,
      rutaia: window.__rutaia ?? null,
    })`),
    null,
    2,
  ),
);

ws.close();
