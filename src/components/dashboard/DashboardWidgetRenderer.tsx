import React from 'react';
import { 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Trash2, 
  Maximize2, 
  Minimize2,
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
  CheckSquare,
  Calendar,
  Wrench,
  ShoppingBag,
  Compass,
  FileText,
  Dumbbell,
  Activity,
  Scale,
  Bot,
  Sparkles,
  ChevronRight,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  HeartHandshake,
  BarChart3,
  Target,
  Award
} from 'lucide-react';
import { DailyProgressCard } from './DailyProgressCard';
import { 
  DashboardWidgetConfig, 
  WidgetSize, 
  ResolutionMode,
  SIZE_RESOLUTION_OPTIONS,
  Loan, 
  MaintenanceItem, 
  PrayerName, 
  QuickExpenseShortcut,
  Task 
} from '../../types';
import { ScreenId } from '../Navigation';
import { formatCurrency, getTodayLocalDate } from '../../services/storage';
import { getItemDueStatus } from '../../services/maintenanceService';
import { WIDGET_REGISTRY } from '../../services/widgetRegistry';
import { AllocationService } from '../../services/allocationService';
import { FinanceService } from '../../services/financeService';
import { SpendingAnalyticsService } from '../../services/spendingAnalyticsService';
import {
  CircularProgressRing,
  DonutChart,
  CurvedLineChart,
  VerticalBarChart,
  HorizontalProgressBar,
  SegmentedProgressBar,
  WeeklyActivityChart,
  ComparisonBarChart,
} from '../charts';

