// Captura el chat con una respuesta real de Groq (no simulada).
// Requiere: API en :4000 con GROQ_API_KEY, preview en :4173 y CDP en :9222.
const PORT = 9222;
const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
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
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

// Sesión limpia y login.
await evaluate(`localStorage.clear()`);
await send('Page.navigate', { url: `http://127.0.0.1:4173/?r=${Date.now()}#/login` });
await sleep(2500);

await evaluate(`(() => {
  const setValue = (selector, value) => {
    const input = document.querySelector(selector);
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  };
  setValue('input[name="email"]', 'demo@rutaia.local');
  setValue('input[name="password"]', 'Demo123!');
  const button = [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Entrar'));
  if (button) button.click();
  return true;
})()`);
await sleep(3000);

// Ir al chat y enviar una pregunta real.
await send('Page.navigate', { url: `http://127.0.0.1:4173/?r=${Date.now()}#/chat` });
await sleep(2500);

const sent = await evaluate(`(() => {
  const textarea = document.querySelector('textarea');
  if (!textarea) return 'sin textarea';
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  setter.call(textarea, '¿Qué actividades recomiendas en Antigua Guatemala para viajar con niños?');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  const form = textarea.closest('form');
  if (form) form.requestSubmit();
  return 'enviado';
})()`);

// Esperar a que Groq responda: el indicador "está consultando" desaparece
// y aparece una nueva burbuja del asistente.
let answered = false;
let previousCount = 0;
for (let attempt = 0; attempt < 60; attempt += 1) {
  await sleep(1000);
  const state = await evaluate(`(() => {
    const bubbles = document.querySelectorAll('.message, .chat-message').length;
    const loading = Boolean(
      [...document.querySelectorAll('*')].find(
        (node) =>
          node.children.length === 0 &&
          /consultando el catálogo|está pensando/i.test(node.textContent ?? ''),
      ),
    );
    return { bubbles, loading };
  })()`);
  if (state.bubbles > previousCount) {
    previousCount = state.bubbles;
  }
  if (!state.loading && state.bubbles > 3) {
    answered = true;
    break;
  }
}

await sleep(1500);
const info = await evaluate(`(() => {
  const main = document.querySelector('main');
  return {
    titulo: main?.querySelector('h1')?.textContent?.trim() ?? null,
    burbujas: document.querySelectorAll('.message, .chat-message').length,
    fuentes: document.querySelectorAll('.source-item, .sources li').length,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    textoUltima: [...document.querySelectorAll('.message, .chat-message')].pop()?.textContent?.slice(0, 160) ?? null,
  };
})()`);

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
fs.writeFileSync('qa-screens/04-chat.png', Buffer.from(shot.data, 'base64'));

console.log(JSON.stringify({ sent, answered, ...info }, null, 2));
console.log(logs.join('\n') || 'sin excepciones');
ws.close();
