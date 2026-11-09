import React, { useState } from 'react';
import { 
  CalendarDays, 
  CheckSquare, 
  Clock, 
  Plus, 
  Check, 
  AlertCircle,
  Sparkles,
  Calendar as CalendarIcon,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { db, generateUUID, getTodayLocalDate } from '../services/storage';
import { Task, ModuleLayoutState, ModuleWidgetConfig, WidgetSize } from '../types';
import { ModuleCustomizationService } from '../services/moduleCustomizationService';
import { MODULE_WIDGET_REGISTRY } from '../services/moduleWidgetRegistry';
import { ModuleEditHeader } from '../components/customization/ModuleEditHeader';
import { ModuleWidgetContainer } from '../components/customization/ModuleWidgetContainer';
import { ModuleAddWidgetModal } from '../components/customization/ModuleAddWidgetModal';
import { ModulePresetModal } from '../components/customization/ModulePresetModal';
import { CalendarWidgetRenderer } from '../components/calendar/CalendarWidgetRenderer';
import { useTranslation } from '../services/i18n';

interface CalendarScreenProps {
  onRefresh: () => void;
  onBack?: () => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ onRefresh, onBack }) => {
  const { t, isRtl } = useTranslation();
  const state = db.getState();
  const today = getTodayLocalDate();
  const [activeTab, setActiveTab] = useState<'overview' | 'agenda' | 'tasks'>('overview');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [taskDueChoice, setTaskDueChoice] = useState<'today' | 'tomorrow'>('today');


  // Module Customization State
  const [layout, setLayout] = useState<ModuleLayoutState>(ModuleCustomizationService.getLayout('calendar'));
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

  const activeTasks = (state.tasks || []).filter(t => !t.deleted_at);
  const activeEvents = (state.events || []).filter(e => !e.deleted_at);

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
    ModuleCustomizationService.saveLayout('calendar', newLayout);
    setLayout(newLayout);
    setIsEditMode(false);
    triggerToast('✓ Calendar layout saved successfully');
    onRefresh();
  };

  const handleResetDefault = () => {
    const res = ModuleCustomizationService.resetToDefault('calendar');
    setLayout(res);
    setDraftWidgets([...res.widgets]);
    triggerToast('✓ Reset to default layout');
    onRefresh();
  };

  const handleApplyPreset = (presetId: string) => {
    const res = ModuleCustomizationService.applyPreset('calendar', presetId);
    setLayout(res);
    setDraftWidgets([...res.widgets]);
    triggerToast(`✓ Applied ${presetId.replace('_', ' ')}`);
    onRefresh();
  };

  const handleAddWidget = (widgetType: string) => {
    if (isEditMode) {
      const def = MODULE_WIDGET_REGISTRY[widgetType];
      const newW: ModuleWidgetConfig = {
        id: `mod-calendar-${widgetType}-${Date.now().toString(36)}`,
        widgetType,
        size: def?.defaultSize || 'full',
        visible: true,
        order: draftWidgets.length,
      };
      setDraftWidgets(prev => [...prev, newW]);
    } else {
      const res = ModuleCustomizationService.addWidget('calendar', widgetType);
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
      const res = ModuleCustomizationService.removeWidget('calendar', widgetId);
      setLayout(res);
    }
    triggerToast('✓ Removed card from page');
  };

  const handleToggleVisibility = (widgetId: string) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w));
    } else {
      const res = ModuleCustomizationService.toggleWidgetVisibility('calendar', widgetId);
      setLayout(res);
    }
  };

  const handleChangeSize = (widgetId: string, size: WidgetSize) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, size } : w));
    } else {
      const res = ModuleCustomizationService.changeWidgetSize('calendar', widgetId, size);
      setLayout(res);
    }
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

  const handleToggleTask = (task: Task) => {
    db.updateState(s => {
      const t = s.tasks.find(item => item.id === task.id);
      if (t) {
        t.done = !t.done;
        t.updated_at = Date.now();
      }
    });
    onRefresh();
  };

    const handleClearCompleted = () => {
    const completed = activeTasks.filter(t => t.done);
    if (completed.length === 0) return;
    if (confirm(`Archive ${completed.length} completed tasks?`)) {
      db.updateState(s => {
        const now = Date.now();
        s.tasks.forEach(t => {
          if (t.done && !t.deleted_at) t.deleted_at = now;
        });
      });
      triggerToast(`✓ Archived ${completed.length} completed tasks`);
      onRefresh();
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    let targetDueDate = today;
    if (taskDueChoice === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      targetDueDate = d.toISOString().split('T')[0];
    }

    db.updateState(s => {
      const t: Task = {
        id: generateUUID(),
        title: newTaskTitle.trim(),
        due_date: targetDueDate,
        due_time: '12:00',
        done: false,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      };
      s.tasks.unshift(t);
    });

    triggerToast(`✓ Created task "${newTaskTitle.trim()}"`);
    setNewTaskTitle('');
    onRefresh();
  };

  const activeWidgets = isEditMode ? draftWidgets : layout.widgets.filter(w => w.visible);

  return (
    <div className="space-y-4 pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-xs  border border-[var(--color-border)] flex items-center gap-2 animate-slide-down">
          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Reusable Module Edit Header */}
      <ModuleEditHeader
        title="Agenda & Tasks"
        subtitle="Virtual occurrences & floating local time"
        isEditMode={isEditMode}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveLayout={handleSaveLayout}
        onOpenAddWidget={() => setIsAddWidgetModalOpen(true)}
        onOpenPresets={() => setIsPresetModalOpen(true)}
        onResetDefault={handleResetDefault}
        onBack={onBack}
      />

      {/* Tabs */}
      <div className="flex rounded-2xl bg-[var(--color-surface)] p-1 border border-[var(--color-border)] overflow-x-auto no-scrollbar gap-1">
        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('overview');
          }}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition-all tap-feedback min-h-[44px] ${
            activeTab === 'overview'
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          {t('common.overview', 'Overview')}
        </button>
        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('agenda');
          }}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition-all tap-feedback min-h-[44px] ${
            activeTab === 'agenda'
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          {t('calendar.timeline', 'Timeline')}
        </button>
        <button
          onClick={() => {
            if (isEditMode) setIsEditMode(false);
            setActiveTab('tasks');
          }}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap transition-all tap-feedback min-h-[44px] ${
            activeTab === 'tasks'
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          {t('calendar.tasks', 'Tasks')} ({activeTasks.filter(t => !t.done).length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* 0. TAB: OVERVIEW (CUSTOMIZABLE CALENDAR WIDGETS GRID)     */}
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
                  <CalendarWidgetRenderer
                    widget={widgetConfig}
                    onRefresh={onRefresh}
                    triggerToast={triggerToast}
                  />
                </ModuleWidgetContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TAB: TIMELINE (DAILY OCCURRENCES)                     */}
      {/* ======================================================== */}
      {activeTab === 'agenda' && !isEditMode && (
        <div className="space-y-3 animate-fade-in">
          <div className="p-3.5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] ">
            <strong className="text-[var(--color-text-primary)]">Occurrences, not copies:</strong> Habits and workout plans are dynamically projected on the fly, eliminating database duplication.
          </div>

          <div className="bg-[var(--color-card)] rounded-3xl p-4 border border-[var(--color-border)]  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Today's Scheduled Timeline</span>
              <span className="text-xs text-[var(--color-accent)] font-semibold bg-[var(--color-surface)] px-2.5 py-0.5 rounded-full border border-[var(--color-border)]">
                Floating Time
              </span>
            </div>

            <div className="space-y-2.5">
              {activeEvents.map(event => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                  <div className="text-xs font-bold text-[var(--color-accent)] bg-[var(--color-card)] px-2 py-1 rounded-xl mt-0.5 border border-[var(--color-border)]">
                    {event.start_time}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">{event.title}</span>
                      <span className="text-xs px-1.5 py-0.2 rounded bg-[var(--color-surface)] text-[var(--color-text-secondary)] font-medium border border-[var(--color-border)]">
                        Calendar Event
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{event.duration} mins • {event.notes || 'Downtown café'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TAB: TASKS CHECKLIST                                  */}
      {/* ======================================================== */}
      {activeTab === 'tasks' && !isEditMode && (() => {
        const pendingCount = activeTasks.filter(t => !t.done).length;
        const completedCount = activeTasks.filter(t => t.done).length;
        const overdueCount = activeTasks.filter(t => !t.done && t.due_date && t.due_date < today).length;

        const filteredTasks = activeTasks.filter(task => {
          const isOverdue = !task.done && task.due_date && task.due_date < today;
          if (taskFilter === 'pending') return !task.done;
          if (taskFilter === 'completed') return task.done;
          if (taskFilter === 'overdue') return isOverdue;
          return true;
        });

        return (
          <div className="space-y-3.5 animate-fade-in">
            {/* Task Creation Form with Due Date Pills */}
            <form onSubmit={handleCreateTask} className="card-clean p-3 space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-cyan-500 bg-[var(--color-bg)] text-[var(--color-text-primary)] shadow-sm placeholder-[var(--color-text-muted)]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold shadow-sm tap-feedback flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-[var(--color-text-muted)]">Due date:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTaskDueChoice('today')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      taskDueChoice === 'today'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskDueChoice('tomorrow')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      taskDueChoice === 'tomorrow'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            </form>

            {/* Sub-Filters and Clear Completed */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: `All (${activeTasks.length})` },
                  { id: 'pending', label: `Pending (${pendingCount})` },
                  { id: 'completed', label: `Done (${completedCount})` },
                  ...(overdueCount > 0 ? [{ id: 'overdue', label: `Overdue (${overdueCount})` }] : [])
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTaskFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      taskFilter === f.id
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-negative)] shrink-0 transition-colors"
                >
                  Clear Done
                </button>
              )}
            </div>

            {/* Filtered Tasks List */}
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                  No tasks under this filter.
                </div>
              ) : (
                filteredTasks.map((task) => {
              const isOverdue = !task.done && task.due_date && task.due_date < today;

              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    task.done
                      ? 'bg-[var(--color-surface)]/60 border-[var(--color-border)] opacity-60'
                      : isOverdue
                      ? 'bg-[var(--color-card)] border-[var(--color-negative)]/40 shadow-sm'
                      : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-accent)] shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                        task.done
                          ? 'bg-[var(--color-positive)] border-[var(--color-positive)] text-white'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                      }`}
                    >
                      {task.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className={`text-xs font-medium ${task.done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mt-0.5">
                        {isOverdue ? (
                          <span className="text-[var(--color-negative)] font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Overdue ({task.due_date})
                          </span>
                        ) : (
                          <span>Due: {task.due_date === today ? 'Today' : task.due_date} {task.due_time}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete task "${task.title}"?`)) {
                        db.updateState(s => {
                          const t = s.tasks.find(item => item.id === task.id);
                          if (t) t.deleted_at = Date.now();
                        });
                        onRefresh();
                      }
                    }}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-negative)] hover:bg-[var(--color-negative)]/10 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  })()}

      {/* Module Customization Add Widget & Preset Modals */}
      <ModuleAddWidgetModal
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        moduleId="calendar"
        moduleTitle="Calendar & Tasks"
        currentWidgets={isEditMode ? draftWidgets : layout.widgets}
        onAddWidget={handleAddWidget}
      />

      <ModulePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        moduleId="calendar"
        moduleTitle="Calendar & Tasks"
        activePreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />
    </div>
  );
};
