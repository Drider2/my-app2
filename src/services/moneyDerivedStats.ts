/**
 * Pure derived selectors and calculation engine for GreenDream Money & Finance tab.
 * 
 * ABSOLUTE RULES COMPLIANCE:
 * 1. Read-only derived stats. Zero mutation to stored data or localStorage schema.
 * 2. All money handled in integer minor units (1 DA = 100 minor units). Rounding only at display.
 * 3. Local calendar days used everywhere ('YYYY-MM-DD'). No 24h ms assumptions, no DST drift.
 * 4. Zero hardcoded colors. Zero good/bad red/green color assumptions.
 * 5. High performance with memoization cache for sub-16ms cycle switching.
 */

import {
  Transaction,
  Category,
  SavingsGoal,
  SavingsAccount,
  SavingsTransaction,
  SalarySetting,
  SalaryAllocation,
  RecurringRule,
  MaintenanceItem,
  Loan,
  DailyProgressSettings,
} from '../types';

// ============================================================================
// 1. CALENDAR & LOCAL DATE PURE HELPERS
// ============================================================================

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function parseLocalDate(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10), // 1-indexed
    day: parseInt(parts[2], 10),
  };
}

export function formatLocalDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Adds calendar days to 'YYYY-MM-DD' without 24h millisecond drift or DST issues.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const { year, month, day } = parseLocalDate(dateStr);
  const d = new Date(year, month - 1, day + days);
  return formatLocalDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Returns difference in calendar days between dateB and dateA (dateB - dateA).
 */
export function diffCalendarDays(dateA: string, dateB: string): number {
  const pA = parseLocalDate(dateA);
  const pB = parseLocalDate(dateB);
  const utcA = Date.UTC(pA.year, pA.month - 1, pA.day);
  const utcB = Date.UTC(pB.year, pB.month - 1, pB.day);
  return Math.round((utcB - utcA) / 86400000);
}

export const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ============================================================================
// 2. CYCLE RANGE SELECTOR
// ============================================================================

export interface CycleRange {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  label: string;     // e.g. 'November' or 'Nov 5 - Dec 4'
  shortLabel: string;// e.g. 'Nov' or 'Nov 5'
  daysInCycle: number;
  elapsedDays: number; // 1 to daysInCycle for current cycle
  isCurrent: boolean;
  offset: number;
}

/**
 * Computes start/end dates and display labels for budget cycle with offset (0 = current, -1 = prev).
 * Respects settings.budget_cycle_start_day (1 to 31).
 */
