import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Dumbbell, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Save, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  ChevronRight,
  Activity,
  Layers,
  FileText,
  LayoutGrid,
  ListTodo,
  Download
} from 'lucide-react';
import { formatCurrency, db, getTodayLocalDate } from '../services/storage';
import { 
  WeeklyReviewService, 
  WeeklyReviewMetrics, 
  WeeklyComparison,
  getISOWeekInfo
} from '../services/weeklyReviewService';
import { 
  WeeklyReflection, 
  WeeklyPlan, 
  ModuleLayoutState, 
  ModuleWidgetConfig, 
  WidgetSize 
} from '../types';
import { ModuleCustomizationService } from '../services/moduleCustomizationService';
import { MODULE_WIDGET_REGISTRY } from '../services/moduleWidgetRegistry';
import { ModuleEditHeader } from '../components/customization/ModuleEditHeader';
import { ModuleWidgetContainer } from '../components/customization/ModuleWidgetContainer';
import { ModuleAddWidgetModal } from '../components/customization/ModuleAddWidgetModal';
import { ModulePresetModal } from '../components/customization/ModulePresetModal';
import { WeeklyReviewWidgetRenderer } from '../components/review/WeeklyReviewWidgetRenderer';

interface WeeklyReviewScreenProps {
  onBack: () => void;
  onRefresh?: () => void;
}

