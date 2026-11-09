// Weekly Review Aggregation, Comparison & Reflection Service
import { db, generateUUID, getTodayLocalDate } from './storage';
import { calculateSessionVolume } from './calculation';
import { 
  Task, 
  WorkoutSession, 
  PrayerEntry, 
  Transaction, 
  MaintenanceItem, 
  WeeklyReflection, 
  WeeklyPlan 
} from '../types';

export interface WeeklyReviewMetrics {
  weekId: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  label: string;      // e.g. "Oct 26 – Nov 01, 2026"

  // Personal Organization
  tasks: {
    completedCount: number;
    totalCreated: number;
    overdueCount: number;
    completionRate: number;
    items: Task[];
  };

  // Fitness
  fitness: {
    workoutCount: number;
    workoutDays: string[];
    totalVolumeKg: number;
    avgBodyweightKg: number | null;
    bodyweightChangeKg: number | null;
    sessions: WorkoutSession[];
  };

  // Daily Prayers
  prayers: {
    completedCount: number;
    totalPossible: number; // 35 (5 prayers * 7 days)
    completionPercentage: number;
    unrecordedCount: number;
  };

  // Finance
  finance: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    savingsDepositedMinor: number;
    moneyLentMinor: number;
    loansRepaidMinor: number;
    topExpenseCategories: { name: string; amountMinor: number }[];
  };

  // Personal Maintenance & Shopping
  maintenance: {
    completedCount: number;
    upcomingNextWeekCount: number;
    completedItems: MaintenanceItem[];
    upcomingItems: MaintenanceItem[];
  };

  // Derived Insights
  insights: string[];
}

export interface WeeklyComparison {
  workoutCountDelta: number;
  totalVolumeDeltaKg: number;
  totalExpenseDeltaMinor: number;
  tasksCompletedDelta: number;
  prayerPercentageDelta: number;
  bodyweightDeltaKg: number | null;
}

/**
 * Helper to compute ISO week string (e.g. '2026-W45') and date range
 */