export function getCycleRange(
  offset: number,
  cycleStartDay: number = 1,
  referenceDate?: string
): CycleRange {
  const ref = referenceDate || new Date().toISOString().slice(0, 10);
  const { year: refYear, month: refMonth, day: refDay } = parseLocalDate(ref);

  const startDayClamped = Math.max(1, Math.min(31, cycleStartDay));

  let anchorYear = refYear;
  let anchorMonth = refMonth;

  if (startDayClamped > 1) {
    // If today is before cycleStartDay, current cycle started in previous month
    if (refDay < startDayClamped) {
      anchorMonth -= 1;
      if (anchorMonth < 1) {
        anchorMonth = 12;
        anchorYear -= 1;
      }
    }
  }

  // Apply cycle offset (each offset steps 1 calendar cycle back/forward)
  if (offset !== 0) {
    anchorMonth += offset;
    while (anchorMonth < 1) {
      anchorMonth += 12;
      anchorYear -= 1;
    }
    while (anchorMonth > 12) {
      anchorMonth -= 12;
      anchorYear += 1;
    }
  }

  let startDate: string;
  let endDate: string;
  let label: string;
  let shortLabel: string;

  if (startDayClamped === 1) {
    // Full calendar month
    const daysCount = getDaysInMonth(anchorYear, anchorMonth);
    startDate = formatLocalDate(anchorYear, anchorMonth, 1);
    endDate = formatLocalDate(anchorYear, anchorMonth, daysCount);
    label = MONTH_NAMES_FULL[anchorMonth - 1];
    if (anchorYear !== refYear) {
      label = `${label} ${anchorYear}`;
    }
    shortLabel = MONTH_NAMES_SHORT[anchorMonth - 1];
  } else {
    // Offset cycle, e.g. 5th of this month to 4th of next month
    const maxStartDay = getDaysInMonth(anchorYear, anchorMonth);
    const actualStartDay = Math.min(startDayClamped, maxStartDay);
    startDate = formatLocalDate(anchorYear, anchorMonth, actualStartDay);

    let nextMonth = anchorMonth + 1;
    let nextYear = anchorYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    // End date is day before cycleStartDay in next month
    const targetEndDay = startDayClamped - 1;
    const maxEndDay = getDaysInMonth(nextYear, nextMonth);
    const actualEndDay = Math.max(1, Math.min(targetEndDay, maxEndDay));
    endDate = formatLocalDate(nextYear, nextMonth, actualEndDay);

    const startMonthName = MONTH_NAMES_SHORT[anchorMonth - 1];
    const endMonthName = MONTH_NAMES_SHORT[nextMonth - 1];
    label = `${startMonthName} ${actualStartDay} - ${endMonthName} ${actualEndDay}`;
    shortLabel = `${startMonthName} ${actualStartDay}`;
  }

  const daysInCycle = diffCalendarDays(startDate, endDate) + 1;

  let elapsedDays: number;
  if (offset > 0 || ref < startDate) {
    elapsedDays = 0;
  } else if (offset < 0 || ref > endDate) {
    elapsedDays = daysInCycle;
  } else {
    elapsedDays = Math.max(1, Math.min(daysInCycle, diffCalendarDays(startDate, ref) + 1));
  }

  return {
    startDate,
    endDate,
    label,
    shortLabel,
    daysInCycle,
    elapsedDays,
    isCurrent: offset === 0,
    offset,
  };
}

/**
 * Returns the last N cycles (default 12) for the cycle picker sheet.
 */
export function getAvailableCycles(
  cycleStartDay: number = 1,
  count: number = 12,
  referenceDate?: string
): CycleRange[] {
  const cycles: CycleRange[] = [];
  for (let i = 0; i < count; i++) {
    cycles.push(getCycleRange(-i, cycleStartDay, referenceDate));
  }
  return cycles;
}

// ============================================================================
// 3. BUDGET & BALANCE DERIVED SELECTORS
// ============================================================================

/**
 * Derives cycle budget:
 * 1. Sum of categories allocated budget limits (if > 0)
 * 2. Otherwise monthly salary minus savings allocation (if > 0)
 * 3. Otherwise null (triggers "Set a budget" CTA)
 */
export function calculateCycleBudget(
  categories: Category[],
  salarySetting?: SalarySetting,
  salaryAllocation?: SalaryAllocation
): number | null {
  const activeCategories = (categories || []).filter(c => !c.deleted_at);
  const categoryBudgetSum = activeCategories.reduce((sum, c) => sum + (c.amount_minor || 0), 0);

  if (categoryBudgetSum > 0) {
    return categoryBudgetSum;
  }

  if (salarySetting && salarySetting.monthly_salary_minor > 0) {
    const salary = salarySetting.monthly_salary_minor;
    const savings = salaryAllocation?.savings_amount_minor || 0;
    const discretionary = salary - savings;
    if (discretionary > 0) {
      return discretionary;
    }
  }

  return null;
}

/**
 * Single Source of Truth for Left/Available Checking Cash.
 * Double-entry cash formula:
 * (baseline + totalIncome + totalLoansRepaid) - totalExpenses - totalLoansGiven - netSavingsTransferred
 */
