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

  const info = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const r = dialog.getBoundingClientRect();
    const overlay = dialog.parentElement;
    const or = overlay.getBoundingClientRect();
    
    // Check ancestors
    let el = overlay;
    const ancestors = [];
    while (el && el !== document.body) {
      const comp = window.getComputedStyle(el);
      ancestors.push({
        tag: el.tagName,
        class: el.className,
        transform: comp.transform,
        filter: comp.filter,
        position: comp.position,
        height: comp.height
      });
      el = el.parentElement;
    }

    return {
      windowHeight: window.innerHeight,
      dialogTop: r.top,
      dialogHeight: r.height,
      overlayTop: or.top,
      overlayHeight: or.height,
      ancestors
    };
  });
  console.log('Positioning analysis:', JSON.stringify(info, null, 2));
  await browser.close();
})();
