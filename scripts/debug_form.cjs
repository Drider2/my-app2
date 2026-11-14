const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  const pwd = await page.$('input[type="password"]');
  if (pwd) {
    await pwd.type('greendream2026');
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await new Promise(r => setTimeout(r, 2000));
  }

  // Click Money
  await page.evaluate(() => {
    const moneyBtn = Array.from(document.querySelectorAll('header button, nav button')).find(b => b.innerText && b.innerText.trim() === 'Money');
    if (moneyBtn) moneyBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Open modal
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="Recurring Subscriptions & Bills"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click Add New
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Add First Subscription') || b.innerText.includes('Add New'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Click Netflix preset
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Netflix'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Check form inputs
  const formValues = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select')).map(i => ({
      type: i.type,
      value: i.value,
      placeholder: i.placeholder
    }));
    return inputs;
  });
  console.log('Form inputs:', formValues);

  // Submit form
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  const afterSubmit = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0.z-50');
    return {
      modalExists: !!modal,
      text: modal ? modal.innerText : 'NONE'
    };
  });
  console.log('After submit:', afterSubmit);

  await browser.close();
})();