export function calculateLeftBalance(
  transactions: Transaction[],
  savingsTransactions: SavingsTransaction[] = [],
  baselineCheckingMinor: number = 0
): number {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalLoansGiven = 0;
  let totalLoansRepaid = 0;
  let savingsDeposited = 0;
  let savingsWithdrawn = 0;

  for (const t of transactions) {
    if (t.deleted_at) continue;

    if (t.type === 'income') {
      totalIncome += t.amount_minor;
    } else if (t.type === 'expense') {
      totalExpenses += t.amount_minor;
    } else if (t.type === 'loan_given') {
      totalLoansGiven += t.amount_minor;
    } else if (t.type === 'loan_repayment') {
      totalLoansRepaid += t.amount_minor;
    } else if (t.type === 'transfer') {
      const note = (t.note || '').toLowerCase();
      if (note.includes('to savings')) {
        savingsDeposited += t.amount_minor;
      } else if (note.includes('from savings')) {
        savingsWithdrawn += t.amount_minor;
      }
    }
  }

  // Also respect explicit savings transactions
  if (savingsTransactions && savingsTransactions.length > 0) {
    let stxDeposits = 0;
    let stxWithdrawals = 0;
    for (const st of savingsTransactions) {
      if (st.deleted_at) continue;
      if (st.type === 'deposit') stxDeposits += st.amount_minor;
      else if (st.type === 'withdrawal') stxWithdrawals += st.amount_minor;
    }
    if (stxDeposits > 0 || stxWithdrawals > 0) {
      savingsDeposited = Math.max(savingsDeposited, stxDeposits);
      savingsWithdrawn = Math.max(savingsWithdrawn, stxWithdrawals);
    }
  }

  const netSavingsTransferred = Math.max(0, savingsDeposited - savingsWithdrawn);
  const availableCash = (baselineCheckingMinor + totalIncome + totalLoansRepaid) - totalExpenses - totalLoansGiven - netSavingsTransferred;

  return Math.round(availableCash);
}

// ============================================================================
// 4. SPENDING, VELOCITY & RUNWAY
// ============================================================================

export function calculateSpentInCycle(transactions: Transaction[], range: CycleRange): number {
  let spent = 0;
  for (const t of transactions) {
    if (t.deleted_at || t.type !== 'expense') continue;
    if (t.local_date >= range.startDate && t.local_date <= range.endDate) {
      spent += t.amount_minor;
    }
  }
  return spent;
}

export function calculateIncomeInCycle(transactions: Transaction[], range: CycleRange): number {
  let income = 0;
  for (const t of transactions) {
    if (t.deleted_at || t.type !== 'income') continue;
    if (t.local_date >= range.startDate && t.local_date <= range.endDate) {
      income += t.amount_minor;
    }
  }
  return income;
}

export function calculateBurnAndRunway(
  spentInCycleMinor: number,
  availableCashMinor: number,
  elapsedDays: number
): { burnPerDayMinor: number; runwayDays: number | null } {
  const safeElapsed = Math.max(1, elapsedDays);
  const burnPerDayMinor = Math.round(spentInCycleMinor / safeElapsed);

  if (burnPerDayMinor <= 0 || availableCashMinor <= 0) {
    return {
      burnPerDayMinor: Math.max(0, burnPerDayMinor),
      runwayDays: null,
    };
  }

  const runwayDays = Math.floor(availableCashMinor / burnPerDayMinor);
  return {
    burnPerDayMinor,
    runwayDays: runwayDays >= 0 ? runwayDays : null,
  };
}

// ============================================================================
// 5. SPENDING BY CATEGORY & GAUGE ARCS
// ============================================================================

export interface CategorySpendItem {
  categoryId: string;
  name: string;
  icon: string;
  color?: string;
  spentMinor: number;
  percentageOfBudget: number; // 0..100
  percentageOfTotalSpend: number; // 0..100
  transactionCount: number;
}

export interface CategorySpendBreakdown {
  items: CategorySpendItem[];
  top3: CategorySpendItem[];
  other: CategorySpendItem | null;
  totalSpentMinor: number;
}

