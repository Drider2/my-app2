const fs = require('fs');
let code = fs.readFileSync('src/services/storage.ts', 'utf8');

// 1. Add last_modified to StorageState
const targetInterface = "  customLiabilities?: BalanceSheetLiability[];\r\n}";
const targetInterfaceLF = "  customLiabilities?: BalanceSheetLiability[];\n}";

const newInterface = `  customLiabilities?: BalanceSheetLiability[];
  last_modified?: number;
}`;

if (code.includes(targetInterface)) {
  code = code.replace(targetInterface, newInterface.replace(/\n/g, '\r\n'));
} else if (code.includes(targetInterfaceLF)) {
  code = code.replace(targetInterfaceLF, newInterface);
} else {
  console.error('Target interface not found');
}

// 2. Update LocalStorageDB class implementation
const oldClass = `class LocalStorageDB {
  private state: StorageState;
  private saveTimeout: any = null;
  private isSavePending: boolean = false;

  constructor() {
    this.state = this.loadState();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushPendingSave());
      window.addEventListener('pagehide', () => this.flushPendingSave());
    }
  }`;

const newClass = `class LocalStorageDB {
  private state: StorageState;
  private saveTimeout: any = null;
  private isSavePending: boolean = false;
  private syncStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private syncError: string | null = null;
  private lastSavedAt: number | null = null;
  private savedStatusTimeout: any = null;
  private serverSyncTimeout: any = null;

  constructor() {
    this.state = this.loadState();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushPendingSave());
      window.addEventListener('pagehide', () => this.flushPendingSave());

      // Cross-tab synchronization via storage event
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const remoteState = JSON.parse(e.newValue);
            if (remoteState && typeof remoteState === 'object' && remoteState.version) {
              this.state = remoteState;
              this.notifyListeners();
            }
          } catch {}
        }
      });

      // Refocus sync: pull latest changes whenever user switches back to tab
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.pullFromServer();
        }
      });

      // Initial cloud database sync
      setTimeout(() => {
        this.pullFromServer();
      }, 80);
    }
  }`;

const normOldClass = oldClass.replace(/\r\n/g, '\n');
const normNewClass = newClass.replace(/\r\n/g, '\n');
const normCode = code.replace(/\r\n/g, '\n');

if (normCode.includes(normOldClass)) {
  code = normCode.replace(normOldClass, normNewClass);
} else {
  console.error('Old class header not found');
}

// 3. Update sync methods and flushPendingSave
const oldSyncSection = `  public flushPendingSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (!this.isSavePending) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.isSavePending = false;
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  private scheduleSave(): void {
    this.isSavePending = true;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.flushPendingSave();
    }, 150);
  }

  private saveState(state: StorageState, immediate: boolean = false): void {
    this.state = state;
    if (immediate) {
      this.isSavePending = true;
      this.flushPendingSave();
    } else {
      this.scheduleSave();
    }
  }

  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notifyListeners(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('Error in storage subscriber:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: { timestamp: Date.now() } }));
    }
  }

  public getState(): StorageState {
    return this.state;
  }

  public updateState(updater: (draft: StorageState) => void): StorageState {
    updater(this.state);
    // 1. Immediate synchronous persistence to localStorage
    this.saveState(this.state, true);
    // 2. Notify all UI subscribers
    this.notifyListeners();
    // 3. Asynchronously sync to server/backend persistent store
    this.syncToServer();
    return this.state;
  }

  public syncToServer(): void {
    if (typeof window === 'undefined') return;
    try {
      const serverUrl = window.location.origin;
      fetch(\`\${serverUrl}/api/state\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: this.state })
      }).catch(() => {
        // Quietly fallback to localStorage on static or standalone environments
      });
    } catch {}
  }`;

