// ========================================================
// Hermes Brain: SOUL Persona, Tool Calling & Execution Engine
// Implements:
// - SOUL prompt (direct, transparent, no filler, length matches ask)
// - Dynamic app context injection (date, user, currency, modules)
// - 11 Read tools with strict privacy enforcement
// - 7 Confirmed Write tools (Action Gate + 10s Undo)
// - Persistent Memory Notes from gd_hermes_notes
// ========================================================

import { db, generateUUID, getTodayLocalDate, formatCurrency } from './storage';
import { HermesStorage } from './hermesStorage';
import { calculateMonthSpending } from './calculation';
import { 
  getCycleRange,
  calculateSpentInCycle,
  calculateCycleBudget,
  calculateLeftBalance
} from './moneyDerivedStats';
import { FinanceService } from './financeService';
import { GymProgramService } from './gymProgramService';
import { PrayerService, PRAYER_NAMES } from './prayerService';
import { getItemDueStatus, completeMaintenanceItem, calculateNextDueDate } from './maintenanceService';
import { calculateStreakStats } from './flame/flameService';
import { 
  computeTodayPlanState, 
  calculateWeeklyStreak, 
  computeRangeMetrics, 
  generateWeekStrip, 
  calculateSessionVolume, 
  formatVolume, 
  formatWeight, 
  convertWeight 
} from './gymDerivedStats';
import { 
  HermesMode, 
  HermesShareContext, 
  Transaction, 
  BodyweightEntry, 
  Task, 
  MaintenanceItem, 
  SavingsGoal, 
  PrayerName
} from '../types';

