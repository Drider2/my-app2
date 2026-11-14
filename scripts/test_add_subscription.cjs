const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Password gate
  const pwd = await page.$('input[type="password"]');
  if (pwd) {
    await pwd.type('greendream2026');
    const submit = await page.$('button[type="submit"]');
    if (submit) await submit.click();
    await new Promise(r => setTimeout(r, 2000));
  }

  // Click Money in WebHeader
  await page.evaluate(() => {
    const moneyBtn = Array.from(document.querySelectorAll('header button, nav button')).find(b => b.innerText && b.innerText.trim() === 'Money');
    if (moneyBtn) moneyBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Open Recurring Subscriptions modal
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="Recurring Subscriptions & Bills"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click "Add First Subscription" or "Add New"
  await page.evaluate(() => {
    const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && (b.innerText.includes('Add First Subscription') || b.innerText.includes('Add New')));
    if (addBtn) addBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Click Netflix preset
  await page.evaluate(() => {
    const netflixBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Netflix'));
    if (netflixBtn) netflixBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Click "Save Subscription"
  await page.evaluate(() => {
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Save Subscription'));
    if (saveBtn) saveBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Take screenshot
  const screenshotPath = path.join(__dirname, '..', 'screenshots', 'recurring_subscription_added.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot to:', screenshotPath);

  // Check state
  const modalText = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0.z-50');
    return modal ? modal.innerText : 'MODAL CLOSED';
  });
  console.log('--- POST ADD MODAL CONTENTS ---');
  console.log(modalText);

  await browser.close();
})();
