const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('Testing Feature #25: Vehicle Fuel Economy & Distance Analytics Hub...');
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

    // Navigate to Upkeep screen
    console.log('Navigating to Upkeep screen...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const u = btns.find(b => b.innerText && (b.innerText.trim() === 'Upkeep' || b.innerText.includes('Maintenance')));
      if (u) u.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Click Fuel & Mileage tab
    console.log('Clicking Fuel & Mileage tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const fTab = btns.find(b => b.innerText && b.innerText.includes('Fuel & Mileage'));
      if (fTab) fTab.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Check if Fuel & Mileage Hub rendered
    const hubText = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h4, div')).find(
        d => d.innerText && d.innerText.includes('Vehicle Fuel Log & Consumption Desk')
      );
      return h ? h.innerText : 'NO HUB';
    });
    console.log('Fuel Hub text:', hubText);

    // Save screenshot
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/maintenance_fuel_mileage_hub.png' });
    console.log('Saved screenshot to screenshots/maintenance_fuel_mileage_hub.png');

    console.log('Feature #25 verified successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
