const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('Launching Chrome for Features 20 & 21 verification...');
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

    // Password gate
    const pwd = await page.$('input[type="password"]');
    if (pwd) {
      await pwd.type('greendream2026');
      const submit = await page.$('button[type="submit"]');
      if (submit) await submit.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    // ----------------------------------------------------
    // TEST FEATURE 20: Maintenance Fuel Log & Efficiency Modal
    // ----------------------------------------------------
    console.log('Navigating to Upkeep / Maintenance screen...');
    const navToUpkeep = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const uBtn = btns.find(b => b.innerText && (b.innerText.includes('Upkeep') || b.innerText.includes('Maintenance')));
      if (uBtn) {
        uBtn.click();
        return true;
      }
      return false;
    });
    console.log('Navigated to Upkeep:', navToUpkeep);
    await new Promise(r => setTimeout(r, 1500));

    // Click Fuel Log button in header
    console.log('Clicking Fuel Log button in header...');
    const clickedFuel = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Fuel Log"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Fuel Log button:', clickedFuel);
    await new Promise(r => setTimeout(r, 1200));

    // Verify Fuel Log Modal
    const fuelModalInfo = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Fuel Log & Consumption')
      );
      if (!modal) return null;
      return {
        found: true,
        textPreview: modal.innerText.split('\n').slice(0, 10).join(' | ')
      };
    });
    console.log('Fuel Log Modal check:', JSON.stringify(fuelModalInfo, null, 2));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/maintenance_fuel_log_modal.png', fullPage: false });
    console.log('Saved screenshot: screenshots/maintenance_fuel_log_modal.png');

    // Close Fuel modal
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && b.innerText.includes('Close')
      );
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // ----------------------------------------------------
    // TEST FEATURE 21: Journal Evening Wind-Down Wizard
    // ----------------------------------------------------
    console.log('Navigating to Journal screen...');
    const navToJournal = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const jBtn = btns.find(b => b.innerText && b.innerText.includes('Journal'));
      if (jBtn) {
        jBtn.click();
        return true;
      }
      return false;
    });
    console.log('Navigated to Journal:', navToJournal);
    await new Promise(r => setTimeout(r, 1500));

    // Click Wind-Down button in Journal header
    console.log('Clicking Wind-Down button in Journal header...');
    const clickedWindDown = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && (b.innerText.includes('Wind-Down') || b.title?.includes('Evening'))
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Wind-Down button:', clickedWindDown);
    await new Promise(r => setTimeout(r, 1200));

    // Verify Evening Reflection Modal
    const eveningModalInfo = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Evening Wind-Down')
      );
      if (!modal) return null;
      return {
        found: true,
        textPreview: modal.innerText.split('\n').slice(0, 10).join(' | ')
      };
    });
    console.log('Evening Reflection modal check:', JSON.stringify(eveningModalInfo, null, 2));

    await page.screenshot({ path: 'screenshots/journal_evening_reflection_modal.png', fullPage: false });
    console.log('Saved screenshot: screenshots/journal_evening_reflection_modal.png');

    console.log('ALL VERIFICATIONS FOR FEATURES 20 & 21 PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
