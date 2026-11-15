# Autonomous Continuous Improvement & Testing Log — GreenDream v1.3.1

- **START_TIME:** `2026-11-15 04:58:00 +01:00`
- **CURRENT_TIME:** `2026-11-15 05:11:00 +01:00`
- **TARGET_TASK:** Comprehensive Persistence & Saving Fix
- **LIVE_URL:** `https://greendream-app-live.netlify.app`
- **LOCAL_URL:** `http://localhost:5173`
- **SCREENSHOTS_DIRECTORY:** `c:\Users\yacine\OneDrive\Desktop\habit tracer\phone_tests\`

---

## Phase 1: Connect & Observe Problem
1. **Device / Mobile Simulation Test:**
   - Launched concurrent backend (port 3001) and frontend Vite server (port 5173).
   - Observed behavior in mobile viewport (390x844).
   - Initial screenshot saved: `phone_tests/01_initial_screen.png`.
   - Changed accent color to Lime pulse in Settings; UI displayed pending draft: `phone_tests/02_value_changed.png`.
   - Navigating away prompted discard or reverted visual styles upon unmount: `phone_tests/03_after_switch_screen.png`.
   - Inspected network: `sendBeacon` requests failed with status 0 due to payload size exceeding browser 64 KB limit. Standard fetch requests succeeded, but rapid screen transitions or backgrounding aborted debounced saves.

---

## Phase 2: Root Cause Analysis (Exact Files & Lines)

### ROOT CAUSE 1: Unsaved Draft Architecture in `SettingsScreen.tsx`
- **File:** `src/screens/SettingsScreen.tsx`
- **Lines:** 87–90, 160–185, 221–230, 256–265, 1801–1812
- **Reason:** Every setting change (theme, accent, language, fontSize, displayMode, modules, journal lock, daily progress, voice, flame) was only held in component local state (`draftSnapshot`). It was never committed to persistent storage (`db.updateState`) upon change. When the user switched screens, tapped back, or backgrounded the app, `SettingsScreen` unmounted or triggered `handleDiscardAndLeave()`, calling `applyTheme(savedSnapshot.theme, true)` and discarding all user edits. On mobile, the confirmation button in the bottom sheet was also partially occluded by the fixed bottom navigation bar.

### ROOT CAUSE 2: Server State Overwrite of Active Local Data in `pullFromServer()`
- **File:** `src/services/storage.ts`
- **Lines:** 1802–1818
- **Reason:** In `pullFromServer()`, line 1802 defined:
  `const isLocalFresh = (!this.state.transactions || this.state.transactions.length === 0) && (!this.state.journalEntries || this.state.journalEntries.length === 0);`
  If a user has 0 transactions and 0 journal entries (e.g. only testing habits, gym, prayers, or settings on mobile or after a fresh start), `isLocalFresh` evaluated to `true`. When `visibilitychange` (app resume/backgrounding) or the 80ms startup sync executed `pullFromServer()`, the condition `serverModified > localModified || (isLocalFresh && isServerHasData)` evaluated to `true` and silently OVERWROTE the user's local state with the server's state (`this.state = serverState; this.saveState(serverState, true);`). Any local edits were wiped out and reverted.

### ROOT CAUSE 3: Cancellation of Server Sync & Payload Oversize in `flushPendingSave()`
- **File:** `src/services/storage.ts`
- **Lines:** 1695–1718
- **Reason:** When the user switched screens, navigated away, or backgrounded the app, `flushPendingSave()` called `clearTimeout(this.serverSyncTimeout)`. This canceled the scheduled `syncToServer()`. It attempted a fallback with `navigator.sendBeacon(`${serverUrl}/api/state`, payload)`. However, `navigator.sendBeacon` has a strict 64 KB limit in mobile Chromium/WebView, causing the beacon request to fail with status 0 (cancelled/aborted). Because the debounced `syncToServer()` was canceled and `sendBeacon` failed, the server never received the update. When the user returned to the app, `pullFromServer()` pulled the old server state and reverted the UI.

### ROOT CAUSE 4: Unconditional `db.updateState()` in `AppLifecycleLoop` Triggering Full App Remounts
- **File:** `src/services/appLifecycleLoop.ts`
- **Lines:** 29–37, 52–54, 165–227
- **Reason:** `AppLifecycleLoop` runs every 30 seconds and on every window focus and `visibilitychange` (app resume). Inside `runCycle()`, line 165 executed `db.updateState(draft => { ... })` unconditionally, even when no sanitization was required (`stateModified === false`). Every call to `db.updateState()` called `notifyListeners()`, which dispatched the `greendream_state_updated` event. In `src/App.tsx`, `window.addEventListener('greendream_state_updated', () => setRefreshKey(prev => prev + 1))` caught this and incremented `refreshKey`, forcing a full re-render and unmount of the entire screen component tree, wiping any in-progress input state or active modals every 30 seconds and on resume.

### ROOT CAUSE 5: Self-Referential Event Cascades in `storage.ts`
- **File:** `src/services/storage.ts`
- **Lines:** 1407–1418, 1756
- **Reason:** Line 1756 dispatches `greendream_state_updated` on every `notifyListeners()`. Line 1407 in the same file listened to `greendream_state_updated`, re-parsed localStorage, and called `this.scheduleServerSync()`, triggering duplicate sync timeouts and race conditions with in-flight state.

---

## Phase 3: Action Plan
1. **Immediate Auto-Save for Settings (`SettingsScreen.tsx`):**
   - Save every setting change immediately: when theme, accent, language, fontSize, displayMode, module switches, journal lock, flame, or voice are touched, commit directly to `db.updateState()` and trigger persistent storage sync.
   - Remove discard modal on navigation away so settings never revert.
   - Keep undo toast for 10 seconds if user wishes to revert.
2. **Robust Storage & Sync Protocol (`storage.ts`):**
   - Track `hasUnsyncedLocalChanges`. Never allow `pullFromServer()` to overwrite local state if local changes have not been confirmed by server or if local `last_modified` >= server `last_modified`.
   - Remove the unsafe `isLocalFresh` heuristic that wiped out non-financial data.
   - In `flushPendingSave()`, immediately trigger synchronous storage save and flush `syncToServer()` using reliable `fetch` with `keepalive: true` instead of oversized `sendBeacon`.
   - Resolve proper mobile and local server endpoints: keep `SaveFeedbackBadge` updated with `Saving...`, `Saved`, and clear error with auto-retry.
3. **AppLifecycleLoop Sanitization (`appLifecycleLoop.ts`):**
   - Only call `db.updateState()` if `stateModified === true`. Never dispatch notifications if nothing changed.
4. **Remove Self-Referential Event Listener in `storage.ts`:**
   - Prevent internal feedback loop where `notifyListeners()` triggered another `greendream_state_updated` read and sync.
