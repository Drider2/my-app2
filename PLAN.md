# GreenDream Life Management Web Application

## Core Web Application & State {#app-core}
tech: React 18 + Vite + Tailwind CSS + LocalStorage & Backend State Sync
files: [src/App.tsx, src/main.tsx, src/index.css, src/services/storage.ts, src/services/authService.ts]
- [x] Responsive layout with fluid scaling & viewport meta {#core-responsive}
  by: antigravity
- [x] Multi-resolution switcher for desktop (Full, Small, Portrait) {#core-resolution}
  by: antigravity
- [x] Password authentication gate (greendream2026) {#core-auth}
  by: antigravity
- [x] Local-first persistent storage with immediate save {#core-storage}
  by: antigravity
- [x] Live agent activity monitoring via Agenttrail {#core-agenttrail}
  by: antigravity
- [x] Worldwide live HTTPS hosting with HTTP/2 tunnel supervisor {#core-hosting}
  by: antigravity

## Secure AI Backend & State Server {#backend-server}
tech: Express 5 + AES-256-GCM Vault + Google Gemini Proxy
files: [server/index.js, server/data/**]
links: [app-core]
- [x] REST API endpoints for state persistence (/api/state) {#api-state}
  by: antigravity
- [x] Google Gemini AI streaming proxy (/api/ai/chat) {#api-ai}
  by: antigravity
- [x] Encrypted server-side API key vault with AES-256-GCM {#api-vault}
  by: antigravity

## Daily Habits & Streak Tracking {#habits-dashboard}
tech: Flame streak algorithms + Habit completion metrics + Daily scoring
files: [src/screens/DashboardScreen.tsx, src/screens/FlameScreen.tsx, src/screens/HabitsScreen.tsx, src/services/flame/**]
needs: [app-core]
- [x] Habit streak visualization with visual flames {#habits-flame}
  by: antigravity
- [x] Daily routine completion tracking & progress rings {#habits-progress}
  by: antigravity

## Personal Finance & Net Worth Desk {#finance-desk}
tech: Multi-currency balance ledger + Expense categories + Net Worth chart
files: [src/screens/FinanceScreen.tsx, src/services/financeService.ts, src/services/netWorthService.ts, src/services/zakatService.ts]
needs: [app-core]
- [x] Real-time expense & revenue transaction ledger {#finance-ledger}
  by: antigravity
- [x] Net worth timeline & multi-account balances {#finance-networth}
  by: antigravity
- [x] Zakat and recurring subscription calculations {#finance-zakat}
  by: antigravity

## Gym & Hypertrophy Training Suite {#gym-suite}
tech: 1RM calculations + Volume tracking + Mifflin-St Jeor TDEE & Macros
files: [src/screens/GymScreen.tsx, src/services/gymDerivedStats.ts, src/services/hypertrophyService.ts, src/services/macroService.ts]
needs: [app-core]
- [x] Workout logs, set-rep progression & 1RM calculator {#gym-progression}
  by: antigravity
- [x] TDEE maintenance & macronutrient splits (Protein/Fats/Carbs) {#gym-tdee}
  by: antigravity
- [x] Rest timer with audio feedback & presets {#gym-rest-timer}
  by: antigravity

## Calendar & Smart Task Planner {#calendar-tasks}
tech: FullCalendar / Custom schedule engine + Smart date/time parser
files: [src/screens/CalendarScreen.tsx, src/services/taskParserService.ts]
needs: [app-core]
- [x] Daily & monthly task schedule calendar {#calendar-view}
  by: antigravity
- [x] Natural language smart task parser {#task-parser}
  by: antigravity

## Spiritual Desk: Prayers & Fasting {#prayers-desk}
tech: Calculation algorithms + Qibla compass + Fasting schedule
files: [src/screens/PrayersScreen.tsx, src/services/prayerService.ts, src/services/fastingService.ts, src/services/quranService.ts]
needs: [app-core]
- [x] 5 Daily prayer times with countdown {#prayers-times}
  by: antigravity
- [x] Fasting schedule & Ramadan tracker {#prayers-fasting}
  by: antigravity

## Life Maintenance & Vehicle Fleet {#maintenance-fleet}
tech: Odometer tracking + Service intervals + Fuel log records
files: [src/screens/MaintenanceScreen.tsx, src/services/maintenanceService.ts, src/services/vehicleService.ts]
needs: [app-core]
- [x] Scheduled home & personal maintenance checklists {#maint-checklist}
  by: antigravity
- [x] Vehicle service reminders & fuel mileage logs {#maint-vehicle}
  by: antigravity

## Responsive Multi-Layout System (Phone, Wide, Tablet) {#responsive-layouts}
tech: Custom Tailwind Variants + CSS Logical Properties + Responsive Rail & Dialogs + Zero-FOUC Inline Pre-paint
files: [src/hooks/useLayout.ts, src/services/layoutService.ts, src/components/layout/Page.tsx, src/components/Navigation.tsx, src/screens/SettingsScreen.tsx, index.html, tailwind.config.js, src/index.css]
needs: [app-core]
- [x] Three layout sizes: phone (≤430px), wide (600-760px), tablet (≥1000-1280px) {#layout-sizes}
  by: antigravity
- [x] Display size setting in Settings screen (Auto | Phone | Wide | Tablet) {#layout-setting}
  by: antigravity
- [x] Zero-FOUC pre-paint script in index.html setting data-layout before paint {#layout-prepint}
  by: antigravity
- [x] Left navigation rail (96px, with '+' button at top) on tablet; floating bottom nav on phone/wide {#layout-navigation}
  by: antigravity
- [x] Full RTL support with CSS logical properties (start/end, ms/me) {#layout-rtl}
  by: antigravity
- [x] Dynamic downgrade detection with localized warning notice {#layout-downgrade}
  by: antigravity
- [x] Centered modal dialog transformation on wide & tablet for action sheets {#layout-dialogs}
  by: antigravity

## decisions
- 2026-11-10: Restored clean web-v1.3.1 branch with solid surfaces and zero-blur modern design
- 2026-11-10: Configured Express persistent JSON file database at server/data/greendream_state.json
- 2026-11-13: Integrated Agenttrail local observability on port 5330 to provide real-time visual project tracking
- 2026-11-14: Implemented three selectable layout sizes (Phone, Wide, Tablet) with pre-paint zero-flash data-layout init, navigation rail for tablet, and centered dialogs for sheets.
- 2026-11-14: Installed knip skill and CLI (v5.88.1) for automated dead code, unused file, and dependency pruning.
- 2026-11-14: Executed knip dead code audit; pruned 14 unused/orphaned files and removed 2 unused dependencies (clsx, tailwind-merge) with 100% build and test pass.
