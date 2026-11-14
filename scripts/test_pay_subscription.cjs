const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });
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
  let openModalBtn = await page.evaluateHandle(() => {
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

  // Click Save Subscription
  const saveBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Save Subscription'));
  });
  if (saveBtn) await saveBtn.click();
  await new Promise(r => setTimeout(r, 2000));

  // Re-open modal
  openModalBtn = await page.evaluateHandle(() => {
    return document.querySelector('button[title="Recurring Subscriptions & Bills"]');
  });
  if (openModalBtn) await openModalBtn.click();
  await new Promise(r => setTimeout(r, 1000));

  // Click Pay button
  console.log('Clicking Pay button for Netflix...');
  const payBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Pay');
  });
  if (payBtn) await payBtn.click();
  await new Promise(r => setTimeout(r, 2000));

  // Re-open modal to inspect updated due date
  openModalBtn = await page.evaluateHandle(() => {
    return document.querySelector('button[title="Recurring Subscriptions & Bills"]');
  });
  if (openModalBtn) await openModalBtn.click();
  await new Promise(r => setTimeout(r, 1000));

  const afterPayText = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0.z-50');
    return modal ? modal.innerText : 'MODAL NOT FOUND';
  });
  console.log('--- MODAL LIVE PREVIEW AFTER PAY ---');
  console.log(afterPayText);

  // Check transactions ledger in localStorage
  const txCheck = await page.evaluate(() => {
    const raw = localStorage.getItem('greendream_v1_3_storage');
    if (raw) {
      const data = JSON.parse(raw);
      return {
        firstTx: data.transactions[0],
        ruleNextDate: data.recurringRules[0]?.next_date
      };
    }
    return null;
  });
  console.log('--- STORAGE VERIFICATION ---');
  console.log(JSON.stringify(txCheck, null, 2));

  await browser.close();
})();
