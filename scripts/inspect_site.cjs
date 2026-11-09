const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1920x1080_desktop', width: 1920, height: 1080, isMobile: false },
  { name: '1366x768_laptop', width: 1366, height: 768, isMobile: false },
  { name: '768x1024_tablet', width: 768, height: 1024, isMobile: true },
  { name: '390x844_mobile', width: 390, height: 844, isMobile: true, hasTouch: true }
];

async function run() {
  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set auth and config in localStorage prior to full app boot
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('gd_master_session_token', 'session_active_token');
    sessionStorage.setItem('gd_master_session_token', 'session_active_token');
    const existing = localStorage.getItem('greendream_local_state_v1');
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        parsed.settings = parsed.settings || {};
        parsed.settings.onboarded = true;
        localStorage.setItem('greendream_local_state_v1', JSON.stringify(parsed));
      } catch (e) {}
    }
  });

  for (const vp of VIEWPORTS) {
    console.log(`Setting viewport ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch || false,
      deviceScaleFactor: 1
    });

    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));

    // Inspect layout metrics
    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const computedRoot = window.getComputedStyle(root);
      const computedBody = window.getComputedStyle(body);
      const main = document.querySelector('main');
      const mainStyle = main ? window.getComputedStyle(main) : null;
      
      const cards = Array.from(document.querySelectorAll('.card-clean, .card-hero, .card-subtle, div[class*="rounded-"]'));
      const cardSizes = cards.slice(0, 5).map(c => {
        const rect = c.getBoundingClientRect();
        return { tag: c.tagName, class: c.className.slice(0, 40), width: rect.width, height: rect.height };
      });

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollWidth: root.scrollWidth,
        scrollHeight: root.scrollHeight,
        hasHorizontalScroll: root.scrollWidth > window.innerWidth,
        rootFontSize: computedRoot.fontSize,
        bodyFontSize: computedBody.fontSize,
        cssZoom: computedRoot.zoom || computedBody.zoom || 'normal',
        mainWidth: main ? main.getBoundingClientRect().width : null,
        mainMaxWidth: mainStyle ? mainStyle.maxWidth : null,
        mainPadding: mainStyle ? mainStyle.padding : null,
        sampleCards: cardSizes
      };
    });

    console.log(`Metrics for ${vp.name}:`, JSON.stringify(metrics, null, 2));

    const shotPath = path.join(OUTPUT_DIR, `${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Saved screenshot: ${shotPath}`);
  }

  await browser.close();
  console.log('Inspection complete.');
}

run().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
