import React, { useState } from 'react';
import { 
  PiggyBank, 
  Plus, 
  Edit2, 
  Pause, 
  Play, 
  Archive, 
  Trash2, 
  Target, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Sparkles,
  X,
  AlertCircle
} from 'lucide-react';
import { db, formatCurrency } from '../../services/storage';
import { FinanceService } from '../../services/financeService';
import { SavingsGoal, SavingsGoalStatus } from '../../types';
import { RingProgress } from '../charts/RingProgress';
import { triggerHaptic } from '../../services/motion';

interface SavingsGoalsManagerProps {
  onRefresh: () => void;
  onContribute: (goalId: string) => void;
}

export const SavingsGoalsManager: React.FC<SavingsGoalsManagerProps> = ({ 
  onRefresh,
  onContribute 
}) => {
  const state = db.getState();
  const currencyLabel = state.settings.currency_label || 'DA';

  const [showArchived, setShowArchived] = useState(false);
  const goals = FinanceService.getGoals(showArchived);

  // Modal states for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalTargetMajor, setGoalTargetMajor] = useState<string>('');
  const [goalCurrentSavedMajor, setGoalCurrentSavedMajor] = useState<string>('0');
  const [goalMonthlyPaceMajor, setGoalMonthlyPaceMajor] = useState<string>('35000');
  const [goalTargetDate, setGoalTargetDate] = useState<string>('2028-12-31');
  const [goalNotes, setGoalNotes] = useState('');

  const handleOpenCreateModal = () => {
    setEditingGoalId(null);
    setGoalName('');
    setGoalTargetMajor('');
    setGoalCurrentSavedMajor('0');
    setGoalMonthlyPaceMajor('20000');
    setGoalTargetDate('2027-12-31');
    setGoalNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (goal: SavingsGoal) => {
    setEditingGoalId(goal.id);
    setGoalName(goal.name);
    setGoalTargetMajor(String(Math.round(goal.target_minor / 100)));
    setGoalCurrentSavedMajor(String(Math.round((goal.current_saved_minor || 0) / 100)));
    setGoalMonthlyPaceMajor(String(Math.round((goal.monthly_contribution_minor || 3500000) / 100)));
    setGoalTargetDate(goal.target_date || '2028-12-31');
    setGoalNotes(goal.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTargetMajor);
    const current = parseFloat(goalCurrentSavedMajor) || 0;
    const monthly = parseFloat(goalMonthlyPaceMajor) || 20000;
    if (isNaN(target) || target <= 0 || !goalName.trim()) return;

    FinanceService.saveGoal({
      id: editingGoalId || undefined,
      name: goalName.trim(),
      targetMajor: target,
      currentSavedMajor: current,
      monthlyContributionMajor: monthly,
      targetDate: goalTargetDate,
      notes: goalNotes.trim(),
    });

    setIsModalOpen(false);
    onRefresh();
  };

  const handleTogglePause = (goal: SavingsGoal) => {
    const newStatus: SavingsGoalStatus = goal.status === 'paused' ? 'active' : 'paused';
    FinanceService.setGoalStatus(goal.id, newStatus);
    onRefresh();
  };

  const handleToggleArchive = (goal: SavingsGoal) => {
    const newStatus: SavingsGoalStatus = goal.status === 'archived' ? 'active' : 'archived';
    FinanceService.setGoalStatus(goal.id, newStatus);
    onRefresh();
  };

  const handleDeleteGoal = (goal: SavingsGoal) => {
    if (confirm(`Delete "${goal.name}"? Historical ledger records and deposits will be strictly preserved.`)) {
      FinanceService.deleteGoal(goal.id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--color-accent)]" />
            Multi-Goal Savings Portfolio
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Isolated target tracking with dynamic run-rate completion horizons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
              showArchived
                ? 'bg-[var(--color-surface-subtle)] text-[var(--color-accent)] border-[var(--color-accent)]/40'
                : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border-[var(--color-border)]'
            }`}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-xs font-bold text-[var(--color-accent-contrast)]  tap-feedback hover:brightness-105"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center space-y-2">
            <PiggyBank className="w-8 h-8 text-[var(--color-text-muted)] mx-auto" />
            <p className="text-xs text-[var(--color-text-secondary)]">No savings goals found in this view.</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-xs font-bold text-[var(--color-accent-contrast)]"
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          goals.map(goal => {
            const projection = FinanceService.getGoalProjections(goal.id);
            const isPaused = goal.status === 'paused';
            const isArchived = goal.status === 'archived';

            return (
              <div
                key={goal.id}
                className={`p-4 rounded-3xl border transition-all space-y-3 ${
                  isArchived 
                    ? 'bg-[var(--surface-subtle)] border-[var(--hairline)] opacity-60' 
                    : isPaused
                    ? 'bg-[var(--surface)] border-white/20'
                    : 'bg-[var(--surface)] border-[var(--hairline)]'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-1)]">{goal.name}</h3>
                      {isPaused && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/[0.08] text-[var(--text-1)] border border-white/20">
                          Paused
                        </span>
                      )}
                      {isArchived && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-[var(--text-3)] border border-white/10">
                          Archived
                        </span>
                      )}
                    </div>
                    {goal.notes && (
                      <p className="text-xs text-[var(--text-3)] line-clamp-1">{goal.notes}</p>
                    )}
                  </div>

                  {/* Goal Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePause(goal)}
                      className="p-1.5 rounded-xl bg-[var(--surface-subtle)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--hairline)] transition-all"
                      title={isPaused ? 'Resume Goal' : 'Pause Goal'}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(goal)}
                      className="p-1.5 rounded-xl bg-[var(--surface-subtle)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--hairline)] transition-all"
                      title="Edit Goal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(goal)}
                      className="p-1.5 rounded-xl bg-[var(--surface-subtle)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--hairline)] transition-all"
                      title={isArchived ? 'Restore Goal' : 'Archive Goal'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal)}
                      className="p-1.5 rounded-xl bg-[var(--surface-subtle)] text-[var(--text-3)] hover:text-white hover:bg-white/10 border border-[var(--hairline)] transition-all"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Summary: RingProgress in Accent */}
                <div 
                  onClick={() => !isArchived && !isPaused && onContribute(goal.id)}
                  className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--hairline)] flex items-center gap-3.5 cursor-pointer hover:border-[var(--accent)]/40 transition-colors"
                >
                  <RingProgress
                    value={projection.currentSavedMinor}
                    max={projection.targetMinor || 1}
                    size={56}
                    strokeWidth={5}
                    color="var(--accent)"
                    trackColor="var(--track)"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-[var(--text-1)]">
                        {formatCurrency(projection.currentSavedMinor, currencyLabel)}
                      </span>
                      <span className="text-xs text-[var(--text-3)]">
                        of {formatCurrency(projection.targetMinor, currencyLabel)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgb(var(--accent-rgb)/.12)] text-[var(--accent-light)] font-medium">
                        +{formatCurrency(projection.monthlyContributionMinor, currencyLabel)}/mo
                      </span>
                      <span className="text-[var(--text-3)]">
                        {projection.progressPct}% · {projection.estimatedCompletionDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Contribute Button */}
                {!isArchived && !isPaused && (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onContribute(goal.id);
                    }}
                    className="w-full py-2 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--hairline)] text-xs font-bold text-[var(--accent)] transition-all tap-feedback flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Contribute to {goal.name}</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Goal Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveGoal}
            className="w-full max-w-sm bg-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-border)] shadow-2xl space-y-3.5 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                {editingGoalId ? 'Edit Savings Goal' : 'Create Savings Goal'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1">Goal Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Buy a car, Emergency fund, New laptop"
                value={goalName}
                onChange={e => setGoalName(e.target.value)}
                className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1">
                  Target ({currencyLabel})
                </label>
                <input
                  type="number"
                  required
                  placeholder="1,000,000"
                  value={goalTargetMajor}
                  onChange={e => setGoalTargetMajor(e.target.value)}
                  className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1">
                  Current Saved ({currencyLabel})
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={goalCurrentSavedMajor}
                  onChange={e => setGoalCurrentSavedMajor(e.target.value)}
                  className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1">
                  Monthly Target ({currencyLabel}/mo)
                </label>
                <input
                  type="number"
                  placeholder="35,000"
                  value={goalMonthlyPaceMajor}
                  onChange={e => setGoalMonthlyPaceMajor(e.target.value)}
                  className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1">Target Date</label>
                <input
                  type="date"
                  value={goalTargetDate}
                  onChange={e => setGoalTargetDate(e.target.value)}
                  className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1">Notes / Purpose (Optional)</label>
              <input
                type="text"
                placeholder="Down payment, engine specs, etc."
                value={goalNotes}
                onChange={e => setGoalNotes(e.target.value)}
                className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-2xl bg-[var(--color-accent)] text-xs font-bold text-[var(--color-accent-contrast)] "
              >
                {editingGoalId ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
