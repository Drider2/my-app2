// ========================================================
// Hermes Learning & Memory Engine for GreenDream
// Inspired by Nous Research Hermes closed learning loop:
// Synthesizes habits, finance, prayers, workouts, and agenda
// into persistent adaptive behavioral memory and proactive nudges.
// ========================================================
import { db, getTodayLocalDate, formatCurrency } from './storage';
import { calculateMonthSpending } from './calculation';
import { GymProgramService } from './gymProgramService';
import { DailyProgressService } from './dailyProgressService';
import { QuickExpenseService } from './quickExpenseService';

export interface HermesLearnedProfile {
  headline: string;
  smartNudge: string;
  insights: string[];
  recommendedPrompts: string[];
  disciplineRating: 'exceptional' | 'strong' | 'developing';
  scoreOutOf10: number;
  lastUpdated: number;
}

export const HermesLearningService = {
  /**
   * Analyzes live user data across all modules and extracts
   * synthesized behavioral patterns, streaks, and proactive nudges.
   */
  getProfile(): HermesLearnedProfile {
    const state = db.getState();
    const today = getTodayLocalDate();
    const currency = state.settings.currency_label || 'DA';

    // 1. Daily Progress & Discipline
    const progress = DailyProgressService.getDailyProgress(today);
    const score = progress.total_score;

    // 2. Spiritual Rhythm (Prayers)
    const todayPrayers = (state.prayers || []).filter(p => !p.deleted_at && p.local_date === today);
    const completedPrayers = todayPrayers.filter(p => p.completed).length;

    // 3. Financial Velocity & Budget Adherence
    const cycleDay = state.settings.budget_cycle_start_day || 1;
    const monthSpending = calculateMonthSpending(state.transactions, cycleDay);
    const todaySpending = QuickExpenseService.getTodaySpendingSummary();
    const allowanceMinor = progress.spending_allowance_minor;
    const isBudgetSafe = todaySpending.totalMinor <= allowanceMinor;
    const remainingToday = Math.max(0, allowanceMinor - todaySpending.totalMinor);

    // 4. Fitness Cadence
    const nextWorkout = GymProgramService.getNextWorkout();
    const bwEntries = (state.bodyweightEntries || []).filter(b => !b.deleted_at);
    const latestBw = bwEntries.length > 0 ? bwEntries[bwEntries.length - 1].weight_kg : null;

    // 5. Productivity (Tasks & Habits)
    const todayTasks = (state.tasks || []).filter(t => !t.deleted_at && t.due_date === today);
    const completedTasks = todayTasks.filter(t => t.done).length;
    const activeHabits = (state.habits || []).filter(h => !h.archived && !h.deleted_at);
    const completedHabits = (state.habitEntries || []).filter(
      e => e.local_date === today && e.status === 'completed' && !e.deleted_at
    ).length;

    // Synthesize Insights
    const insights: string[] = [];

    // Spiritual insight
    if (completedPrayers === 5) {
      insights.push('All 5 daily prayers completed on schedule with consistent spiritual discipline.');
    } else if (completedPrayers > 0) {
      insights.push(`${completedPrayers} of 5 prayers fulfilled today. Spiritual rhythm active.`);
    } else {
      insights.push('Morning routine starting. Early prayers set the tone for focus and clarity.');
    }

    // Financial insight
    if (isBudgetSafe) {
      insights.push(
        `Discretionary spending is well controlled: ${formatCurrency(todaySpending.totalMinor, currency)} used of ${formatCurrency(allowanceMinor, currency)} safe allowance.`
      );
    } else {
      insights.push(
        `Daily spending exceeded safe allowance by ${formatCurrency(todaySpending.totalMinor - allowanceMinor, currency)}. Compensate tomorrow to preserve month savings.`
      );
    }

    // Fitness insight
    if (nextWorkout && nextWorkout.dayName !== 'Rest') {
      insights.push(
        `Training active: ${nextWorkout.programName} (${nextWorkout.dayName}) targeting ${nextWorkout.targetMuscles.join(', ')}.`
      );
    } else {
      insights.push('Active recovery or rest day. Focus on hydration, mobility, and muscle repair.');
    }

    // Productivity insight
    if (todayTasks.length > 0) {
      insights.push(
        `${completedTasks}/${todayTasks.length} daily agenda tasks completed (${Math.round((completedTasks / todayTasks.length) * 100)}% execution).`
      );
    }
    if (activeHabits.length > 0) {
      insights.push(`${completedHabits}/${activeHabits.length} recurring habits logged today.`);
    }

    // Determine Rating
    const disciplineRating: 'exceptional' | 'strong' | 'developing' =
      score >= 8 ? 'exceptional' : score >= 5 ? 'strong' : 'developing';

    // Formulate Contextual Smart Nudge
    let smartNudge = '';
    const currentHour = new Date().getHours();

    if (currentHour < 12) {
      // Morning
      if (completedPrayers >= 1) {
        smartNudge = `Morning discipline active. Safe budget for today: ${formatCurrency(remainingToday, currency)}.`;
      } else {
        smartNudge = `Start the morning with Fajr and check your agenda tasks to build momentum.`;
      }
    } else if (currentHour < 18) {
      // Afternoon
      if (isBudgetSafe && score >= 5) {
        smartNudge = `Strong day so far: score ${score}/10. ${formatCurrency(remainingToday, currency)} safe to spend.`;
      } else {
        smartNudge = `Midday check-in: ${todayTasks.length - completedTasks} tasks remaining. Maintain budget control.`;
      }
    } else {
      // Evening
      if (score >= 8) {
        smartNudge = `Exceptional discipline today (${score}/10). All key routines successfully protected.`;
      } else {
        smartNudge = `Evening reflection: wrap up pending prayers and log remaining expenses for today.`;
      }
    }

    // Dynamic Suggested Prompts for Gemini
    const recommendedPrompts: string[] = [
      `Analyze my discipline score today (${score}/10)`,
      `How much safe budget do I have left?`,
      nextWorkout ? `Tips for my ${nextWorkout.dayName} session` : `How to optimize my rest day`,
      `Review my weekly habit streak`,
    ];

    const headline =
      disciplineRating === 'exceptional'
        ? 'High-performance flow state'
        : disciplineRating === 'strong'
        ? 'Consistent daily momentum'
        : 'Building daily discipline';

    return {
      headline,
      smartNudge,
      insights,
      recommendedPrompts,
      disciplineRating,
      scoreOutOf10: score,
      lastUpdated: Date.now(),
    };
  },

  /**
   * Produces a compact, formatted Hermes memory block to be injected
   * directly into the AI system context.
   */
  getSystemContext(): string {
    const profile = this.getProfile();
    const lines = [
      '\n[HERMES LEARNED BEHAVIORAL PROFILE & MEMORY]',
      `• User Baseline: ${profile.headline} (Current Score: ${profile.scoreOutOf10}/10, Rating: ${profile.disciplineRating.toUpperCase()})`,
      `• Proactive Nudge: "${profile.smartNudge}"`,
      '• Key Behavioral Observations:',
      ...profile.insights.map(i => `  - ${i}`),
    ];
    return lines.join('\n');
  },
};
