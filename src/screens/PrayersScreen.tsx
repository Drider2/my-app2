import React, { useState } from 'react';
import { 
  Sun, 
  Check, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  BellOff, 
  Sliders, 
  Clock, 
  ShieldCheck, 
  RotateCcw,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  ListCheck,
  Download,
  Compass,
  MoonStar,
  BookOpen
} from 'lucide-react';
import { db, getTodayLocalDate } from '../services/storage';
import { PrayerService, PRAYER_NAMES, CALCULATION_METHODS } from '../services/prayerService';
import { PrayerName, ModuleLayoutState, ModuleWidgetConfig, WidgetSize } from '../types';
import { ModuleCustomizationService } from '../services/moduleCustomizationService';
import { MODULE_WIDGET_REGISTRY } from '../services/moduleWidgetRegistry';
import { ModuleEditHeader } from '../components/customization/ModuleEditHeader';
import { ModuleWidgetContainer } from '../components/customization/ModuleWidgetContainer';
import { ModuleAddWidgetModal } from '../components/customization/ModuleAddWidgetModal';
import { ModulePresetModal } from '../components/customization/ModulePresetModal';
import { PrayersWidgetRenderer, QiblaModal, FastingTrackerModal, QuranKhatmahModal } from '../components/prayers';
import { PrayerTracker, PillBars, StreakMilestoneBadge, RingProgress } from '../components/charts';

interface PrayersScreenProps {
  onRefresh: () => void;
  onBack?: () => void;
}

