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

  // Click Recurring Subscriptions & Bills button
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="Recurring Subscriptions & Bills"]');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  const modalText = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0.z-50');
    return modal ? modal.innerText : 'MODAL NOT FOUND';
  });

  console.log('--- MODAL CONTENTS ---');
  console.log(modalText);

  await browser.close();
})();
