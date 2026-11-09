// GreenDream Personal Assistant: Controlled Real Data Context & Action Proposal Parser
import { db, getTodayLocalDate, formatCurrency, generateUUID } from './storage';
import { calculateMonthSpending } from './calculation';
import { GymProgramService } from './gymProgramService';
import { getItemDueStatus } from './maintenanceService';
import { HermesLearningService } from './hermesLearningService';
import { AIAssistantPermissions, AssistantProposal } from '../types';

export const GreenDreamTools = {
  /**
   * Builds honest, real-data context from authorized GreenDream modules.
   * Only includes modules that have been permitted by the user.
   * Never fabricates figures or records.
   */
  getContext(permissions: AIAssistantPermissions): string {
    const state = db.getState();
    const today = getTodayLocalDate();
    const currency = state.settings.currency_label || 'DA';
    const lines: string[] = [];

    lines.push(`Current Local Date: ${today}`);
    lines.push(`User Name: ${state.settings.user_name || 'User'}`);
    lines.push(`Currency: ${currency}`);

    // 1. FINANCE MODULE
    if (permissions.finance_read) {
      lines.push('\n[FINANCE RECORDS]');
      const cycleDay = state.settings.budget_cycle_start_day || 1;
      const monthSpending = calculateMonthSpending(state.transactions, cycleDay);
      lines.push(`• Month Expenses (cycle start day ${cycleDay}): ${formatCurrency(monthSpending, currency)}`);

      // Salary & Savings
      if (state.salarySetting) {
        lines.push(`• Monthly Base Salary: ${formatCurrency(state.salarySetting.monthly_salary_minor, currency)}`);
      }
      if (state.savingsAccount) {
        lines.push(`• Total Savings Account Balance: ${formatCurrency(state.savingsAccount.current_balance_minor, currency)}`);
      }

      // Money Lent (Loans)
      const loans = (state.loans || []).filter(l => !l.deleted_at);
      const activeLoans = loans.filter(l => {
        const repaid = (l.repayments || []).filter(r => !r.deleted_at).reduce((s, r) => s + r.amount_minor, 0);
        return l.amount_minor > repaid;
      });
      if (activeLoans.length > 0) {
        const loanSummaries = activeLoans.map(l => {
          const repaid = (l.repayments || []).filter(r => !r.deleted_at).reduce((s, r) => s + r.amount_minor, 0);
          return `${l.borrower_name}: ${formatCurrency(l.amount_minor - repaid, currency)} remaining`;
        }).join(', ');
        lines.push(`• Active Money Lent: ${loanSummaries}`);
      } else {
        lines.push(`• Active Money Lent: 0 (No outstanding loans)`);
      }

      // Savings Goals
      const activeGoals = (state.savingsGoals || []).filter(g => !g.deleted_at && g.status === 'active');
      if (activeGoals.length > 0) {
        const goalSummaries = activeGoals.map(g => {
          const saved = g.current_saved_minor || g.opening_minor || 0;
          return `"${g.name}": saved ${formatCurrency(saved, currency)} of target ${formatCurrency(g.target_minor, currency)}`;
        }).join('; ');
        lines.push(`• Active Savings Goals: ${goalSummaries}`);
      }
    }

    // 2. GYM MODULE
    if (permissions.gym_read) {
      lines.push('\n[GYM & TRAINING RECORDS]');
      const nextWorkout = GymProgramService.getNextWorkout();
      lines.push(`• Active Program: ${nextWorkout.programName}`);
      lines.push(`• Next Scheduled Workout: ${nextWorkout.dayName} (${nextWorkout.targetMuscles.join(', ')})`);

      // Latest bodyweight
      const bwEntries = (state.bodyweightEntries || []).filter(b => !b.deleted_at);
      if (bwEntries.length > 0) {
        const latestBw = bwEntries[bwEntries.length - 1];
        lines.push(`• Latest Bodyweight: ${latestBw.weight_kg} kg (logged on ${latestBw.local_date})`);
      }
    }

    // 3. TASKS MODULE
    if (permissions.tasks_read) {
      lines.push('\n[TASKS & SCHEDULE]');
      const todayTasks = (state.tasks || []).filter(t => !t.deleted_at && t.due_date === today);
      const overdueTasks = (state.tasks || []).filter(t => !t.deleted_at && !t.done && t.due_date && t.due_date < today);

      if (todayTasks.length > 0) {
        const taskList = todayTasks.map(t => `${t.done ? '[Done]' : '[Pending]'} ${t.title} (${t.due_time || 'No time'})`).join('; ');
        lines.push(`• Tasks Today (${today}): ${taskList}`);
      } else {
        lines.push(`• Tasks Today: None scheduled`);
      }

      if (overdueTasks.length > 0) {
        const overdueList = overdueTasks.map(t => `${t.title} (was due ${t.due_date})`).join('; ');
        lines.push(`• OVERDUE Tasks: ${overdueList}`);
      }
    }

    // 4. DAILY PRAYERS MODULE
    if (permissions.prayers_read) {
      lines.push('\n[PRAYER RECORDS]');
      const todayPrayers = (state.prayers || []).filter(p => !p.deleted_at && p.local_date === today);
      const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      const statusList = prayerNames.map(name => {
        const record = todayPrayers.find(p => p.prayer === name);
        return `${name}: ${record?.completed ? 'Completed' : 'Pending'}`;
      }).join(', ');
      lines.push(`• Today's Prayers: ${statusList}`);
    }

    // 5. MAINTENANCE MODULE
    if (permissions.maintenance_read) {
      lines.push('\n[MAINTENANCE & PERSONAL CARE]');
      const items = (state.maintenanceItems || []).filter(i => !i.deleted_at);
      const dueOrUpcoming = items.map(item => {
        const status = getItemDueStatus(item);
        return `"${item.name}" (${item.category}): next reminder ${item.next_reminder_date} [${status.badgeText}]`;
      }).slice(0, 5).join('; ');

      if (dueOrUpcoming) {
        lines.push(`• Maintenance Reminders: ${dueOrUpcoming}`);
      }
    }

    // 6. HERMES ADAPTIVE LEARNINGS & BEHAVIORAL PROFILE
    try {
      lines.push(HermesLearningService.getSystemContext());
    } catch {}

    return lines.join('\n');
  },

  /**
   * Scans AI assistant text for action proposal commands (<<<PROPOSAL:{...}>>>)
   * If found, extracts and creates a formal typed AssistantProposal.
   * Strips the raw proposal command from the user-visible reply text.
   */
  parseProposalFromText(rawText: string, userSourceText: string): { cleanText: string; proposal: AssistantProposal | null } {
    const regex = /<<<PROPOSAL:\s*({[\s\S]*?})\s*>>>/;
    const match = rawText.match(regex);

    if (!match) {
      return { cleanText: rawText, proposal: null };
    }

    try {
      const parsedJson = JSON.parse(match[1]);
      const cleanText = rawText.replace(regex, '').trim();
      const now = Date.now();

      const proposal: AssistantProposal = {
        id: generateUUID(),
        action_type: parsedJson.action_type || 'create_expense',
        payload: parsedJson.payload || {},
        source_text: userSourceText,
        status: 'pending',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      return { cleanText, proposal };
    } catch (e) {
      console.warn('[AI] Could not parse action proposal JSON:', e);
      return { cleanText: rawText, proposal: null };
    }
  }
};
