const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

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

  // Navigate to Journal
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('header button, nav button')).find(b => b.innerText && b.innerText.trim() === 'Journal');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Click Write New Reflection button
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Write New Reflection'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const screenshotPath = path.join(__dirname, '..', 'screenshots', 'journal_write_form_with_prompts.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot to:', screenshotPath);

  const text = await page.evaluate(() => document.body.innerText);
  console.log('--- FORM OPEN TEXT ---');
  console.log(text);

  await browser.close();
})();
