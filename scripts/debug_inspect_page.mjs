import fs from 'fs';

const liveUrl = fs.existsSync('active_tunnel_url.txt') ? fs.readFileSync('active_tunnel_url.txt', 'utf8').trim() : 'http://localhost:5173';
console.log('Navigating to:', liveUrl);

const resTarget = await fetch('http://127.0.0.1:9334/json/new', { method: 'PUT' });
const target = await resTarget.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

let id = 1;
const send = (method, params = {}) => new Promise((resolve) => {
  const reqId = id++;
  const handler = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id === reqId) {
      ws.removeEventListener('message', handler);
      resolve(msg.result);
    }
  };
  ws.addEventListener('message', handler);
  ws.send(JSON.stringify({ id: reqId, method, params }));
});

const errors = [];
const consoleLogs = [];
const networkErrors = [];

ws.addEventListener('message', (e) => {
  try {
    const msg = JSON.parse(e.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLogs.push((msg.params.args || []).map(a => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Network.responseReceived') {
      if (msg.params.response.status >= 400) {
        networkErrors.push(`${msg.params.response.url} (HTTP ${msg.params.response.status})`);
      }
    }
  } catch {}
});

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Page.navigate', { url: liveUrl });
await new Promise(r => setTimeout(r, 4000));

const evalRes = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    title: document.title,
    hasPwd: Boolean(document.querySelector('input[type="password"]')),
    hasNav: Boolean(document.querySelector('nav')),
    lockoutText: document.querySelector('.text-red-400')?.textContent || '',
    html: document.body.innerHTML.slice(0, 500)
  })`,
  returnByValue: true
});

console.log('DEBUG RESULT:', evalRes.result?.value);
console.log('RUNTIME ERRORS:', errors);
console.log('CONSOLE LOGS:', consoleLogs);
console.log('NETWORK ERRORS:', networkErrors);
ws.close();
await fetch('http://127.0.0.1:9334/json/close/' + target.id);
process.exit(0);
