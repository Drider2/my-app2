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

    // Navigate to Body screen
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('header button, nav button')).find(b => b.innerText && b.innerText.trim() === 'Body');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Open Rest Timer modal
    const opened = await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Rest Interval Timer"]') ||
                  document.querySelector('button[aria-label="Rest Timer"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Rest Timer modal opened:', opened);
    await new Promise(r => setTimeout(r, 1000));

    // Inspect modal elements
    const modalDetails = await page.evaluate(() => {
      const title = document.querySelector('h2, h3')?.innerText;
      const buttons = Array.from(document.querySelectorAll('div[role="dialog"] button, .fixed button')).map(b => b.innerText.trim());
      const timerDisplay = document.querySelector('.font-mono')?.innerText;
      return { title, buttons, timerDisplay };
    });
    console.log('Modal details:', JSON.stringify(modalDetails, null, 2));

    // Click 60s preset
    const clicked60 = await page.evaluate(() => {
      const b60 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '60s');
      if (b60) {
        b60.click();
        return true;
      }
      return false;
    });
    console.log('Clicked 60s preset:', clicked60);
    await new Promise(r => setTimeout(r, 500));

    // Click Start
    const started = await page.evaluate(() => {
      const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start'));
      if (startBtn) {
        startBtn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Start button:', started);

    // Wait 2 seconds for timer to count down
    await new Promise(r => setTimeout(r, 2200));

    const countdownTime = await page.evaluate(() => {
      return document.querySelector('.font-mono')?.innerText;
    });
    console.log('Countdown time after 2s:', countdownTime);

    // Capture screenshot of running timer
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const screenshotPath = path.join(screenshotsDir, 'gym_rest_timer_running.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved running timer screenshot to:', screenshotPath);

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"]') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Done'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Rest Timer test completed successfully!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
