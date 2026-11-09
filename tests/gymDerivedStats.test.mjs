// ========================================================
// Gym & Body Derived Statistics Unit Test Suite
// Verifying Phase 1 Math, Selectors, Boundaries & Formatting
// ========================================================

import test from 'node:test';
import assert from 'node:assert/strict';

// ========================================================
// Pure Selector Functions (Mirrored from gymDerivedStats.ts)
// ========================================================

function toLocalDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDateStr(str) {
  const parts = str.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  return new Date(year, month, day, 12, 0, 0, 0); // Noon anchor prevents DST shifts
}

function addCalendarDays(dateStr, days) {
  const d = parseLocalDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

function getRangeBoundaries(range, anchorDateStr, weekStartDay = 1) {
  const anchor = parseLocalDateStr(anchorDateStr);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  if (range === 'week') {
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

function getPreviousRangeBoundaries(range, anchorDateStr, weekStartDay = 1) {
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

const KG_TO_LB = 2.20462262;

function convertWeight(weightKg, unit) {
  if (unit === 'lb') {
    return weightKg * KG_TO_LB;
  }
  return weightKg;
}

function formatWeight(weightKg, unit, plateRounding = false) {
  const converted = convertWeight(weightKg, unit);
  if (plateRounding) {
    if (unit === 'lb') {
      const rounded = Math.round(converted);
      return `${rounded} ${unit}`;
    }
    const rounded = Math.round(converted * 2) / 2;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
  }
  return `${converted.toFixed(1)} ${unit}`;
}

function formatVolume(volumeKg, unit) {
  const converted = convertWeight(volumeKg, unit);
  const rounded = Math.round(converted);
  return `${rounded.toLocaleString()}`;
}

function formatDuration(totalMinutes) {
  if (totalMinutes <= 0) return '0 min';
  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)} min`;
  }
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isSessionCompleted(session) {
  return !session.deleted_at && session.ended_at !== null && session.ended_at > 0;
}

function sessionsInRange(sessions, boundaries) {
  return sessions
    .filter(isSessionCompleted)
    .filter(s => s.local_date >= boundaries.startLocalDate && s.local_date <= boundaries.endLocalDate)
    .sort((a, b) => a.started_at - b.started_at);
}

function findLatestBodyweightOnOrBefore(bodyweightEntries, targetDateStr) {
  const valid = bodyweightEntries
    .filter(b => !b.deleted_at && b.local_date <= targetDateStr)
    .sort((a, b) => a.local_date.localeCompare(b.local_date));

  return valid.length > 0 ? valid[valid.length - 1].weight_kg : null;
}

function calculateSetVolume(set, sessionLocalDate, bodyweightEntries = []) {
  if (set.deleted_at || set.reps <= 0) return 0;
  if (set.weight_kg > 0) {
    return set.weight_kg * set.reps;
  }
  const bw = findLatestBodyweightOnOrBefore(bodyweightEntries, sessionLocalDate);
  return bw && bw > 0 ? bw * set.reps : 0;
}

function calculateSessionVolume(session, bodyweightEntries = []) {
  if (!session.sets) return 0;
  return session.sets.reduce((sum, s) => {
    return sum + calculateSetVolume(s, session.local_date, bodyweightEntries);
  }, 0);
}

function calculateTotalVolume(sessions, bodyweightEntries = []) {
  return sessions.reduce((sum, s) => sum + calculateSessionVolume(s, bodyweightEntries), 0);
}

function calculateTotalDurationMinutes(sessions) {
  return sessions.reduce((sum, s) => {
    if (s.started_at && s.ended_at && s.ended_at > s.started_at) {
      return sum + (s.ended_at - s.started_at) / 60000;
    }
    return sum;
  }, 0);
}

function calculateEpley1RM(weightKg, reps, isWarmup = false) {
  if (isWarmup || weightKg <= 0 || reps < 1) return 0;
  const cappedReps = Math.min(reps, 12);
  const val = weightKg * (1 + cappedReps / 30);
  return Math.round(val * 10) / 10;
}

function calculateRecordsCountInRange(allSessions, boundaries) {
  const completed = allSessions.filter(isSessionCompleted);
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

  const exerciseHistoricalBest = new Map();
  let recordEventsInRange = 0;

  for (const session of completed) {
    const sessionExerciseBest = new Map();

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
        exerciseHistoricalBest.set(exerciseId, bestThisSession);
      } else if (bestThisSession > priorBest) {
        if (isSessionInRange) {
          recordEventsInRange++;
        }
        exerciseHistoricalBest.set(exerciseId, bestThisSession);
      }
    }
  }

  return recordEventsInRange;
}

function computeDelta(currentVal, previousVal, isPercentage) {
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

function computeRangeMetrics(allSessions, bodyweightEntries, range, anchorDateStr, weekStartDay, weightUnit) {
  const currentBounds = getRangeBoundaries(range, anchorDateStr, weekStartDay);
  const prevBounds = getPreviousRangeBoundaries(range, anchorDateStr, weekStartDay);

  const currentSessions = sessionsInRange(allSessions, currentBounds);
  const prevSessions = prevBounds ? sessionsInRange(allSessions, prevBounds) : [];

  const curVolKg = calculateTotalVolume(currentSessions, bodyweightEntries);
  const prevVolKg = prevBounds ? calculateTotalVolume(prevSessions, bodyweightEntries) : null;
  const volDelta = computeDelta(curVolKg, prevVolKg, true);

  const curWorkouts = currentSessions.length;
  const prevWorkouts = prevBounds ? prevSessions.length : null;
  const workoutsDelta = computeDelta(curWorkouts, prevWorkouts, false);

  const curMinutes = calculateTotalDurationMinutes(currentSessions);
  const prevMinutes = prevBounds ? calculateTotalDurationMinutes(prevSessions) : null;
  const timeDelta = computeDelta(curMinutes, prevMinutes, true);

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

function calculateWeeklyStreak(allSessions, activeProgram, weekStartDay = 1, todayDateStr) {
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

const DAY_LETTERS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LETTERS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function generateWeekStrip(allSessions, activeProgram, weekStartDay = 1, todayDateStr) {
  const bounds = getRangeBoundaries('week', todayDateStr, weekStartDay);
  const completed = allSessions.filter(isSessionCompleted);
  const dayLetters = weekStartDay === 1 ? DAY_LETTERS_MON : DAY_LETTERS_SUN;

  const result = [];
  const scheduledWeekdays = activeProgram?.scheduled_weekdays || [];

  for (let i = 0; i < 7; i++) {
    const curDateStr = addCalendarDays(bounds.startLocalDate, i);
    const d = parseLocalDateStr(curDateStr);
    const weekday = d.getDay();
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

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeTodayPlanState(allSessions, activeProgram, bodyweightEntries, todayDateStr, weightUnit = 'kg') {
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

  if (!activeProgram || !activeProgram.days || activeProgram.days.length === 0) {
    return { state: 'none' };
  }

  const todayDate = parseLocalDateStr(todayDateStr);
  const todayWeekday = todayDate.getDay();
  const scheduledDays = activeProgram.scheduled_weekdays || [];

  if (scheduledDays.includes(todayWeekday)) {
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

function generateActivityHeatmap(allSessions, bodyweightEntries, weeksCount = 18, weekStartDay = 1, todayDateStr) {
  const currentWeekBounds = getRangeBoundaries('week', todayDateStr, weekStartDay);
  const gridStartLocalDate = addCalendarDays(currentWeekBounds.startLocalDate, -(weeksCount - 1) * 7);

  const completed = allSessions.filter(isSessionCompleted);

  const dayVolumeMap = new Map();
  const dayNameMap = new Map();
  const dayCountMap = new Map();

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

  const grid = [];
  const monthLabels = [];
  let lastMonth = -1;

  for (let w = 0; w < weeksCount; w++) {
    const weekCol = [];
    const weekStartDate = addCalendarDays(gridStartLocalDate, w * 7);

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

      let level = 0;
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

function compareLastSessionForExercise(allSessions, exerciseId, exerciseName = 'Exercise') {
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
  const comparisonRows = [];

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

function findDefaultComparisonExercise(allSessions, activeProgram, allExercises, todayDateStr) {
  const completed = allSessions.filter(isSessionCompleted);
  if (completed.length === 0) return null;

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

// ========================================================
// 1. Local Calendar Math & DST Tests
// ========================================================
test('Calendar Math - Safe dates and leap years without 24h drift', () => {
  const d1 = parseLocalDateStr('2026-02-28');
  assert.equal(toLocalDateStr(d1), '2026-02-28');

  // Next day in non-leap year is March 1
  assert.equal(addCalendarDays('2026-02-28', 1), '2026-03-01');

  // Leap year 2028
  assert.equal(addCalendarDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addCalendarDays('2028-02-28', 2), '2028-03-01');

  // Year boundary backwards
  assert.equal(addCalendarDays('2026-01-01', -1), '2025-12-31');
});

test('Boundaries - Week start day 0 (Sun) vs 1 (Mon)', () => {
  const wedDate = '2026-11-04';

  // Week start Monday (1)
  const boundsMon = getRangeBoundaries('week', wedDate, 1);
  assert.equal(boundsMon.startLocalDate, '2026-11-02'); // Monday
  assert.equal(boundsMon.endLocalDate, '2026-11-08'); // Sunday

  // Week start Sunday (0)
  const boundsSun = getRangeBoundaries('week', wedDate, 0);
  assert.equal(boundsSun.startLocalDate, '2026-11-01'); // Sunday
  assert.equal(boundsSun.endLocalDate, '2026-11-07'); // Saturday
});

test('Boundaries - Month and Year current and previous periods', () => {
  const date = '2026-11-08';

  // Month
  const mBounds = getRangeBoundaries('month', date);
  assert.equal(mBounds.startLocalDate, '2026-11-01');
  assert.equal(mBounds.endLocalDate, '2026-11-30');

  const prevMBounds = getPreviousRangeBoundaries('month', date);
  assert.equal(prevMBounds.startLocalDate, '2026-10-01');
  assert.equal(prevMBounds.endLocalDate, '2026-10-31');

  // Year
  const yBounds = getRangeBoundaries('year', date);
  assert.equal(yBounds.startLocalDate, '2026-01-01');
  assert.equal(yBounds.endLocalDate, '2026-12-31');

  const prevYBounds = getPreviousRangeBoundaries('year', date);
  assert.equal(prevYBounds.startLocalDate, '2025-01-01');
  assert.equal(prevYBounds.endLocalDate, '2025-12-31');

  // All
  assert.equal(getPreviousRangeBoundaries('all', date), null);
});

// ========================================================
// 2. Unit Conversions (kg <-> lb) & Plate Rounding
// ========================================================
test('Unit Conversion - Accurately converts kg to lb and plate-like rounding', () => {
  const lbVal = convertWeight(100, 'lb');
  assert.ok(Math.abs(lbVal - 220.462) < 0.01);
  assert.equal(convertWeight(100, 'kg'), 100);

  assert.equal(formatWeight(80, 'kg', false), '80.0 kg');
  assert.equal(formatWeight(80, 'lb', false), '176.4 lb');

  assert.equal(formatWeight(82.72, 'lb', true), '182 lb');
  assert.equal(formatWeight(82.68, 'kg', true), '82.5 kg');
  assert.equal(formatWeight(20.25, 'kg', true), '20.5 kg');
  assert.equal(formatWeight(20.0, 'kg', true), '20 kg');

  assert.equal(formatVolume(124500, 'kg'), '124,500');
  assert.equal(formatVolume(1000, 'lb'), '2,205');
});

// ========================================================
// 3. Epley 1RM & Records Progression
// ========================================================
test('Epley 1RM - Caps reps at 12 and excludes warmups', () => {
  const rm1 = calculateEpley1RM(100, 10);
  assert.equal(rm1, 133.3);

  const rm2 = calculateEpley1RM(100, 20);
  assert.equal(rm2, 140);

  assert.equal(calculateEpley1RM(100, 10, true), 0);
  assert.equal(calculateEpley1RM(0, 10), 0);
});

test('Records Logic - First session is baseline, ties not records, strictly beats prior', () => {
  const exId = 'bench_press';
  const sessions = [
    {
      id: 's1',
      name: 'Session 1',
      local_date: '2026-11-01',
      started_at: 1000,
      ended_at: 2000,
      sets: [{ id: 'set1', session_id: 's1', exercise_id: exId, weight_kg: 80, reps: 10, is_warmup: false }],
    },
    {
      id: 's2',
      name: 'Session 2 (Tie)',
      local_date: '2026-11-03',
      started_at: 3000,
      ended_at: 4000,
      sets: [{ id: 'set2', session_id: 's2', exercise_id: exId, weight_kg: 80, reps: 10, is_warmup: false }],
    },
    {
      id: 's3',
      name: 'Session 3 (Record PR!)',
      local_date: '2026-11-05',
      started_at: 5000,
      ended_at: 6000,
      sets: [{ id: 'set3', session_id: 's3', exercise_id: exId, weight_kg: 85, reps: 10, is_warmup: false }],
    },
    {
      id: 's4',
      name: 'Session 4 (Lower)',
      local_date: '2026-11-07',
      started_at: 7000,
      ended_at: 8000,
      sets: [{ id: 'set4', session_id: 's4', exercise_id: exId, weight_kg: 70, reps: 8, is_warmup: false }],
    },
  ];

  const fullBounds = { startLocalDate: '2026-11-01', endLocalDate: '2026-11-08' };

  const recordsCount = calculateRecordsCountInRange(sessions, fullBounds);
  assert.equal(recordsCount, 1, 'Only Session 3 counts as a record');
});

// ========================================================
// 4. Delta Chip Rules
// ========================================================
test('Delta Rules - New, percentage, absolute, and neutral negative (NO red)', () => {
  const dNew = computeDelta(10, 0, false);
  assert.equal(dNew.type, 'new');
  assert.equal(dNew.label, 'New');
  assert.equal(dNew.isPositive, true);

  assert.equal(computeDelta(0, 0, false), null);
  assert.equal(computeDelta(100, null, true), null);

  const dPctPos = computeDelta(112, 100, true);
  assert.equal(dPctPos.label, '+12%');
  assert.equal(dPctPos.isPositive, true);

  const dPctNeg = computeDelta(95, 100, true);
  assert.equal(dPctNeg.label, '-5%');
  assert.equal(dPctNeg.isPositive, false);

  const dAbsPos = computeDelta(5, 2, false);
  assert.equal(dAbsPos.label, '+3');
  assert.equal(dAbsPos.isPositive, true);

  const dAbsNeg = computeDelta(3, 5, false);
  assert.equal(dAbsNeg.label, '-2');
  assert.equal(dAbsNeg.isPositive, false);
});

// ========================================================
// 5. Composite Range Metrics & Empty Data
// ========================================================
test('Range Metrics - Empty dataset produces clean zero metrics without crashing', () => {
  const metrics = computeRangeMetrics([], [], 'month', '2026-11-08', 1, 'kg');
  assert.equal(metrics.volume.value, 0);
  assert.equal(metrics.volume.formattedValue, '0');
  assert.equal(metrics.volume.delta, null);

  assert.equal(metrics.workoutCount.value, 0);
  assert.equal(metrics.workoutCount.formattedValue, '0');
  assert.equal(metrics.workoutCount.delta, null);

  assert.equal(metrics.totalTime.formattedValue, '0 min');
  assert.equal(metrics.records.value, 0);
});

test('Range Metrics - Populated month computes volume, duration, workouts and records', () => {
  const sessions = [
    {
      id: 's1',
      name: 'Push Day',
      local_date: '2026-11-02',
      started_at: 10000,
      ended_at: 10000 + (3600 * 1000), // 60 mins
      sets: [
        { id: 'st1', session_id: 's1', exercise_id: 'ex1', weight_kg: 100, reps: 10, is_warmup: false },
        { id: 'st2', session_id: 's1', exercise_id: 'ex1', weight_kg: 100, reps: 10, is_warmup: false },
      ],
    },
    {
      id: 's2',
      name: 'Pull Day',
      local_date: '2026-11-04',
      started_at: 20000,
      ended_at: 20000 + (2700 * 1000), // 45 mins
      sets: [
        { id: 'st3', session_id: 's2', exercise_id: 'ex2', weight_kg: 80, reps: 10, is_warmup: false },
      ],
    }
  ];

  const metrics = computeRangeMetrics(sessions, [], 'month', '2026-11-08', 1, 'kg');
  assert.equal(metrics.volume.value, 2800);
  assert.equal(metrics.workoutCount.value, 2);
  assert.equal(metrics.totalTime.formattedValue, '1h 45m');
});

// ========================================================
// 6. Weekly Streak & Year Boundary
// ========================================================
test('Weekly Streak - Incomplete current week never breaks; streak crosses year boundary', () => {
  const activeProgram = {
    id: 'prog1',
    name: 'PPL',
    days_per_week: 3,
    scheduled_weekdays: [1, 3, 5],
  };

  const sessions = [
    // Week 1 (2025-12-22 to 2025-12-28)
    { id: 'w1_1', name: 'A', local_date: '2025-12-22', started_at: 1, ended_at: 2, sets: [] },
    { id: 'w1_2', name: 'B', local_date: '2025-12-24', started_at: 1, ended_at: 2, sets: [] },
    { id: 'w1_3', name: 'C', local_date: '2025-12-26', started_at: 1, ended_at: 2, sets: [] },

    // Week 2 (2025-12-29 to 2026-01-04 - crosses New Year!)
    { id: 'w2_1', name: 'A', local_date: '2025-12-30', started_at: 1, ended_at: 2, sets: [] },
    { id: 'w2_2', name: 'B', local_date: '2026-01-01', started_at: 1, ended_at: 2, sets: [] },
    { id: 'w2_3', name: 'C', local_date: '2026-01-03', started_at: 1, ended_at: 2, sets: [] },

    // Week 3 (2026-01-05 to 2026-01-11)
    { id: 'w3_1', name: 'A', local_date: '2026-01-05', started_at: 1, ended_at: 2, sets: [] },
    { id: 'w3_2', name: 'B', local_date: '2026-01-07', started_at: 1, ended_at: 2, sets: [] },
    { id: 'w3_3', name: 'C', local_date: '2026-01-09', started_at: 1, ended_at: 2, sets: [] },

    // Week 4 (current incomplete week - 1 session)
    { id: 'w4_1', name: 'A', local_date: '2026-01-13', started_at: 1, ended_at: 2, sets: [] },
  ];

  const streak = calculateWeeklyStreak(sessions, activeProgram, 1, '2026-01-13');
  assert.equal(streak, 3);
});

// ========================================================
// 7. Week Strip (7 Days)
// ========================================================
test('Week Strip - Correctly tags done, planned, today, future', () => {
  const activeProgram = {
    id: 'prog1',
    name: 'Upper/Lower',
    days_per_week: 4,
    scheduled_weekdays: [1, 2, 4, 5],
  };

  const sessions = [
    { id: 's1', name: 'Upper', local_date: '2026-11-02', started_at: 1, ended_at: 2, sets: [] },
  ];

  const strip = generateWeekStrip(sessions, activeProgram, 1, '2026-11-04');
  assert.equal(strip.length, 7);

  assert.equal(strip[0].dateStr, '2026-11-02');
  assert.equal(strip[0].isDone, true);
  assert.equal(strip[0].isToday, false);

  assert.equal(strip[2].dateStr, '2026-11-04');
  assert.equal(strip[2].isToday, true);
  assert.equal(strip[2].isDone, false);
  assert.equal(strip[2].isPlanned, false);

  assert.equal(strip[3].dateStr, '2026-11-05');
  assert.equal(strip[3].isPlanned, true);
  assert.equal(strip[3].isFuture, true);
});

// ========================================================
// 8. Today's Plan State Machine
// ========================================================
test('Today Plan - Scheduled, Rest, Done, and In-Progress states', () => {
  const program = {
    id: 'p1',
    name: 'Full Body 3x',
    days_per_week: 3,
    scheduled_weekdays: [1, 3, 5],
    estimated_duration_min: 50,
    days: [
      { id: 'd1', name: 'Workout A', target_muscle_groups: ['Chest', 'Back'], exercises: [{ id: 'e1' }] },
      { id: 'd2', name: 'Workout B', target_muscle_groups: ['Legs', 'Shoulders'], exercises: [{ id: 'e2' }] },
      { id: 'd3', name: 'Workout C', target_muscle_groups: ['Arms', 'Core'], exercises: [{ id: 'e3' }] },
    ]
  };

  // Wednesday 2026-11-04 is scheduled!
  const planScheduled = computeTodayPlanState([], program, [], '2026-11-04');
  assert.equal(planScheduled.state, 'scheduled');
  assert.equal(planScheduled.planName, 'Workout B');
  assert.equal(planScheduled.estimatedDuration, 50);

  // Tuesday 2026-11-03 is Rest Day
  const planRest = computeTodayPlanState([], program, [], '2026-11-03');
  assert.equal(planRest.state, 'rest');
  assert.equal(planRest.nextWeekday, 'Wednesday');

  // Done today
  const doneSession = {
    id: 's_done',
    name: 'Morning Workout',
    local_date: '2026-11-04',
    started_at: 1000,
    ended_at: 2000,
    sets: [{ id: 'st1', session_id: 's_done', exercise_id: 'ex1', weight_kg: 80, reps: 10, is_warmup: false }],
  };
  const planDone = computeTodayPlanState([doneSession], program, [], '2026-11-04');
  assert.equal(planDone.state, 'done');

  // In Progress
  const inProgSession = {
    id: 's_prog',
    name: 'Active Workout',
    local_date: '2026-11-04',
    started_at: Date.now() - (15 * 60 * 1000),
    ended_at: null,
    sets: [],
  };
  const planInProg = computeTodayPlanState([inProgSession], program, [], '2026-11-04');
  assert.equal(planInProg.state, 'in_progress');
});

// ========================================================
// 9. Activity Heatmap
// ========================================================
test('Activity Heatmap - 18 weeks x 7 days grid with accurate level thresholds', () => {
  const sessions = [
    {
      id: 's_best',
      name: 'Heavy Squats',
      local_date: '2026-11-02',
      started_at: 1,
      ended_at: 2,
      sets: [{ id: 'st1', session_id: 's_best', exercise_id: 'e1', weight_kg: 100, reps: 100, is_warmup: false }],
    },
    {
      id: 's_mid',
      name: 'Bench Press',
      local_date: '2026-11-04',
      started_at: 1,
      ended_at: 2,
      sets: [{ id: 'st2', session_id: 's_mid', exercise_id: 'e2', weight_kg: 40, reps: 100, is_warmup: false }],
    },
    {
      id: 's_zero',
      name: 'Mobility Routine',
      local_date: '2026-11-06',
      started_at: 1,
      ended_at: 2,
      sets: [],
    }
  ];

  const heatmap = generateActivityHeatmap(sessions, [], 18, 1, '2026-11-08');
  assert.equal(heatmap.grid.length, 18);
  assert.equal(heatmap.grid[0].length, 7);
  assert.equal(heatmap.maxVolumeKg, 10000);

  const allCells = heatmap.grid.flat();
  const bestCell = allCells.find(c => c.dateStr === '2026-11-02');
  assert.ok(bestCell);
  assert.equal(bestCell.level, 4);

  const midCell = allCells.find(c => c.dateStr === '2026-11-04');
  assert.ok(midCell);
  assert.equal(midCell.level, 2);

  const zeroCell = allCells.find(c => c.dateStr === '2026-11-06');
  assert.ok(zeroCell);
  assert.equal(zeroCell.level, 1);
});

// ========================================================
// 10. Exercise Comparison ("Last Session" Card)
// ========================================================
test('Exercise Comparison - Set by set previous vs now and e1RM increase detection', () => {
  const exId = 'bench_press';
  const sessions = [
    {
      id: 's_prev',
      name: 'Push Day 1',
      local_date: '2026-10-25',
      started_at: 1000,
      ended_at: 2000,
      sets: [
        { id: 'p1', session_id: 's_prev', exercise_id: exId, weight_kg: 80, reps: 8, is_warmup: false },
        { id: 'p2', session_id: 's_prev', exercise_id: exId, weight_kg: 80, reps: 8, is_warmup: false },
      ]
    },
    {
      id: 's_cur',
      name: 'Push Day 2',
      local_date: '2026-11-02',
      started_at: 3000,
      ended_at: 4000,
      sets: [
        { id: 'c1', session_id: 's_cur', exercise_id: exId, weight_kg: 85, reps: 8, is_warmup: false },
        { id: 'c2', session_id: 's_cur', exercise_id: exId, weight_kg: 85, reps: 8, is_warmup: false },
        { id: 'c3', session_id: 's_cur', exercise_id: exId, weight_kg: 85, reps: 6, is_warmup: false },
      ]
    }
  ];

  const comparison = compareLastSessionForExercise(sessions, exId, 'Bench Press');
  assert.ok(comparison);
  assert.equal(comparison.hasComparison, true);
  assert.equal(comparison.increased, true);
  assert.ok(comparison.e1RMChangePercent > 0);
  assert.equal(comparison.comparisonRows.length, 3);

  assert.equal(comparison.comparisonRows[0].previous.weight, 80);
  assert.equal(comparison.comparisonRows[0].current.weight, 85);
  assert.equal(comparison.comparisonRows[2].previous, null);
  assert.equal(comparison.comparisonRows[2].current.weight, 85);
});

// ========================================================
// 11. Phase 4: Clean State (0 Sessions Ever)
// ========================================================
test('Phase 4 Clean State - 0 sessions returns deliberate empty states across all derived selectors', () => {
  const emptySessions = [];
  const emptyBodyweight = [];
  const todayStr = '2026-11-08';

  // 1. Weekly streak is 0
  const streak = calculateWeeklyStreak(emptySessions, null, 1, todayStr);
  assert.equal(streak, 0);

  // 2. Week strip has 7 days with isDone = false
  const strip = generateWeekStrip(emptySessions, null, 1, todayStr);
  assert.equal(strip.length, 7);
  assert.ok(strip.every(d => d.isDone === false));
  assert.ok(strip.some(d => d.isToday === true && d.dateStr === todayStr));

  // 3. Progress metrics are 0 and deltas are null
  const metrics = computeRangeMetrics(emptySessions, emptyBodyweight, 'month', todayStr, 1, 'kg');
  assert.equal(metrics.volume.value, 0);
  assert.equal(metrics.volume.delta, null);
  assert.equal(metrics.workoutCount.value, 0);
  assert.equal(metrics.workoutCount.delta, null);
  assert.equal(metrics.totalTime.value, 0);
  assert.equal(metrics.totalTime.delta, null);
  assert.equal(metrics.records.value, 0);
  assert.equal(metrics.records.delta, null);

  // 4. Heatmap is 18 weeks of level 0 cells, 0 workouts, 0 max volume
  const heatmap = generateActivityHeatmap(emptySessions, emptyBodyweight, 18, 1, todayStr);
  assert.equal(heatmap.grid.length, 18);
  assert.equal(heatmap.totalWorkouts, 0);
  assert.equal(heatmap.maxVolumeKg, 0);
  assert.ok(heatmap.grid.flat().every(c => c.level === 0));

  // 5. Last session comparison is completely null (card hidden)
  const comparison = compareLastSessionForExercise(emptySessions, 'bench_press', 'Bench Press');
  assert.equal(comparison, null);

  // 6. Default comparison exercise returns null
  const defaultEx = findDefaultComparisonExercise(emptySessions, null, [], todayStr);
  assert.equal(defaultEx, null);
});

// ========================================================
// 12. Phase 4: Plate Rounding Math (0.5 kg & 1 lb increments)
// ========================================================
test('Phase 4 Plate Math - Uses 0.5 kg or 1 lb increments without fractional lbs', () => {
  // Lb: Always round to nearest integer pound, never fractional like 182.38 lb
  assert.equal(formatWeight(82.72, 'lb', true), '182 lb');
  assert.equal(formatWeight(82.4, 'lb', true), '182 lb');
  assert.equal(formatWeight(100, 'lb', true), '220 lb');
  assert.equal(formatWeight(45.3592, 'lb', true), '100 lb');

  // Kg: Always round to nearest 0.5 kg
  assert.equal(formatWeight(82.68, 'kg', true), '82.5 kg');
  assert.equal(formatWeight(82.42, 'kg', true), '82.5 kg');
  assert.equal(formatWeight(82.15, 'kg', true), '82 kg');
  assert.equal(formatWeight(80.0, 'kg', true), '80 kg');
  assert.equal(formatWeight(80.5, 'kg', true), '80.5 kg');
});

// ========================================================
// 13. Phase 4: Heavy Dataset (500+ Sessions) Performance
// ========================================================
test('Phase 4 Heavy Dataset - 600 sessions computeRangeMetrics executes in < 16ms (60fps target)', () => {
  const largeSessions = [];
  const todayStr = '2026-11-08';

  // Generate 600 sessions spread over the past 600 days
  for (let i = 0; i < 600; i++) {
    const sessionDate = addCalendarDays(todayStr, -i);
    largeSessions.push({
      id: `perf_sess_${i}`,
      name: `Training Session ${i}`,
      local_date: sessionDate,
      started_at: Date.now() - (i * 86400000),
      ended_at: Date.now() - (i * 86400000) + 3600000,
      duration_minutes: 60,
      sets: [
        { id: `st_${i}_1`, session_id: `perf_sess_${i}`, exercise_id: 'ex-1', weight_kg: 80 + (i % 20), reps: 10, is_warmup: false },
        { id: `st_${i}_2`, session_id: `perf_sess_${i}`, exercise_id: 'ex-1', weight_kg: 80 + (i % 20), reps: 8, is_warmup: false },
        { id: `st_${i}_3`, session_id: `perf_sess_${i}`, exercise_id: 'ex-2', weight_kg: 60, reps: 12, is_warmup: false },
        { id: `st_${i}_4`, session_id: `perf_sess_${i}`, exercise_id: 'ex-3', weight_kg: 100, reps: 6, is_warmup: false },
      ]
    });
  }

  // Benchmark single period change (e.g. user taps "Month")
  const start = performance.now();
  const mMonth = computeRangeMetrics(largeSessions, [], 'month', todayStr, 1, 'kg');
  const elapsed = performance.now() - start;

  assert.ok(mMonth.workoutCount.value > 0);

  // Must complete in < 16ms (single frame budget at 60fps)
  assert.ok(elapsed < 16, `Expected period change on 600 sessions to take < 16ms, took ${elapsed.toFixed(2)}ms`);
});