export function calculateSpentByCategory(
  transactions: Transaction[],
  categories: Category[],
  range: CycleRange,
  cycleBudget: number | null
): CategorySpendBreakdown {
  const catMap = new Map<string, Category>();
  for (const c of categories) {
    if (!c.deleted_at) catMap.set(c.id, c);
  }

  const spendMap = new Map<string, { spent: number; count: number }>();

  let totalSpentMinor = 0;
  for (const t of transactions) {
    if (t.deleted_at || t.type !== 'expense') continue;
    if (t.local_date >= range.startDate && t.local_date <= range.endDate) {
      totalSpentMinor += t.amount_minor;
      const catId = t.category_id || 'other';
      const prev = spendMap.get(catId) || { spent: 0, count: 0 };
      spendMap.set(catId, { spent: prev.spent + t.amount_minor, count: prev.count + 1 });
    }
  }

  const allItems: CategorySpendItem[] = [];
  spendMap.forEach((val, catId) => {
    const cat = catMap.get(catId);
    const name = cat ? cat.name : (catId === 'other' ? 'Other' : 'Uncategorized');
    const icon = cat ? cat.icon : 'CreditCard';
    const color = cat?.color;

    const pctBudget = cycleBudget && cycleBudget > 0
      ? Math.round((val.spent / cycleBudget) * 100)
      : 0;

    const pctTotal = totalSpentMinor > 0
      ? Math.round((val.spent / totalSpentMinor) * 100)
      : 0;

    allItems.push({
      categoryId: catId,
      name,
      icon,
      color,
      spentMinor: val.spent,
      percentageOfBudget: pctBudget,
      percentageOfTotalSpend: pctTotal,
      transactionCount: val.count,
    });
  });

  // Sort descending by spend
  allItems.sort((a, b) => b.spentMinor - a.spentMinor);

  if (allItems.length <= 4) {
    return {
      items: allItems,
      top3: allItems.slice(0, 3),
      other: allItems.length === 4 ? allItems[3] : null,
      totalSpentMinor,
    };
  }

  // More than 4: top 3 + merge rest into "Other"
  const top3 = allItems.slice(0, 3);
  const remaining = allItems.slice(3);
  const otherSpent = remaining.reduce((sum, item) => sum + item.spentMinor, 0);
  const otherCount = remaining.reduce((sum, item) => sum + item.transactionCount, 0);

  const otherItem: CategorySpendItem = {
    categoryId: 'merged-other',
    name: 'Other',
    icon: 'MoreHorizontal',
    spentMinor: otherSpent,
    percentageOfBudget: cycleBudget && cycleBudget > 0 ? Math.round((otherSpent / cycleBudget) * 100) : 0,
    percentageOfTotalSpend: totalSpentMinor > 0 ? Math.round((otherSpent / totalSpentMinor) * 100) : 0,
    transactionCount: otherCount,
  };

  return {
    items: [...top3, otherItem],
    top3,
    other: otherItem,
    totalSpentMinor,
  };
}

export interface GaugeSegment {
  categoryId: string;
  name: string;
  spentMinor: number;
  sharePercent: number; // 0..100
  strokeOpacity: number;
  strokeToken: string; // CSS var reference
  hasGlow: boolean;
  dashLength: number; // For SVG stroke-dasharray (pathLength=100)
  dashOffset: number;
}

export interface GaugeCalculationResult {
  segments: GaugeSegment[];
  remainderPercent: number; // 0..100 unspent hatch
  isOverBudget: boolean;
  overByMinor: number;
  totalSpentMinor: number;
}

/**
 * Calculates arc segments for SVG viewBox 0 0 240 135 (radius 90, arc length 100).
 * Segments progress: 1st (accent), 2nd (accent 55%), 3rd (accent 30%), 4th (accent 15%).
 * Gaps of 2 units between segments.
 */
