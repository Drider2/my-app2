// ========================================================
// Gym & Body Derived Statistics Service (gymDerivedStats.ts)
// Pure, deterministic, memoized selectors for GreenDream Body tab
// ========================================================

import { 
  WorkoutSession, 
  SetEntry, 
  BodyweightEntry, 
  TrainingProgram, 
  Exercise 
} from '../types';

export type StatRange = 'week' | 'month' | 'year' | 'all';

export interface DateRangeBoundaries {
  startLocalDate: string;
  endLocalDate: string;
}

export interface DeltaChipInfo {
  type: 'new' | 'percent' | 'absolute';
  label: string;
  isPositive: boolean;
  value?: number;
}

export interface MetricTileData {
  value: number;
  formattedValue: string;
  unit?: string;
  delta: DeltaChipInfo | null;
}

export interface RangeDerivedStats {
  volume: MetricTileData;
  workoutCount: MetricTileData;
  totalTime: MetricTileData;
  records: MetricTileData;
}

export interface WeekDayStripItem {
  dateStr: string;
  dayNumber: number;
  dayLetter: string;
  isDone: boolean;
  isToday: boolean;
  isPlanned: boolean;
  isFuture: boolean;
}

export type TodayPlanState = 
  | { state: 'scheduled'; planName: string; subtitle: string; exerciseCount: number; estimatedDuration?: number }
  | { state: 'done'; sessionName: string; setsCount: number; volumeFormatted: string }
  | { state: 'in_progress'; session: WorkoutSession; elapsedMinutes: number }
  | { state: 'rest'; nextWorkoutName: string; nextWeekday: string }
  | { state: 'none' };

export interface HeatmapCell {
  dateStr: string;
  level: 0 | 1 | 2 | 3 | 4;
  volumeKg: number;
  workoutName?: string;
  sessionCount: number;
}

export interface SetComparisonRow {
  setIndex: number;
  previous: { weight: number; reps: number } | null;
  current: { weight: number; reps: number } | null;
}

export interface ExerciseSessionComparison {
  hasComparison: boolean;
  exerciseName: string;
  currentDate: string;
  comparisonRows: SetComparisonRow[];
  increased: boolean;
  e1RMChangePercent: number;
  bestE1RMCurrent: number;
  bestE1RMPrevious: number;
}

// ========================================================
// 1. Local Calendar Math (DST & Timezone Safe)
// ========================================================

export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateStr(str: string): Date {
  const parts = str.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  return new Date(year, month, day, 12, 0, 0, 0); // Noon anchor prevents DST shifts
}

export function addCalendarDays(dateStr: string, days: number): string {
  const d = parseLocalDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

export function getRangeBoundaries(
  range: StatRange, 
  anchorDateStr: string, 
  weekStartDay: 0 | 1 = 1
): DateRangeBoundaries {
  const anchor = parseLocalDateStr(anchorDateStr);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  if (range === 'week') {
    // 0 = Sun, 1 = Mon
    const currentDay = anchor.getDay(); // 0 is Sun, 1 is Mon...
    const diff = weekStartDay === 1
      ? (currentDay + 6) % 7 // Mon = 0, Sun = 6
      : currentDay; // Sun = 0, Sat = 6

    const start = new Date(anchor);
    start.setDate(anchor.getDate() - diff);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
      startLocalDate: toLocalDateStr(start),
      endLocalDate: toLocalDateStr(end),
    };
  }

  if (range === 'month') {
    const start = new Date(year, month, 1, 12);
    const end = new Date(year, month + 1, 0, 12);
    return {
      startLocalDate: toLocalDateStr(start),
      endLocalDate: toLocalDateStr(end),
    };
  }

  if (range === 'year') {
    return {
      startLocalDate: `${year}-01-01`,
      endLocalDate: `${year}-12-31`,
    };
  }

  // 'all'
  return {
    startLocalDate: '1970-01-01',
    endLocalDate: '2099-12-31',
  };
}

