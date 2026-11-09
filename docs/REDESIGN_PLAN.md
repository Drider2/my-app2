# GreenDream UI/UX Redesign & Modernization Plan (REDESIGN_PLAN.md)

**App**: GreenDream (React 18 + Tailwind CSS + Capacitor Android)  
**Target Architecture**: Local-first, Offline-first, Mobile-first (360px–430px), Trilingual (EN, FR, AR with full RTL)  
**Core Goal**: Clear, modern, minimalist interface that is easy to understand at a glance, eliminating visual noise without rewriting business logic.

---

## 1. Executive Summary & Problem Diagnosis

A comprehensive audit of the current codebase revealed severe UX friction and visual clutter:

1. **Dashboard Overload**:
   - The "Today" dashboard (`DashboardScreen.tsx`) contains 17 widgets (9 full-width) crammed into a monolithic scroll, creating decision fatigue and lag.
2. **Hidden Core Modules**:
   - The bottom bar previously obscured 6 fundamental modules (Prayers, Calendar, Journal, Maintenance, Weekly Review, Settings) behind scattered sub-menus.
3. **Typography Degradation**:
   - Over **300+** arbitrary pixel font declarations (`text-[10px]`, `text-[9px]`, `text-[8px]`), plus uppercase tags and wide letter-spacing (`tracking-wide`, `tracking-widest`) that impair readability and break Arabic cursive script.
4. **Visual Noise & Card Boxing**:
   - Over **1,200+** border classes, **200+** drop-shadow declarations, and heavy nested radii causing visual exhaustion where every single label sits trapped in a bordered box.
5. **Theme Fragmentation**:
   - 45+ `!important` CSS overrides patching three conflicting themes (Light, Dark, Matte Carbon). Inconsistent brand identity.
6. **Mobile Connectivity Flaw**:
   - AI Chat historically defaulted to `http://localhost:3001`, causing immediate connection failures on real mobile devices without clear setup guidance.

---

## 2. Hard Constraints & Safety Guarantees

| Constraint | Enforcement Strategy |
| :--- | :--- |
| **1. Data Integrity** | `StorageState` schema in `src/types/index.ts` and `src/services/storage.ts` remains 100% untouched. All existing user data, transactions, workout logs, habits, and settings load seamlessly. |
| **2. Trilingual i18n** | All user-facing copy uses `useTranslation()` / `t()`. Every new string key is added across English (`en`), French (`fr`), and Arabic (`ar`). Zero hardcoded text. |
| **3. True RTL (Arabic)** | Use Tailwind CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`) instead of physical left/right. Validate mirrored layouts in RTL. |
| **4. Zero Lost Features** | Every single existing tool and feature remains 100% reachable. Features are reorganized logically, never deleted. |
| **5. Mobile Ergonomics** | Tailored for 360–430px viewports, safe-area aware (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`), minimum 44px tap targets for all touch controls. |
| **6. 100% Offline** | Self-hosted typography (`Inter` + `Noto Sans Arabic` in `public/fonts/`). Zero Google Fonts or external CDN dependencies. |

---

## 3. Master File Map & Component Inventory

### 3.1 Design System & Tokens (Phase 1)
- [`src/index.css`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/index.css): Clean out `!important` patches and theme overrides. Establish semantic CSS custom variables for Light and Dark themes with ONE soft green accent (`#5E8C61` Light / `#8FBF93` Dark). Set surface tones, borders, and text tokens.
- [`tailwind.config.js`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/tailwind.config.js): Define strict 4-tier typography scale (`caption: 12px`, `body: 15px`, `heading: 18px`, `title: 24px`) plus metric displays (`metric: 32px`, `metric-sm: 28px`), 8px spacing grid, and standard border radii (`card: 16px`, `control: 12px`).
- [`src/services/themeService.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/themeService.ts): Retain only Light, Dark, and System (following device preference). Migrate any legacy `'matte'`, `'carbon'`, or `'matte-carbon'` to `'dark'`.
- [`src/services/fontSizeService.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/fontSizeService.ts): Enforce minimum 12px floor across all scale presets.

