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

    // Click shopping cart
    await page.waitForSelector('button[aria-label="Shopping & Grocery List"]', { timeout: 5000 });
    await page.click('button[aria-label="Shopping & Grocery List"]');
    await new Promise(r => setTimeout(r, 800));

    // Capture screenshot right here when modal is open!
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/finance_shopping_list_modal.png' });
    console.log('Successfully captured open Shopping List Modal to screenshots/finance_shopping_list_modal.png!');

    // Let's also check dialog presence
    const dialogText = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Dialog status:', dialogText.slice(0, 100));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
