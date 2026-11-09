import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3, 
  LineChart as LineChartIcon, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  ChevronRight, 
  Info,
  DollarSign,
  HeartHandshake,
  PiggyBank,
  Sliders,
  Wallet
} from 'lucide-react';
import { db, formatCurrency } from '../../services/storage';
import { SpendingAnalyticsService } from '../../services/spendingAnalyticsService';
import { AllocationService } from '../../services/allocationService';
import { FinanceService } from '../../services/financeService';
import { AnalyticsTimeRange, CategoryAnalyticsMetric } from '../../types';

interface SpendingAnalyticsViewProps {
  onRefresh: () => void;
  onOpenSavingsModal?: (goalId?: string) => void;
}

export const SpendingAnalyticsView: React.FC<SpendingAnalyticsViewProps> = ({ 
  onRefresh,
  onOpenSavingsModal 
}) => {
  const state = db.getState();
  const currencyLabel = state.settings.currency_label || 'DA';

  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Active Goals Switcher
  const allGoals = FinanceService.getGoals(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(allGoals[0]?.id || '');

  // Analytics Data Queries
  const spendingProgress = SpendingAnalyticsService.getSpendingProgress(timeRange);
  const incomeVsSpending = SpendingAnalyticsService.getIncomeVsSpendingComparison(timeRange);
  const categoryMetrics = SpendingAnalyticsService.getCategorySpendingMetrics(timeRange);
  const trendForecast = SpendingAnalyticsService.getSpendingTrendForecast();
  const activePlan = AllocationService.getActivePlan();
  const planDistribution = AllocationService.calculatePlanDistribution(activePlan);
  const sadaqahSummary = AllocationService.getSadaqahSummary();

  const selectedGoalProjection = selectedGoalId 
    ? FinanceService.getGoalProjections(selectedGoalId) 
    : (allGoals[0] ? FinanceService.getGoalProjections(allGoals[0].id) : null);

  const selectedCategoryMetric = selectedCategoryId 
    ? categoryMetrics.find(c => c.categoryId === selectedCategoryId) 
    : (categoryMetrics[0] || null);

  // SVG Chart Dimensions & Path Generation for Graph 1
  const chartWidth = 520;
  const chartHeight = 180;
  const paddingX = 24;
  const paddingY = 20;

  const points = spendingProgress.points;
  const maxSpend = Math.max(
    spendingProgress.totalBudgetMinor,
    spendingProgress.projectedEndMinor,
    spendingProgress.totalSpentMinor,
    100000
  );

  const getCoordinates = (p: typeof points[0], index: number) => {
    const x = paddingX + (index / Math.max(1, points.length - 1)) * (chartWidth - paddingX * 2);
    const yFraction = p.actualCumulativeMinor / maxSpend;
    const y = chartHeight - paddingY - yFraction * (chartHeight - paddingY * 2);
    return { x, y };
  };

  const getPaceCoordinates = (p: typeof points[0], index: number) => {
    const x = paddingX + (index / Math.max(1, points.length - 1)) * (chartWidth - paddingX * 2);
    const yFraction = p.budgetPaceMinor / maxSpend;
    const y = chartHeight - paddingY - yFraction * (chartHeight - paddingY * 2);
    return { x, y };
  };

  // Build SVG Smooth Curve Path for Actual Spend
  let spendPathD = '';
  let areaPathD = '';
  if (points.length > 0) {
    const coords = points.map((p, i) => getCoordinates(p, i));
    spendPathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      spendPathD += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    const lastCoord = coords[coords.length - 1];
    areaPathD = `${spendPathD} L ${lastCoord.x} ${chartHeight - paddingY} L ${coords[0].x} ${chartHeight - paddingY} Z`;
  }

  // Build SVG Line Path for Budget Pace
  let pacePathD = '';
  if (points.length > 0) {
    const paceCoords = points.map((p, i) => getPaceCoordinates(p, i));
    pacePathD = `M ${paceCoords[0].x} ${paceCoords[0].y}`;
    for (let i = 1; i < paceCoords.length; i++) {
      pacePathD += ` L ${paceCoords[i].x} ${paceCoords[i].y}`;
    }
  }

  const timeRangeTabs: { id: AnalyticsTimeRange; label: string }[] = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '3m', label: '3M' },
    { id: '6m', label: '6M' },
    { id: '1y', label: '1Y' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Controls: Time Range Selector */}
      <div className="flex items-center justify-between bg-[var(--color-surface)] p-1.5 rounded-2xl border border-[var(--color-border)]">
        <div className="flex items-center gap-1">
          {timeRangeTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all tap-feedback ${
                timeRange === tab.id
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] '
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[#222C24]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] px-2 font-medium">
          <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>{timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : timeRange === '3m' ? 'Last 3 Months' : timeRange === '6m' ? 'Last 6 Months' : 'Last 12 Months'}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* GRAPH 1: SPENDING PROGRESS & BUDGET PACE                 */}
      {/* ======================================================== */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#222C24] text-[var(--color-accent)] border border-[var(--color-border)]">
              <LineChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Spending Progress vs Budget</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Cumulative spending velocity and ceiling pace</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-[var(--color-text-primary)] block">
              {formatCurrency(spendingProgress.totalSpentMinor, currencyLabel)}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              of {formatCurrency(spendingProgress.totalBudgetMinor, currencyLabel)} limit
            </span>
          </div>
        </div>

        {/* Interactive SVG Chart */}
        <div className="relative w-full rounded-2xl bg-[#111214] border border-[#22252A] p-2 overflow-hidden">
          <svg 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
            className="w-full h-44 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A6D96A" stopOpacity="0.35" />
                <stop offset="85%" stopColor="#A6D96A" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal grid lines */}
            <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#22252A" strokeDasharray="3 3" />
            <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="#22252A" strokeDasharray="3 3" />
            <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#292C31" />

            {/* Budget Pace Dashed Guide Line */}
            {pacePathD && (
              <path 
                d={pacePathD} 
                fill="none" 
                stroke="#707B71" 
                strokeWidth="1.8" 
                strokeDasharray="4 4" 
              />
            )}

            {/* Actual Spending Area Fill */}
            {areaPathD && (
              <path d={areaPathD} fill="url(#spendGrad)" />
            )}

            {/* Actual Spending Trend Curve */}
            {spendPathD && (
              <path 
                d={spendPathD} 
                fill="none" 
                stroke="#A6D96A" 
                strokeWidth="2.8" 
                strokeLinecap="round" 
              />
            )}

            {/* End Point Marker */}
            {points.length > 0 && (
              <g>
                <circle 
                  cx={getCoordinates(points[points.length - 1], points.length - 1).x} 
                  cy={getCoordinates(points[points.length - 1], points.length - 1).y} 
                  r="5" 
                  fill="#A6D96A" 
                  stroke="#111214" 
                  strokeWidth="2" 
                />
              </g>
            )}
          </svg>

          {/* Chart Legends */}
          <div className="flex items-center justify-between pt-1 px-2 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[var(--color-accent)] rounded-full" />
                <span className="text-[var(--color-text-primary)] font-semibold">Actual Spending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-b border-dashed border-[#707B71]" />
                <span>Budget Pace</span>
              </div>
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              Daily Burn: ~{formatCurrency(spendingProgress.dailyAverageMinor, currencyLabel)}/day
            </div>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">Total Spent</span>
            <span className="text-xs font-black text-[var(--color-accent)]">
              {formatCurrency(spendingProgress.totalSpentMinor, currencyLabel)}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">Remaining Budget</span>
            <span className="text-xs font-black text-[var(--color-text-primary)]">
              {formatCurrency(spendingProgress.budgetRemainingMinor, currencyLabel)}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">Daily Average</span>
            <span className="text-xs font-black text-[#83A98A]">
              {formatCurrency(spendingProgress.dailyAverageMinor, currencyLabel)}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* GRAPH 2: INCOME VS SPENDING (CASH FLOW ALLOCATION)      */}
      {/* ======================================================== */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#222C24] text-[var(--color-accent)] border border-[var(--color-border)]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Income vs Spending Flow</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">True cash flow: expenses, savings reserve & charity</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[var(--color-accent)] px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
            {incomeVsSpending.periodLabel}
          </span>
        </div>

        {/* Income Stack Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-secondary)]">Total Income Basis:</span>
            <span className="font-bold text-[var(--color-accent)]">
              {formatCurrency(incomeVsSpending.totalIncomeMinor, currencyLabel)}
            </span>
          </div>

          {/* Segmented Distribution Bar */}
          <div className="h-4 rounded-xl bg-[#111214] border border-[#22252A] p-0.5 flex overflow-hidden">
            {/* Expenses */}
            <div 
              style={{ width: `${Math.min(100, Math.round((incomeVsSpending.actualExpensesMinor / Math.max(1, incomeVsSpending.totalIncomeMinor)) * 100))}%` }} 
              className="bg-[#F59E0B] rounded-l-lg transition-all"
              title={`Expenses: ${formatCurrency(incomeVsSpending.actualExpensesMinor, currencyLabel)}`}
            />
            {/* Savings Transfers */}
            <div 
              style={{ width: `${Math.min(100, Math.round((incomeVsSpending.savingsTransfersMinor / Math.max(1, incomeVsSpending.totalIncomeMinor)) * 100))}%` }} 
              className="bg-[#38BDF8] transition-all"
              title={`Savings: ${formatCurrency(incomeVsSpending.savingsTransfersMinor, currencyLabel)}`}
            />
            {/* Sadaqah */}
            <div 
              style={{ width: `${Math.min(100, Math.round((incomeVsSpending.sadaqahContributionsMinor / Math.max(1, incomeVsSpending.totalIncomeMinor)) * 100))}%` }} 
              className="bg-[#06B6D4] transition-all"
              title={`Sadaqah: ${formatCurrency(incomeVsSpending.sadaqahContributionsMinor, currencyLabel)}`}
            />
            {/* Remaining Surplus */}
            <div 
              style={{ width: `${Math.max(0, 100 - Math.round(((incomeVsSpending.actualExpensesMinor + incomeVsSpending.savingsTransfersMinor) / Math.max(1, incomeVsSpending.totalIncomeMinor)) * 100))}%` }} 
              className="bg-[var(--color-accent)] rounded-r-lg transition-all"
              title={`Surplus: ${formatCurrency(incomeVsSpending.netRemainingBalanceMinor, currencyLabel)}`}
            />
          </div>
        </div>

        {/* 4 Cash Flow Matrix Cards */}
        <div className="grid grid-cols-2 gap-2">
          {/* Expenses */}
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block">Expenses</span>
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {formatCurrency(incomeVsSpending.actualExpensesMinor, currencyLabel)}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#F59E0B]">
              {Math.round((incomeVsSpending.actualExpensesMinor / Math.max(1, incomeVsSpending.totalIncomeMinor)) * 100)}%
            </span>
          </div>

          {/* Savings Transfers */}
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block">Savings</span>
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {formatCurrency(incomeVsSpending.savingsTransfersMinor, currencyLabel)}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#38BDF8]">
              {Math.round((incomeVsSpending.savingsTransfersMinor / Math.max(1, incomeVsSpending.totalIncomeMinor)) * 100)}%
            </span>
          </div>

          {/* Sadaqah Contributions */}
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block">Sadaqah</span>
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {formatCurrency(incomeVsSpending.sadaqahContributionsMinor, currencyLabel)}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#06B6D4]">
              {Math.round((incomeVsSpending.sadaqahContributionsMinor / Math.max(1, incomeVsSpending.totalIncomeMinor)) * 100)}%
            </span>
          </div>

          {/* Unspent Surplus */}
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block">Surplus Cash</span>
                <span className="text-xs font-bold text-[var(--color-accent)]">
                  {formatCurrency(incomeVsSpending.netRemainingBalanceMinor, currencyLabel)}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-[var(--color-accent)]">
              {Math.max(0, 100 - Math.round(((incomeVsSpending.actualExpensesMinor + incomeVsSpending.savingsTransfersMinor) / Math.max(1, incomeVsSpending.totalIncomeMinor)) * 100))}%
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* GRAPH 3: SPENDING BY CATEGORY & LIMIT WARNINGS           */}
      {/* ======================================================== */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#222C24] text-[var(--color-accent)] border border-[var(--color-border)]">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Spending by Category</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Category breakdown, thresholds & transaction stats</p>
            </div>
          </div>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {categoryMetrics.length} categories
          </span>
        </div>

        {/* Selected Category Deep Dive Card */}
        {selectedCategoryMetric && (
          <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-accent)]/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: selectedCategoryMetric.categoryColor }} 
                />
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {selectedCategoryMetric.categoryName}
                </span>
                <span className={`text-xs font-bold px-1.5 py-0.2 rounded  ${
                  selectedCategoryMetric.budgetStatus === 'exceeded'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : selectedCategoryMetric.budgetStatus === 'warning'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                }`}>
                  {selectedCategoryMetric.budgetStatus}
                </span>
              </div>
              <span className="text-xs font-black text-[var(--color-accent)]">
                {formatCurrency(selectedCategoryMetric.totalSpentMinor, currencyLabel)}
              </span>
            </div>

            {/* Micro Metrics Row */}
            <div className="grid grid-cols-4 gap-1.5 text-center pt-1">
              <div className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] block">Share</span>
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {selectedCategoryMetric.percentageOfTotalSpend}%
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] block">Count</span>
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {selectedCategoryMetric.transactionCount} txs
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] block">Avg Ticket</span>
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {formatCurrency(selectedCategoryMetric.averageTransactionMinor, currencyLabel)}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] block">Change</span>
                <span className={`text-xs font-bold flex items-center justify-center gap-0.5 ${
                  selectedCategoryMetric.deltaPct > 0 ? 'text-amber-400' : 'text-[var(--color-accent)]'
                }`}>
                  {selectedCategoryMetric.deltaPct > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {Math.abs(selectedCategoryMetric.deltaPct)}%
                </span>
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">
                  Budget consumed: {selectedCategoryMetric.budgetConsumedPct}%
                </span>
                <span className="text-[var(--color-text-muted)]">
                  Limit: {formatCurrency(selectedCategoryMetric.budgetMinor, currencyLabel)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#22252A] overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    selectedCategoryMetric.budgetStatus === 'exceeded'
                      ? 'bg-rose-500'
                      : selectedCategoryMetric.budgetStatus === 'warning'
                      ? 'bg-amber-400'
                      : 'bg-[var(--color-accent)]'
                  }`}
                  style={{ width: `${Math.min(100, selectedCategoryMetric.budgetConsumedPct)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Category List */}
        <div className="space-y-2">
          {categoryMetrics.map(cat => {
            const isSelected = selectedCategoryId === cat.categoryId;
            return (
              <div 
                key={cat.categoryId}
                onClick={() => setSelectedCategoryId(cat.categoryId)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer tap-feedback ${
                  isSelected 
                    ? 'bg-[#222C24] border-[var(--color-accent)]' 
                    : 'bg-[var(--color-surface-subtle)] border-[var(--color-border)] hover:border-[#364438]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: cat.categoryColor }} 
                    />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {cat.categoryName}
                    </span>
                    {cat.budgetStatus === 'exceeded' && (
                      <span className="text-xs font-bold px-1 rounded bg-rose-500/20 text-rose-400">
                        Exceeded
                      </span>
                    )}
                    {cat.budgetStatus === 'warning' && (
                      <span className="text-xs font-bold px-1 rounded bg-amber-500/20 text-amber-400">
                        80%+
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                      {formatCurrency(cat.totalSpentMinor, currencyLabel)}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {cat.percentageOfTotalSpend}% of total
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-1.5 h-1 rounded-full bg-[#22252A] overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      cat.budgetStatus === 'exceeded' 
                        ? 'bg-rose-500' 
                        : cat.budgetStatus === 'warning' 
                        ? 'bg-amber-400' 
                        : 'bg-[var(--color-accent)]'
                    }`}
                    style={{ width: `${Math.min(100, cat.budgetConsumedPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* GRAPH 4: SPENDING TREND & RUN-RATE FORECAST             */}
      {/* ======================================================== */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#222C24] text-[var(--color-accent)] border border-[var(--color-border)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Spending Trend & Forecast</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Month-end run-rate projection & derived insights</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border  ${
            trendForecast.paceVerdict === 'over_budget'
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              : trendForecast.paceVerdict === 'near_budget'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)]/30'
          }`}>
            {trendForecast.paceVerdict.replace('_', ' ')}
          </span>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">Spent So Far</span>
            <span className="text-xs font-black text-[var(--color-text-primary)]">
              {formatCurrency(trendForecast.actualSpentSoFarMinor, currencyLabel)}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {trendForecast.daysPassedInCycle} days passed
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">Expected Rest</span>
            <span className="text-xs font-black text-[#83A98A]">
              {formatCurrency(trendForecast.expectedRemainingSpendMinor, currencyLabel)}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {trendForecast.daysRemainingInCycle} days left
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">Projected Total</span>
            <span className={`text-xs font-black ${
              trendForecast.projectedMonthEndMinor > trendForecast.monthlyBudgetLimitMinor
                ? 'text-rose-400'
                : 'text-[var(--color-accent)]'
            }`}>
              {formatCurrency(trendForecast.projectedMonthEndMinor, currencyLabel)}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              Budget: {formatCurrency(trendForecast.monthlyBudgetLimitMinor, currencyLabel)}
            </span>
          </div>
        </div>

        {/* Actionable Derived Insights */}
        <div className="space-y-1.5 p-3 rounded-2xl bg-[#111214] border border-[#22252A]">
          <span className="text-xs font-bold text-[var(--color-accent)] flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            Key Insights
          </span>
          {trendForecast.insights.map((insight, idx) => (
            <p key={idx} className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              • {insight}
            </p>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* VISUAL FINANCIAL GOAL PROGRESS CARD                      */}
      {/* ======================================================== */}
      {selectedGoalProjection && (
        <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#222C24] text-[var(--color-accent)] border border-[var(--color-border)]">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Financial Goal Progress</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">Visual milestone trajectory & completion horizon</p>
              </div>
            </div>

            {/* Goal Switcher Selector */}
            {allGoals.length > 1 && (
              <select
                value={selectedGoalId}
                onChange={e => setSelectedGoalId(e.target.value)}
                className="text-xs bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-xl px-2.5 py-1 text-[var(--color-accent)] font-bold focus:outline-none"
              >
                {allGoals.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Goal Headline: "37,500 DA saved toward 50,000 DA — 75% completed" */}
          <div className="p-3.5 rounded-2xl bg-[#111214] border border-[#22252A] space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] block">
                  {selectedGoalProjection.goal.name}
                </span>
                <div className="text-base font-black text-[var(--color-text-primary)]">
                  <span className="text-[var(--color-accent)]">
                    {formatCurrency(selectedGoalProjection.currentSavedMinor, currencyLabel)}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)] font-normal mx-1">saved toward</span>
                  <span>{formatCurrency(selectedGoalProjection.targetMinor, currencyLabel)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-[var(--color-accent)]">
                  {selectedGoalProjection.progressPct}%
                </span>
                <span className="text-xs text-[var(--color-text-secondary)] block">completed</span>
              </div>
            </div>

            {/* Visual Progress Bar with Marker */}
            <div className="relative pt-1 pb-1">
              <div className="h-2 rounded-full bg-[#22252A] overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#83A98A] to-[#A6D96A] transition-all"
                  style={{ width: `${selectedGoalProjection.progressPct}%` }}
                />
              </div>
            </div>

            {/* Milestone projection metrics */}
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] pt-1 border-t border-[#22252A]">
              <div>
                <span className="text-[var(--color-text-muted)] block">Remaining</span>
                <span className="font-bold text-[var(--color-text-primary)]">
                  {formatCurrency(selectedGoalProjection.remainingMinor, currencyLabel)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[var(--color-text-muted)] block">Monthly Pace</span>
                <span className="font-bold text-[var(--color-accent)]">
                  {formatCurrency(selectedGoalProjection.monthlyContributionMinor, currencyLabel)}/mo
                </span>
              </div>
              <div className="text-right">
                <span className="text-[var(--color-text-muted)] block">Projected Finish</span>
                <span className="font-bold text-[#38BDF8]">
                  {selectedGoalProjection.estimatedCompletionDate}
                </span>
              </div>
            </div>
          </div>

          {onOpenSavingsModal && (
            <button
              onClick={() => onOpenSavingsModal(selectedGoalProjection.goal.id)}
              className="w-full py-2 bg-[#222C24] hover:bg-[#2A342C] border border-[var(--color-border)] text-[var(--color-accent)] text-xs font-bold rounded-xl transition-all tap-feedback flex items-center justify-center gap-1.5"
            >
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Contribute to {selectedGoalProjection.goal.name}</span>
            </button>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SADAQAH / CHARITY ALLOCATION SUMMARY CARD                */}
      {/* ======================================================== */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#222C24] text-[#38BDF8] border border-[var(--color-border)]">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Sadaqah & Charitable Deeds</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Planned vs confirmed contributions (never auto-deducted)</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            sadaqahSummary.isGoalMet 
              ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)]/30' 
              : 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/30'
          }`}>
            {sadaqahSummary.monthlyProgressPct}% of Target
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-[var(--color-text-secondary)] block">This Month Given</span>
              <span className="text-sm font-black text-[#38BDF8]">
                {formatCurrency(sadaqahSummary.monthlyContributedMinor, currencyLabel)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--color-text-secondary)] block">Planned Target</span>
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                {formatCurrency(sadaqahSummary.monthlyTargetMinor, currencyLabel)}
              </span>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-[#22252A] overflow-hidden">
            <div 
              className="h-full rounded-full bg-[#38BDF8] transition-all"
              style={{ width: `${sadaqahSummary.monthlyProgressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] pt-1">
            <span>Yearly Given: {formatCurrency(sadaqahSummary.yearlyContributedMinor, currencyLabel)}</span>
            <span>Remaining Target: {formatCurrency(sadaqahSummary.remainingToTargetMinor, currencyLabel)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
