import React, { useState } from 'react';
import { 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  Check, 
  Plus, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { db, generateUUID, getTodayLocalDate } from '../../services/storage';
import { Task, CalendarEvent, ModuleWidgetConfig } from '../../types';

interface CalendarWidgetRendererProps {
  widget: ModuleWidgetConfig;
  onRefresh: () => void;
  triggerToast?: (msg: string) => void;
}

export const CalendarWidgetRenderer: React.FC<CalendarWidgetRendererProps> = ({
  widget,
  onRefresh,
  triggerToast = () => {},
}) => {
  const state = db.getState();
  const today = getTodayLocalDate();

  const [newTaskInput, setNewTaskInput] = useState('');

  const activeTasks = (state.tasks || []).filter(t => !t.deleted_at);
  const todayTasks = activeTasks.filter(t => t.due_date === today);
  const upcomingTasks = activeTasks.filter(t => t.due_date && t.due_date > today);
  const completedTasks = activeTasks.filter(t => t.done).slice(0, 5);
  const activeEvents = (state.events || []).filter(e => !e.deleted_at);
  const todayEvents = activeEvents.filter(e => e.local_date === today);

  const handleToggleTask = (taskId: string) => {
    db.updateState(s => {
      const t = s.tasks.find(item => item.id === taskId);
      if (t) {
        t.done = !t.done;
        t.updated_at = Date.now();
      }
    });
    onRefresh();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;

    db.updateState(s => {
      const t: Task = {
        id: generateUUID(),
        title: newTaskInput.trim(),
        due_date: today,
        due_time: '12:00',
        done: false,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      };
      s.tasks.unshift(t);
    });

    triggerToast(`✓ Created task "${newTaskInput.trim()}"`);
    setNewTaskInput('');
    onRefresh();
  };

  switch (widget.widgetType) {
    // 1. Today's Tasks
    case 'tasks_today':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Action Items
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Today's Tasks
                </h3>
              </div>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] font-semibold">
              {todayTasks.filter(t => t.done).length}/{todayTasks.length} done
            </span>
          </div>

          <form onSubmit={handleCreateTask} className="flex gap-2">
            <input
              type="text"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              placeholder="Add a new task for today..."
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold tap-feedback shadow-sm"
            >
              Add
            </button>
          </form>

          <div className="space-y-1.5 pt-1">
            {todayTasks.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] py-2 text-center">
                No tasks scheduled for today.
              </p>
            ) : (
              todayTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleToggleTask(t.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface)]/70 border border-[var(--color-border)] text-xs cursor-pointer hover:border-[var(--color-accent)] tap-feedback transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                      t.done
                        ? 'bg-[var(--color-positive)] border-[var(--color-positive)] text-white'
                        : 'border-[var(--color-border)] bg-[var(--color-card)]'
                    }`}>
                      {t.done && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={`font-medium ${t.done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                      {t.title}
                    </span>
                  </div>
                  {t.due_time && (
                    <span className="text-xs text-[var(--color-text-secondary)]">{t.due_time}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      );

    // 2. Upcoming Tasks
    case 'tasks_upcoming':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Upcoming 7-Day Tasks
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">{upcomingTasks.length} pending</span>
          </div>

          <div className="space-y-1.5">
            {upcomingTasks.slice(0, 4).map(t => (
              <div key={t.id} className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[180px]">{t.title}</span>
                <span className="text-xs text-[var(--color-accent)] font-semibold">{t.due_date}</span>
              </div>
            ))}
          </div>
        </div>
      );

    // 3. Calendar View (Interactive Month View)
    case 'calendar_view':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Monthly Calendar
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">{today}</span>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-[var(--color-text-primary)] block">Virtual Occurrences</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{activeEvents.length} active time blocks mapped</span>
            </div>
            <span className="text-xs font-bold text-[var(--color-accent)]">On Track</span>
          </div>
        </div>
      );

    // 4. Important Events
    case 'calendar_events':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Time-Blocked Events
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">{todayEvents.length} today</span>
          </div>

          <div className="space-y-1.5">
            {todayEvents.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] py-2 text-center">
                No events scheduled for today.
              </p>
            ) : (
              todayEvents.map(e => (
                <div key={e.id} className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[var(--color-text-primary)]">{e.title}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{e.start_time || 'All day'} {e.duration ? `(${e.duration} min)` : ''}</div>
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-accent)] px-2 py-0.5 rounded-md bg-[var(--color-card)] border border-[var(--color-border)]">
                    Scheduled
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      );

    // 5. Deadlines & Urgent Items
    case 'tasks_deadlines':
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-warning)]">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Deadlines & Urgent Items
              </h3>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {upcomingTasks.length > 0 ? `${upcomingTasks.length} tasks scheduled with fixed deadlines this week.` : 'All upcoming deadlines are currently in order.'}
          </p>
        </div>
      );

    // 6. Completed Tasks
    case 'tasks_completed':
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-positive)]">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Recently Completed
              </h3>
            </div>
            <span className="text-xs font-bold text-[var(--color-positive)]">{completedTasks.length} archived</span>
          </div>
          <div className="space-y-1">
            {completedTasks.map(t => (
              <div key={t.id} className="text-xs text-[var(--color-text-secondary)] line-through py-0.5">
                • {t.title}
              </div>
            ))}
          </div>
        </div>
      );

    // 7. Priority Tasks Focus
    case 'tasks_priority':
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--color-text-secondary)] block">Deep Focus</span>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Priority Action Focus</h3>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Focus on your top high-leverage tasks first before tending to smaller items.
          </p>
        </div>
      );

    // 8. Weekly Schedule Overview
    case 'calendar_weekly_schedule':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              7-Day Agenda Overview
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Active Tasks</span>
              <div className="font-black text-[var(--color-text-primary)] text-sm">{activeTasks.length} items</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Time Blocks</span>
              <div className="font-black text-[var(--color-text-primary)] text-sm">{activeEvents.length} events</div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
