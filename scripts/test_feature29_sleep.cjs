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

    // Look for Sleep button in header
    await page.waitForSelector('button[aria-label="Sleep & Recovery Optimizer"]', { timeout: 5000 });
    await page.click('button[aria-label="Sleep & Recovery Optimizer"]');
    await new Promise(r => setTimeout(r, 800));

    // Confirm dialog is rendered
    const dialogPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Sleep Dialog Status:', dialogPreview.slice(0, 150));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/dashboard_sleep_modal.png' });
    console.log('Successfully captured screenshots/dashboard_sleep_modal.png!');

    // Submit a sleep entry: 23:00 to 07:30
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Save Sleep Measurement'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log('Successfully logged sleep measurement!');

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
