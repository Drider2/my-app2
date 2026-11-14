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

  // Step 1: Click "Quick Add Popular Items"
  console.log('1. Toggling presets...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
    const p = btns.find(b => b.innerText && b.innerText.includes('Popular Items'));
    if (p) p.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Step 2: Check presets count
  const presetCount = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
    return btns.filter(b => b.innerText && (b.innerText.includes('Chicken Breast') || b.innerText.includes('Eggs'))).length;
  });
  console.log('2. Presets found in DOM:', presetCount);

  // Step 3: Click first preset
  console.log('3. Clicking first preset button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
    const c = btns.find(b => b.innerText && b.innerText.includes('Chicken Breast'));
    if (c) c.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Step 4: Click second preset
  console.log('4. Clicking second preset button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
    const e = btns.find(b => b.innerText && b.innerText.includes('Fresh Eggs'));
    if (e) e.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Step 5: Check items rendered
  const itemsText = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? d.innerText : 'NO DIALOG';
  });
  console.log('5. Dialog inner text preview:\n', itemsText.split('\n').slice(0, 20).join('\n'));

  // Step 6: Screenshot
  await page.screenshot({ path: 'screenshots/finance_shopping_list_modal.png' });
  console.log('Saved screenshot to screenshots/finance_shopping_list_modal.png');

  await browser.close();
})();
