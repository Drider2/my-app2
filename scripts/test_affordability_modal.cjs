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

    // Navigate to Money screen
    console.log('Navigating to Money screen...');
    const moneyClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const btn = btns.find(b => b.innerText && b.innerText.includes('Money'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Money button clicked:', moneyClicked);
    await new Promise(r => setTimeout(r, 2000));

    // Click Affordability Simulator button
    console.log('Clicking Affordability Simulator button...');
    const opened = await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Afford It"]') ||
                  document.querySelector('button[aria-label="Affordability Simulator"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Affordability modal opened:', opened);
    await new Promise(r => setTimeout(r, 1000));

    // Verify modal contents
    const modalDetails = await page.evaluate(() => {
      const modal = document.querySelector('div[role="dialog"]');
      if (!modal) return null;
      return {
        title: modal.querySelector('h2')?.innerText,
        priceInput: modal.querySelector('input[type="number"]')?.value,
        verdictText: modal.innerText.includes('Comfortable') || modal.innerText.includes('Caution') || modal.innerText.includes('Not Recommended')
      };
    });
    console.log('Modal details:', JSON.stringify(modalDetails, null, 2));

    // Click +5k nudge button
    const clickedNudge = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(
        b => b.innerText.trim() === '+5k'
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked +5k button:', clickedNudge);
    await new Promise(r => setTimeout(r, 500));

    // Capture screenshot
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const screenshotPath = path.join(screenshotsDir, 'finance_affordability_simulator.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved screenshot to:', screenshotPath);

    // Close modal
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(
        b => b.innerText.includes('Done') || b.getAttribute('aria-label') === 'Close'
      );
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('E2E Affordability Simulator test completed successfully!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
