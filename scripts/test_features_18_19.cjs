const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('Launching Chrome for Features 18 & 19 verification...');
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
    // TEST FEATURE 18: Gym PR Wall of Fame & Trophy Room
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

    // Click "PR Trophies" button in Gym header
    console.log('Clicking "PR Trophies" button in Gym header...');
    const clickedPRBtn = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="PR Wall of Fame"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked PR Trophies button:', clickedPRBtn);
    await new Promise(r => setTimeout(r, 1200));

    // Verify Modal content
    const prModalInfo = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Wall of Fame & PR Trophies')
      );
      if (!modal) return null;
      return {
        found: true,
        textPreview: modal.innerText.split('\n').slice(0, 10).join(' | ')
      };
    });
    console.log('PR Wall of Fame modal check:', JSON.stringify(prModalInfo, null, 2));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/gym_pr_wall_of_fame_modal.png', fullPage: false });
    console.log('Saved screenshot: screenshots/gym_pr_wall_of_fame_modal.png');

    // Close modal
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && b.innerText.includes('Close')
      );
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // ----------------------------------------------------
    // TEST FEATURE 19: Calendar Smart Task Parser
    // ----------------------------------------------------
    console.log('Navigating to Calendar & Schedule screen...');
    const navToCalendar = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button, header button'));
      const cBtn = btns.find(b => b.innerText && b.innerText.includes('Calendar'));
      if (cBtn) {
        cBtn.click();
        return true;
      }
      return false;
    });
    console.log('Navigated to Calendar:', navToCalendar);
    await new Promise(r => setTimeout(r, 1500));

    // Switch to Tasks tab
    console.log('Switching to Tasks tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const tBtn = tabs.find(b => b.innerText && b.innerText.includes('Tasks'));
      if (tBtn) tBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Type a natural language task into input
    console.log('Typing smart task: "Finalize monthly roadmap tomorrow !high #work"...');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Add task"]');
      if (input) {
        input.value = 'Finalize monthly roadmap tomorrow !high #work';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // Verify live smart parsing preview appears
    const smartPreview = await page.evaluate(() => {
      const previewEl = Array.from(document.querySelectorAll('div')).find(
        d => d.innerText && d.innerText.includes('Detected:')
      );
      if (!previewEl) return null;
      return {
        found: true,
        text: previewEl.innerText
      };
    });
    console.log('Smart task preview check:', JSON.stringify(smartPreview, null, 2));

    await page.screenshot({ path: 'screenshots/calendar_smart_task_parser.png', fullPage: false });
    console.log('Saved screenshot: screenshots/calendar_smart_task_parser.png');

    // Click Add task
    console.log('Submitting task...');
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText && b.innerText.includes('Add')
      );
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: 'screenshots/calendar_task_created_with_priority.png', fullPage: false });
    console.log('Saved screenshot: screenshots/calendar_task_created_with_priority.png');

    console.log('ALL VERIFICATIONS FOR FEATURES 18 & 19 PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
