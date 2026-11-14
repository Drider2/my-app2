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

    // Navigate to Gym/Body tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gymBtn = btns.find(b => b.innerText && (b.innerText.trim() === 'Body' || b.innerText.trim() === 'Gym'));
      if (gymBtn) gymBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Look for Volume Radar button
    await page.waitForSelector('button[aria-label="Muscle Volume Radar"]', { timeout: 5000 });
    await page.click('button[aria-label="Muscle Volume Radar"]');
    await new Promise(r => setTimeout(r, 1000));

    // Confirm dialog is rendered
    const dialogTitle = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Dialog Content Preview:', dialogTitle.slice(0, 150));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/gym_muscle_volume_modal.png' });
    console.log('Successfully captured screenshots/gym_muscle_volume_modal.png!');

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
