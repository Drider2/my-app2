const https = require('https');

const BOT_TOKEN = '8647223409:AAEvYozqT29onovhYNAsPGGAnkgGoBhggrE';
const CHAT_ID = '2043538173';

const message = `🚀 *GreenDream v1.3.1 Web Update: Features #18 & #19 Delivered & Verified!*

🌐 *Live Web URL:*
https://estimated-baths-proc-running.trycloudflare.com
*(Redundant Link: https://greendream-app-live.loca.lt - IP: 41.96.55.27)*
🔑 *Password:* \`greendream2026\`

✨ *Delivered Upgrades:*

1️⃣8️⃣ *Personal Records (PR) Wall of Fame & Milestone Trophy Room (Gym)*
• 1-Click header launcher (\`PR Trophies\` button)
• Lifetime iron volume moved counter (with fun real-world car & elephant equivalents)
• Top lifts hall of fame: heaviest sets & estimated 1RMs across all cataloged movements
• Milestone achievement badges: Century Club (100+ kg), 10-Ton Titan, Iron Dedication, High Volume Beast
• 1-Click "Export Trophy Sheet (.MD)" for saving or sharing progress

1️⃣9️⃣ *Smart Natural Language Task Parser & Priority Matrix (Calendar)*
• Inline task input with automatic real-time token detection
• Priority detection: \`!urgent\`, \`!high\`, \`!p1\`, \`!low\`, \`!p3\`
• Natural language due dates: \`tomorrow\`, \`today\`, \`in 3 days\`
• Hashtag category tags: \`#work\`, \`#gym\`, \`#finance\`
• Real-time live preview chips showing detected parameters as you type
• Color-coded priority badges (Rose/Red for High, Amber for Normal)

✅ *Quality Verification:*
• TypeScript: 0 errors (\`npx tsc --noEmit\`)
• Unit Tests: 85/85 passed in 270ms
• Production Bundle: Built cleanly in 11.1s (\`dist/\`)
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
