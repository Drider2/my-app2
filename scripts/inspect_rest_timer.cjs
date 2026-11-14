const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  const pwd = await page.$('input[type="password"]');
  if (pwd) {
    await pwd.type('greendream2026');
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await new Promise(r => setTimeout(r, 2000));
  }

  // Click Body
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button, nav button')).find(b => b.innerText && b.innerText.trim() === 'Body');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const allBtns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      title: b.title,
      aria: b.getAttribute('aria-label'),
      text: b.innerText.trim()
    }));
  });

  console.log('Available buttons in Body screen:');
  console.log(JSON.stringify(allBtns.filter(b => b.title || b.aria || b.text.includes('Timer') || b.text.includes('1RM')), null, 2));

  await browser.close();
})();
