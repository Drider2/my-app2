# GreenDream Money Tab (Finance & Wealth) Rebuild Plan (MONEY_PLAN.md)

## 1. Executive Summary & Design Vision

Rebuild the **Money** tab (`FinanceScreen` / Finance & Wealth) of GreenDream to match the glass-cyan dark interface specified in the mockups. The redesign introduces a precision financial command center inspired by high-end glass aesthetics:
- **Left-Balance Hero Card**: Dominant 40px balance typography with accent glow, hatched unspent progress bar, and neutral cycle comparison delta chip.
- **Segmented Spending Gauge**: High-precision SVG half-circle arc with category color progression, drop-shadow glow, 45° hatched remainder pattern, center expenditure callout, and circular category cycling navigation.
- **Plan Expenses Card**: Glowing completion percentage with hatched progress indicator, daily limit allowance, and forward liquid cash runway days.
- **Expenses History Card**: Clean transaction stream with color-coded category dots, quiet currency labels, direct detail openers, and text-based share triggers.
- **Category Tiles**: 2x2 grid containing the top 3 spending categories plus a prominent glowing primary Income tile.
- **Daily Limit Calendar**: 7-column calendar grid showing exact spending discipline (solid accent for within limit, 1.5px dashed white ring for over limit, hatched circle for no data, white ring for today/selected) with interactive per-category expenditure bars.

### Core Architecture & Absolute Rules
1. **Visual Layer & Read-Only Derived Selectors ONLY**: Zero modifications to underlying stored schema or models (`transactions`, `categories`, `savingsGoals`, `savingsAccount`, `salarySetting`, `salaryAllocation`, `recurringRules`, `loans`). Integer minor-unit arithmetic preserved across all layers.
2. **Design System Tokens & Zero Bad Colors**: 100% styled via CSS variables (`--accent`, `--accent-light`, `--accent-rgb`, `--track`, `--hairline`, `--text-1`, `--text-2`, `--text-3`). Zero hardcoded hex or rgba accents. **NO red or green**: over-limit states are presented in high-contrast crisp **WHITE** (dashed white ring, white-tinted chip). Spending increases use neutral accent/white treatments, never guilt-inducing red.
3. **Ergonomics & Accessibility**: Sentence case typography, minimum 12px font size, $\ge 44\text{px}$ touch target hit areas, safe-area awareness, full RTL mirroring (`ms/me/ps/pe`, `start/end`, flipped gauges, reversed calendars).
4. **Precision Currency Formatting**: Minor units ($1\,\text{DA} = 100\,\text{minor units}$) converted to display with integer rounding at display time only. Amounts display `settings.currency_label` in a quieter, smaller style.
5. **Trilingual Localization**: Complete string coverage across English (EN), French (FR), and Arabic (AR) with proper plural rules (`Intl.PluralRules`).
6. **Module Isolation**: When `modules.finance === false`, the Money tab and all its widgets are completely hidden from the navigation, Today glance, and Hermes tools.
7. **Bottom Clearances**: Floating action button (`+`) and bottom navigation bar clearance: `paddingBottom: calc(var(--nav-total-clearance, 80px) + 70px + env(safe-area-inset-bottom, 0px))`.

---

## 2. Phase 0 Audit Findings

### 2.1 Current Files & Components Inventory

