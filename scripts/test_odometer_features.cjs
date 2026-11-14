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

    // Navigate to Upkeep screen
    console.log('Navigating to Upkeep screen...');
    const upkeepClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const btn = btns.find(b => b.innerText && b.innerText.includes('Upkeep'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Upkeep button clicked:', upkeepClicked);
    await new Promise(r => setTimeout(r, 2000));

    // Verify Upkeep screen header
    const screenTitle = await page.evaluate(() => {
      return document.querySelector('h1')?.innerText;
    });
    console.log('Screen title:', screenTitle);

    // Find and click Update Odometer button
    console.log('Clicking Update Odometer button...');
    const opened = await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Update Car Odometer"]') ||
                  document.querySelector('button[aria-label="Update Odometer"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Odometer modal opened:', opened);
    await new Promise(r => setTimeout(r, 1000));

    // Capture screenshot of Odometer modal
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const screenshotPath = path.join(screenshotsDir, 'maintenance_odometer_modal.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved screenshot to:', screenshotPath);

    // Verify modal text
    const modalDetails = await page.evaluate(() => {
      const modal = document.querySelector('div[role="dialog"]');
      if (!modal) return null;
      return {
        title: modal.querySelector('h2')?.innerText,
        inputVal: modal.querySelector('input[type="number"]')?.value,
        nudges: Array.from(modal.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean)
      };
    });
    console.log('Modal details:', JSON.stringify(modalDetails, null, 2));

    // Click +500 km nudge
    const clickedNudge = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => b.innerText.trim() === '+500');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked +500 km button:', clickedNudge);
    await new Promise(r => setTimeout(r, 500));

    // Click Update Odometer submit
    const submitted = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(
        b => b.innerText.includes('Update Odometer')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Update Odometer submit button:', submitted);
    await new Promise(r => setTimeout(r, 1500));

    // Check storage state
    const resultState = await page.evaluate(() => {
      const raw = localStorage.getItem('greendream_v1_3_storage');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const carItem = parsed.maintenanceItems?.find(i => i.category === 'car_maintenance');
      return {
        carItemName: carItem?.name,
        odometer: carItem?.current_odometer_km,
        nextReminderKm: carItem?.next_reminder_mileage_km
      };
    });
    console.log('Verification result in storage:', JSON.stringify(resultState, null, 2));

    console.log('E2E Maintenance Odometer test completed successfully!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
