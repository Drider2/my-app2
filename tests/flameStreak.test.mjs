// ========================================================
// GreenDream Flame Module Phase 1: Pure Streak Logic Unit Tests
// Comprehensive verification of strict calendar arithmetic,
// intensity model, relapse flows, milestone deduplication & phrases.
// ========================================================

import test from 'node:test';
import assert from 'node:assert/strict';

// Control points for piecewise-linear intensity function i(d)
export const FLAME_CONTROL_POINTS = [
  { d: 0, i: 0.15 },
  { d: 1, i: 0.30 },
  { d: 3, i: 0.45 },
  { d: 7, i: 0.62 },
  { d: 10, i: 0.72 },
  { d: 14, i: 0.80 },
  { d: 21, i: 0.88 },
  { d: 30, i: 0.95 },
  { d: 60, i: 1.00 },
];

export function calendarDaysBetween(fromDateStr, toDateStr) {
  if (!fromDateStr || !toDateStr) return 0;
  const [y1, m1, d1] = fromDateStr.split('-').map(Number);
  const [y2, m2, d2] = toDateStr.split('-').map(Number);
  if (!y1 || !y2 || isNaN(y1) || isNaN(y2)) return 0;
  
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export function addCalendarDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateFlameIntensity(days) {
  if (days <= 0) return 0.15;
  if (days >= 60) return 1.00;

  for (let k = 0; k < FLAME_CONTROL_POINTS.length - 1; k++) {
    const p1 = FLAME_CONTROL_POINTS[k];
    const p2 = FLAME_CONTROL_POINTS[k + 1];
    if (days >= p1.d && days <= p2.d) {
      const fraction = (days - p1.d) / (p2.d - p1.d);
      const val = p1.i + fraction * (p2.i - p1.i);
      return Math.min(1.0, Math.max(0.15, Number(val.toFixed(4))));
    }
  }
  return 1.0;
}

export function dayStatus(targetDate, today, flame) {
  if (targetDate < flame.startDate) return 'before_start';
  if (targetDate > today) return 'future';
  if (flame.relapses.some(r => r.date === targetDate)) return 'relapse';
  if (targetDate === today) return 'pending';
  return 'sober';
}

export function calculateStreakStats(flame, today) {
  const isRelapseToday = flame.relapses.some(r => r.date === today);
  const todayStat = isRelapseToday ? 'relapse' : 'pending';

  const sortedRelapses = [...flame.relapses].sort((a, b) => a.date.localeCompare(b.date));

  let currentStreak = 0;
  let streakKey = flame.startDate;

  if (isRelapseToday) {
    currentStreak = 0;
    streakKey = addCalendarDays(today, 1);
  } else {
    const pastRelapses = sortedRelapses.filter(r => r.date < today);
    if (pastRelapses.length > 0) {
      const lastRelapse = pastRelapses[pastRelapses.length - 1];
      streakKey = addCalendarDays(lastRelapse.date, 1);
      currentStreak = Math.max(0, calendarDaysBetween(streakKey, today));
    } else {
      streakKey = flame.startDate;
      currentStreak = Math.max(0, calendarDaysBetween(flame.startDate, today));
    }
  }

  const relapsesInRange = sortedRelapses.filter(r => r.date >= flame.startDate && r.date <= today);
  const streakIntervals = [];

  if (relapsesInRange.length === 0) {
    streakIntervals.push(Math.max(0, calendarDaysBetween(flame.startDate, today)));
  } else {
    streakIntervals.push(Math.max(0, calendarDaysBetween(flame.startDate, relapsesInRange[0].date)));

    for (let i = 0; i < relapsesInRange.length - 1; i++) {
      const dayAfterFirst = addCalendarDays(relapsesInRange[i].date, 1);
      const nextRelapse = relapsesInRange[i + 1].date;
      streakIntervals.push(Math.max(0, calendarDaysBetween(dayAfterFirst, nextRelapse)));
    }

    const lastPastRelapse = relapsesInRange.filter(r => r.date < today).pop();
    if (lastPastRelapse) {
      const dayAfterLast = addCalendarDays(lastPastRelapse.date, 1);
      streakIntervals.push(Math.max(0, calendarDaysBetween(dayAfterLast, today)));
    }
  }

  const longestStreak = Math.max(currentStreak, ...streakIntervals, 0);

  const totalDaysPossible = Math.max(0, calendarDaysBetween(flame.startDate, today));
  const pastRelapseDates = new Set(sortedRelapses.filter(r => r.date >= flame.startDate && r.date < today).map(r => r.date));
  const totalFlames = Math.max(0, totalDaysPossible - pastRelapseDates.size);

  const intensity = calculateFlameIntensity(currentStreak);

  return {
    currentStreak,
    longestStreak,
    totalFlames,
    relapseCount: flame.relapses.length,
    streakKey,
    intensity,
    isRelapseToday,
    todayStatus: todayStat,
  };
}

export function recordRelapse(flame, today, targetDate, trigger) {
  const date = targetDate || today;
  const daysDiff = calendarDaysBetween(date, today);

  if (daysDiff < 0 || daysDiff > 7) {
    return flame;
  }

  const existingIdx = flame.relapses.findIndex(r => r.date === date);
  let updatedRelapses;

  if (existingIdx >= 0) {
    updatedRelapses = [...flame.relapses];
    updatedRelapses[existingIdx] = { date, at: Date.now(), trigger };
  } else {
    updatedRelapses = [...flame.relapses, { date, at: Date.now(), trigger }];
  }

  const tempFlame = { ...flame, relapses: updatedRelapses };
  const stats = calculateStreakStats(tempFlame, today);

  return {
    ...tempFlame,
    celebrations: {
      streakKey: stats.streakKey,
      done: stats.streakKey === flame.celebrations.streakKey ? flame.celebrations.done : [],
      lastSeenDay: today,
    },
  };
}

export function unmarkRelapse(flame, dateToUnmark, today) {
  const updatedRelapses = flame.relapses.filter(r => r.date !== dateToUnmark);
  const tempFlame = { ...flame, relapses: updatedRelapses };
  const stats = calculateStreakStats(tempFlame, today);

  return {
    ...tempFlame,
    celebrations: {
      streakKey: stats.streakKey,
      done: stats.streakKey === flame.celebrations.streakKey ? flame.celebrations.done : [],
      lastSeenDay: today,
    },
  };
}

export function catchUpCelebrations(flame, today) {
  const stats = calculateStreakStats(flame, today);
  const streakKey = stats.streakKey;

  let currentDone = flame.celebrations.done || [];
  if (flame.celebrations.streakKey !== streakKey) {
    currentDone = [];
  }

  const crossedMilestones = [];
  for (let m = 10; m <= stats.currentStreak; m += 10) {
    crossedMilestones.push(m);
  }

  const unseenMilestones = crossedMilestones.filter(m => !currentDone.includes(m));

  if (unseenMilestones.length === 0) {
    return {
      updatedFlame: {
        ...flame,
        celebrations: {
          streakKey,
          done: currentDone,
          lastSeenDay: today,
        },
      },
      celebrationMilestone: null,
    };
  }

  const celebrationMilestone = Math.max(...unseenMilestones);
  const allDone = Array.from(new Set([...currentDone, ...crossedMilestones]));

  return {
    updatedFlame: {
      ...flame,
      celebrations: {
        streakKey,
        done: allDone,
        lastSeenDay: today,
      },
    },
    celebrationMilestone,
  };
}

export function pickMilestonePhrase(milestone, phraseHistory = []) {
  const isPoolA = milestone < 50;
  const eligibleIds = isPoolA ? [1, 2, 3, 4, 5, 6, 7, 8] : [9, 10, 11, 12];
  const recentHistory = phraseHistory.slice(-6);

  const candidateIds = eligibleIds.filter(id => !recentHistory.includes(id));
  const pool = candidateIds.length > 0 ? candidateIds : eligibleIds;

  const pickedId = pool[Math.floor(Math.random() * pool.length)];
  return { id: pickedId, pool: isPoolA ? 'A' : 'B' };
}

export function saveMilestonePhrase(flame, phrase, today) {
  const existing = flame.savedPhrases || [];
  if (existing.some(p => p.id === phrase.id && p.milestone === phrase.milestone)) {
    return flame;
  }

  const newEntry = {
    id: phrase.id,
    text: phrase.text,
    dateEarned: today,
    milestone: phrase.milestone,
  };

  return {
    ...flame,
    savedPhrases: [newEntry, ...existing],
  };
}

// ----------------------------------------------------
// 1. Strict Local Calendar Arithmetic & DST Safety Tests
// ----------------------------------------------------
test('Calendar Math - Accurate difference without 24h ms assumptions', () => {
  assert.equal(calendarDaysBetween('2026-11-01', '2026-11-07'), 6);
  assert.equal(calendarDaysBetween('2026-11-07', '2026-11-07'), 0);
  assert.equal(calendarDaysBetween('2026-11-07', '2026-11-01'), -6);

  // Month boundary (Oct 30 to Nov 2)
  assert.equal(calendarDaysBetween('2026-10-30', '2026-11-02'), 3);

  // Leap year safety (2024 is leap year, 2026 is non-leap)
  assert.equal(calendarDaysBetween('2024-02-28', '2024-03-01'), 2);
  assert.equal(calendarDaysBetween('2026-02-28', '2026-03-01'), 1);

  // Year boundary (Dec 30 to Jan 2)
  assert.equal(calendarDaysBetween('2026-12-30', '2027-01-02'), 3);
});

test('Calendar Math - addCalendarDays handles forwards and backwards', () => {
  assert.equal(addCalendarDays('2026-11-07', 1), '2026-11-08');
  assert.equal(addCalendarDays('2026-11-07', -1), '2026-11-06');
  assert.equal(addCalendarDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addCalendarDays('2026-01-01', -1), '2025-12-31');
});

// ----------------------------------------------------
// 2. Day Status Mapping
// ----------------------------------------------------
test('Day Status - Correctly categorizes before_start, sober, relapse, pending, future', () => {
  const flame = {
    enabled: true,
    startDate: '2026-11-01',
    relapses: [{ date: '2026-11-04', at: 1000 }],
    showNumber: true,
    celebrations: { streakKey: '2026-11-05', done: [], lastSeenDay: '2026-11-07' },
    phraseHistory: [],
  };

  const today = '2026-11-07';

  assert.equal(dayStatus('2026-10-31', today, flame), 'before_start');
  assert.equal(dayStatus('2026-11-01', today, flame), 'sober');
  assert.equal(dayStatus('2026-11-04', today, flame), 'relapse');
  assert.equal(dayStatus('2026-11-05', today, flame), 'sober');
  assert.equal(dayStatus('2026-11-07', today, flame), 'pending'); // Today is in progress!
  assert.equal(dayStatus('2026-11-08', today, flame), 'future');
});

// ----------------------------------------------------
// 3. Exact Piecewise-Linear Intensity Model i(d)
// ----------------------------------------------------
test('Intensity Model - Matches exact control points', () => {
  for (const cp of FLAME_CONTROL_POINTS) {
    const val = calculateFlameIntensity(cp.d);
    assert.equal(val, cp.i, `Intensity at d=${cp.d} must equal ${cp.i}`);
  }

  // Beyond 60 days
  assert.equal(calculateFlameIntensity(61), 1.0);
  assert.equal(calculateFlameIntensity(100), 1.0);
  assert.equal(calculateFlameIntensity(365), 1.0);

  // Negative / 0
  assert.equal(calculateFlameIntensity(-5), 0.15);
  assert.equal(calculateFlameIntensity(0), 0.15);
});

test('Intensity Model - Correctly interpolates between control points', () => {
  // Between d=1 (0.30) and d=3 (0.45): at d=2 -> 0.375
  assert.equal(calculateFlameIntensity(2), 0.375);

  // Between d=3 (0.45) and d=7 (0.62): at d=5 -> 0.45 + (2/4)*(0.17) = 0.535
  assert.equal(calculateFlameIntensity(5), 0.535);

  // Between d=10 (0.72) and d=14 (0.80): at d=12 -> 0.72 + (2/4)*(0.08) = 0.76
  assert.equal(calculateFlameIntensity(12), 0.76);
});

// ----------------------------------------------------
// 4. Streak Calculation & Invariants
// ----------------------------------------------------
test('Streak Logic - Day 0 start has 0 completed sober days; today is pending', () => {
  const today = '2026-11-07';
  const flame = {
    enabled: true,
    startDate: today,
    relapses: [],
    showNumber: true,
    celebrations: { streakKey: today, done: [], lastSeenDay: today },
    phraseHistory: [],
  };

  const stats = calculateStreakStats(flame, today);
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.todayStatus, 'pending');
  assert.equal(stats.isRelapseToday, false);
  assert.equal(stats.intensity, 0.15);
  assert.equal(stats.longestStreak, 0);
  assert.equal(stats.totalFlames, 0);
});

