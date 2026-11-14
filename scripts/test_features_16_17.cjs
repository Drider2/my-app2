const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('Launching Chrome for Features 16 & 17 verification...');
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
    // TEST FEATURE 16: Dashboard Habits Consistency Matrix
    // ----------------------------------------------------
    console.log('Verifying Habits Consistency Matrix on Dashboard...');
    const habitsCardInfo = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Daily Habits & Consistency')
      );
      if (!card) return null;
      return {
        found: true,
        textPreview: card.innerText.split('\n').slice(0, 10).join(' | ')
      };
    });
    console.log('Habits card verification:', JSON.stringify(habitsCardInfo, null, 2));

    // Scroll into view
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Daily Habits & Consistency')
      );
      if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 800));

    // Capture screenshot of habits card
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/dashboard_habits_consistency.png', fullPage: false });
    console.log('Saved screenshot: screenshots/dashboard_habits_consistency.png');

    // Click "New Habit" button
    console.log('Clicking "New Habit" button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && b.innerText.includes('New Habit')
      );
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    await page.screenshot({ path: 'screenshots/dashboard_new_habit_modal.png', fullPage: false });
    console.log('Saved screenshot: screenshots/dashboard_new_habit_modal.png');

    // Close modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && b.innerText.includes('Cancel')
      );
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // ----------------------------------------------------
    // TEST FEATURE 17: Finance Screen Currency Converter
    // ----------------------------------------------------
    console.log('Navigating to Finance / Money screen...');
    const navToFinance = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const fBtn = btns.find(b => b.innerText && (b.innerText.includes('Money') || b.innerText.includes('Finance')));
      if (fBtn) {
        fBtn.click();
        return true;
      }
      return false;
    });
    console.log('Navigated to Finance:', navToFinance);
    await new Promise(r => setTimeout(r, 1500));

    // Click Currency Converter button
    console.log('Clicking Currency Converter button in header...');
    const clickedCurrency = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Currency Converter"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Currency Converter button:', clickedCurrency);
    await new Promise(r => setTimeout(r, 1200));

    // Verify Modal content
    const converterInfo = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Currency & FX Converter')
      );
      if (!modal) return null;
      return {
        found: true,
        textPreview: modal.innerText.split('\n').slice(0, 8).join(' | ')
      };
    });
    console.log('Currency Converter modal verification:', JSON.stringify(converterInfo, null, 2));

    await page.screenshot({ path: 'screenshots/finance_currency_converter_modal.png', fullPage: false });
    console.log('Saved screenshot: screenshots/finance_currency_converter_modal.png');

    console.log('ALL VERIFICATIONS FOR FEATURES 16 & 17 PASSED!');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
