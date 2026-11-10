// Diagnóstico mínimo: verifica el hash actual y los campos de la vista Power BI.
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await send('Page.enable');
await send('Runtime.enable');

console.log(
  JSON.stringify(
    await evaluate(`(() => ({
      hash: location.hash,
      title: document.querySelector('main h1')?.textContent ?? null,
      inputs: [...document.querySelectorAll('input')].map((node) => ({
        placeholder: node.placeholder,
        value: node.value,
        type: node.type,
      })),
      buttons: [...document.querySelectorAll('button')]
        .map((node) => node.textContent.trim())
        .slice(0, 20),
      loggedIn: Boolean(localStorage.getItem('rutaia_token')),
    }))()`),
    null,
    2,
  ),
);

ws.close();