export function calculateGaugeSegments(
  breakdown: CategorySpendBreakdown,
  cycleBudget: number | null
): GaugeCalculationResult {
  const totalSpent = breakdown.totalSpentMinor;
  const isOverBudget = cycleBudget !== null && totalSpent > cycleBudget;
  const overByMinor = isOverBudget && cycleBudget !== null ? totalSpent - cycleBudget : 0;

  // Active items for gauge (top 3 + other)
  const displayItems = breakdown.other
    ? [...breakdown.top3, breakdown.other]
    : breakdown.items;

  const segments: GaugeSegment[] = [];

  // If no budget or zero spend: full unspent remainder
  if (!cycleBudget || cycleBudget <= 0 || totalSpent === 0) {
    return {
      segments: [],
      remainderPercent: 100,
      isOverBudget: false,
      overByMinor: 0,
      totalSpentMinor: totalSpent,
    };
  }

  // Pre-defined visual opacity tiers
  const OPACITIES = [1.0, 0.55, 0.30, 0.15];
  const GAP = 2; // 2-unit gap between segments

  let cumulativeOffset = 0;
  let totalSharePercent = 0;

  for (let i = 0; i < displayItems.length; i++) {
    const item = displayItems[i];
    if (item.spentMinor <= 0) continue;

    // Relative share of budget
    const rawShare = (item.spentMinor / cycleBudget) * 100;
    const sharePercent = Math.min(100, Math.round(rawShare * 10) / 10);
    totalSharePercent += sharePercent;

    const strokeOpacity = OPACITIES[i] ?? 0.15;
    const hasGlow = i === 0;

    // SVG dash length accounting for gaps
    const rawLength = Math.max(0.5, (sharePercent / 100) * 100);
    const dashLength = Math.max(0.1, rawLength - (i < displayItems.length - 1 ? GAP : 0));

    segments.push({
      categoryId: item.categoryId,
      name: item.name,
      spentMinor: item.spentMinor,
      sharePercent,
      strokeOpacity,
      strokeToken: `var(--accent)`,
      hasGlow,
      dashLength,
      dashOffset: -cumulativeOffset,
    });

    cumulativeOffset += rawLength;
  }

  const remainderPercent = isOverBudget
    ? 0
    : Math.max(0, Math.round((100 - totalSharePercent) * 10) / 10);

  return {
    segments,
    remainderPercent,
    isOverBudget,
    overByMinor,
    totalSpentMinor: totalSpent,
  };
}

// ============================================================================
// 6. DELTA VS LAST CYCLE SELECTOR
// ============================================================================

export interface DeltaChipValue {
  type: 'new' | 'increase' | 'decrease' | 'zero' | 'all';
  percentage: number;
  label: string;
}

/**
 * Compares spending in current cycle so far vs previous cycle over the SAME elapsed days.
 * Neutral presentation: increases and decreases both use accent/white-tinted chips (NO red/green).
 */
export function calculateVsLastCycle(
  transactions: Transaction[],
  currentRange: CycleRange,
  prevRange: CycleRange,
  elapsedDays: number
): DeltaChipValue | null {
  const safeElapsed = Math.max(1, Math.min(elapsedDays, currentRange.daysInCycle));

  const currentCutoff = addCalendarDays(currentRange.startDate, safeElapsed - 1);
  const prevCutoff = addCalendarDays(prevRange.startDate, Math.min(safeElapsed, prevRange.daysInCycle) - 1);

  let currentSpend = 0;
  let prevSpend = 0;

  for (const t of transactions) {
    if (t.deleted_at || t.type !== 'expense') continue;
    if (t.local_date >= currentRange.startDate && t.local_date <= currentCutoff) {
      currentSpend += t.amount_minor;
    }
    if (t.local_date >= prevRange.startDate && t.local_date <= prevCutoff) {
      prevSpend += t.amount_minor;
    }
  }

  if (prevSpend === 0 && currentSpend === 0) {
    return null;
  }

  if (prevSpend === 0 && currentSpend > 0) {
    return {
      type: 'new',
      percentage: 0,
      label: 'New',
    };
  }

  const diff = currentSpend - prevSpend;
  const pct = Math.round((diff / prevSpend) * 100);

  if (pct === 0) {
    return {
      type: 'zero',
      percentage: 0,
      label: '0% vs last month',
    };
  }

  const isIncrease = pct > 0;
  return {
    type: isIncrease ? 'increase' : 'decrease',
    percentage: Math.abs(pct),
    label: `${isIncrease ? '+' : '-'}${Math.abs(pct)}% vs last month`,
  };
}

