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
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

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

    // Go to Finance
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const f = btns.find(b => b.innerText && b.innerText.includes('Finance'));
      if (f) f.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // List all buttons in the header
    const headerBtns = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map(b => ({
        label: b.getAttribute('aria-label'),
        title: b.getAttribute('title'),
        text: b.innerText
      })).filter(b => b.label || b.title);
    });
    console.log('Header buttons found:', JSON.stringify(headerBtns, null, 2));

    // Click specifically the shopping cart button
    const clickSuccess = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Shopping & Grocery List"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked shopping button:', clickSuccess);
    await new Promise(r => setTimeout(r, 1500));

    // Check if modal dialog appeared
    const dialogs = await page.evaluate(() => {
      const roles = Array.from(document.querySelectorAll('[role="dialog"]'));
      return roles.map(r => r.innerText.slice(0, 100));
    });
    console.log('Dialogs in DOM:', dialogs);

    await page.screenshot({ path: 'screenshots/finance_shopping_debug.png' });
    console.log('Screenshot saved to screenshots/finance_shopping_debug.png');

  } catch (err) {
    console.error('Debug error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
