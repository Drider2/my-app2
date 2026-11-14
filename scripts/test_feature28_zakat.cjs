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

    // Look for Zakat & Charity button
    await page.waitForSelector('button[aria-label="Zakat & Charity Desk"]', { timeout: 5000 });
    await page.click('button[aria-label="Zakat & Charity Desk"]');
    await new Promise(r => setTimeout(r, 800));

    // Confirm dialog is rendered
    const dialogPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Zakat Dialog Status:', dialogPreview.slice(0, 150));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/finance_zakat_modal.png' });
    console.log('Successfully captured screenshots/finance_zakat_modal.png!');

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
