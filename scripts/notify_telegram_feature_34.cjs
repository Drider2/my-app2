const https = require('https');

const BOT_TOKEN = '8647223409:AAEvYozqT29onovhYNAsPGGAnkgGoBhggrE';
const CHAT_ID = '2043538173';

const message = `🚀 *GreenDream v1.3.1 Web Update: Feature #34 Delivered & Verified!*

🌐 *Live Web URL (Cloudflare HTTP/2 Tunnel - 100% Online):*
https://reg-pontiac-fuji-firmware.trycloudflare.com
*(Redundant Link: https://greendream-app-live.loca.lt - IP: 41.96.55.27)*
🔑 *Password:* \`greendream2026\`

✨ *Delivered Upgrade:*

3️⃣4️⃣ *Bodyweight Macro Targets & TDEE Energy Desk (Gym & FAB)*
• Scientific Mifflin-St Jeor formula calibrated for natural lifting athletes
• Real-time synchronization with latest bodyweight entry from Gym tracking
• 3-Gauge Executive Suite: Target Daily Calories (kcal), TDEE Maintenance, and BMR Baseline
• 5 Fitness Goals with dynamic calorie adjustments:
  1. \`Aggressive Cut\` (-500 kcal): rapid fat loss sparing lean muscle
  2. \`Lean Cut\` (-300 kcal): gentle deficit preserving workout strength
  3. \`Maintenance\` (0 kcal): body recomposition & optimal recovery
  4. \`Lean Bulk\` (+250 kcal): controlled clean muscle hypertrophy
  5. \`Mass Bulk\` (+500 kcal): high-volume mass gain
• 5 Physical Activity multipliers (Sedentary, Light, Moderate, Very Active, Athlete)
• Complete Macronutrient Split:
  - Protein: 2.2g / kg bodyweight (4 kcal/g) with top whole-food sources
  - Healthy Fats: 0.9g / kg bodyweight (9 kcal/g) for hormone & joint health
  - Carbohydrates: Remaining energy divided by 4 kcal/g for gym fuel & glycogen
• 1-Click Personalized Nutrition Plan Statement (.MD) download
• 1-Click Macro Split CSV Ledger export

✅ *Quality Verification:*
• TypeScript: 0 errors (\`npx tsc --noEmit\`)
• Unit Tests: 118 / 118 passed across all suites in 506ms
• Production Bundle: Built cleanly in 11.88s (\`dist/\`)
• Headless Chrome E2E: Tested and verified in \`screenshots/gym_macro_tdee_modal.png\`
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