| File Path | Role | Reusability Plan |
|:---|:---|:---|
| [`src/screens/FinanceScreen.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/screens/FinanceScreen.tsx) | Main Finance tab container (2,204 lines) | Rebuild Overview tab with mockup cards; retain Ledger, Goals, and Loans sub-views in unified glass styling; remove old "Edit" widget mode from UI. |
| [`src/services/financeService.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/financeService.ts) | Cash balance, salary, and savings service | Reuse double-entry cash balance formulas; fix fresh install 75,000 DA hardcoded baseline for new users. |
| [`src/services/allocationService.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/allocationService.ts) | Income allocation & Sadaqah tracker | Fix bug where 0/0 target returned 100% progress. |
| [`src/services/loanService.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/loanService.ts) | Money lent & repayment tracking | Reuse `getSummary()` and `getBorrowerProfiles()`. |
| [`src/services/quickExpenseService.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/quickExpenseService.ts) | Quick expense shortcuts & today spending | Reuse `getTodaySpendingSummary()` for daily spending. |
| [`src/services/dailyProgressService.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/dailyProgressService.ts) | Daily discipline & spending allowance | Reuse `spending_allowance_minor` as the single source of truth for daily limit. |
| [`src/services/forecastService.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/forecastService.ts) | Cash runway & projection service | Reuse daily burn rate math and projection points for secondary widgets. |
| [`src/services/spendingAnalyticsService.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/spendingAnalyticsService.ts) | Spending trend analytics & metrics | Reuse category spending metrics and breakdown helpers. |
| [`src/services/calculation.ts`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/services/calculation.ts) | General calculations | Update `calculateMonthSpending` to properly respect cycle boundaries. |
| [`src/components/charts/AreaCurve.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/components/charts/AreaCurve.tsx) | Kinetic SVG curve chart | Use for secondary Runway Forecast card. |
| [`src/components/charts/PillBars.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/components/charts/PillBars.tsx) | Segmented pill bars | Use for secondary weekly spending comparison. |
| [`src/components/charts/TrendCompare.tsx`](file:///c:/Users/yacine/OneDrive/Desktop/habit%20tracer/src/components/charts/TrendCompare.tsx) | Period-over-period comparison | Use for secondary month vs last month trend. |

### 2.2 Data Shapes & Schema Verification

```ts
// Transaction: All monetary amounts stored as integer minor units (e.g., 10000 = 100.00 DA)
interface Transaction extends BaseEntity {
  type: 'income' | 'expense' | 'transfer' | 'loan_given' | 'loan_repayment';
  amount_minor: number;
  local_date: string; // 'YYYY-MM-DD'
  category_id?: UUID | null;
  goal_id?: UUID | null;
  loan_id?: UUID | null;
  borrower_name?: string | null;
  note?: string;
  recurring_id?: UUID | null;
  maintenance_item_id?: UUID | null;
}

// Category with budget limit
interface Category extends BaseEntity {
  name: string;
  icon: string;
  amount_minor: number; // Allocated monthly budget limit
  rollover: 'reset' | 'carryover';
  alert_threshold?: number;
  color?: string;
}

// Savings Goal
interface SavingsGoal extends BaseEntity {
  name: string;
  opening_minor: number;
  target_minor: number;
  current_saved_minor?: number;
  target_date?: string;
  monthly_contribution_minor?: number;
  status?: 'active' | 'paused' | 'archived';
  category_id?: UUID | null;
}

// Loan / Money Lent
interface Loan extends BaseEntity {
  borrower_name: string;
  amount_minor: number;
  local_date: string;
  expected_repayment_date?: string;
  status: 'not_repaid' | 'partially_repaid' | 'fully_repaid';
  repayments: LoanRepayment[];
}

// Salary Setting
interface SalarySetting {
  monthly_salary_minor: number;
  payment_day: number;
  effective_from: string;
  history: SalaryHistoryEntry[];
}

// Salary Allocation Plan
interface SalaryAllocation {
  savings_amount_minor: number;
  personal_amount_minor: number;
  car_amount_minor: number;
  gym_amount_minor: number;
  shopping_amount_minor: number;
  other_amount_minor: number;
  updated_at: number;
}
```

### 2.3 Existing Metric Computation Analysis (Single Source of Truth)

1. **Available Cash**:
   - Source: `FinanceService.getCashBalanceSummary().availableCashMinor`.
   - Formula: `(baselineChecking + totalIncome + totalLoansRepaid) - totalExpenses - totalLoansGiven - netSavingsTransferred`.
   - Audit Note: In `financeService.ts:546`, `baselineChecking = 7500000` (75,000 DA) is hardcoded. This explains why clean installs showed 75,000 DA. We will make `baselineChecking` default to 0 for fresh installs while preserving existing user data.
2. **Monthly Inflows**:
   - Source: `FinanceService.getIncomeSummary(yearMonthStr).monthTotalMinor` (and `cashSummary.monthIncomeMinor`).
   - Formula: Sum of non-deleted `income` transactions matching the cycle period.
3. **Cycle Spending**:
   - Source: `calculateMonthSpending(state.transactions, state.settings.budget_cycle_start_day)`.
   - Audit Note: We must ensure cycle spending strictly considers transactions within `[cycleStart, cycleEnd]`, matching the Today screen.
4. **Burn Rate & Runway**:
   - Current Source: `forecastService.ts:112` and `spendingAnalyticsService.ts:326`.
   - Target Formula:
     $$\text{burnPerDay} = \frac{\text{spentInCycle}}{\max(1, \text{elapsedDays})}$$
     $$\text{runwayDays} = \begin{cases} \lfloor \frac{\text{availableCash}}{\text{burnPerDay}} \rfloor & \text{if } \text{burnPerDay} > 0 \\ \text{null (display ``-")} & \text{if } \text{burnPerDay} = 0 \end{cases}$$
5. **Safe to Spend Today & Daily Limit**:
   - Source: `DailyProgressService.getDailyProgress(today).spending_allowance_minor` (default 50,000 minor = 500 DA).
   - Today screen checks: `todaySpending.totalMinor > dailyProgress.spending_allowance_minor ? '! Exceeded' : allowance - todaySpending`.
   - The new Money tab reuses `DailyProgressService.getDailyProgress(today).spending_allowance_minor` as the benchmark for daily calendar discipline.

### 2.4 Investigation of Seed Values & Bugs

1. **75,000 DA on Fresh Install**:
   - Located in `src/services/financeService.ts:546`:
     ```ts
     const baselineChecking = 7500000; // 75,000 DA opening cash balance
     ```
   - For fresh installs, `transactions` is empty, so `availableCash` immediately evaluated to 75,000 DA.
   - Solution: In `FinanceService.getCashBalanceSummary()`, if `state.transactions.length === 0` and `state.settings.onboarded !== true`, baseline checking is 0. If an existing user has transactions or explicit savings/starting balance, legacy baseline is respected.
2. **"Charity allocation shows 100% at 0 of 0 DA"**:
   - Located in `src/services/allocationService.ts:305-307`:
     ```ts
     const monthlyProgressPct = monthlyTargetMinor > 0
       ? Math.min(100, Math.round((monthlyContributedMinor / monthlyTargetMinor) * 100))
       : 100; // <-- BUG
     ```
   - When target is 0, it returned `100`.
   - Fix: Return `0` (or "Not set") when `monthlyTargetMinor === 0`.
3. **Monthly Spending Budget Setting**:
   - Does a global monthly budget setting exist? **No.** `AppSettings` only holds `budget_cycle_start_day`, `currency_label`, etc.
   - Hierarchy decision for `cycleBudget`:
     1. Sum of active categories with budget limits: $\sum \text{category.amount\_minor}$.
     2. Discretionary salary budget: $\text{monthly\_salary\_minor} - \text{savings\_amount\_minor}$.
     3. If neither is set, return `null` and display the secondary "Set a budget" call to action.

---

## 3. Selector Specifications (`src/services/moneyDerivedStats.ts`)

All selectors will be pure functions, fully typed, memoized by data versions and cycle offset.

### 3.1 Selector List & Signatures

```ts
// 1. Cycle Range & Navigation
export interface CycleRange {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  label: string;     // e.g. 'November' or 'Nov 5 - Dec 4'
  daysInCycle: number;
  elapsedDays: number;
  isCurrent: boolean;
}
export function getCycleRange(offset: number, cycleStartDay: number, referenceDate?: string): CycleRange;
export function getAvailableCycles(cycleStartDay: number, count?: number, referenceDate?: string): { offset: number; label: string; range: CycleRange }[];

// 2. Budget & Balance
export function calculateCycleBudget(categories: Category[], salarySetting?: SalarySetting, salaryAllocation?: SalaryAllocation): number | null;
export function calculateLeftBalance(transactions: Transaction[], savingsTransactions: SavingsTransaction[], savingsAccount?: SavingsAccount, baselineChecking?: number): number;

// 3. Spending, Inflows & Velocity
export function calculateSpentInCycle(transactions: Transaction[], range: CycleRange): number;
export function calculateIncomeInCycle(transactions: Transaction[], range: CycleRange): number;

export interface CategorySpendItem {
  categoryId: string;
  name: string;
  icon: string;
  color?: string;
  spentMinor: number;
  percentageOfBudget: number; // spend / cycleBudget
  transactionCount: number;
}
export function calculateSpentByCategory(transactions: Transaction[], categories: Category[], range: CycleRange, cycleBudget: number | null): {
  topCategories: CategorySpendItem[];
  otherCategory: CategorySpendItem | null;
  totalSpentMinor: number;
};

export function calculateBurnAndRunway(spentMinor: number, availableCashMinor: number, elapsedDays: number): {
  burnPerDayMinor: number;
  runwayDays: number | null;
};

// 4. Gauge Arcs & Remainder
export interface GaugeSegment {
  categoryId: string;
  name: string;
  spentMinor: number;
  sharePercent: number; // Relative to cycleBudget
  strokeColor: string;
  glow: boolean;
}
export function calculateGaugeSegments(categorySpends: CategorySpendItem[], otherSpend: CategorySpendItem | null, cycleBudget: number | null, totalSpentMinor: number): {
  segments: GaugeSegment[];
  remainderPercent: number; // Floored at 0
  isOverBudget: boolean;
  overByMinor: number;
};

// 5. Delta vs Last Cycle
export interface DeltaChipValue {
  type: 'new' | 'increase' | 'decrease' | 'neutral' | 'none';
  percentage: number;
  label: string;
}
export function calculateVsLastCycle(transactions: Transaction[], currentRange: CycleRange, prevRange: CycleRange, elapsedDays: number): DeltaChipValue;

// 6. Plan Expenses Progress
export interface PlanProgressResult {
  plannedMinor: number;
  paidMinor: number;
  percentage: number; // 0 if planned is 0
  hasPlannedExpenses: boolean;
  dailyLimitMinor: number;
  runwayDays: number | null;
}
export function calculatePlanProgress(recurringRules: RecurringRule[], maintenanceItems: MaintenanceItem[], salaryAllocation: SalaryAllocation | undefined, transactions: Transaction[], range: CycleRange, availableCashMinor: number, burnPerDayMinor: number, dailyLimitMinor: number): PlanProgressResult;

// 7. Daily Limit Calendar & Day Status
export type DayStatus = 'future' | 'no_data' | 'within' | 'over' | 'today';
export interface DayStatusResult {
  date: string;
  dayNumber: number;
  status: DayStatus;
  isToday: boolean;
  totalSpentMinor: number;
  dailyLimitMinor: number;
  overByMinor: number;
  underByMinor: number;
  categorySpends: { categoryId: string; name: string; spentMinor: number; percentageOfLimit: number }[];
}
export function calculateCycleCalendarDays(range: CycleRange, transactions: Transaction[], categories: Category[], dailyLimitMinor: number, todayStr: string, weekStartDay: 0 | 1): DayStatusResult[];

// 8. Recent Expenses & Top Category Tiles
export interface RecentExpenseItem {
  id: string;
  name: string;
  amountMinor: number;
  formattedAmount: string;
  categoryName: string;
  categoryColor: string;
  categoryIndex: number;
  dateLabel: string; // 'Today', 'Yesterday', or 'Oct 24'
  rawDate: string;
  rawTransaction: Transaction;
}
export function getRecentExpenses(transactions: Transaction[], categories: Category[], limit?: number, todayStr?: string): RecentExpenseItem[];
export function getTopCategoryTiles(categorySpends: CategorySpendItem[], allCategories: Category[], limit?: number): { id: string; name: string; icon: string; spentMinor: number }[];

// 9. Precision Integer Money Formatter
export interface FormattedMoney {
  numberStr: string;   // '12,450'
  currencyStr: string; // 'DA'
  isNegative: boolean;
  fullStr: string;     // '12,450 DA'
}
export function formatMoneyParts(amountMinor: number, currencyLabel?: string, locale?: string): FormattedMoney;
```

---

## 4. UI Architecture & Glass Primitives (`src/components/finance/`)

### 4.1 New Mockup Components

1. **`LeftBalanceHeroCard.tsx`**:
   - Label: `"Left balance"` 12px `var(--text-2)`.
   - Amount: 40px/500 tabular nums with text-shadow `0 0 18px rgb(var(--accent-rgb)/.7)` and quiet currency.
   - Hatched Track: `repeating-linear-gradient(135deg, rgba(255,255,255,.2) 0 3px, rgba(255,255,255,.04) 3px 7px)`.
   - Fill: `linear-gradient(90deg, var(--accent), var(--accent-light))` with `0 0 14px rgb(var(--accent-rgb)/.6)` glow.
   - Footer: `"{spent} of {budget} spent"` with `{spent}` in pure white and neutral AccentChip `"{n}% vs last month"` (arrow-up-right).
   - Fallback: If budget is null, hide bar and show secondary `"Set a budget"` button.

2. **`SegmentedSpendingGaugeCard.tsx`**:
   - Half-circle SVG arc (viewBox `0 0 240 135`, radius 90, stroke 16, butt caps, arc length 100 with 2-unit gaps).
   - Segments:
     - 1st category: `var(--accent)` with drop-shadow glow.
     - 2nd category: `rgb(var(--accent-rgb)/.55)`.
     - 3rd category: `rgb(var(--accent-rgb)/.30)`.
     - "Other": `rgb(var(--accent-rgb)/.15)`.
     - Remainder: 45° SVG pattern hatch (`6x6`, rotated 45°, 2.2px lines `rgba(255,255,255,.4)`).
   - Center: `"Total spent"` 12px `var(--text-3)`, amount 26px/500 with glow.
   - Bottom cycling pill: 36px prev button, current category name + amount, 36px next button with accent gradient + glow. Tapping name navigates to Ledger filtered by category.
   - Over-budget state: arc fully filled, no hatch, **1.5px dashed white ring** overlay on arc, white-tinted chip `"Over by {x}"` (**NO red**).
   - Share button: 36px glass button invoking Web Share API or copying summary to clipboard.

3. **`PlanProgressCard.tsx`**:
   - Card styling: `linear-gradient(145deg, rgb(var(--accent-rgb)/.22), rgb(var(--accent-rgb)/.05))` with 1px `rgb(var(--accent-rgb)/.35)` border.
   - Header: `"{n}%"` 44px/500 with glow on start side; `"Plan expenses"` 12px `var(--text-2)` on end side.
   - Bar: Hatched progress bar height 20.
   - Footer: `"Daily limit {x}"` and `"Runway {n} days"` (hidden if null).
   - Empty state: `"No planned expenses yet"`, 0% progress (never 100% for 0/0).

4. **`ExpensesHistoryCard.tsx`**:
   - Header: `"Expenses history"` 16px/500 + `"See all >"` link (switches to Ledger).
   - Rows (last 2 expenses): 1px `rgba(255,255,255,.08)` divider, 22px amount, category dot with glow on 1st, category name, date label, and 36px glass icon buttons (share and edit/open transaction modal).

5. **`TopCategoryTiles.tsx`**:
   - 2x2 grid, height 92, radius 18, gap 10.
   - 3 GlassTiles with top categories (category icon, 32px glass arrow button, 15px/500 name).
   - 1 Income tile filled with `linear-gradient(135deg, var(--accent), var(--accent-light))`, `var(--on-accent)` text, glow `0 0 24px rgb(var(--accent-rgb)/.5)`, white arrow button.
   - Tapping navigates to Ledger with corresponding filter applied.

6. **`DailyLimitCalendarCard.tsx`**:
   - Header: `"Daily limit calendar"` 16px/500 + cycle label.
   - 7-column grid with weekday headers, round cells (aspect-ratio 1, 12px numbers).
   - Cell states:
     - `within`: solid `var(--accent)` fill with dark contrast text and glow.
     - `over`: **1.5px dashed white ring** with white text, transparent fill.
     - `no_data`: hatched circle (`repeating-linear-gradient`).
     - `future`: plain with `var(--text-3)` text.
     - `today`: status styling + thin white ring.
     - `selected`: white ring (`box-shadow: 0 0 0 2px var(--bg), 0 0 0 3.5px #fff`) + glow.
   - Selected-day panel below: date title 22px/500, status chip (`"Over by {x}"` white chip or `"Within limit"` AccentChip), and category hatched bars (height 12) showing breakdown. Day with no data: `"No spending recorded"`.

7. **`CyclePickerSheet.tsx`**:
   - Glass bottom sheet presenting the last 12 budget cycles with active checkmark, date bounds, and quick selection.

### 4.2 Retained Sub-Views & Extended Sections

- **Ledger (Transactions)**:
  - Filter chips row (`All`, `Income`, `Expenses`, `Categories`), search input, day-grouped transactions with sticky glass date headers and day totals, transaction rows with edit/delete actions, applied filter badge.
- **Goals**:
  - GlassCards featuring `RingProgress` (gradient accent stroke, glow), target/saved amounts, target date chip, and `"Add funds"` glass button.
- **Loans (Money Lent)**:
  - GlassCards displaying borrower name, total lent, hatched progress bar for repaid portion, due date chip (white-tinted when overdue, never red), and `"Record repayment"` action.
- **Secondary Overview Widgets**:
  - Monthly Inflows, Sadaqah / Charity Allocation, Runway Forecast with `AreaCurve`, Weekly Spending with `PillBars`, and Period Comparison with `TrendCompare`.

---

## 5. Phased Execution Roadmap

- [x] **Phase 0: Audit & Architecture Plan** &larr; *(Current turn)*
  - Completed codebase audit, identified seed constants and calculation sources, authored `/docs/MONEY_PLAN.md`.
- [ ] **Phase 1: Pure Derived Selectors & Unit Tests**
  - Create `src/services/moneyDerivedStats.ts` with all memoized selectors.
  - Create `tests/moneyDerivedStats.test.mjs` with extensive test suites (boundaries, leap years, DST, empty states, 1,000+ tx benchmarks, parity assertions).
- [ ] **Phase 2: Overview Structure & Glass Components**
  - Implement components in `src/components/finance/`:
    `LeftBalanceHeroCard.tsx`, `SegmentedSpendingGaugeCard.tsx`, `PlanProgressCard.tsx`, `ExpensesHistoryCard.tsx`, `TopCategoryTiles.tsx`, `DailyLimitCalendarCard.tsx`, `CyclePickerSheet.tsx`, `HatchedBar.tsx`.
  - Rebuild `src/screens/FinanceScreen.tsx` Overview tab and header.
- [ ] **Phase 3: Motion & Kinetic Transitions**
  - Apply 60ms card stagger, 900ms rolling number count-ups, SVG stroke-dasharray gauge animation, 12ms calendar cell stagger, respect `prefers-reduced-motion`.
- [ ] **Phase 4: Empty States, Edge Cases & Data Seeding Fix**
  - Fix fresh install 75,000 DA seed in `financeService.ts`.
  - Fix Charity 0/0 100% bug in `allocationService.ts`.
  - Verify clean slate empty states across all cards.
- [ ] **Phase 5: Sub-Views Alignment (Ledger, Goals, Loans)**
  - Re-skin Ledger, Goals, and Loans sub-views with glass tokens and clean actions.
- [ ] **Phase 6: Consistency with Today & Hermes**
  - Synchronize Today screen money glance and Hermes read tools (`get_spending`, `get_budget_status`, `get_goals`, `get_loans`).
- [ ] **Phase 7: Full QA Loop, APK Build & Telegram Dispatch**
  - Execute full test suite, verify RTL and 4 accents, build Android debug APK, dispatch to Telegram bot, update documentation.

---

## 6. Assumptions & Risk Mitigations

1. **Budget Definition**: Since there is no single `monthly_budget_minor` in `AppSettings`, `cycleBudget` derives first from category limits, second from salary minus savings, and falls back to `null` with a prompt to configure budgets.
2. **Double-Entry Cash Parity**: `availableCashMinor` formula in `financeService.ts` remains the master source of truth. New installs start at 0, while users with saved data retain their balances.
3. **White Over-Limit Discipline**: Absolutely no `#EF4444` or red tokens used for over-budget or spending increases. High-contrast white borders, dashed rings, and white-tinted chips ensure clear visual hierarchy without stress.
4. **Performance**: Calculations for calendar days and category shares are memoized by `(cycleOffset, transactions.length, categories.length, lastModified)` so that switching cycles or typing remains sub-16ms.