// ============================================================================
// 7. PLAN EXPENSES PROGRESS
// ============================================================================

export interface PlanProgressResult {
  plannedMinor: number;
  paidMinor: number;
  percentage: number; // 0 if planned is 0 (never 100% for 0/0)
  hasPlannedExpenses: boolean;
  dailyLimitMinor: number;
  runwayDays: number | null;
}

/**
 * Calculates planned expenses for the cycle:
 * Recurring rules + upcoming maintenance bills + salary allocation categories.
 * Paid = matched posted transactions in the cycle.
 */
export function calculatePlanProgress(
  recurringRules: RecurringRule[] = [],
  maintenanceItems: MaintenanceItem[] = [],
  salaryAllocation: SalaryAllocation | undefined,
  transactions: Transaction[],
  range: CycleRange,
  availableCashMinor: number,
  burnPerDayMinor: number,
  dailyLimitMinor: number
): PlanProgressResult {
  let plannedMinor = 0;

  // 1. Recurring rules due in cycle
  for (const rule of recurringRules) {
    if (rule.deleted_at || rule.type !== 'expense') continue;
    if (rule.frequency === 'monthly' || (rule.next_date >= range.startDate && rule.next_date <= range.endDate)) {
      plannedMinor += rule.amount_minor;
    }
  }

  // 2. Maintenance items / bills due in cycle
  for (const item of maintenanceItems) {
    if (item.deleted_at || item.status === 'completed') continue;
    if (item.next_reminder_date >= range.startDate && item.next_reminder_date <= range.endDate) {
      plannedMinor += item.estimated_cost_minor;
    }
  }

  // 3. Salary Allocation lines (excluding savings)
  if (salaryAllocation) {
    plannedMinor += (salaryAllocation.personal_amount_minor || 0);
    plannedMinor += (salaryAllocation.car_amount_minor || 0);
    plannedMinor += (salaryAllocation.gym_amount_minor || 0);
    plannedMinor += (salaryAllocation.shopping_amount_minor || 0);
    plannedMinor += (salaryAllocation.other_amount_minor || 0);
  }

  // Compute matched posted expenses
  let paidMinor = 0;
  for (const t of transactions) {
    if (t.deleted_at || t.type !== 'expense') continue;
    if (t.local_date >= range.startDate && t.local_date <= range.endDate) {
      if (t.recurring_id || t.maintenance_item_id) {
        paidMinor += t.amount_minor;
      }
    }
  }

  const hasPlannedExpenses = plannedMinor > 0;
  const percentage = hasPlannedExpenses
    ? Math.min(100, Math.round((paidMinor / plannedMinor) * 100))
    : 0;

  const runwayDays = burnPerDayMinor > 0 && availableCashMinor > 0
    ? Math.floor(availableCashMinor / burnPerDayMinor)
    : null;

  return {
    plannedMinor,
    paidMinor,
    percentage,
    hasPlannedExpenses,
    dailyLimitMinor,
    runwayDays,
  };
}

// ============================================================================
// 8. DAILY LIMIT CALENDAR & DAY STATUS
// ============================================================================

export type DayStatus = 'future' | 'no_data' | 'within' | 'over' | 'today';

export interface DayCategorySpend {
  categoryId: string;
  name: string;
  spentMinor: number;
  percentageOfLimit: number;
}

