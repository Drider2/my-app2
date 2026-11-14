const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('Launching Chrome to test Recurring Subscriptions Modal...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });

    // Handle password gate if present
    const pwdInput = await page.$('input[type="password"]');
    if (pwdInput) {
      console.log('Password gate detected, authenticating...');
      await pwdInput.type('greendream2026');
      const submitBtn = await page.$('button[type="submit"]') || await page.$('button');
      if (submitBtn) await submitBtn.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    // Switch to Money / Finance screen
    console.log('Switching to Money tab...');
    await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const moneyBtn = allButtons.find(b => b.textContent && b.textContent.trim() === 'Money');
      if (moneyBtn) moneyBtn.click();
    });

    await new Promise(r => setTimeout(r, 2000));

    // Click the Recurring Subscriptions & Bills button in header
    console.log('Clicking Recurring Subscriptions button...');
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('button[title="Recurring Subscriptions & Bills"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Header recurring button clicked:', clicked);

    await new Promise(r => setTimeout(r, 1500));

    // Ensure screenshots directory exists
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    const screenshotPath = path.join(screenshotsDir, 'recurring_subscriptions_modal.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Verify modal text
    const textCheck = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasTitle: bodyText.includes('Recurring Subscriptions & Bills'),
        hasMonthlyBurn: bodyText.includes('Estimated Monthly Burn') || bodyText.includes('Active Commitments'),
      };
    });

    console.log('Verification check result:', JSON.stringify(textCheck));
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
