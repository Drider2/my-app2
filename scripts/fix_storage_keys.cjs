const fs = require('fs');
const path = require('path');

// 1. Update storage.ts
const storageFile = path.join(__dirname, '..', 'src', 'services', 'storage.ts');
let storageContent = fs.readFileSync(storageFile, 'utf8');

// Add legacy migration to loadState
const targetLoad = `  private loadState(): StorageState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);`;

const replacementLoad = `  private loadState(): StorageState {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw && typeof localStorage !== 'undefined') {
        const legacyRaw = localStorage.getItem('greendream_state_v1');
        if (legacyRaw) {
          raw = legacyRaw;
          try { localStorage.setItem(STORAGE_KEY, legacyRaw); } catch {}
        }
      }`;

if (storageContent.includes(targetLoad)) {
  storageContent = storageContent.replace(targetLoad, replacementLoad);
}

// Add importState method to LocalStorageDB
const targetResetClean = `  public resetToCleanState(): StorageState {
    const clean = getCleanInitialState();
    this.state = clean;
    this.saveState(clean, true);
    this.notifyListeners();
    return clean;
  }`;

const replacementResetClean = `  public resetToCleanState(): StorageState {
    const clean = getCleanInitialState();
    this.state = clean;
    this.saveState(clean, true);
    this.notifyListeners();
    return clean;
  }

  public importState(newState: StorageState): StorageState {
    this.state = newState;
    this.saveState(newState, true);
    this.notifyListeners();
    this.syncToServer();
    return newState;
  }`;

if (storageContent.includes(targetResetClean)) {
  storageContent = storageContent.replace(targetResetClean, replacementResetClean);
}

fs.writeFileSync(storageFile, storageContent, 'utf8');
console.log('storage.ts updated with importState and legacy key fallback!');

// 2. Update SettingsScreen.tsx
const settingsFile = path.join(__dirname, '..', 'src', 'screens', 'SettingsScreen.tsx');
let settingsContent = fs.readFileSync(settingsFile, 'utf8');

const targetImport = `    } else if (destructiveActionType === 'import' && pendingBackupData) {
      Haptics.success();
      localStorage.setItem('greendream_state_v1', JSON.stringify(pendingBackupData));
      window.location.reload();
    }`;

const replacementImport = `    } else if (destructiveActionType === 'import' && pendingBackupData) {
      Haptics.success();
      db.importState(pendingBackupData);
      window.location.reload();
    }`;

if (settingsContent.includes(targetImport)) {
  settingsContent = settingsContent.replace(targetImport, replacementImport);
}

fs.writeFileSync(settingsFile, settingsContent, 'utf8');
console.log('SettingsScreen.tsx updated with db.importState()!');
