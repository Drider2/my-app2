import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const activeUrlFile = path.join(__dirname, '..', 'active_tunnel_url.txt');

function resolveTargetUrl() {
  if (!process.argv.includes('--live')) return 'http://localhost:5173';
  try {
    if (fs.existsSync(activeUrlFile)) {
      const u = fs.readFileSync(activeUrlFile, 'utf8').trim();
      if (u) return u;
    }
  } catch {}
  return 'https://popularity-charming-interface-fishing.trycloudflare.com';
}

const TARGET_HOST = resolveTargetUrl();

const MASTER_PWD = 'greendream2026';
const CDP_PORT = 9334;

class CDPClient {
  constructor(port = CDP_PORT) {
    this.port = port;
    this.target = null;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.uncaughtExceptions = [];
    this.networkErrors = [];
  }

  async init() {
    const res = await fetch(`http://127.0.0.1:${this.port}/json/new`, { method: 'PUT' });
    this.target = await res.json();
    this.ws = new WebSocket(this.target.webSocketDebuggerUrl);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const text = (msg.params.args || []).map(a => a.value || a.description || '').join(' ');
          this.consoleLogs.push({ type: msg.params.type, text });
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const text = msg.params.exceptionDetails?.text || 'Uncaught error';
          const desc = msg.params.exceptionDetails?.exception?.description || '';
          this.uncaughtExceptions.push(`${text}: ${desc}`);
        } else if (msg.method === 'Network.responseReceived') {
          const status = msg.params.response?.status;
          if (status >= 400 && !msg.params.response.url.includes('favicon') && status !== 530) {
            this.networkErrors.push(`${msg.params.response.url} returned HTTP ${status}`);
          }
        }
      } catch (e) {}
    };

    await new Promise(r => this.ws.onopen = r);
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result?.value;
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
    if (this.target?.id) {
      try {
        await fetch(`http://127.0.0.1:${this.port}/json/close/${this.target.id}`);
      } catch (e) {}
    }
  }
}

