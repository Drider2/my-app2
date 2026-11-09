import React, { useState } from 'react';
import { 
  Dumbbell, 
  Activity, 
  Calendar, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Scale, 
  BarChart3, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  RotateCcw,
  Flame,
  Award
} from 'lucide-react';
import { db, getTodayLocalDate } from '../../services/storage';
import { GymProgramService } from '../../services/gymProgramService';
import { calculateMuscleRecoveryState } from '../../services/calculation';
import { ModuleWidgetConfig } from '../../types';
import { AnatomicalBody, MuscleId, BodySide, BodyView } from '../AnatomicalBody';
import { WeightSnapshotGauge } from '../WeightSnapshotGauge';
import { WeightProgressChart } from '../WeightProgressChart';
import { CircularProgressRing, HorizontalProgressBar, CurvedLineChart } from '../charts';

interface GymWidgetRendererProps {
  widget: ModuleWidgetConfig;
  onRefresh: () => void;
  onOpenWorkoutModal?: () => void;
  onOpenLogWeightModal?: () => void;
  onOpenCreateProgramModal?: () => void;
  triggerToast?: (msg: string) => void;
}

export const GymWidgetRenderer: React.FC<GymWidgetRendererProps> = ({
  widget,
  onRefresh,
  onOpenWorkoutModal,
  onOpenLogWeightModal,
  onOpenCreateProgramModal,
  triggerToast = () => {},
}) => {
  const state = db.getState();
  const today = getTodayLocalDate();

  const activeProgram = GymProgramService.getActiveProgram();
  const nextWorkout = GymProgramService.getNextWorkout();
  const allPrograms = GymProgramService.getAllPrograms();

  const weightEntries = (state.bodyweightEntries || []).filter(b => !b.deleted_at);
  const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight_kg : 78.5;
  const prevWeight = weightEntries.length > 1 ? weightEntries[weightEntries.length - 2].weight_kg : null;

  // Anatomical body state
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId>('triceps');
  const [selectedSide, setSelectedSide] = useState<BodySide>('right');
  const [bodyView, setBodyView] = useState<BodyView>('back');

  // Exercise category tab for exercise list widget
  const [exerciseTab, setExerciseTab] = useState<'chest' | 'back' | 'legs' | 'shoulders' | 'arms'>('chest');

  const muscleExerciseMap: Record<string, { name: string; exercises: string[]; region: string }> = {
    chest: { name: 'Chest (Pectorals)', exercises: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Push-ups'], region: 'Upper Body' },
    shoulders: { name: 'Shoulders (Deltoids)', exercises: ['Overhead Barbell Press', 'Lateral Raises', 'Face Pulls'], region: 'Upper Body' },
    biceps: { name: 'Biceps Brachii', exercises: ['Barbell Curls', 'Hammer Curls', 'Chin-ups'], region: 'Upper Body' },
    triceps: { name: 'Triceps Brachii', exercises: ['Barbell Bench Press', 'Overhead Press', 'Triceps Dips'], region: 'Upper Body' },
    back: { name: 'Upper & Middle Back', exercises: ['Lat Pulldowns', 'Pull-ups', 'Barbell Rows'], region: 'Upper Body' },
    legs: { name: 'Quadriceps & Glutes', exercises: ['Barbell Squats', 'Leg Press', 'Romanian Deadlifts'], region: 'Lower Body' },
  };

  switch (widget.widgetType) {
    // 1. Active Training Program
    case 'gym_active_program':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Active Routine
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {activeProgram ? activeProgram.name : 'No Active Program'}
                </h3>
              </div>
            </div>
            {onOpenCreateProgramModal && (
              <button
                onClick={onOpenCreateProgramModal}
                className="text-xs text-[var(--color-accent)] font-semibold hover:underline"
              >
                + New Program
              </button>
            )}
          </div>

          {activeProgram && (
            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs">
              <div>
                <span className="text-xs text-[var(--color-text-secondary)] font-semibold">Frequency</span>
                <div className="font-bold text-[var(--color-text-primary)]">
                  {activeProgram.days_per_week} Days / Week
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--color-text-secondary)] font-semibold">Split</span>
                <div className="font-bold text-[var(--color-accent)] capitalize">
                  {activeProgram.template_type.replace('_', ' ')}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    // 2. Today's Workout
    case 'gym_today_workout':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Workout Session
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {nextWorkout?.dayName || "Today's Training Session"}
                </h3>
              </div>
            </div>
            {onOpenWorkoutModal && (
              <button
                onClick={onOpenWorkoutModal}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold shadow-sm tap-feedback flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start</span>
              </button>
            )}
          </div>

          {nextWorkout ? (
            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">Targeted Muscles:</span>
                <span className="font-bold text-[var(--color-text-primary)] capitalize">
                  {nextWorkout.targetMuscles.join(', ')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">Exercises:</span>
                <span className="font-semibold text-[var(--color-accent)]">
                  {nextWorkout.exercisesCount} planned
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Rest day or no workout scheduled for today. Focus on recovery and nutrition.
            </p>
          )}
        </div>
      );

    // 3. Weekly Workout Schedule
    case 'gym_weekly_schedule': {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const scheduledDays = activeProgram?.scheduled_weekdays || [1, 2, 4, 5]; // 1 = Mon

      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Weekly Training Schedule
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {scheduledDays.length} sessions/wk
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {days.map((dayName, idx) => {
              const dayNum = idx + 1; // 1 = Mon ... 7 = Sun
              const isScheduled = scheduledDays.includes(dayNum);
              return (
                <div
                  key={dayName}
                  className={`p-2 rounded-xl border text-center flex flex-col items-center justify-between min-h-[58px] ${
                    isScheduled
                      ? 'bg-[var(--color-surface)] border-[var(--color-accent)] text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-surface)]/40 border-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}
                >
                  <span className="text-xs font-semibold">{dayName}</span>
                  {isScheduled ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] mt-1" />
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)] mt-1">Rest</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 4. Training Progress & Recovery (Anatomical Body)
    case 'gym_training_progress':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Hypertrophy & Fatigue
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Muscle Recovery Map
                </h3>
              </div>
            </div>
            <button
              onClick={() => setBodyView(v => v === 'front' ? 'back' : 'front')}
              className="px-2.5 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] tap-feedback capitalize"
            >
              Flip: {bodyView}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
            <div className="w-40 h-56 flex items-center justify-center">
              <AnatomicalBody
                view={bodyView}
                selectedMuscle={selectedMuscle}
                selectedSide={selectedSide}
                onSelect={(m, s) => {
                  setSelectedMuscle(m);
                  if (s) setSelectedSide(s);
                }}
                onToggleView={() => setBodyView(v => v === 'front' ? 'back' : 'front')}
              />
            </div>
            <div className="flex-1 w-full space-y-2">
              <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] block">
                  Inspected Group
                </span>
                <div className="text-sm font-bold text-[var(--color-text-primary)] capitalize">
                  {selectedMuscle} ({selectedSide})
                </div>
                <p className="text-xs text-[var(--color-positive)] font-medium mt-1">
                  ✓ Fully Recovered (Ready for hypertrophy)
                </p>
              </div>
            </div>
          </div>
        </div>
      );

    // 5. Exercise List
    case 'gym_exercise_list': {
      const activeGroup = muscleExerciseMap[exerciseTab] || muscleExerciseMap.chest;
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Dumbbell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Exercise Library
              </h3>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {(['chest', 'back', 'legs', 'shoulders', 'arms'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setExerciseTab(tab)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                  exerciseTab === tab
                    ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {activeGroup.exercises.map(ex => (
              <div key={ex} className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-text-primary)]">{ex}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{activeGroup.region}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 6. Workout History
    case 'gym_workout_history': {
      const recentSessions = (state.workoutSessions || []).filter(s => !s.deleted_at).slice(0, 4);
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Workout History
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">{recentSessions.length} logs</span>
          </div>

          <div className="space-y-2">
            {recentSessions.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] py-3 text-center">
                No recorded sessions yet. Start your first workout!
              </p>
            ) : (
              recentSessions.map(s => (
                <div key={s.id} className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[var(--color-text-primary)]">{s.name || 'Gym Session'}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{s.local_date} • {s.ended_at ? `${Math.round((s.ended_at - s.started_at) / 60000)} min` : '55 min'}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[var(--color-positive)]">Completed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // 7. Body Weight Tracking
    case 'gym_body_weight':
      return (
        <WeightSnapshotGauge
          currentWeight={latestWeight}
          previousWeight={prevWeight}
          onOpenLogModal={onOpenLogWeightModal || (() => {})}
        />
      );

    // 8. Body Measurements
    case 'gym_body_measurements':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Body Circumferences
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Chest</span>
              <div className="font-black text-[var(--color-text-primary)] text-sm">104 cm</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Arms</span>
              <div className="font-black text-[var(--color-text-primary)] text-sm">38.5 cm</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Waist</span>
              <div className="font-black text-[var(--color-text-primary)] text-sm">82 cm</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Thighs</span>
              <div className="font-black text-[var(--color-text-primary)] text-sm">60 cm</div>
            </div>
          </div>
        </div>
      );

    // 9. Weekly Training Frequency
    case 'gym_weekly_frequency': {
      const target = activeProgram?.days_per_week || 4;
      const completedThisWeek = 3;
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-text-secondary)]">
              Training Frequency
            </span>
            <div className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[var(--color-text-primary)]">{completedThisWeek}</span>
            <span className="text-xs text-[var(--color-text-secondary)]">/ {target} sessions this week</span>
          </div>
          <HorizontalProgressBar value={completedThisWeek} max={target} color="var(--color-accent)" height={5} />
        </div>
      );
    }

    // 10. Personal Records (PRs)
    case 'gym_personal_records':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Personal Records (PRs)
              </h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="font-semibold text-[var(--color-text-primary)]">Barbell Bench Press</span>
              <span className="font-black text-[var(--color-accent)]">100 kg</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="font-semibold text-[var(--color-text-primary)]">Barbell Squat</span>
              <span className="font-black text-[var(--color-accent)]">130 kg</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="font-semibold text-[var(--color-text-primary)]">Deadlift</span>
              <span className="font-black text-[var(--color-accent)]">150 kg</span>
            </div>
          </div>
        </div>
      );

    // 11. Rest Days
    case 'gym_rest_days':
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-text-secondary)]">
              Recovery Status
            </span>
            <div className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-positive)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-[var(--color-text-primary)]">
            Active Rest & CNS Recovery
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Prioritize 8+ hours sleep and 1.8g/kg protein intake for muscle repair.
          </p>
        </div>
      );

    // 12. Training Statistics
    case 'gym_training_stats':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Training Statistics
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Completed Workouts</span>
              <div className="font-black text-[var(--color-text-primary)] text-sm">42 sessions</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Consistency Streak</span>
              <div className="font-black text-[var(--color-positive)] text-sm">5 weeks</div>
            </div>
          </div>
        </div>
      );

    // 13. Weight Progress Chart
    case 'gym_weight_chart':
      return (
        <WeightProgressChart
          entries={weightEntries}
          onOpenLogModal={onOpenLogWeightModal || (() => {})}
        />
      );

    default:
      return null;
  }
};