export function getISOWeekInfo(offsetWeeks: number = 0): {
  weekId: string;
  startDate: string;
  endDate: string;
  label: string;
  dates: string[];
} {
  const now = new Date();
  // Adjust by offset weeks
  now.setDate(now.getDate() - (offsetWeeks * 7));

  // Determine Monday of this week (1 = Monday, 0 = Sunday)
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Format YYYY-MM-DD
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  const startDate = formatDate(monday);
  const endDate = formatDate(sunday);

  // Calculate ISO week number
  const target = new Date(monday.valueOf());
  const dayNr = (monday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const weekId = `${monday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  // Month names for label
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = `${monthNames[monday.getMonth()]} ${monday.getDate()} – ${monthNames[sunday.getMonth()]} ${sunday.getDate()}`;

  // All 7 dates array
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }

  return { weekId, startDate, endDate, label, dates };
}

export const WeeklyReviewService = {
  /**
   * Aggregates metrics for a given week offset (0 = current week, 1 = previous week)
   */
  getWeeklyMetrics(offsetWeeks: number = 1): WeeklyReviewMetrics {
    const state = db.getState();
    const { weekId, startDate, endDate, label, dates } = getISOWeekInfo(offsetWeeks);

    // 1. Organization & Tasks
    const weekTasks = (state.tasks || []).filter(t => !t.deleted_at && t.due_date && t.due_date >= startDate && t.due_date <= endDate);
    const completedTasks = weekTasks.filter(t => t.done);
    const overdueTasks = (state.tasks || []).filter(t => !t.deleted_at && !t.done && t.due_date && t.due_date < getTodayLocalDate());
    const completionRate = weekTasks.length > 0 ? Math.round((completedTasks.length / weekTasks.length) * 100) : 0;

    // 2. Fitness & Training
    const weekSessions = (state.workoutSessions || []).filter(s => !s.deleted_at && s.local_date >= startDate && s.local_date <= endDate);
    const workoutDaysSet = new Set(weekSessions.map(s => s.local_date));
    let totalVolumeKg = 0;
    for (const session of weekSessions) {
      totalVolumeKg += calculateSessionVolume(session.sets || []);
    }

    // Bodyweight
    const weekWeights = (state.bodyweightEntries || []).filter(b => !b.deleted_at && b.local_date >= startDate && b.local_date <= endDate);
    const avgBodyweightKg = weekWeights.length > 0 
      ? Math.round((weekWeights.reduce((sum, b) => sum + b.weight_kg, 0) / weekWeights.length) * 10) / 10 
      : null;

    // 3. Daily Prayers (5 per day * 7 = 35)
    const weekPrayers = (state.prayers || []).filter(p => !p.deleted_at && p.local_date >= startDate && p.local_date <= endDate);
    const completedPrayers = weekPrayers.filter(p => p.completed).length;
    const totalPossiblePrayers = 35;
    const prayerPercentage = Math.round((completedPrayers / totalPossiblePrayers) * 100);
    const unrecordedPrayers = Math.max(0, totalPossiblePrayers - completedPrayers);

    // 4. Finance
    let totalIncomeMinor = 0;
    let totalExpenseMinor = 0;
    let savingsDepositedMinor = 0;
    let moneyLentMinor = 0;
    let loansRepaidMinor = 0;
    const catSpendMap = new Map<string, number>();

    for (const tx of (state.transactions || [])) {
      if (tx.deleted_at) continue;
      if (tx.local_date >= startDate && tx.local_date <= endDate) {
        if (tx.type === 'income') {
          totalIncomeMinor += tx.amount_minor;
        } else if (tx.type === 'expense') {
          totalExpenseMinor += tx.amount_minor;
          const cId = tx.category_id || 'other';
          catSpendMap.set(cId, (catSpendMap.get(cId) || 0) + tx.amount_minor);
        } else if (tx.type === 'transfer' && tx.goal_id) {
          savingsDepositedMinor += tx.amount_minor;
        } else if (tx.type === 'loan_given') {
          moneyLentMinor += tx.amount_minor;
        } else if (tx.type === 'loan_repayment') {
          loansRepaidMinor += tx.amount_minor;
        }
      }
    }

    const topExpenseCategories = Array.from(catSpendMap.entries()).map(([catId, amountMinor]) => {
      const cat = (state.categories || []).find(c => c.id === catId);
      return {
        name: cat ? cat.name : 'General',
        amountMinor,
      };
    }).sort((a, b) => b.amountMinor - a.amountMinor);

    // 5. Personal Maintenance & Care
    const completedMaint = (state.maintenanceItems || []).filter(item => 
      !item.deleted_at && 
      item.last_service_date && 
      item.last_service_date >= startDate && 
      item.last_service_date <= endDate
    );

    // Upcoming next 7 days from end of this week
    const upcomingNextWeek = (state.maintenanceItems || []).filter(item => 
      !item.deleted_at && 
      !item.is_purchased && 
      item.status !== 'completed' &&
      item.next_reminder_date > endDate
    ).slice(0, 5);

    // 6. Honest, Derived Weekly Insights (Non-judgmental, factual)
    const insights: string[] = [];

    if (weekSessions.length > 0) {
      insights.push(`Completed ${weekSessions.length} training session${weekSessions.length > 1 ? 's' : ''} across ${workoutDaysSet.size} days, logging ${Math.round(totalVolumeKg).toLocaleString()} kg total training volume.`);
    } else {
      insights.push('No gym sessions logged during this review period.');
    }

    if (totalExpenseMinor > 0) {
      const topCat = topExpenseCategories[0];
      insights.push(`Recorded ${Math.round(totalExpenseMinor / 100).toLocaleString()} DA in variable expenses, with ${topCat ? topCat.name : 'general spending'} representing the largest portion.`);
    }

    if (completedPrayers > 0) {
      insights.push(`Logged ${completedPrayers} of 35 daily prayers (${prayerPercentage}% on-time consistency).`);
    }

    if (savingsDepositedMinor > 0) {
      insights.push(`Transferred ${Math.round(savingsDepositedMinor / 100).toLocaleString()} DA toward long-term savings reserves.`);
    }

    if (completedTasks.length > 0) {
      insights.push(`Cleared ${completedTasks.length} scheduled task${completedTasks.length > 1 ? 's' : ''} on your priority list.`);
    }

    return {
      weekId,
      startDate,
      endDate,
      label,
      tasks: {
        completedCount: completedTasks.length,
        totalCreated: weekTasks.length,
        overdueCount: overdueTasks.length,
        completionRate,
        items: weekTasks,
      },
      fitness: {
        workoutCount: weekSessions.length,
        workoutDays: Array.from(workoutDaysSet),
        totalVolumeKg,
        avgBodyweightKg,
        bodyweightChangeKg: null, // calculated in comparison
        sessions: weekSessions,
      },
      prayers: {
        completedCount: completedPrayers,
        totalPossible: totalPossiblePrayers,
        completionPercentage: prayerPercentage,
        unrecordedCount: unrecordedPrayers,
      },
      finance: {
        totalIncomeMinor,
        totalExpenseMinor,
        savingsDepositedMinor,
        moneyLentMinor,
        loansRepaidMinor,
        topExpenseCategories,
      },
      maintenance: {
        completedCount: completedMaint.length,
        upcomingNextWeekCount: upcomingNextWeek.length,
        completedItems: completedMaint,
        upcomingItems: upcomingNextWeek,
      },
      insights,
    };
  },

  /**
   * Compares two week periods (typically current week vs previous week)
   */
  compareWeeks(currentOffset: number = 0, previousOffset: number = 1): WeeklyComparison {
    const current = this.getWeeklyMetrics(currentOffset);
    const prev = this.getWeeklyMetrics(previousOffset);

    const workoutCountDelta = current.fitness.workoutCount - prev.fitness.workoutCount;
    const totalVolumeDeltaKg = current.fitness.totalVolumeKg - prev.fitness.totalVolumeKg;
    const totalExpenseDeltaMinor = current.finance.totalExpenseMinor - prev.finance.totalExpenseMinor;
    const tasksCompletedDelta = current.tasks.completedCount - prev.tasks.completedCount;
    const prayerPercentageDelta = current.prayers.completionPercentage - prev.prayers.completionPercentage;
    
    let bodyweightDeltaKg: number | null = null;
    if (current.fitness.avgBodyweightKg && prev.fitness.avgBodyweightKg) {
      bodyweightDeltaKg = Math.round((current.fitness.avgBodyweightKg - prev.fitness.avgBodyweightKg) * 10) / 10;
    }

    return {
      workoutCountDelta,
      totalVolumeDeltaKg,
      totalExpenseDeltaMinor,
      tasksCompletedDelta,
      prayerPercentageDelta,
      bodyweightDeltaKg,
    };
  },

  /**
   * Gets reflection for a given week
   */
  getReflection(weekId: string): WeeklyReflection | null {
    const state = db.getState();
    return (state.weeklyReflections || []).find(r => !r.deleted_at && r.week_id === weekId) || null;
  },

  /**
   * Saves or updates reflection for a week
   */
  saveReflection(params: {
    weekId: string;
    startDate: string;
    endDate: string;
    whatWentWell: string;
    whatToImprove: string;
    topPriority: string;
  }): WeeklyReflection {
    const now = Date.now();
    let updated: WeeklyReflection;

    db.updateState(draft => {
      if (!draft.weeklyReflections) draft.weeklyReflections = [];
      const existingIndex = draft.weeklyReflections.findIndex(r => r.week_id === params.weekId && !r.deleted_at);

      if (existingIndex >= 0) {
        draft.weeklyReflections[existingIndex] = {
          ...draft.weeklyReflections[existingIndex],
          what_went_well: params.whatWentWell,
          what_to_improve: params.whatToImprove,
          top_priority: params.topPriority,
          updated_at: now,
        };
        updated = draft.weeklyReflections[existingIndex];
      } else {
        const newRefl: WeeklyReflection = {
          id: generateUUID(),
          week_id: params.weekId,
          start_date: params.startDate,
          end_date: params.endDate,
          what_went_well: params.whatWentWell,
          what_to_improve: params.whatToImprove,
          top_priority: params.topPriority,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };
        draft.weeklyReflections.unshift(newRefl);
        updated = newRefl;
      }
    });

    return updated!;
  },

  /**
   * Gets weekly plan for a given week
   */
  getPlan(weekId: string): WeeklyPlan | null {
    const state = db.getState();
    return (state.weeklyPlans || []).find(p => !p.deleted_at && p.week_id === weekId) || null;
  },

  /**
   * Saves or updates weekly plan
   */
  savePlan(params: {
    weekId: string;
    selectedTaskIds: string[];
    topPriorities: string[];
    scheduledWorkoutDays: number[];
    notes?: string;
  }): WeeklyPlan {
    const now = Date.now();
    let updated: WeeklyPlan;

    db.updateState(draft => {
      if (!draft.weeklyPlans) draft.weeklyPlans = [];
      const existingIndex = draft.weeklyPlans.findIndex(p => p.week_id === params.weekId && !p.deleted_at);

      if (existingIndex >= 0) {
        draft.weeklyPlans[existingIndex] = {
          ...draft.weeklyPlans[existingIndex],
          selected_task_ids: params.selectedTaskIds,
          top_priorities: params.topPriorities,
          scheduled_workout_days: params.scheduledWorkoutDays,
          notes: params.notes,
          updated_at: now,
        };
        updated = draft.weeklyPlans[existingIndex];
      } else {
        const newPlan: WeeklyPlan = {
          id: generateUUID(),
          week_id: params.weekId,
          selected_task_ids: params.selectedTaskIds,
          top_priorities: params.topPriorities,
          scheduled_workout_days: params.scheduledWorkoutDays,
          notes: params.notes,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };
        draft.weeklyPlans.unshift(newPlan);
        updated = newPlan;
      }
    });

    return updated!;
  }
};
