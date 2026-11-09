// ========================================================
// GreenDream Sober Flame Service (v2.0)
// Pure Calendar Streak Logic, Intensity & Celebrations
// ========================================================

import { 
  FlameSettings, 
  FlameDayStatus, 
  FlameRelapseEntry, 
  FlameSavedPhrase 
} from '../../types';

export interface FlameStreakStats {
  currentStreak: number;
  longestStreak: number;
  totalFlames: number;
  relapseCount: number;
  streakKey: string;
  intensity: number;
  isRelapseToday: boolean;
  todayStatus: FlameDayStatus;
}

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

/**
 * Strict calendar day difference in whole integer days: (toDateStr - fromDateStr).
 * Uses UTC date components so it is completely immune to DST (23h/25h shifts), timezones, and clock jumps.
 */
export function calendarDaysBetween(fromDateStr: string, toDateStr: string): number {
  if (!fromDateStr || !toDateStr) return 0;
  const [y1, m1, d1] = fromDateStr.split('-').map(Number);
  const [y2, m2, d2] = toDateStr.split('-').map(Number);
  if (!y1 || !y2 || isNaN(y1) || isNaN(y2)) return 0;
  
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Adds or subtracts whole integer calendar days to a 'YYYY-MM-DD' date string.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates continuous piecewise-linear flame intensity i(d) clamped to [0.15, 1.00].
 */
export function calculateFlameIntensity(days: number): number {
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

/**
 * Returns the status of a specific calendar day:
 * 'before_start' | 'sober' | 'relapse' | 'pending' | 'future'
 */
export function dayStatus(targetDate: string, today: string, flame: FlameSettings): FlameDayStatus {
  if (targetDate < flame.startDate) return 'before_start';
  if (targetDate > today) return 'future';
  if (flame.relapses.some(r => r.date === targetDate)) return 'relapse';
  if (targetDate === today) return 'pending'; // Today is in progress; pending midnight
  return 'sober';
}

/**
 * Calculates full streak stats based on local calendar dates.
 * Today is pending and NEVER counted toward currentStreak until midnight passes.
 */
export function calculateStreakStats(flame: FlameSettings, today: string): FlameStreakStats {
  const isRelapseToday = flame.relapses.some(r => r.date === today);
  const todayStat = isRelapseToday ? 'relapse' : 'pending';

  // Sort relapses chronologically
  const sortedRelapses = [...flame.relapses].sort((a, b) => a.date.localeCompare(b.date));

  // Determine current streak and streak key
  let currentStreak = 0;
  let streakKey = flame.startDate;

  if (isRelapseToday) {
    currentStreak = 0;
    // Tomorrow will be day 0 of a new streak key
    streakKey = addCalendarDays(today, 1);
  } else {
    // Look for latest relapse before today
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

  // Calculate longest streak across history
  // Intervals:
  // 1. startDate to first relapse
  // 2. Between each consecutive relapse
  // 3. Last relapse to today (or startDate to today if no relapses)
  const relapsesInRange = sortedRelapses.filter(r => r.date >= flame.startDate && r.date <= today);
  const streakIntervals: number[] = [];

  if (relapsesInRange.length === 0) {
    // No relapses: longest streak is completed days so far
    streakIntervals.push(Math.max(0, calendarDaysBetween(flame.startDate, today)));
  } else {
    // From start date to first relapse
    streakIntervals.push(Math.max(0, calendarDaysBetween(flame.startDate, relapsesInRange[0].date)));

    // Between consecutive relapses
    for (let i = 0; i < relapsesInRange.length - 1; i++) {
      const dayAfterFirst = addCalendarDays(relapsesInRange[i].date, 1);
      const nextRelapse = relapsesInRange[i + 1].date;
      streakIntervals.push(Math.max(0, calendarDaysBetween(dayAfterFirst, nextRelapse)));
    }

    // From last past relapse to today (if last relapse wasn't today)
    const lastPastRelapse = relapsesInRange.filter(r => r.date < today).pop();
    if (lastPastRelapse) {
      const dayAfterLast = addCalendarDays(lastPastRelapse.date, 1);
      streakIntervals.push(Math.max(0, calendarDaysBetween(dayAfterLast, today)));
    }
  }

  const longestStreak = Math.max(currentStreak, ...streakIntervals, 0);

  // Total completed days strictly before today
  const totalDaysPossible = Math.max(0, calendarDaysBetween(flame.startDate, today));
  // Total relapse days strictly before today
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

/**
 * Records a slip event.
 * If targetDate is omitted, defaults to today.
 * Can record slips for today or any of the past 7 days.
 */
export function recordRelapse(
  flame: FlameSettings, 
  today: string, 
  targetDate?: string, 
  trigger?: string
): FlameSettings {
  const date = targetDate || today;
  const daysDiff = calendarDaysBetween(date, today);

  // Only allow slips within today and past 7 days (not future, not older than 7 days)
  if (daysDiff < 0 || daysDiff > 7) {
    return flame;
  }

  const existingIdx = flame.relapses.findIndex(r => r.date === date);
  let updatedRelapses: FlameRelapseEntry[];

  if (existingIdx >= 0) {
    updatedRelapses = [...flame.relapses];
    updatedRelapses[existingIdx] = { date, at: Date.now(), trigger };
  } else {
    updatedRelapses = [...flame.relapses, { date, at: Date.now(), trigger }];
  }

  // Recalculate stats to determine new streak key
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

/**
 * Removes a slip record (Undo today's slip or adjust past 7 days).
 */
export function unmarkRelapse(
  flame: FlameSettings, 
  dateToUnmark: string, 
  today: string
): FlameSettings {
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

/**
 * Catch-up on app open / resume:
 * Updates celebrations state and triggers at most ONE celebration:
 * the highest uncelebrated milestone (multiple of 10) not in celebrations.done.
 * Marks ALL crossed milestones as done so they never re-trigger.
 */
export function catchUpCelebrations(
  flame: FlameSettings, 
  today: string
): { updatedFlame: FlameSettings; celebrationMilestone: number | null } {
  const stats = calculateStreakStats(flame, today);
  const streakKey = stats.streakKey;

  let currentDone = flame.celebrations.done || [];
  // If streakKey changed (e.g. after a reset), restart milestones
  if (flame.celebrations.streakKey !== streakKey) {
    currentDone = [];
  }

  // Find all multiples of 10 up to currentStreak
  const crossedMilestones: number[] = [];
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

  // Trigger at most one: highest unseen milestone
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

/**
 * Picks a meaningful phrase for a given milestone.
 * Pool A: IDs 1-8 (milestones 10, 20, 30, 40)
 * Pool B: IDs 9-12 (milestones 50+)
 * Never repeats within the last 6 phrases in phraseHistory.
 */
export function pickMilestonePhrase(
  milestone: number, 
  phraseHistory: number[] = []
): { id: number; pool: 'A' | 'B' } {
  const isPoolA = milestone < 50;
  const eligibleIds = isPoolA ? [1, 2, 3, 4, 5, 6, 7, 8] : [9, 10, 11, 12];
  const recentHistory = phraseHistory.slice(-6);

  const candidateIds = eligibleIds.filter(id => !recentHistory.includes(id));
  const pool = candidateIds.length > 0 ? candidateIds : eligibleIds;

  const pickedId = pool[Math.floor(Math.random() * pool.length)];
  return { id: pickedId, pool: isPoolA ? 'A' : 'B' };
}

/**
 * Saves a milestone phrase into user's "Words you earned".
 */
export function saveMilestonePhrase(
  flame: FlameSettings,
  phrase: { id: number; text: string; milestone: number },
  today: string
): FlameSettings {
  const existing = flame.savedPhrases || [];
  if (existing.some(p => p.id === phrase.id && p.milestone === phrase.milestone)) {
    return flame;
  }

  const newEntry: FlameSavedPhrase = {
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

/**
 * Tri-lingual ICU Plural Formatter for Flame Days (EN, FR, AR).
 * Arabic supports all 6 CLDR plural forms: zero, one, two, few, many, other.
 */
export function formatFlameDays(count: number, lang: 'en' | 'fr' | 'ar' = 'en'): string {
  const pr = new Intl.PluralRules(lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US');
  const rule = pr.select(count);

  switch (lang) {
    case 'ar':
      switch (rule) {
        case 'zero': return '٠ يوم';
        case 'one': return 'يوم واحد';
        case 'two': return 'يومان';
        case 'few': return `${count} أيام`;
        case 'many': return `${count} يومًا`;
        default: return `${count} يوم`;
      }
    case 'fr':
      return rule === 'one' ? `${count} jour` : `${count} jours`;
    case 'en':
    default:
      return rule === 'one' ? `${count} day` : `${count} days`;
  }
}

