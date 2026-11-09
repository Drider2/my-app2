import React, { useState } from 'react';
import { 
  Sparkles, 
  Wallet, 
  MoonStar, 
  Dumbbell, 
  CheckSquare, 
  Square, 
  Check, 
  Plus, 
  ChevronRight, 
  Zap, 
  Car, 
  Droplet, 
  Coffee, 
  CreditCard, 
  X, 
  SlidersHorizontal, 
  RotateCcw, 
  Save, 
  LayoutGrid, 
  CalendarDays,
  Activity,
  ArrowRight,
  Settings
} from 'lucide-react';
import { db, generateUUID, getTodayLocalDate, formatCurrency } from '../services/storage';
import { calculateMonthSpending } from '../services/calculation';
import { getCycleRange, calculateSpentInCycle } from '../services/moneyDerivedStats';
import { getItemDueStatus, completeMaintenanceItem } from '../services/maintenanceService';
import { PrayerService } from '../services/prayerService';
import { GymProgramService } from '../services/gymProgramService';
import { computeTodayPlanState, calculateWeeklyStreak } from '../services/gymDerivedStats';
import { FinanceService } from '../services/financeService';
import { ForecastService } from '../services/forecastService';
import { WeeklyReviewService } from '../services/weeklyReviewService';
import { QuickExpenseService } from '../services/quickExpenseService';
import { LoanService } from '../services/loanService';
import { DailyProgressService } from '../services/dailyProgressService';
import { DashboardService } from '../services/dashboardService';
import { WIDGET_REGISTRY } from '../services/widgetRegistry';
import { DashboardWidgetRenderer } from '../components/dashboard/DashboardWidgetRenderer';
import { AddWidgetModal } from '../components/dashboard/AddWidgetModal';
import { PresetSelectorModal } from '../components/dashboard/PresetSelectorModal';
import { 
  MaintenanceItem, 
  PrayerName, 
  QuickExpenseShortcut,
  DashboardLayoutState,
  DashboardWidgetConfig,
  DashboardPresetId,
  WidgetSize,
  ResolutionMode,
  SIZE_RESOLUTION_OPTIONS
} from '../types';
import { ScreenId } from '../components/Navigation';
import { useTranslation } from '../services/i18n';
import { useCountUp, triggerHaptic } from '../services/motion';
import { HermesLearningService } from '../services/hermesLearningService';
import { RingProgress, PrayerTracker, SafeToSpendGauge, StreakMilestoneBadge, PillBars } from '../components/charts';
import { GlassCard, GlassChip, GlassTile, AccentChip } from '../components/glass';
import { FlameLogo } from '../components/flame/FlameLogo';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onRefresh: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  onRefresh
}) => {
  const { t, language, isRtl } = useTranslation();
  const state = db.getState();
  const today = getTodayLocalDate();

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals for Quick Expenses
  const [isCustomExpenseModalOpen, setIsCustomExpenseModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customCategory, setCustomCategory] = useState(state.categories[0]?.id || 'cat-1');
  const [customNote, setCustomNote] = useState('');

  // Inline quick task addition
  const [inlineTaskText, setInlineTaskText] = useState('');
  const [isAddingTaskInline, setIsAddingTaskInline] = useState(false);

  // Dashboard Customization State (for Edit Layout mode)
  const [layout, setLayout] = useState<DashboardLayoutState>(DashboardService.getLayout());
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftWidgets, setDraftWidgets] = useState<DashboardWidgetConfig[]>([]);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ==========================================
  // DATA QUERIES
  // ==========================================

  // 1. Daily Progress Score (10-point scale)
  const dailyProgress = DailyProgressService.getDailyProgress(today);

  // 2. Daily Prayers
  const prayerData = PrayerService.getPrayersForDate(today);

  // 3. Agenda Items: Tasks, Events & Scheduled Habits
  const activeTasks = (state.tasks || []).filter(t => !t.deleted_at);
  const todayTasks = activeTasks.filter(t => t.due_date === today);
  const todayEvents = (state.events || []).filter(e => e.local_date === today && !e.deleted_at);
  const activeHabits = (state.habits || []).filter(h => !h.archived && !h.deleted_at);
  const todayHabitEntries = (state.habitEntries || []).filter(e => e.local_date === today && !e.deleted_at);

  // 4. Money & Cash Summary
  const cashSummary = FinanceService.getCashBalanceSummary();
  const shortcuts = QuickExpenseService.getShortcuts();
  const todaySpending = QuickExpenseService.getTodaySpendingSummary();
  const currentCycle = getCycleRange(0, state.settings.budget_cycle_start_day || 1);
  const monthSpending = calculateSpentInCycle(state.transactions || [], currentCycle);

  // 5. Fitness & Review
  const activeGymProgram = GymProgramService.getActiveProgram();
  const nextWorkout = GymProgramService.getNextWorkout();
  const gymWeekStartDay = (state.settings.week_start_day ?? 1) as 0 | 1;
  const gymWeightUnit = (state.settings.weight_unit as 'kg' | 'lb') || 'kg';
  const bodyTodayPlan = computeTodayPlanState(
    state.workoutSessions,
    activeGymProgram,
    state.bodyweightEntries,
    today,
    gymWeightUnit
  );
  const bodyWeeklyStreak = calculateWeeklyStreak(
    state.workoutSessions,
    activeGymProgram,
    gymWeekStartDay,
    today
  );
  const realWeightTrend = (state.bodyweightEntries || [])
    .filter(b => !b.deleted_at)
    .sort((a, b) => (a.local_date || '').localeCompare(b.local_date || ''));
  const latestWeight = realWeightTrend.length > 0 
    ? realWeightTrend[realWeightTrend.length - 1].weight_kg 
    : '78.4';

  // Day of week check (0 = Sunday, 1 = Monday)
  const dayOfWeek = new Date().getDay();
  const isWeeklyReviewDay = dayOfWeek === 0 || dayOfWeek === 1;

  // 7-day consistency history for PillBars
  const weeklyHistory = DailyProgressService.getHistory(7);
  const weeklyDays = weeklyHistory.items.map(item => {
    const d = new Date(item.date + 'T12:00:00');
    const label = d.toLocaleDateString(language, { weekday: 'narrow' });
    const isToday = item.date === today;
    return {
      label,
      value: item.total_score,
      max: 10,
      isToday,
      isGoalMet: item.total_score >= 8,
      formattedValue: `${item.total_score}/10`,
    };
  });

  // Dynamic greeting based on current time
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12
    ? t('common.goodMorning', 'Good morning')
    : currentHour < 18
    ? t('common.goodAfternoon', 'Good afternoon')
    : t('common.goodEvening', 'Good evening');

  // Kinetic count-up numbers for key figures
  const animatedScore = useCountUp(dailyProgress.total_score, { decimals: 0 });
  const animatedCash = useCountUp(cashSummary.availableCashMinor / 100, {
    decimals: 0,
    suffix: ` ${state.settings.currency_label}`,
  });

  // Hermes adaptive behavioral profile & smart nudge
  const hermesProfile = HermesLearningService.getProfile();

  // Show temporary toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // ==========================================
  // HANDLERS
  // ==========================================

  // Toggle single prayer
  const handleTogglePrayer = (prayerName: PrayerName) => {
    triggerHaptic('success');
    PrayerService.togglePrayer(prayerName, today);
    triggerToast(`✓ Updated ${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)}`);
    onRefresh();
  };

  // Toggle task completion
  const handleToggleTask = (taskId: string) => {
    triggerHaptic('light');
    db.updateState(s => {
      const t = s.tasks.find(item => item.id === taskId);
      if (t) {
        t.done = !t.done;
        t.updated_at = Date.now();
      }
    });
    onRefresh();
  };

  // Toggle habit completion
  const handleToggleHabit = (habitId: string) => {
    triggerHaptic('light');
    db.updateState(s => {
      const existing = s.habitEntries.find(e => e.habit_id === habitId && e.local_date === today && !e.deleted_at);
      if (existing) {
        if (existing.status === 'completed') {
          existing.status = 'skipped';
        } else {
          existing.deleted_at = Date.now();
        }
      } else {
        s.habitEntries.push({
          id: generateUUID(),
          habit_id: habitId,
          local_date: today,
          status: 'completed',
          auto: false,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        });
      }
    });
    onRefresh();
  };

  // Quick inline task creation
  const handleCreateInlineTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTaskText.trim()) return;

    db.updateState(s => {
      s.tasks.unshift({
        id: generateUUID(),
        title: inlineTaskText.trim(),
        due_date: today,
        done: false,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      });
    });

    triggerToast(`✓ Added task "${inlineTaskText.trim()}"`);
    setInlineTaskText('');
    setIsAddingTaskInline(false);
    onRefresh();
  };

  // Tap quick expense shortcut
  const handleTapShortcut = (sc: QuickExpenseShortcut) => {
    triggerHaptic('medium');
    const result = QuickExpenseService.executeQuickExpense(sc.id);
    if (result.success) {
      triggerToast(`✓ Logged ${sc.name}: ${(sc.amount_minor / 100).toLocaleString()} ${state.settings.currency_label}`);
      onRefresh();
    } else {
      triggerToast(result.message);
    }
  };

  // Save custom expense
  const handleSaveCustomExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(customAmount);
    if (!customName.trim() || isNaN(amount) || amount <= 0) return;

    QuickExpenseService.executeCustomExpense({
      name: customName,
      amountMajor: amount,
      categoryId: customCategory,
      note: customNote,
    });

    triggerToast(`✓ Logged ${customName}: ${amount.toLocaleString()} ${state.settings.currency_label}`);
    setCustomName('');
    setCustomAmount('');
    setCustomNote('');
    setIsCustomExpenseModalOpen(false);
    onRefresh();
  };

  // Shortcut icon helper
  const renderShortcutIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Car':
        return <Car className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'Droplet':
        return <Droplet className="w-4 h-4 text-[var(--color-accent)]" />;
      case 'Coffee':
        return <Coffee className="w-4 h-4 text-[#C98B60]" />;
      default:
        return <Zap className="w-4 h-4 text-[var(--color-accent)]" />;
    }
  };

  // ==========================================
  // CUSTOMIZATION HANDLERS (Edit Layout Mode)
  // ==========================================
  const handleStartEdit = () => {
    setDraftWidgets([...layout.widgets]);
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setDraftWidgets([]);
  };

  const handleSaveLayout = () => {
    const newLayout: DashboardLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: draftWidgets,
      updated_at: Date.now(),
    };
    DashboardService.saveLayout(newLayout);
    setLayout(newLayout);
    setIsEditMode(false);
    triggerToast('✓ Layout saved successfully');
    onRefresh();
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const cloned = [...draftWidgets];
    const [item] = cloned.splice(index, 1);
    cloned.splice(index - 1, 0, item);
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index >= draftWidgets.length - 1) return;
    const cloned = [...draftWidgets];
    const [item] = cloned.splice(index, 1);
    cloned.splice(index + 1, 0, item);
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
  };

  const handleToggleVisibility = (widgetId: string) => {
    setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w));
  };

  const handleChangeSize = (widgetId: string, size: WidgetSize) => {
    const res: ResolutionMode = size === 'small' ? 'small' : size === 'portrait' ? 'portrait' : 'full';
    const opt = SIZE_RESOLUTION_OPTIONS[res];
    setDraftWidgets(prev => prev.map(w => w.id === widgetId ? {
      ...w,
      size,
      resolution: res,
      dimensions: {
        width: opt.width,
        height: opt.height,
        pixelLabel: opt.pixelLabel
      }
    } : w));
  };

  const handleRemoveWidget = (widgetId: string) => {
    setDraftWidgets(prev => prev.filter(w => w.id !== widgetId).map((w, i) => ({ ...w, order: i })));
    triggerToast('Widget removed (data preserved)');
  };

  const handleAddWidget = (widgetType: string, selectedResolution?: ResolutionMode) => {
    const def = WIDGET_REGISTRY[widgetType];
    const resolution: ResolutionMode = selectedResolution || (def?.defaultSize === 'small' ? 'small' : 'full');
    const size: WidgetSize = resolution === 'small' ? 'small' : resolution === 'portrait' ? 'portrait' : 'full';
    const opt = SIZE_RESOLUTION_OPTIONS[resolution];

    const newWidget: DashboardWidgetConfig = {
      id: `widget-${widgetType}-${Date.now().toString().slice(-6)}`,
      widgetType,
      size,
      resolution,
      dimensions: {
        width: opt.width,
        height: opt.height,
        pixelLabel: opt.pixelLabel,
      },
      visible: true,
      order: draftWidgets.length,
    };
    setDraftWidgets(prev => [...prev, newWidget]);
    setIsAddWidgetModalOpen(false);
    triggerToast(`✓ Added ${def?.name || widgetType} (${opt.pixelLabel})`);
  };

  const handleApplyPreset = (presetId: DashboardPresetId) => {
    const presetLayout = DashboardService.applyPreset(presetId);
    setDraftWidgets(presetLayout.widgets);
    setLayout(presetLayout);
    triggerToast(`✓ Applied preset`);
  };

  const handleResetDefault = () => {
    if (window.confirm('Restore default dashboard layout?')) {
      const defLayout = DashboardService.resetToDefault();
      setDraftWidgets(defLayout.widgets);
      setLayout(defLayout);
      setIsEditMode(false);
      triggerToast('✓ Restored default layout');
      onRefresh();
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const cloned = [...draftWidgets];
    const [moved] = cloned.splice(draggedIndex, 1);
    cloned.splice(targetIndex, 0, moved);
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Locale date formatting
  const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const todayFormatted = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Calculate score circle circumference
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(10, Math.max(0, dailyProgress.total_score)) / 10;
  const strokeDashoffset = circumference - (progressRatio * circumference);

  // Active widgets if in edit mode
  const activeWidgets = isEditMode ? draftWidgets : layout.widgets.filter(w => w.visible);

  const modules = state.settings.modules || {};

  const isWidgetVisible = (widgetType: string) => {
    // Check if the entire module is toggled off
    if (widgetType.startsWith('prayer') && modules.prayer === false) return false;
    if (widgetType.startsWith('finance') && modules.finance === false) return false;
    if (widgetType.startsWith('gym') && modules.gym === false) return false;
    if (widgetType === 'weekly_review' && modules.weekly_review === false) return false;
    if ((widgetType.startsWith('tasks') || widgetType.startsWith('calendar')) && modules.calendar === false) return false;

    const w = layout.widgets.find(item => item.widgetType === widgetType);
    return w ? w.visible : true;
  };

  const allMaintenance = state.maintenanceItems || [];
  const upcomingReminders = allMaintenance.filter(m => (m.category as any) !== 'shopping' && !m.deleted_at && (getItemDueStatus(m).isOverdue || getItemDueStatus(m).isDueToday));
  const shoppingItems = allMaintenance.filter(m => (m.category as any) === 'shopping' && !m.deleted_at && !m.is_purchased);

  const getWidgetGridSpan = (size: WidgetSize) => {
    switch (size) {
      case 'small': return 'col-span-1 max-w-[420px] w-full justify-self-center sm:justify-self-start';
      case 'portrait': return 'col-span-1 row-span-2 min-h-[480px] max-w-[420px] w-full justify-self-center sm:justify-self-start';
      case 'medium': return 'col-span-1 sm:col-span-1 lg:col-span-2 w-full';
      case 'large': return 'col-span-1 sm:col-span-2 lg:col-span-2 w-full';
      case 'full': return 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 w-full';
      default: return 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 w-full';
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-xs shadow-lg border border-[var(--color-border)] flex items-center gap-2 animate-slide-down">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT LAYOUT TOOLBAR (When Edit Mode Active)               */}
      {/* ======================================================== */}
      {isEditMode ? (
        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-md space-y-2.5 animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[var(--color-accent)]" />
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  {t('dashboard.editDashboard', 'Edit Layout')}
                </h2>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {t('dashboard.reorderCards', 'Reorder, resize, and toggle cards')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all tap-feedback"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveLayout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-xs font-semibold shadow-sm transition-all tap-feedback"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('common.save', 'Save')}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--color-border)] text-xs">
            <button
              type="button"
              onClick={() => setIsAddWidgetModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-semibold text-xs transition-all tap-feedback"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>{t('dashboard.addWidget', 'Add Widget')}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPresetModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] text-xs transition-all tap-feedback"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{t('common.presets', 'Presets')}</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefault}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border)] text-xs font-semibold transition-all tap-feedback"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>{t('dashboard.restoreDefault', 'Reset')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* STANDARD HEADER: Greeting, Date & Settings               */
        /* ======================================================== */
        <header className="flex items-center justify-between pt-1 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <FlameLogo onOpenFlame={() => onNavigate('flame')} />
            <div className="min-w-0">
              <span className="text-[13px] font-normal text-[var(--text-2)] leading-none block truncate">
                {greeting}, {state.settings.user_name}
              </span>
              <h1 className="text-[20px] font-medium text-[var(--text-1)] leading-tight mt-0.5 truncate">
                {todayFormatted}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartEdit}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/10 text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors tap-feedback"
              title={t('dashboard.editLayout', 'Edit layout')}
              aria-label={t('dashboard.editLayout', 'Edit layout')}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            {modules.assistant !== false && (
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  window.dispatchEvent(new CustomEvent('open_hermes_chat'));
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 text-[var(--color-accent)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.25)] hover:border-[var(--color-accent)] transition-all tap-feedback"
                title="Hermes AI Assistant"
                aria-label="Hermes AI Assistant"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            <button 
              type="button"
              onClick={() => onNavigate('settings')}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/10 text-[var(--text-1)] hover:border-[rgb(var(--accent-rgb)/0.5)] transition-colors tap-feedback"
              title={t('nav.settings', 'Settings')}
              aria-label={t('nav.settings', 'Settings')}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* One-time "Customize your app" notice banner for existing/upgraded users */}
      {state.settings.show_customize_banner && !isEditMode && (
        <div className="p-3.5 rounded-[20px] bg-white/[0.04] border border-[rgb(var(--accent-rgb)/0.35)] flex items-center justify-between gap-3 animate-enter">
          <div className="flex items-center gap-2.5 min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-[var(--accent-light)] shrink-0" />
            <span className="text-[12px] text-[var(--text-1)] truncate">
              {t('dashboard.customizeBanner', 'Personalize GreenDream: You can enable or disable modules in Settings anytime.')}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-[12px] font-medium text-[var(--accent-light)] hover:underline tap-feedback"
            >
              {t('common.custom', 'Customize')}
            </button>
            <button
              type="button"
              onClick={() => {
                db.updateState(s => { s.settings.show_customize_banner = false; });
                onRefresh();
              }}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 tap-feedback"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RESPONSIVE MULTI-COLUMN DASHBOARD GRID                   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 items-start">
        {activeWidgets.map((widgetConfig, idx) => (
          <div
            key={widgetConfig.id}
            draggable={isEditMode}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
            className={`${getWidgetGridSpan(widgetConfig.size)} transition-all duration-200 ${
              isEditMode && dragOverIndex === idx ? 'ring-2 ring-[var(--color-accent)] rounded-3xl' : ''
            }`}
          >
            <DashboardWidgetRenderer
              widget={widgetConfig}
              isEditMode={isEditMode}
              onNavigate={onNavigate}
              onRefresh={onRefresh}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
              onRemove={() => handleRemoveWidget(widgetConfig.id)}
              onToggleVisibility={() => handleToggleVisibility(widgetConfig.id)}
              onChangeSize={(size) => handleChangeSize(widgetConfig.id, size)}
              isFirst={idx === 0}
              isLast={idx === activeWidgets.length - 1}
              state={state}
              cashSummary={cashSummary}
              monthSpending={monthSpending}
              todaySpending={todaySpending}
              shortcuts={shortcuts}
              upcomingReminders={upcomingReminders}
              shoppingItems={shoppingItems}
              savingsAccount={FinanceService.getSavingsAccount()}
              primaryGoal={FinanceService.getGoals()[0] || null}
              loansSummary={LoanService.getSummary()}
              borrowerProfiles={LoanService.getBorrowerProfiles().slice(0, 2)}
              forecast={ForecastService.getMonthlyForecast('current')}
              lastWeekReview={WeeklyReviewService.getWeeklyMetrics(1)}
              activeProgram={GymProgramService.getActiveProgram()}
              nextWorkout={nextWorkout}
              activeNotices={state.assistantNotices.filter(n => n.status === 'new' && !n.deleted_at)}
              todayTasks={todayTasks}
              upcomingTasks={[]}
              todayEvents={todayEvents}
              prayersForToday={prayerData.records}
              weightTrend={realWeightTrend}
              onTogglePrayer={handleTogglePrayer}
              onToggleTask={handleToggleTask}
              onTapShortcut={handleTapShortcut}
              onQuickCompleteReminder={() => {}}
              onOpenCustomExpense={() => setIsCustomExpenseModalOpen(true)}
            />
          </div>
        ))}
      </div>

      {/* SUB-MODAL: CUSTOM EXPENSE                                */}
      {/* ======================================================== */}
      {isCustomExpenseModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Record Custom Expense</h3>
              <button 
                type="button" 
                onClick={() => setIsCustomExpenseModalOpen(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomExpense} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Expense Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunch"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Amount ({state.settings.currency_label})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 500"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Category</label>
                <select
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)]"
                >
                  {state.categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Optional Note</label>
                <input
                  type="text"
                  placeholder="e.g. Restaurant"
                  value={customNote}
                  onChange={e => setCustomNote(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-semibold rounded-xl text-sm tap-feedback"
              >
                Record Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Widget Modal (for Edit Mode) */}
      <AddWidgetModal
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        currentWidgets={draftWidgets}
        onAddWidget={handleAddWidget}
      />

      {/* Preset Selector Modal (for Edit Mode) */}
      <PresetSelectorModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        currentPreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />
    </div>
  );
};
