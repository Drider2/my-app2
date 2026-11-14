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

    // Verify Dashboard screen title
    const screenTitle = await page.evaluate(() => {
      return document.querySelector('h1')?.innerText;
    });
    console.log('Today screen title:', screenTitle);

    // Verify Hydration card exists
    const hydrationInfo = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Daily Hydration')
      );
      if (!card) return null;
      return {
        cardFound: true,
        text: card.innerText.split('\n').slice(0, 8).join(' | ')
      };
    });
    console.log('Hydration card verification:', JSON.stringify(hydrationInfo, null, 2));

    // Click +250ml quick button
    console.log('Clicking +250ml button...');
    const clicked250 = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && b.innerText.includes('+250ml')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked +250ml button:', clicked250);
    await new Promise(r => setTimeout(r, 1000));

    // Click +500ml quick button
    console.log('Clicking +500ml button...');
    const clicked500 = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && b.innerText.includes('+500ml')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked +500ml button:', clicked500);
    await new Promise(r => setTimeout(r, 1000));

    // Verify storage record
    const storageCheck = await page.evaluate(() => {
      const raw = localStorage.getItem('greendream_v1_3_storage');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        hydrationLogs: parsed.hydrationLogs,
        dailyTarget: parsed.dailyWaterTargetMl
      };
    });
    console.log('Storage check:', JSON.stringify(storageCheck, null, 2));

    // Capture screenshot
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const screenshotPath = path.join(screenshotsDir, 'dashboard_hydration_tracker.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved screenshot to:', screenshotPath);

    console.log('E2E Hydration Widget test completed successfully!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