test('Streak Logic - App started 10 days ago has 10 completed sober days', () => {
  const today = '2026-11-17';
  const flame = {
    enabled: true,
    startDate: '2026-11-07',
    relapses: [],
    showNumber: true,
    celebrations: { streakKey: '2026-11-07', done: [], lastSeenDay: today },
    phraseHistory: [],
  };

  const stats = calculateStreakStats(flame, today);
  assert.equal(stats.currentStreak, 10);
  assert.equal(stats.longestStreak, 10);
  assert.equal(stats.totalFlames, 10);
  assert.equal(stats.todayStatus, 'pending');
  assert.equal(stats.intensity, 0.72);
});

test('Streak Logic - Relapse today drops current streak to 0 and flame to ember', () => {
  const today = '2026-11-17';
  const flame = {
    enabled: true,
    startDate: '2026-11-07',
    relapses: [{ date: today, at: Date.now() }],
    showNumber: true,
    celebrations: { streakKey: '2026-11-07', done: [], lastSeenDay: today },
    phraseHistory: [],
  };

  const stats = calculateStreakStats(flame, today);
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.isRelapseToday, true);
  assert.equal(stats.todayStatus, 'relapse');
  assert.equal(stats.intensity, 0.15);
  // Past 10 completed days remain credited in longest and total flames!
  assert.equal(stats.longestStreak, 10);
  assert.equal(stats.totalFlames, 10);
  // Tomorrow starts a new streak
  assert.equal(stats.streakKey, '2026-11-18');
});

