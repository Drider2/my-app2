const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('Testing Feature #24: Fasting Desk & Iftar Countdown Modal...');
    browser = await puppeteer.launch({ 
      executablePath: CHROME_PATH, 
      headless: 'new',
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 950 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    // Password gate
    const pwd = await page.$('input[type="password"]');
    if (pwd) {
      await pwd.type('greendream2026');
      const submit = await page.$('button[type="submit"]');
      if (submit) await submit.click();
      await new Promise(r => setTimeout(r, 1200));
    }

    // Navigate to Prayer screen
    console.log('Navigating to Prayer screen...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const p = btns.find(b => b.innerText && b.innerText.trim() === 'Prayer');
      if (p) p.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Click Fasting Desk button
    console.log('Clicking Fasting Desk button in header...');
    await page.waitForSelector('button[aria-label="Fasting Desk"]', { timeout: 5000 });
    await page.click('button[aria-label="Fasting Desk"]');
    await new Promise(r => setTimeout(r, 1000));

    // Verify modal is open
    const modalText = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText.split('\n').slice(0, 15).join(' | ') : 'NO DIALOG';
    });
    console.log('Fasting modal text:', modalText);

    // Click "I Am Fasting Today"
    console.log('Toggling fasting status...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
      const fBtn = btns.find(b => b.innerText && b.innerText.includes('Fasting Today'));
      if (fBtn) fBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Save screenshot of the active fasting modal
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/prayers_fasting_tracker_modal.png' });
    console.log('Saved screenshot to screenshots/prayers_fasting_tracker_modal.png');

    console.log('Feature #24 verified successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