export function getPreviousRangeBoundaries(
  range: StatRange, 
  anchorDateStr: string, 
  weekStartDay: 0 | 1 = 1
): DateRangeBoundaries | null {
  if (range === 'all') return null;

  const current = getRangeBoundaries(range, anchorDateStr, weekStartDay);
  const anchor = parseLocalDateStr(anchorDateStr);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  if (range === 'week') {
    return {
      startLocalDate: addCalendarDays(current.startLocalDate, -7),
      endLocalDate: addCalendarDays(current.endLocalDate, -7),
    };
  }

  if (range === 'month') {
    const prevMonthDate = new Date(year, month - 1, 1, 12);
    const pYear = prevMonthDate.getFullYear();
    const pMonth = prevMonthDate.getMonth();
    const start = new Date(pYear, pMonth, 1, 12);
    const end = new Date(pYear, pMonth + 1, 0, 12);
    return {
      startLocalDate: toLocalDateStr(start),
      endLocalDate: toLocalDateStr(end),
    };
  }

  if (range === 'year') {
    const pYear = year - 1;
    return {
      startLocalDate: `${pYear}-01-01`,
      endLocalDate: `${pYear}-12-31`,
    };
  }

  return null;
}

// ========================================================
// 2. Unit Conversions & Formatting
// ========================================================

const KG_TO_LB = 2.20462262;

export function convertWeight(weightKg: number, unit: 'kg' | 'lb'): number {
  if (unit === 'lb') {
    return weightKg * KG_TO_LB;
  }
  return weightKg;
}

export function formatWeight(
  weightKg: number, 
  unit: 'kg' | 'lb', 
  plateRounding = false
): string {
  const converted = convertWeight(weightKg, unit);
  if (plateRounding) {
    if (unit === 'lb') {
      const rounded = Math.round(converted);
      return `${rounded} ${unit}`;
    }
    // Round to nearest 0.5 kg
    const rounded = Math.round(converted * 2) / 2;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
  }
  return `${converted.toFixed(1)} ${unit}`;
}

export function formatVolume(volumeKg: number, unit: 'kg' | 'lb'): string {
  const converted = convertWeight(volumeKg, unit);
  const rounded = Math.round(converted);
  return `${rounded.toLocaleString()}`;
}