test('Streak Logic - Relapse 3 days ago resumes streak calculation correctly', () => {
  const today = '2026-11-17';
  const flame = {
    enabled: true,
    startDate: '2026-11-01',
    relapses: [{ date: '2026-11-14', at: Date.now() }],
    showNumber: true,
    celebrations: { streakKey: '2026-11-15', done: [], lastSeenDay: today },
    phraseHistory: [],
  };

  const stats = calculateStreakStats(flame, today);
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.streakKey, '2026-11-15');
  assert.equal(stats.isRelapseToday, false);
  // Previous streak was 2026-11-01 to 2026-11-14 = 13 days
  assert.equal(stats.longestStreak, 13);
  // Total flames = 16 days elapsed - 1 relapse = 15 flames
  assert.equal(stats.totalFlames, 15);
});

// ----------------------------------------------------
// 5. Relapse Recording, Edit Window & 24h Undo
// ----------------------------------------------------
test('Relapse Flow - recordRelapse today and unmarkRelapse restores streak', () => {
  const today = '2026-11-17';
  let flame = {
    enabled: true,
    startDate: '2026-11-07',
    relapses: [],
    showNumber: true,
    celebrations: { streakKey: '2026-11-07', done: [], lastSeenDay: today },
    phraseHistory: [],
  };

  // 1. Initial streak is 10
  assert.equal(calculateStreakStats(flame, today).currentStreak, 10);

  // 2. Slip today
  flame = recordRelapse(flame, today, today, 'tired');
  assert.equal(flame.relapses.length, 1);
  assert.equal(flame.relapses[0].trigger, 'tired');
  assert.equal(calculateStreakStats(flame, today).currentStreak, 0);

  // 3. User taps Undo (all day recovery)
  flame = unmarkRelapse(flame, today, today);
  assert.equal(flame.relapses.length, 0);
  assert.equal(calculateStreakStats(flame, today).currentStreak, 10);
});

