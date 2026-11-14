const puppeteer = require('puppeteer-core');
const fs = require('fs');

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

  // Open presets
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
    const p = btns.find(b => b.innerText && b.innerText.includes('Popular Items'));
    if (p) p.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Add 2 items
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
    const c = btns.find(b => b.innerText && b.innerText.includes('Chicken Breast 2kg'));
    if (c) c.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
    const e = btns.find(b => b.innerText && b.innerText.includes('Fresh Eggs 30-pack'));
    if (e) e.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Check off Chicken Breast
  console.log('Checking off Chicken Breast as purchased...');
  await page.evaluate(() => {
    const checks = Array.from(document.querySelectorAll('button[title="Mark as bought"]'));
    if (checks.length > 0) checks[0].click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Save screenshot with 1 checked, 1 pending
  await page.screenshot({ path: 'screenshots/finance_shopping_list_modal.png' });
  console.log('Saved checked shopping modal screenshot to screenshots/finance_shopping_list_modal.png!');

  const info = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? d.innerText.split('\n').slice(0, 15).join(' | ') : 'NO DIALOG';
  });
  console.log('Checked modal info:', info);

  await browser.close();
})();
