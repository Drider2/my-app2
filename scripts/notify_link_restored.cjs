const https = require('https');

const BOT_TOKEN = '8647223409:AAEvYozqT29onovhYNAsPGGAnkgGoBhggrE';
const CHAT_ID = '2043538173';

const message = `🌿 *GreenDream v1.3.1 - Live Link Restored!* 🚀

Cloudflare Tunnel error 1033 has been resolved. The tunnel daemon has been refreshed with HTTP/2 and verified 100% online.

🌐 *Direct Live URL:*
https://order-loved-near-admissions.trycloudflare.com

🔗 *Redundant Fixed Link:*
https://greendream-app-live.loca.lt
*(localtunnel IP bypass: 41.96.29.40)*

🔑 *Master Password:* \`greendream2026\`

✅ *Status:*
• Responsive on phone and desktop (viewport meta tag, fluid units, no zoom bug)
• Resolution selector: Full (1920x1080), Small (400x300), Portrait (1080x1920)
• Edits saved immediately to local-first persistent storage
• Clean solid surfaces (glassmorphism/blur removed)
• All features 100% functional and online!`;

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
  family: 4,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  },
  timeout: 10000
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Telegram dispatch response status:', res.statusCode);
    console.log('Telegram dispatch body:', data);
  });
});

req.on('error', (err) => {
  console.error('Telegram request error:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.error('Telegram request timed out');
  process.exit(1);
});

req.write(payload);
req.end();