test('Relapse Flow - Modifying past 7 days allowed; older than 7 days rejected', () => {
  const today = '2026-11-17';
  let flame = {
    enabled: true,
    startDate: '2026-11-01',
    relapses: [],
    showNumber: true,
    celebrations: { streakKey: '2026-11-01', done: [], lastSeenDay: today },
    phraseHistory: [],
  };

  // Allowed: 5 days ago (2026-11-12)
  flame = recordRelapse(flame, today, '2026-11-12', 'stress');
  assert.equal(flame.relapses.length, 1);

  // Rejected: 9 days ago (2026-11-08)
  flame = recordRelapse(flame, today, '2026-11-08', 'social');
  assert.equal(flame.relapses.length, 1, 'Slip older than 7 days must be rejected');

  // Rejected: future date (2026-11-19)
  flame = recordRelapse(flame, today, '2026-11-19', 'social');
  assert.equal(flame.relapses.length, 1, 'Future slip must be rejected');
});

// ----------------------------------------------------
// 6. Catch-Up on Open & Milestone Deduplication
// ----------------------------------------------------
test('Catch-Up - Jumping multiple milestones triggers ONLY highest unseen and marks all done', () => {
  const today = '2026-11-29'; // 22 completed days since 2026-11-07
  const flame = {
    enabled: true,
    startDate: '2026-11-07',
    relapses: [],
    showNumber: true,
    celebrations: { streakKey: '2026-11-07', done: [], lastSeenDay: '2026-11-15' },
    phraseHistory: [],
  };

  // User jumped from d=8 to d=22 without opening app: crossed 10 and 20!
  const { updatedFlame, celebrationMilestone } = catchUpCelebrations(flame, today);

  // Must trigger exactly highest unseen milestone (20)
  assert.equal(celebrationMilestone, 20);
  // Both 10 and 20 must be recorded in done
  assert.deepEqual(updatedFlame.celebrations.done.sort((a, b) => a - b), [10, 20]);
  assert.equal(updatedFlame.celebrations.lastSeenDay, today);

  // Subsequent check on same state triggers NO celebration
  const secondCheck = catchUpCelebrations(updatedFlame, today);
  assert.equal(secondCheck.celebrationMilestone, null);
});