export const HermesBrain = {
  /**
   * Constructs the SOUL System Instruction with context and memory notes
   */
  buildSystemPrompt(): string {
    const state = db.getState();
    const today = getTodayLocalDate();
    const userName = state.settings.user_name || 'Friend';
    const currency = state.settings.currency_label || 'DA';
    const weightUnit = state.settings.weight_unit || 'kg';
    const appModules = state.settings.modules || {};
    const settings = HermesStorage.getSettings();
    const shareContext = settings.shareContext || {};
    const memoryNotes = HermesStorage.getMemoryNotes();

    // Determine list of accessible modules
    const accessibleModules: string[] = [];
    if (appModules.finance !== false && shareContext.finance !== false) accessibleModules.push('Finance (budgets, expenses, goals)');
    if (appModules.gym !== false && shareContext.gym !== false) accessibleModules.push('Gym (workouts, programs, bodyweight)');
    if (appModules.prayer !== false && shareContext.prayer !== false) accessibleModules.push('Prayer (5 daily prayers, completion)');
    if (appModules.maintenance !== false && shareContext.maintenance !== false) accessibleModules.push('Maintenance (vehicle, hygiene, shopping)');
    if (appModules.calendar !== false && shareContext.calendar !== false) accessibleModules.push('Calendar (agenda, tasks, schedule)');
    if (appModules.journal !== false && shareContext.journal === true) accessibleModules.push('Journal (daily thoughts)');

    let prompt = `You are Hermes, an autonomous, highly capable personal operating system assistant for GreenDream.

[IDENTITY & SOUL PRINCIPLES]
- Tone: Direct, honest, concise, and transparent. Earned depth over shallow chatter.
- Zero Filler: NEVER use conversational filler like "Great question!", "Certainly!", "I would be happy to help", or repeat the user's prompt back to them. Get straight to the answer.
- Structure: When presenting multiple points or numerical comparisons, use clean markdown bullet points, bold headers, or markdown tables.
- Languages: Always reply in the language the user writes in (Arabic, French, or English).
- Privacy: All user data is strictly local and confidential.

[APP CONTEXT]
- User Name: ${userName}
- Today's Date: ${today}
- Currency: ${currency}
- Weight Unit: ${weightUnit}
- Accessible Modules: ${accessibleModules.length > 0 ? accessibleModules.join(', ') : 'None (Chat Only)'}
`;

    // Sober Flame Privacy Isolation (Only included if shareWithHermes === true)
    const flame = state.settings.flame;
    if (appModules.flame !== false && flame?.enabled !== false && flame?.shareWithHermes === true) {
      const flameStats = calculateStreakStats(flame, today);
      prompt += `\n[SOBER FLAME CONTEXT]\n- Sober Streak: ${flameStats.currentStreak} days (Status: ${flameStats.isRelapseToday ? 'slipped today' : 'active'}). If user discusses their streak or sobriety, be quiet, grounded, and encouraging without guilt or preachiness.\n`;
    }

    // Inject Persistent Memory Notes
    if (memoryNotes.length > 0) {
      prompt += `\n[HERMES PERSISTENT MEMORY NOTES]\n`;
      memoryNotes.slice(0, 15).forEach((n, idx) => {
        prompt += `${idx + 1}. ${n.content}\n`;
      });
      prompt += `Use these persistent facts to personalize your guidance.\n`;
    }

    // Mode Guidelines
    if (settings.hermesMode === 'read_and_act') {
      prompt += `\n[ACTION CAPABILITY]
You can propose actions (e.g. logging expenses, check off prayers, adding tasks) using the provided write tools.
When you call a write tool, the app presents an interactive confirmation card to the user. The action is ONLY committed after the user taps Confirm. Explain clearly what action you have prepared.`;
    }

    return prompt;
  },

  /**
   * Returns Gemini Function Declarations based on active mode and permitted modules
   */
  getToolDeclarations(mode?: HermesMode, shareContext?: HermesShareContext): any[] {
    const s = HermesStorage.getSettings();
    const activeMode = mode || s.hermesMode || 'read_data';
    const activeShare = shareContext || s.shareContext || {};
    const state = db.getState();
    const modules = state.settings.modules || {};

    if (activeMode === 'chat_only') {
      return [];
    }

    const declarations: any[] = [];

    // ========================================================
    // READ TOOLS
    // ========================================================

    // 1. get_today_summary (Always available if any module is active)
    declarations.push({
      name: 'get_today_summary',
      description: 'Returns a summary snapshot of today: discipline score, prayers completed, spending today vs allowance, and pending tasks.',
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    });

    // 2. Finance Read Tools
    if (modules.finance !== false && activeShare.finance !== false) {
      declarations.push({
        name: 'get_budget_status',
        description: 'Returns current cash balance, monthly salary, savings reserve, and spending in current budget cycle.',
        parameters: { type: 'OBJECT', properties: {} },
      });

      declarations.push({
        name: 'get_spending',
        description: 'Returns aggregated spending records within a timeframe (today, week, month, year) with top spending categories.',
        parameters: {
          type: 'OBJECT',
          properties: {
            range: { 
              type: 'STRING', 
              enum: ['today', 'week', 'month', 'year'], 
              description: 'Timeframe for spending calculation' 
            },
            category: { type: 'STRING', description: 'Optional category name filter' }
          },
          required: ['range']
        },
      });

      declarations.push({
        name: 'get_goals',
        description: 'Returns all active savings targets with current progress and target deadlines.',
        parameters: { type: 'OBJECT', properties: {} },
      });

      declarations.push({
        name: 'get_loans',
        description: 'Returns summary of money lent to friends or family and repayment progress.',
        parameters: { type: 'OBJECT', properties: {} },
      });
    }

    // 3. Gym Read Tools
    if (modules.gym !== false && activeShare.gym !== false) {
      declarations.push({
        name: 'get_workouts',
        description: 'Returns active gym program, next scheduled routine day, and recent completed workouts.',
        parameters: {
          type: 'OBJECT',
          properties: {
            limit: { type: 'INTEGER', description: 'Number of recent workouts to return (default 5)' }
          }
        },
      });

      declarations.push({
        name: 'get_weight_trend',
        description: 'Returns recent bodyweight entries and weight changes over the past 30 days.',
        parameters: {
          type: 'OBJECT',
          properties: {
            days: { type: 'INTEGER', description: 'Number of past days (default 30)' }
          }
        },
      });
    }

    // 4. Prayer Read Tools
    if (modules.prayer !== false && activeShare.prayer !== false) {
      declarations.push({
        name: 'get_prayers',
        description: 'Returns today 5 prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha), completion status, and next prayer countdown.',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING', description: 'Optional date YYYY-MM-DD. Defaults to today.' }
          }
        },
      });
    }

    // 5. Maintenance Read Tools
    if (modules.maintenance !== false && activeShare.maintenance !== false) {
      declarations.push({
        name: 'get_maintenance_due',
        description: 'Returns vehicle maintenance, hygiene cycles, and shopping items that are overdue or due soon.',
        parameters: { type: 'OBJECT', properties: {} },
      });
    }

    // 6. Calendar Read Tools
    if (modules.calendar !== false && activeShare.calendar !== false) {
      declarations.push({
        name: 'get_calendar',
        description: 'Returns scheduled tasks, deadlines, and agenda events for today or upcoming days.',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING', description: 'Optional date YYYY-MM-DD' }
          }
        },
      });
    }

    // 7. Memory Read Tools
    declarations.push({
      name: 'get_memory_notes',
      description: 'Reads all persistent personal facts and rules Hermes has saved about the user.',
      parameters: { type: 'OBJECT', properties: {} },
    });

    // ========================================================
    // WRITE TOOLS (Only in 'read_and_act' mode)
    // ========================================================
    if (activeMode === 'read_and_act') {
      if (modules.finance !== false && activeShare.finance !== false) {
        declarations.push({
          name: 'add_expense',
          description: 'Logs a new expense transaction. Requires explicit user confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              amount: { type: 'NUMBER', description: 'Expense amount in major currency units (e.g. 1500 for 1500 DA)' },
              note: { type: 'STRING', description: 'Description or merchant name of the expense' },
              category: { type: 'STRING', description: 'Optional category name (e.g. Food, Fuel, Rent, Transport)' },
              date: { type: 'STRING', description: 'Optional date YYYY-MM-DD. Defaults to today.' },
            },
            required: ['amount', 'note']
          }
        });

        declarations.push({
          name: 'add_income',
          description: 'Records incoming funds or salary. Requires explicit user confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              amount: { type: 'NUMBER', description: 'Income amount in major currency units' },
              note: { type: 'STRING', description: 'Source of income' },
              date: { type: 'STRING', description: 'Optional date YYYY-MM-DD. Defaults to today.' },
            },
            required: ['amount', 'note']
          }
        });

        declarations.push({
          name: 'create_goal',
          description: 'Creates a new savings goal. Requires explicit user confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'Name of the goal' },
              target_amount: { type: 'NUMBER', description: 'Target amount in major currency units' },
              target_date: { type: 'STRING', description: 'Optional target deadline date YYYY-MM-DD' }
            },
            required: ['title', 'target_amount']
          }
        });
      }

      if (modules.gym !== false && activeShare.gym !== false) {
        declarations.push({
          name: 'log_weight',
          description: 'Logs a bodyweight check-in. Requires explicit user confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              weight: { type: 'NUMBER', description: 'Weight value in current units (kg or lb)' },
              date: { type: 'STRING', description: 'Optional date YYYY-MM-DD' }
            },
            required: ['weight']
          }
        });
      }

      if (modules.prayer !== false && activeShare.prayer !== false) {
        declarations.push({
          name: 'mark_prayer',
          description: 'Marks a daily prayer as completed or pending. Requires explicit user confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              prayer: { 
                type: 'STRING', 
                enum: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'],
                description: 'Prayer name'
              },
              completed: { type: 'BOOLEAN', description: 'True if completed, false if uncompleted' }
            },
            required: ['prayer', 'completed']
          }
        });
      }

      if (modules.calendar !== false && activeShare.calendar !== false) {
        declarations.push({
          name: 'add_task',
          description: 'Adds a new task or reminder to the calendar agenda. Requires explicit user confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'Task title' },
              due_date: { type: 'STRING', description: 'Date YYYY-MM-DD. Defaults to today.' },
              due_time: { type: 'STRING', description: 'Optional time HH:mm' }
            },
            required: ['title']
          }
        });
      }

      if (modules.maintenance !== false && activeShare.maintenance !== false) {
        declarations.push({
          name: 'add_reminder',
          description: 'Adds a maintenance service reminder or shopping item. Requires explicit user confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Item name' },
              category: { type: 'STRING', enum: ['car_maintenance', 'personal_care', 'shopping'] },
              estimated_cost: { type: 'NUMBER', description: 'Estimated cost in major units' }
            },
            required: ['name', 'category']
          }
        });
      }

      // Memory Note Write
      declarations.push({
        name: 'save_memory_note',
        description: 'Saves a persistent personal fact about the user into Hermes long-term memory. Requires explicit user confirmation.',
        parameters: {
          type: 'OBJECT',
          properties: {
            content: { type: 'STRING', description: 'Fact or rule to remember' }
          },
          required: ['content']
        }
      });

      // Update App Setting (Safe Settings confirmation)
      declarations.push({
        name: 'update_setting',
        description: 'Proposes changing an app setting (e.g. currency_label, weight_unit, theme, speech_rate). Requires explicit user confirmation.',
        parameters: {
          type: 'OBJECT',
          properties: {
            setting_key: { type: 'STRING', description: 'The setting key to update (e.g. currency_label, weight_unit, theme, read_aloud)' },
            new_value: { type: 'STRING', description: 'Proposed new value' },
            reason: { type: 'STRING', description: 'Short reason for proposing this update' }
          },
          required: ['setting_key', 'new_value']
        }
      });
    }

    return [{ functionDeclarations: declarations }];
  },

  /**
   * Executes a READ tool against local app state
   */
  async executeReadTool(toolName: string, args: Record<string, any> = {}): Promise<any> {
    const state = db.getState();
    const today = getTodayLocalDate();
    const currency = state.settings.currency_label || 'DA';
    const hermesSettings = HermesStorage.getSettings();
    const isFinanceActive = state.settings.modules?.finance !== false && hermesSettings.shareContext?.finance !== false;

    switch (toolName) {
      case 'get_today_summary': {
        const prayersInfo = PrayerService.getPrayersForDate(today);
        const todayTxs = isFinanceActive
          ? (state.transactions || []).filter(t => t.local_date === today && !t.deleted_at && t.type === 'expense')
          : [];
        const spentTodayMinor = todayTxs.reduce((sum, t) => sum + t.amount_minor, 0);
        const pendingTasks = (state.tasks || []).filter(t => !t.deleted_at && !t.done && (t.due_date === today || (t.due_date && t.due_date < today)));

        const isGymActive = state.settings.modules?.gym !== false;
        let gymSummary: Record<string, any> = {};
        if (isGymActive) {
          const activeProg = GymProgramService.getActiveProgram();
          const wkStart = (state.settings.week_start_day ?? 1) as 0 | 1;
          const wtUnit = (state.settings.weight_unit as 'kg' | 'lb') || 'kg';
          const plan = computeTodayPlanState(state.workoutSessions || [], activeProg, state.bodyweightEntries || [], today, wtUnit);
          const streak = calculateWeeklyStreak(state.workoutSessions || [], activeProg, wkStart, today);

          gymSummary = {
            today_workout_state: plan.state,
            today_workout_label: plan.state === 'scheduled'
              ? `${plan.planName} (${plan.subtitle})`
              : plan.state === 'done'
              ? `Completed: ${plan.sessionName} (${plan.setsCount} sets, ${plan.volumeFormatted})`
              : plan.state === 'in_progress'
              ? `In progress: ${plan.session.name} (${plan.elapsedMinutes} min)`
              : plan.state === 'rest'
              ? `Rest day (Next: ${plan.nextWorkoutName} on ${plan.nextWeekday})`
              : 'No active workout routine',
            weekly_workout_streak_weeks: streak,
          };
        }

        return {
          date: today,
          prayers_completed: prayersInfo.completedCount,
          prayers_total: prayersInfo.totalCount,
          ...(isFinanceActive ? { spent_today: spentTodayMinor / 100, currency } : {}),
          pending_tasks_count: pendingTasks.length,
          ...gymSummary,
        };
      }

      case 'get_budget_status': {
        if (!isFinanceActive) {
          return { error: 'The Money/Finance module is currently disabled in settings.' };
        }
        const cycleDay = state.settings.budget_cycle_start_day || 1;
        const currentCycle = getCycleRange(0, cycleDay);
        const spentInCycleMinor = calculateSpentInCycle(state.transactions || [], currentCycle);
        const cycleBudgetMinor = calculateCycleBudget(state.categories || [], state.salarySetting, state.salaryAllocation);
        const availableCashMinor = FinanceService.getCashBalanceSummary().availableCashMinor;
        const savingsMinor = state.savingsAccount?.current_balance_minor || 0;
        const salaryMinor = state.salarySetting?.monthly_salary_minor || 0;

        return {
          available_cash: availableCashMinor / 100,
          monthly_salary: salaryMinor / 100,
          cycle_budget: cycleBudgetMinor != null ? cycleBudgetMinor / 100 : null,
          spent_this_cycle: spentInCycleMinor / 100,
          remaining_cycle: cycleBudgetMinor != null ? Math.max(0, (cycleBudgetMinor - spentInCycleMinor) / 100) : null,
          total_savings_balance: savingsMinor / 100,
          cycle_start_date: currentCycle.startDate,
          cycle_end_date: currentCycle.endDate,
          currency,
        };
      }

      case 'get_spending': {
        if (!isFinanceActive) {
          return { error: 'The Money/Finance module is currently disabled in settings.' };
        }
        const range = args.range || 'month';
        const categoryFilter = args.category?.toLowerCase();
        let txs = (state.transactions || []).filter(t => !t.deleted_at && t.type === 'expense');

        if (categoryFilter) {
          const cat = (state.categories || []).find(c => c.name.toLowerCase().includes(categoryFilter));
          if (cat) {
            txs = txs.filter(t => t.category_id === cat.id);
          }
        }

        const now = new Date();
        const cycleDay = state.settings.budget_cycle_start_day || 1;
        const currentCycle = getCycleRange(0, cycleDay);

        const filtered = txs.filter(t => {
          if (!t.local_date) return false;
          if (range === 'today') return t.local_date === today;
          if (range === 'week') {
            const txDate = new Date(t.local_date);
            const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
            return diffDays <= 7 && diffDays >= 0;
          }
          if (range === 'month') {
            return t.local_date >= currentCycle.startDate && t.local_date <= currentCycle.endDate;
          }
          if (range === 'year') {
            return t.local_date.startsWith(today.slice(0, 4));
          }
          return true;
        });

        const totalMinor = filtered.reduce((acc, t) => acc + t.amount_minor, 0);
        return {
          range,
          total_spent: totalMinor / 100,
          transaction_count: filtered.length,
          currency,
        };
      }

      case 'get_goals': {
        if (!isFinanceActive) {
          return { error: 'The Money/Finance module is currently disabled in settings.' };
        }
        const goals = (state.savingsGoals || []).filter(g => !g.deleted_at && g.status === 'active');
        return {
          active_goals: goals.map(g => {
            const savedMinor = g.current_saved_minor || g.opening_minor || 0;
            return {
              title: g.name,
              target_amount: g.target_minor / 100,
              saved_amount: savedMinor / 100,
              deadline: g.target_date || 'No deadline',
              progress_pct: g.target_minor > 0 ? Math.round((savedMinor / g.target_minor) * 100) : 0,
            };
          }),
          currency,
        };
      }

      case 'get_loans': {
        if (!isFinanceActive) {
          return { error: 'The Money/Finance module is currently disabled in settings.' };
        }
        const loans = (state.loans || []).filter(l => !l.deleted_at);
        const active = loans.map(l => {
          const repaidMinor = (l.repayments || []).filter(r => !r.deleted_at).reduce((s, r) => s + r.amount_minor, 0);
          return {
            borrower: l.borrower_name,
            original_lent: l.amount_minor / 100,
            repaid: repaidMinor / 100,
            balance_remaining: Math.max(0, l.amount_minor - repaidMinor) / 100,
          };
        }).filter(l => l.balance_remaining > 0);

        return {
          active_loans: active,
          currency,
        };
      }

      case 'get_workouts': {
        const activeProg = GymProgramService.getActiveProgram();
        const wkStart = (state.settings.week_start_day ?? 1) as 0 | 1;
        const wtUnit = (state.settings.weight_unit as 'kg' | 'lb') || 'kg';
        const plan = computeTodayPlanState(state.workoutSessions || [], activeProg, state.bodyweightEntries || [], today, wtUnit);
        const streak = calculateWeeklyStreak(state.workoutSessions || [], activeProg, wkStart, today);
        const rangeStats = computeRangeMetrics(state.workoutSessions || [], state.bodyweightEntries || [], 'month', today, wkStart, wtUnit);
        const weekStrip = generateWeekStrip(state.workoutSessions || [], activeProg, wkStart, today);

        const logs = (state.workoutSessions || [])
          .filter(l => !l.deleted_at && (l.ended_at !== null && l.ended_at !== undefined && l.ended_at > 0))
          .slice(-5)
          .map(l => {
            const vol = calculateSessionVolume(l, state.bodyweightEntries || []);
            return {
              date: l.local_date,
              workout_name: l.name,
              sets_count: (l.sets || []).length,
              volume: `${formatVolume(vol, wtUnit)} ${wtUnit}`,
              notes: l.notes || null,
            };
          });

        return {
          active_program: activeProg ? activeProg.name : null,
          weekly_streak_weeks: streak,
          today_status: plan.state,
          today_details: plan.state === 'scheduled'
            ? `${plan.planName} (${plan.subtitle})`
            : plan.state === 'done'
            ? `Completed: ${plan.sessionName}`
            : plan.state === 'rest'
            ? `Rest day (Next: ${plan.nextWorkoutName} on ${plan.nextWeekday})`
            : 'None',
          month_stats: {
            volume: `${rangeStats.volume.formattedValue} ${rangeStats.volume.unit}`,
            workout_count: rangeStats.workoutCount.value,
            total_time: rangeStats.totalTime.formattedValue,
            records_count: rangeStats.records.value,
          },
          current_week_done_days: weekStrip.filter(d => d.isDone).map(d => d.dateStr),
          recent_logs: logs,
        };
      }

      case 'get_weight_trend': {
        const wtUnit = (state.settings.weight_unit as 'kg' | 'lb') || 'kg';
        const entries = (state.bodyweightEntries || []).filter(b => !b.deleted_at);
        const latest = entries[entries.length - 1];
        const previous = entries.length > 1 ? entries[entries.length - 2] : null;

        return {
          latest_weight: latest ? formatWeight(latest.weight_kg, wtUnit, true) : null,
          previous_weight: previous ? formatWeight(previous.weight_kg, wtUnit, true) : null,
          change: (latest && previous)
            ? `${(convertWeight(latest.weight_kg, wtUnit) - convertWeight(previous.weight_kg, wtUnit)).toFixed(1)} ${wtUnit}`
            : null,
          unit: wtUnit,
          recent_entries: entries.slice(-5).map(e => ({
            date: e.local_date,
            weight: formatWeight(e.weight_kg, wtUnit, true),
          })),
        };
      }

      case 'get_prayers': {
        const targetDate = args.date || today;
        const info = PrayerService.getPrayersForDate(targetDate);
        return {
          date: targetDate,
          completed_count: info.completedCount,
          total_count: info.totalCount,
          prayers: info.records.map(r => ({
            prayer: r.prayer,
            time: r.time,
            completed: r.completed,
          })),
        };
      }

      case 'get_maintenance_due': {
        const items = (state.maintenanceItems || []).filter(i => !i.deleted_at);
        const dueList = items.map(item => {
          const status = getItemDueStatus(item);
          return {
            name: item.name,
            category: item.category,
            next_date: item.next_reminder_date,
            status: status.badgeText,
            isOverdue: status.isOverdue,
            isDueToday: status.isDueToday,
            estimated_cost: item.estimated_cost_minor / 100,
          };
        }).filter(i => i.isOverdue || i.isDueToday);

        return {
          items_due: dueList,
          currency,
        };
      }

      case 'get_calendar': {
        const targetDate = args.date || today;
        const tasks = (state.tasks || []).filter(t => !t.deleted_at && t.due_date === targetDate);
        return {
          date: targetDate,
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            time: t.due_time || 'All day',
            done: t.done,
          })),
        };
      }

      case 'get_memory_notes': {
        return {
          notes: HermesStorage.getMemoryNotes().map(n => n.content),
        };
      }

      default:
        return { error: `Tool ${toolName} not found` };
    }
  },

  /**
   * Executes a WRITE tool with guaranteed rollback (Undo)
   */
  executeConfirmedWriteTool(toolName: string, params: Record<string, any>): {
    success: boolean;
    message: string;
    undo: () => void;
  } {
    const today = getTodayLocalDate();
    const createdId = generateUUID();

    switch (toolName) {
      case 'add_expense': {
        const amount = Number(params.amount) || 0;
        const amountMinor = Math.round(amount * 100);
        const note = String(params.note || 'Expense');
        const date = params.date || today;

        const newTx: Transaction = {
          id: createdId,
          type: 'expense',
          amount_minor: amountMinor,
          local_date: date,
          note,
          deleted_at: null,
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        db.updateState(draft => {
          draft.transactions.unshift(newTx);
        });
        window.dispatchEvent(new CustomEvent('greendream_state_updated'));

        return {
          success: true,
          message: `Logged expense of ${amount} DA: "${note}"`,
          undo: () => {
            db.updateState(draft => {
              draft.transactions = draft.transactions.filter(t => t.id !== createdId);
            });
            window.dispatchEvent(new CustomEvent('greendream_state_updated'));
          }
        };
      }

      case 'add_income': {
        const amount = Number(params.amount) || 0;
        const amountMinor = Math.round(amount * 100);
        const note = String(params.note || 'Income');
        const date = params.date || today;

        const newTx: Transaction = {
          id: createdId,
          type: 'income',
          amount_minor: amountMinor,
          local_date: date,
          note,
          deleted_at: null,
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        db.updateState(draft => {
          draft.transactions.unshift(newTx);
        });
        window.dispatchEvent(new CustomEvent('greendream_state_updated'));

        return {
          success: true,
          message: `Recorded income of ${amount} DA: "${note}"`,
          undo: () => {
            db.updateState(draft => {
              draft.transactions = draft.transactions.filter(t => t.id !== createdId);
            });
            window.dispatchEvent(new CustomEvent('greendream_state_updated'));
          }
        };
      }

      case 'mark_prayer': {
        const prayerName = params.prayer as PrayerName;
        const completed = Boolean(params.completed);
        const date = today;

        // Save previous status for clean undo
        const state = db.getState();
        const existing = state.prayers.find(p => p.local_date === date && p.prayer === prayerName && !p.deleted_at);
        const prevCompleted = existing ? existing.completed : false;

        PrayerService.togglePrayer(prayerName, date);
        window.dispatchEvent(new CustomEvent('greendream_state_updated'));

        return {
          success: true,
          message: `Marked ${prayerName} prayer as ${completed ? 'completed' : 'uncompleted'}`,
          undo: () => {
            db.updateState(draft => {
              const target = draft.prayers.find(p => p.local_date === date && p.prayer === prayerName && !p.deleted_at);
              if (target) {
                target.completed = prevCompleted;
              }
            });
            window.dispatchEvent(new CustomEvent('greendream_state_updated'));
          }
        };
      }

      case 'log_weight': {
        const weight = Number(params.weight) || 0;
        const date = params.date || today;

        const entry: BodyweightEntry = {
          id: createdId,
          weight_kg: weight,
          local_date: date,
          deleted_at: null,
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        db.updateState(draft => {
          draft.bodyweightEntries.push(entry);
        });
        window.dispatchEvent(new CustomEvent('greendream_state_updated'));

        return {
          success: true,
          message: `Logged bodyweight: ${weight} kg`,
          undo: () => {
            db.updateState(draft => {
              draft.bodyweightEntries = draft.bodyweightEntries.filter(e => e.id !== createdId);
            });
            window.dispatchEvent(new CustomEvent('greendream_state_updated'));
          }
        };
      }

      case 'add_task': {
        const title = String(params.title || 'Task');
        const dueDate = params.due_date || today;
        const dueTime = params.due_time || undefined;

        const task: Task = {
          id: createdId,
          title,
          due_date: dueDate,
          due_time: dueTime,
          done: false,
          deleted_at: null,
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        db.updateState(draft => {
          draft.tasks.unshift(task);
        });
        window.dispatchEvent(new CustomEvent('greendream_state_updated'));

        return {
          success: true,
          message: `Created task: "${title}"`,
          undo: () => {
            db.updateState(draft => {
              draft.tasks = draft.tasks.filter(t => t.id !== createdId);
            });
            window.dispatchEvent(new CustomEvent('greendream_state_updated'));
          }
        };
      }

      case 'add_reminder': {
        const name = String(params.name || 'Maintenance Item');
        const category = params.category || 'car_maintenance';
        const cost = Number(params.estimated_cost) || 0;

        const item: MaintenanceItem = {
          id: createdId,
          name,
          category,
          estimated_cost_minor: Math.round(cost * 100),
          recurrence_type: 'months',
          recurrence_interval: 1,
          next_reminder_date: calculateNextDueDate(today, 'months', 1),
          status: 'upcoming',
          priority: 'medium',
          deleted_at: null,
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        db.updateState(draft => {
          draft.maintenanceItems.unshift(item);
        });
        window.dispatchEvent(new CustomEvent('greendream_state_updated'));

        return {
          success: true,
          message: `Added reminder: "${name}"`,
          undo: () => {
            db.updateState(draft => {
              draft.maintenanceItems = draft.maintenanceItems.filter(i => i.id !== createdId);
            });
            window.dispatchEvent(new CustomEvent('greendream_state_updated'));
          }
        };
      }

      case 'create_goal': {
        const title = String(params.title || 'Goal');
        const targetAmount = Number(params.target_amount) || 0;
        const targetDate = params.target_date || undefined;

        const goal: SavingsGoal = {
          id: createdId,
          name: title,
          target_minor: Math.round(targetAmount * 100),
          opening_minor: 0,
          current_saved_minor: 0,
          target_date: targetDate,
          status: 'active',
          deleted_at: null,
          created_at: Date.now(),
          updated_at: Date.now(),
        };

        db.updateState(draft => {
          draft.savingsGoals.push(goal);
        });
        window.dispatchEvent(new CustomEvent('greendream_state_updated'));

        return {
          success: true,
          message: `Created savings goal: "${title}" for ${targetAmount} DA`,
          undo: () => {
            db.updateState(draft => {
              draft.savingsGoals = draft.savingsGoals.filter(g => g.id !== createdId);
            });
            window.dispatchEvent(new CustomEvent('greendream_state_updated'));
          }
        };
      }

      case 'save_memory_note': {
        const content = String(params.content || '').trim();
        const note = HermesStorage.addMemoryNote(content);

        return {
          success: true,
          message: `Saved to Hermes memory: "${content}"`,
          undo: () => {
            HermesStorage.deleteMemoryNote(note.id);
          }
        };
      }

      case 'update_setting': {
        const key = String(params.setting_key);
        const newVal = params.new_value;
        const prevState = db.getState();
        const prevVal = (prevState.settings as any)[key];

        db.updateState(draft => {
          (draft.settings as any)[key] = newVal;
        });
        window.dispatchEvent(new CustomEvent('greendream_state_updated'));

        return {
          success: true,
          message: `Updated setting "${key}" to "${newVal}"`,
          undo: () => {
            db.updateState(draft => {
              (draft.settings as any)[key] = prevVal;
            });
            window.dispatchEvent(new CustomEvent('greendream_state_updated'));
          }
        };
      }

      default:
        return {
          success: false,
          message: `Unknown write tool ${toolName}`,
          undo: () => {},
        };
    }
  }
};
