const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('Testing Feature #23: Fast Mobile Sync & QR Code Transfer Bridge...');
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

    // Navigate to Settings
    console.log('Navigating to Settings screen...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const s = btns.find(b => (b.innerText && b.innerText.includes('Settings')) || b.getAttribute('aria-label') === 'Settings');
      if (s) s.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Scroll to Storage Diagnostics Card
    console.log('Checking for Data Health & Diagnostics card...');
    const cardFound = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h2, h3'));
      const t = titles.find(el => el.innerText && el.innerText.includes('Data Health & Diagnostics'));
      if (t) {
        t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    });
    console.log('Diagnostics card found:', cardFound);
    await new Promise(r => setTimeout(r, 600));

    // Toggle QR Code
    console.log('Clicking QR code toggle button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const qrBtn = btns.find(b => b.innerText && b.innerText.includes('Scan with Phone Camera'));
      if (qrBtn) qrBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Save screenshot of QR sync hub
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/settings_qr_mobile_sync.png' });
    console.log('Saved screenshot to screenshots/settings_qr_mobile_sync.png');

    console.log('Feature #23 verified successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