test('Catch-Up - After relapse and new streak, milestones can be earned again', () => {
  const today = '2026-11-25';
  const flame = {
    enabled: true,
    startDate: '2026-10-01',
    relapses: [{ date: '2026-11-15', at: 1000 }],
    showNumber: true,
    celebrations: { streakKey: '2026-10-01', done: [10, 20, 30, 40], lastSeenDay: '2026-11-15' },
    phraseHistory: [],
  };

  // Tomorrow is 2026-11-26 -> current streak hits 10!
  const tomorrow = '2026-11-26';
  const { updatedFlame, celebrationMilestone } = catchUpCelebrations(flame, tomorrow);

  // Milestone 10 can be earned again because streakKey changed to 2026-11-16
  assert.equal(celebrationMilestone, 10);
  assert.deepEqual(updatedFlame.celebrations.done, [10]);
  assert.equal(updatedFlame.celebrations.streakKey, '2026-11-16');
});

// ----------------------------------------------------
// 7. Meaningful Phrase Selection & Anti-Repetition
// ----------------------------------------------------
test('Phrase Selection - Pool A for milestones < 50; Pool B for milestones >= 50', () => {
  for (let m of [10, 20, 30, 40]) {
    const picked = pickMilestonePhrase(m, []);
    assert.equal(picked.pool, 'A');
    assert.ok(picked.id >= 1 && picked.id <= 8, `ID ${picked.id} must be in Pool A (1..8)`);
  }

  for (let m of [50, 60, 90, 100]) {
    const picked = pickMilestonePhrase(m, []);
    assert.equal(picked.pool, 'B');
    assert.ok(picked.id >= 9 && picked.id <= 12, `ID ${picked.id} must be in Pool B (9..12)`);
  }
});

