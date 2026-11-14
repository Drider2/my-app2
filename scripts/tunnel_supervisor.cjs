const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const BOT_TOKEN = '8647223409:AAEvYozqT29onovhYNAsPGGAnkgGoBhggrE';
const CHAT_ID = '2043538173';
const CLOUDFLARED_EXE = 'C:\\Users\\yacine\\Downloads\\cloudflared.exe';
const LOG_FILE = 'C:\\Users\\yacine\\cloudflared_supervisor.log';
const PROJECT_DIR = path.join(__dirname, '..');
const LOCAL_ACTIVE_URL_FILE = path.join(PROJECT_DIR, 'active_tunnel_url.txt');
const AGENT_LOG_PATH = path.join(PROJECT_DIR, 'AGENT_LOG.md');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch(e) {}
  console.log(line.trim());
}

function sendTelegram(url) {
  const text = 
    `🌿 *GreenDream v1.3.1 Web Live Link* 🚀\n\n` +
    `Your live web version is active and accessible worldwide:\n\n` +
    `🔗 *Direct Live URL:*\n${url}\n\n` +
    `🔑 *Master Password:*\n\`greendream2026\`\n\n` +
    `• Responsive design (Desktop & Mobile)\n` +
    `• Resolution switcher (Full, Small, Portrait)\n` +
    `• Real-time persistent database synced\n` +
    `• Live Agenttrail observability active at http://localhost:5330\n\n` +
    `Tap the link to use your app from anywhere!`;

  const payload = JSON.stringify({
    chat_id: CHAT_ID,
    text: text,
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
      log(`Telegram notification delivered (HTTP ${res.statusCode})`);
    });
  });

  req.on('error', (err) => {
    log(`Telegram send error: ${err.message}`);
  });

  req.on('timeout', () => {
    req.destroy();
    log('Telegram request timed out');
  });

  req.write(payload);
  req.end();
}

let activeUrl = null;
let childProcess = null;
let consecutiveProbeFailures = 0;

function updateAgentLogUrl(newUrl) {
  try {
    if (fs.existsSync(AGENT_LOG_PATH)) {
      let content = fs.readFileSync(AGENT_LOG_PATH, 'utf8');
      content = content.replace(/- \*\*LIVE_URL:\*\* `[^`]+`/g, `- **LIVE_URL:** \`${newUrl}\``);
      content = content.replace(/- \*\*APK_DOWNLOAD_URL:\*\* `[^`]+`/g, `- **APK_DOWNLOAD_URL:** \`${newUrl}/GreenDream.apk\``);
      fs.writeFileSync(AGENT_LOG_PATH, content, 'utf8');
      log(`Updated AGENT_LOG.md with live URL: ${newUrl}`);
    }
  } catch (err) {
    log(`Error updating AGENT_LOG.md: ${err.message}`);
  }
}

function runTunnel() {
  consecutiveProbeFailures = 0;
  log('Starting cloudflared HTTP/2 tunnel...');
  childProcess = spawn(CLOUDFLARED_EXE, [
    'tunnel',
    '--protocol', 'http2',
    '--no-autoupdate',
    '--url', 'http://127.0.0.1:5173'
  ]);

  let buffer = '';

  function handleData(data) {
    const text = data.toString();
    buffer += text;
    try { fs.appendFileSync(LOG_FILE, text); } catch(e) {}

    const matches = buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi) || [];
    const validMatch = matches.find(m => !m.includes('//api.trycloudflare.com'));
    if (validMatch && validMatch !== activeUrl) {
      activeUrl = validMatch;
      log(`Active live URL registered: ${activeUrl}`);
      try {
        fs.writeFileSync('C:\\Users\\yacine\\ACTIVE_URL.txt', activeUrl, 'utf8');
        fs.writeFileSync(LOCAL_ACTIVE_URL_FILE, activeUrl, 'utf8');
      } catch(e) {}
      updateAgentLogUrl(activeUrl);
      sendTelegram(activeUrl);
    }
  }

  childProcess.stdout.on('data', handleData);
  childProcess.stderr.on('data', handleData);

  childProcess.on('close', (code) => {
    log(`cloudflared exited with code ${code}. Reconnecting in 3s...`);
    activeUrl = null;
    setTimeout(runTunnel, 3000);
  });

  childProcess.on('error', (err) => {
    log(`cloudflared spawn error: ${err.message}`);
    setTimeout(runTunnel, 5000);
  });
}

// Active health check: probe activeUrl every 10s
setInterval(() => {
  if (!activeUrl || activeUrl.includes('api.trycloudflare.com')) return;

  const req = https.get(activeUrl, { timeout: 7000 }, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 500) {
      consecutiveProbeFailures = 0;
      // log(`Tunnel healthy: ${activeUrl} (HTTP ${res.statusCode})`);
    } else {
      consecutiveProbeFailures++;
      log(`Tunnel returned HTTP ${res.statusCode} (consecutive failures: ${consecutiveProbeFailures})`);
      checkAndRestart();
    }
  });

  req.on('error', (err) => {
    consecutiveProbeFailures++;
    log(`Tunnel probe error: ${err.message} (consecutive failures: ${consecutiveProbeFailures})`);
    checkAndRestart();
  });

  req.on('timeout', () => {
    req.destroy();
    consecutiveProbeFailures++;
    log(`Tunnel probe timed out (consecutive failures: ${consecutiveProbeFailures})`);
    checkAndRestart();
  });

  function checkAndRestart() {
    if (consecutiveProbeFailures >= 2) {
      log('Tunnel failed 2 consecutive health probes! Terminating and re-establishing tunnel...');
      activeUrl = null;
      if (childProcess) {
        try { childProcess.kill('SIGKILL'); } catch(e) {}
      }
    }
  }
}, 10000);

log('--- Supervised Tunnel Monitor Initialized ---');
runTunnel();
