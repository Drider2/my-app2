const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Password gate
  const pwd = await page.$('input[type="password"]');
  if (pwd) {
    await pwd.type('greendream2026');
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await new Promise(r => setTimeout(r, 1500));
  }

  // Navigate to Calendar
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button, header button'));
    const cBtn = btns.find(b => b.innerText && b.innerText.includes('Calendar'));
    if (cBtn) cBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Click Tasks tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const tBtn = tabs.find(b => b.innerText && b.innerText.includes('Tasks'));
    if (tBtn) tBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Type with real keyboard
  const input = await page.$('input[placeholder*="Add task"]');
  if (input) {
    await input.type('Complete quarterly financial review tomorrow !high #work');
    await new Promise(r => setTimeout(r, 600));

    const detected = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('Detected:'));
      return el ? el.innerText : null;
    });
    console.log('Detected live smart preview:', detected);

    await page.screenshot({ path: 'screenshots/calendar_smart_task_parser.png' });
    console.log('Saved realistic live parse screenshot: screenshots/calendar_smart_task_parser.png');
  }

  await browser.close();
})();