const newSyncSection = `  public resolveServerUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:3001';
    if (window.location.protocol === 'capacitor:' || (window.location.hostname === 'localhost' && window.location.port === '')) {
      return 'http://10.0.2.2:3001';
    }
    return window.location.origin;
  }

  public getSyncStatus(): { status: 'idle' | 'saving' | 'saved' | 'error'; error: string | null; lastSavedAt: number | null } {
    return {
      status: this.syncStatus,
      error: this.syncError,
      lastSavedAt: this.lastSavedAt,
    };
  }

  public setSyncStatus(status: 'idle' | 'saving' | 'saved' | 'error', errorMessage?: string): void {
    this.syncStatus = status;
    this.syncError = errorMessage || null;
    if (status === 'saved') {
      this.lastSavedAt = Date.now();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('greendream_sync_status', {
        detail: { status, error: this.syncError, lastSavedAt: this.lastSavedAt }
      }));
    }
  }

  public flushPendingSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.serverSyncTimeout) {
      clearTimeout(this.serverSyncTimeout);
      this.serverSyncTimeout = null;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.isSavePending = false;
      // Guaranteed background sync on page close/navigate using sendBeacon
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const serverUrl = this.resolveServerUrl();
        const payload = JSON.stringify({ state: this.state });
        navigator.sendBeacon(\`\${serverUrl}/api/state\`, payload);
      }
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  private scheduleSave(): void {
    this.isSavePending = true;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.flushPendingSave();
    }, 150);
  }

  private saveState(state: StorageState, immediate: boolean = false): void {
    this.state = state;
    if (immediate) {
      this.isSavePending = true;
      this.flushPendingSave();
    } else {
      this.scheduleSave();
    }
  }

  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notifyListeners(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('Error in storage subscriber:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: { timestamp: Date.now() } }));
    }
  }

  public getState(): StorageState {
    return this.state;
  }

  public updateState(updater: (draft: StorageState) => void): StorageState {
    updater(this.state);
    this.state.last_modified = Date.now();
    // 1. Immediate synchronous persistence to localStorage
    this.saveState(this.state, true);
    // 2. Notify all UI subscribers
    this.notifyListeners();
    // 3. Debounced asynchronous sync with visible feedback and automatic retry
    this.scheduleServerSync();
    return this.state;
  }

  private scheduleServerSync(): void {
    this.setSyncStatus('saving');
    if (this.serverSyncTimeout) {
      clearTimeout(this.serverSyncTimeout);
    }
    this.serverSyncTimeout = setTimeout(() => {
      this.syncToServer();
    }, 300);
  }

  public async pullFromServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const serverUrl = this.resolveServerUrl();
      const res = await fetch(\`\${serverUrl}/api/state\`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.success || !data.state) return false;

      const serverState: StorageState = data.state;
      const localModified = this.state.last_modified || 0;
      const serverModified = serverState.last_modified || 0;

      const isLocalFresh = (!this.state.transactions || this.state.transactions.length === 0) &&
                           (!this.state.journalEntries || this.state.journalEntries.length === 0);

      const isServerHasData = (serverState.transactions && serverState.transactions.length > 0) ||
                              (serverState.journalEntries && serverState.journalEntries.length > 0) ||
                              (serverState.habits && serverState.habits.length > 0);

      if (serverModified > localModified || (isLocalFresh && isServerHasData)) {
        console.log('[SYNC] Server state is newer or local is fresh; synchronizing to local state');
        this.state = serverState;
        this.saveState(serverState, true);
        this.notifyListeners();
        this.setSyncStatus('saved');
        if (this.savedStatusTimeout) clearTimeout(this.savedStatusTimeout);
        this.savedStatusTimeout = setTimeout(() => this.setSyncStatus('idle'), 2000);
        return true;
      } else if (localModified > serverModified && !isLocalFresh) {
        console.log('[SYNC] Local state is newer; synchronizing to cloud database');
        this.syncToServer();
      }
      return true;
    } catch (err: any) {
      console.warn('[SYNC] Server pull failed:', err.message);
      return false;
    }
  }

  public async syncToServer(retryCount = 0): Promise<void> {
    if (typeof window === 'undefined') return;
    this.setSyncStatus('saving');
    try {
      const serverUrl = this.resolveServerUrl();
      const res = await fetch(\`\${serverUrl}/api/state\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: this.state })
      });
      if (!res.ok) {
        throw new Error(\`Server returned HTTP \${res.status}\`);
      }
      const data = await res.json();
      if (data.success) {
        this.setSyncStatus('saved');
        if (this.savedStatusTimeout) clearTimeout(this.savedStatusTimeout);
        this.savedStatusTimeout = setTimeout(() => {
          if (this.syncStatus === 'saved') {
            this.setSyncStatus('idle');
          }
        }, 2500);
      } else {
        throw new Error(data.error || 'Sync rejected');
      }
    } catch (err: any) {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => this.syncToServer(retryCount + 1), delay);
      } else {
        console.warn('[SYNC] Sync failed after retries:', err.message);
        this.setSyncStatus('error', err.message || 'Network sync failed');
      }
    }
  }`;

const normOldSync = oldSyncSection.replace(/\r\n/g, '\n');
const normNewSync = newSyncSection.replace(/\r\n/g, '\n');

if (code.includes(normOldSync)) {
  code = code.replace(normOldSync, normNewSync);
} else {
  console.error('Old sync section not found');
}

fs.writeFileSync('src/services/storage.ts', code, 'utf8');
console.log('Successfully upgraded src/services/storage.ts');
