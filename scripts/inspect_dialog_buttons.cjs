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

  // Print all buttons inside [role="dialog"]
  const dialogBtns = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return 'NO DIALOG';
    const btns = Array.from(d.querySelectorAll('button'));
    return btns.map(b => ({
      text: b.innerText,
      title: b.getAttribute('title'),
      aria: b.getAttribute('aria-label'),
      type: b.getAttribute('type')
    }));
  });
  console.log('Dialog Buttons:', JSON.stringify(dialogBtns, null, 2));
  await browser.close();
})();