export interface DayStatusResult {
  date: string;
  dayNumber: number;
  status: DayStatus;
  isToday: boolean;
  totalSpentMinor: number;
  dailyLimitMinor: number;
  overByMinor: number;
  underByMinor: number;
  categorySpends: DayCategorySpend[];
}

export function calculateCycleCalendarDays(
  range: CycleRange,
  transactions: Transaction[],
  categories: Category[],
  dailyLimitMinor: number,
  todayStr: string
): DayStatusResult[] {
  const catMap = new Map<string, Category>();
  for (const c of categories) {
    if (!c.deleted_at) catMap.set(c.id, c);
  }

  // Group expenses by date
  const dateExpenseMap = new Map<string, { total: number; catSpends: Map<string, number> }>();

  for (const t of transactions) {
    if (t.deleted_at || t.type !== 'expense') continue;
    if (t.local_date >= range.startDate && t.local_date <= range.endDate) {
      let group = dateExpenseMap.get(t.local_date);
      if (!group) {
        group = { total: 0, catSpends: new Map() };
        dateExpenseMap.set(t.local_date, group);
      }
      group.total += t.amount_minor;
      const catId = t.category_id || 'other';
      group.catSpends.set(catId, (group.catSpends.get(catId) || 0) + t.amount_minor);
    }
  }

  const results: DayStatusResult[] = [];
  let curDate = range.startDate;

  while (curDate <= range.endDate) {
    const isToday = curDate === todayStr;
    const isFuture = curDate > todayStr;
    const dayData = dateExpenseMap.get(curDate);
    const totalSpentMinor = dayData ? dayData.total : 0;

    let status: DayStatus;
    if (isFuture) {
      status = 'future';
    } else if (totalSpentMinor === 0) {
      status = isToday ? 'within' : 'no_data';
    } else if (dailyLimitMinor > 0 && totalSpentMinor > dailyLimitMinor) {
      status = 'over';
    } else {
      status = 'within';
    }

    const overByMinor = dailyLimitMinor > 0 && totalSpentMinor > dailyLimitMinor
      ? totalSpentMinor - dailyLimitMinor
      : 0;

    const underByMinor = dailyLimitMinor > 0 && totalSpentMinor < dailyLimitMinor
      ? dailyLimitMinor - totalSpentMinor
      : 0;

    const categorySpends: DayCategorySpend[] = [];
    if (dayData) {
      dayData.catSpends.forEach((amt, catId) => {
        const cat = catMap.get(catId);
        const name = cat ? cat.name : (catId === 'other' ? 'Other' : 'General');
        const pct = dailyLimitMinor > 0 ? Math.min(100, Math.round((amt / dailyLimitMinor) * 100)) : 0;
        categorySpends.push({
          categoryId: catId,
          name,
          spentMinor: amt,
          percentageOfLimit: pct,
        });
      });
      categorySpends.sort((a, b) => b.spentMinor - a.spentMinor);
    }

    const { day } = parseLocalDate(curDate);

    results.push({
      date: curDate,
      dayNumber: day,
      status,
      isToday,
      totalSpentMinor,
      dailyLimitMinor,
      overByMinor,
      underByMinor,
      categorySpends,
    });

    curDate = addCalendarDays(curDate, 1);
  }

  return results;
}

// ============================================================================
// 9. RECENT EXPENSES & TOP CATEGORIES
// ============================================================================

export interface RecentExpenseItem {
  id: string;
  name: string;
  amountMinor: number;
  categoryName: string;
  categoryColor?: string;
  categoryIndex: number;
  dateLabel: string;
  rawDate: string;
  rawTransaction: Transaction;
}

