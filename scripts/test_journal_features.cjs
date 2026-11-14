const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
    const page = await browser.newPage();
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

    // Click Journal in WebHeader
    console.log('Navigating to Journal screen...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('header button, nav button')).find(b => b.innerText && b.innerText.trim() === 'Journal');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Unlock if protected
    await page.evaluate(() => {
      const unlock = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Unlock Journal'));
      if (unlock) unlock.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Click "Write New Reflection"
    await page.evaluate(() => {
      const write = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Write New Reflection'));
      if (write) write.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Capture screenshot
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

    const screenshotPath = path.join(screenshotsDir, 'journal_write_form_with_prompts.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved screenshot to:', screenshotPath);

    // Verify text
    const check = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasExportMD: text.includes('Export') && text.includes('.MD'),
        hasMoodFilter: text.includes('Mood:') && text.includes('5 ★'),
        hasQuickStarters: text.includes('Quick Starters') && text.includes('Grateful for')
      };
    });

    console.log('Journal verification check:', check);
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
