import React, { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  LineChart, 
  PiggyBank, 
  Sliders, 
  Zap, 
  HandCoins, 
  Clock, 
  PieChart, 
  Target, 
  BarChart3, 
  HeartHandshake, 
  ShieldCheck, 
  CreditCard, 
  Plus, 
  ChevronRight, 
  Check, 
  Car, 
  Droplet, 
  Coffee, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { db, formatCurrency, getTodayLocalDate } from '../../services/storage';
import { FinanceService } from '../../services/financeService';
import { ForecastService } from '../../services/forecastService';
import { AllocationService } from '../../services/allocationService';
import { calculateMonthSpending } from '../../services/calculation';
import { LoanService } from '../../services/loanService';
import { QuickExpenseService } from '../../services/quickExpenseService';
import { SpendingAnalyticsService } from '../../services/spendingAnalyticsService';
import { ModuleWidgetConfig, QuickExpenseShortcut } from '../../types';
import { CircularProgressRing, DonutChart, CurvedLineChart, ComparisonBarChart, HorizontalProgressBar } from '../charts';
import { SpendingAnalyticsView } from './SpendingAnalyticsView';
import { SavingsGoalsManager } from './SavingsGoalsManager';
import { AllocationManagerView } from './AllocationManagerView';

interface FinanceWidgetRendererProps {
  widget: ModuleWidgetConfig;
  onRefresh: () => void;
  onOpenSalaryModal?: () => void;
  onOpenIncomeModal?: () => void;
  onOpenSavingsModal?: (mode: 'deposit' | 'withdraw' | 'adjust') => void;
  onOpenLoanModal?: () => void;
  onOpenRepaymentModal?: (loan: any) => void;
  onOpenCustomExpenseModal?: () => void;
  triggerToast?: (msg: string) => void;
}

export const FinanceWidgetRenderer: React.FC<FinanceWidgetRendererProps> = ({
  widget,
  onRefresh,
  onOpenSalaryModal,
  onOpenIncomeModal,
  onOpenSavingsModal,
  onOpenLoanModal,
  onOpenRepaymentModal,
  onOpenCustomExpenseModal,
  triggerToast = () => {},
}) => {
  const state = db.getState();
  const today = getTodayLocalDate();

  const cashSummary = FinanceService.getCashBalanceSummary();
  const savingsAccount = FinanceService.getSavingsAccount();
  const savingsGoals = FinanceService.getGoals();
  const primaryGoal = savingsGoals[0] || null;
  const monthSpending = calculateMonthSpending(state.transactions, state.settings.budget_cycle_start_day);
  const forecast = ForecastService.getMonthlyForecast('current');
  const loansSummary = LoanService.getSummary();
  const borrowerProfiles = LoanService.getBorrowerProfiles().slice(0, 3);
  const shortcuts = QuickExpenseService.getShortcuts();
  const todaySpending = QuickExpenseService.getTodaySpendingSummary();
  const sadaqahSummary = AllocationService.getSadaqahSummary();
  const activeAllocationPlan = AllocationService.getActivePlan();

  // Affordability interactive state
  const [affordAmount, setAffordAmount] = useState('');
  const [affordResult, setAffordResult] = useState<string | null>(null);

  // Quick expense form state inside daily expenses widget
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCat, setQuickCat] = useState(state.categories[0]?.id || 'cat-1');
  const [quickNote, setQuickNote] = useState('');

  const handleExecuteShortcut = (sc: QuickExpenseShortcut) => {
    const res = QuickExpenseService.executeQuickExpense(sc.id);
    if (res.success) {
      triggerToast(`✓ Recorded ${sc.name}: ${(sc.amount_minor / 100).toLocaleString()} ${state.settings.currency_label}`);
      onRefresh();
    } else {
      triggerToast(res.message);
    }
  };

  const handleTestAffordability = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(affordAmount);
    if (isNaN(val) || val <= 0) return;
    const check = ForecastService.checkPurchaseAffordability({
      name: 'Simulated Purchase',
      amountMajor: val,
    });
    setAffordResult(
      check.verdict !== 'not_recommended'
        ? `✓ Safe to purchase! Projected ending cushion remains ${formatCurrency(check.projectedBalanceAfterMinor, state.settings.currency_label)}.`
        : `⚠️ Caution: ${check.explanation}`
    );
  };

  const handleLogQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickAmount);
    if (isNaN(amt) || amt <= 0) return;
    QuickExpenseService.executeCustomExpense({
      name: quickNote || 'Daily Expense',
      amountMajor: amt,
      categoryId: quickCat,
      note: quickNote,
    });
    triggerToast(`✓ Added ${amt.toLocaleString()} ${state.settings.currency_label}`);
    setQuickAmount('');
    setQuickNote('');
    onRefresh();
  };

  switch (widget.widgetType) {
    // 1. Total Balance
    case 'finance_balance':
      return (
        <div className="card-premium p-4 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[var(--color-text-secondary)]">
              Available Cash
            </span>
            <div className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
            {formatCurrency(cashSummary.availableCashMinor, state.settings.currency_label)}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Current liquid checking balance
          </p>
        </div>
      );

    // 2. Monthly Income
    case 'finance_income':
      return (
        <div className="card-premium p-4 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[var(--color-text-secondary)]">
              Monthly Inflows
            </span>
            <div className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-positive)]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--color-positive)] tracking-tight">
            +{formatCurrency(cashSummary.monthIncomeMinor, state.settings.currency_label)}
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-[var(--color-text-secondary)]">
            <span>Salary & extra income</span>
            {onOpenIncomeModal && (
              <button onClick={onOpenIncomeModal} className="text-[var(--color-accent)] font-semibold hover:underline">
                + Add
              </button>
            )}
          </div>
        </div>
      );

    // 3. Monthly Expenses & Burn
    case 'finance_expenses':
      return (
        <div className="card-premium p-4 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[var(--color-text-secondary)]">
              Cycle Spending
            </span>
            <div className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-negative)]">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
            {formatCurrency(monthSpending, state.settings.currency_label)}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Burn: <strong>{formatCurrency(forecast.dailyBurnRateMinor, state.settings.currency_label)}/day</strong>
          </p>
        </div>
      );

    // 4. Savings Overview
    case 'finance_savings':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Wealth & Savings
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Secure Capital Reserve
                </h3>
              </div>
            </div>
            {onOpenSavingsModal && (
              <button
                onClick={() => onOpenSavingsModal('deposit')}
                className="px-2.5 py-1 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold shadow-sm tap-feedback"
              >
                + Deposit
              </button>
            )}
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black text-[var(--color-text-primary)]">
              {formatCurrency(savingsAccount.current_balance_minor, state.settings.currency_label)}
            </span>
            {primaryGoal && (
              <span className="text-xs font-bold text-[var(--color-positive)]">
                {primaryGoal.name}: {Math.round(((primaryGoal.current_saved_minor || 0) / primaryGoal.target_minor) * 100)}%
              </span>
            )}
          </div>
          {primaryGoal && (
            <HorizontalProgressBar
              value={primaryGoal.current_saved_minor || 0}
              max={primaryGoal.target_minor}
              color="var(--color-accent)"
              height={6}
            />
          )}
        </div>
      );

    // 5. Financial Forecast
    case 'finance_forecast':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <LineChart className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Runway Projection
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Monthly Financial Forecast
                </h3>
              </div>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              forecast.predictedEndingBalanceMinor >= 0 
                ? 'bg-[var(--color-positive)]/10 text-[var(--color-positive)]' 
                : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
            }`}>
              {forecast.predictedEndingBalanceMinor >= 0 ? 'Comfortable' : 'Runway Alert'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] block">
                Predicted Month-End Balance
              </span>
              <div className="text-lg font-black text-[var(--color-text-primary)]">
                {formatCurrency(forecast.predictedEndingBalanceMinor, state.settings.currency_label)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] block">
                Cash Runway
              </span>
              <div className="text-base font-bold text-[var(--color-accent)]">
                {forecast.daysRemainingInCycle} days
              </div>
            </div>
          </div>
        </div>
      );

    // 6. Spending Analytics
    case 'finance_spending_analytics':
      return <SpendingAnalyticsView onRefresh={onRefresh} />;

    // 7. Expenses by Category
    case 'finance_category_spending': {
      const topCategories = state.categories.slice(0, 4);
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Spending by Category
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">Active Limits</span>
          </div>

          <div className="space-y-2.5">
            {topCategories.map(cat => {
              const spent = state.transactions
                .filter(t => t.category_id === cat.id && !t.deleted_at && t.type === 'expense')
                .reduce((sum, t) => sum + t.amount_minor, 0);
              const limit = cat.amount_minor || 1;
              const pct = Math.min(100, Math.round((spent / limit) * 100));

              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[var(--color-text-primary)]">{cat.name}</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {formatCurrency(spent, state.settings.currency_label)} / {formatCurrency(limit, state.settings.currency_label)}
                    </span>
                  </div>
                  <HorizontalProgressBar value={spent} max={limit} color={cat.color || 'var(--color-accent)'} height={5} />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 8. Daily Expenses Quick Form
    case 'finance_daily_expenses':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Today's Spending
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {formatCurrency(todaySpending.totalMinor, state.settings.currency_label)}
                </h3>
              </div>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">{todaySpending.transactions.length} items</span>
          </div>

          <form onSubmit={handleLogQuickExpense} className="flex gap-2 pt-1">
            <input
              type="number"
              value={quickAmount}
              onChange={(e) => setQuickAmount(e.target.value)}
              placeholder="Amount (DA)"
              className="w-1/3 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Description..."
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold tap-feedback shadow-sm"
            >
              Add
            </button>
          </form>
        </div>
      );

    // 9. Quick Expense Shortcuts
    case 'finance_quick_expenses':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Quick Expenses
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  One-Tap Logging
                </h3>
              </div>
            </div>
            {onOpenCustomExpenseModal && (
              <button
                onClick={onOpenCustomExpenseModal}
                className="text-xs text-[var(--color-accent)] font-semibold hover:underline"
              >
                + Custom
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {shortcuts.map(sc => (
              <button
                key={sc.id}
                onClick={() => handleExecuteShortcut(sc)}
                className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] flex flex-col items-center justify-center gap-1 tap-feedback transition-all"
              >
                <div className="p-2 rounded-full bg-[var(--color-card)] text-[var(--color-accent)] border border-[var(--color-border)]">
                  {sc.icon === 'Car' ? <Car className="w-4 h-4" /> : sc.icon === 'Droplet' ? <Droplet className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
                </div>
                <span className="text-xs font-bold text-[var(--color-text-primary)] truncate max-w-full">
                  {sc.name}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {Math.round(sc.amount_minor / 100)} DA
                </span>
              </button>
            ))}
          </div>
        </div>
      );

    // 10. Money Lent to People
    case 'finance_money_lent':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <HandCoins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Receivables
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Money Lent to People
                </h3>
              </div>
            </div>
            {onOpenLoanModal && (
              <button
                onClick={onOpenLoanModal}
                className="px-2.5 py-1 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold shadow-sm tap-feedback"
              >
                + New Loan
              </button>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">Total Outstanding</span>
              <div className="text-lg font-black text-[var(--color-text-primary)]">
                {formatCurrency(loansSummary.stillOwedMinor, state.settings.currency_label)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">Recovered</span>
              <div className="text-sm font-bold text-[var(--color-positive)]">
                {formatCurrency(loansSummary.totalRepaidMinor, state.settings.currency_label)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {borrowerProfiles.map(b => (
              <div key={b.name} className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] text-xs">
                <span className="font-semibold text-[var(--color-text-primary)]">{b.name}</span>
                <span className="font-bold text-[var(--color-accent)]">
                  {formatCurrency(b.remainingMinor, state.settings.currency_label)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    // 11. Money Borrowed
    case 'finance_money_borrowed':
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-warning)]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Money Borrowed & Liabilities
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-positive)]/10 text-[var(--color-positive)]">
              Clear
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            No active outstanding debts or personal loans owed. Keep liabilities at zero.
          </p>
        </div>
      );

    // 12. Savings Goals
    case 'finance_savings_goals':
      return <SavingsGoalsManager onRefresh={onRefresh} onContribute={() => {}} />;

    // 13. Financial Allocation
    case 'finance_allocation':
      return <AllocationManagerView onRefresh={onRefresh} />;

    // 14. Sadaqah Overview
    case 'finance_sadaqah':
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[#38BDF8]">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Charity Allocation
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Monthly Sadaqah
                </h3>
              </div>
            </div>
            <span className="text-xs font-bold text-[#38BDF8]">
              {sadaqahSummary.monthlyProgressPct}%
            </span>
          </div>
          <div className="text-lg font-black text-[var(--color-text-primary)]">
            {formatCurrency(sadaqahSummary.monthlyContributedMinor, state.settings.currency_label)} / {formatCurrency(sadaqahSummary.monthlyTargetMinor, state.settings.currency_label)}
          </div>
          <HorizontalProgressBar value={sadaqahSummary.monthlyContributedMinor} max={sadaqahSummary.monthlyTargetMinor} color="#38BDF8" height={5} />
        </div>
      );

    // 15. Monthly Budget Progress
    case 'finance_budget': {
      const categories = FinanceService.getCategories();
      const totalBudgetMinor = categories.reduce((sum, c) => sum + (c.amount_minor || 0), 0);
      const consumedPercentage = totalBudgetMinor > 0 ? Math.min(100, Math.round((monthSpending / totalBudgetMinor) * 100)) : 0;
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Monthly Budget Progress
              </h3>
            </div>
            <span className="text-xs font-bold text-[var(--color-text-secondary)]">
              {consumedPercentage}% spent
            </span>
          </div>
          <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
            <span>Spent: <strong>{formatCurrency(monthSpending, state.settings.currency_label)}</strong></span>
            <span>Limit: <strong>{formatCurrency(totalBudgetMinor, state.settings.currency_label)}</strong></span>
          </div>
          <HorizontalProgressBar value={monthSpending} max={totalBudgetMinor} color="var(--color-accent)" height={6} />
        </div>
      );
    }

    // 16. Purchase Affordability
    case 'finance_affordability':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                Decision Guard
              </span>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Purchase Affordability Check
              </h3>
            </div>
          </div>
          <form onSubmit={handleTestAffordability} className="flex gap-2">
            <input
              type="number"
              value={affordAmount}
              onChange={(e) => setAffordAmount(e.target.value)}
              placeholder="Enter planned cost in DA..."
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold tap-feedback shadow-sm"
            >
              Test
            </button>
          </form>
          {affordResult && (
            <p className="text-xs font-semibold p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] animate-fade-in">
              {affordResult}
            </p>
          )}
        </div>
      );

    // 17. Income vs Expenses Chart
    case 'finance_income_vs_expenses':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Income vs Expenses Pace
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">Total Inflow</span>
              <div className="text-base font-black text-[var(--color-positive)]">
                {formatCurrency(cashSummary.monthIncomeMinor, state.settings.currency_label)}
              </div>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">Total Outflow</span>
              <div className="text-base font-black text-[var(--color-negative)]">
                {formatCurrency(monthSpending, state.settings.currency_label)}
              </div>
            </div>
          </div>
        </div>
      );

    // 18. Transactions Ledger
    case 'finance_transactions': {
      const recentTx = (state.transactions || []).filter(t => !t.deleted_at).slice(0, 5);
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Recent Ledger
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">Latest Entries</span>
          </div>

          <div className="space-y-2">
            {recentTx.map(t => (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface)]/70 border border-[var(--color-border)] text-xs">
                <div>
                  <div className="font-semibold text-[var(--color-text-primary)]">{t.note || 'Expense'}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{t.local_date}</div>
                </div>
                <div className={`font-bold ${t.type === 'income' ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-primary)]'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount_minor, state.settings.currency_label)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};
