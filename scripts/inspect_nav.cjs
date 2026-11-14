const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Password gate
  const pwd = await page.$('input[type="password"]');
  if (pwd) {
    await pwd.type('greendream2026');
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await new Promise(r => setTimeout(r, 2000));
  }

  // Log all navigation buttons
  const navBtns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('nav button, header button, .fixed button')).map(b => ({
      text: b.innerText.trim(),
      className: b.className
    }));
  });
  console.log('Nav buttons:', JSON.stringify(navBtns));

  await browser.close();
})();