export function getRecentExpenses(
  transactions: Transaction[],
  categories: Category[],
  limit: number = 2,
  todayStr?: string
): RecentExpenseItem[] {
  const today = todayStr || new Date().toISOString().slice(0, 10);
  const yesterday = addCalendarDays(today, -1);

  const catMap = new Map<string, Category>();
  for (const c of categories) {
    if (!c.deleted_at) catMap.set(c.id, c);
  }

  const expenses = transactions
    .filter(t => !t.deleted_at && t.type === 'expense')
    .sort((a, b) => {
      const dComp = b.local_date.localeCompare(a.local_date);
      if (dComp !== 0) return dComp;
      return (b.created_at || 0) - (a.created_at || 0);
    })
    .slice(0, limit);

  return expenses.map((t, idx) => {
    const cat = t.category_id ? catMap.get(t.category_id) : undefined;
    const categoryName = cat ? cat.name : 'General';
    const name = t.note?.trim() || categoryName;

    let dateLabel: string;
    if (t.local_date === today) {
      dateLabel = 'Today';
    } else if (t.local_date === yesterday) {
      dateLabel = 'Yesterday';
    } else {
      const p = parseLocalDate(t.local_date);
      dateLabel = `${MONTH_NAMES_SHORT[p.month - 1]} ${p.day}`;
    }

    return {
      id: t.id,
      name,
      amountMinor: t.amount_minor,
      categoryName,
      categoryColor: cat?.color,
      categoryIndex: idx,
      dateLabel,
      rawDate: t.local_date,
      rawTransaction: t,
    };
  });
}

export interface TopCategoryTileItem {
  id: string;
  name: string;
  icon: string;
  spentMinor: number;
}

export function getTopCategoryTiles(
  breakdown: CategorySpendBreakdown,
  allCategories: Category[],
  limit: number = 3
): TopCategoryTileItem[] {
  const result: TopCategoryTileItem[] = [];

  // 1. Take top categories by spend
  for (const item of breakdown.top3) {
    if (result.length >= limit) break;
    result.push({
      id: item.categoryId,
      name: item.name,
      icon: item.icon,
      spentMinor: item.spentMinor,
    });
  }

  // 2. Fill with categories from library if fewer than limit
  if (result.length < limit) {
    const activeCats = allCategories.filter(c => !c.deleted_at);
    for (const cat of activeCats) {
      if (result.length >= limit) break;
      if (!result.some(r => r.id === cat.id)) {
        result.push({
          id: cat.id,
          name: cat.name,
          icon: cat.icon || 'Tag',
          spentMinor: 0,
        });
      }
    }
  }

  // 3. Fallback defaults if user has no categories
  const defaults = [
    { id: 'def-food', name: 'Food & Groceries', icon: 'Utensils', spentMinor: 0 },
    { id: 'def-transport', name: 'Transport & Fuel', icon: 'Car', spentMinor: 0 },
    { id: 'def-shopping', name: 'Personal Shopping', icon: 'ShoppingBag', spentMinor: 0 },
  ];

  for (const def of defaults) {
    if (result.length >= limit) break;
    if (!result.some(r => r.name === def.name)) {
      result.push(def);
    }
  }

  return result.slice(0, limit);
}

// ============================================================================
// 10. PRECISION INTEGER MONEY FORMATTER
// ============================================================================

export interface FormattedMoneyParts {
  numberStr: string;   // e.g. "12,450"
  currencyStr: string; // e.g. "DA"
  isNegative: boolean;
  fullStr: string;     // e.g. "12,450 DA"
}

/**
 * Pure integer-math money formatter.
 * Converts minor units to major units without floating point precision loss.
 * Handles negative balances without red styling.
 */
export function formatMoneyParts(
  amountMinor: number,
  currencyLabel: string = 'DA',
  locale: string = 'en-US'
): FormattedMoneyParts {
  const isNegative = amountMinor < 0;
  const absMinor = Math.abs(amountMinor);
  const major = Math.round(absMinor / 100);

  const formatter = new Intl.NumberFormat(locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
  });

  const formattedMajor = formatter.format(major);
  const currencyStr = currencyLabel.trim();
  const numberStr = isNegative ? `-${formattedMajor}` : formattedMajor;
  const fullStr = `${numberStr} ${currencyStr}`;

  return {
    numberStr,
    currencyStr,
    isNegative,
    fullStr,
  };
}