test('Phrase Selection - Never repeats any of the last 6 phrases in history', () => {
  const history = [1, 2, 3, 4, 5, 6];
  for (let i = 0; i < 20; i++) {
    const picked = pickMilestonePhrase(20, history);
    assert.ok(picked.id === 7 || picked.id === 8, `Picked ID ${picked.id} must not be in last 6 history`);
  }
});

// ----------------------------------------------------
// 8. Bookmarking "Words you earned"
// ----------------------------------------------------
test('Saved Phrases - Adds phrase and prevents duplicates for same milestone', () => {
  let flame = {
    enabled: true,
    startDate: '2026-11-01',
    relapses: [],
    showNumber: true,
    celebrations: { streakKey: '2026-11-01', done: [], lastSeenDay: '2026-11-11' },
    phraseHistory: [],
    savedPhrases: [],
  };

  const phrase1 = { id: 3, text: 'Ten sunrises you met with clear eyes.', milestone: 10 };
  flame = saveMilestonePhrase(flame, phrase1, '2026-11-11');
  assert.equal(flame.savedPhrases.length, 1);
  assert.equal(flame.savedPhrases[0].id, 3);
  assert.equal(flame.savedPhrases[0].milestone, 10);

  // Duplicate add is ignored
  flame = saveMilestonePhrase(flame, phrase1, '2026-11-11');
  assert.equal(flame.savedPhrases.length, 1);
});

// ----------------------------------------------------
// 9. Phase 2 Visual Mapping & FlameIcon Invariant Tests
// ----------------------------------------------------
test('Visual Mapping - Computes exact glow, scale, opacity, and halo thresholds', () => {
  function getVisualParams(days) {
    const i = calculateFlameIntensity(days);
    return {
      i,
      overallScale: Number((0.88 + 0.20 * i).toFixed(4)),
      outerOpacity: Number((0.45 + 0.55 * i).toFixed(4)),
      glowR: Number((2 + 20 * i).toFixed(2)),
      glowA: Number((0.25 + 0.65 * i).toFixed(4)),
      hasHalo: i >= 0.60,
      haloR: Number((38 + 18 * i).toFixed(2)),
      haloOpacity: Number((0.05 + 0.20 * i).toFixed(4)),
      innerScale: Number((0.55 + 0.45 * i).toFixed(4)),
      innerOpacity: Number((0.15 + 0.80 * i).toFixed(4)),
      sparks: days >= 90 ? 4 : days >= 30 ? 2 : 0,
    };
  }

  // Day 0: Ember (i = 0.15)
  const p0 = getVisualParams(0);
  assert.equal(p0.i, 0.15);
  assert.equal(p0.overallScale, 0.91);
  assert.equal(p0.outerOpacity, 0.5325);
  assert.equal(p0.glowR, 5.00);
  assert.equal(p0.glowA, 0.3475);
  assert.equal(p0.hasHalo, false, 'Ember must not have halo');
  assert.equal(p0.sparks, 0);

  // Day 3: Kindle (i = 0.45)
  const p3 = getVisualParams(3);
  assert.equal(p3.i, 0.45);
  assert.equal(p3.hasHalo, false, 'Day 3 (i=0.45) must not have halo');
  assert.equal(p3.sparks, 0);

  // Day 7: Campfire (i = 0.62) -> First halo appears!
  const p7 = getVisualParams(7);
  assert.equal(p7.i, 0.62);
  assert.equal(p7.hasHalo, true, 'Day 7 (i=0.62 >= 0.6) must have halo');
  assert.equal(p7.sparks, 0);

  // Day 10: Milestone Blaze (i = 0.72)
  const p10 = getVisualParams(10);
  assert.equal(p10.i, 0.72);
  assert.equal(p10.hasHalo, true);
  assert.equal(p10.innerScale, 0.874);
  assert.equal(p10.sparks, 0);

  // Day 30: Furnace (i = 0.95) -> 2 Sparks appear!
  const p30 = getVisualParams(30);
  assert.equal(p30.i, 0.95);
  assert.equal(p30.hasHalo, true);
  assert.equal(p30.sparks, 2, 'Day 30 must render 2 sparks');

  // Day 90: Beacon (i = 1.00) -> 4 Sparks!
  const p90 = getVisualParams(90);
  assert.equal(p90.i, 1.00);
  assert.equal(p90.hasHalo, true);
  assert.equal(p90.sparks, 4, 'Day 90 must render 4 sparks');
});

