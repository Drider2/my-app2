const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Password gate
  const pwd = await page.$('input[type="password"]');
  if (pwd) {
    await pwd.type('greendream2026');
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await new Promise(r => setTimeout(r, 2000));
  }

  // Click Money in header
  const moneyBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('header button, nav button')).find(b => b.innerText && b.innerText.trim() === 'Money');
  });
  if (moneyBtn) await moneyBtn.click();
  await new Promise(r => setTimeout(r, 2000));

  // Open modal
  const openModalBtn = await page.evaluateHandle(() => {
    return document.querySelector('button[title="Recurring Subscriptions & Bills"]');
  });
  if (openModalBtn) await openModalBtn.click();
  await new Promise(r => setTimeout(r, 1000));

  // Click Add New
  const addBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText && (b.innerText.includes('Add First Subscription') || b.innerText.includes('Add New')));
  });
  if (addBtn) await addBtn.click();
  await new Promise(r => setTimeout(r, 800));

  // Click Netflix preset
  const netflixBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Netflix'));
  });
  if (netflixBtn) await netflixBtn.click();
  await new Promise(r => setTimeout(r, 800));

  // Click Save Subscription using Puppeteer native click
  const saveBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Save Subscription'));
  });
  if (saveBtn) await saveBtn.click();
  await new Promise(r => setTimeout(r, 2000));

  // Check saved rules
  const rules = await page.evaluate(() => {
    const raw = localStorage.getItem('greendream_v1_3_storage');
    if (raw) {
      return JSON.parse(raw).recurringRules;
    }
    return null;
  });

  console.log('Final saved recurringRules count:', rules ? rules.length : 0);
  console.log('Rules data:', JSON.stringify(rules, null, 2));

  await browser.close();
})();
