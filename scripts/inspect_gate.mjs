const target = await fetch('http://127.0.0.1:9334/json/new', { method: 'PUT' }).then(r => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 1;
const send = (method, params = {}) => new Promise((resolve) => {
  const curId = id++;
  const handler = (evt) => {
    const data = JSON.parse(evt.data);
    if (data.id === curId) {
      ws.removeEventListener('message', handler);
      resolve(data.result);
    }
  };
  ws.addEventListener('message', handler);
  ws.send(JSON.stringify({ id: curId, method, params }));
});

await new Promise(r => ws.onopen = r);
await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: 'http://localhost:5173' });
await new Promise(r => setTimeout(r, 1500));

const htmlRes = await send('Runtime.evaluate', {
  expression: `
    (() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder,
        className: i.className
      }));
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      return { inputs, buttons };
    })()
  `,
  awaitPromise: true,
  returnByValue: true
});
console.log('Inputs & Buttons:', JSON.stringify(htmlRes.result.value, null, 2));

ws.close();
await fetch('http://127.0.0.1:9334/json/close/' + target.id, { method: 'PUT' });
