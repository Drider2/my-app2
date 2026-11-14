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

    // Navigate to Body / Gym screen
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gymBtn = btns.find(b => b.innerText && (b.innerText.trim() === 'Body' || b.innerText.includes('Body')));
      if (gymBtn) gymBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Look for Macro & TDEE Desk button in header
    await page.waitForSelector('button[aria-label="Macro & TDEE Desk"]', { timeout: 5000 });
    await page.click('button[aria-label="Macro & TDEE Desk"]');
    await new Promise(r => setTimeout(r, 1000));

    // Confirm dialog is rendered
    const dialogPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Macro Desk Dialog Status:', dialogPreview.slice(0, 160));

    // Click "Aggressive Cut" goal button
    const goalClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cutBtn = btns.find(b => b.innerText && b.innerText.includes('Aggressive Cut'));
      if (cutBtn) {
        cutBtn.click();
        return 'Clicked Aggressive Cut goal';
      }
      return 'Cut button not found';
    });
    console.log('Goal selector action:', goalClicked);
    await new Promise(r => setTimeout(r, 800));

    // Check dialog content after selection
    const postGoalPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Post-goal snippet:', postGoalPreview.slice(0, 200));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/gym_macro_tdee_modal.png' });
    console.log('Successfully captured screenshots/gym_macro_tdee_modal.png!');

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
