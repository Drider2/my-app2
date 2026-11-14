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

    await page.setViewport({ width: 1280, height: 950 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    // Password login if present
    const pwd = await page.$('input[type="password"]');
    if (pwd) {
      await pwd.type('greendream2026');
      const submit = await page.$('button[type="submit"]');
      if (submit) await submit.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    // Navigate to Money screen
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const moneyBtn = btns.find(b => b.innerText && (b.innerText.trim() === 'Money' || b.innerText.includes('Money')));
      if (moneyBtn) moneyBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Look for Net Worth & Runway Desk button in header
    await page.waitForSelector('button[aria-label="Net Worth & Runway Desk"]', { timeout: 5000 });
    await page.click('button[aria-label="Net Worth & Runway Desk"]');
    await new Promise(r => setTimeout(r, 1000));

    // Confirm dialog is rendered
    const dialogPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Net Worth Dialog Status:', dialogPreview.slice(0, 160));

    // Switch to "Balance Sheet (Assets & Debts)" tab
    const tabClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const bsTab = btns.find(b => b.innerText && b.innerText.includes('Balance Sheet'));
      if (bsTab) {
        bsTab.click();
        return 'Clicked Balance Sheet tab';
      }
      return 'Tab not found';
    });
    console.log('Tab switch result:', tabClicked);
    await new Promise(r => setTimeout(r, 800));

    // Fill in Asset form
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('Asset name'));
      const valInput = inputs.find(i => i.placeholder && i.placeholder.includes('Value in DA'));
      if (nameInput) {
        nameInput.value = 'Gold Sovereign Bullion';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (valInput) {
        valInput.value = '185000';
        valInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Click "Add Asset" button
    const assetAdded = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find(b => b.innerText && b.innerText.trim() === 'Add Asset');
      if (addBtn) {
        addBtn.click();
        return 'Clicked Add Asset button';
      }
      return 'Add Asset button not found';
    });
    console.log('Asset add action:', assetAdded);
    await new Promise(r => setTimeout(r, 1000));

    // Check dialog content after adding asset
    const postAddPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Post-add snippet:', postAddPreview.slice(0, 200));

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/finance_net_worth_modal.png' });
    console.log('Successfully captured screenshots/finance_net_worth_modal.png!');

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