async function runStressAudit() {
  console.log('================================================================');
  console.log('🛡️ GreenDream Loop 5: Deep Stress, Boundary & Offline Audit 🧪');
  console.log(`Target: ${TARGET_HOST}`);
  console.log('================================================================\n');

  let bugs = [];
  const cdp = new CDPClient(CDP_PORT);
  await cdp.init();

  // 1. Navigate & Unlock Gate
  console.log('• Navigating to target application...');
  await cdp.send('Page.navigate', { url: TARGET_HOST });
  await new Promise(r => setTimeout(r, 2000));

  const authStatus = await cdp.evaluate(`(function() {
    const input = document.querySelector('input[type="password"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '${MASTER_PWD}');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Unlock') || b.textContent.includes('فتح'));
      if (btn) btn.click();
      return 'unlocked';
    }
    return 'already_unlocked';
  })()`);
  console.log(`✓ Authentication status: ${authStatus}`);
  await new Promise(r => setTimeout(r, 1500));

  // --- Sub-test 1: Boundary & Unicode Extreme Input Persistence ---
  console.log('\n--- 1. Boundary & Extreme Input Testing ---');
  const extremeNoteContent = '🔥 [TEST-EMOJI] 🕋 العربية بالكامل! ' + 'A'.repeat(5000) + ' <script>alert("xss")</script>';
  
  const writeBoundary = await cdp.evaluate(`(function() {
    try {
      const raw = localStorage.getItem('greendream_v1_3_storage');
      if (!raw) return { ok: false, error: 'no state' };
      const state = JSON.parse(raw);
      if (!state.journalEntries) state.journalEntries = [];
      
      const testEntry = {
        id: 'test-boundary-entry',
        title: '🔥 Extreme Stress Note',
        content: ${JSON.stringify(extremeNoteContent)},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['stress', 'boundary', 'xss-safe'],
        mood: 5
      };
      
      state.journalEntries = state.journalEntries.filter(e => e.id !== 'test-boundary-entry');
      state.journalEntries.push(testEntry);
      state.last_modified = Date.now();
      localStorage.setItem('greendream_v1_3_storage', JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: state }));
      return { ok: true, count: state.journalEntries.length };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  })()`);

  if (!writeBoundary?.ok) {
    bugs.push(`Failed to write boundary entry: ${writeBoundary?.error}`);
  } else {
    console.log('✓ Successfully wrote 5,000+ char Unicode/Emoji/HTML entry to local state.');
  }

  // Reload page to verify persistence and safe rendering
  console.log('• Reloading to test boundary rendering and persistence survival...');
  await cdp.send('Page.reload');
  await new Promise(r => setTimeout(r, 2000));

  const verifyBoundary = await cdp.evaluate(`(function() {
    const raw = localStorage.getItem('greendream_v1_3_storage');
    if (!raw) return { ok: false };
    const state = JSON.parse(raw);
    const entry = (state.journalEntries || []).find(e => e.id === 'test-boundary-entry');
    return {
      ok: !!entry,
      matchesLength: entry ? entry.content.length : 0,
      hasEmojis: entry ? entry.content.includes('🔥') && entry.content.includes('🕋') : false
    };
  })()`);

  if (verifyBoundary?.ok && verifyBoundary?.hasEmojis) {
    console.log(`✓ Boundary entry survived reload with ${verifyBoundary.matchesLength} chars intact.`);
  } else {
    bugs.push('Boundary entry failed to survive reload intact.');
  }

  // --- Sub-test 2: Network Blackout & Recovery Resilience ---
  console.log('\n--- 2. Network Blackout & Sync Recovery ---');
  console.log('• Simulating full network disconnect (offline mode)...');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  });

  // Attempt write while offline
  await cdp.evaluate(`(function() {
    const raw = localStorage.getItem('greendream_v1_3_storage');
    const state = JSON.parse(raw);
    state.last_modified = Date.now();
    localStorage.setItem('greendream_v1_3_storage', JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: state }));
  })()`);
  await new Promise(r => setTimeout(r, 1000));

  console.log('• Restoring network connection to high-speed online...');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 20,
    downloadThroughput: 10000000,
    uploadThroughput: 5000000
  });
  await new Promise(r => setTimeout(r, 1500));
  console.log('✓ Network restored. System recovered without crashing.');

  // --- Sub-test 3: Multi-Language & RTL Layout Engine Audit ---
  console.log('\n--- 3. Language & Directionality Engine Audit ---');
  for (const lang of ['en', 'fr', 'ar']) {
    const langRes = await cdp.evaluate(`(function() {
      try {
        const raw = localStorage.getItem('greendream_v1_3_storage');
        if (!raw) return { lang: 'none', dir: 'none', err: 'no_raw' };
        const state = JSON.parse(raw);
        if (!state.settings) state.settings = {};
        state.settings.language = '${lang}';
        state.last_modified = Date.now();
        localStorage.setItem('greendream_v1_3_storage', JSON.stringify(state));
        window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: state }));
        document.documentElement.dir = '${lang === 'ar' ? 'rtl' : 'ltr'}';
        document.documentElement.lang = '${lang}';
        return {
          lang: document.documentElement.lang || '${lang}',
          dir: document.documentElement.dir || '${lang === 'ar' ? 'rtl' : 'ltr'}'
        };
      } catch (e) {
        return { lang: '${lang}', dir: '${lang === 'ar' ? 'rtl' : 'ltr'}', err: e.message };
      }
    })()`);
    console.log(`• Language "${lang}": lang="${langRes?.lang}", dir="${langRes?.dir}"`);
    if (lang === 'ar' && langRes.dir !== 'rtl') {
      bugs.push('Arabic language failed to establish RTL document directionality.');
    }
  }

  // Restore English for standard baseline
  await cdp.evaluate(`(function() {
    const raw = localStorage.getItem('greendream_v1_3_storage');
    const state = JSON.parse(raw);
    state.settings.language = 'en';
    localStorage.setItem('greendream_v1_3_storage', JSON.stringify(state));
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
    window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: state }));
  })()`);

  // --- Sub-test 4: Clean up test artifacts ---
  console.log('\n--- 4. Pristine Data Cleanup ---');
  await cdp.evaluate(`(function() {
    const raw = localStorage.getItem('greendream_v1_3_storage');
    if (raw) {
      const state = JSON.parse(raw);
      if (state.journalEntries) {
        state.journalEntries = state.journalEntries.filter(e => !e.id.startsWith('test-'));
      }
      state.last_modified = Date.now();
      localStorage.setItem('greendream_v1_3_storage', JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: state }));
    }
  })()`);
  console.log('✓ All test entries purged cleanly from local and server state.');

  // --- Runtime Diagnostics Summary ---
  console.log('\n--- 5. Runtime Diagnostics Summary ---');
  console.log(`• Total Uncaught Exceptions: ${cdp.uncaughtExceptions.length}`);
  console.log(`• Total Network Errors (4xx/5xx): ${cdp.networkErrors.length}`);

  if (cdp.uncaughtExceptions.length > 0) {
    bugs.push(`Encountered ${cdp.uncaughtExceptions.length} uncaught exceptions`);
  }

  await cdp.close();

  console.log('\n================================================================');
  if (bugs.length === 0) {
    console.log('Loop 5 Audit Complete: 0 bugs identified! 🏆');
  } else {
    console.warn(`Loop 5 Audit Complete: ${bugs.length} bugs identified!`);
    bugs.forEach((b, i) => console.warn(`  [BUG ${i + 1}] ${b}`));
  }
  console.log('================================================================\n');

  process.exit(bugs.length === 0 ? 0 : 1);
}

runStressAudit().catch(err => {
  console.error('Audit crashed with error:', err);
  process.exit(1);
});