### 3.2 Navigation & Quick-Add (Phase 2)
- [`src/components/Navigation.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/components/Navigation.tsx): Replace floating pill with a standard docked bottom navigation bar of 5 visible tabs: **Today** (`dashboard`), **Money** (`finance`), **Prayer** (`prayers`), **Body** (`gym`), **More** (`more`). Active filled icon + label in accent color, labels always visible.
- [`src/components/AddActionSheet.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/components/AddActionSheet.tsx): Streamline quick-add modal to the 6 core actions: Add expense, Record income, Log weight, Discipline check-in, New goal, Add reminder.
- [`src/App.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/App.tsx): Route navigation across the 5 primary tabs and handle single "+" quick-add action.

### 3.3 Today Dashboard (Phase 3)
- [`src/screens/DashboardScreen.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/screens/DashboardScreen.tsx): Streamline from 17 scattered widgets to max 5 essential, high-signal blocks:
  1. **Header**: Greeting + localized date + single daily-score ring (`x/10`) + quick-add "+" action.
  2. **Prayers**: 5 clean status dots (done/not done) + next prayer name and countdown time (tap navigates to Prayer tab).
  3. **Agenda**: Unified chronological feed of tasks, calendar events, and today's workout session with direct check-off (friendly line empty state).
  4. **Money Glance**: Large "Safe to spend today" figure + 3-4 quick-expense chips (tap navigates to Money tab).
  5. **Weekly Review Card**: Dynamic card displayed only on the user's weekly review day or when overdue.
- Remove noisy dashboard widget edit mode (drag/resize/toggle) without deleting underlying widgets.

### 3.4 Deep Module Tabs (Phase 4)
- [`src/screens/FinanceScreen.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/screens/FinanceScreen.tsx): Hero balance and month summary on top + clean segmented control (`Overview` | `Transactions` | `Goals` | `Loans`). Max 1 chart per screen section.
- [`src/screens/PrayersScreen.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/screens/PrayersScreen.tsx): Next prayer countdown hero + 5 prayer cards + discipline score history.
- [`src/screens/GymScreen.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/screens/GymScreen.tsx): Active program & routine status hero + segmented control (`Today's Workout` | `Weekly Program` | `Bodyweight`).

### 3.5 More Screen & Settings (Phase 5)
- [`src/screens/MoreScreen.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/screens/MoreScreen.tsx): Refactor into a clean grouped list (icon + label + chevron) organizing Calendar, Journal, Maintenance, Weekly Review, AI Assistant, Sober Flame, and Settings.
- [`src/screens/SettingsScreen.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/screens/SettingsScreen.tsx): Group settings into 4 clean sections: Appearance (Theme, Language, Text Size), General (Name, Currency, Weight Unit), Finance (Budget Cycle, Allocation), Data (Backup, Export, Reset with confirmation).
- [`src/screens/AssistantScreen.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/screens/AssistantScreen.tsx) & [`src/components/ai/`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/components/ai/): Show helpful setup card if no Gemini API key or backend is configured; make `backend_url` editable.

### 3.6 Brand, Assets & Polish (Phase 6)
- [`public/icon.svg`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/public/icon.svg) & Android res icons: Minimalist soft green sprout/leaf logo on clean neutral background.
- Manifest and HTML theme color meta tags.
- Transitions (150-200ms), Lucide 1.75 stroke consistency, WCAG AA contrast (>= 4.5:1).

---

## 4. Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **1. Unintentional Schema Mutation** | User data corruption or loss across app upgrades. | **Zero Schema Changes**: Strictly consume and preserve existing types in `src/types/index.ts` and `src/services/storage.ts`. All changes are UI/UX presentation and reorganization. |
| **2. Arabic RTL Breakage** | Broken alignment, misaligned arrows, clipped text in Arabic. | Eliminate physical CSS classes (`left`, `right`, `ml`, `mr`, `pl`, `pr`). Use logical Tailwind utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`). Test each phase in Arabic. |
| **3. Feature Occlusion / Missing Screens** | User cannot reach existing tools (e.g., Maintenance, Journal). | All screens mapped into the new 5-tab structure: primary daily functions in first 4 tabs; secondary modules in the organized More tab. |
| **4. Offline Regression** | App fails to render typography or starts making external requests. | Self-hosted WOFF2 fonts bundled in `public/fonts/`. No external CDN links. Local-first storage and Capacitor native HTTP plugins. |
| **5. Build & Compilation Failures** | TypeScript or Vite bundling breaks during refactoring. | Run `npx tsc --noEmit`, `npm test`, and `npm run build` after every single phase before reporting. |

---

## 5. Execution Phasing Roadmap

- **Step 0**: Project scan, architecture audit, author `/docs/REDESIGN_PLAN.md` & wait for user's explicit "go".
- **Phase 1**: Design tokens, soft green palette (`#5E8C61` / `#8FBF93`), strict 4-tier type scale, 8px grid, border/shadow removal, theme cleanup.
- **Phase 2**: Navigation bar (5 docked tabs) and single streamlined "+" Quick-Add modal.
- **Phase 3**: New Today screen (5 high-signal blocks: Header, Prayers, Agenda, Money Glance, Weekly Review).
- **Phase 4**: Reorganized Money, Prayer, and Body tabs with segmented controls and max 1 chart per section.
- **Phase 5**: Clean grouped More screen, 4-section Settings, and gracefully handled AI Chat setup.
- **Phase 6**: App brand identity (sprout icon, Android adaptive icons), subtle motion, WCAG AA accessibility, and production APK compilation.