interface DashboardWidgetRendererProps {
  widget: DashboardWidgetConfig;
  isEditMode: boolean;
  onNavigate: (screen: ScreenId) => void;
  onRefresh: () => void;
  // Edit actions
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  onToggleVisibility?: () => void;
  onChangeSize?: (size: WidgetSize) => void;
  isFirst?: boolean;
  isLast?: boolean;
  // Drag handlers
  dragHandleProps?: any;
  // Business State Props
  state: any;
  cashSummary: any;
  monthSpending: number;
  todaySpending: any;
  shortcuts: QuickExpenseShortcut[];
  upcomingReminders: MaintenanceItem[];
  shoppingItems: MaintenanceItem[];
  savingsAccount: any;
  primaryGoal: any;
  loansSummary: any;
  borrowerProfiles: any[];
  forecast: any;
  lastWeekReview: any;
  activeProgram: any;
  nextWorkout: any;
  activeNotices: any[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  todayEvents: any[];
  prayersForToday: any[];
  weightTrend: any[];
  onTogglePrayer: (prayer: PrayerName) => void;
  onToggleTask: (taskId: string) => void;
  onTapShortcut: (sc: QuickExpenseShortcut) => void;
  onQuickCompleteReminder: (e: React.MouseEvent, item: MaintenanceItem) => void;
  onOpenCustomExpense: () => void;
}

export const DashboardWidgetRenderer: React.FC<DashboardWidgetRendererProps> = ({
  widget,
  isEditMode,
  onNavigate,
  onRefresh,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleVisibility,
  onChangeSize,
  isFirst,
  isLast,
  dragHandleProps,
  state,
  cashSummary,
  monthSpending,
  todaySpending,
  shortcuts,
  upcomingReminders,
  shoppingItems,
  savingsAccount,
  primaryGoal,
  loansSummary,
  borrowerProfiles,
  forecast,
  lastWeekReview,
  activeProgram,
  nextWorkout,
  activeNotices,
  todayTasks,
  upcomingTasks,
  todayEvents,
  prayersForToday,
  weightTrend,
  onTogglePrayer,
  onToggleTask,
  onTapShortcut,
  onQuickCompleteReminder,
  onOpenCustomExpense,
}) => {
  const def = WIDGET_REGISTRY[widget.widgetType];
  const isHidden = !widget.visible;

  // Compute responsive CSS sizing for multi-column dashboard grid
  const getSizeClass = (size: WidgetSize) => {
    switch (size) {
      case 'small': return 'col-span-1 max-w-[420px]';
      case 'portrait': return 'col-span-1 row-span-2 min-h-[480px] flex flex-col justify-between';
      case 'medium': return 'col-span-1 sm:col-span-1';
      case 'large': return 'col-span-1 sm:col-span-2';
      case 'full': return 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 w-full';
      default: return 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 w-full';
    }
  };

  // Render Edit Overlay / Controls Toolbar
  const renderEditToolbar = () => {
    if (!isEditMode) return null;

    return (
      <div className="flex items-center justify-between p-2 mb-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
        {/* Left: Drag Handle & Name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div 
            {...dragHandleProps}
            className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-grab active:cursor-grabbing hover:bg-[var(--color-elevated)] transition-all"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
            {def?.name || widget.widgetType}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Reorder Up */}
          {!isFirst && onMoveUp && (
            <button
              onClick={onMoveUp}
              className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]"
              title="Move Up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reorder Down */}
          {!isLast && onMoveDown && (
            <button
              onClick={onMoveDown}
              className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]"
              title="Move Down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Sizing & Resolution Selector (Full 1920x1080, Small 400x300, Portrait 1080x1920) */}
          {onChangeSize && (
            <div className="flex items-center gap-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-0.5">
              {(['full', 'small', 'portrait'] as ResolutionMode[]).map((resMode) => {
                const opt = SIZE_RESOLUTION_OPTIONS[resMode];
                const isActive = (widget.resolution === resMode) || (widget.size === resMode);
                return (
                  <button
                    key={resMode}
                    type="button"
                    onClick={() => onChangeSize(resMode as WidgetSize)}
                    className={`px-1.5 py-0.5 text-[11px] font-mono rounded font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg)] font-bold shadow-xs'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    }`}
                    title={`${opt.label} (${opt.pixelLabel})`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Visibility Toggle */}
          <button
            type="button"
            onClick={onToggleVisibility}
            className={`p-1.5 rounded-xl border transition-all tap-feedback flex items-center justify-center ${
              widget.visible 
                ? 'text-[var(--accent-light)] bg-[rgb(var(--accent-rgb)/0.15)] border-[rgb(var(--accent-rgb)/0.35)] shadow-[0_0_10px_rgb(var(--accent-rgb)/0.2)]' 
                : 'text-[var(--text-3)] bg-white/5 border-white/10 hover:text-[var(--text-1)]'
            }`}
            title={widget.visible ? 'Hide from Dashboard' : 'Show on Dashboard'}
          >
            {widget.visible ? <Eye className="w-4 h-4 stroke-[2.2]" /> : <EyeOff className="w-4 h-4 stroke-[2]" />}
          </button>

          {/* Remove from Dashboard */}
          <button
            onClick={onRemove}
            className="p-1 rounded-lg text-[var(--color-negative)] hover:bg-[var(--color-elevated)]"
            title="Remove from Dashboard"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // Render Inner Content of the Widget
  const renderWidgetContent = () => {
    switch (widget.widgetType) {
      // ----------------------------------------------------
      // DAILY PROGRESS COUNTER (10-POINT SYSTEM)
      // ----------------------------------------------------
      case 'daily_progress':
        return (
          <DailyProgressCard 
            onRefresh={onRefresh}
            onOpenSettings={() => onNavigate('settings')}
          />
        );

      // ----------------------------------------------------
      // 1. DAILY PRAYERS
      // ----------------------------------------------------
      case 'daily_prayers': {
        const prayersList = prayersForToday || [];
        const completedCount = prayersList.filter(p => p.completed).length;

        return (
          <section className="card-premium p-5  space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Spiritual Discipline
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Daily Prayers
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-text-primary)] px-2.5 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
                  {completedCount} / 5 Done
                </span>
                <button 
                  onClick={() => onNavigate('prayers')}
                  className="text-xs font-bold text-[var(--color-accent)] hover:underline tap-feedback"
                >
                  Times
                </button>
              </div>
            </div>

            {/* 5-Segmented Prayer Progress Bar */}
            <SegmentedProgressBar
              totalSegments={5}
              filledSegments={completedCount}
              color="var(--color-positive)"
              inactiveColor="var(--color-surface)"
              height={6}
              gap={4}
            />

            {/* 5 Prayer Cards Grid */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {prayersList.map(p => (
                <div
                  key={p.prayer}
                  onClick={() => onTogglePrayer(p.prayer)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer tap-feedback ${
                    p.completed
                      ? 'bg-[var(--color-surface)] border-[var(--color-positive)] text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  <span className="text-xs font-bold tracking-tight">
                    {p.name}
                  </span>
                  <span className="text-xs font-mono mt-0.5 opacity-80">
                    {p.time}
                  </span>
                  <div className={`w-4 h-4 rounded-full mt-2 flex items-center justify-center transition-colors ${
                    p.completed 
                      ? 'bg-[var(--color-positive)] text-white shadow-sm' 
                      : 'border border-[var(--color-border)] bg-[var(--color-card)]'
                  }`}>
                    {p.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      }

      // ----------------------------------------------------
      // 2. QUICK EXPENSES
      // ----------------------------------------------------
      case 'finance_quick_expenses':
        return (
          <section className="card-premium p-5  space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    One-Tap Logging
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Quick Expenses
                  </h2>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                Today: <strong className="text-[var(--color-text-primary)] font-mono">{formatCurrency(todaySpending.totalMinor, state.settings.currency_label)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {shortcuts.map(sc => (
                <button
                  key={sc.id}
                  onClick={() => onTapShortcut(sc)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all tap-feedback"
                >
                  <span className="text-xs font-bold text-[var(--color-text-primary)] truncate w-full text-center">{sc.name}</span>
                  <span className="text-xs text-[var(--color-text-secondary)] font-bold mt-0.5">
                    {Math.round(sc.amount_minor / 100)} DA
                  </span>
                </button>
              ))}
              <button
                onClick={onOpenCustomExpense}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all tap-feedback"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-bold mt-0.5">Custom</span>
              </button>
            </div>
          </section>
        );

      // ----------------------------------------------------
      // 3. AVAILABLE BALANCE
      // ----------------------------------------------------
      case 'finance_balance':
        return (
          <div 
            onClick={() => onNavigate('finance')}
            className="card-premium p-4  space-y-2 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                Available Cash
              </span>
              <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)] truncate font-sans">
              {formatCurrency(cashSummary.availableCashMinor, state.settings.currency_label)}
            </div>
            <span className="text-xs text-[var(--color-positive)] font-semibold block">
              Net Worth: {formatCurrency(cashSummary.netWorthMinor, state.settings.currency_label)}
            </span>
          </div>
        );

      // ----------------------------------------------------
      // 4. MONTHLY INCOME
      // ----------------------------------------------------
      case 'finance_income':
        return (
          <div 
            onClick={() => onNavigate('finance')}
            className="card-premium p-4  space-y-2 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                Monthly Inflows
              </span>
              <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-positive)]">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)] truncate font-sans">
              +{formatCurrency(cashSummary.monthIncomeMinor || forecast.expectedIncomeMinor, state.settings.currency_label)}
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] font-medium block">
              Base: {formatCurrency(state.salarySetting?.monthly_salary_minor || 5000000, state.settings.currency_label)}
            </span>
          </div>
        );

      // ----------------------------------------------------
      // 5. MONTHLY EXPENSES
      // ----------------------------------------------------
      case 'finance_expenses':
        return (
          <div 
            onClick={() => onNavigate('finance')}
            className="card-premium p-4  space-y-2 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                Cycle Spending
              </span>
              <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-negative)]">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)] truncate font-sans">
              {formatCurrency(monthSpending, state.settings.currency_label)}
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] font-medium block">
              Burn: ~{formatCurrency(forecast.dailyBurnRateMinor, state.settings.currency_label)}/day
            </span>
          </div>
        );

      // ----------------------------------------------------
      // 6. FINANCIAL FORECAST (FEATURED CARD WITH CURVED CHART)
      // ----------------------------------------------------
      case 'finance_forecast': {
        const forecastTrend = [
          { label: 'Start', value: Math.round((cashSummary.availableCashMinor + monthSpending) / 100) },
          { label: 'Mid', value: Math.round((cashSummary.availableCashMinor) / 100) },
          { label: 'Target', value: Math.round(forecast.predictedEndingBalanceMinor / 100) },
        ];

        return (
          <section 
            onClick={() => onNavigate('finance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback relative"
          >
            {/* Subtle diagonal stripes pattern */}
            <div className="absolute inset-0 pattern-stripes opacity-20 pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                    <LineChart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                      Runway Projection
                    </span>
                    <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                      Monthly Financial Forecast
                    </h2>
                  </div>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full font-bold  border ${
                  forecast.predictedEndingBalanceMinor >= 1500000 
                    ? 'bg-[var(--color-surface)] text-[var(--color-positive)] border-[var(--color-border)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-warning)] border-[var(--color-border)]'
                }`}>
                  {forecast.predictedEndingBalanceMinor >= 1500000 ? 'Comfortable' : 'Runway Alert'}
                </span>
              </div>

              {/* Big Value + Description */}
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Predicted Month-End Balance
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] mt-0.5 tracking-tight">
                    {formatCurrency(forecast.predictedEndingBalanceMinor, state.settings.currency_label)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                    {forecast.daysRemainingInCycle} days left
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Burn ~{formatCurrency(forecast.dailyBurnRateMinor, state.settings.currency_label)}/day
                  </span>
                </div>
              </div>

              {/* Smooth Curved Line Graph */}
              <CurvedLineChart
                data={forecastTrend}
                height={100}
                color="var(--color-accent)"
                valueSuffix=" DA"
                showGrid={true}
              />
            </div>
          </section>
        );
      }

      // ----------------------------------------------------
      // 7. SAVINGS PROGRESS
      // ----------------------------------------------------
      case 'finance_savings': {
        const savedMinor = primaryGoal?.current_saved_minor || savingsAccount?.current_balance_minor || 0;
        const targetMinor = primaryGoal?.target_minor || 10000000;
        const progressPct = Math.min(100, Math.round((savedMinor / targetMinor) * 100));

        return (
          <section 
            onClick={() => onNavigate('finance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Wealth Growth
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Savings & Goals
                  </h2>
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--color-positive)]">
                {formatCurrency(savingsAccount?.current_balance_minor || 0, state.settings.currency_label)}
              </span>
            </div>

            {/* Circular Ring + Description */}
            <div className="flex items-center justify-between gap-4 py-1">
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Goal: {primaryGoal?.name || 'Primary Reserve'}
                </span>
                <div className="text-xl font-extrabold text-[var(--color-text-primary)] mt-0.5">
                  {formatCurrency(savedMinor, state.settings.currency_label)}
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Target: {formatCurrency(targetMinor, state.settings.currency_label)}
                </span>
              </div>

              <CircularProgressRing
                value={savedMinor}
                max={targetMinor}
                size={74}
                strokeWidth={7}
                color="var(--color-positive)"
              />
            </div>
          </section>
        );
      }

      // ----------------------------------------------------
      // 8. BUDGET PROGRESS (HORIZONTAL PROGRESS BARS)
      // ----------------------------------------------------
      case 'finance_budget': {
        const categories = (state.categories || []).slice(0, 3);

        return (
          <section 
            onClick={() => onNavigate('finance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Spending Limits
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Budget Progress
                  </h2>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">
                Category Allocations
              </span>
            </div>

            <div className="space-y-3">
              {categories.map((cat: any) => (
                <HorizontalProgressBar
                  key={cat.id}
                  value={cat.spent_minor || 0}
                  max={cat.amount_minor || 1}
                  labelLeft={cat.name}
                  labelRight={`${formatCurrency(cat.spent_minor || 0, state.settings.currency_label)} / ${formatCurrency(cat.amount_minor, state.settings.currency_label)}`}
                  height={6}
                  color="var(--color-accent)"
                />
              ))}
            </div>
          </section>
        );
      }

      // ----------------------------------------------------
      // 9. MONEY LENT (RECEIVABLES)
      // ----------------------------------------------------
      case 'finance_money_lent':
        return (
          <section 
            onClick={() => onNavigate('finance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <HandCoins className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Receivables
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Money Lent
                  </h2>
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--color-warning)]">
                {formatCurrency(loansSummary.stillOwedMinor, state.settings.currency_label)} Owed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">Total Lent</span>
                <span className="font-extrabold text-[var(--color-text-primary)] text-sm mt-0.5 block">
                  {formatCurrency(loansSummary.totalLentMinor, state.settings.currency_label)}
                </span>
                <span className="text-xs text-[var(--color-positive)] font-semibold">
                  Repaid: {formatCurrency(loansSummary.totalRepaidMinor, state.settings.currency_label)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">Active Debtors</span>
                <div className="space-y-1 mt-1">
                  {borrowerProfiles.slice(0, 2).map(b => (
                    <div key={b.name} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-primary)] font-semibold truncate max-w-[65px]">{b.name}</span>
                      <span className="text-[var(--color-warning)] font-bold">
                        {formatCurrency(b.remainingMinor, state.settings.currency_label)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );

      // ----------------------------------------------------
      // 10. UPCOMING PAYMENTS
      // ----------------------------------------------------
      case 'finance_upcoming_payments':
        return (
          <section 
            onClick={() => onNavigate('maintenance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Fixed Obligations
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Upcoming Payments
                  </h2>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                {formatCurrency(forecast.upcomingRecurringMinor, state.settings.currency_label)}
              </span>
            </div>

            <div className="space-y-2">
              {upcomingReminders.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                  <span className="text-[var(--color-text-primary)] font-semibold truncate">{item.name}</span>
                  <span className="text-xs font-bold text-[var(--color-negative)] font-mono">
                    {formatCurrency(item.estimated_cost_minor, state.settings.currency_label)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );

      // ----------------------------------------------------
      // 11. SPENDING BY CATEGORY (DONUT CHART)
      // ----------------------------------------------------
      case 'finance_category_spending': {
        const topCategories = forecast.topExpenseCategories.slice(0, 4);
        const palette = [
          'var(--color-accent)',
          'var(--color-highlight)',
          'var(--color-positive)',
          'var(--color-warning)',
        ];
        const donutSegments = topCategories.map((c: any, i: number) => ({
          label: c.name,
          value: c.amountMinor || 1,
          color: palette[i % palette.length],
          formattedValue: `${c.percentage || 25}%`,
        }));

        return (
          <section 
            onClick={() => onNavigate('finance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Distribution
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Spending by Category
                  </h2>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">Top Incurred</span>
            </div>

            <DonutChart
              segments={donutSegments}
              size={110}
              thickness={10}
              centerLabel="Spending"
              centerValue={formatCurrency(monthSpending, state.settings.currency_label)}
              showLegend={true}
            />
          </section>
        );
      }

      // ----------------------------------------------------
      // FINANCIAL GOAL PROGRESS
      // ----------------------------------------------------
      case 'finance_goal_progress': {
        const goals = FinanceService.getGoals(false);
        const topGoal = goals[0];
        if (!topGoal) {
          return (
            <div 
              onClick={() => onNavigate('finance')}
              className="card-premium p-4  space-y-1 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-primary)]">
                <Target className="w-4 h-4" />
                <span>Financial Goal</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">No active savings goal set.</p>
            </div>
          );
        }

        const proj = FinanceService.getGoalProjections(topGoal.id);
        return (
          <section
            onClick={() => onNavigate('finance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Target Milestone
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    {topGoal.name}
                  </h2>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[var(--color-positive)] px-2.5 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
                {proj.progressPct}%
              </span>
            </div>

            <HorizontalProgressBar
              value={proj.currentSavedMinor}
              max={proj.targetMinor}
              labelLeft={formatCurrency(proj.currentSavedMinor, state.settings.currency_label)}
              labelRight={`of ${formatCurrency(proj.targetMinor, state.settings.currency_label)}`}
              height={7}
              color="var(--color-positive)"
            />

            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>Remaining: {formatCurrency(proj.remainingMinor, state.settings.currency_label)}</span>
              <span className="text-[var(--color-text-primary)] font-bold">{proj.estimatedCompletionDate}</span>
            </div>
          </section>
        );
      }

      // ----------------------------------------------------
      // INCOME ALLOCATION SUMMARY
      // ----------------------------------------------------
      case 'finance_income_allocation': {
        const activePlan = AllocationService.getActivePlan();
        const dist = AllocationService.calculatePlanDistribution(activePlan);

        return (
          <section
            onClick={() => onNavigate('finance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Portfolio Allocation
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Income Allocation
                  </h2>
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--color-text-primary)] px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
                {activePlan.name}
              </span>
            </div>

            {/* Segmented allocation bar */}
            <div className="h-3 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] p-0.5 flex overflow-hidden">
              {activePlan.categories.map((c, idx) => {
                const widthPct = c.type === 'percentage' 
                  ? c.value 
                  : (dist.totalBaseIncomeMinor > 0 ? (c.value / dist.totalBaseIncomeMinor) * 100 : 0);
                return (
                  <div
                    key={c.id || idx}
                    style={{ width: `${widthPct}%`, backgroundColor: c.color || 'var(--color-accent)' }}
                    className="h-full transition-all"
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              {dist.breakdown.slice(0, 3).map(b => (
                <div key={b.category.id} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.category.color || 'var(--color-accent)' }} />
                  <span className="font-extrabold text-[var(--color-text-primary)]">{b.percentageOfTotal}%</span>
                  <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[70px]">{b.category.name}</span>
                </div>
              ))}
            </div>
          </section>
        );
      }

      // ----------------------------------------------------
      // SPENDING VS BUDGET GRAPH (COMPARISON)
      // ----------------------------------------------------
      case 'finance_spending_vs_budget': {
        const progress = SpendingAnalyticsService.getSpendingProgress('30d');
        const consumedPct = progress.totalBudgetMinor > 0 
          ? Math.round((progress.totalSpentMinor / progress.totalBudgetMinor) * 100) 
          : 0;

        return (
          <section
            onClick={() => onNavigate('finance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Pacing Monitor
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Spending vs Budget
                  </h2>
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border  ${
                consumedPct >= 100 
                  ? 'bg-[var(--color-surface)] text-[var(--color-negative)] border-[var(--color-border)]' 
                  : consumedPct >= 80 
                  ? 'bg-[var(--color-surface)] text-[var(--color-warning)] border-[var(--color-border)]' 
                  : 'bg-[var(--color-surface)] text-[var(--color-positive)] border-[var(--color-border)]'
              }`}>
                {consumedPct}% Consumed
              </span>
            </div>

            <HorizontalProgressBar
              value={progress.totalSpentMinor}
              max={progress.totalBudgetMinor}
              labelLeft={`Spent: ${formatCurrency(progress.totalSpentMinor, state.settings.currency_label)}`}
              labelRight={`Limit: ${formatCurrency(progress.totalBudgetMinor, state.settings.currency_label)}`}
              height={7}
              color={consumedPct >= 100 ? 'var(--color-negative)' : 'var(--color-accent)'}
            />
          </section>
        );
      }

      // ----------------------------------------------------
      // SADAQAH PROGRESS
      // ----------------------------------------------------
      case 'finance_sadaqah': {
        const sadaqah = AllocationService.getSadaqahSummary();

        return (
          <div
            onClick={() => onNavigate('finance')}
            className="card-premium p-4  space-y-2 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                Sadaqah / Charity
              </span>
              <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                <HeartHandshake className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="text-lg sm:text-xl font-extrabold text-[var(--color-text-primary)] truncate font-sans">
              {formatCurrency(sadaqah.monthlyContributedMinor, state.settings.currency_label)}
            </div>

            <HorizontalProgressBar
              value={sadaqah.monthlyContributedMinor}
              max={sadaqah.monthlyTargetMinor}
              height={5}
              showLabels={false}
              color="var(--color-accent)"
            />

            <span className="text-xs text-[var(--color-text-secondary)] block">
              Target: {formatCurrency(sadaqah.monthlyTargetMinor, state.settings.currency_label)} ({sadaqah.monthlyProgressPct}%)
            </span>
          </div>
        );
      }

      // ----------------------------------------------------
      // 12. TODAY'S TASKS
      // ----------------------------------------------------
      case 'tasks_today':
        return (
          <section className="card-premium p-5  space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Action Items
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Today's Priority Tasks
                  </h2>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('calendar')}
                className="text-xs font-bold text-[var(--color-accent)] hover:underline tap-feedback"
              >
                Agenda
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] italic text-center py-2">
                No specific tasks scheduled for today.
              </p>
            ) : (
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onToggleTask(task.id)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all cursor-pointer tap-feedback"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                        task.done 
                          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]' 
                          : 'border border-[var(--color-border)] bg-[var(--color-card)]'
                      }`}>
                        {task.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-xs font-semibold ${task.done ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-primary)]'}`}>
                        {task.title}
                      </span>
                    </div>
                    {task.due_time && (
                      <span className="text-xs text-[var(--color-text-secondary)] font-mono font-medium">
                        {task.due_time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      // ----------------------------------------------------
      // 13. UPCOMING TASKS
      // ----------------------------------------------------
      case 'tasks_upcoming':
        return (
          <section 
            onClick={() => onNavigate('calendar')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    7-Day Pipeline
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Upcoming Tasks
                  </h2>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">{upcomingTasks.length} queued</span>
            </div>

            <div className="space-y-2">
              {upcomingTasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                  <span className="text-[var(--color-text-primary)] font-semibold truncate">{task.title}</span>
                  <span className="text-xs text-[var(--color-text-secondary)] font-mono">{task.due_date}</span>
                </div>
              ))}
            </div>
          </section>
        );

      // ----------------------------------------------------
      // 14. CALENDAR EVENTS
      // ----------------------------------------------------
      case 'calendar_events':
        return (
          <section 
            onClick={() => onNavigate('calendar')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Time Blocks
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Calendar Events
                  </h2>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">{todayEvents.length} events</span>
            </div>

            {todayEvents.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] italic text-center py-2">No calendar events for today.</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map(evt => (
                  <div key={evt.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                    <span className="text-[var(--color-text-primary)] font-semibold">{evt.title}</span>
                    <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono">{evt.start_time}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      // ----------------------------------------------------
      // 15. PERSONAL MAINTENANCE
      // ----------------------------------------------------
      case 'personal_maintenance':
        return (
          <section className="card-premium p-5  space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Recurring Upkeep
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Personal Maintenance
                  </h2>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('maintenance')}
                className="text-xs font-bold text-[var(--color-accent)] hover:underline tap-feedback"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {upcomingReminders.slice(0, 3).map(item => {
                const due = getItemDueStatus(item);
                return (
                  <div 
                    key={item.id}
                    onClick={() => onNavigate('maintenance')}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all cursor-pointer tap-feedback"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[var(--color-text-primary)]">{item.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                          {due.badgeText}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)] mt-0.5 block">
                        {formatCurrency(item.estimated_cost_minor, state.settings.currency_label)} • {item.notes || 'Recurring reminder'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => onQuickCompleteReminder(e, item)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-text-primary)] text-[var(--color-text-primary)] hover:text-[var(--color-bg)] border border-[var(--color-border)] text-xs font-bold transition-all tap-feedback flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Done</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );

      // ----------------------------------------------------
      // 16. SHOPPING REMINDERS
      // ----------------------------------------------------
      case 'shopping_reminders':
        return (
          <section 
            onClick={() => onNavigate('maintenance')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Essentials
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Shopping Reminders
                  </h2>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] font-semibold">{shoppingItems.length} items</span>
            </div>

            <div className="space-y-2">
              {shoppingItems.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs">
                  <span className="text-[var(--color-text-primary)] font-semibold truncate">{item.name}</span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono">
                    {formatCurrency(item.estimated_cost_minor, state.settings.currency_label)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );

      // ----------------------------------------------------
      // 17. WEEKLY REVIEW & ACTIVITY MATRIX
      // ----------------------------------------------------
      case 'weekly_review': {
        const weekDaysData = [
          { day: 'M', value: 1, status: 'done' as const },
          { day: 'T', value: 1, status: 'done' as const },
          { day: 'W', value: 0, status: 'rest' as const },
          { day: 'T', value: 1, status: 'done' as const },
          { day: 'F', value: 1, status: 'done' as const },
          { day: 'S', value: 0, status: 'pending' as const },
          { day: 'S', value: 1, status: 'done' as const },
        ];

        return (
          <section 
            onClick={() => onNavigate('weekly-review')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Retrospective
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Weekly Review & Activity
                  </h2>
                </div>
              </div>
              <span className="text-xs font-mono text-[var(--color-text-secondary)] font-bold">
                {lastWeekReview.weekId}
              </span>
            </div>

            {/* Weekly Activity Matrix Chart */}
            <WeeklyActivityChart days={weekDaysData} height={60} />

            <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-[var(--color-border)]">
              <div className="p-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-secondary)] font-bold block">Gym</span>
                <span className="text-xs font-extrabold text-[var(--color-text-primary)] mt-0.5 block">{lastWeekReview.fitness.workoutCount} sess</span>
              </div>
              <div className="p-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-secondary)] font-bold block">Prayers</span>
                <span className="text-xs font-extrabold text-[var(--color-positive)] mt-0.5 block">{lastWeekReview.prayers.completionPercentage}%</span>
              </div>
              <div className="p-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-secondary)] font-bold block">Tasks</span>
                <span className="text-xs font-extrabold text-[var(--color-text-primary)] mt-0.5 block">{lastWeekReview.tasks.completedCount}</span>
              </div>
              <div className="p-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-secondary)] font-bold block">Spent</span>
                <span className="text-xs font-extrabold text-[var(--color-text-primary)] mt-0.5 block">{Math.round(lastWeekReview.finance.totalExpenseMinor / 100).toLocaleString()}</span>
              </div>
            </div>
          </section>
        );
      }

      // ----------------------------------------------------
      // 18. TODAY'S WORKOUT (FEATURED FITNESS CARD)
      // ----------------------------------------------------
      case 'gym_today_workout':
        return (
          <section 
            onClick={() => onNavigate('gym')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback relative"
          >
            {/* Subtle carbon texture pattern */}
            <div className="absolute inset-0 pattern-carbon opacity-30 pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                      Training Split
                    </span>
                    <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                      Today's Workout
                    </h2>
                  </div>
                </div>
                <span className="text-xs text-[var(--color-text-primary)] font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
                  {nextWorkout.dayName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--color-text-primary)]">{nextWorkout.dayName}</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Target: {nextWorkout.targetMuscles.join(', ') || 'Full Body Routine'}
                  </p>
                </div>
                <button className="px-4 py-2 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold  tap-feedback">
                  Start Workout
                </button>
              </div>
            </div>
          </section>
        );

      // ----------------------------------------------------
      // 19. TRAINING PROGRAM
      // ----------------------------------------------------
      case 'gym_training_program':
        return (
          <section 
            onClick={() => onNavigate('gym')}
            className="card-premium p-5  space-y-3 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Routine Split
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Training Program
                  </h2>
                </div>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-primary)] font-bold border border-[var(--color-border)]">
                Active
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[var(--color-text-primary)]">
                  {activeProgram?.name || 'Push / Pull / Legs Split'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--color-text-primary)] font-semibold">
                    Next: {nextWorkout.dayName}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">•</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {activeProgram?.days_per_week || 5} days/week
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] mt-1" />
            </div>
          </section>
        );

      // ----------------------------------------------------
      // 20. WORKOUT STATISTICS (VERTICAL BARS)
      // ----------------------------------------------------
      case 'gym_workout_stats': {
        const gymWeekBars = [
          { label: 'W1', value: 4, formattedValue: '4' },
          { label: 'W2', value: 5, formattedValue: '5' },
          { label: 'W3', value: 3, formattedValue: '3' },
          { label: 'W4', value: lastWeekReview.fitness.workoutCount || 4, active: true, formattedValue: `${lastWeekReview.fitness.workoutCount || 4}` },
        ];

        return (
          <div 
            onClick={() => onNavigate('gym')}
            className="card-premium p-4  space-y-2 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                Training Frequency
              </span>
              <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                <Dumbbell className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="text-xl font-extrabold text-[var(--color-text-primary)]">
              {lastWeekReview.fitness.workoutCount} sessions <span className="text-xs font-normal text-[var(--color-text-secondary)]">/ wk</span>
            </div>

            <VerticalBarChart
              bars={gymWeekBars}
              height={50}
              showValues={false}
            />

            <span className="text-xs text-[var(--color-text-secondary)] font-medium block">
              Volume: {Math.round(lastWeekReview.fitness.totalVolumeKg).toLocaleString()} kg
            </span>
          </div>
        );
      }

      // ----------------------------------------------------
      // 21. BODY WEIGHT
      // ----------------------------------------------------
      case 'gym_body_weight':
        return (
          <div 
            onClick={() => onNavigate('gym')}
            className="card-premium p-4  space-y-2 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                Body Weight
              </span>
              <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                <Scale className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)] truncate font-sans">
              {lastWeekReview.fitness.avgBodyweightKg ? `${lastWeekReview.fitness.avgBodyweightKg} kg` : '78.4 kg'}
            </div>
            <span className="text-xs text-[var(--color-positive)] font-semibold block">
              7-Day Moving Average
            </span>
          </div>
        );

      // ----------------------------------------------------
      // 22. WEIGHT PROGRESS CHART (CURVED LINE GRAPH)
      // ----------------------------------------------------
      case 'gym_weight_chart': {
        const weightData = (weightTrend && weightTrend.length > 0)
          ? weightTrend.map((w: any, idx: number) => ({
              label: w.date || `D${idx + 1}`,
              value: typeof w.weight_kg === 'number' ? w.weight_kg : parseFloat(w.weight_kg) || 78.4,
            }))
          : [
              { label: 'Day 1', value: 79.2 },
              { label: 'Day 3', value: 78.9 },
              { label: 'Day 5', value: 78.6 },
              { label: 'Day 7', value: 78.4 },
            ];

        return (
          <section 
            onClick={() => onNavigate('gym')}
            className="card-premium p-5  space-y-4 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                  <LineChart className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                    Trajectory
                  </span>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Weight Progress Chart
                  </h2>
                </div>
              </div>
              <span className="text-xs text-[var(--color-positive)] font-bold">-0.8 kg this cycle</span>
            </div>

            <CurvedLineChart
              data={weightData}
              height={100}
              color="var(--color-accent)"
              valueSuffix=" kg"
            />
          </section>
        );
      }

      // ----------------------------------------------------
      // 23. AI DAILY BRIEF (FEATURED NOTICE)
      // ----------------------------------------------------
      case 'ai_daily_brief':
        return (
          <section className="card-premium p-5  space-y-3 relative">
            <div className="absolute inset-0 pattern-stripes opacity-15 pointer-events-none" />

            <div className="relative z-10 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    {activeNotices[0]?.title || 'Daily Operational Brief'}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-primary)] font-bold border border-[var(--color-border)]">
                    Notice
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {activeNotices[0]?.message || 'Everything on schedule. 4 priority tasks queued and your liquid runway remains comfortable.'}
                </p>
              </div>
            </div>
          </section>
        );

      // ----------------------------------------------------
      // 24. AI FINANCIAL INSIGHTS
      // ----------------------------------------------------
      case 'ai_financial_insights':
        return (
          <section 
            onClick={() => onNavigate('finance')}
            className="card-premium p-5  space-y-2.5 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                Financial Insights
              </h3>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              At your current burn rate of {formatCurrency(forecast.dailyBurnRateMinor, state.settings.currency_label)}/day, your month-end cushion is projected to settle at {formatCurrency(forecast.predictedEndingBalanceMinor, state.settings.currency_label)}.
            </p>
          </section>
        );

      // ----------------------------------------------------
      // 25. AI WEEKLY INSIGHTS
      // ----------------------------------------------------
      case 'ai_weekly_insights':
        return (
          <section 
            onClick={() => onNavigate('weekly-review')}
            className="card-premium p-5  space-y-2.5 cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-accent)]" />
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                Weekly Insights
              </h3>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {lastWeekReview.insights[0] || 'Completed all scheduled tasks and maintained consistent morning prayer routines.'}
            </p>
          </section>
        );

      // ----------------------------------------------------
      // 26. ASSISTANT CHAT SHORTCUT
      // ----------------------------------------------------
      case 'ai_chat_shortcut':
        return (
          <div 
            onClick={() => onNavigate('assistant')}
            className="card-premium p-3.5  flex items-center justify-between cursor-pointer hover:border-[var(--color-accent)] transition-all tap-feedback"
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Ask GreenDream AI desk...</span>
            </div>
            <span className="text-xs font-bold text-[var(--color-text-primary)]">Chat &gt;</span>
          </div>
        );

      default:
        return (
          <div className="card-premium p-4  text-xs text-[var(--color-text-secondary)]">
            {def?.name || widget.widgetType}
          </div>
        );
    }
  };

  // If hidden and not in edit mode, don't render anything
  if (isHidden && !isEditMode) return null;

  return (
    <div 
      className={`${getSizeClass(widget.size)} transition-all duration-200 ${
        isEditMode ? 'p-1 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40' : ''
      } ${isHidden ? 'opacity-40' : ''}`}
    >
      {renderEditToolbar()}
      {renderWidgetContent()}
    </div>
  );
};
