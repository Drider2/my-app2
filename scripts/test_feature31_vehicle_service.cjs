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

    // Navigate to Maintenance: Click either top/bottom nav "Upkeep" or the card "Maintenance"
    const clickedNav = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const upkeepNav = btns.find(b => b.innerText && b.innerText.trim() === 'Upkeep');
      if (upkeepNav) {
        upkeepNav.click();
        return 'Clicked Upkeep nav';
      }
      const maintCard = btns.find(b => b.innerText && b.innerText.includes('Vehicle maintenance'));
      if (maintCard) {
        maintCard.click();
        return 'Clicked Maintenance card';
      }
      return 'Neither found';
    });
    console.log('Nav result:', clickedNav);
    await new Promise(r => setTimeout(r, 1200));

    // Check what's on the screen
    const screenInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.innerText;
      const h2 = document.querySelector('h2')?.innerText;
      const btns = Array.from(document.querySelectorAll('button')).map(b => b.getAttribute('aria-label') || b.innerText.trim()).filter(Boolean);
      return { h1, h2, btns: btns.slice(0, 20) };
    });
    console.log('Current screen info:', JSON.stringify(screenInfo));

    // Look for Vehicle Service button in header
    await page.waitForSelector('button[aria-label="Vehicle Service"]', { timeout: 5000 });
    await page.click('button[aria-label="Vehicle Service"]');
    await new Promise(r => setTimeout(r, 800));

    // Confirm dialog is rendered
    const dialogPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Vehicle Service Dialog Status:', dialogPreview.slice(0, 150));

    // Click first preset button to populate form
    const presetClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const presetBtn = btns.find(b => b.innerText && b.innerText.includes('Engine Oil'));
      if (presetBtn) {
        presetBtn.click();
        return 'Clicked Engine Oil preset';
      }
      return 'Engine Oil preset button not found';
    });
    console.log('Preset action:', presetClicked);
    await new Promise(r => setTimeout(r, 600));

    // Click "Log Service & Sync Odometer" submit button inside form
    const submitted = await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn && submitBtn.innerText.includes('Log Service')) {
        submitBtn.click();
        return 'Clicked Log Service submit button';
      }
      return 'Submit button not found';
    });
    console.log('Submit action:', submitted);
    await new Promise(r => setTimeout(r, 1000));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/maintenance_vehicle_service_modal.png' });
    console.log('Successfully captured screenshots/maintenance_vehicle_service_modal.png!');

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
