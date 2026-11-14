import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Check, 
  Flame, 
  Plus, 
  Calendar, 
  X, 
  Dumbbell, 
  BookOpen, 
  Droplets, 
  Heart, 
  Sun, 
  Moon, 
  Smile, 
  Target,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { Habit, HabitEntry } from '../../types';
import { db, generateUUID } from '../../services/storage';
import { Haptics } from '../../services/haptics';

interface HabitsConsistencyCardProps {
  habits: Habit[];
  habitEntries: HabitEntry[];
  today: string;
  onRefresh: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Sparkles,
  Dumbbell,
  BookOpen,
  Droplets,
  Heart,
  Sun,
  Moon,
  Smile,
  Target,
};

export const HabitsConsistencyCard: React.FC<HabitsConsistencyCardProps> = ({
  habits,
  habitEntries,
  today,
  onRefresh,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('Sparkles');

  // Generate 7-day strip (from 6 days ago through today)
  const past7Days = useMemo(() => {
    const days = [];
    const base = new Date(today + 'T12:00:00');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString(undefined, { weekday: 'narrow' });
      days.push({
        dateStr,
        dayLabel,
        isToday: i === 0,
      });
    }
    return days;
  }, [today]);

  // Active habits list
  const activeHabits = useMemo(() => {
    return habits.filter(h => !h.archived && !h.deleted_at);
  }, [habits]);

  // Calculate stats per habit
  const habitStats = useMemo(() => {
    return activeHabits.map(habit => {
      // Calculate streak
      let streak = 0;
      const base = new Date(today + 'T12:00:00');
      
      const isCompletedToday = habitEntries.some(
        e => e.habit_id === habit.id && e.local_date === today && e.status === 'completed' && !e.deleted_at
      );
      if (isCompletedToday) streak++;

      for (let i = 1; i <= 60; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const hasCompleted = habitEntries.some(
          e => e.habit_id === habit.id && e.local_date === dateStr && e.status === 'completed' && !e.deleted_at
        );
        if (hasCompleted) {
          streak++;
        } else {
          break;
        }
      }

      // 7-day completion count
      const completedLast7 = past7Days.filter(day =>
        habitEntries.some(
          e => e.habit_id === habit.id && e.local_date === day.dateStr && e.status === 'completed' && !e.deleted_at
        )
      ).length;

      const completionRate = Math.round((completedLast7 / 7) * 100);

      return {
        habit,
        streak,
        isCompletedToday,
        completedLast7,
        completionRate,
      };
    });
  }, [activeHabits, habitEntries, today, past7Days]);

  // Overall today summary
  const completedTodayCount = habitStats.filter(s => s.isCompletedToday).length;
  const overallTodayPct = activeHabits.length > 0 
    ? Math.round((completedTodayCount / activeHabits.length) * 100) 
    : 0;

  // Toggle habit on a specific date
  const handleToggleDate = (habitId: string, dateStr: string) => {
    Haptics.tick();
    db.updateState(draft => {
      const existing = draft.habitEntries.find(
        e => e.habit_id === habitId && e.local_date === dateStr && !e.deleted_at
      );
      if (existing) {
        if (existing.status === 'completed') {
          existing.status = 'skipped';
        } else {
          existing.deleted_at = Date.now();
        }
      } else {
        draft.habitEntries.push({
          id: generateUUID(),
          habit_id: habitId,
          local_date: dateStr,
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

  // Create habit
  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    Haptics.tick();
    const newH: Habit = {
      id: generateUUID(),
      name: newHabitName.trim(),
      icon: newHabitIcon,
      archived: false,
      link_source: null,
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(draft => {
      draft.habits.push(newH);
    });

    setNewHabitName('');
    setIsAddModalOpen(false);
    onRefresh();
    Haptics.success();
  };

  return (
    <div className="card-premium p-5 space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Daily Habits & Consistency
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                {completedTodayCount}/{activeHabits.length} Today
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Multi-day check-in matrix & streak momentum
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold hover:brightness-110 transition-all tap-feedback shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Progress Bar for Today */}
      <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)] font-medium">Today's Progress</span>
          <span className="font-bold text-[var(--color-text-primary)]">{overallTodayPct}% Complete</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(activeHabits.length > 0 ? 3 : 0, overallTodayPct)}%` }}
          />
        </div>
      </div>

      {/* Habit Matrix Table / Rows */}
      <div className="space-y-2.5">
        {/* Days Header */}
        <div className="flex items-center justify-between px-2 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          <span>Habit</span>
          <div className="flex items-center gap-2">
            {past7Days.map(d => (
              <span 
                key={d.dateStr} 
                className={`w-7 text-center ${d.isToday ? 'text-[var(--color-accent)] font-extrabold' : ''}`}
              >
                {d.dayLabel}
              </span>
            ))}
          </div>
        </div>

        {/* Habit Rows */}
        {habitStats.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-2">
            <Sparkles className="w-6 h-6 text-[var(--color-text-muted)] mx-auto opacity-50" />
            <p className="text-xs text-[var(--color-text-secondary)]">No habits created yet.</p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs text-[var(--color-accent)] font-bold hover:underline"
            >
              + Create your first habit
            </button>
          </div>
        ) : (
          habitStats.map(({ habit, streak, isCompletedToday, completionRate }) => {
            const IconComponent = ICON_MAP[habit.icon] || Sparkles;

            return (
              <div
                key={habit.id}
                className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] transition-all flex items-center justify-between gap-2"
              >
                {/* Left: Icon, Name & Streak */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    isCompletedToday 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-white/[0.04] text-[var(--color-text-muted)] border-[var(--color-border)]'
                  }`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                      {habit.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                      {streak > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                          <Flame className="w-3 h-3 fill-amber-400" />
                          <span>{streak}d</span>
                        </span>
                      )}
                      <span>{completionRate}% week</span>
                    </div>
                  </div>
                </div>

                {/* Right: 7-Day Matrix Check-in Bubbles */}
                <div className="flex items-center gap-2 shrink-0">
                  {past7Days.map(d => {
                    const entry = habitEntries.find(
                      e => e.habit_id === habit.id && e.local_date === d.dateStr && !e.deleted_at
                    );
                    const isDone = entry?.status === 'completed';
                    const isSkipped = entry?.status === 'skipped';

                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => handleToggleDate(habit.id, d.dateStr)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all tap-feedback border ${
                          isDone
                            ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-sm'
                            : isSkipped
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : d.isToday
                            ? 'bg-[var(--color-surface)] border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'
                            : 'bg-white/[0.03] border-[var(--color-border)] text-transparent hover:border-[var(--color-text-muted)]'
                        }`}
                        title={`${d.dateStr}: ${isDone ? 'Completed' : isSkipped ? 'Skipped' : 'Not done'}`}
                      >
                        {isDone ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : isSkipped ? (
                          <span className="text-[10px] font-bold">•</span>
                        ) : d.isToday ? (
                          <Plus className="w-3 h-3 opacity-60" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Habit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Create New Habit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                  Habit Name *
                </label>
                <input
                  type="text"
                  required
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g. Read 20 pages, Cold Shower, Posture Check"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Select Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.keys(ICON_MAP).map(iconKey => {
                    const IconC = ICON_MAP[iconKey];
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setNewHabitIcon(iconKey)}
                        className={`p-2.5 rounded-xl flex items-center justify-center border transition-all ${
                          newHabitIcon === iconKey
                            ? 'bg-[var(--color-accent)] text-[var(--color-bg)] border-[var(--color-accent)]'
                            : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        <IconC className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHabitName.trim()}
                  className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  Add Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
