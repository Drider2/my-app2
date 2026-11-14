const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ 
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  const pwd = await page.$('input[type="password"]');
  if (pwd) {
    await pwd.type('greendream2026');
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await new Promise(r => setTimeout(r, 1200));
  }
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const m = btns.find(b => b.innerText && b.innerText.trim() === 'Money');
    if (m) m.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.click('button[aria-label="Shopping & Grocery List"]');
  await new Promise(r => setTimeout(r, 800));

  const rect = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return null;
    const r = dialog.getBoundingClientRect();
    const computed = window.getComputedStyle(dialog);
    const parent = dialog.parentElement;
    const pComp = window.getComputedStyle(parent);
    return {
      dialog: {
        top: r.top, left: r.left, width: r.width, height: r.height,
        display: computed.display, visibility: computed.visibility,
        opacity: computed.opacity, zIndex: computed.zIndex,
        background: computed.backgroundColor
      },
      parent: {
        display: pComp.display, zIndex: pComp.zIndex, opacity: pComp.opacity
      }
    };
  });
  console.log('Dialog BoundingRect & Style:', JSON.stringify(rect, null, 2));
  await browser.close();
})();
