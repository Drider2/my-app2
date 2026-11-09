// Monthly Financial Forecast & Purchase Affordability Service
import { db, getTodayLocalDate } from './storage';
import { FinanceService } from './financeService';
import { calculateItemMonthlyEstimate } from './maintenanceService';
import { 
  MonthlyForecastData, 
  ForecastProjectionPoint, 
  FinancialWarning, 
  AffordabilityCheckResult, 
  AffordabilityVerdict 
} from '../types';

export const ForecastService = {
  /**
   * Generates monthly forecast data for current or next cycle
   */
  getMonthlyForecast(period: 'current' | 'next' = 'current'): MonthlyForecastData {
    const state = db.getState();
    const today = getTodayLocalDate();
    const now = new Date();
    
    // Determine target month and year
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-indexed
    
    if (period === 'next') {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0);
    const daysInMonth = monthEnd.getDate();
    
    const targetYM = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const periodLabel = `${monthNames[targetMonth]} ${targetYear}`;

    // Financial base figures
    const cashSummary = FinanceService.getCashBalanceSummary();
    const salarySetting = FinanceService.getSalarySetting();
    const allocation = FinanceService.getSalaryAllocation();
    
    const currentLiquidCash = cashSummary.availableCashMinor;
    const monthlySalary = salarySetting.monthly_salary_minor;
    const plannedSavings = allocation.savings_amount_minor || 2000000; // 20,000 DA default
    
    // Days calculation
    const currentDay = period === 'current' ? now.getDate() : 0;
    const daysRemaining = period === 'current' 
      ? Math.max(1, daysInMonth - currentDay) 
      : daysInMonth;
    const daysElapsed = period === 'current' ? Math.max(1, currentDay) : 0;

    // Confirmed actual income and expenses in the target month
    let confirmedIncome = 0;
    let confirmedExpenses = 0;
    const categorySpendingMap = new Map<string, number>();

    for (const tx of state.transactions) {
      if (tx.deleted_at) continue;
      if (tx.local_date.startsWith(targetYM)) {
        if (tx.type === 'income') {
          confirmedIncome += tx.amount_minor;
        } else if (tx.type === 'expense') {
          confirmedExpenses += tx.amount_minor;
          const catId = tx.category_id || 'other';
          categorySpendingMap.set(catId, (categorySpendingMap.get(catId) || 0) + tx.amount_minor);
        }
      }
    }

    // Expected remaining income
    let expectedIncome = 0;
    if (period === 'current') {
      // If salary payment day has not occurred yet this month or confirmed income is below salary
      if (confirmedIncome >= monthlySalary) {
        expectedIncome = confirmedIncome;
      } else {
        expectedIncome = Math.max(monthlySalary, confirmedIncome);
      }
    } else {
      expectedIncome = monthlySalary;
    }

    // Upcoming recurring maintenance / bills for the period
    let upcomingRecurring = 0;
    for (const item of (state.maintenanceItems || [])) {
      if (item.deleted_at || item.is_purchased || item.status === 'completed') continue;
      
      if (period === 'current') {
        // Bills due between today and month end
        if (item.next_reminder_date >= today && item.next_reminder_date.startsWith(targetYM)) {
          upcomingRecurring += item.estimated_cost_minor;
        }
      } else {
        // Next month estimate
        upcomingRecurring += calculateItemMonthlyEstimate(item);
      }
    }

    // Daily variable burn rate calculation
    let dailyBurnRate = 0;
    if (period === 'current') {
      if (daysElapsed > 0 && confirmedExpenses > 0) {
        dailyBurnRate = Math.round(confirmedExpenses / daysElapsed);
      } else {
        // Benchmark burn rate from discretionary budget
        dailyBurnRate = Math.round((monthlySalary * 0.4) / daysInMonth);
      }
    } else {
      dailyBurnRate = Math.round((monthlySalary * 0.4) / daysInMonth);
    }

    const estimatedVariable = Math.round(dailyBurnRate * daysRemaining);

    // Starting balance for the period
    const startingBalance = period === 'current' 
      ? currentLiquidCash 
      : Math.max(0, currentLiquidCash + (expectedIncome - confirmedIncome) - upcomingRecurring - estimatedVariable - plannedSavings);

    // Predicted ending balance
    // Predicted = Liquid Cash + (Remaining Expected Income) - Upcoming Recurring - Estimated Variable - Planned Savings
    const remainingIncome = period === 'current' 
      ? Math.max(0, expectedIncome - confirmedIncome) 
      : expectedIncome;

    const baseForPrediction = period === 'current' ? currentLiquidCash : startingBalance;
    const predictedEndingBalance = baseForPrediction + remainingIncome - upcomingRecurring - estimatedVariable - (period === 'current' ? plannedSavings : plannedSavings);

    // Daily Projection Points for Chart
    const dailyProjectedPoints: ForecastProjectionPoint[] = [];
    let runningBalance = period === 'current' ? (currentLiquidCash + confirmedExpenses) : startingBalance;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDateStr = `${targetYM}-${String(d).padStart(2, '0')}`;
      const isPastOrToday = period === 'current' ? d <= currentDay : false;

      if (isPastOrToday) {
        // Calculate day's actual expenses up to this point
        const dayExpenses = state.transactions
          .filter(t => !t.deleted_at && t.type === 'expense' && t.local_date === dayDateStr)
          .reduce((sum, t) => sum + t.amount_minor, 0);
        
        runningBalance -= dayExpenses;

        dailyProjectedPoints.push({
          day: d,
          date: dayDateStr,
          actualBalanceMinor: Math.max(0, runningBalance),
          projectedBalanceMinor: Math.max(0, runningBalance),
          isProjected: false,
        });
      } else {
        // Extrapolate future days
        const projectedDailyDrop = dailyBurnRate + (upcomingRecurring / Math.max(1, daysRemaining));
        runningBalance -= projectedDailyDrop;

        dailyProjectedPoints.push({
          day: d,
          date: dayDateStr,
          actualBalanceMinor: null,
          projectedBalanceMinor: Math.max(0, runningBalance),
          isProjected: true,
        });
      }
    }

    // Top Expense Categories with percentages
    const totalProjectedSpend = Math.max(1, confirmedExpenses + upcomingRecurring + estimatedVariable);
    const topExpenseCategories = (state.categories || []).map(cat => {
      const actual = categorySpendingMap.get(cat.id) || 0;
      return {
        name: cat.name,
        amountMinor: actual,
        percentage: Math.round((actual / totalProjectedSpend) * 100),
      };
    }).sort((a, b) => b.amountMinor - a.amountMinor);

    // Financial Warnings (Intelligent, non-judgmental)
    const warnings: FinancialWarning[] = [];

    // 1. Budget Risk
    const totalExpectedBurn = confirmedExpenses + upcomingRecurring + estimatedVariable;
    if (totalExpectedBurn > expectedIncome) {
      const overAmount = totalExpectedBurn - expectedIncome;
      warnings.push({
        id: 'warn-budget',
        type: 'budget_risk',
        severity: 'high',
        message: 'Projected Monthly Deficit',
        detail: `At current burn rate, total spending (${Math.round(totalExpectedBurn / 100).toLocaleString()} DA) will exceed expected income by ${Math.round(overAmount / 100).toLocaleString()} DA.`,
      });
    }

    // 2. Low Cash Runway
    if (predictedEndingBalance < 500000) { // Below 5,000 DA
      warnings.push({
        id: 'warn-runway',
        type: 'low_cash_runway',
        severity: predictedEndingBalance < 0 ? 'high' : 'medium',
        message: 'Low Month-End Runway Cushion',
        detail: predictedEndingBalance < 0 
          ? 'Projected cash balance reaches a negative deficit before the end of this cycle.'
          : 'Projected liquid balance is below the recommended 5,000 DA safety buffer.',
      });
    }

    // 3. Savings Cushion Risk
    if (plannedSavings > 0 && predictedEndingBalance < plannedSavings) {
      warnings.push({
        id: 'warn-savings',
        type: 'savings_risk',
        severity: 'medium',
        message: 'Savings Contribution at Risk',
        detail: `Liquid cash cushion may not comfortably support the planned ${Math.round(plannedSavings / 100).toLocaleString()} DA savings transfer this cycle.`,
      });
    }

    // 4. Upcoming Major Bills (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().slice(0, 10);

    const upcomingSoon = (state.maintenanceItems || []).filter(item => 
      !item.deleted_at && 
      !item.is_purchased && 
      item.status !== 'completed' &&
      item.next_reminder_date >= today &&
      item.next_reminder_date <= sevenDaysStr &&
      item.estimated_cost_minor >= 150000 // >= 1,500 DA
    );

    if (upcomingSoon.length > 0) {
      const totalSoon = upcomingSoon.reduce((s, i) => s + i.estimated_cost_minor, 0);
      warnings.push({
        id: 'warn-bills',
        type: 'upcoming_bill',
        severity: 'low',
        message: `${upcomingSoon.length} Scheduled Bill${upcomingSoon.length > 1 ? 's' : ''} Due Within 7 Days`,
        detail: `${upcomingSoon.map(i => i.name).join(', ')} totaling ${Math.round(totalSoon / 100).toLocaleString()} DA scheduled soon.`,
      });
    }

    return {
      period,
      periodLabel,
      startingBalanceMinor: startingBalance,
      expectedIncomeMinor: expectedIncome,
      confirmedExpensesMinor: confirmedExpenses,
      upcomingRecurringMinor: upcomingRecurring,
      estimatedVariableMinor: estimatedVariable,
      plannedSavingsMinor: plannedSavings,
      predictedEndingBalanceMinor: predictedEndingBalance,
      daysRemainingInCycle: daysRemaining,
      dailyBurnRateMinor: dailyBurnRate,
      dailyProjectedPoints,
      topExpenseCategories,
      warnings,
    };
  },

  /**
   * "Can I Afford It?" Purchase Affordability Checker
   * Evaluates discretionary runway after all commitments and planned savings
   */
  checkPurchaseAffordability(params: {
    name: string;
    amountMajor: number;
    date?: string;
  }): AffordabilityCheckResult {
    const forecast = this.getMonthlyForecast('current');
    const cashSummary = FinanceService.getCashBalanceSummary();
    const purchasePriceMinor = Math.round(params.amountMajor * 100);

    const currentAvailableMinor = cashSummary.availableCashMinor;
    const upcomingCommitmentsMinor = forecast.upcomingRecurringMinor + forecast.estimatedVariableMinor;
    
    // Discretionary limit = Current cash + remaining income - upcoming bills - estimated burn - planned savings - safety cushion (5,000 DA)
    const safetyBufferMinor = 500000; // 5,000 DA
    const safeDiscretionaryLimitMinor = Math.max(
      0, 
      forecast.predictedEndingBalanceMinor - safetyBufferMinor
    );

    const projectedBalanceAfterMinor = forecast.predictedEndingBalanceMinor - purchasePriceMinor;

    let verdict: AffordabilityVerdict;
    let title: string;
    let explanation: string;
    let impactOnSavingsGoal: string;

    if (purchasePriceMinor <= safeDiscretionaryLimitMinor) {
      verdict = 'comfortable';
      title = 'Comfortable Purchase';
      explanation = `You can safely make this purchase of ${params.amountMajor.toLocaleString()} DA. Your essential commitments and planned savings will remain fully protected, leaving a projected month-end cushion of ${Math.round(projectedBalanceAfterMinor / 100).toLocaleString()} DA.`;
      impactOnSavingsGoal = 'No impact on your savings timeline. Monthly target remains 100% on track.';
    } else if (projectedBalanceAfterMinor >= 0) {
      verdict = 'possible_caution';
      title = 'Possible, But Requires Caution';
      explanation = `You have the liquid funds for ${params.name || 'this item'}, but it will reduce your end-of-month discretionary buffer to ${Math.round(projectedBalanceAfterMinor / 100).toLocaleString()} DA. You will need to restrict non-essential variable spending for the remaining ${forecast.daysRemainingInCycle} days.`;
      impactOnSavingsGoal = 'May require slightly reducing your monthly savings deposit by up to 20% if unexpected bills arise.';
    } else {
      verdict = 'not_recommended';
      title = 'Not Recommended Right Now';
      const deficit = Math.abs(projectedBalanceAfterMinor);
      explanation = `This purchase would overextend your current cash flow by ${Math.round(deficit / 100).toLocaleString()} DA before the next pay cycle. Making this purchase now would compromise upcoming essential bills or force withdrawing from savings.`;
      impactOnSavingsGoal = 'High risk: Would require liquidating emergency savings or failing monthly deposit goals.';
    }

    return {
      verdict,
      title,
      explanation,
      purchasePriceMinor,
      currentAvailableMinor,
      projectedBalanceAfterMinor,
      upcomingCommitmentsMinor,
      safeDiscretionaryLimitMinor,
      impactOnSavingsGoal,
    };
  }
};
