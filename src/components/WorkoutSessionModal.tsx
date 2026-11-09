import React, { useState } from 'react';
import { X, Check, Dumbbell, Plus, Clock, Trophy, Trash2 } from 'lucide-react';
import { db, generateUUID, getTodayLocalDate } from '../services/storage';
import { calculateEpley1RM, calculateSessionVolume } from '../services/calculation';
import { LinkingService } from '../services/linking';
import { SetEntry, WorkoutSession, Exercise } from '../types';

interface WorkoutSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const WorkoutSessionModal: React.FC<WorkoutSessionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const state = db.getState();
  const today = getTodayLocalDate();

  const availableExercises: Exercise[] = state.exercises || [];

  const [sessionName, setSessionName] = useState('Push Day Workout');
  const [exerciseId, setExerciseId] = useState(availableExercises[0]?.id || 'ex-1');
  const [weight, setWeight] = useState(80);
  const [reps, setReps] = useState(8);
  const [isWarmup, setIsWarmup] = useState(false);

  const [loggedSets, setLoggedSets] = useState<{ id: string; exerciseId: string; weight: number; reps: number; isWarmup: boolean }[]>([
    { id: 's1', exerciseId: availableExercises[0]?.id || 'ex-1', weight: 60, reps: 10, isWarmup: true },
    { id: 's2', exerciseId: availableExercises[0]?.id || 'ex-1', weight: 80, reps: 8, isWarmup: false },
    { id: 's3', exerciseId: availableExercises[0]?.id || 'ex-1', weight: 80, reps: 8, isWarmup: false },
  ]);

  if (!isOpen) return null;

  const currentExercise = availableExercises.find(e => e.id === exerciseId) || availableExercises[0];

  const handleAddSet = () => {
    if (weight <= 0 || reps <= 0) return;
    setLoggedSets([
      ...loggedSets, 
      { id: generateUUID(), exerciseId, weight, reps, isWarmup }
    ]);
    setIsWarmup(false);
  };

  const handleRemoveSet = (index: number) => {
    setLoggedSets(loggedSets.filter((_, idx) => idx !== index));
  };

  const handleComplete = () => {
    if (loggedSets.length === 0) {
      alert('Please log at least one set.');
      return;
    }

    const now = Date.now();
    const sessionId = 'session-' + now;
    const sets: SetEntry[] = loggedSets.map((s) => ({
      id: generateUUID(),
      session_id: sessionId,
      exercise_id: s.exerciseId,
      weight_kg: s.weight,
      reps: s.reps,
      is_warmup: s.isWarmup,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }));

    const session: WorkoutSession = {
      id: generateUUID(),
      plan_id: 'plan-custom',
      name: sessionName.trim() || 'Gym Workout',
      local_date: today,
      started_at: now - 3600000,
      ended_at: now,
      notes: `Completed ${loggedSets.length} sets.`,
      sets,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(draft => {
      draft.workoutSessions.unshift(session);
    });

    // Cross-module linking
    LinkingService.onWorkoutSaved();
    onSaved();
    onClose();
  };

  const best1RM = loggedSets
    .filter(s => !s.isWarmup)
    .reduce((max, s) => {
      const rm = calculateEpley1RM(s.weight, s.reps, s.isWarmup);
      return rm && rm > max ? rm : max;
    }, 0);

  const totalVolume = loggedSets.reduce((sum, s) => sum + (s.weight * s.reps), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70  animate-fade-in">
      <div 
        className="w-full max-w-md bg-[var(--color-surface)] rounded-3xl p-5  border border-[var(--color-border)] max-h-[92vh] overflow-y-auto no-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-modal-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#222C24] text-[var(--color-accent)] border border-[var(--color-border)]">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 id="session-modal-title" className="text-sm font-bold text-[var(--color-text-primary)]">
                Log Workout Session
              </h2>
              <span className="text-xs text-[var(--color-text-secondary)]">Track working sets & 1RM volume</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[#222C24]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Name input */}
        <div className="mt-3">
          <label className="text-xs text-[var(--color-text-secondary)] font-semibold block">Session Name</label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
          />
        </div>

        {/* PR & Volume highlights */}
        <div className="my-3 p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-xs text-[var(--color-text-muted)] font-bold block">Estimated 1RM</span>
            <div className="text-sm font-black text-[var(--color-accent)] mt-0.5">{best1RM} kg</div>
          </div>
          <div>
            <span className="text-xs text-[var(--color-text-muted)] font-bold block">Total Volume</span>
            <div className="text-sm font-black text-[var(--color-text-primary)] mt-0.5">{totalVolume.toLocaleString()} kg</div>
          </div>
          <div>
            <span className="text-xs text-[var(--color-text-muted)] font-bold block">Sets Logged</span>
            <div className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">{loggedSets.length} sets</div>
          </div>
        </div>

        {/* Exercise Selector */}
        <div className="mb-3">
          <label className="text-xs text-[var(--color-text-secondary)] font-semibold block">Select Exercise</label>
          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1"
          >
            {availableExercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.category})
              </option>
            ))}
          </select>
        </div>

        {/* Add Set Inputs */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2.5 mb-3">
          <div className="text-xs font-bold text-[var(--color-text-primary)]">Add Set for {currentExercise?.name}</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[var(--color-text-secondary)]">Weight (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-bold text-center px-2 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-secondary)]">Reps</label>
              <input
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                className="w-full text-xs font-bold text-center px-2 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] mt-0.5"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={isWarmup}
                onChange={(e) => setIsWarmup(e.target.checked)}
                className="accent-[#A6D96A] w-4 h-4 rounded"
              />
              Warmup set
            </label>
            <button
              type="button"
              onClick={handleAddSet}
              className="px-3.5 py-1.5 bg-[var(--color-accent)] hover:bg-[#b8e482] text-[var(--color-accent-contrast)] rounded-xl text-xs font-bold transition-all "
            >
              + Add Set
            </button>
          </div>
        </div>

        {/* Logged Sets List with Delete */}
        <div className="space-y-1.5 mb-4">
          <span className="text-xs font-bold text-[var(--color-text-muted)] block">
            Sets in this session ({loggedSets.length})
          </span>
          {loggedSets.length === 0 ? (
            <div className="p-3 text-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-subtle)] rounded-xl border border-[var(--color-border)]">
              No sets added yet. Configure above and tap Add Set.
            </div>
          ) : (
            loggedSets.map((s, idx) => {
              const ex = availableExercises.find(e => e.id === s.exerciseId);
              return (
                <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--color-text-muted)]">#{idx + 1}</span>
                    <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[120px]">{ex?.name || 'Exercise'}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${s.isWarmup ? 'bg-[#E5B869]/10 text-[#E5B869]' : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'}`}>
                      {s.isWarmup ? 'Warmup' : 'Working'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--color-text-primary)]">{s.weight} kg × {s.reps}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSet(idx)}
                      className="text-[#D97979] hover:bg-[#D97979]/10 p-1 rounded-lg"
                      title="Remove set"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-[var(--color-border)] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[#222C24] rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={loggedSets.length === 0}
            className="flex-1 py-2.5 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-xs font-bold rounded-xl hover:bg-[#b8e482]  flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Save Workout
          </button>
        </div>
      </div>
    </div>
  );
};
