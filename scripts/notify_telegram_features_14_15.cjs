const https = require('https');

const BOT_TOKEN = '8647223409:AAEvYozqT29onovhYNAsPGGAnkgGoBhggrE';
const CHAT_ID = '2043538173';

const message = `🚀 *GreenDream v1.3.1 Web Update: Features #14 & #15 Delivered & Verified!*

🌐 *Live Web URL:*
https://estimated-baths-proc-running.trycloudflare.com
*(Redundant Link: https://greendream-app-live.loca.lt - IP: 41.96.55.27)*
🔑 *Password:* \`greendream2026\`

✨ *Delivered Upgrades:*

1️⃣4️⃣ *System Data Health & Storage Diagnostics Hub (Settings)*
• Live browser \`localStorage\` utilization gauge (KB used & quota %)
• Record count ledger breakdown across all app modules:
  - Finance transactions & budgets
  - Gym sessions & movements
  - Habits & daily prayers
  - Hydration logs & journal reflections
• 1-Click "Audit & Recalculate" with zero-orphan integrity check
• Fixed \`v1.3.1\` database import/export backup synchronization

1️⃣5️⃣ *Body & Gym Exercise Catalog & Search Engine (Body)*
• Dedicated "Catalog" secondary tab in the Gym desk
• Instant real-time search by exercise name or target muscle
• Filter chips: All, Chest, Back, Legs, Shoulders, Arms, Core, Cardio
• Personal Record (PR) badges showing heaviest set & estimated 1RM
• Total sets logged & last trained date indicators
• 1-Click "New Exercise" custom movement creator modal

✅ *Quality Verification:*
• TypeScript: 0 errors (\`npx tsc --noEmit\`)
• Unit Tests: 85/85 passed in 280ms
• Production Bundle: Built cleanly in 11.1s (\`dist/\`)
• Visual Verification: Screenshots captured in \`screenshots/\`
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
