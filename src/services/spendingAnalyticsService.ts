// Spending Analytics Service: Calculations, Time Series, Category Deep Dives & Honest Forecasts
import { db, getTodayLocalDate } from './storage';
import { FinanceService } from './financeService';
import { 
  AnalyticsTimeRange, 
  CategoryAnalyticsMetric, 
  SpendingProgressPoint, 
  IncomeVsSpendingSummary,
  Category,
  Transaction
} from '../types';

export const SpendingAnalyticsService = {
  /**
   * Helper to resolve start date based on time range
   */
  getDateRangeBoundaries(range: AnalyticsTimeRange, customStart?: string, customEnd?: string): {
    startDate: string;
    endDate: string;
    daysCount: number;
    prevStartDate: string;
    prevEndDate: string;
  } {
    const today = getTodayLocalDate();
    if (range === 'custom' && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      const prevEnd = new Date(start.getTime() - 86400000);
      const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
      return {
        startDate: customStart,
        endDate: customEnd,
        daysCount: days,
        prevStartDate: prevStart.toISOString().slice(0, 10),
        prevEndDate: prevEnd.toISOString().slice(0, 10),
      };
    }

    let days = 30;
    if (range === '7d') days = 7;
    else if (range === '30d') days = 30;
    else if (range === '3m') days = 90;
    else if (range === '6m') days = 180;
    else if (range === '1y') days = 365;

    const endObj = new Date(today);
    const startObj = new Date(endObj.getTime() - (days - 1) * 86400000);
    const prevEndObj = new Date(startObj.getTime() - 86400000);
    const prevStartObj = new Date(prevEndObj.getTime() - (days - 1) * 86400000);

    return {
      startDate: startObj.toISOString().slice(0, 10),
      endDate: today,
      daysCount: days,
      prevStartDate: prevStartObj.toISOString().slice(0, 10),
      prevEndDate: prevEndObj.toISOString().slice(0, 10),
    };
  },

  // ==========================================================
  // 1. GRAPH 1: SPENDING PROGRESS OVER TIME
  // ==========================================================
  getSpendingProgress(range: AnalyticsTimeRange = '30d', customStart?: string, customEnd?: string): {
    points: SpendingProgressPoint[];
    totalSpentMinor: number;
    totalBudgetMinor: number;
    dailyAverageMinor: number;
    projectedEndMinor: number;
    budgetRemainingMinor: number;
  } {
    const state = db.getState();
    const boundaries = this.getDateRangeBoundaries(range, customStart, customEnd);
    const categories = (state.categories || []).filter(c => !c.deleted_at);

    // Sum monthly budgets across all categories
    const monthlyTotalBudgetMinor = categories.reduce((sum, c) => sum + (c.amount_minor || 0), 0);
    // Period budget scaled by days / 30
    const periodBudgetMinor = Math.round((monthlyTotalBudgetMinor * boundaries.daysCount) / 30);

    // Filter relevant non-deleted expense transactions
    const expenseTxs = (state.transactions || []).filter(t => 
      !t.deleted_at && 
      t.type === 'expense' && 
      t.local_date >= boundaries.startDate && 
      t.local_date <= boundaries.endDate
    );

    // Map spending per date string
    const spendByDate: Record<string, number> = {};
    for (const t of expenseTxs) {
      spendByDate[t.local_date] = (spendByDate[t.local_date] || 0) + t.amount_minor;
    }

    // Generate continuous date points
    const points: SpendingProgressPoint[] = [];
    let cumulativeMinor = 0;
    const startMs = new Date(boundaries.startDate).getTime();

    for (let i = 0; i < boundaries.daysCount; i++) {
      const currentMs = startMs + i * 86400000;
      const dObj = new Date(currentMs);
      const dateStr = dObj.toISOString().slice(0, 10);
      const daySpend = spendByDate[dateStr] || 0;
      cumulativeMinor += daySpend;

      // Budget pace: expected spending if budget were consumed evenly
      const paceFraction = (i + 1) / boundaries.daysCount;
      const budgetPaceMinor = Math.round(periodBudgetMinor * paceFraction);

      // Projected linear trend based on current burn rate
      const dailyAverageSoFar = i > 0 ? cumulativeMinor / (i + 1) : cumulativeMinor;
      const projectedTrendMinor = Math.round(dailyAverageSoFar * (i + 1));

      // Friendly label (e.g. "Nov 03" or "Day 12")
      const monthShort = dObj.toLocaleString('default', { month: 'short' });
      const dayNum = dObj.getDate();
      const label = `${monthShort} ${dayNum}`;

      points.push({
        date: dateStr,
        label,
        dayIndex: i + 1,
        actualCumulativeMinor: cumulativeMinor,
        budgetPaceMinor,
        projectedTrendMinor,
      });
    }

    const totalSpentMinor = cumulativeMinor;
    const dailyAverageMinor = Math.round(totalSpentMinor / Math.max(1, boundaries.daysCount));
    const projectedEndMinor = dailyAverageMinor * boundaries.daysCount;
    const budgetRemainingMinor = Math.max(0, periodBudgetMinor - totalSpentMinor);

    return {
      points,
      totalSpentMinor,
      totalBudgetMinor: periodBudgetMinor,
      dailyAverageMinor,
      projectedEndMinor,
      budgetRemainingMinor,
    };
  },

  // ==========================================================
  // 2. GRAPH 2: INCOME VS SPENDING BREAKDOWN
  // ==========================================================
  getIncomeVsSpendingComparison(range: AnalyticsTimeRange = '30d'): IncomeVsSpendingSummary {
    const state = db.getState();
    const boundaries = this.getDateRangeBoundaries(range);

    const periodTxs = (state.transactions || []).filter(t => 
      !t.deleted_at && 
      t.local_date >= boundaries.startDate && 
      t.local_date <= boundaries.endDate
    );

    let totalIncomeMinor = 0;
    let actualExpensesMinor = 0;
    let savingsTransfersMinor = 0;
    let sadaqahContributionsMinor = 0;

    for (const t of periodTxs) {
      if (t.type === 'income') {
        totalIncomeMinor += t.amount_minor;
      } else if (t.type === 'expense') {
        actualExpensesMinor += t.amount_minor;
        // Check if Sadaqah
        if (t.category_id === 'cat-sadaqah' || (t.note || '').toLowerCase().includes('sadaqah') || (t.note || '').toLowerCase().includes('charity')) {
          sadaqahContributionsMinor += t.amount_minor;
        }
      } else if (t.type === 'transfer' && (t.goal_id || (t.note || '').toLowerCase().includes('savings'))) {
        savingsTransfersMinor += t.amount_minor;
      }
    }

    // If total income for period is zero (e.g. start of month before salary log), use proportional base salary
    if (totalIncomeMinor === 0) {
      const baseSalary = FinanceService.getSalarySetting().monthly_salary_minor;
      totalIncomeMinor = Math.round((baseSalary * boundaries.daysCount) / 30);
    }

    // Net remaining liquid cash after true expenses and savings allocations
    const netRemainingBalanceMinor = Math.max(0, totalIncomeMinor - actualExpensesMinor - savingsTransfersMinor);

    const periodLabel = range === '7d' ? 'Last 7 Days' 
      : range === '30d' ? 'This Month (30d)' 
      : range === '3m' ? 'Last 3 Months' 
      : range === '6m' ? 'Last 6 Months' 
      : 'Last Year';

    return {
      periodLabel,
      totalIncomeMinor,
      actualExpensesMinor,
      savingsTransfersMinor,
      sadaqahContributionsMinor,
      netRemainingBalanceMinor,
    };
  },

  // ==========================================================
  // 3. GRAPH 3: SPENDING BY CATEGORY & METRICS
  // ==========================================================
  getCategorySpendingMetrics(range: AnalyticsTimeRange = '30d'): CategoryAnalyticsMetric[] {
    const state = db.getState();
    const boundaries = this.getDateRangeBoundaries(range);
    const categories = (state.categories || []).filter(c => !c.deleted_at);

    // Current period expenses
    const currentTxs = (state.transactions || []).filter(t => 
      !t.deleted_at && 
      t.type === 'expense' && 
      t.local_date >= boundaries.startDate && 
      t.local_date <= boundaries.endDate
    );

    // Previous period expenses for delta
    const prevTxs = (state.transactions || []).filter(t => 
      !t.deleted_at && 
      t.type === 'expense' && 
      t.local_date >= boundaries.prevStartDate && 
      t.local_date <= boundaries.prevEndDate
    );

    const totalOverallSpentMinor = currentTxs.reduce((sum, t) => sum + t.amount_minor, 0);

    const results: CategoryAnalyticsMetric[] = categories.map(cat => {
      const catTxs = currentTxs.filter(t => t.category_id === cat.id);
      const catPrevTxs = prevTxs.filter(t => t.category_id === cat.id);

      const totalSpentMinor = catTxs.reduce((sum, t) => sum + t.amount_minor, 0);
      const prevSpentMinor = catPrevTxs.reduce((sum, t) => sum + t.amount_minor, 0);

      const percentageOfTotalSpend = totalOverallSpentMinor > 0 
        ? Math.round((totalSpentMinor / totalOverallSpentMinor) * 1000) / 10 
        : 0;

      const transactionCount = catTxs.length;
      const averageTransactionMinor = transactionCount > 0 
        ? Math.round(totalSpentMinor / transactionCount) 
        : 0;

      // Scale budget to period
      const budgetMinor = Math.round(((cat.amount_minor || 0) * boundaries.daysCount) / 30);
      const budgetConsumedPct = budgetMinor > 0 
        ? Math.round((totalSpentMinor / budgetMinor) * 100) 
        : 0;

      // Status indicator thresholds
      let budgetStatus: 'normal' | 'warning' | 'exceeded' = 'normal';
      const warningThreshold = (cat.alert_threshold || 0.8) * 100; // e.g. 80%

      if (budgetConsumedPct >= 100) {
        budgetStatus = 'exceeded';
      } else if (budgetConsumedPct >= warningThreshold) {
        budgetStatus = 'warning';
      }

      const dailyAverageMinor = Math.round(totalSpentMinor / Math.max(1, boundaries.daysCount));

      // Delta comparison vs previous period
      let deltaPct = 0;
      if (prevSpentMinor > 0) {
        deltaPct = Math.round(((totalSpentMinor - prevSpentMinor) / prevSpentMinor) * 100);
      } else if (totalSpentMinor > 0) {
        deltaPct = 100;
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon || 'Tag',
        categoryColor: cat.color || '#A6D96A',
        totalSpentMinor,
        percentageOfTotalSpend,
        transactionCount,
        averageTransactionMinor,
        budgetMinor,
        budgetConsumedPct,
        budgetStatus,
        dailyAverageMinor,
        previousPeriodSpentMinor: prevSpentMinor,
        deltaPct,
      };
    });

    // Sort descending by total spent
    return results.sort((a, b) => b.totalSpentMinor - a.totalSpentMinor);
  },

  // ==========================================================
  // 4. GRAPH 4: SPENDING TREND & FORECAST
  // ==========================================================
  getSpendingTrendForecast(): {
    actualSpentSoFarMinor: number;
    expectedRemainingSpendMinor: number;
    monthlyBudgetLimitMinor: number;
    projectedMonthEndMinor: number;
    burnRatePerDayMinor: number;
    daysPassedInCycle: number;
    daysRemainingInCycle: number;
    paceVerdict: 'under_budget' | 'near_budget' | 'over_budget';
    insights: string[];
  } {
    const state = db.getState();
    const today = getTodayLocalDate();
    const currentYM = today.slice(0, 7);
    const dayOfMonth = parseInt(today.slice(8, 10), 10);
    const totalDaysInMonth = new Date(parseInt(today.slice(0, 4)), parseInt(today.slice(5, 7)), 0).getDate();

    const daysPassedInCycle = Math.max(1, dayOfMonth);
    const daysRemainingInCycle = Math.max(0, totalDaysInMonth - dayOfMonth);

    const categories = (state.categories || []).filter(c => !c.deleted_at);
    const monthlyBudgetLimitMinor = categories.reduce((sum, c) => sum + (c.amount_minor || 0), 0);

    // Spend this month to date
    const monthExpenses = (state.transactions || []).filter(t => 
      !t.deleted_at && 
      t.type === 'expense' && 
      t.local_date.startsWith(currentYM)
    );
    const actualSpentSoFarMinor = monthExpenses.reduce((sum, t) => sum + t.amount_minor, 0);

    const burnRatePerDayMinor = Math.round(actualSpentSoFarMinor / daysPassedInCycle);
    const expectedRemainingSpendMinor = burnRatePerDayMinor * daysRemainingInCycle;
    const projectedMonthEndMinor = actualSpentSoFarMinor + expectedRemainingSpendMinor;

    let paceVerdict: 'under_budget' | 'near_budget' | 'over_budget' = 'under_budget';
    if (projectedMonthEndMinor > monthlyBudgetLimitMinor) {
      paceVerdict = 'over_budget';
    } else if (projectedMonthEndMinor >= monthlyBudgetLimitMinor * 0.9) {
      paceVerdict = 'near_budget';
    }

    // Derive actionable, honest insights
    const insights: string[] = [];

    const deltaBudgetMinor = monthlyBudgetLimitMinor - projectedMonthEndMinor;
    if (paceVerdict === 'under_budget') {
      const savedMajor = Math.round(Math.abs(deltaBudgetMinor) / 100);
      insights.push(`On pace to save ${savedMajor.toLocaleString()} DA under total monthly category limits.`);
    } else if (paceVerdict === 'over_budget') {
      const overMajor = Math.round(Math.abs(deltaBudgetMinor) / 100);
      insights.push(`At current velocity, spending will exceed monthly budget by approx. ${overMajor.toLocaleString()} DA.`);
    } else {
      insights.push(`Spending velocity is tightly aligned with your planned budget envelope.`);
    }

    // Check top category
    const categoryMetrics = this.getCategorySpendingMetrics('30d');
    const topCat = categoryMetrics[0];
    if (topCat && topCat.totalSpentMinor > 0) {
      insights.push(`${topCat.categoryName} represents ${topCat.percentageOfTotalSpend}% of total expenses this month.`);
    }

    // Check warning categories
    const exceededCats = categoryMetrics.filter(c => c.budgetStatus === 'exceeded');
    if (exceededCats.length > 0) {
      insights.push(`${exceededCats.map(c => c.categoryName).join(', ')} exceeded budget limits.`);
    }

    return {
      actualSpentSoFarMinor,
      expectedRemainingSpendMinor,
      monthlyBudgetLimitMinor,
      projectedMonthEndMinor,
      burnRatePerDayMinor,
      daysPassedInCycle,
      daysRemainingInCycle,
      paceVerdict,
      insights,
    };
  }
};