export const WeeklyReviewScreen: React.FC<WeeklyReviewScreenProps> = ({ onBack, onRefresh }) => {
  const state = db.getState();
  // 0 = Current week, 1 = Previous week
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(1);
  const [metrics, setMetrics] = useState<WeeklyReviewMetrics>(WeeklyReviewService.getWeeklyMetrics(1));
  const [comparison, setComparison] = useState<WeeklyComparison>(WeeklyReviewService.compareWeeks(0, 1));
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'planning'>('overview');
  
  // Reflection state
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [topPriority, setTopPriority] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Next week plan state
  const [planPriorities, setPlanPriorities] = useState<string[]>(['', '', '']);
  const [selectedWorkoutDays, setSelectedWorkoutDays] = useState<number[]>([1, 2, 4, 5]); // Mon, Tue, Thu, Fri
  const [planSaveSuccess, setPlanSaveSuccess] = useState(false);

  // Module Customization State
  const [layout, setLayout] = useState<ModuleLayoutState>(ModuleCustomizationService.getLayout('weeklyReview'));
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftWidgets, setDraftWidgets] = useState<ModuleWidgetConfig[]>([]);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Customization Handlers
  const handleStartEdit = () => {
    setDraftWidgets([...layout.widgets]);
    setIsEditMode(true);
    setActiveTab('overview');
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setDraftWidgets([]);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveLayout = () => {
    const newLayout: ModuleLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: draftWidgets,
      updated_at: Date.now(),
    };
    ModuleCustomizationService.saveLayout('weeklyReview', newLayout);
    setLayout(newLayout);
    setIsEditMode(false);
    triggerToast('✓ Weekly Review layout saved successfully');
    if (onRefresh) onRefresh();
  };

  const handleResetDefault = () => {
    const res = ModuleCustomizationService.resetToDefault('weeklyReview');
    setLayout(res);
    setDraftWidgets([...res.widgets]);
    triggerToast('✓ Reset to default layout');
    if (onRefresh) onRefresh();
  };

  const handleApplyPreset = (presetId: string) => {
    const updated = ModuleCustomizationService.applyPreset('weeklyReview', presetId);
    setLayout(updated);
    if (isEditMode) {
      setDraftWidgets([...updated.widgets]);
    }
    triggerToast('✓ Preset applied');
    if (onRefresh) onRefresh();
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const cloned = [...draftWidgets];
    const temp = cloned[index];
    cloned[index] = cloned[index - 1];
    cloned[index - 1] = temp;
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index >= draftWidgets.length - 1) return;
    const cloned = [...draftWidgets];
    const temp = cloned[index];
    cloned[index] = cloned[index + 1];
    cloned[index + 1] = temp;
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
  };

  const handleAddWidget = (widgetType: string) => {
    if (isEditMode) {
      const def = MODULE_WIDGET_REGISTRY[widgetType];
      const newW: ModuleWidgetConfig = {
        id: `mod-review-${widgetType}-${Date.now().toString(36)}`,
        widgetType,
        size: def?.defaultSize || 'full',
        visible: true,
        order: draftWidgets.length,
      };
      setDraftWidgets(prev => [...prev, newW]);
    } else {
      const res = ModuleCustomizationService.addWidget('weeklyReview', widgetType);
      setLayout(res);
    }
    setIsAddWidgetModalOpen(false);
    triggerToast('✓ Added widget to layout');
    if (onRefresh) onRefresh();
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.filter(w => w.id !== widgetId).map((w, idx) => ({ ...w, order: idx })));
    } else {
      const res = ModuleCustomizationService.removeWidget('weeklyReview', widgetId);
      setLayout(res);
    }
    triggerToast('✓ Removed card from page');
  };

  const handleToggleVisibility = (widgetId: string) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w));
    } else {
      const res = ModuleCustomizationService.toggleWidgetVisibility('weeklyReview', widgetId);
      setLayout(res);
    }
  };

  const handleChangeSize = (widgetId: string, size: WidgetSize) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, size } : w));
    } else {
      const res = ModuleCustomizationService.changeWidgetSize('weeklyReview', widgetId, size);
      setLayout(res);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditMode || draggedIndex === null) return;
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

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Load metrics and reflection whenever selected week changes
  useEffect(() => {
    const newMetrics = WeeklyReviewService.getWeeklyMetrics(selectedWeekOffset);
    setMetrics(newMetrics);
    
    // If viewing previous week, compare previous to 2 weeks ago; if viewing current, compare current to previous
    const comp = selectedWeekOffset === 0 
      ? WeeklyReviewService.compareWeeks(0, 1)
      : WeeklyReviewService.compareWeeks(1, 2);
    setComparison(comp);

    // Load reflection for this week
    const existingRefl = WeeklyReviewService.getReflection(newMetrics.weekId);
    if (existingRefl) {
      setWhatWentWell(existingRefl.what_went_well || '');
      setWhatToImprove(existingRefl.what_to_improve || '');
      setTopPriority(existingRefl.top_priority || '');
    } else {
      setWhatWentWell('');
      setWhatToImprove('');
      setTopPriority('');
    }

    // Load plan for this week
    const existingPlan = WeeklyReviewService.getPlan(newMetrics.weekId);
    if (existingPlan) {
      const p = [...existingPlan.top_priorities];
      while (p.length < 3) p.push('');
      setPlanPriorities(p);
      setSelectedWorkoutDays(existingPlan.scheduled_workout_days || [1, 2, 4, 5]);
    } else {
      setPlanPriorities(['', '', '']);
      setSelectedWorkoutDays([1, 2, 4, 5]);
    }
  }, [selectedWeekOffset]);

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    WeeklyReviewService.saveReflection({
      weekId: metrics.weekId,
      startDate: metrics.startDate,
      endDate: metrics.endDate,
      whatWentWell,
      whatToImprove,
      topPriority,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    if (onRefresh) onRefresh();
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPriorities = planPriorities.map(p => p.trim()).filter(p => p.length > 0);
    WeeklyReviewService.savePlan({
      weekId: metrics.weekId,
      selectedTaskIds: [],
      topPriorities: cleanPriorities,
      scheduledWorkoutDays: selectedWorkoutDays,
    });
    setPlanSaveSuccess(true);
    setTimeout(() => setPlanSaveSuccess(false), 2500);
    if (onRefresh) onRefresh();
  };

  const toggleWorkoutDay = (dayIndex: number) => {
    setSelectedWorkoutDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleExportWeeklyReport = () => {
    const currency = state.settings.currency_label || 'DA';
    const lines = [
      `# 📊 Weekly Review Report — ${metrics.label}`,
      `Period: ${metrics.startDate} to ${metrics.endDate} (${metrics.weekId})`,
      `Generated: ${getTodayLocalDate()}`,
      '',
      '## 💰 Financial Discipline & Runway',
      `- Total Expense: ${formatCurrency(metrics.finance.totalExpenseMinor, currency)}`,
      `- Total Income: ${formatCurrency(metrics.finance.totalIncomeMinor, currency)}`,
      `- Savings Deposited: ${formatCurrency(metrics.finance.savingsDepositedMinor, currency)}`,
      `- Money Lent: ${formatCurrency(metrics.finance.moneyLentMinor, currency)}`,
      comparison ? `- Delta vs Prior Week: ${formatCurrency(comparison.totalExpenseDeltaMinor, currency)}` : '',
      '',
      '## 🏋️ Physical Training & Body',
      `- Completed Workouts: ${metrics.fitness.workoutCount} session(s)`,
      `- Total Volume: ${metrics.fitness.totalVolumeKg.toLocaleString()} kg`,
      metrics.fitness.avgBodyweightKg ? `- Average Bodyweight: ${metrics.fitness.avgBodyweightKg.toFixed(1)} kg` : '',
      metrics.fitness.bodyweightChangeKg !== null ? `- Weekly Weight Delta: ${metrics.fitness.bodyweightChangeKg > 0 ? '+' : ''}${metrics.fitness.bodyweightChangeKg.toFixed(1)} kg` : '',
      '',
      '## 🕌 Prayers & Spiritual Discipline',
      `- Obligatory Prayers Completed: ${metrics.prayers.completedCount} of ${metrics.prayers.totalPossible} (${metrics.prayers.completionPercentage.toFixed(0)}%)`,
      '',
      '## 📋 Tasks & Execution',
      `- Tasks Completed: ${metrics.tasks.completedCount} of ${metrics.tasks.totalCreated} (${metrics.tasks.completionRate.toFixed(0)}%)`,
      metrics.tasks.overdueCount > 0 ? `- Overdue Tasks: ${metrics.tasks.overdueCount}` : '',
      '',
      '## 📝 Executive Reflections',
      '### What Went Well:',
      whatWentWell.trim() || '*(No reflection entered)*',
      '',
      '### What to Improve:',
      whatToImprove.trim() || '*(No notes entered)*',
      '',
      '### Top Priority:',
      topPriority.trim() || '*(None specified)*',
      '',
      '## 🎯 Next Week Strategy & Target Days',
      `- Scheduled Workout Days: ${selectedWorkoutDays.map(d => dayLabels[d]).join(', ') || 'None'}`,
      `- Priority 1: ${planPriorities[0] || '—'}`,
      `- Priority 2: ${planPriorities[1] || '—'}`,
      `- Priority 3: ${planPriorities[2] || '—'}`,
      '',
      '---',
      '*Exported from GreenDream Personal Intelligence Desk*'
    ].filter(Boolean);

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly_review_${metrics.weekId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(`✓ Exported ${metrics.weekId} report to Markdown`);
  };
  const activeWidgets = isEditMode ? draftWidgets : layout.widgets.filter(w => w.visible);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] pb-32">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-xs  border border-[var(--color-border)] flex items-center gap-2 animate-slide-down">
          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header with Customization Engine */}
      <div className="max-w-xl mx-auto px-4 pt-2">
        <ModuleEditHeader
          title="Weekly Review"
          subtitle={metrics.label}
          isEditMode={isEditMode}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveLayout={handleSaveLayout}
          onOpenAddWidget={() => setIsAddWidgetModalOpen(true)}
          onOpenPresets={() => setIsPresetModalOpen(true)}
          onResetDefault={handleResetDefault}
          actionsRight={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportWeeklyReport}
                className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-cyan-500/40 text-[var(--color-text-secondary)] hover:text-cyan-400 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] transition-colors tap-feedback"
                title="Export weekly summary report to Markdown"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Export</span>
                <span>.MD</span>
              </button>
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-semibold flex items-center gap-1 min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>Back</span>
              </button>
            </div>
          }
        />
      </div>

      <div className="max-w-xl mx-auto px-4 py-3 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex bg-[var(--color-surface)] p-1 rounded-2xl border border-[var(--color-border)] gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              activeTab === 'overview'
                ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] '
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => {
              if (isEditMode) setIsEditMode(false);
              setActiveTab('detailed');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              activeTab === 'detailed'
                ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] '
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Retrospective</span>
          </button>
          <button
            onClick={() => {
              if (isEditMode) setIsEditMode(false);
              setActiveTab('planning');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              activeTab === 'planning'
                ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] '
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Next Week Plan</span>
          </button>
        </div>

        {/* Week Switcher Pills */}
        <div className="flex bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)]">
          <button
            onClick={() => setSelectedWeekOffset(1)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedWeekOffset === 1
                ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Previous Week (Completed)
          </button>
          <button
            onClick={() => setSelectedWeekOffset(0)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedWeekOffset === 0
                ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Current Week (In Progress)
          </button>
        </div>

        {/* ======================================================== */}
        {/* 0. TAB: OVERVIEW (CUSTOMIZABLE REVIEW WIDGET GRID)       */}
        {/* ======================================================== */}
        {(activeTab === 'overview' || isEditMode) && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {activeWidgets.map((widgetConfig, idx) => (
                <div
                  key={widgetConfig.id}
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all duration-150 ${
                    isEditMode && dragOverIndex === idx ? 'border-t-2 border-[var(--color-accent)] pt-1' : ''
                  }`}
                >
                  <ModuleWidgetContainer
                    widget={widgetConfig}
                    isEditMode={isEditMode}
                    isFirst={idx === 0}
                    isLast={idx === activeWidgets.length - 1}
                    onMoveUp={() => handleMoveUp(idx)}
                    onMoveDown={() => handleMoveDown(idx)}
                    onRemove={() => handleRemoveWidget(widgetConfig.id)}
                    onToggleVisibility={() => handleToggleVisibility(widgetConfig.id)}
                    onChangeSize={(sz) => handleChangeSize(widgetConfig.id, sz)}
                  >
                    <WeeklyReviewWidgetRenderer
                      widget={widgetConfig}
                      onRefresh={onRefresh || (() => {})}
                      triggerToast={triggerToast}
                    />
                  </ModuleWidgetContainer>
                </div>
              ))}
            </div>

            {activeWidgets.length === 0 && (
              <div className="text-center py-12 px-4 rounded-3xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)]">
                <Sparkles className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-2" />
                <p className="text-xs font-bold text-[var(--color-text-primary)]">No Review Widgets Displayed</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Tap 'Edit Layout' or use the button below to add review widgets.
                </p>
                <button
                  onClick={() => {
                    handleStartEdit();
                    setIsAddWidgetModalOpen(true);
                  }}
                  className="mt-3.5 px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold text-xs"
                >
                  + Add Review Widget
                </button>
              </div>
            )}
          </div>
        )}

        {/* Detailed Retrospective View */}
        {activeTab === 'detailed' && !isEditMode && (
          <div className="space-y-4 animate-fade-in">
            {/* Executive Highlights Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Fitness Card */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    Training
                  </span>
                  {comparison.workoutCountDelta !== 0 && (
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                      comparison.workoutCountDelta > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                    }`}>
                      {comparison.workoutCountDelta > 0 ? '+' : ''}{comparison.workoutCountDelta} sess
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold tracking-tight text-[var(--color-text)]">
                    {metrics.fitness.workoutCount} <span className="text-xs font-normal text-[var(--color-text-secondary)]">sessions</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {Math.round(metrics.fitness.totalVolumeKg).toLocaleString()} kg total volume
                  </p>
                </div>
              </div>

              {/* Finance Card */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    Expenses
                  </span>
                  {comparison.totalExpenseDeltaMinor !== 0 && (
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                      comparison.totalExpenseDeltaMinor < 0 ? 'text-[var(--color-primary)]' : 'text-amber-500'
                    }`}>
                      {comparison.totalExpenseDeltaMinor > 0 ? '+' : ''}{Math.round(comparison.totalExpenseDeltaMinor / 100).toLocaleString()} DA
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold tracking-tight text-[var(--color-text)]">
                    {Math.round(metrics.finance.totalExpenseMinor / 100).toLocaleString()} <span className="text-xs font-normal text-[var(--color-text-secondary)]">DA</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {metrics.finance.savingsDepositedMinor > 0 
                      ? `+${Math.round(metrics.finance.savingsDepositedMinor / 100).toLocaleString()} DA saved` 
                      : '0 DA savings deposit'}
                  </p>
                </div>
              </div>

              {/* Daily Prayers Card */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    Daily Prayers
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-primary)]">
                    {metrics.prayers.completionPercentage}%
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold tracking-tight text-[var(--color-text)]">
                    {metrics.prayers.completedCount} <span className="text-xs font-normal text-[var(--color-text-secondary)]">/ 35</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {metrics.prayers.unrecordedCount > 0 
                      ? `${metrics.prayers.unrecordedCount} unrecorded` 
                      : 'All prayers recorded'}
                  </p>
                </div>
              </div>

              {/* Organization & Tasks Card */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    Tasks Cleared
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    {metrics.tasks.completionRate}%
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold tracking-tight text-[var(--color-text)]">
                    {metrics.tasks.completedCount} <span className="text-xs font-normal text-[var(--color-text-secondary)]">tasks</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {metrics.tasks.overdueCount > 0 
                      ? `${metrics.tasks.overdueCount} pending backlog` 
                      : 'All scheduled cleared'}
                  </p>
                </div>
              </div>
            </div>

            {/* Honest Insights */}
            <div className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                <h2 className="text-xs font-semibold text-[var(--color-text)]">Weekly Insights & Observations</h2>
              </div>
              <div className="space-y-1.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {metrics.insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Training Days */}
            <div className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-primary)]">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--color-text)]">Fitness & Recovery Consistency</h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">Volume, frequency and body mass</p>
                  </div>
                </div>
                {metrics.fitness.avgBodyweightKg && (
                  <div className="text-right">
                    <div className="text-xs font-semibold text-[var(--color-text)]">{metrics.fitness.avgBodyweightKg} kg</div>
                    <span className="text-xs text-[var(--color-text-secondary)]">7-day avg weight</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
                  const dateStr = getISOWeekInfo(selectedWeekOffset).dates[idx];
                  const trained = metrics.fitness.workoutDays.includes(dateStr);
                  return (
                    <div key={dayName} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-[var(--color-text-secondary)]">{dayName}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                        trained 
                          ? 'bg-[var(--color-primary)] text-white shadow-sm font-semibold' 
                          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                      }`}>
                        {trained ? <Check className="w-4 h-4" /> : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reflection Form */}
            <form onSubmit={handleSaveReflection} className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-primary)]" />
                  <h2 className="text-xs font-semibold text-[var(--color-text)]">
                    Written Reflection ({metrics.weekId})
                  </h2>
                </div>
                {saveSuccess && (
                  <span className="text-xs font-medium text-[var(--color-primary)] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text)]">
                  1. What went well this week?
                </label>
                <textarea
                  value={whatWentWell}
                  onChange={(e) => setWhatWentWell(e.target.value)}
                  placeholder="e.g. Hit all 4 workouts, stayed under budget, woke up on time..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text)]">
                  2. What could be improved?
                </label>
                <textarea
                  value={whatToImprove}
                  onChange={(e) => setWhatToImprove(e.target.value)}
                  placeholder="e.g. Sleeping earlier on Thursday, avoiding late-night snacking, tracking small expenses..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text)]">
                  3. What is your top priority for next week?
                </label>
                <textarea
                  value={topPriority}
                  onChange={(e) => setTopPriority(e.target.value)}
                  placeholder="e.g. Hit 4 training sessions, maintain positive cash runway, finish bank paperwork..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-all resize-none"
                />
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium hover:opacity-95 transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Reflection</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Next Week Planning Section */}
        {activeTab === 'planning' && !isEditMode && (
          <form onSubmit={handleSavePlan} className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                <h2 className="text-xs font-semibold text-[var(--color-text)]">
                  Plan Next Week ({metrics.weekId})
                </h2>
              </div>
              {planSaveSuccess && (
                <span className="text-xs font-medium text-[var(--color-primary)] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Plan Saved
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--color-text)]">
                Top 3 Objectives
              </label>
              {planPriorities.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xs font-semibold text-[var(--color-text-secondary)]">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newArr = [...planPriorities];
                      newArr[index] = e.target.value;
                      setPlanPriorities(newArr);
                    }}
                    placeholder={`Priority #${index + 1}...`}
                    className="flex-1 text-xs p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Workout Days Selector */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-[var(--color-text)]">
                Target Training Days
              </label>
              <div className="flex justify-between">
                {dayLabels.map((lbl, idx) => {
                  const isSelected = selectedWorkoutDays.includes(idx);
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => toggleWorkoutDay(idx)}
                      className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white shadow-sm font-semibold'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      <span>{lbl}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-primary)] text-xs font-medium transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Update Weekly Plan</span>
              </button>
            </div>
          </form>
        )}

        {/* Module Add Widget Modal */}
        <ModuleAddWidgetModal
          isOpen={isAddWidgetModalOpen}
          onClose={() => setIsAddWidgetModalOpen(false)}
          moduleId="weeklyReview"
          moduleTitle="Weekly Review"
          currentWidgets={isEditMode ? draftWidgets : layout.widgets}
          onAddWidget={handleAddWidget}
        />

        {/* Module Presets Modal */}
        <ModulePresetModal
          isOpen={isPresetModalOpen}
          onClose={() => setIsPresetModalOpen(false)}
          moduleId="weeklyReview"
          moduleTitle="Weekly Review"
          activePreset={layout.preset}
          onSelectPreset={handleApplyPreset}
        />
      </div>
    </div>
  );
};