// ----------------------------------------------------
// 10. Contrast Ratio Compliance Check (>= 3:1)
// ----------------------------------------------------
test('Contrast Verification - Ember outline maintains >= 3:1 against dark and light surfaces', () => {
  // WCAG relative luminance helper
  function luminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function contrastRatio(lum1, lum2) {
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Dark Theme Surface: #04070A (rgb: 4, 7, 10)
  const darkSurfaceLum = luminance(4, 7, 10);

  // Light Theme Surface: #EEF4F6 (rgb: 238, 244, 246)
  const lightSurfaceLum = luminance(238, 244, 246);

  // Dark Mode Accents
  const darkAccents = {
    cyan: [34, 199, 242],
    lime: [166, 227, 75],
    violet: [167, 139, 250],
    rose: [255, 122, 156],
  };

  // Light Mode Darkened Accents (25% darkened in index.css)
  const lightAccents = {
    cyan: [10, 147, 184],
    lime: [85, 142, 27],
    violet: [124, 92, 224],
    rose: [224, 62, 107],
  };

  // Verify all 4 accents in Dark Mode maintain >= 4.5:1 contrast against dark background
  for (const [name, rgb] of Object.entries(darkAccents)) {
    const lum = luminance(rgb[0], rgb[1], rgb[2]);
    const cr = contrastRatio(lum, darkSurfaceLum);
    assert.ok(cr >= 4.5, `Dark accent ${name} contrast (${cr.toFixed(2)}) must be >= 4.5:1`);
  }

  // Verify all 4 darkened accents in Light Mode maintain >= 3.0:1 contrast against light background
  for (const [name, rgb] of Object.entries(lightAccents)) {
    const lum = luminance(rgb[0], rgb[1], rgb[2]);
    const cr = contrastRatio(lightSurfaceLum, lum);
    assert.ok(cr >= 3.0, `Light accent ${name} contrast (${cr.toFixed(2)}) must be >= 3.0:1`);
  }
});

// ----------------------------------------------------
// 11. Safe Settings Integration Tests for Sober Flame
// ----------------------------------------------------
test('Safe Settings - Detects modifications to flame showTenDayWords, showNumber, and shareWithHermes', () => {
  const originalFlame = {
    enabled: true,
    showNumber: true,
    showTenDayWords: true,
    shareWithHermes: false,
    goalDays: 30,
  };

  const draftFlame = {
    enabled: true,
    showNumber: false,
    showTenDayWords: false,
    shareWithHermes: true,
    goalDays: 90,
  };

  function computeFlameDiffs(orig, draft) {
    const diffs = [];
    if (orig.showTenDayWords !== draft.showTenDayWords) {
      diffs.push({ fieldKey: 'showTenDayWords', oldVal: orig.showTenDayWords, newVal: draft.showTenDayWords });
    }
    if (orig.showNumber !== draft.showNumber) {
      diffs.push({ fieldKey: 'showNumber', oldVal: orig.showNumber, newVal: draft.showNumber });
    }
    if (orig.shareWithHermes !== draft.shareWithHermes) {
      diffs.push({ fieldKey: 'shareWithHermes', oldVal: orig.shareWithHermes, newVal: draft.shareWithHermes });
    }
    if (orig.goalDays !== draft.goalDays) {
      diffs.push({ fieldKey: 'goalDays', oldVal: orig.goalDays, newVal: draft.goalDays });
    }
    return diffs;
  }

  const diffs = computeFlameDiffs(originalFlame, draftFlame);
  assert.equal(diffs.length, 4);
  assert.equal(diffs.find(d => d.fieldKey === 'showTenDayWords').newVal, false);
  assert.equal(diffs.find(d => d.fieldKey === 'showNumber').newVal, false);
  assert.equal(diffs.find(d => d.fieldKey === 'shareWithHermes').newVal, true);
  assert.equal(diffs.find(d => d.fieldKey === 'goalDays').newVal, 90);
});