export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 min';
  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)} min`;
  }
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ========================================================
// 3. Pure Calculation Selectors
// ========================================================

export function isSessionCompleted(session: WorkoutSession): boolean {
  return !session.deleted_at && session.ended_at !== null && session.ended_at > 0;
}

export function sessionsInRange(
  sessions: WorkoutSession[], 
  boundaries: DateRangeBoundaries
): WorkoutSession[] {
  return sessions
    .filter(s => isSessionCompleted(s))
    .filter(s => s.local_date >= boundaries.startLocalDate && s.local_date <= boundaries.endLocalDate)
    .sort((a, b) => a.started_at - b.started_at);
}

export function findLatestBodyweightOnOrBefore(
  bodyweightEntries: BodyweightEntry[], 
  targetDateStr: string
): number | null {
  const valid = bodyweightEntries
    .filter(b => !b.deleted_at && b.local_date <= targetDateStr)
    .sort((a, b) => a.local_date.localeCompare(b.local_date));

  return valid.length > 0 ? valid[valid.length - 1].weight_kg : null;
}

export function calculateSetVolume(
  set: SetEntry, 
  sessionLocalDate: string, 
  bodyweightEntries: BodyweightEntry[] = []
): number {
  if (set.deleted_at || set.reps <= 0) return 0;
  if (set.weight_kg > 0) {
    return set.weight_kg * set.reps;
  }
  // Bodyweight set: check user's bodyweight entry
  const bw = findLatestBodyweightOnOrBefore(bodyweightEntries, sessionLocalDate);
  return bw && bw > 0 ? bw * set.reps : 0;
}

export function calculateSessionVolume(
  session: WorkoutSession, 
  bodyweightEntries: BodyweightEntry[] = []
): number {
  if (!session.sets) return 0;
  return session.sets.reduce((sum, s) => {
    return sum + calculateSetVolume(s, session.local_date, bodyweightEntries);
  }, 0);
}

export function calculateTotalVolume(
  sessions: WorkoutSession[], 
  bodyweightEntries: BodyweightEntry[] = []
): number {
  return sessions.reduce((sum, s) => sum + calculateSessionVolume(s, bodyweightEntries), 0);
}

export function calculateTotalDurationMinutes(sessions: WorkoutSession[]): number {
  return sessions.reduce((sum, s) => {
    if (s.started_at && s.ended_at && s.ended_at > s.started_at) {
      return sum + (s.ended_at - s.started_at) / 60000;
    }
    return sum;
  }, 0);
}

/**
 * Estimated 1RM (Epley formula):
 * e1RM = weight * (1 + min(reps, 12) / 30)
 * Capped at 12 reps for estimate. Warmup sets return 0.
 */
export function calculateEpley1RM(
  weightKg: number, 
  reps: number, 
  isWarmup = false
): number {
  if (isWarmup || weightKg <= 0 || reps < 1) return 0;
  const cappedReps = Math.min(reps, 12);
  const val = weightKg * (1 + cappedReps / 30);
  return Math.round(val * 10) / 10;
}

/**
 * Records (PRs) progression:
 * For each exercise, a record is a session where an exercise's best e1RM
 * exceeds ALL its earlier completed sessions' best.
 * - The first ever session of an exercise is NOT a record.
 * - Ties are NOT records.
 * - Count at most one record per exercise per session.
 */
export function calculateRecordsCountInRange(
  allSessions: WorkoutSession[], 
  boundaries: DateRangeBoundaries
): number {
  const completed = allSessions.filter(isSessionCompleted);
  // Sort only if sessions are out of chronological order
  let needsSort = false;
  for (let i = 1; i < completed.length; i++) {
    if (completed[i].started_at < completed[i - 1].started_at) {
      needsSort = true;
      break;
    }
  }
  if (needsSort) {
    completed.sort((a, b) => a.started_at - b.started_at);
  }

  const exerciseHistoricalBest = new Map<string, number>();
  let recordEventsInRange = 0;

  for (const session of completed) {
    const sessionExerciseBest = new Map<string, number>();

    for (const set of session.sets || []) {
      if (set.deleted_at || set.is_warmup || set.weight_kg <= 0) continue;
      const e1RM = calculateEpley1RM(set.weight_kg, set.reps, set.is_warmup);
      if (e1RM > 0) {
        const curBest = sessionExerciseBest.get(set.exercise_id) || 0;
        if (e1RM > curBest) {
          sessionExerciseBest.set(set.exercise_id, e1RM);
        }
      }
    }

    const isSessionInRange = session.local_date >= boundaries.startLocalDate && 
                             session.local_date <= boundaries.endLocalDate;

    for (const [exerciseId, bestThisSession] of sessionExerciseBest.entries()) {
      const priorBest = exerciseHistoricalBest.get(exerciseId);

      if (priorBest === undefined) {
        // First ever session: establish baseline, NOT a record!
        exerciseHistoricalBest.set(exerciseId, bestThisSession);
      } else if (bestThisSession > priorBest) {
        // Broke record!
        if (isSessionInRange) {
          recordEventsInRange++;
        }
        exerciseHistoricalBest.set(exerciseId, bestThisSession);
      }
    }
  }

  return recordEventsInRange;
}

/**
 * Delta Chip Rules:
 * - previous = 0 and current > 0 -> "New"
 * - Both 0 -> null
 * - percentage change for volume and time ("+12%", "-5%")
 * - absolute difference for workouts and records ("+3", "-1")
 * - For "all" -> null
 * - Negative changes use neutral white-tinted chip with down arrow (NO red)
 */
export function computeDelta(
  currentVal: number, 
  previousVal: number | null, 
  isPercentage: boolean
): DeltaChipInfo | null {
  if (previousVal === null) return null;
  if (previousVal === 0 && currentVal === 0) return null;
  if (previousVal === 0 && currentVal > 0) {
    return { type: 'new', label: 'New', isPositive: true };
  }

  if (isPercentage) {
    const diff = Math.round(((currentVal - previousVal) / previousVal) * 100);
    const isPositive = diff >= 0;
    const label = `${diff >= 0 ? '+' : ''}${diff}%`;
    return { type: 'percent', label, isPositive, value: diff };
  }

  const diff = Math.round(currentVal - previousVal);
  const isPositive = diff >= 0;
  const label = `${diff >= 0 ? '+' : ''}${diff}`;
  return { type: 'absolute', label, isPositive, value: diff };
}

// ========================================================
// 4. Composite Range Metrics Selector
// ========================================================

export function computeRangeMetrics(
  allSessions: WorkoutSession[], 
  bodyweightEntries: BodyweightEntry[], 
  range: StatRange, 
  anchorDateStr: string, 
  weekStartDay: 0 | 1, 
  weightUnit: 'kg' | 'lb'
): RangeDerivedStats {
  const currentBounds = getRangeBoundaries(range, anchorDateStr, weekStartDay);
  const prevBounds = getPreviousRangeBoundaries(range, anchorDateStr, weekStartDay);

  const currentSessions = sessionsInRange(allSessions, currentBounds);
  const prevSessions = prevBounds ? sessionsInRange(allSessions, prevBounds) : [];

  // 1. Volume
  const curVolKg = calculateTotalVolume(currentSessions, bodyweightEntries);
  const prevVolKg = prevBounds ? calculateTotalVolume(prevSessions, bodyweightEntries) : null;
  const volDelta = computeDelta(curVolKg, prevVolKg, true);

  // 2. Workouts
  const curWorkouts = currentSessions.length;
  const prevWorkouts = prevBounds ? prevSessions.length : null;
  const workoutsDelta = computeDelta(curWorkouts, prevWorkouts, false);

  // 3. Time
  const curMinutes = calculateTotalDurationMinutes(currentSessions);
  const prevMinutes = prevBounds ? calculateTotalDurationMinutes(prevSessions) : null;
  const timeDelta = computeDelta(curMinutes, prevMinutes, true);

  // 4. Records
  const curRecords = calculateRecordsCountInRange(allSessions, currentBounds);
  const prevRecords = prevBounds ? calculateRecordsCountInRange(allSessions, prevBounds) : null;
  const recordsDelta = computeDelta(curRecords, prevRecords, false);

  return {
    volume: {
      value: Math.round(convertWeight(curVolKg, weightUnit)),
      formattedValue: formatVolume(curVolKg, weightUnit),
      unit: weightUnit,
      delta: volDelta,
    },
    workoutCount: {
      value: curWorkouts,
      formattedValue: String(curWorkouts),
      delta: workoutsDelta,
    },
    totalTime: {
      value: Math.round(curMinutes),
      formattedValue: formatDuration(curMinutes),
      delta: timeDelta,
    },
    records: {
      value: curRecords,
      formattedValue: String(curRecords),
      delta: recordsDelta,
    },
  };
}

// ========================================================
// 5. Weekly Streak
// ========================================================

/**
 * weeklyStreak:
 * Consecutive completed weeks (including current week once goal is met)
 * in which completed sessions >= weeklyGoal.
 * weeklyGoal = activeProgram.days_per_week, fallback 3.
 * Incomplete current week never breaks streak; counts once goal reached.
 */
export function calculateWeeklyStreak(
  allSessions: WorkoutSession[], 
  activeProgram: TrainingProgram | null, 
  weekStartDay: 0 | 1 = 1, 
  todayDateStr: string
): number {
  const weeklyGoal = activeProgram?.days_per_week || 3;
  const completed = allSessions.filter(isSessionCompleted);

  const currentWeekBounds = getRangeBoundaries('week', todayDateStr, weekStartDay);
  const currentWeekSessions = completed.filter(s => 
    s.local_date >= currentWeekBounds.startLocalDate && 
    s.local_date <= currentWeekBounds.endLocalDate
  );

  let streak = 0;
  if (currentWeekSessions.length >= weeklyGoal) {
    streak = 1;
  }

  // Count backwards from previous week
  let checkWeekStart = addCalendarDays(currentWeekBounds.startLocalDate, -7);

  while (true) {
    const checkWeekEnd = addCalendarDays(checkWeekStart, 6);
    const countInWeek = completed.filter(s => 
      s.local_date >= checkWeekStart && s.local_date <= checkWeekEnd
    ).length;

    if (countInWeek >= weeklyGoal) {
      streak++;
      checkWeekStart = addCalendarDays(checkWeekStart, -7);
    } else {
      break;
    }
  }

  return streak;
}

// ========================================================
// 6. Week Strip (7 Days)
// ========================================================

const DAY_LETTERS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LETTERS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function generateWeekStrip(
  allSessions: WorkoutSession[], 
  activeProgram: TrainingProgram | null, 
  weekStartDay: 0 | 1 = 1, 
  todayDateStr: string
): WeekDayStripItem[] {
  const bounds = getRangeBoundaries('week', todayDateStr, weekStartDay);
  const completed = allSessions.filter(isSessionCompleted);
  const dayLetters = weekStartDay === 1 ? DAY_LETTERS_MON : DAY_LETTERS_SUN;

  const result: WeekDayStripItem[] = [];
  const scheduledWeekdays = activeProgram?.scheduled_weekdays || [];

  for (let i = 0; i < 7; i++) {
    const curDateStr = addCalendarDays(bounds.startLocalDate, i);
    const d = parseLocalDateStr(curDateStr);
    const weekday = d.getDay(); // 0 = Sun, 1 = Mon...
    const isDone = completed.some(s => s.local_date === curDateStr);
    const isToday = curDateStr === todayDateStr;
    const isFuture = curDateStr > todayDateStr;
    const isPlanned = scheduledWeekdays.includes(weekday) && !isDone;

    result.push({
      dateStr: curDateStr,
      dayNumber: d.getDate(),
      dayLetter: dayLetters[i] || 'D',
      isDone,
      isToday,
      isPlanned,
      isFuture,
    });
  }

  return result;
}

// ========================================================
// 7. Today's Plan State Machine
// ========================================================

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function computeTodayPlanState(
  allSessions: WorkoutSession[], 
  activeProgram: TrainingProgram | null, 
  bodyweightEntries: BodyweightEntry[], 
  todayDateStr: string,
  weightUnit: 'kg' | 'lb' = 'kg'
): TodayPlanState {
  // Check for in-progress session today
  const inProgress = allSessions.find(s => 
    !s.deleted_at && 
    s.local_date === todayDateStr && 
    (s.ended_at === null || s.ended_at === 0)
  );
  if (inProgress) {
    const elapsedMinutes = Math.max(0, Math.round((Date.now() - inProgress.started_at) / 60000));
    return {
      state: 'in_progress',
      session: inProgress,
      elapsedMinutes,
    };
  }

  // Check for completed session today
  const doneToday = allSessions
    .filter(isSessionCompleted)
    .filter(s => s.local_date === todayDateStr)
    .sort((a, b) => b.started_at - a.started_at);

  if (doneToday.length > 0) {
    const latest = doneToday[0];
    const vol = calculateSessionVolume(latest, bodyweightEntries);
    return {
      state: 'done',
      sessionName: latest.name,
      setsCount: (latest.sets || []).filter(s => !s.deleted_at).length,
      volumeFormatted: formatVolume(vol, weightUnit),
    };
  }

  // Check active program
  if (!activeProgram || !activeProgram.days || activeProgram.days.length === 0) {
    return { state: 'none' };
  }

  const todayDate = parseLocalDateStr(todayDateStr);
  const todayWeekday = todayDate.getDay(); // 0..6
  const scheduledDays = activeProgram.scheduled_weekdays || [];

  if (scheduledDays.includes(todayWeekday)) {
    // Scheduled for today!
    const dayIdx = scheduledDays.indexOf(todayWeekday);
    const planDay = activeProgram.days[dayIdx % activeProgram.days.length] || activeProgram.days[0];
    const muscles = (planDay.target_muscle_groups || []).join(', ') || 'Full body';
    const exerciseCount = planDay.exercises ? planDay.exercises.length : 0;

    return {
      state: 'scheduled',
      planName: planDay.name || 'Workout Session',
      subtitle: `${muscles} · ${exerciseCount} exercises`,
      exerciseCount,
      estimatedDuration: activeProgram.estimated_duration_min || 45,
    };
  }

  // Rest day: find next scheduled workout
  let nextDayName = activeProgram.days[0].name;
  let nextWeekdayName = 'Upcoming';

  for (let offset = 1; offset <= 7; offset++) {
    const nextWeekday = (todayWeekday + offset) % 7;
    if (scheduledDays.includes(nextWeekday)) {
      const idx = scheduledDays.indexOf(nextWeekday);
      const nextPlanDay = activeProgram.days[idx % activeProgram.days.length] || activeProgram.days[0];
      nextDayName = nextPlanDay.name;
      nextWeekdayName = WEEKDAY_NAMES[nextWeekday];
      break;
    }
  }

  return {
    state: 'rest',
    nextWorkoutName: nextDayName,
    nextWeekday: nextWeekdayName,
  };
}

// ========================================================
// 8. Activity Heatmap (18 Weeks x 7 Days)
// ========================================================

export function generateActivityHeatmap(
  allSessions: WorkoutSession[], 
  bodyweightEntries: BodyweightEntry[], 
  weeksCount = 18, 
  weekStartDay: 0 | 1 = 1, 
  todayDateStr: string
): {
  grid: HeatmapCell[][]; // columns = weeks, rows = weekdays
  monthLabels: { label: string; weekIndex: number }[];
  totalWorkouts: number;
  maxVolumeKg: number;
} {
  const currentWeekBounds = getRangeBoundaries('week', todayDateStr, weekStartDay);
  const totalDays = weeksCount * 7;
  // Start from (weeksCount - 1) weeks prior
  const gridStartLocalDate = addCalendarDays(currentWeekBounds.startLocalDate, -(weeksCount - 1) * 7);

  const completed = allSessions.filter(isSessionCompleted);

  // Group volume and sessions by date
  const dayVolumeMap = new Map<string, number>();
  const dayNameMap = new Map<string, string>();
  const dayCountMap = new Map<string, number>();

  let maxVol = 0;
  let totalWorkouts = 0;

  for (const s of completed) {
    if (s.local_date >= gridStartLocalDate && s.local_date <= currentWeekBounds.endLocalDate) {
      totalWorkouts++;
      const vol = calculateSessionVolume(s, bodyweightEntries);
      const cur = dayVolumeMap.get(s.local_date) || 0;
      const updatedVol = cur + vol;
      dayVolumeMap.set(s.local_date, updatedVol);
      if (updatedVol > maxVol) maxVol = updatedVol;

      dayNameMap.set(s.local_date, s.name);
      dayCountMap.set(s.local_date, (dayCountMap.get(s.local_date) || 0) + 1);
    }
  }

  // Build grid: columns = weeks (0 to 17), rows = weekdays (0 to 6)
  const grid: HeatmapCell[][] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  for (let w = 0; w < weeksCount; w++) {
    const weekCol: HeatmapCell[] = [];
    const weekStartDate = addCalendarDays(gridStartLocalDate, w * 7);

    // Track month label
    const colDate = parseLocalDateStr(weekStartDate);
    const m = colDate.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        label: colDate.toLocaleDateString('en-US', { month: 'short' }),
        weekIndex: w,
      });
      lastMonth = m;
    }

    for (let d = 0; d < 7; d++) {
      const curDateStr = addCalendarDays(weekStartDate, d);
      const vol = dayVolumeMap.get(curDateStr) || 0;
      const count = dayCountMap.get(curDateStr) || 0;
      const name = dayNameMap.get(curDateStr);

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0) {
        if (vol === 0 || maxVol === 0) {
          level = 1;
        } else {
          const ratio = vol / maxVol;
          if (ratio <= 0.25) level = 1;
          else if (ratio <= 0.50) level = 2;
          else if (ratio <= 0.75) level = 3;
          else level = 4;
        }
      }

      weekCol.push({
        dateStr: curDateStr,
        level,
        volumeKg: vol,
        workoutName: name,
        sessionCount: count,
      });
    }

    grid.push(weekCol);
  }

  return {
    grid,
    monthLabels,
    totalWorkouts,
    maxVolumeKg: maxVol,
  };
}

// ========================================================
// 9. Last Session Comparison For Exercise
// ========================================================

export function compareLastSessionForExercise(
  allSessions: WorkoutSession[], 
  exerciseId: string, 
  exerciseName = 'Exercise'
): ExerciseSessionComparison | null {
  const completed = allSessions
    .filter(isSessionCompleted)
    .filter(s => (s.sets || []).some(st => st.exercise_id === exerciseId && !st.deleted_at && !st.is_warmup))
    .sort((a, b) => a.started_at - b.started_at);

  if (completed.length === 0) return null;

  const currentSession = completed[completed.length - 1];
  const previousSession = completed.length > 1 ? completed[completed.length - 2] : null;

  const currentSets = (currentSession.sets || [])
    .filter(s => s.exercise_id === exerciseId && !s.deleted_at && !s.is_warmup);

  const previousSets = previousSession 
    ? (previousSession.sets || []).filter(s => s.exercise_id === exerciseId && !s.deleted_at && !s.is_warmup)
    : [];

  const bestE1RMCurrent = Math.max(0, ...currentSets.map(s => calculateEpley1RM(s.weight_kg, s.reps)));
  const bestE1RMPrevious = previousSets.length > 0
    ? Math.max(0, ...previousSets.map(s => calculateEpley1RM(s.weight_kg, s.reps)))
    : 0;

  const increased = previousSession !== null && bestE1RMCurrent > bestE1RMPrevious;
  const e1RMChangePercent = bestE1RMPrevious > 0
    ? Math.round(((bestE1RMCurrent - bestE1RMPrevious) / bestE1RMPrevious) * 100)
    : 0;

  const maxLen = Math.max(currentSets.length, previousSets.length);
  const comparisonRows: SetComparisonRow[] = [];

  for (let i = 0; i < maxLen; i++) {
    const cur = currentSets[i] ? { weight: currentSets[i].weight_kg, reps: currentSets[i].reps } : null;
    const prev = previousSets[i] ? { weight: previousSets[i].weight_kg, reps: previousSets[i].reps } : null;
    comparisonRows.push({
      setIndex: i + 1,
      current: cur,
      previous: prev,
    });
  }

  return {
    hasComparison: previousSession !== null,
    exerciseName,
    currentDate: currentSession.local_date,
    comparisonRows,
    increased,
    e1RMChangePercent,
    bestE1RMCurrent,
    bestE1RMPrevious,
  };
}

export function findDefaultComparisonExercise(
  allSessions: WorkoutSession[], 
  activeProgram: TrainingProgram | null, 
  allExercises: Exercise[], 
  todayDateStr: string
): { id: string; name: string } | null {
  const completed = allSessions.filter(isSessionCompleted);
  if (completed.length === 0) return null;

  // 1. Try first exercise of today's plan that has history
  const todayState = computeTodayPlanState(allSessions, activeProgram, [], todayDateStr);
  if (todayState.state === 'scheduled' && activeProgram) {
    const d = parseLocalDateStr(todayDateStr).getDay();
    const idx = (activeProgram.scheduled_weekdays || []).indexOf(d);
    const planDay = activeProgram.days[idx % activeProgram.days.length];
    if (planDay && planDay.exercises) {
      for (const ex of planDay.exercises) {
        const hasHistory = completed.some(s => 
          (s.sets || []).some(st => st.exercise_id === ex.exercise_id && !st.deleted_at && !st.is_warmup)
        );
        if (hasHistory) {
          return { id: ex.exercise_id, name: ex.exercise_name };
        }
      }
    }
  }

  // 2. Fallback: most recently performed exercise
  const latestSession = completed[completed.length - 1];
  for (let i = (latestSession.sets || []).length - 1; i >= 0; i--) {
    const st = latestSession.sets[i];
    if (!st.deleted_at && !st.is_warmup) {
      const match = allExercises.find(e => e.id === st.exercise_id);
      return {
        id: st.exercise_id,
        name: match ? match.name : 'Bench Press',
      };
    }
  }

  return null;
}
