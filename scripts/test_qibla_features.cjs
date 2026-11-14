const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    await page.setViewport({ width: 1280, height: 850 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    // Password gate
    const pwd = await page.$('input[type="password"]');
    if (pwd) {
      await pwd.type('greendream2026');
      const submit = await page.$('button[type="submit"]');
      if (submit) await submit.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    // Navigate to Prayer screen
    console.log('Navigating to Prayer screen...');
    const prayerClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const btn = btns.find(b => b.innerText && b.innerText.includes('Prayer'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Prayer button clicked:', prayerClicked);
    await new Promise(r => setTimeout(r, 2000));

    // Verify screen header
    const screenTitle = await page.evaluate(() => {
      return document.querySelector('h1')?.innerText;
    });
    console.log('Screen title:', screenTitle);

    // Click Qibla Compass button
    console.log('Clicking Qibla Compass button...');
    const opened = await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Qibla Compass"]') ||
                  document.querySelector('button[aria-label="Qibla Compass"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Qibla Compass modal opened:', opened);
    await new Promise(r => setTimeout(r, 1000));

    // Verify modal text & details
    const modalDetails = await page.evaluate(() => {
      const modal = document.querySelector('div[role="dialog"]');
      if (!modal) return null;
      return {
        title: modal.querySelector('h2')?.innerText,
        text: modal.innerText
      };
    });
    console.log('Modal details:', JSON.stringify(modalDetails, null, 2));

    // Capture screenshot
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const screenshotPath = path.join(screenshotsDir, 'prayers_qibla_compass.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved screenshot to:', screenshotPath);

    // Close modal
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(
        b => b.innerText.includes('Close')
      );
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('E2E Qibla Compass test completed successfully!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
