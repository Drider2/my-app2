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

// Poll until input exists
const startTime = Date.now();
while (Date.now() - startTime < 10000) {
  const check = await send('Runtime.evaluate', {
    expression: 'Boolean(document.querySelector(\'input[type="password"]\'))',
    returnByValue: true
  });
  if (check.result?.value) break;
  await new Promise(r => setTimeout(r, 200));
}

const unlockRes = await send('Runtime.evaluate', {
  expression: `
    (async () => {
      const pwdInput = document.querySelector('input[type="password"]');
      if (!pwdInput) return 'NO_INPUT';
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(pwdInput, 'greendream2026');
      pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 150));
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Unlock'));
      if (submitBtn) {
        submitBtn.click();
        return 'BUTTON_CLICKED';
      }
      return 'NO_BUTTON';
    })()
  `,
  awaitPromise: true,
  returnByValue: true
});
console.log('Unlock action:', unlockRes.result.value);

// Wait for unlock to complete and app to render
await new Promise(r => setTimeout(r, 1500));

const postUnlock = await send('Runtime.evaluate', {
  expression: `
    (() => {
      const rail = document.querySelector('nav[aria-label="Desktop navigation rail"]');
      const bottom = document.querySelector('nav[aria-label="Mobile navigation"]');
      const badge = document.querySelector('[data-testid="save-feedback-badge"]');
      const todayScreen = document.querySelector('main') || document.querySelector('div.min-h-screen');
      return {
        hasRail: Boolean(rail),
        hasBottom: Boolean(bottom),
        hasBadge: Boolean(badge),
        layout: document.documentElement.getAttribute('data-layout'),
        bodyText: document.body.innerText.slice(0, 80).replace(/\\n/g, ' ')
      };
    })()
  `,
  awaitPromise: true,
  returnByValue: true
});
console.log('Post unlock state:', postUnlock.result.value);

ws.close();
await fetch('http://127.0.0.1:9334/json/close/' + target.id, { method: 'PUT' });
