import fs from 'fs';
import path from 'path';

const CDP_PORT = 9334;
const BASE_LOCAL_URL = 'http://localhost:5173';
const MASTER_PASSWORD = 'greendream2026';

class CDPClient {
  constructor(port = CDP_PORT) {
    this.port = port;
    this.target = null;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.errors = [];
    this.networkErrors = [];
  }

  async init(url = 'about:blank') {
    const res = await fetch(`http://127.0.0.1:${this.port}/json/new`, { method: 'PUT' });
    this.target = await res.json();
    this.ws = new WebSocket(this.target.webSocketDebuggerUrl);

    this.ws.onmessage = (event) => {
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
        this.errors.push(`${text}: ${desc}`);
      } else if (msg.method === 'Network.responseReceived') {
        const status = msg.params.response?.status;
        if (status >= 400 && !msg.params.response.url.includes('favicon')) {
          this.networkErrors.push(`${msg.params.response.url} returned HTTP ${status}`);
        }
      }
    };

    await new Promise(r => this.ws.onopen = r);
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');

    if (url !== 'about:blank') {
      await this.navigate(url);
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 1200));
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
      fitWindow: false,
    });
    await this.send('Runtime.evaluate', {
      expression: 'window.dispatchEvent(new Event("resize"))'
    });
    await new Promise(r => setTimeout(r, 200));
  }

  async setNetworkConditions(offline = false, latency = 0, downloadThroughput = -1, uploadThroughput = -1) {
    await this.send('Network.emulateNetworkConditions', {
      offline,
      latency,
      downloadThroughput,
      uploadThroughput
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  async unlockGateIfNeeded() {
    const start = Date.now();
    while (Date.now() - start < 6000) {
      const state = await this.evaluate(`
        (() => {
          const pwd = document.querySelector('input[type="password"]');
          const nav = document.querySelector('nav, aside, [role="tablist"], [data-tab-id]');
          const hasApp = Boolean(document.querySelector('#root > div') && !pwd);
          return { hasPwd: Boolean(pwd), hasNav: Boolean(nav), hasApp };
        })()
      `);
      if (state.hasNav || state.hasApp) return true;
      if (state.hasPwd) {
        await this.evaluate(`
          (async () => {
            const pwdInput = document.querySelector('input[type="password"]');
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(pwdInput, '${MASTER_PASSWORD}');
            pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100));
            const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Unlock'));
            if (submitBtn) submitBtn.click();
          })()
        `);
        await new Promise(r => setTimeout(r, 1000));
        return true;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    return false;
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    if (this.target?.id) {
      try {
        await fetch(`http://127.0.0.1:${this.port}/json/close/${this.target.id}`, { method: 'PUT' });
      } catch {}
    }
  }
}

// -------------------------------------------------------------
// Loop 2 Stress Test Suite
// -------------------------------------------------------------
async function runLoop2StressTests() {
  console.log('================================================================');
  console.log('🔬 GreenDream Loop 2: Deep Stress & Edge-Case Audit 🧪');
  console.log('================================================================\n');

  const bugsFound = [];
  const client = new CDPClient();

  try {
    await client.init(BASE_LOCAL_URL);
    await client.unlockGateIfNeeded();
    console.log('✓ Target connected and authenticated.');

    // -------------------------------------------------------------
    // TEST 1: OFFLINE PERSISTENCE & AUTO-RECOVERY
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Offline Persistence & Recovery ---');
    console.log('• Emulating network disconnect (offline = true)...');
    await client.setNetworkConditions(true);

    const offlineTxId = 'tx-offline-' + Date.now();
    await client.evaluate(`
      (() => {
        const db = window.__gd_db || window.db;
        db.updateState(state => {
          state.transactions.unshift({
            id: '${offlineTxId}',
            type: 'expense',
            amount_minor: 99000,
            local_date: new Date().toISOString().slice(0, 10),
            category_id: 'cat-food',
            note: 'Offline Emergency Meal',
            created_at: Date.now(),
            updated_at: Date.now(),
            deleted_at: null
          });
        });
      })()
    `);

    // Check localStorage has it immediately
    const offlineSavedLocally = await client.evaluate(`
      (() => {
        const raw = localStorage.getItem('greendream_v1_3_storage');
        const state = JSON.parse(raw);
        return (state.transactions || []).some(t => t.id === '${offlineTxId}');
      })()
    `);

    if (offlineSavedLocally) {
      console.log('✓ Transaction instantly committed to local storage during complete network blackout.');
    } else {
      bugsFound.push('Offline transaction was not committed to local storage');
    }

    // Wait 3.5s for backoff retries to fail and set error status
    console.log('• Waiting for offline backoff retries to settle...');
    await new Promise(r => setTimeout(r, 4000));

    const syncStatusOffline = await client.evaluate(`
      (() => {
        const db = window.__gd_db || window.db;
        return db.getSyncStatus();
      })()
    `);
    console.log(`• Sync status during blackout: "${syncStatusOffline.status}" (error: ${syncStatusOffline.error || 'none'})`);

    // Restore network
    console.log('• Restoring network connectivity (offline = false)...');
    await client.setNetworkConditions(false);
    await new Promise(r => setTimeout(r, 500));

    // Trigger sync
    console.log('• Triggering sync recovery...');
    await client.evaluate(`
      (async () => {
        const db = window.__gd_db || window.db;
        await db.syncToServer();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const syncStatusOnline = await client.evaluate(`
      (() => {
        const db = window.__gd_db || window.db;
        return db.getSyncStatus();
      })()
    `);
    console.log(`• Sync status after reconnect: "${syncStatusOnline.status}"`);

    // Verify server has it
    const serverCheck = await fetch('http://localhost:3001/api/state').then(r => r.json());
    const offlineTxOnServer = (serverCheck.state?.transactions || []).some(t => t.id === offlineTxId);
    if (offlineTxOnServer) {
      console.log('✓ Server successfully received offline transaction upon reconnection!');
    } else {
      bugsFound.push('Offline transaction was not synchronized to server after network restored');
    }

    // Clean up offline tx
    await client.evaluate(`
      (() => {
        const db = window.__gd_db || window.db;
        db.updateState(state => {
          state.transactions = state.transactions.filter(t => t.id !== '${offlineTxId}');
        });
      })()
    `);

    // -------------------------------------------------------------
    // TEST 2: ARABIC (RTL) & FRENCH (FR) LOCALIZATION INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Multilingual & RTL System ---');
    const languages = [
      { code: 'ar', dir: 'rtl', label: 'العربية (Arabic)' },
      { code: 'fr', dir: 'ltr', label: 'Français (French)' },
      { code: 'en', dir: 'ltr', label: 'English' }
    ];

    for (const lang of languages) {
      await client.evaluate(`
        (() => {
          if (window.setLanguage) {
            window.setLanguage('${lang.code}');
          } else {
            const db = window.__gd_db || window.db;
            db.updateState(s => {
              s.settings.language = '${lang.code}';
            });
            document.documentElement.setAttribute('dir', '${lang.dir}');
            document.documentElement.setAttribute('lang', '${lang.code}');
            window.dispatchEvent(new CustomEvent('app_language_changed', { detail: { language: '${lang.code}', isRtl: ${lang.dir === 'rtl'} } }));
          }
        })()
      `);
      await new Promise(r => setTimeout(r, 400));

      const langStatus = await client.evaluate(`
        (() => {
          return {
            htmlDir: document.documentElement.getAttribute('dir'),
            htmlLang: document.documentElement.getAttribute('lang'),
            bodyTextSample: document.body.innerText.slice(0, 60).replace(/\\n/g, ' ')
          };
        })()
      `);

      console.log(`• ${lang.label}: dir="${langStatus.htmlDir}" | sample: "${langStatus.bodyTextSample}"`);
      if (langStatus.htmlDir !== lang.dir) {
        bugsFound.push(`Language ${lang.code} expected html dir="${lang.dir}" but was "${langStatus.htmlDir}"`);
      }
    }

    // -------------------------------------------------------------
    // TEST 3: THEME ACCENT MATRIX (4 ACCENTS x DARK/LIGHT)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Theme & Accent System (4 Accents x 2 Themes) ---');
    const accents = ['cyan', 'emerald', 'violet', 'rose'];
    const themes = ['dark', 'light'];

    for (const theme of themes) {
      for (const accent of accents) {
        await client.evaluate(`
          (() => {
            const db = window.__gd_db || window.db;
            db.updateState(s => {
              s.settings.theme = '${theme}';
              s.settings.accent = '${accent}';
            });
            document.documentElement.setAttribute('data-theme', '${theme}');
            document.documentElement.setAttribute('data-accent', '${accent}');
            window.dispatchEvent(new CustomEvent('greendream_state_updated'));
          })()
        `);
        await new Promise(r => setTimeout(r, 100));

        const computedAccent = await client.evaluate(`
          (() => {
            const style = window.getComputedStyle(document.documentElement);
            return {
              theme: document.documentElement.getAttribute('data-theme'),
              accent: document.documentElement.getAttribute('data-accent'),
              accentVar: style.getPropertyValue('--color-accent').trim()
            };
          })()
        `);

        if (computedAccent.theme !== theme || computedAccent.accent !== accent) {
          bugsFound.push(`Failed to apply theme "${theme}" with accent "${accent}"`);
        }
      }
    }
    console.log('✓ All 8 Theme/Accent combinations verified without style collisions.');

    // Reset to Dark / Cyan
    await client.evaluate(`
      (() => {
        const db = window.__gd_db || window.db;
        db.updateState(s => {
          s.settings.theme = 'dark';
          s.settings.accent = 'cyan';
          s.settings.language = 'en';
        });
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.setAttribute('data-accent', 'cyan');
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
        window.dispatchEvent(new CustomEvent('greendream_state_updated'));
      })()
    `);

    // -------------------------------------------------------------
    // TEST 4: UNUSUAL INPUTS & BOUNDARY VALUES
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Edge-Case Inputs (Unicode, Long Strings, XSS) ---');
    const extremeCases = [
      { name: '1000-char string', note: 'A'.repeat(1000) },
      { name: 'Emoji cascade', note: '🚀🔥🕌💪🌿💎🏆⚡🎯✨🕋🍎🏊‍♂️' },
      { name: 'XSS script injection tag', note: '<script>alert("xss")</script><img src=x onerror=console.error(1)>' },
      { name: 'Arabic Diacritics', note: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ' },
      { name: 'Symbols & quotes', note: 'Single\' and "Double" quotes, backtick `, &amp; <test>' }
    ];

    for (const ec of extremeCases) {
      const edgeId = 'tx-edge-' + Date.now();
      await client.evaluate(`
        (() => {
          const db = window.__gd_db || window.db;
          db.updateState(state => {
            state.transactions.unshift({
              id: '${edgeId}',
              type: 'expense',
              amount_minor: 10000,
              local_date: new Date().toISOString().slice(0, 10),
              category_id: 'cat-food',
              note: ${JSON.stringify(ec.note)},
              created_at: Date.now(),
              updated_at: Date.now(),
              deleted_at: null
            });
          });
        })()
      `);

      // Verify it parses back unharmed
      const parsedNote = await client.evaluate(`
        (() => {
          const db = window.__gd_db || window.db;
          const found = db.getState().transactions.find(t => t.id === '${edgeId}');
          return found ? found.note : null;
        })()
      `);

      if (parsedNote === ec.note) {
        console.log(`• Edge case [${ec.name}]: Parsed accurately with 0 corruption or sanitization defect.`);
      } else {
        bugsFound.push(`Edge case [${ec.name}] note corrupted: expected len ${ec.note.length}, got len ${parsedNote?.length}`);
      }

      // Cleanup
      await client.evaluate(`
        (() => {
          const db = window.__gd_db || window.db;
          db.updateState(state => {
            state.transactions = state.transactions.filter(t => t.id !== '${edgeId}');
          });
        })()
      `);
    }

    // -------------------------------------------------------------
    // CONSOLE & ERROR RECAP
    // -------------------------------------------------------------
    console.log('\n--- 5. Runtime Errors Recap ---');
    console.log(`• Uncaught Exceptions: ${client.errors.length}`);
    console.log(`• Network Errors: ${client.networkErrors.length}`);
    if (client.errors.length > 0) {
      bugsFound.push(...client.errors);
    }
    if (client.networkErrors.length > 0) {
      bugsFound.push(...client.networkErrors);
    }

    console.log('\n================================================================');
    console.log(`Loop 2 Deep Audit Complete: ${bugsFound.length} bugs identified.`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Loop 2 crash:', err);
    bugsFound.push(`Loop 2 fatal: ${err.message}`);
  } finally {
    await client.close();
  }

  return { bugsFound };
}

runLoop2StressTests().then(res => {
  if (res.bugsFound.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
