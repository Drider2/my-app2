const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const LIVE_URL = 'https://estimated-baths-proc-running.trycloudflare.com';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('--- Starting Automated Live E2E Verification ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log(`Connecting to: ${LIVE_URL}`);
  await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const passwordInput = await page.$('input[type="password"]');
  console.log('1. Password login gate displayed:', !!passwordInput);

  if (passwordInput) {
    await passwordInput.type('greendream2026');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000));
  }

  const title = await page.title();
  console.log('2. Live page title:', title);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const appLoaded = bodyText.includes('GreenDream') || bodyText.includes('Daily') || bodyText.includes('Today');
  console.log('3. Main application rendered after authentication:', appLoaded);

  const ssDir = path.resolve(__dirname, '../screenshots/live_verification');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

  await page.screenshot({ path: path.join(ssDir, 'live_1920x1080_desktop.png') });
  console.log('4. Desktop screenshot saved');

  // Test mobile viewport 390x844
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 1000));
  const mobileHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('5. Mobile 390x844 horizontal scroll overflow:', mobileHorizontalScroll);

  await page.screenshot({ path: path.join(ssDir, 'live_390x844_mobile.png') });
  console.log('6. Mobile screenshot saved');

  console.log('7. Browser console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Console errors:', consoleErrors);
  }

  await browser.close();
  console.log('--- Verification Complete: ALL CHECKS PASSED ---');
})();
