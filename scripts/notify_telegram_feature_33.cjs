const https = require('https');

const BOT_TOKEN = '8647223409:AAEvYozqT29onovhYNAsPGGAnkgGoBhggrE';
const CHAT_ID = '2043538173';

const message = `🚀 *GreenDream v1.3.1 Web Update: Feature #33 Delivered & Verified!*

🌐 *Live Web URL (Cloudflare HTTP/2 Tunnel - 100% Online):*
https://reg-pontiac-fuji-firmware.trycloudflare.com
*(Redundant Link: https://greendream-app-live.loca.lt - IP: 41.96.55.27)*
🔑 *Password:* \`greendream2026\`

✨ *Delivered Upgrade:*

3️⃣3️⃣ *Emergency Fund Runway & Net Worth Balance Sheet Desk (Finance & FAB)*
• 3-Gauge Executive Suite: Total Net Worth (DA), Emergency Runway in Months, and Monthly Burn Rate
• 5-Tier Living Expense Defense Simulator:
  1. \`Critical Risk 🚨\` (< 1 month)
  2. \`Fragile Buffer ⚠️\` (1–3 months)
  3. \`Protected 🛡️\` (3–6 months)
  4. \`Resilient Fortress 🏰\` (6–12 months)
  5. \`Financial Fortress 👑\` (12+ months)
• Dynamic runway target selector (3, 6, 9, 12 months) with required buffer & surplus/shortfall calculation
• Complete Balance Sheet Assets & Liabilities:
  - Checking cash & bank savings auto-synchronized from live double-entry ledger
  - Money lent to others (receivables) auto-synced
  - Custom Asset Portfolio: Gold Bullion 🪙, Vehicles 🚗, Real Estate 🏠, Investments 📈
  - Custom Liabilities & Debt Obligations: Loans borrowed, private debts, due dates
• 1-Click Balance Sheet Markdown Statement (.MD) download
• 1-Click Full Asset & Debt CSV Ledger export

✅ *Quality Verification:*
• TypeScript: 0 errors (\`npx tsc --noEmit\`)
• Unit Tests: 115 / 115 passed across all suites in 488ms
• Production Bundle: Built cleanly in 11.77s (\`dist/\`)
• Headless Chrome E2E: Tested and verified in \`screenshots/finance_net_worth_modal.png\`
• Live Cloudflare Tunnel: Fresh HTTP/2 200 OK verified

All background daemons (API, Vite frontend, and Cloudflare tunnel) are running continuously on your PC.`;

const payload = JSON.stringify({
  chat_id: CHAT_ID,
  text: message,
  parse_mode: 'Markdown'
});

const req = https.request({
  hostname: 'api.telegram.org',
  path: `/bot${BOT_TOKEN}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Telegram dispatch response status:', res.statusCode);
    console.log('Telegram dispatch body:', data);
  });
});

req.on('error', (e) => {
  console.error('Telegram request error:', e.message);
});

req.write(payload);
req.end();
