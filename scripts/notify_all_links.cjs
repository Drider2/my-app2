const https = require('https');

const BOT_TOKEN = '8647223409:AAEvYozqT29onovhYNAsPGGAnkgGoBhggrE';
const CHAT_ID = '2043538173';

const message = `🌿 *GreenDream v1.3.1 - All Links & Access Info* 🚀

Here are all your verified access links:

🌐 *Worldwide Live Link (Access from Anywhere):*
https://multi-packed-swing-authorization.trycloudflare.com

💻 *Local Web App (On Your PC):*
http://localhost:5173

🗺️ *Agenttrail Live Observability Map:*
http://localhost:5330

⚙️ *Backend API & AI Proxy:*
http://localhost:3001

🔑 *Master Password:* \`greendream2026\`

📱 *App Capabilities & Features:*
• Responsive design on Phone, Tablet & Desktop
• Desktop resolution switcher: Full (1920x1080), Small (400x300), Portrait (1080x1920)
• Persistent database sync (/api/state) with instant auto-save
• Habits, Flame Streaks & Daily Routine Progress
• Personal Finance & Multi-Currency Ledger
• Gym Training Suite, 1RM Calculator & TDEE Macros
• Calendar & Smart Task Scheduling
• Prayers, Fasting & Quran Tracking
• Vehicle & Home Maintenance Logs
• AI Assistant & Hands-Free Hermes Voice Mode

✅ All daemons are running continuously on your PC!`;

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
    console.log('Telegram dispatch status:', res.statusCode);
    console.log('Telegram response:', data);
  });
});

req.on('error', (err) => {
  console.error('Telegram dispatch error:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.error('Telegram request timed out');
  process.exit(1);
});

req.write(payload);
req.end();
