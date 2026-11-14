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

    // Password login if present
    const pwd = await page.$('input[type="password"]');
    if (pwd) {
      await pwd.type('greendream2026');
      const submit = await page.$('button[type="submit"]');
      if (submit) await submit.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    // Navigate to Prayer screen
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const prayerBtn = btns.find(b => b.innerText && (b.innerText.trim() === 'Prayer' || b.innerText.includes('Prayer')));
      if (prayerBtn) prayerBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Look for Fasting Desk button in header
    await page.waitForSelector('button[aria-label="Fasting Desk"]', { timeout: 5000 });
    await page.click('button[aria-label="Fasting Desk"]');
    await new Promise(r => setTimeout(r, 1000));

    // Confirm dialog is rendered
    const dialogPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Fasting Dialog Status:', dialogPreview.slice(0, 150));

    // Click "Intermittent Fasting & Stages" tab
    const tabClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ifTab = btns.find(b => b.innerText && b.innerText.includes('Intermittent Fasting'));
      if (ifTab) {
        ifTab.click();
        return 'Clicked Intermittent Fasting tab';
      }
      return 'Tab not found';
    });
    console.log('Tab switcher:', tabClicked);
    await new Promise(r => setTimeout(r, 800));

    // Click "Start Fast" on 16:8 LeanGains preset
    const fastStarted = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.innerText && b.innerText.includes('Start Fast'));
      if (startBtn) {
        startBtn.click();
        return 'Clicked Start Fast button';
      }
      return 'Start Fast button not found';
    });
    console.log('Fast started action:', fastStarted);
    await new Promise(r => setTimeout(r, 1000));

    // Check dialog content after start
    const postStartPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Post-start preview snippet:', postStartPreview.slice(0, 200));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/prayers_fasting_intermittent_modal.png' });
    console.log('Successfully captured screenshots/prayers_fasting_intermittent_modal.png!');

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
