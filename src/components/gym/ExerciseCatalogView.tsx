import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Dumbbell, 
  Filter, 
  Award, 
  Sparkles, 
  Calculator, 
  X, 
  Check, 
  Flame,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { Exercise, WorkoutSession, ExerciseMuscle } from '../../types';
import { db, generateUUID } from '../../services/storage';
import { Haptics } from '../../services/haptics';

interface ExerciseCatalogViewProps {
  exercises: Exercise[];
  workoutSessions: WorkoutSession[];
  weightUnit: 'kg' | 'lb';
  onOpen1RM: (exerciseName: string, defaultWeight?: number, defaultReps?: number) => void;
  onRefresh: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
  { id: 'cardio', label: 'Cardio' },
] as const;

const MUSCLE_OPTIONS = [
  'chest', 'lats', 'traps', 'lower_back', 
  'quads', 'hamstrings', 'glutes', 'calves', 
  'front_delts', 'side_delts', 'rear_delts', 
  'biceps', 'triceps', 'forearms', 
  'abs', 'obliques'
];

export const ExerciseCatalogView: React.FC<ExerciseCatalogViewProps> = ({
  exercises,
  workoutSessions,
  weightUnit,
  onOpen1RM,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Exercise Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<Exercise['category']>('chest');
  const [newPrimaryMuscle, setNewPrimaryMuscle] = useState('chest');
  const [newSecondaryMuscle, setNewSecondaryMuscle] = useState('');

  // Collect all sets from completed workouts
  const allSets = useMemo(() => {
    const sets = [];
    for (const s of workoutSessions) {
      if (!s.deleted_at && s.sets && s.sets.length > 0) {
        for (const set of s.sets) {
          if (!set.deleted_at) {
            sets.push(set);
          }
        }
      }
    }
    return sets;
  }, [workoutSessions]);

  // Compute stats per exercise
  const exerciseStatsMap = useMemo(() => {
    const map = new Map<string, {
      totalSets: number;
      bestWeightKg: number;
      bestReps: number;
      bestEst1RMKg: number;
      lastTrainedDate: string | null;
    }>();

    for (const ex of exercises) {
      const exSets = allSets.filter(s => s.exercise_id === ex.id && !s.is_warmup);
      let bestWeight = 0;
      let bestReps = 0;
      let bestEst1RM = 0;

      for (const s of exSets) {
        if (s.weight_kg > bestWeight || (s.weight_kg === bestWeight && s.reps > bestReps)) {
          bestWeight = s.weight_kg;
          bestReps = s.reps;
        }
        const est = s.reps <= 1 ? s.weight_kg : Math.round(s.weight_kg * (1 + Math.min(s.reps, 12) / 30));
        if (est > bestEst1RM) {
          bestEst1RM = est;
        }
      }

      // Find last trained date
      let lastDate: string | null = null;
      for (let i = workoutSessions.length - 1; i >= 0; i--) {
        const sess = workoutSessions[i];
        if (!sess.deleted_at && sess.sets?.some(s => s.exercise_id === ex.id)) {
          lastDate = sess.local_date;
          break;
        }
      }

      map.set(ex.id, {
        totalSets: exSets.length,
        bestWeightKg: bestWeight,
        bestReps: bestReps,
        bestEst1RMKg: bestEst1RM,
        lastTrainedDate: lastDate,
      });
    }

    return map;
  }, [exercises, allSets, workoutSessions]);

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return exercises.filter(ex => {
      if (ex.deleted_at) return false;
      const matchesCat = selectedCategory === 'all' || ex.category === selectedCategory;
      const matchesQuery = !q || 
        ex.name.toLowerCase().includes(q) || 
        ex.category.toLowerCase().includes(q) ||
        ex.muscles?.some(m => m.muscle_id.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [exercises, selectedCategory, searchQuery]);

  const handleCreateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    Haptics.tick();
    const muscles: ExerciseMuscle[] = [
      { muscle_id: newPrimaryMuscle, role: 'primary', weight: 1.0 }
    ];
    if (newSecondaryMuscle && newSecondaryMuscle !== newPrimaryMuscle) {
      muscles.push({ muscle_id: newSecondaryMuscle, role: 'secondary', weight: 0.5 });
    }

    const newEx: Exercise = {
      id: generateUUID(),
      name: newName.trim(),
      category: newCategory,
      muscles,
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(draft => {
      draft.exercises.push(newEx);
    });

    setNewName('');
    setIsAddModalOpen(false);
    onRefresh();
    Haptics.success();
  };

  const formatWeight = (kg: number) => {
    if (weightUnit === 'lb') {
      return `${Math.round(kg * 2.20462)} lb`;
    }
    return `${kg} kg`;
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'chest':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'back':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'legs':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'shoulders':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'arms':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'core':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="card-premium p-5 space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header with Search and Add Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Exercise Library
            </h3>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              {exercises.length} movements cataloged • PR & 1RM tracking
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold hover:brightness-110 transition-all tap-feedback shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Exercise</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by exercise name or target muscle..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Muscle Group Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              Haptics.tick();
              setSelectedCategory(cat.id);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all tap-feedback ${
              selectedCategory === cat.id
                ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
                : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Exercises List */}
      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {filteredExercises.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-2">
            <Dumbbell className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-50" />
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
              No exercises match "{searchQuery}"
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs text-[var(--color-accent)] hover:underline font-semibold"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredExercises.map(ex => {
            const stats = exerciseStatsMap.get(ex.id);
            const hasPR = stats && stats.bestWeightKg > 0;

            return (
              <div
                key={ex.id}
                className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                        {ex.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getCategoryBadgeClass(ex.category)}`}>
                        {ex.category}
                      </span>
                    </div>

                    {/* Muscles targeted */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[var(--color-text-muted)]">
                      <span className="text-[var(--color-text-secondary)]">Target:</span>
                      {ex.muscles?.map(m => (
                        <span 
                          key={m.muscle_id}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            m.role === 'primary' 
                              ? 'bg-emerald-500/10 text-emerald-400 font-semibold' 
                              : 'bg-white/[0.04] text-[var(--color-text-muted)]'
                          }`}
                        >
                          {m.muscle_id.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 1RM Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      Haptics.tick();
                      onOpen1RM(ex.name, stats?.bestWeightKg, stats?.bestReps);
                    }}
                    className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all tap-feedback shrink-0 flex items-center gap-1 text-[11px] font-semibold"
                    title="Calculate 1RM for this exercise"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">1RM</span>
                  </button>
                </div>

                {/* Performance stats banner */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-[11px]">
                  <div className="flex items-center gap-3">
                    {hasPR ? (
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Award className="w-3.5 h-3.5" />
                        <span>Best: {formatWeight(stats.bestWeightKg)} × {stats.bestReps}</span>
                        {stats.bestEst1RMKg > 0 && (
                          <span className="text-[10px] text-[var(--color-text-muted)] font-normal">
                            (~{formatWeight(stats.bestEst1RMKg)} 1RM)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">No sets logged yet</span>
                    )}
                  </div>

                  <div className="text-[var(--color-text-muted)]">
                    {stats?.totalSets || 0} sets logged
                    {stats?.lastTrainedDate && (
                      <span className="ml-1 text-[10px] opacity-75">
                        • {stats.lastTrainedDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Exercise Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60  animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Add Custom Exercise
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

            <form onSubmit={handleCreateExercise} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                  Exercise Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Incline Dumbbell Press, Romanian Deadlift"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="chest">Chest</option>
                    <option value="back">Back</option>
                    <option value="legs">Legs</option>
                    <option value="shoulders">Shoulders</option>
                    <option value="arms">Arms</option>
                    <option value="core">Core</option>
                    <option value="cardio">Cardio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                    Primary Muscle
                  </label>
                  <select
                    value={newPrimaryMuscle}
                    onChange={(e) => setNewPrimaryMuscle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  >
                    {MUSCLE_OPTIONS.map(m => (
                      <option key={m} value={m}>{m.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                  Secondary Muscle (Optional)
                </label>
                <select
                  value={newSecondaryMuscle}
                  onChange={(e) => setNewSecondaryMuscle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="">None</option>
                  {MUSCLE_OPTIONS.map(m => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
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
                  disabled={!newName.trim()}
                  className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  Add Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
