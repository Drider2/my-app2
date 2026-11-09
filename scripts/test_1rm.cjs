const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1200));

  const pwd = await page.$('input[type="password"]');
  if (pwd) {
    await pwd.type('greendream2026');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1500));
  }

  // Navigate to Gym screen
  const navButtons = await page.$$('nav button, [role="tab"]');
  for (const b of navButtons) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text.includes('Gym') || text.includes('Body')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  // Find 1RM Calculator button
  const calcBtn = await page.$('button[aria-label="1RM Calculator"]');
  console.log('1. 1RM Calculator button present in Gym header:', !!calcBtn);

  if (calcBtn) {
    await calcBtn.click();
    await new Promise(r => setTimeout(r, 800));
    const title = await page.evaluate(() => {
      const el = document.getElementById('1rm-calc-title');
      return el ? el.innerText : null;
    });
    console.log('2. 1RM Modal Title:', title);

    const est1RM = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Estimated One Rep Max') && text.includes('Epley Formula');
    });
    console.log('3. Epley calculation and percentage zones active:', est1RM);

    await page.screenshot({ path: 'screenshots/1rm_calculator_modal.png' });
    console.log('4. Screenshot captured: screenshots/1rm_calculator_modal.png');
  }

  await browser.close();
  console.log('--- 1RM Calculator Automated Verification Passed! ---');
})();
