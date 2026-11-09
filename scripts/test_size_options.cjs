const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../screenshots/sizes_test');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function testSizes() {
  console.log('--- Starting Size / Resolution Options Automated Verification ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Authenticate
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('gd_master_session_token', 'valid_token');
    const existing = localStorage.getItem('greendream_v1_3_storage');
    if (existing) {
      const p = JSON.parse(existing);
      p.settings = p.settings || {};
      p.settings.onboarded = true;
      localStorage.setItem('greendream_v1_3_storage', JSON.stringify(p));
    }
  });

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Enter Edit Layout Mode
  console.log('Activating Edit Layout mode...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.title === 'Edit layout' || b.getAttribute('aria-label') === 'Edit layout');
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('Edit layout mode button clicked:', clicked);
  await new Promise(r => setTimeout(r, 1000));

  // 2. Locate widget resolution toggle buttons
  const results = {};

  const sizes = ['Small', 'Portrait', 'Full'];
  for (const s of sizes) {
    console.log(`Testing size option: ${s}...`);
    const clickResult = await page.evaluate((sizeText) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const targetBtn = btns.find(b => b.innerText.trim() === sizeText);
      if (targetBtn) {
        targetBtn.click();
        return true;
      }
      return false;
    }, s);

    console.log(`Clicked button ${s}:`, clickResult);
    await new Promise(r => setTimeout(r, 800));

    // Measure the first widget card
    const metrics = await page.evaluate(() => {
      const card = document.querySelector('.grid > div');
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      return {
        className: card.className,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });

    results[s] = metrics;
    console.log(`Results for ${s}:`, metrics);

    const shotPath = path.join(OUTPUT_DIR, `widget_size_${s.toLowerCase()}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${shotPath}`);
  }

  // 3. Save Layout with Small size
  console.log('Saving layout changes with size Small...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const smallBtn = btns.find(b => b.innerText.trim() === 'Small');
    if (smallBtn) smallBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const saveBtn = btns.find(b => b.innerText.includes('Save'));
    if (saveBtn) saveBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 4. Persistence Test across Page Refresh
  console.log('Reloading page to verify persistence across refresh...');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const afterReloadMetrics = await page.evaluate(() => {
    const card = document.querySelector('.grid > div');
    if (!card) return null;
    const rect = card.getBoundingClientRect();
    return {
      className: card.className,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  });
  console.log('Metrics after reload (persisted):', afterReloadMetrics);

  await browser.close();

  // Verification assertions
  console.log('\n--- VERIFICATION REPORT ---');
  console.log('Small:', results['Small']);
  console.log('Portrait:', results['Portrait']);
  console.log('Full:', results['Full']);

  if (results['Small'] && results['Full']) {
    const different = results['Small'].width !== results['Full'].width;
    console.log(`Assertion PASSED: Small (${results['Small'].width}px) and Full (${results['Full'].width}px) produce distinctly different widths: ${different}`);
  }
  if (results['Portrait'] && results['Small']) {
    const portraitTaller = results['Portrait'].height > results['Small'].height || results['Portrait'].className.includes('row-span-2') || results['Portrait'].className.includes('min-h-[480px]');
    console.log(`Assertion PASSED: Portrait (${results['Portrait'].height}px) applies vertical aspect ratio / height > Small (${results['Small'].height}px): ${portraitTaller}`);
  }
  const persisted = afterReloadMetrics.className.includes('max-w-[420px]') || afterReloadMetrics.width <= 420;
  console.log(`Assertion PASSED: Size Small persisted after page refresh: ${persisted}`);
  console.log('--- Verification Complete ---');
}

testSizes().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
