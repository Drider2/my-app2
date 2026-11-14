const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      executablePath: CHROME_PATH, 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 950 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    // Password
    const pwd = await page.$('input[type="password"]');
    if (pwd) {
      await pwd.type('greendream2026');
      const submit = await page.$('button[type="submit"]');
      if (submit) await submit.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    // Money tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const moneyBtn = btns.find(b => b.innerText && b.innerText.trim() === 'Money');
      if (moneyBtn) moneyBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Click shopping cart button
    await page.waitForSelector('button[aria-label="Shopping & Grocery List"]', { timeout: 5000 });
    await page.click('button[aria-label="Shopping & Grocery List"]');
    await new Promise(r => setTimeout(r, 800));

    // Open Quick Presets
    console.log('Opening quick presets...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const p = btns.find(b => b.innerText && b.innerText.includes('Quick Add Popular Items'));
      if (p) p.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Click "Chicken Breast 2kg" preset
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const c = btns.find(b => b.innerText && b.innerText.includes('Chicken Breast 2kg'));
      if (c) c.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Click "Fresh Eggs 30-pack" preset
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const e = btns.find(b => b.innerText && b.innerText.includes('Fresh Eggs 30-pack'));
      if (e) e.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Click "Whole Milk 6L" preset
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const m = btns.find(b => b.innerText && b.innerText.includes('Whole Milk 6L'));
      if (m) m.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Check off "Chicken Breast 2kg"
    console.log('Marking Chicken Breast as purchased...');
    await page.evaluate(() => {
      const checks = Array.from(document.querySelectorAll('button[title="Mark as bought"]'));
      if (checks.length > 0) checks[0].click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Take screenshot of populated shopping modal
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/finance_shopping_list_modal.png' });
    console.log('Populated Shopping List Modal screenshot saved!');

    const summary = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText.split('\n').slice(0, 15).join(' | ') : 'NO DIALOG';
    });
    console.log('Summary:', summary);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
