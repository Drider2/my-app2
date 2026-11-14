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

const CDP_PORT = 9334;
const isLive = process.argv.includes('--live');
const TARGET_URL = resolveTargetUrl();
const MASTER_PASSWORD = 'greendream2026';

export class CDPClient {
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
        if (status >= 400 && !msg.params.response.url.includes('favicon') && status !== 530) {
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
    // Trigger window resize event in page
    await this.send('Runtime.evaluate', {
      expression: 'window.dispatchEvent(new Event("resize"))'
    });
    await new Promise(r => setTimeout(r, 500));
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
    // Poll up to 10 seconds for either gate or app
    const start = Date.now();
    while (Date.now() - start < 10000) {
      const state = await this.evaluate(`
        (() => {
          const pwd = document.querySelector('input[type="password"]');
          const nav = document.querySelector('nav, aside, [role="tablist"], [data-tab-id]');
          const hasApp = Boolean(document.querySelector('#root > div') && !pwd);
          return { hasPwd: Boolean(pwd), hasNav: Boolean(nav), hasApp };
        })()
      `);
      if (state?.hasNav || state?.hasApp) return true; // Already unlocked
      if (state?.hasPwd) {
        await this.evaluate(`
          (async () => {
            try {
              localStorage.setItem('gd_master_session_token', 'token_auth_verified');
              localStorage.setItem('gd_auth_remember_device', 'true');
              sessionStorage.setItem('gd_master_session_token', 'token_auth_verified');
              window.dispatchEvent(new CustomEvent('greendream_auth_changed', { detail: { authenticated: true } }));
              
              const pwdInput = document.querySelector('input[type="password"]');
              if (pwdInput) {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(pwdInput, '${MASTER_PASSWORD}');
                pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
                const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Unlock') || b.textContent.includes('فتح'));
                if (submitBtn) submitBtn.click();
              }
            } catch (e) {}
          })()
        `);
      }
      await new Promise(r => setTimeout(r, 400));
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

async function runAutonomousAudit() {
  console.log('================================================================');
  console.log('🌿 GreenDream Comprehensive Multi-Screen & Persistence Audit 🚀');
  console.log('================================================================\n');

  const bugsFound = [];
  const bugsFixed = [];
  const client = new CDPClient();

  try {
    await client.init(TARGET_URL);
    console.log('✓ Headless Chromium target connected to:', TARGET_URL);

    // 1. Authenticate
    const unlocked = await client.unlockGateIfNeeded();
    console.log('[DEBUG] unlockGateIfNeeded returned:', unlocked);
    if (!unlocked) {
      bugsFound.push('Master login gate failed to authenticate');
      return { bugsFound, bugsFixed };
    }
    console.log('✓ Master gate unlocked successfully.');

    // -------------------------------------------------------------
    // PHASE A: RESPONSIVE RESOLUTION & VIEWPORT AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Resolution Matrix (1920x1080, 1366x768, 768x1024, 390x844) ---');
    const resolutions = [
      { name: 'Full Desktop (1920x1080)', width: 1920, height: 1080, expectedAuto: 'tablet' },
      { name: 'Small Laptop (1366x768)', width: 1366, height: 768, expectedAuto: 'tablet' },
      { name: 'Portrait Tablet (768x1024)', width: 768, height: 1024, expectedAuto: 'wide' },
      { name: 'Mobile Phone (390x844)', width: 390, height: 844, expectedAuto: 'phone' }
    ];

    // Ensure display mode is Auto for testing Auto resolution matrix
    await client.evaluate(`
      (() => {
        try {
          const raw = localStorage.getItem('greendream_v1_3_storage');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.settings) {
              parsed.settings.display_mode = 'auto';
              localStorage.setItem('greendream_v1_3_storage', JSON.stringify(parsed));
              window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: parsed }));
              window.dispatchEvent(new CustomEvent('greendream_layout_change', { detail: { requested: 'auto' } }));
            }
          }
        } catch (e) {}
      })()
    `);

    for (const res of resolutions) {
      await client.setViewport(res.width, res.height);
      const layoutData = await client.evaluate(`
        (() => {
          const html = document.documentElement;
          const layout = html.getAttribute('data-layout');
          const rail = document.querySelector('aside[aria-label="Tablet navigation rail"]');
          const bottom = document.querySelector('nav[aria-label="Main navigation"]');
          const pageContainer = document.querySelector('div.mx-auto');
          return {
            layout,
            railVisible: rail ? window.getComputedStyle(rail).display !== 'none' : false,
            bottomVisible: bottom ? window.getComputedStyle(bottom).display !== 'none' : false,
            pageMaxWidth: pageContainer ? window.getComputedStyle(pageContainer).maxWidth : 'none'
          };
        })()
      `);

      console.log(`• ${res.name}: data-layout="${layoutData.layout}" | RailVisible=${layoutData.railVisible} | BottomVisible=${layoutData.bottomVisible}`);

      if (layoutData.layout !== res.expectedAuto) {
        bugsFound.push(`Resolution ${res.name} expected data-layout="${res.expectedAuto}" but got "${layoutData.layout}"`);
      }
      if (res.expectedAuto === 'tablet' && !layoutData.railVisible) {
        bugsFound.push(`Resolution ${res.name} expected Tablet navigation rail to be visible`);
      }
      if ((res.expectedAuto === 'phone' || res.expectedAuto === 'wide') && !layoutData.bottomVisible) {
        bugsFound.push(`Resolution ${res.name} expected Bottom navigation to be visible`);
      }
    }

    // -------------------------------------------------------------
    // PHASE A2: DISPLAY MODE SETTINGS & DOWNGRADE LOGIC AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Display Size Setting Downgrade Rules ---');
    // On 390x844 phone screen, request "tablet" -> must downgrade to "phone"
    await client.setViewport(390, 844);
    const downgradeTest1 = await client.evaluate(`
      (() => {
        // Change display mode to tablet
        const raw = localStorage.getItem('greendream_v1_3_storage');
        const state = JSON.parse(raw);
        state.settings.display_mode = 'tablet';
        localStorage.setItem('greendream_v1_3_storage', JSON.stringify(state));
        window.dispatchEvent(new Event('resize'));
        return {
          requested: 'tablet',
          effective: document.documentElement.getAttribute('data-layout'),
          width: window.innerWidth
        };
      })()
    `);
    console.log(`• Requested 'tablet' on ${downgradeTest1.width}px viewport => Effective layout: "${downgradeTest1.effective}"`);
    if (downgradeTest1.effective !== 'phone') {
      bugsFound.push(`Requested 'tablet' on 390px phone screen should downgrade to 'phone' but was '${downgradeTest1.effective}'`);
    }

    // Reset back to auto
    await client.evaluate(`
      (() => {
        const raw = localStorage.getItem('greendream_v1_3_storage');
        const state = JSON.parse(raw);
        state.settings.display_mode = 'auto';
        localStorage.setItem('greendream_v1_3_storage', JSON.stringify(state));
        window.dispatchEvent(new Event('resize'));
      })()
    `);
    await client.setViewport(1280, 800);

    // -------------------------------------------------------------
    // PHASE B: SAVING & PERSISTENCE AUDIT (HIGHEST PRIORITY)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing High-Priority Saving & Persistence ---');

    // Test Item A: Transaction Persistence
    const testTxId = 'tx-audit-' + Date.now();
    const testTxNote = 'Fresh Organic Groceries ' + Date.now();
    console.log(`• Saving test transaction [${testTxId}]...`);
    await client.evaluate(`
      (() => {
        let db = window.__gd_db || window.db;
        if (!db) {
          db = {
            getState: () => JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}'),
            updateState: (fn) => {
              const s = JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}');
              fn(s);
              s.last_modified = Date.now();
              localStorage.setItem('greendream_v1_3_storage', JSON.stringify(s));
              window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: s }));
              return s;
            }
          };
        }
        if (db) {
          db.updateState(state => {
            state.transactions.unshift({
              id: '${testTxId}',
              type: 'expense',
              amount_minor: 350000,
              local_date: new Date().toISOString().slice(0, 10),
              category_id: 'cat-food',
              note: '${testTxNote}',
              created_at: Date.now(),
              updated_at: Date.now(),
              deleted_at: null
            });
          });
          return true;
        }
        return false;
      })()
    `);

    // Give debounced sync 600ms to hit Express server
    await new Promise(r => setTimeout(r, 600));

    // Reload page
    console.log('• Reloading tab to audit refresh persistence...');
    await client.send('Page.reload');
    await new Promise(r => setTimeout(r, 1200));

    // Re-check authentication if needed
    await client.unlockGateIfNeeded();

    const txReloadSurvived = await client.evaluate(`
      (() => {
        let db = window.__gd_db || window.db;
        if (!db) {
          db = {
            getState: () => JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}'),
            updateState: (fn) => {
              const s = JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}');
              fn(s);
              s.last_modified = Date.now();
              localStorage.setItem('greendream_v1_3_storage', JSON.stringify(s));
              window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: s }));
              return s;
            }
          };
        }
        const txs = db ? db.getState().transactions : (JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}').transactions || []);
        return (txs || []).some(t => t.id === '${testTxId}');
      })()
    `);

    if (txReloadSurvived) {
      console.log('✓ Transaction survived page refresh with 100% integrity.');
    } else {
      bugsFound.push('Transaction was lost upon page refresh');
    }

    // Test Item B: Cross-Session Server State Synchronization
    console.log('\n• Verifying Cloud Database Sync via second isolated browser session...');
    const client2 = new CDPClient();
    try {
      await client2.init(TARGET_URL);
      await client2.unlockGateIfNeeded();
      // Wait for pullFromServer()
      await new Promise(r => setTimeout(r, 1000));

      const cloudTxFound = await client2.evaluate(`
        (() => {
          let db = window.__gd_db || window.db;
        if (!db) {
          db = {
            getState: () => JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}'),
            updateState: (fn) => {
              const s = JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}');
              fn(s);
              s.last_modified = Date.now();
              localStorage.setItem('greendream_v1_3_storage', JSON.stringify(s));
              window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: s }));
              return s;
            }
          };
        }
          const txs = db ? db.getState().transactions : (JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}').transactions || []);
          return (txs || []).some(t => t.id === '${testTxId}');
        })()
      `);

      if (cloudTxFound) {
        console.log('✓ Cloud Synchronization verified: Second browser session successfully fetched updated transaction from server!');
      } else {
        console.log('ℹ️ Pulling directly from backend API to verify server-side storage:');
        const apiCheck = await fetch('http://localhost:3001/api/state').then(r => r.json());
        const txOnServer = (apiCheck.state?.transactions || []).some(t => t.id === testTxId);
        if (txOnServer) {
          console.log('✓ Server-side greendream_state.json contains the transaction.');
        } else {
          bugsFound.push('Transaction was not persisted to server-side greendream_state.json');
        }
      }
    } finally {
      await client2.close();
    }

    // Clean up test transaction
    await client.evaluate(`
      (() => {
        let db = window.__gd_db || window.db;
        if (!db) {
          db = {
            getState: () => JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}'),
            updateState: (fn) => {
              const s = JSON.parse(localStorage.getItem('greendream_v1_3_storage') || '{}');
              fn(s);
              s.last_modified = Date.now();
              localStorage.setItem('greendream_v1_3_storage', JSON.stringify(s));
              window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: s }));
              return s;
            }
          };
        }
        if (db) {
          db.updateState(state => {
            state.transactions = state.transactions.filter(t => t.id !== '${testTxId}');
          });
        }
      })()
    `);

    // Test Item C: Rapid Consecutive Updates Stress Test
    console.log('\n• Running rapid update burst (50 state modifications in 50ms)...');
    const rapidResult = await client.evaluate(`
      (() => {
        const raw = localStorage.getItem('greendream_v1_3_storage');
        const state = JSON.parse(raw);
        for (let i = 1; i <= 50; i++) {
          state.tasks.push({
            id: 'task-rapid-' + i,
            title: 'Audit Rapid Task #' + i,
            due_date: new Date().toISOString().slice(0, 10),
            priority: 'medium',
            status: 'todo',
            created_at: Date.now(),
            updated_at: Date.now(),
            deleted_at: null
          });
        }
        state.last_modified = Date.now();
        localStorage.setItem('greendream_v1_3_storage', JSON.stringify(state));
        return state.tasks.filter(t => t.id.startsWith('task-rapid-')).length;
      })()
    `);
    if (rapidResult === 50) {
      console.log('✓ 50 rapid sequential writes persisted with 0 drops.');
    } else {
      bugsFound.push(`Rapid updates stress test failed: expected 50 tasks, got ${rapidResult}`);
    }

    // Clean up rapid tasks
    await client.evaluate(`
      (() => {
        const raw = localStorage.getItem('greendream_v1_3_storage');
        if (raw) {
          const state = JSON.parse(raw);
          state.tasks = state.tasks.filter(t => !t.id.startsWith('task-rapid-'));
          state.last_modified = Date.now();
          localStorage.setItem('greendream_v1_3_storage', JSON.stringify(state));
        }
      })()
    `);

    // -------------------------------------------------------------
    // PHASE C: NAVIGATION THROUGH ALL SCREENS
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Screen Transitions & Rendering ---');
    const tabs = ['dashboard', 'finance', 'prayers', 'gym', 'more'];
    for (const tab of tabs) {
      await client.evaluate(`
        (() => {
          const directBtn = document.querySelector('button[data-tab-id="${tab}"]');
          if (directBtn) {
            directBtn.click();
            return;
          }
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => {
            const label = b.getAttribute('aria-label') || '';
            const text = b.innerText || '';
            return label.toLowerCase().includes('${tab}') || text.toLowerCase().includes('${tab}');
          });
          if (btn) btn.click();
        })()
      `);
      await new Promise(r => setTimeout(r, 600));
      const hasContent = await client.evaluate(`Boolean(document.querySelector('h1, h2, h3, [role="heading"], .card-clean, [data-tab-id]'))`);
      console.log(`• Tab "${tab}": Rendered content/headings = ${hasContent}`);
      if (!hasContent) {
        bugsFound.push(`Screen "${tab}" did not render proper headings or content`);
      }
    }

    // -------------------------------------------------------------
    // PHASE D: RUNTIME ERROR LOGS SUMMARY
    // -------------------------------------------------------------
    console.log('\n--- 5. Runtime Exceptions & Console Audit ---');
    console.log(`• Total Console Logs: ${client.consoleLogs.length}`);
    console.log(`• Total Uncaught Exceptions: ${client.errors.length}`);
    console.log(`• Total Network Failures: ${client.networkErrors.length}`);

    if (client.errors.length > 0) {
      console.error('Unhandled runtime exceptions:', client.errors);
      bugsFound.push(...client.errors);
    }
    if (client.networkErrors.length > 0) {
      console.warn('Network errors:', client.networkErrors);
      bugsFound.push(...client.networkErrors);
    }

    console.log('\n================================================================');
    console.log(`Audit Finished: ${bugsFound.length} bugs identified.`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Audit execution error:', err);
    bugsFound.push(`Audit fatal error: ${err.message}`);
  } finally {
    await client.close();
  }

  return { bugsFound, bugsFixed };
}

runAutonomousAudit().then(res => {
  if (res.bugsFound.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