export const PrayersScreen: React.FC<PrayersScreenProps> = ({ onRefresh, onBack }) => {
  const state = db.getState();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDate());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'today' | 'history'>('overview');

  // Module Customization State
  const [layout, setLayout] = useState<ModuleLayoutState>(ModuleCustomizationService.getLayout('prayers'));
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftWidgets, setDraftWidgets] = useState<ModuleWidgetConfig[]>([]);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isQiblaModalOpen, setIsQiblaModalOpen] = useState(false);
  const [isFastingModalOpen, setIsFastingModalOpen] = useState(false);
  const [isQuranModalOpen, setIsQuranModalOpen] = useState(false);

  const handleExportPrayerCsv = () => {
    const csv = PrayerService.exportPrayerHistoryCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greendream_prayers_${getTodayLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('✓ Prayer attendance records exported as CSV');
  };


  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  const todayStr = getTodayLocalDate();
  const isViewingToday = selectedDate === todayStr;

  const dailyStatus = PrayerService.getPrayersForDate(selectedDate);
  const history = PrayerService.getHistory(14); // 14-day history

  const handleToggle = (prayer: PrayerName) => {
    PrayerService.togglePrayer(prayer, selectedDate);
    onRefresh();
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
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
    ModuleCustomizationService.saveLayout('prayers', newLayout);
    setLayout(newLayout);
    setIsEditMode(false);
    triggerToast('✓ Prayer layout saved successfully');
    onRefresh();
  };

  const handleResetDefault = () => {
    const res = ModuleCustomizationService.resetToDefault('prayers');
    setLayout(res);
    setDraftWidgets([...res.widgets]);
    triggerToast('✓ Reset to default layout');
    onRefresh();
  };

  const handleApplyPreset = (presetId: string) => {
    const updated = ModuleCustomizationService.applyPreset('prayers', presetId);
    setLayout(updated);
    if (isEditMode) {
      setDraftWidgets([...updated.widgets]);
    }
    triggerToast('✓ Preset applied');
    onRefresh();
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
        id: `mod-prayers-${widgetType}-${Date.now().toString(36)}`,
        widgetType,
        size: def?.defaultSize || 'full',
        visible: true,
        order: draftWidgets.length,
      };
      setDraftWidgets(prev => [...prev, newW]);
    } else {
      const res = ModuleCustomizationService.addWidget('prayers', widgetType);
      setLayout(res);
    }
    setIsAddWidgetModalOpen(false);
    triggerToast('✓ Added widget to layout');
    onRefresh();
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.filter(w => w.id !== widgetId).map((w, idx) => ({ ...w, order: idx })));
    } else {
      const res = ModuleCustomizationService.removeWidget('prayers', widgetId);
      setLayout(res);
    }
    triggerToast('✓ Removed card from page');
  };

  const handleToggleVisibility = (widgetId: string) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w));
    } else {
      const res = ModuleCustomizationService.toggleWidgetVisibility('prayers', widgetId);
      setLayout(res);
    }
  };

  const handleChangeSize = (widgetId: string, size: WidgetSize) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, size } : w));
    } else {
      const res = ModuleCustomizationService.changeWidgetSize('prayers', widgetId, size);
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

  const activeWidgets = isEditMode ? draftWidgets : layout.widgets.filter(w => w.visible);

  return (
    <div className="space-y-4 pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-xs shadow-dark-lg border border-[var(--color-border)] flex items-center gap-2 animate-slide-down">
          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Customization Engine */}
      <ModuleEditHeader
        title="Daily Prayers"
        subtitle="Respectful prayer tracking & timings"
        isEditMode={isEditMode}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveLayout={handleSaveLayout}
        onOpenAddWidget={() => setIsAddWidgetModalOpen(true)}
        onOpenPresets={() => setIsPresetModalOpen(true)}
        onResetDefault={handleResetDefault}
        actionsRight={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsQuranModalOpen(true)}
              className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-emerald-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Quran Recitation & Khatmah Tracker"
              aria-label="Quran Recitation & Khatmah"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              type="button"
              onClick={() => setIsFastingModalOpen(true)}
              className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-amber-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Fasting Desk & Iftar Countdown"
              aria-label="Fasting Desk"
            >
              <MoonStar className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => setIsQiblaModalOpen(true)}
              className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-amber-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Qibla Compass & Direction"
              aria-label="Qibla Compass"
            >
              <Compass className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={handleExportPrayerCsv}
              className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Export Prayer Ledger (.CSV)"
              aria-label="Export Prayer CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 rounded-xl border border-[var(--color-border)] transition-all tap-feedback ${
                isSettingsOpen ? 'bg-[var(--color-accent)] text-[#101410]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
              title="Prayer Settings & Method"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Settings Panel Drawer */}
      {isSettingsOpen && (
        <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3 animate-fade-in">
          <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Calculation Method & Location</h2>
          
          <div>
            <label className="text-[10px] text-[var(--color-text-secondary)] font-medium block">Calculation Source</label>
            <select
              value={state.prayerSettings?.calculation_method || 'Algerian Ministry of Religious Affairs'}
              onChange={(e) => {
                PrayerService.updateSettings({ calculation_method: e.target.value });
                onRefresh();
              }}
              className="w-full text-xs px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] mt-1"
            >
              {CALCULATION_METHODS.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[var(--color-text-secondary)] font-medium block">Location Name</label>
            <input
              type="text"
              value={state.prayerSettings?.location_name || 'Algiers, Algeria'}
              onChange={(e) => {
                PrayerService.updateSettings({ location_name: e.target.value });
                onRefresh();
              }}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] mt-1"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
            ✓ Never marked automatically • Unchecked prayers are never treated as confirmed missed.
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 p-1 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all tap-feedback min-h-[44px] ${
            activeTab === 'overview'
              ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-sm font-bold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]'
          }`}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('today');
          }}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all tap-feedback min-h-[44px] ${
            activeTab === 'today'
              ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-sm font-bold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]'
          }`}
        >
          <ListCheck className="w-4 h-4 shrink-0" />
          <span>Checklist</span>
        </button>

        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('history');
          }}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all tap-feedback min-h-[44px] ${
            activeTab === 'history'
              ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-sm font-bold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="truncate">History</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 0. TAB: OVERVIEW (CUSTOMIZABLE PRAYERS WIDGET GRID)       */}
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
                  <PrayersWidgetRenderer
                    widget={widgetConfig}
                    onRefresh={onRefresh}
                    triggerToast={triggerToast}
                  />
                </ModuleWidgetContainer>
              </div>
            ))}
          </div>

          {activeWidgets.length === 0 && (
            <div className="text-center py-12 px-4 rounded-3xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)]">
              <Sun className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-2" />
              <p className="text-xs font-bold text-[var(--color-text-primary)]">No Prayer Widgets Displayed</p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                Tap 'Edit Layout' or use the button below to add prayer widgets.
              </p>
              <button
                onClick={() => {
                  handleStartEdit();
                  setIsAddWidgetModalOpen(true);
                }}
                className="mt-3.5 px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[#101410] font-bold text-xs"
              >
                + Add Prayer Widget
              </button>
            </div>
          )}
        </div>
      )}

      {/* Date Switcher Ribbon (Shown on Checklist) */}
      {activeTab === 'today' && !isEditMode && (
        <div className="flex items-center justify-between p-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-dark-soft">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-xl hover:bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <span className="text-xs font-bold text-[var(--color-text-primary)] block">
              {isViewingToday ? "Today's Prayers" : selectedDate}
            </span>
            <span className="text-[10px] text-[var(--color-positive)] font-semibold">
              {dailyStatus.completedCount} of {dailyStatus.totalCount} Completed
            </span>
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 rounded-xl hover:bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Checklist */}
      {activeTab === 'today' && !isEditMode && (
        <div className="space-y-2">
          {dailyStatus.records.map(item => {
            const isReminderOn = state.prayerSettings?.reminders?.[item.prayer] !== false;

            return (
              <div
                key={item.prayer}
                onClick={() => handleToggle(item.prayer)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer tap-feedback ${
                  item.completed
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/40'
                    : 'bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-accent)]/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Custom Checkbox */}
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    item.completed
                      ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]'
                      : 'border-2 border-[var(--color-border)] bg-[var(--color-surface)]'
                  }`}>
                    {item.completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${item.completed ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-arabic">
                        {item.arabic}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--color-positive)] font-medium flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      PrayerService.toggleReminder(item.prayer);
                      onRefresh();
                    }}
                    className={`p-1.5 rounded-lg border transition-all ${
                      isReminderOn 
                        ? 'bg-[var(--color-surface)] text-[var(--color-accent)] border-[var(--color-border)]' 
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-transparent'
                    }`}
                    title={isReminderOn ? 'Reminder active' : 'Reminder muted'}
                  >
                    {isReminderOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                  </button>

                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${
                    item.completed 
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' 
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                  }`}>
                    {item.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History View */}
      {activeTab === 'history' && !isEditMode && (
        <div className="card-hero rounded-3xl p-4 border border-[var(--color-border)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Prayer Consistency (7-Day Overview)</h2>
            <span className="text-caption text-[var(--color-text-muted)]">Goal: 5 / 5 daily</span>
          </div>

          {/* Kinetic Weekly PillBars */}
          <PillBars
            days={history.slice(-7).map(d => ({
              label: d.date.slice(5),
              value: d.completedCount,
              max: 5,
              isToday: d.date === todayStr,
              isGoalMet: d.completedCount >= 5,
              formattedValue: `${d.completedCount}/5`,
            }))}
            targetAverage={5}
            targetLabel="Full Day (5 Prayers)"
            height={120}
          />

          {/* Contextual Streak Badge */}
          {dailyStatus.completedCount >= 5 && (
            <StreakMilestoneBadge
              type="prayer-streak"
              title="5/5 Daily Completion"
              subtitle="All obligatory prayers performed on time today"
              value="5/5"
            />
          )}

          <div className="pt-2 border-t border-[var(--color-border)]">
            <h3 className="text-caption font-bold text-[var(--color-text-secondary)] mb-2">14-Day Detailed History</h3>
            <div className="space-y-1.5">
              {history.map(day => (
                <div 
                  key={day.date}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setActiveTab('today');
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 cursor-pointer tap-feedback"
                >
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">{day.date}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-[var(--color-surface)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
                      <div 
                        className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-secondary)] h-full rounded-full" 
                        style={{ width: `${day.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[var(--color-accent)] w-8 text-right">
                      {day.completedCount}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Module Add Widget Modal */}
      <ModuleAddWidgetModal
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        moduleId="prayers"
        moduleTitle="Daily Prayers"
        currentWidgets={isEditMode ? draftWidgets : layout.widgets}
        onAddWidget={handleAddWidget}
      />

      {/* Module Presets Modal */}
      <ModulePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        moduleId="prayers"
        moduleTitle="Daily Prayers"
        activePreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />

      {/* Qibla Direction Compass Modal */}
      <QiblaModal
        isOpen={isQiblaModalOpen}
        onClose={() => setIsQiblaModalOpen(false)}
      />

      {/* Fasting Desk & Iftar Countdown Modal */}
      <FastingTrackerModal
        isOpen={isFastingModalOpen}
        onClose={() => setIsFastingModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />

      {/* Quran Recitation & Khatmah Tracker Modal */}
      <QuranKhatmahModal
        isOpen={isQuranModalOpen}
        onClose={() => setIsQuranModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />
    </div>
  );
};

