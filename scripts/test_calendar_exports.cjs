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

    // Navigate to Calendar screen
    console.log('Navigating to Calendar screen...');
    const calClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const btn = btns.find(b => b.innerText && b.innerText.includes('Calendar'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Calendar button clicked:', calClicked);
    await new Promise(r => setTimeout(r, 2000));

    // Verify screen title
    const screenTitle = await page.evaluate(() => {
      return document.querySelector('h1')?.innerText;
    });
    console.log('Screen title:', screenTitle);

    // Verify buttons
    const exportBtns = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return {
        hasIcs: !!btns.find(b => b.title && b.title.includes('iCalendar')),
        hasCsv: !!btns.find(b => b.title && b.title.includes('Export Tasks'))
      };
    });
    console.log('Export buttons verification:', exportBtns);

    // Capture screenshot
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const screenshotPath = path.join(screenshotsDir, 'calendar_screen_exports.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved screenshot to:', screenshotPath);

    console.log('E2E Calendar Exports test completed successfully!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
