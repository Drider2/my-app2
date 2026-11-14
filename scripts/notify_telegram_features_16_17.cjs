const https = require('https');

const BOT_TOKEN = '8647223409:AAEvYozqT29onovhYNAsPGGAnkgGoBhggrE';
const CHAT_ID = '2043538173';

const message = `🚀 *GreenDream v1.3.1 Web Update: Features #16 & #17 Delivered & Verified!*

🌐 *Live Web URL:*
https://estimated-baths-proc-running.trycloudflare.com
*(Redundant Link: https://greendream-app-live.loca.lt - IP: 41.96.55.27)*
🔑 *Password:* \`greendream2026\`

✨ *Delivered Upgrades:*

1️⃣6️⃣ *Daily Habits Consistency Matrix & Multi-Day Momentum Hub (Today)*
• Interactive 7-day completion bubbles (Mon–Sun / past 7 days)
• Tap any day bubble to check in, complete, or backfill habits
• Active flame streak tracking (\`🔥 X days\`) & weekly completion %
• Global today summary progress bar (\`X/Y habits completed\`)
• 1-Click "New Habit" creator modal with custom icons & schedules

1️⃣7️⃣ *Multi-Currency & FX Exchange Calculator (Finance)*
• Quick 1-Click header launcher (\`Coins\` button)
• 2-way instant conversion: Algerian Dinar (\`DA\`) ⇄ \`EUR\`, \`USD\`, \`GBP\`, \`CAD\`, \`SAR\`, \`AED\`, \`TRY\`
• Dual mode switch: **Parallel Market (Square)** vs **Official Bank Rate**
• Manual rate override slider/input for live market fluctuations
• 1-Click "Record Converted Transaction": automatically logs the expense/income in DA with foreign exchange reference notes

✅ *Quality Verification:*
• TypeScript: 0 errors (\`npx tsc --noEmit\`)
• Unit Tests: 85/85 passed in 290ms
• Production Bundle: Built cleanly in 16.6s (\`dist/\`)
• Headless Browser E2E: Screenshots captured in \`screenshots/\`
• Live Cloudflare Tunnel: HTTP/2 200 OK

All services running 24/7 autonomously on your PC.`;

const payload = JSON.stringify({
  chat_id: CHAT_ID,
  text: message,
  parse_mode: 'Markdown'
});

const req = https.request({
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${BOT_TOKEN}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Telegram response status:', res.statusCode);
    console.log('Telegram response body:', body);
  });
});

req.on('error', (e) => {
  console.error('Telegram dispatch error:', e.message);
});

req.write(payload);
req.end();
