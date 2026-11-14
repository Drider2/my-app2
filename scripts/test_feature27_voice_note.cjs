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

    // Password
    const pwd = await page.$('input[type="password"]');
    if (pwd) {
      await pwd.type('greendream2026');
      const submit = await page.$('button[type="submit"]');
      if (submit) await submit.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    // Navigate to Journal tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const jBtn = btns.find(b => b.innerText && (b.innerText.trim() === 'Journal' || b.innerText.includes('Journal')));
      if (jBtn) jBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Unlock journal if locked
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const unlockBtn = btns.find(b => b.innerText && b.innerText.includes('Unlock Journal'));
      if (unlockBtn) unlockBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Look for Voice Note button
    await page.waitForSelector('button[aria-label="Quick Voice Note & Audio Dictation"]', { timeout: 5000 });
    await page.click('button[aria-label="Quick Voice Note & Audio Dictation"]');
    await new Promise(r => setTimeout(r, 800));

    // Confirm dialog is rendered
    const dialogPreview = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText : 'NO DIALOG';
    });
    console.log('Voice Note Dialog Status:', dialogPreview.slice(0, 150));

    // Type a memo in the modal
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.type('Reflecting on today: completed gym session with high focus, calibrated meal budget, and maintained great energy.');
    }

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/journal_audio_note_modal.png' });
    console.log('Successfully captured screenshots/journal_audio_note_modal.png!');

    // Click Save to Journal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.innerText && b.innerText.includes('Save to Journal'));
      if (saveBtn) saveBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Verify entry in journal
    const entriesText = await page.evaluate(() => {
      return document.body.innerText;
    });
    const savedFound = entriesText.includes('Voice Note') || entriesText.includes('Voice Memo');
    console.log('Voice Note saved in Journal:', savedFound ? 'YES' : 'PENDING');

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
