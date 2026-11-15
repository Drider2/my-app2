import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Zap, 
  Dumbbell, 
  Scale, 
  Activity, 
  FolderPlus, 
  History, 
  Plus, 
  Copy, 
  Pause, 
  Play, 
  Trash2, 
  Flame, 
  CheckCircle2,
  Sparkles,
  Calculator,
  Timer,
  Download,
  Trophy
} from 'lucide-react';
import { db, getTodayLocalDate } from '../services/storage';
import { calculateMuscleRecoveryState } from '../services/calculation';
import { GymProgramService } from '../services/gymProgramService';
import { AnatomicalBody, MuscleId, BodySide, BodyView } from '../components/AnatomicalBody';
import { WeightSnapshotGauge } from '../components/WeightSnapshotGauge';
import { WeightProgressChart } from '../components/WeightProgressChart';
import { LogWeightModal } from '../components/LogWeightModal';
import { WorkoutSessionModal } from '../components/WorkoutSessionModal';
import { TrainingProgram, ProgramTemplateType } from '../types';
import { RingProgress } from '../components/charts';
import { AccentChip } from '../components/ui';
import { 
  WeekStripCard, 
  TodayWorkoutCard, 
  ProgressSection, 
  ActivityHeatmapCard, 
  LastSessionCard,
  OneRepMaxModal,
  RestTimerModal,
  ExerciseCatalogView,
  PersonalRecordsModal,
  MuscleVolumeModal,
  MacroTargetModal
} from '../components/gym';
import { 
  StatRange, 
  WeekDayStripItem, 
  calculateWeeklyStreak, 
  generateWeekStrip, 
  computeTodayPlanState, 
  computeRangeMetrics, 
  generateActivityHeatmap, 
  compareLastSessionForExercise, 
  findDefaultComparisonExercise 
} from '../services/gymDerivedStats';
import { useTranslation } from '../services/i18n';

interface GymScreenProps {
  onRefresh: () => void;
  onBack?: () => void;
}

