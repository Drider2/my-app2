const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
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

  // Find all buttons containing text 'Body'
  const bodyButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map((b, i) => ({
      index: i,
      text: b.innerText.trim(),
      html: b.outerHTML.slice(0, 100)
    })).filter(b => b.text.includes('Body'));
  });

  console.log('Body buttons found:', JSON.stringify(bodyButtons, null, 2));

  // Click the first one
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const bodyBtn = btns.find(b => b.innerText.trim() === 'Body');
    if (bodyBtn) {
      bodyBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Body button:', clicked);

  await new Promise(r => setTimeout(r, 2000));

  // Check what screen is active
  const screenInfo = await page.evaluate(() => {
    return {
      title: document.title,
      h1: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim()),
      allButtons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean)
    };
  });

  console.log('Screen info after click:', JSON.stringify(screenInfo, null, 2));

  await browser.close();
})();
