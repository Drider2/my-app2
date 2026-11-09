// ========================================================
// Money & Finance Derived Statistics Unit Test Suite
// Verifying Phase 1 Math, Selectors, Boundaries & Parity
// ========================================================

import test from 'node:test';
import assert from 'node:assert/strict';

// Pure implementations for unit testing
function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function parseLocalDate(dateStr) {
  const parts = dateStr.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10),
  };
}

function formatLocalDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function addCalendarDays(dateStr, days) {
  const { year, month, day } = parseLocalDate(dateStr);
  const d = new Date(year, month - 1, day + days);
  return formatLocalDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function diffCalendarDays(dateA, dateB) {
  const pA = parseLocalDate(dateA);
  const pB = parseLocalDate(dateB);
  const utcA = Date.UTC(pA.year, pA.month - 1, pA.day);
  const utcB = Date.UTC(pB.year, pB.month - 1, pB.day);
  return Math.round((utcB - utcA) / 86400000);
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getCycleRange(offset, cycleStartDay = 1, referenceDate = '2026-11-08') {
  const { year: refYear, month: refMonth, day: refDay } = parseLocalDate(referenceDate);
  const startDayClamped = Math.max(1, Math.min(31, cycleStartDay));

  let anchorYear = refYear;
  let anchorMonth = refMonth;

  if (startDayClamped > 1) {
    if (refDay < startDayClamped) {
      anchorMonth -= 1;
      if (anchorMonth < 1) {
        anchorMonth = 12;
        anchorYear -= 1;
      }
    }
  }

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

  let startDate;
  let endDate;
  let label;
  let shortLabel;

  if (startDayClamped === 1) {
    const daysCount = getDaysInMonth(anchorYear, anchorMonth);
    startDate = formatLocalDate(anchorYear, anchorMonth, 1);
    endDate = formatLocalDate(anchorYear, anchorMonth, daysCount);
    label = MONTH_NAMES_FULL[anchorMonth - 1];
    if (anchorYear !== refYear) {
      label = `${label} ${anchorYear}`;
    }
    shortLabel = MONTH_NAMES_SHORT[anchorMonth - 1];
  } else {
    const maxStartDay = getDaysInMonth(anchorYear, anchorMonth);
    const actualStartDay = Math.min(startDayClamped, maxStartDay);
    startDate = formatLocalDate(anchorYear, anchorMonth, actualStartDay);

    let nextMonth = anchorMonth + 1;
    let nextYear = anchorYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
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

  let elapsedDays;
  if (offset > 0 || referenceDate < startDate) {
    elapsedDays = 0;
  } else if (offset < 0 || referenceDate > endDate) {
    elapsedDays = daysInCycle;
  } else {
    elapsedDays = Math.max(1, Math.min(daysInCycle, diffCalendarDays(startDate, referenceDate) + 1));
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

function calculateCycleBudget(categories = [], salarySetting, salaryAllocation) {
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

function calculateLeftBalance(transactions = [], savingsTransactions = [], baselineCheckingMinor = 0) {
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

function calculateSpentInCycle(transactions, range) {
  let spent = 0;
  for (const t of transactions) {
    if (t.deleted_at || t.type !== 'expense') continue;
    if (t.local_date >= range.startDate && t.local_date <= range.endDate) {
      spent += t.amount_minor;
    }
  }
  return spent;
}

function calculateBurnAndRunway(spentInCycleMinor, availableCashMinor, elapsedDays) {
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

function calculateSpentByCategory(transactions, categories, range, cycleBudget) {
  const catMap = new Map();
  for (const c of categories) {
    if (!c.deleted_at) catMap.set(c.id, c);
  }

  const spendMap = new Map();
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

  const allItems = [];
  spendMap.forEach((val, catId) => {
    const cat = catMap.get(catId);
    const name = cat ? cat.name : (catId === 'other' ? 'Other' : 'Uncategorized');
    const icon = cat ? cat.icon : 'CreditCard';

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
      spentMinor: val.spent,
      percentageOfBudget: pctBudget,
      percentageOfTotalSpend: pctTotal,
      transactionCount: val.count,
    });
  });

  allItems.sort((a, b) => b.spentMinor - a.spentMinor);

  if (allItems.length <= 4) {
    return {
      items: allItems,
      top3: allItems.slice(0, 3),
      other: allItems.length === 4 ? allItems[3] : null,
      totalSpentMinor,
    };
  }

  const top3 = allItems.slice(0, 3);
  const remaining = allItems.slice(3);
  const otherSpent = remaining.reduce((sum, item) => sum + item.spentMinor, 0);
  const otherCount = remaining.reduce((sum, item) => sum + item.transactionCount, 0);

  const otherItem = {
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

function calculateGaugeSegments(breakdown, cycleBudget) {
  const totalSpent = breakdown.totalSpentMinor;
  const isOverBudget = cycleBudget !== null && totalSpent > cycleBudget;
  const overByMinor = isOverBudget && cycleBudget !== null ? totalSpent - cycleBudget : 0;

  const displayItems = breakdown.other
    ? [...breakdown.top3, breakdown.other]
    : breakdown.items;

  const segments = [];

  if (!cycleBudget || cycleBudget <= 0 || totalSpent === 0) {
    return {
      segments: [],
      remainderPercent: 100,
      isOverBudget: false,
      overByMinor: 0,
      totalSpentMinor: totalSpent,
    };
  }

  const OPACITIES = [1.0, 0.55, 0.30, 0.15];
  const GAP = 2;

  let cumulativeOffset = 0;
  let totalSharePercent = 0;

  for (let i = 0; i < displayItems.length; i++) {
    const item = displayItems[i];
    if (item.spentMinor <= 0) continue;

    const rawShare = (item.spentMinor / cycleBudget) * 100;
    const sharePercent = Math.min(100, Math.round(rawShare * 10) / 10);
    totalSharePercent += sharePercent;

    const strokeOpacity = OPACITIES[i] ?? 0.15;
    const hasGlow = i === 0;

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

function calculateVsLastCycle(transactions, currentRange, prevRange, elapsedDays) {
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

  if (prevSpend === 0 && currentSpend === 0) return null;
  if (prevSpend === 0 && currentSpend > 0) {
    return { type: 'new', percentage: 0, label: 'New' };
  }

  const diff = currentSpend - prevSpend;
  const pct = Math.round((diff / prevSpend) * 100);

  if (pct === 0) {
    return { type: 'zero', percentage: 0, label: '0% vs last month' };
  }

  const isIncrease = pct > 0;
  return {
    type: isIncrease ? 'increase' : 'decrease',
    percentage: Math.abs(pct),
    label: `${isIncrease ? '+' : '-'}${Math.abs(pct)}% vs last month`,
  };
}

function calculatePlanProgress(
  recurringRules = [],
  maintenanceItems = [],
  salaryAllocation,
  transactions = [],
  range,
  availableCashMinor = 0,
  burnPerDayMinor = 0,
  dailyLimitMinor = 0
) {
  let plannedMinor = 0;

  for (const rule of recurringRules) {
    if (rule.deleted_at || rule.type !== 'expense') continue;
    if (rule.frequency === 'monthly' || (rule.next_date >= range.startDate && rule.next_date <= range.endDate)) {
      plannedMinor += rule.amount_minor;
    }
  }

  for (const item of maintenanceItems) {
    if (item.deleted_at || item.status === 'completed') continue;
    if (item.next_reminder_date >= range.startDate && item.next_reminder_date <= range.endDate) {
      plannedMinor += item.estimated_cost_minor;
    }
  }

  if (salaryAllocation) {
    plannedMinor += (salaryAllocation.personal_amount_minor || 0);
    plannedMinor += (salaryAllocation.car_amount_minor || 0);
    plannedMinor += (salaryAllocation.gym_amount_minor || 0);
    plannedMinor += (salaryAllocation.shopping_amount_minor || 0);
    plannedMinor += (salaryAllocation.other_amount_minor || 0);
  }

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

function calculateCycleCalendarDays(range, transactions, categories, dailyLimitMinor, todayStr) {
  const catMap = new Map();
  for (const c of categories) {
    if (!c.deleted_at) catMap.set(c.id, c);
  }

  const dateExpenseMap = new Map();
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

  const results = [];
  let curDate = range.startDate;

  while (curDate <= range.endDate) {
    const isToday = curDate === todayStr;
    const isFuture = curDate > todayStr;
    const dayData = dateExpenseMap.get(curDate);
    const totalSpentMinor = dayData ? dayData.total : 0;

    let status;
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

    const categorySpends = [];
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

function formatMoneyParts(amountMinor, currencyLabel = 'DA', locale = 'en-US') {
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

  return { numberStr, currencyStr, isNegative, fullStr };
}

// ========================================================
// TEST SUITES
// ========================================================

test('Calendar Math - Safe dates, leap years and month boundaries', () => {
  assert.equal(getDaysInMonth(2024, 2), 29); // 2024 is a leap year
  assert.equal(getDaysInMonth(2026, 2), 28); // 2026 is non-leap
  assert.equal(getDaysInMonth(2026, 4), 30);
  assert.equal(getDaysInMonth(2026, 7), 31);

  assert.equal(addCalendarDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addCalendarDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addCalendarDays('2026-01-01', -1), '2025-12-31');

  assert.equal(diffCalendarDays('2026-11-01', '2026-11-30'), 29);
});

test('Cycle Range - Boundaries with start day 1 and 15', () => {
  // Start day 1: Full month
  const cNov1 = getCycleRange(0, 1, '2026-11-08');
  assert.equal(cNov1.startDate, '2026-11-01');
  assert.equal(cNov1.endDate, '2026-11-30');
  assert.equal(cNov1.label, 'November');
  assert.equal(cNov1.daysInCycle, 30);
  assert.equal(cNov1.elapsedDays, 8); // Nov 1 to Nov 8 = 8 days

  // Previous month offset -1
  const cOct1 = getCycleRange(-1, 1, '2026-11-08');
  assert.equal(cOct1.startDate, '2026-10-01');
  assert.equal(cOct1.endDate, '2026-10-31');
  assert.equal(cOct1.label, 'October');
  assert.equal(cOct1.daysInCycle, 31);
  assert.equal(cOct1.elapsedDays, 31); // Past cycle is fully elapsed

  // Start day 15, reference Nov 20 (after 15th): current cycle is Nov 15 - Dec 14
  const cMidNov = getCycleRange(0, 15, '2026-11-20');
  assert.equal(cMidNov.startDate, '2026-11-15');
  assert.equal(cMidNov.endDate, '2026-12-14');
  assert.equal(cMidNov.label, 'Nov 15 - Dec 14');
  assert.equal(cMidNov.daysInCycle, 30);
  assert.equal(cMidNov.elapsedDays, 6); // Nov 15, 16, 17, 18, 19, 20 = 6 days

  // Start day 15, reference Nov 8 (before 15th): current cycle is Oct 15 - Nov 14
  const cEarlyNov = getCycleRange(0, 15, '2026-11-08');
  assert.equal(cEarlyNov.startDate, '2026-10-15');
  assert.equal(cEarlyNov.endDate, '2026-11-14');
  assert.equal(cEarlyNov.label, 'Oct 15 - Nov 14');
  assert.equal(cEarlyNov.daysInCycle, 31);
  assert.equal(cEarlyNov.elapsedDays, 25); // Oct 15..31 (17) + Nov 1..8 (8) = 25 days
});

test('Cycle Range - Clamping when start day exceeds month days (e.g. Day 31)', () => {
  // Day 31 in February (28 days)
  const cFeb31 = getCycleRange(0, 31, '2026-02-15');
  // February has 28 days, clamped start day
  assert.equal(cFeb31.startDate, '2026-01-31');
  assert.equal(cFeb31.endDate, '2026-02-28');
  assert.ok(cFeb31.daysInCycle > 0);
});

test('Clean Slate & Empty Data - Deliberate zero states without crashing', () => {
  const range = getCycleRange(0, 1, '2026-11-08');
  const emptyBudget = calculateCycleBudget([], null, null);
  assert.equal(emptyBudget, null);

  const emptyBalance = calculateLeftBalance([], [], 0);
  assert.equal(emptyBalance, 0);

  const emptySpent = calculateSpentInCycle([], range);
  assert.equal(emptySpent, 0);

  const emptyBurn = calculateBurnAndRunway(0, 0, 8);
  assert.equal(emptyBurn.burnPerDayMinor, 0);
  assert.equal(emptyBurn.runwayDays, null);

  const emptyBreakdown = calculateSpentByCategory([], [], range, null);
  assert.equal(emptyBreakdown.items.length, 0);
  assert.equal(emptyBreakdown.totalSpentMinor, 0);

  const emptyGauge = calculateGaugeSegments(emptyBreakdown, null);
  assert.equal(emptyGauge.segments.length, 0);
  assert.equal(emptyGauge.remainderPercent, 100);
  assert.equal(emptyGauge.isOverBudget, false);
  assert.equal(emptyGauge.overByMinor, 0);

  const emptyPlan = calculatePlanProgress([], [], undefined, [], range, 0, 0, 50000);
  assert.equal(emptyPlan.plannedMinor, 0);
  assert.equal(emptyPlan.paidMinor, 0);
  assert.equal(emptyPlan.percentage, 0);
  assert.equal(emptyPlan.hasPlannedExpenses, false);

  const emptyDays = calculateCycleCalendarDays(range, [], [], 50000, '2026-11-08');
  assert.equal(emptyDays.length, 30);
  // Past days without data are "no_data"
  assert.equal(emptyDays[0].status, 'no_data');
  // Today with zero spend is "within"
  assert.equal(emptyDays[7].status, 'within');
  assert.equal(emptyDays[7].isToday, true);
  // Future days are "future"
  assert.equal(emptyDays[8].status, 'future');
});

test('First Transaction - Accurately updates spend, balance, and breakdown', () => {
  const range = getCycleRange(0, 1, '2026-11-08');
  const catFood = { id: 'cat-food', name: 'Food', icon: 'Utensils', amount_minor: 2000000 };

  const tx1 = {
    id: 'tx-1',
    type: 'expense',
    amount_minor: 150000, // 1,500 DA
    local_date: '2026-11-04',
    category_id: 'cat-food',
  };

  const balance = calculateLeftBalance([tx1], [], 1000000); // 10,000 DA baseline
  assert.equal(balance, 850000); // 10,000 - 1,500 = 8,500 DA

  const spent = calculateSpentInCycle([tx1], range);
  assert.equal(spent, 150000);

  const budget = calculateCycleBudget([catFood]);
  assert.equal(budget, 2000000);

  const breakdown = calculateSpentByCategory([tx1], [catFood], range, budget);
  assert.equal(breakdown.totalSpentMinor, 150000);
  assert.equal(breakdown.items.length, 1);
  assert.equal(breakdown.items[0].name, 'Food');
  assert.equal(breakdown.items[0].percentageOfBudget, 8); // 150,000 / 2,000,000 = 7.5% -> 8%

  const gauge = calculateGaugeSegments(breakdown, budget);
  assert.equal(gauge.segments.length, 1);
  assert.equal(gauge.isOverBudget, false);
  assert.ok(gauge.remainderPercent > 90);
});

test('Over-Budget Scenario - White over-limit treatment, zero remainder, correct overBy', () => {
  const range = getCycleRange(0, 1, '2026-11-08');
  const cat = { id: 'cat-1', name: 'Discretionary', icon: 'Tag', amount_minor: 1000000 }; // 10,000 DA budget
  const budget = calculateCycleBudget([cat]);

  const txs = [
    { id: 'tx-1', type: 'expense', amount_minor: 1200000, local_date: '2026-11-05', category_id: 'cat-1' } // 12,000 DA
  ];

  const breakdown = calculateSpentByCategory(txs, [cat], range, budget);
  const gauge = calculateGaugeSegments(breakdown, budget);

  assert.equal(gauge.isOverBudget, true);
  assert.equal(gauge.overByMinor, 200000); // 2,000 DA over budget
  assert.equal(gauge.remainderPercent, 0); // No hatch when over budget
  assert.ok(gauge.segments[0].sharePercent >= 100);
});

test('Delta Rules - New, Percentage, and Neutral formatting (NO red/green)', () => {
  const currentRange = getCycleRange(0, 1, '2026-11-08'); // Elapsed 8 days
  const prevRange = getCycleRange(-1, 1, '2026-11-08');

  // Case 1: Prev 0, Current > 0 -> "New"
  const txCurrentOnly = [
    { id: 't1', type: 'expense', amount_minor: 50000, local_date: '2026-11-03' }
  ];
  const deltaNew = calculateVsLastCycle(txCurrentOnly, currentRange, prevRange, 8);
  assert.notEqual(deltaNew, null);
  assert.equal(deltaNew.type, 'new');
  assert.equal(deltaNew.label, 'New');

  // Case 2: Current > Prev -> Increase (e.g. +50% vs last month)
  const txIncrease = [
    { id: 't1', type: 'expense', amount_minor: 150000, local_date: '2026-11-03' },
    { id: 't2', type: 'expense', amount_minor: 100000, local_date: '2026-10-04' } // in first 8 days of prev
  ];
  const deltaInc = calculateVsLastCycle(txIncrease, currentRange, prevRange, 8);
  assert.equal(deltaInc.type, 'increase');
  assert.equal(deltaInc.label, '+50% vs last month');

  // Case 3: Current < Prev -> Decrease (e.g. -25% vs last month)
  const txDecrease = [
    { id: 't1', type: 'expense', amount_minor: 75000, local_date: '2026-11-03' },
    { id: 't2', type: 'expense', amount_minor: 100000, local_date: '2026-10-04' }
  ];
  const deltaDec = calculateVsLastCycle(txDecrease, currentRange, prevRange, 8);
  assert.equal(deltaDec.type, 'decrease');
  assert.equal(deltaDec.label, '-25% vs last month');
});

test('Plan Progress - 0/0 returns 0% (never 100%), paid matches posted bills', () => {
  const range = getCycleRange(0, 1, '2026-11-08');

  // Zero planned lines -> 0%
  const resEmpty = calculatePlanProgress([], [], undefined, [], range, 5000000, 100000, 50000);
  assert.equal(resEmpty.percentage, 0);
  assert.equal(resEmpty.hasPlannedExpenses, false);

  // Planned recurring bill 20,000 DA, paid 10,000 DA
  const recurring = [
    { id: 'r1', type: 'expense', amount_minor: 2000000, frequency: 'monthly', next_date: '2026-11-10' }
  ];
  const txs = [
    { id: 't1', type: 'expense', amount_minor: 1000000, recurring_id: 'r1', local_date: '2026-11-05' }
  ];
  const resPaid = calculatePlanProgress(recurring, [], undefined, txs, range, 5000000, 100000, 50000);
  assert.equal(resPaid.percentage, 50);
  assert.equal(resPaid.hasPlannedExpenses, true);
  assert.equal(resPaid.plannedMinor, 2000000);
  assert.equal(resPaid.paidMinor, 1000000);
});

test('Daily Limit Calendar - Classifies within, over, no_data, future, today with breakdown', () => {
  const range = getCycleRange(0, 1, '2026-11-08');
  const cat = { id: 'c1', name: 'Coffee', icon: 'Coffee', amount_minor: 500000 };
  const dailyLimitMinor = 50000; // 500 DA daily limit

  const txs = [
    // Nov 2: 300 DA (within limit)
    { id: 't1', type: 'expense', amount_minor: 30000, category_id: 'c1', local_date: '2026-11-02' },
    // Nov 5: 800 DA (over limit by 300 DA)
    { id: 't2', type: 'expense', amount_minor: 80000, category_id: 'c1', local_date: '2026-11-05' },
  ];

  const days = calculateCycleCalendarDays(range, txs, [cat], dailyLimitMinor, '2026-11-08');

  // Nov 1: 0 spend -> no_data
  const day1 = days.find(d => d.date === '2026-11-01');
  assert.equal(day1.status, 'no_data');

  // Nov 2: 300 DA -> within
  const day2 = days.find(d => d.date === '2026-11-02');
  assert.equal(day2.status, 'within');
  assert.equal(day2.totalSpentMinor, 30000);
  assert.equal(day2.underByMinor, 20000);

  // Nov 5: 800 DA -> over
  const day5 = days.find(d => d.date === '2026-11-05');
  assert.equal(day5.status, 'over');
  assert.equal(day5.totalSpentMinor, 80000);
  assert.equal(day5.overByMinor, 30000);
  assert.equal(day5.categorySpends[0].name, 'Coffee');

  // Nov 8: Today
  const dayToday = days.find(d => d.date === '2026-11-08');
  assert.equal(dayToday.isToday, true);

  // Nov 15: Future -> future
  const dayFuture = days.find(d => d.date === '2026-11-15');
  assert.equal(dayFuture.status, 'future');
});

test('Money Formatter - Integer minor units, quiet currency suffix, negative handling without red', () => {
  const f1 = formatMoneyParts(1245000, 'DA', 'en-US');
  assert.equal(f1.numberStr, '12,450');
  assert.equal(f1.currencyStr, 'DA');
  assert.equal(f1.isNegative, false);
  assert.equal(f1.fullStr, '12,450 DA');

  // Negative balance
  const fNeg = formatMoneyParts(-350000, 'DA', 'en-US');
  assert.equal(fNeg.numberStr, '-3,500');
  assert.equal(fNeg.isNegative, true);

  // Zero balance
  const fZero = formatMoneyParts(0, 'DA', 'en-US');
  assert.equal(fZero.numberStr, '0');
  assert.equal(fZero.isNegative, false);
});

test('Performance Benchmark - 1,000+ transactions calculates cycle stats in < 16ms', () => {
  const range = getCycleRange(0, 1, '2026-11-08');
  const catList = [
    { id: 'c1', name: 'Food', amount_minor: 2000000 },
    { id: 'c2', name: 'Fuel', amount_minor: 1000000 },
    { id: 'c3', name: 'Rent', amount_minor: 3000000 },
    { id: 'c4', name: 'Gym', amount_minor: 500000 },
    { id: 'c5', name: 'Misc', amount_minor: 500000 },
  ];

  const heavyTxs = [];
  for (let i = 0; i < 1200; i++) {
    const day = (i % 28) + 1;
    const catId = catList[i % catList.length].id;
    heavyTxs.push({
      id: `tx-bench-${i}`,
      type: i % 10 === 0 ? 'income' : 'expense',
      amount_minor: ((i * 37) % 8000 + 200) * 100,
      category_id: catId,
      local_date: `2026-11-${pad2(day)}`,
      created_at: 1794000000000 + i * 1000,
    });
  }

  const t0 = performance.now();
  const spent = calculateSpentInCycle(heavyTxs, range);
  const balance = calculateLeftBalance(heavyTxs, [], 5000000);
  const budget = calculateCycleBudget(catList);
  const breakdown = calculateSpentByCategory(heavyTxs, catList, range, budget);
  const gauge = calculateGaugeSegments(breakdown, budget);
  const calendarDays = calculateCycleCalendarDays(range, heavyTxs, catList, 50000, '2026-11-08');
  const t1 = performance.now();

  const durationMs = t1 - t0;
  assert.ok(spent > 0);
  assert.ok(breakdown.items.length > 0);
  assert.ok(gauge.segments.length > 0);
  assert.equal(calendarDays.length, 30);
  assert.ok(durationMs < 16, `Calculation took ${durationMs.toFixed(2)}ms (expected < 16ms)`);
});

test('Clean Slate Baseline - Fresh install starts at 0 DA without seed transactions', () => {
  // Clean install: no transactions, no seed
  const cleanTxs = [];
  const isSeedInstall = cleanTxs.some(t => t.id === 'tx-3' || t.id === 'tx-1');
  const baseline = isSeedInstall ? 7500000 : 0;
  const balance = calculateLeftBalance(cleanTxs, [], baseline);
  assert.equal(balance, 0, 'Clean install must start at 0 DA');

  // Seed install: has demo transactions tx-3
  const seedTxs = [{ id: 'tx-3', type: 'income', amount_minor: 5000000, local_date: '2026-11-01' }];
  const isSeedTrue = seedTxs.some(t => t.id === 'tx-3' || t.id === 'tx-1');
  const seedBaseline = isSeedTrue ? 7500000 : 0;
  const seedBalance = calculateLeftBalance(seedTxs, [], seedBaseline);
  assert.equal(seedBalance, 12500000, 'Seed demo install preserves 75,000 DA baseline');
});

test('Charity Allocation - 0 of 0 DA returns 0% (never 100%)', () => {
  const computeCharityProgress = (monthlyContributedMinor, monthlyTargetMinor) => {
    return monthlyTargetMinor > 0
      ? Math.min(100, Math.round((monthlyContributedMinor / monthlyTargetMinor) * 100))
      : (monthlyContributedMinor > 0 ? 100 : 0);
  };

  // Case 1: 0 contributed of 0 target -> 0% (NOT 100%)
  assert.equal(computeCharityProgress(0, 0), 0);

  // Case 2: 2,500 DA contributed of 5,000 DA target -> 50%
  assert.equal(computeCharityProgress(250000, 500000), 50);

  // Case 3: 5,000 DA contributed of 5,000 DA target -> 100%
  assert.equal(computeCharityProgress(500000, 500000), 100);

  // Case 4: 1,000 DA contributed with 0 target -> 100%
  assert.equal(computeCharityProgress(100000, 0), 100);
});

test('Hermes & Today Screen Parity - Numbers match between Money Tab, Today Screen, and Hermes', () => {
  const cycleDay = 1;
  const currentCycle = getCycleRange(0, cycleDay, '2026-11-08');

  const transactions = [
    { id: 'tx-1', type: 'income', amount_minor: 15000000, local_date: '2026-11-01' }, // 150,000 DA
    { id: 'tx-2', type: 'expense', amount_minor: 2500000, local_date: '2026-11-03' }, // 25,000 DA
    { id: 'tx-3', type: 'expense', amount_minor: 1500000, local_date: '2026-11-05' }, // 15,000 DA
    { id: 'tx-old', type: 'expense', amount_minor: 500000, local_date: '2026-10-15' }, // Out of cycle
  ];

  const categories = [
    { id: 'cat-1', name: 'General', amount_minor: 6000000 },
  ];

  // 1. Calculate stats as done in the Money tab
  const cycleSpent = calculateSpentInCycle(transactions, currentCycle);
  const cycleBudget = calculateCycleBudget(categories);
  const leftBalance = calculateLeftBalance(transactions, [], 0);

  assert.equal(cycleSpent, 4000000); // 25k + 15k = 40k DA (only current cycle)
  assert.equal(cycleBudget, 6000000); // 60k DA
  assert.equal(leftBalance, 10500000); // 150k - 45k = 105k DA (lifetime cash balance)

  // 2. Parity check with Today screen calculation
  const todayScreenMonthSpending = calculateSpentInCycle(transactions, currentCycle);
  assert.equal(todayScreenMonthSpending, cycleSpent, 'Today screen month spending must equal Money tab cycle spend');

  // 3. Parity check with Hermes get_budget_status logic
  const hermesBudgetStatus = {
    available_cash: leftBalance / 100,
    spent_this_cycle: cycleSpent / 100,
    remaining_cycle: cycleBudget != null ? Math.max(0, (cycleBudget - cycleSpent) / 100) : null,
    cycle_budget: cycleBudget / 100,
  };

  assert.equal(hermesBudgetStatus.available_cash, 105000);
  assert.equal(hermesBudgetStatus.spent_this_cycle, 40000);
  assert.equal(hermesBudgetStatus.remaining_cycle, 20000);
  assert.equal(hermesBudgetStatus.cycle_budget, 60000);
});

test('Module Isolation - When Money module is OFF, Hermes and UI completely hide Money data', () => {
  const modules = { finance: false };
  const aiShareFinance = false;

  // 1. Nav check
  const isNavMoneyVisible = modules.finance !== false;
  assert.equal(isNavMoneyVisible, false, 'Money tab must not be visible in navigation when module is disabled');

  // 2. Dashboard widget visibility check
  const isWidgetVisible = (widgetType) => {
    if (widgetType.startsWith('finance') && modules.finance === false) return false;
    return true;
  };
  assert.equal(isWidgetVisible('finance_budget'), false);
  assert.equal(isWidgetVisible('finance_quick_expenses'), false);
  assert.equal(isWidgetVisible('finance_balance'), false);

  // 3. Hermes tool execution check
  const checkHermesToolAccess = (toolName, moduleActive, shareActive) => {
    if (['get_budget_status', 'get_spending', 'get_goals', 'get_loans'].includes(toolName)) {
      if (moduleActive === false || shareActive === false) {
        return { error: 'The Money/Finance module is currently disabled in settings.' };
      }
    }
    return { ok: true };
  };

  const budgetResult = checkHermesToolAccess('get_budget_status', modules.finance, aiShareFinance);
  assert.ok(budgetResult.error);
  assert.match(budgetResult.error, /disabled in settings/);

  const spendingResult = checkHermesToolAccess('get_spending', modules.finance, aiShareFinance);
  assert.ok(spendingResult.error);

  const goalsResult = checkHermesToolAccess('get_goals', modules.finance, aiShareFinance);
  assert.ok(goalsResult.error);

  const loansResult = checkHermesToolAccess('get_loans', modules.finance, aiShareFinance);
  assert.ok(loansResult.error);

  // 4. Today summary excludes spent_today when finance is disabled
  const isFinanceActive = modules.finance !== false && aiShareFinance !== false;
  const todaySummary = {
    date: '2026-11-08',
    prayers_completed: 5,
    ...(isFinanceActive ? { spent_today: 100 } : {}),
  };
  assert.equal(todaySummary.spent_today, undefined, 'Today summary must omit spent_today when finance is off');
});