export const GymScreen: React.FC<GymScreenProps> = ({ onRefresh }) => {
  const { t, language } = useTranslation();
  const state = db.getState();
  const today = getTodayLocalDate();

  const weightUnit = (state.settings.weight_unit as 'kg' | 'lb') || 'kg';
  const weekStartDay = (state.settings.week_start_day ?? 1) as 0 | 1;

  // In-memory UI state (no schema changes)
  const [selectedRange, setSelectedRange] = useState<StatRange>('month');
  const [activeSecondaryTab, setActiveSecondaryTab] = useState<'recovery' | 'weight' | 'programs' | 'history' | 'exercises' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isLogWeightOpen, setIsLogWeightOpen] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);
  const [is1RMModalOpen, setIs1RMModalOpen] = useState(false);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);

  // Anatomical Body state
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId>('triceps');
  const [selectedSide, setSelectedSide] = useState<BodySide>('right');
  const [bodyView, setBodyView] = useState<BodyView>('back');

  // Program Creation State
  const [newProgName, setNewProgName] = useState('');
  const [newProgType, setNewProgType] = useState<ProgramTemplateType>('custom');
  const [newProgDays, setNewProgDays] = useState(4);
  const [newProgDuration, setNewProgDuration] = useState(60);
  const [newProgLevel, setNewProgLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [newProgEquip, setNewProgEquip] = useState<'full_gym' | 'dumbbells_only' | 'bodyweight' | 'home_gym'>('full_gym');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Active Program and templates
  const activeProgram = GymProgramService.getActiveProgram();
  const nextWorkout = GymProgramService.getNextWorkout();
  const allPrograms = GymProgramService.getAllPrograms();

  // 1. Weekly streak selector
  const weeklyStreak = useMemo(() => {
    return calculateWeeklyStreak(state.workoutSessions, activeProgram, weekStartDay, today);
  }, [state.workoutSessions, activeProgram, weekStartDay, today]);

  const totalCompletedSessions = useMemo(() => {
    return state.workoutSessions.filter(
      s => !s.deleted_at && s.ended_at !== null && s.ended_at !== undefined && s.ended_at > 0
    ).length;
  }, [state.workoutSessions]);

  // 2. 7-day week strip selector
  const weekStrip = useMemo(() => {
    return generateWeekStrip(state.workoutSessions, activeProgram, weekStartDay, today);
  }, [state.workoutSessions, activeProgram, weekStartDay, today]);

  // 3. Today's plan state machine selector
  const todayPlanState = useMemo(() => {
    return computeTodayPlanState(state.workoutSessions, activeProgram, state.bodyweightEntries, today, weightUnit);
  }, [state.workoutSessions, activeProgram, state.bodyweightEntries, today, weightUnit]);

  // 4. Progress 2x2 metric tiles selector
  const rangeStats = useMemo(() => {
    return computeRangeMetrics(
      state.workoutSessions,
      state.bodyweightEntries,
      selectedRange,
      today,
      weekStartDay,
      weightUnit
    );
  }, [state.workoutSessions, state.bodyweightEntries, selectedRange, today, weekStartDay, weightUnit]);

  // 5. Activity heatmap 18-week selector
  const heatmapData = useMemo(() => {
    return generateActivityHeatmap(state.workoutSessions, state.bodyweightEntries, 18, weekStartDay, today);
  }, [state.workoutSessions, state.bodyweightEntries, weekStartDay, today]);

  // 6. Last session comparison exercise
  const defaultEx = useMemo(() => {
    return findDefaultComparisonExercise(state.workoutSessions, activeProgram, state.exercises, today);
  }, [state.workoutSessions, activeProgram, state.exercises, today]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const activeExerciseId = selectedExerciseId || defaultEx?.id || null;
  const activeExerciseName = useMemo(() => {
    const match = state.exercises.find(e => e.id === activeExerciseId);
    return match ? match.name : defaultEx?.name || 'Exercise';
  }, [state.exercises, activeExerciseId, defaultEx]);

  const lastSessionComparison = useMemo(() => {
    if (!activeExerciseId) return null;
    return compareLastSessionForExercise(state.workoutSessions, activeExerciseId, activeExerciseName);
  }, [state.workoutSessions, activeExerciseId, activeExerciseName]);

  // Date Caption: e.g. "TODAY · 24 OCT"
  const dateCaption = useMemo(() => {
    try {
      const d = new Date();
      const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
      const monthDay = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d);
      const todayLabel = t('gym.today', 'Today').toUpperCase();
      return `${todayLabel} · ${monthDay.toUpperCase()}`;
    } catch {
      return `TODAY · ${today}`;
    }
  }, [language, t, today]);

  // Streak Label: e.g. "4 weeks"
  const streakLabel = useMemo(() => {
    if (weeklyStreak <= 0) return '';
    if (language === 'ar') {
      return weeklyStreak === 1 ? 'أسبوع واحد' : `${weeklyStreak} أسابيع`;
    }
    if (language === 'fr') {
      return `${weeklyStreak} sem.`;
    }
    return `${weeklyStreak} ${weeklyStreak === 1 ? 'week' : 'weeks'}`;
  }, [weeklyStreak, language]);

  // Week Strip Day Selection Feedback
  const handleSelectWeekDay = (day: WeekDayStripItem) => {
    const sessionsOnDay = state.workoutSessions.filter(
      s => s.local_date === day.dateStr && !s.deleted_at
    );
    if (sessionsOnDay.length > 0) {
      const names = sessionsOnDay.map(s => s.name).join(', ');
      const totalVol = sessionsOnDay.reduce((acc, s) => {
        const vol = (s.sets || []).reduce((sum, st) => sum + (st.weight_kg * st.reps), 0);
        return acc + vol;
      }, 0);
      triggerToast(`✓ ${day.dateStr}: ${names} (${totalVol.toLocaleString()} ${weightUnit})`);
    } else if (day.isToday) {
      triggerToast(`${day.dateStr}: ${t('gym.today', 'Today')}`);
    } else {
      triggerToast(`${day.dateStr}: ${t('gym.noWorkoutDay', 'No workout recorded')}`);
    }
  };

  // Anatomical Recovery math
  const testWeights = new Map<string, number>([
    ['ex-1', selectedMuscle === 'chest' ? 1.0 : selectedMuscle === 'triceps' ? 0.5 : 0],
    ['ex-2', selectedMuscle === 'shoulders' ? 1.0 : selectedMuscle === 'triceps' ? 0.5 : 0],
    ['ex-3', selectedMuscle === 'quads' ? 1.0 : selectedMuscle === 'glutes' ? 1.0 : 0],
    ['ex-4', selectedMuscle === 'lats' ? 1.0 : selectedMuscle === 'biceps' ? 0.5 : 0],
  ]);
  const recovery = calculateMuscleRecoveryState(selectedMuscle, state.workoutSessions, testWeights);

  // Bodyweight calculations
  const sortedWeights = useMemo(() => {
    return [...state.bodyweightEntries]
      .filter(b => !b.deleted_at)
      .sort((a, b) => a.local_date.localeCompare(b.local_date));
  }, [state.bodyweightEntries]);

  const latestWeightEntry = sortedWeights[sortedWeights.length - 1];
  const previousWeightEntry = sortedWeights.length > 1 ? sortedWeights[sortedWeights.length - 2] : null;
  const currentWeightKg = latestWeightEntry ? latestWeightEntry.weight_kg : 78.4;
  const previousWeightKg = previousWeightEntry ? previousWeightEntry.weight_kg : null;
  const lastWeightDate = latestWeightEntry ? latestWeightEntry.local_date : today;
  const targetWeightKg = 75.0;

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgName.trim()) return;

    GymProgramService.createProgram({
      name: newProgName.trim(),
      template_type: newProgType,
      days_per_week: newProgDays,
      scheduled_weekdays: [1, 2, 4, 5],
      experience_level: newProgLevel,
      equipment: newProgEquip,
      estimated_duration_min: newProgDuration,
      is_active: false,
      is_paused: false,
      days: [
        {
          id: `day-${Date.now()}-1`,
          name: 'Session A',
          target_muscle_groups: ['chest', 'back'],
          exercises: [
            { id: `ex-${Date.now()}-1`, exercise_id: 'ex-1', exercise_name: 'Bench Press', target_sets: 4, target_reps: '8-10', rest_seconds: 90 },
            { id: `ex-${Date.now()}-2`, exercise_id: 'ex-4', exercise_name: 'Lat Pulldowns', target_sets: 4, target_reps: '10-12', rest_seconds: 90 },
          ]
        }
      ]
    });

    setIsCreateProgramOpen(false);
    setNewProgName('');
    triggerToast('✓ Workout program created');
    onRefresh();
  };

  return (
    <div 
      className="space-y-3 px-[14px] pt-[18px] select-none"
      style={{ paddingBottom: 'calc(var(--nav-total-clearance, 80px) + 70px)' }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--text-1)] text-[var(--bg-main,#04070A)] font-medium text-[12px] shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 stroke-[3] text-[var(--accent)] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. HEADER (Date Caption, Title, Streak Bolt, Chart Button) */}
      {/* ======================================================== */}
      <header className="flex items-end justify-between pt-1 pb-1 animate-gym-card gym-stagger-1">
        <div>
          <span className="text-[12px] font-medium text-[var(--text-2)] uppercase tracking-wider block">
            {dateCaption}
          </span>
          <div className="flex items-center gap-2.5 mt-0.5">
            <h1 className="text-[22px] font-medium text-[var(--text-1)] leading-tight tracking-tight">
              {t('gym.bodyTabTitle', 'Body')}
            </h1>
            {weeklyStreak > 0 && (
              <AccentChip 
                icon={<Zap className="w-3.5 h-3.5 fill-current" />}
                className="text-[11px] py-0.5 px-2.5 font-medium shadow-[0_0_12px_rgb(var(--accent-rgb)/0.3)]"
              >
                {streakLabel}
              </AccentChip>
            )}
          </div>
        </div>

        {/* 40px Glass Circle Button (Opens secondary tools & analytics) */}
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIs1RMModalOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-cyan-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="1RM Calculator"
          title="1RM and Training Zones Calculator"
        >
          <Calculator className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">1RM Calc</span>
        </button>
        <button
          type="button"
          onClick={() => setIsRestTimerOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-cyan-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="Rest Timer"
          title="Workout Rest Interval Timer"
        >
          <Timer className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Rest Timer</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPRModalOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-amber-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="PR Wall of Fame"
          title="Personal Records & Wall of Fame"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">PR Trophies</span>
        </button>

        <button
          type="button"
          onClick={() => setIsVolumeModalOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-orange-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="Muscle Volume Radar"
          title="Weekly Muscle Volume & Hypertrophy Targets"
        >
          <Activity className="w-4 h-4 text-orange-400" />
          <span className="hidden sm:inline">Volume Radar</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMacroModalOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-orange-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="Macro & TDEE Desk"
          title="Bodyweight Macros & TDEE Energy Desk"
        >
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="hidden sm:inline">Macro Desk</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('gym-tools-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
            setActiveSecondaryTab(prev => prev ? null : 'programs');
          }}
          className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center justify-center text-[var(--text-1)] hover:text-[var(--accent-light)] tap-feedback transition-colors shrink-0 shadow-sm"
          aria-label={t('gym.fullAnalytics', 'Analytics & tools')}
        >
          <BarChart3 className="w-4 h-4 stroke-[2.2]" />
        </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. CARD 1: 7-DAY WEEK STRIP                              */}
      {/* ======================================================== */}
      <WeekStripCard
        days={weekStrip}
        onSelectDay={handleSelectWeekDay}
        className="animate-gym-card gym-stagger-2"
      />

      {/* ======================================================== */}
      {/* 3. CARD 2: TODAY'S WORKOUT CARD (5 States Handled)       */}
      {/* ======================================================== */}
      <TodayWorkoutCard
        planState={todayPlanState}
        onStartWorkout={() => setIsWorkoutModalOpen(true)}
        onResumeWorkout={() => setIsWorkoutModalOpen(true)}
        onCreatePlan={() => setIsCreateProgramOpen(true)}
        className="animate-gym-card gym-stagger-3"
      />

      {/* Clean Slate Hint (Shown only when 0 completed workouts ever) */}
      {totalCompletedSessions === 0 && (
        <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm border border-[var(--color-border)] flex items-center gap-2.5 animate-gym-card text-[12px] shadow-sm">
          <Sparkles className="w-4 h-4 text-[var(--accent-light)] shrink-0" />
          <span className="text-[var(--text-2)] font-medium">
            {t('gym.cleanStateHint', 'Your first workout will light this up')}
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. CARD 3: PROGRESS SECTION (Week | Month | Year | All)   */}
      {/* ======================================================== */}
      <ProgressSection
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        stats={rangeStats}
        onViewLog={() => {
          setActiveSecondaryTab('history');
          const el = document.getElementById('gym-tools-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        className="animate-gym-card gym-stagger-4"
      />

      {/* ======================================================== */}
      {/* 5. CARD 4: ACTIVITY HEATMAP CARD (18 Weeks Grid)          */}
      {/* ======================================================== */}
      <ActivityHeatmapCard
        grid={heatmapData.grid}
        monthLabels={heatmapData.monthLabels}
        totalWorkouts={heatmapData.totalWorkouts}
        weightUnit={weightUnit}
        onCellClick={(cell) => {
          if (cell.sessionCount > 0) {
            triggerToast(`✓ ${cell.dateStr}: ${cell.sessionCount} workout (${cell.volumeKg.toLocaleString()} ${weightUnit})`);
          } else {
            triggerToast(`${cell.dateStr}: ${t('gym.noWorkoutDay', 'No workout recorded')}`);
          }
        }}
        className="animate-gym-card gym-stagger-5"
      />

      {/* ======================================================== */}
      {/* 6. CARD 5: LAST SESSION COMPARISON (Set | Prev | Now)     */}
      {/* ======================================================== */}
      <LastSessionCard
        comparison={lastSessionComparison}
        allExercises={state.exercises}
        onSelectExercise={(id) => setSelectedExerciseId(id)}
        weightUnit={weightUnit}
        className="animate-gym-card gym-stagger-6"
      />

      {/* ======================================================== */}
      {/* 7. SECONDARY TOOLS SECTION (Retains all existing features)*/}
      {/* ======================================================== */}
      <section id="gym-tools-section" className="pt-3 space-y-3" aria-label="Gym Extended Tools">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-medium text-[var(--text-3)] uppercase tracking-wider">
            {t('gym.fullAnalytics', 'Tools & Management')}
          </span>
          {activeSecondaryTab && (
            <button
              type="button"
              onClick={() => setActiveSecondaryTab(null)}
              className="text-[12px] font-medium text-[var(--accent-light)] hover:underline tap-feedback"
            >
              {t('common.close', 'Close')}
            </button>
          )}
        </div>

        {/* Secondary Navigation Pills */}
        <div className="grid grid-cols-5 p-1 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] gap-1">
          <button
            type="button"
            onClick={() => setActiveSecondaryTab(prev => prev === 'recovery' ? null : 'recovery')}
            className={`py-2 px-1 text-[12px] font-medium rounded-xl flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all tap-feedback ${
              activeSecondaryTab === 'recovery'
                ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.45)]'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Recovery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSecondaryTab(prev => prev === 'weight' ? null : 'weight')}
            className={`py-2 px-1 text-[12px] font-medium rounded-xl flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all tap-feedback ${
              activeSecondaryTab === 'weight'
                ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.45)]'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            <Scale className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Weight</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSecondaryTab(prev => prev === 'programs' ? null : 'programs')}
            className={`py-2 px-1 text-[12px] font-medium rounded-xl flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all tap-feedback ${
              activeSecondaryTab === 'programs'
                ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.45)]'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Programs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSecondaryTab(prev => prev === 'history' ? null : 'history')}
            className={`py-2 px-1 text-[12px] font-medium rounded-xl flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all tap-feedback ${
              activeSecondaryTab === 'history'
                ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.45)]'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">History</span>
          </button>
                  <button
            type="button"
            onClick={() => setActiveSecondaryTab(prev => prev === 'exercises' ? null : 'exercises')}
            className={`py-2 px-1 text-[12px] font-medium rounded-xl flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all tap-feedback ${
              activeSecondaryTab === 'exercises'
                ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.45)]'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Catalog</span>
          </button>
        </div>

        {/* 7.1. RECOVERY ANATOMICAL TOOL */}
        {activeSecondaryTab === 'recovery' && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm rounded-3xl p-4 border border-[var(--color-border)] relative overflow-hidden">
              <AnatomicalBody
                selectedMuscle={selectedMuscle}
                selectedSide={selectedSide}
                view={bodyView}
                onSelect={(m, s) => {
                  setSelectedMuscle(m);
                  if (s) setSelectedSide(s);
                }}
                onToggleView={() => setBodyView(bodyView === 'front' ? 'back' : 'front')}
              />

              <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-center">
                <div className="inline-flex rounded-xl bg-white/[0.04] p-1 border border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setSelectedSide('left')}
                    className={`px-5 py-1 rounded-lg text-[12px] font-medium transition-all tap-feedback ${
                      selectedSide === 'left'
                        ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.4)]'
                        : 'text-[var(--text-2)]'
                    }`}
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSide('right')}
                    className={`px-5 py-1 rounded-lg text-[12px] font-medium transition-all tap-feedback ${
                      selectedSide === 'right'
                        ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.4)]'
                        : 'text-[var(--text-2)]'
                    }`}
                  >
                    Right
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm rounded-2xl p-4 border border-[var(--color-border)] space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-[var(--text-1)] capitalize">{selectedMuscle}</span>
                <span className="text-[var(--accent-light)] capitalize">{recovery.state.replace('_', ' ')}</span>
              </div>
              <p className="text-[12px] text-[var(--text-3)]">
                {recovery.hoursSince !== null ? `${recovery.hoursSince.toFixed(0)} hours since trained` : 'No recent workout'}
              </p>
            </div>
          </div>
        )}

        {/* 7.2. WEIGHT SNAPSHOT & CHART */}
        {activeSecondaryTab === 'weight' && (
          <div className="space-y-3 animate-fade-in">
            <WeightSnapshotGauge
              currentWeight={currentWeightKg}
              previousWeight={previousWeightKg}
              lastDate={lastWeightDate}
              targetWeight={targetWeightKg}
              onOpenLogModal={() => setIsLogWeightOpen(true)}
            />

            <WeightProgressChart
              entries={state.bodyweightEntries}
              onOpenLogModal={() => setIsLogWeightOpen(true)}
            />

            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm rounded-2xl p-4 border border-[var(--color-border)] space-y-2">
              <div className="flex items-center justify-between text-[12px] border-b border-[var(--color-border)] pb-2">
                <span className="font-medium text-[var(--text-1)]">Recent Logs</span>
                <span className="text-[var(--text-3)]">{sortedWeights.length} entries</span>
              </div>
              <div className="space-y-1.5">
                {sortedWeights.slice(-5).reverse().map((entry) => (
                  <div key={entry.id} className="p-2.5 rounded-xl bg-white/[0.03] border border-[var(--color-border)] flex items-center justify-between text-[12px]">
                    <span className="text-[var(--text-2)]">{entry.local_date}</span>
                    <span className="font-medium text-[var(--accent-light)]">{entry.weight_kg} kg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7.3. TRAINING PROGRAMS */}
        {activeSecondaryTab === 'programs' && (
          <div className="space-y-3 animate-fade-in">
            {activeProgram && (
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm rounded-3xl p-5 border border-[var(--color-border)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[var(--accent-light)]" />
                    <span className="text-[12px] font-medium text-[var(--text-1)]">
                      {t('gym.activeProgram', 'Active Program')}
                    </span>
                  </div>
                  <AccentChip className="text-[11px] py-0.5 px-2">
                    Active
                  </AccentChip>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[16px] font-medium text-[var(--text-1)]">{activeProgram.name}</h3>
                    <p className="text-[12px] text-[var(--text-2)] mt-0.5">
                      {activeProgram.days_per_week} days/wk · {activeProgram.estimated_duration_min} min · {activeProgram.experience_level}
                    </p>
                  </div>
                  <RingProgress
                    value={activeProgram.days_per_week}
                    max={activeProgram.days_per_week}
                    size={58}
                    strokeWidth={5}
                    label={`${activeProgram.days_per_week}d`}
                    sublabel="split"
                    pulseOnMax={false}
                  />
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] flex items-center justify-between text-[12px]">
                  <div>
                    <span className="text-[var(--text-3)] block">Next in split:</span>
                    <span className="font-medium text-[var(--accent-light)]">{nextWorkout.dayName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWorkoutModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-light))] text-[var(--on-accent)] font-medium text-[12px] tap-feedback"
                  >
                    Start Workout
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-medium text-[var(--text-1)]">
                Available Programs
              </span>
              <button
                type="button"
                onClick={() => setIsCreateProgramOpen(true)}
                className="text-[12px] font-medium text-[var(--accent-light)] flex items-center gap-1 hover:underline tap-feedback"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Create Custom</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {allPrograms.map(prog => {
                const isActive = prog.id === state.activeProgramId;
                return (
                  <div 
                    key={prog.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive 
                        ? 'bg-[rgb(var(--accent-rgb)/0.12)] border-[rgb(var(--accent-rgb)/0.4)]' 
                        : 'bg-white/[0.03] border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-[14px] font-medium text-[var(--text-1)]">{prog.name}</h4>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-[var(--accent)] text-[var(--on-accent)]">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[var(--text-3)] mt-0.5">
                          {prog.days_per_week} days/wk · {prog.estimated_duration_min} min · {prog.equipment.replace('_', ' ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            GymProgramService.duplicateProgram(prog.id);
                            onRefresh();
                          }}
                          className="p-1.5 rounded-lg bg-white/[0.05] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--color-border)]"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            GymProgramService.togglePauseProgram(prog.id);
                            onRefresh();
                          }}
                          className="p-1.5 rounded-lg bg-white/[0.05] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--color-border)]"
                          title={prog.is_paused ? 'Resume' : 'Pause'}
                        >
                          {prog.is_paused ? <Play className="w-3.5 h-3.5 text-[var(--accent-light)]" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>

                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              GymProgramService.setActiveProgram(prog.id);
                              onRefresh();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-[var(--accent)] text-[var(--accent-light)] hover:text-[var(--on-accent)] border border-[var(--color-border)] text-[12px] font-medium transition-all tap-feedback"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7.4. SESSION HISTORY LOG */}
        {activeSecondaryTab === 'history' && (
          <div className="space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-3)]">
                Recorded Sessions ({state.workoutSessions.filter(s => !s.deleted_at).length})
              </span>
              <button
                type="button"
                onClick={() => setIsWorkoutModalOpen(true)}
                className="text-[12px] text-[var(--accent-light)] font-medium flex items-center gap-1 tap-feedback"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New</span>
              </button>
            </div>

            {state.workoutSessions.filter(s => !s.deleted_at).length === 0 ? (
              <div className="p-8 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm text-center space-y-2 border border-[var(--color-border)]">
                <Dumbbell className="w-8 h-8 text-[var(--text-3)] mx-auto" />
                <h4 className="text-[14px] font-medium text-[var(--text-1)]">No Sessions Yet</h4>
                <p className="text-[12px] text-[var(--text-3)]">Start a workout above to record your first set.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {state.workoutSessions
                  .filter(s => !s.deleted_at)
                  .sort((a, b) => b.started_at - a.started_at)
                  .map((session) => {
                    const totalSessionVolume = (session.sets || []).reduce((sum, s) => sum + (s.weight_kg * s.reps), 0);
                    return (
                      <div
                        key={session.id}
                        className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm border border-[var(--color-border)] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-[13px] font-medium text-[var(--text-1)]">{session.name}</h4>
                            <span className="text-[11px] text-[var(--text-3)] font-mono">{session.local_date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-[var(--accent-light)] px-2 py-0.5 rounded-full bg-[rgb(var(--accent-rgb)/0.12)] border border-[rgb(var(--accent-rgb)/0.3)]">
                              {session.sets?.length || 0} sets
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete session "${session.name}"?`)) {
                                  db.updateState(draft => {
                                    const sess = draft.workoutSessions.find(s => s.id === session.id);
                                    if (sess) sess.deleted_at = Date.now();
                                  });
                                  onRefresh();
                                }
                              }}
                              className="p-1 rounded-lg text-white/50 hover:text-white"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[var(--text-3)]">
                          <span>Volume: <strong className="text-[var(--text-1)]">{totalSessionVolume.toLocaleString()} {weightUnit}</strong></span>
                          {session.notes && <span className="italic truncate max-w-[150px]">{session.notes}</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}


          </div>
        )}
      
        {/* 7.5. EXERCISE CATALOG & SEARCH */}
        {activeSecondaryTab === 'exercises' && (
          <ExerciseCatalogView
            exercises={state.exercises}
            workoutSessions={state.workoutSessions}
            weightUnit={weightUnit}
            onOpen1RM={(exerciseName) => {
              setIs1RMModalOpen(true);
            }}
            onRefresh={onRefresh}
          />
        )}
      </section>

      {/* Modals */}
      <LogWeightModal
        isOpen={isLogWeightOpen}
        onClose={() => setIsLogWeightOpen(false)}
        onSaved={onRefresh}
        currentLatestWeight={currentWeightKg}
      />

      <WorkoutSessionModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        onSaved={onRefresh}
      />

      {/* Create Custom Program Modal */}
      {isCreateProgramOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60  animate-fade-in p-2 sm:p-4">
          <form 
            onSubmit={handleCreateProgram}
            className="w-full max-w-md bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm rounded-3xl p-5 border border-[var(--color-border)] space-y-3"
          >
            <h3 className="text-[15px] font-medium text-[var(--text-1)]">Create Workout Program</h3>

            <div>
              <label className="text-[12px] text-[var(--text-2)]">Program Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Hypertrophy 4-Day, Strength Split"
                value={newProgName}
                onChange={(e) => setNewProgName(e.target.value)}
                className="w-full text-[13px] font-medium px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white/[0.04] text-[var(--text-1)] mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] text-[var(--text-2)]">Days per Week</label>
                <input
                  type="number"
                  min="2"
                  max="7"
                  value={newProgDays}
                  onChange={(e) => setNewProgDays(Number(e.target.value) || 4)}
                  className="w-full text-[13px] font-medium px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white/[0.04] text-[var(--text-1)] mt-1"
                />
              </div>
              <div>
                <label className="text-[12px] text-[var(--text-2)]">Duration (min)</label>
                <input
                  type="number"
                  step="5"
                  value={newProgDuration}
                  onChange={(e) => setNewProgDuration(Number(e.target.value) || 60)}
                  className="w-full text-[13px] font-medium px-3 py-2 rounded-xl border border-[var(--color-border)] bg-white/[0.04] text-[var(--text-1)] mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] text-[var(--text-2)]">Experience</label>
                <select
                  value={newProgLevel}
                  onChange={(e) => setNewProgLevel(e.target.value as any)}
                  className="w-full text-[12px] px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-white/[0.04] text-[var(--text-1)] mt-1"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] text-[var(--text-2)]">Equipment</label>
                <select
                  value={newProgEquip}
                  onChange={(e) => setNewProgEquip(e.target.value as any)}
                  className="w-full text-[12px] px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-white/[0.04] text-[var(--text-1)] mt-1"
                >
                  <option value="full_gym">Full Gym</option>
                  <option value="dumbbells_only">Dumbbells Only</option>
                  <option value="home_gym">Home Gym</option>
                  <option value="bodyweight">Bodyweight</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateProgramOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-[var(--text-2)] text-[12px] font-medium tap-feedback"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-light))] text-[var(--on-accent)] text-[12px] font-medium tap-feedback"
              >
                Create Program
              </button>
            </div>
          </form>
        </div>
      )}
    
      {/* 1RM & Training Zones Calculator Modal */}
      <OneRepMaxModal
        isOpen={is1RMModalOpen}
        onClose={() => setIs1RMModalOpen(false)}
        defaultUnit={weightUnit}
      />

      {/* Interval Rest Timer Modal */}
      <RestTimerModal
        isOpen={isRestTimerOpen}
        onClose={() => setIsRestTimerOpen(false)}
      />

      <PersonalRecordsModal
        isOpen={isPRModalOpen}
        onClose={() => setIsPRModalOpen(false)}
        exercises={state.exercises}
        workoutSessions={state.workoutSessions}
        weightUnit={weightUnit}
      />

      {/* Weekly Muscle Volume & Hypertrophy Targets Modal */}
      <MuscleVolumeModal
        isOpen={isVolumeModalOpen}
        onClose={() => setIsVolumeModalOpen(false)}
        onShowToast={triggerToast}
      />

      {/* Bodyweight Macros & TDEE Energy Desk Modal */}
      <MacroTargetModal
        isOpen={isMacroModalOpen}
        onClose={() => setIsMacroModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />
</div>
  );
};

export default GymScreen;

