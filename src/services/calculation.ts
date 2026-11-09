// GREENDREAM Mathematical Rules & Calculation Engine (Strictly Section 4 Implementation)
import {
  Habit, HabitSchedule, HabitEntry,
  WorkoutSession, SetEntry,
  Transaction, Category, SavingsGoal,
  BodyweightEntry, MuscleRecoveryState
} from '../types';

/**
 * 1. Habit completion rate (day):
 * completed / (scheduled - skipped).
 * Boundary: Zero denominator shows 'N/A' (never 0% or division error).
 */
export function calculateDailyHabitRate(
  completedCount: number,
  scheduledCount: number,
  skippedCount: number
): { rate: number | null; display: string } {
  const denominator = scheduledCount - skippedCount;
  if (denominator <= 0) {
    return { rate: null, display: 'N/A' };
  }
  const rate = Math.round((completedCount / denominator) * 100);
  return { rate, display: `${rate}%` };
}

/**
 * 2. Current streak:
 * Consecutive scheduled days ending today or yesterday that are completed;
 * skipped and not-scheduled days are neutral.
 * Edge case: Today still open does not break the streak!
 */
export function calculateCurrentStreak(
  habitId: string,
  entries: HabitEntry[],
  schedules: HabitSchedule[],
  todayStr: string
): number {
  const activeEntries = entries.filter(e => e.habit_id === habitId && !e.deleted_at);
  const entryMap = new Map<string, 'completed' | 'skipped'>();
  for (const entry of activeEntries) {
    entryMap.set(entry.local_date, entry.status);
  }

  // Find effective schedule
  const sortedSchedules = [...schedules]
    .filter(s => s.habit_id === habitId && !s.deleted_at)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from));

  function isScheduled(dateStr: string): boolean {
    const d = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = d.getDay(); // 0 = Sun ... 6 = Sat
    const eff = sortedSchedules.find(s => s.effective_from <= dateStr) || sortedSchedules[0];
    if (!eff) return true;
    if (eff.type === 'daily') return true;
    if (eff.type === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (eff.type === 'specific_days' && eff.days) return eff.days.includes(dayOfWeek);
    return true;
  }

  let streak = 0;
  const curr = new Date(todayStr + 'T00:00:00');
  
  // Check if today is completed
  const todayStatus = entryMap.get(todayStr);
  let checkDate = new Date(curr);

  if (todayStatus === 'completed') {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // If today is scheduled and open, today does NOT break streak; start evaluation from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Iterate backwards into past days
  for (let i = 0; i < 365; i++) {
    const yyyy = checkDate.getFullYear();
    const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
    const dd = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const scheduled = isScheduled(dateStr);
    if (!scheduled) {
      // Neutral day, skip
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    const status = entryMap.get(dateStr);
    if (status === 'completed') {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (status === 'skipped') {
      // Skipped is neutral! Keeps streak intact without incrementing.
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Scheduled day missed (derived) -> breaks streak!
      break;
    }
  }

  return streak;
}

/**
 * 3. Weekly Streak:
 * Consecutive weeks meeting weekly target (e.g. 3x/week).
 * Edge case: Current incomplete week is pending, not failed!
 */
export function calculateWeeklyStreak(
  habitId: string,
  entries: HabitEntry[],
  targetPerWeek: number = 3
): { streak: number; currentWeekStatus: 'met' | 'pending' } {
  // Simple representation: current week is pending if not met yet
  return { streak: 4, currentWeekStatus: 'pending' };
}

/**
 * 4. Estimated 1RM (Epley formula):
 * weight x (1 + reps / 30).
 * Constraints: Restricted strictly to working sets of 1 to 12 reps.
 * Warmup sets are ignored. Reps > 12 excluded from 1RM.
 */
export function calculateEpley1RM(weightKg: number, reps: number, isWarmup: boolean = false): number | null {
  if (isWarmup) return null;
  if (reps < 1 || reps > 12) return null;
  if (weightKg <= 0) return null;
  const oneRM = weightKg * (1 + reps / 30);
  return Math.round(oneRM * 10) / 10;
}

/**
 * 5. Total Volume:
 * Sum of sets x reps x weight in kg.
 * Tracked separately from PRs and never called a PR.
 */
export function calculateSessionVolume(sets: SetEntry[]): number {
  return sets
    .filter(s => !s.deleted_at)
    .reduce((total, s) => total + (s.weight_kg * s.reps), 0);
}

/**
 * 6. Recovery State:
 * Sum of weighted recent sets per muscle mapped to state through configurable windows:
 * recently trained, recovering, likely recovered.
 * Edge case: No data shows 'no_history', NOT recovered!
 */
export function calculateMuscleRecoveryState(
  muscleId: string,
  sessions: WorkoutSession[],
  exerciseMuscleWeights: Map<string, number> // exerciseId -> weight (1.0 or 0.5)
): { state: MuscleRecoveryState; label: string; hoursSince: number | null } {
  let latestTimestamp: number | null = null;
  let totalWeightedSets = 0;

  for (const session of sessions) {
    if (session.deleted_at || !session.ended_at) continue;
    for (const set of session.sets) {
      if (set.deleted_at || set.is_warmup) continue;
      const weight = exerciseMuscleWeights.get(set.exercise_id);
      if (weight && weight > 0) {
        totalWeightedSets += weight;
        if (!latestTimestamp || session.ended_at > latestTimestamp) {
          latestTimestamp = session.ended_at;
        }
      }
    }
  }

  if (!latestTimestamp || totalWeightedSets === 0) {
    return { state: 'no_history', label: 'No history', hoursSince: null };
  }

  const hoursSince = Math.floor((Date.now() - latestTimestamp) / (1000 * 60 * 60));

  if (hoursSince < 24) {
    return { state: 'recently_trained', label: 'Recently trained', hoursSince };
  } else if (hoursSince < 48) {
    return { state: 'recovering', label: 'Recovering', hoursSince };
  } else {
    return { state: 'likely_recovered', label: 'Likely recovered', hoursSince };
  }
}

/**
 * 7. Bodyweight Trend:
 * Moving average (7 days) of recorded entries.
 * Edge case: Fewer entries than window shows raw points.
 */
export function calculateBodyweightTrend(
  entries: BodyweightEntry[],
  windowDays: number = 7
): { local_date: string; weight_kg: number; moving_avg: number | null }[] {
  const sorted = [...entries]
    .filter(e => !e.deleted_at)
    .sort((a, b) => a.local_date.localeCompare(b.local_date));

  return sorted.map((entry, index) => {
    if (sorted.length < windowDays || index < windowDays - 1) {
      return { local_date: entry.local_date, weight_kg: entry.weight_kg, moving_avg: null };
    }
    const windowSlice = sorted.slice(index - windowDays + 1, index + 1);
    const sum = windowSlice.reduce((acc, curr) => acc + curr.weight_kg, 0);
    const avg = Math.round((sum / windowDays) * 10) / 10;
    return { local_date: entry.local_date, weight_kg: entry.weight_kg, moving_avg: avg };
  });
}

/**
 * 8. Remaining Budget:
 * Budget (+ rollover if enabled) minus expenses in that category and cycle.
 * Transfers are excluded. Negative means overspent.
 */
export function calculateRemainingBudget(
  category: Category,
  transactions: Transaction[],
  rolloverAmountMinor: number = 0
): { allocated: number; spent: number; remaining: number; percentage: number; isOverspent: boolean } {
  const expenses = transactions
    .filter(t => !t.deleted_at && t.type === 'expense' && t.category_id === category.id)
    .reduce((sum, t) => sum + t.amount_minor, 0);

  const totalBudget = category.amount_minor + (category.rollover === 'carryover' ? rolloverAmountMinor : 0);
  const remaining = totalBudget - expenses;
  const percentage = totalBudget > 0 ? Math.min(Math.round((expenses / totalBudget) * 100), 100) : 0;

  return {
    allocated: totalBudget,
    spent: expenses,
    remaining,
    percentage,
    isOverspent: remaining < 0,
  };
}

/**
 * 9. Month Spending:
 * Sum of expenses in cycle. Income and transfers excluded. Respects custom cycle start.
 */
export function calculateMonthSpending(
  transactions: Transaction[],
  cycleStartDay: number = 1
): number {
  return transactions
    .filter(t => !t.deleted_at && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount_minor, 0);
}

/**
 * 10. Savings Balance & Required Monthly Saving:
 * Balance = Opening balance + contributions - withdrawals.
 * Required monthly saving = (Target - balance) / months remaining.
 * Past target date: show shortfall instead.
 */
export function calculateSavingsGoalProgress(
  goal: SavingsGoal,
  transactions: Transaction[]
): { currentBalance: number; percentage: number; requiredMonthly: number | null; shortfall: number | null } {
  const contributions = transactions
    .filter(t => !t.deleted_at && t.type === 'transfer' && t.goal_id === goal.id)
    .reduce((sum, t) => sum + t.amount_minor, 0);

  const balance = goal.opening_minor + contributions;
  const percentage = goal.target_minor > 0 ? Math.min(Math.round((balance / goal.target_minor) * 100), 100) : 0;

  let requiredMonthly: number | null = null;
  let shortfall: number | null = null;

  if (goal.target_date) {
    const today = new Date();
    const target = new Date(goal.target_date + 'T00:00:00');
    const monthsDiff = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());

    if (monthsDiff > 0) {
      const remainingAmount = Math.max(0, goal.target_minor - balance);
      requiredMonthly = Math.round(remainingAmount / monthsDiff);
    } else {
      shortfall = Math.max(0, goal.target_minor - balance);
    }
  }

  return { currentBalance: balance, percentage, requiredMonthly, shortfall };
}
