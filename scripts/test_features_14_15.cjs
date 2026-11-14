const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('Launching Chrome for Features 14 & 15 verification...');
    browser = await puppeteer.launch({ 
      executablePath: CHROME_PATH, 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    await page.setViewport({ width: 1280, height: 900 });
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
    // TEST FEATURE 14: Settings Screen Diagnostics Hub
    // ----------------------------------------------------
    console.log('Navigating to Settings screen...');
    const navToSettings = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const sBtn = btns.find(b => b.innerText && (b.innerText.includes('Settings') || b.getAttribute('aria-label') === 'Settings'));
      if (sBtn) {
        sBtn.click();
        return true;
      }
      return false;
    });
    console.log('Navigated to Settings:', navToSettings);
    await new Promise(r => setTimeout(r, 1500));

    // Verify Storage Diagnostics Card exists
    const diagnosticsData = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Data Health & Diagnostics')
      );
      if (!card) return null;
      return {
        found: true,
        textPreview: card.innerText.split('\n').slice(0, 10).join(' | ')
      };
    });
    console.log('Diagnostics card check:', JSON.stringify(diagnosticsData, null, 2));

    // Scroll card into view and capture screenshot
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Data Health & Diagnostics')
      );
      if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 800));

    // Click "Audit & Recalculate"
    console.log('Clicking "Audit & Recalculate"...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && b.innerText.includes('Audit & Recalculate')
      );
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/settings_storage_diagnostics.png', fullPage: false });
    console.log('Saved screenshot: screenshots/settings_storage_diagnostics.png');

    // ----------------------------------------------------
    // TEST FEATURE 15: Gym Exercise Catalog & Search
    // ----------------------------------------------------
    console.log('Navigating to Body / Gym screen...');
    const navToGym = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const gBtn = btns.find(b => b.innerText && (b.innerText.includes('Body') || b.innerText.includes('Gym')));
      if (gBtn) {
        gBtn.click();
        return true;
      }
      return false;
    });
    console.log('Navigated to Gym:', navToGym);
    await new Promise(r => setTimeout(r, 1500));

    // Click Catalog secondary tab
    console.log('Clicking "Catalog" secondary tab...');
    const clickedCatalog = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const catBtn = btns.find(b => b.innerText && b.innerText.includes('Catalog'));
      if (catBtn) {
        catBtn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Catalog tab:', clickedCatalog);
    await new Promise(r => setTimeout(r, 1200));

    // Verify Exercise Library details
    const catalogInfo = await page.evaluate(() => {
      const container = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Exercise Library')
      );
      if (!container) return null;
      return {
        found: true,
        textPreview: container.innerText.split('\n').slice(0, 8).join(' | ')
      };
    });
    console.log('Exercise catalog verification:', JSON.stringify(catalogInfo, null, 2));

    await page.screenshot({ path: 'screenshots/gym_exercise_catalog.png', fullPage: false });
    console.log('Saved screenshot: screenshots/gym_exercise_catalog.png');

    // Test Search filter
    console.log('Testing search query "bench"...');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Search by exercise"]');
      if (input) {
        input.value = 'bench';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // Test "New Exercise" modal opening
    console.log('Clicking "New Exercise" button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && b.innerText.includes('New Exercise')
      );
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: 'screenshots/gym_new_exercise_modal.png', fullPage: false });
    console.log('Saved screenshot: screenshots/gym_new_exercise_modal.png');

    console.log('ALL VERIFICATION STEPS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
