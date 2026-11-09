// Global Module Widget Registry: Definitions, Modules, Sizes, and Presets
import { 
  ModuleId, 
  WidgetSize, 
  ModuleWidgetConfig, 
  ModuleLayoutState 
} from '../types';

export interface ModuleWidgetDefinition {
  type: string;
  name: string;
  moduleId: ModuleId;
  category: string;
  description: string;
  defaultSize: WidgetSize;
  supportedSizes: WidgetSize[];
  icon: string; // Lucide icon name
}

export interface ModulePresetConfig {
  id: string;
  moduleId: ModuleId;
  name: string;
  description: string;
  widgetTypes: { type: string; size: WidgetSize }[];
}

export const MODULE_WIDGET_REGISTRY: Record<string, ModuleWidgetDefinition> = {
  // =========================================================================
  // 1. FINANCE MODULE WIDGETS
  // =========================================================================
  finance_balance: {
    type: 'finance_balance',
    name: 'Total Available Balance',
    moduleId: 'finance',
    category: 'Liquidity',
    description: 'Current liquid cash checking balance and immediate reserve',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Wallet',
  },
  finance_income: {
    type: 'finance_income',
    name: 'Monthly Income',
    moduleId: 'finance',
    category: 'Cash Flow',
    description: 'Monthly salary and additional confirmed inflows',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'TrendingUp',
  },
  finance_expenses: {
    type: 'finance_expenses',
    name: 'Monthly Expenses & Burn',
    moduleId: 'finance',
    category: 'Cash Flow',
    description: 'Total cycle expenses and average daily spending rate',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'TrendingDown',
  },
  finance_savings: {
    type: 'finance_savings',
    name: 'Savings Overview',
    moduleId: 'finance',
    category: 'Wealth',
    description: 'Secure savings balance and primary goal progress',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'PiggyBank',
  },
  finance_forecast: {
    type: 'finance_forecast',
    name: 'Financial Forecast',
    moduleId: 'finance',
    category: 'Analytics',
    description: 'Projected month-end cash position and runway trajectory',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'LineChart',
  },
  finance_spending_analytics: {
    type: 'finance_spending_analytics',
    name: 'Spending Analytics',
    moduleId: 'finance',
    category: 'Analytics',
    description: 'Interactive analytics, category distributions, and burn curves',
    defaultSize: 'full',
    supportedSizes: ['large', 'full'],
    icon: 'PieChart',
  },
  finance_category_spending: {
    type: 'finance_category_spending',
    name: 'Expenses by Category',
    moduleId: 'finance',
    category: 'Breakdown',
    description: 'Itemized spending and budget compliance per category',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'PieChart',
  },
  finance_daily_expenses: {
    type: 'finance_daily_expenses',
    name: 'Daily Expenses',
    moduleId: 'finance',
    category: 'Daily',
    description: 'Today’s expense total and quick logging form',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'full'],
    icon: 'CreditCard',
  },
  finance_quick_expenses: {
    type: 'finance_quick_expenses',
    name: 'Quick Expense Shortcuts',
    moduleId: 'finance',
    category: 'Daily',
    description: 'One-tap expense recording buttons (Coffee, Transport, Groceries)',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Zap',
  },
  finance_money_lent: {
    type: 'finance_money_lent',
    name: 'Money Lent to People',
    moduleId: 'finance',
    category: 'Debts',
    description: 'Outstanding loans given to friends & debtors with repayment status',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'HandCoins',
  },
  finance_money_borrowed: {
    type: 'finance_money_borrowed',
    name: 'Money Borrowed',
    moduleId: 'finance',
    category: 'Debts',
    description: 'Active liabilities and personal commitments owed to others',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Clock',
  },
  finance_savings_goals: {
    type: 'finance_savings_goals',
    name: 'Savings Goals',
    moduleId: 'finance',
    category: 'Wealth',
    description: 'Target goals tracking (Car, Emergency Fund, Workstation)',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Target',
  },
  finance_allocation: {
    type: 'finance_allocation',
    name: 'Financial Allocation',
    moduleId: 'finance',
    category: 'Planning',
    description: 'Income distribution rules (e.g. 75% Savings / 20% Personal / 5% Charity)',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Sliders',
  },
  finance_sadaqah: {
    type: 'finance_sadaqah',
    name: 'Sadaqah & Charity Overview',
    moduleId: 'finance',
    category: 'Spiritual',
    description: 'Monthly planned charity vs confirmed contributions',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'HeartHandshake',
  },
  finance_budget: {
    type: 'finance_budget',
    name: 'Monthly Budget Progress',
    moduleId: 'finance',
    category: 'Budgeting',
    description: 'Active spending envelopes and monthly budget limits',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Sliders',
  },
  finance_affordability: {
    type: 'finance_affordability',
    name: 'Purchase Affordability',
    moduleId: 'finance',
    category: 'Planning',
    description: 'Test whether an upcoming planned expense fits your safe runway',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'full'],
    icon: 'ShieldCheck',
  },
  finance_income_vs_expenses: {
    type: 'finance_income_vs_expenses',
    name: 'Income vs Expenses Chart',
    moduleId: 'finance',
    category: 'Analytics',
    description: 'Pacing chart comparing cumulative earnings vs outflows',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'BarChart3',
  },
  finance_transactions: {
    type: 'finance_transactions',
    name: 'Recent Transactions Ledger',
    moduleId: 'finance',
    category: 'Ledger',
    description: 'Chronological feed of recorded income, expenses, and transfers',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Clock',
  },

  // =========================================================================
  // 2. GYM / FITNESS MODULE WIDGETS
  // =========================================================================
  gym_active_program: {
    type: 'gym_active_program',
    name: 'Active Training Program',
    moduleId: 'gym',
    category: 'Program',
    description: 'Current training plan, template type, and weekly split',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Activity',
  },
  gym_today_workout: {
    type: 'gym_today_workout',
    name: "Today's Workout",
    moduleId: 'gym',
    category: 'Workouts',
    description: 'Target muscle groups, scheduled exercises, and quick session start',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Dumbbell',
  },
  gym_weekly_schedule: {
    type: 'gym_weekly_schedule',
    name: 'Weekly Workout Schedule',
    moduleId: 'gym',
    category: 'Schedule',
    description: 'Days scheduled for training this week with completion indicators',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Calendar',
  },
  gym_training_progress: {
    type: 'gym_training_progress',
    name: 'Training Progress & Recovery',
    moduleId: 'gym',
    category: 'Progress',
    description: 'Interactive anatomical body muscle recovery heat-map',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Sparkles',
  },
  gym_exercise_list: {
    type: 'gym_exercise_list',
    name: 'Exercise List & Catalog',
    moduleId: 'gym',
    category: 'Exercises',
    description: 'Browse exercises categorized by muscle groups (Chest, Back, Legs)',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Dumbbell',
  },
  gym_workout_history: {
    type: 'gym_workout_history',
    name: 'Workout History',
    moduleId: 'gym',
    category: 'History',
    description: 'Completed gym workout logs with duration and total volume',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Clock',
  },
  gym_body_weight: {
    type: 'gym_body_weight',
    name: 'Weight Tracking',
    moduleId: 'gym',
    category: 'Metrics',
    description: 'Latest bodyweight snapshot, BMI estimate, and log entry button',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Scale',
  },
  gym_body_measurements: {
    type: 'gym_body_measurements',
    name: 'Body Measurements',
    moduleId: 'gym',
    category: 'Metrics',
    description: 'Chest, waist, arms, and thighs circumference progress',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Activity',
  },
  gym_weekly_frequency: {
    type: 'gym_weekly_frequency',
    name: 'Weekly Training Frequency',
    moduleId: 'gym',
    category: 'Progress',
    description: 'Number of sessions completed vs weekly target frequency',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'TrendingUp',
  },
  gym_personal_records: {
    type: 'gym_personal_records',
    name: 'Personal Records (PRs)',
    moduleId: 'gym',
    category: 'Progress',
    description: 'Max weights achieved on Bench Press, Squat, and Deadlift',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Sparkles',
  },
  gym_rest_days: {
    type: 'gym_rest_days',
    name: 'Rest Days & Recovery',
    moduleId: 'gym',
    category: 'Recovery',
    description: 'Scheduled active recovery days and central nervous system rest',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'ShieldCheck',
  },
  gym_training_stats: {
    type: 'gym_training_stats',
    name: 'Training Statistics',
    moduleId: 'gym',
    category: 'Metrics',
    description: 'Total kg lifted, total workouts, and streak consistency',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'BarChart3',
  },
  gym_weight_chart: {
    type: 'gym_weight_chart',
    name: 'Weight Progress Chart',
    moduleId: 'gym',
    category: 'Metrics',
    description: '7-day moving average weight trajectory chart',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'LineChart',
  },

  // =========================================================================
  // 3. CALENDAR / TASKS MODULE WIDGETS
  // =========================================================================
  tasks_today: {
    type: 'tasks_today',
    name: "Today's Tasks",
    moduleId: 'calendar',
    category: 'Tasks',
    description: 'Interactive checklist of tasks due today with quick completion',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'CheckSquare',
  },
  tasks_upcoming: {
    type: 'tasks_upcoming',
    name: 'Upcoming Tasks',
    moduleId: 'calendar',
    category: 'Tasks',
    description: 'Upcoming tasks scheduled across the next 7 days',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Calendar',
  },
  calendar_view: {
    type: 'calendar_view',
    name: 'Monthly Calendar View',
    moduleId: 'calendar',
    category: 'Calendar',
    description: 'Monthly grid view highlighting dates with events and deadlines',
    defaultSize: 'full',
    supportedSizes: ['large', 'full'],
    icon: 'Calendar',
  },
  calendar_events: {
    type: 'calendar_events',
    name: 'Important Events',
    moduleId: 'calendar',
    category: 'Events',
    description: 'Scheduled time-blocked meetings, appointments, and social events',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Clock',
  },
  tasks_deadlines: {
    type: 'tasks_deadlines',
    name: 'Deadlines & Urgent Items',
    moduleId: 'calendar',
    category: 'Tasks',
    description: 'High-urgency tasks approaching their due date',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'AlertCircle',
  },
  calendar_reminders: {
    type: 'calendar_reminders',
    name: 'Recurring Reminders',
    moduleId: 'calendar',
    category: 'Reminders',
    description: 'Periodic time-sensitive reminders and notifications',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Clock',
  },
  tasks_completed: {
    type: 'tasks_completed',
    name: 'Completed Tasks',
    moduleId: 'calendar',
    category: 'Tasks',
    description: 'Archived log of completed action items for retrospective review',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Check',
  },
  calendar_weekly_schedule: {
    type: 'calendar_weekly_schedule',
    name: 'Weekly Schedule Overview',
    moduleId: 'calendar',
    category: 'Schedule',
    description: '7-day overview of all scheduled tasks and calendar events',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Calendar',
  },
  tasks_priority: {
    type: 'tasks_priority',
    name: 'Priority Tasks Focus',
    moduleId: 'calendar',
    category: 'Tasks',
    description: 'Top 3 high-impact tasks selected for deep focus today',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Sparkles',
  },

  // =========================================================================
  // 4. AI CHAT MODULE SUPPORTING WIDGETS
  // =========================================================================
  ai_conversation_history: {
    type: 'ai_conversation_history',
    name: 'Conversation History Panel',
    moduleId: 'assistant',
    category: 'Chat',
    description: 'Recent conversation threads and session switcher',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Clock',
  },
  ai_assistant_info: {
    type: 'ai_assistant_info',
    name: 'AI Assistant Information',
    moduleId: 'assistant',
    category: 'System',
    description: 'Active model, Google Gemini status, and connection health badge',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Bot',
  },
  ai_suggested_actions: {
    type: 'ai_suggested_actions',
    name: 'Suggested Actions & Notices',
    moduleId: 'assistant',
    category: 'Intelligence',
    description: 'Proactive conflict warnings and contextual system suggestions',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Sparkles',
  },
  ai_quick_prompts: {
    type: 'ai_quick_prompts',
    name: 'Quick Prompts Library',
    moduleId: 'assistant',
    category: 'Prompts',
    description: 'One-tap questions covering financial health, workouts, and schedule',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Bot',
  },

  // =========================================================================
  // 5. PERSONAL MAINTENANCE MODULE WIDGETS
  // =========================================================================
  maint_haircut: {
    type: 'maint_haircut',
    name: 'Haircut Countdown',
    moduleId: 'maintenance',
    category: 'Care',
    description: 'Days remaining until next haircut & beard trim service date',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Sparkles',
  },
  maint_car: {
    type: 'maint_car',
    name: 'Car Maintenance',
    moduleId: 'maintenance',
    category: 'Vehicle',
    description: 'Engine oil, filter replacement, and odometer mileage tracker',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Wrench',
  },
  maint_upcoming_purchases: {
    type: 'maint_upcoming_purchases',
    name: 'Upcoming Purchases & Shopping',
    moduleId: 'maintenance',
    category: 'Shopping',
    description: 'Essentials shopping list with estimated acquisition costs',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'ShoppingBag',
  },
  maint_history: {
    type: 'maint_history',
    name: 'Maintenance History',
    moduleId: 'maintenance',
    category: 'History',
    description: 'Completed maintenance records with actual costs paid',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Clock',
  },
  maint_recurring: {
    type: 'maint_recurring',
    name: 'Recurring Reminders',
    moduleId: 'maintenance',
    category: 'Reminders',
    description: 'Interval-based upkeep routines (Toothbrush, HVAC, filters)',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Calendar',
  },
  maint_next_dates: {
    type: 'maint_next_dates',
    name: 'Next Maintenance Dates',
    moduleId: 'maintenance',
    category: 'Schedule',
    description: 'Chronological timeline of upcoming service due dates',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Clock',
  },

  // =========================================================================
  // 6. DAILY PRAYERS / PROGRESS MODULE WIDGETS
  // =========================================================================
  prayers_daily_times: {
    type: 'prayers_daily_times',
    name: 'Five Daily Prayers',
    moduleId: 'prayers',
    category: 'Spiritual',
    description: 'Fajr, Dhuhr, Asr, Maghrib, and Isha checklist with calculation times',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Sun',
  },
  prayers_progress_indicator: {
    type: 'prayers_progress_indicator',
    name: 'Daily Progress Counter',
    moduleId: 'prayers',
    category: 'Discipline',
    description: '10-point daily progress score tracking prayers, budget & focus',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Award',
  },
  prayers_weekly_overview: {
    type: 'prayers_weekly_overview',
    name: 'Weekly Prayer Overview',
    moduleId: 'prayers',
    category: 'History',
    description: '7-day prayer adherence rate and streak consistency bar',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Calendar',
  },
  prayers_history: {
    type: 'prayers_history',
    name: 'Spiritual Progress History',
    moduleId: 'prayers',
    category: 'History',
    description: 'Historical on-time completion records across previous weeks',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'ShieldCheck',
  },

  // =========================================================================
  // 7. WEEKLY REVIEW MODULE WIDGETS
  // =========================================================================
  review_highlights: {
    type: 'review_highlights',
    name: 'Weekly Review Highlights',
    moduleId: 'weeklyReview',
    category: 'Retrospective',
    description: 'Top accomplishments and key milestones achieved this week',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Sparkles',
  },
  review_metrics: {
    type: 'review_metrics',
    name: 'Multi-Domain Metrics',
    moduleId: 'weeklyReview',
    category: 'Metrics',
    description: 'Combined performance across Gym, Spending, Prayers, and Tasks',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'BarChart3',
  },
  review_reflection: {
    type: 'review_reflection',
    name: 'Reflection & Improvement',
    moduleId: 'weeklyReview',
    category: 'Reflection',
    description: 'What went well and areas for discipline refinement',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'FileText',
  },
  review_next_week_plan: {
    type: 'review_next_week_plan',
    name: 'Next Week Plan',
    moduleId: 'weeklyReview',
    category: 'Planning',
    description: 'Top priorities and scheduled workout days for the upcoming week',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Calendar',
  },

  // =========================================================================
  // 8. DASHBOARD MODULE WIDGETS (UNIFIED)
  // =========================================================================
  daily_progress: {
    type: 'daily_progress',
    name: 'Daily Progress Counter',
    moduleId: 'dashboard',
    category: 'Discipline',
    description: '10-point daily progress score tracking prayers, budget discipline & personal focus',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Award',
  },
  daily_prayers: {
    type: 'daily_prayers',
    name: 'Daily Prayers',
    moduleId: 'dashboard',
    category: 'Spiritual',
    description: '5 daily prayers checklist with calculation times and streak',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Compass',
  },
  personal_maintenance: {
    type: 'personal_maintenance',
    name: 'Personal Maintenance',
    moduleId: 'dashboard',
    category: 'Care',
    description: 'Upcoming haircut, car service, and hygiene reminders',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Wrench',
  },
  shopping_reminders: {
    type: 'shopping_reminders',
    name: 'Shopping Reminders',
    moduleId: 'dashboard',
    category: 'Shopping',
    description: 'Pending essentials shopping list with cost estimations',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'ShoppingBag',
  },
  weekly_review: {
    type: 'weekly_review',
    name: 'Weekly Review',
    moduleId: 'dashboard',
    category: 'Review',
    description: 'Past week multi-domain retrospective and metrics',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'FileText',
  },
  ai_daily_brief: {
    type: 'ai_daily_brief',
    name: 'AI Daily Brief',
    moduleId: 'dashboard',
    category: 'Assistant',
    description: 'Proactive daily briefing, conflict alerts, and reminders',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Bot',
  },
};

// ===========================================================================
// PRESETS CONFIGURATION PER MODULE
// ===========================================================================

export const MODULE_PRESETS: Record<ModuleId, Record<string, ModulePresetConfig>> = {
  // -------------------------------------------------------------------------
  // FINANCE PRESETS
  // -------------------------------------------------------------------------
  finance: {
    complete_finance: {
      id: 'complete_finance',
      moduleId: 'finance',
      name: 'Complete Finance',
      description: 'Comprehensive financial view with liquidity, forecast, goals, and analytics',
      widgetTypes: [
        { type: 'finance_balance', size: 'small' },
        { type: 'finance_income', size: 'small' },
        { type: 'finance_expenses', size: 'small' },
        { type: 'finance_sadaqah', size: 'small' },
        { type: 'finance_forecast', size: 'full' },
        { type: 'finance_savings', size: 'medium' },
        { type: 'finance_quick_expenses', size: 'full' },
        { type: 'finance_budget', size: 'medium' },
        { type: 'finance_category_spending', size: 'medium' },
        { type: 'finance_savings_goals', size: 'full' },
        { type: 'finance_allocation', size: 'full' },
        { type: 'finance_money_lent', size: 'medium' },
        { type: 'finance_affordability', size: 'medium' },
        { type: 'finance_transactions', size: 'full' },
      ],
    },
    minimal_finance: {
      id: 'minimal_finance',
      moduleId: 'finance',
      name: 'Minimal Finance',
      description: 'Clean focus on immediate cash, today expenses, and quick logging',
      widgetTypes: [
        { type: 'finance_balance', size: 'small' },
        { type: 'finance_expenses', size: 'small' },
        { type: 'finance_quick_expenses', size: 'full' },
        { type: 'finance_daily_expenses', size: 'full' },
        { type: 'finance_transactions', size: 'full' },
      ],
    },
    savings_focus: {
      id: 'savings_focus',
      moduleId: 'finance',
      name: 'Savings & Wealth Focus',
      description: 'Prioritizes wealth accumulation, capital allocation, and savings milestones',
      widgetTypes: [
        { type: 'finance_savings', size: 'full' },
        { type: 'finance_savings_goals', size: 'full' },
        { type: 'finance_allocation', size: 'full' },
        { type: 'finance_balance', size: 'small' },
        { type: 'finance_sadaqah', size: 'small' },
        { type: 'finance_forecast', size: 'full' },
        { type: 'finance_money_lent', size: 'full' },
      ],
    },
    spending_focus: {
      id: 'spending_focus',
      moduleId: 'finance',
      name: 'Spending & Budget Control',
      description: 'Highlights daily burn, envelope budgets, category breakdowns, and analytics',
      widgetTypes: [
        { type: 'finance_expenses', size: 'small' },
        { type: 'finance_budget', size: 'medium' },
        { type: 'finance_spending_analytics', size: 'full' },
        { type: 'finance_category_spending', size: 'medium' },
        { type: 'finance_quick_expenses', size: 'full' },
        { type: 'finance_income_vs_expenses', size: 'full' },
        { type: 'finance_transactions', size: 'full' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // GYM PRESETS
  // -------------------------------------------------------------------------
  gym: {
    complete_training: {
      id: 'complete_training',
      moduleId: 'gym',
      name: 'Complete Training',
      description: 'Active program, workouts, anatomical recovery, and weight tracking',
      widgetTypes: [
        { type: 'gym_today_workout', size: 'medium' },
        { type: 'gym_active_program', size: 'full' },
        { type: 'gym_weekly_schedule', size: 'full' },
        { type: 'gym_training_progress', size: 'full' },
        { type: 'gym_body_weight', size: 'small' },
        { type: 'gym_weekly_frequency', size: 'small' },
        { type: 'gym_weight_chart', size: 'medium' },
        { type: 'gym_exercise_list', size: 'full' },
        { type: 'gym_workout_history', size: 'full' },
        { type: 'gym_personal_records', size: 'medium' },
        { type: 'gym_rest_days', size: 'small' },
      ],
    },
    minimal_training: {
      id: 'minimal_training',
      moduleId: 'gym',
      name: 'Minimal Training',
      description: 'Just today’s workout, active program, and quick weigh-in',
      widgetTypes: [
        { type: 'gym_today_workout', size: 'full' },
        { type: 'gym_active_program', size: 'full' },
        { type: 'gym_body_weight', size: 'small' },
        { type: 'gym_workout_history', size: 'full' },
      ],
    },
    progress_focus: {
      id: 'progress_focus',
      moduleId: 'gym',
      name: 'Progress & Hypertrophy Focus',
      description: 'Anatomical recovery state, weight trends, personal records, and volume',
      widgetTypes: [
        { type: 'gym_training_progress', size: 'full' },
        { type: 'gym_body_weight', size: 'small' },
        { type: 'gym_weight_chart', size: 'large' },
        { type: 'gym_personal_records', size: 'medium' },
        { type: 'gym_today_workout', size: 'full' },
        { type: 'gym_workout_history', size: 'full' },
      ],
    },
    splits_focus: {
      id: 'splits_focus',
      moduleId: 'gym',
      name: 'Program & Splits Focus',
      description: 'Routine split schedules, exercise catalog, and workout frequency',
      widgetTypes: [
        { type: 'gym_active_program', size: 'full' },
        { type: 'gym_weekly_schedule', size: 'full' },
        { type: 'gym_today_workout', size: 'medium' },
        { type: 'gym_rest_days', size: 'small' },
        { type: 'gym_exercise_list', size: 'full' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // CALENDAR / TASKS PRESETS
  // -------------------------------------------------------------------------
  calendar: {
    complete_agenda: {
      id: 'complete_agenda',
      moduleId: 'calendar',
      name: 'Complete Agenda',
      description: 'Full calendar schedule, active tasks, upcoming backlog, and events',
      widgetTypes: [
        { type: 'tasks_today', size: 'full' },
        { type: 'calendar_events', size: 'medium' },
        { type: 'tasks_priority', size: 'medium' },
        { type: 'calendar_view', size: 'full' },
        { type: 'tasks_upcoming', size: 'medium' },
        { type: 'tasks_deadlines', size: 'medium' },
        { type: 'calendar_reminders', size: 'medium' },
        { type: 'tasks_completed', size: 'medium' },
      ],
    },
    day_focus: {
      id: 'day_focus',
      moduleId: 'calendar',
      name: 'Day Focus',
      description: 'Clean daily task list and today’s time-blocked events only',
      widgetTypes: [
        { type: 'tasks_priority', size: 'medium' },
        { type: 'tasks_today', size: 'full' },
        { type: 'calendar_events', size: 'full' },
        { type: 'tasks_deadlines', size: 'medium' },
      ],
    },
    tasks_only: {
      id: 'tasks_only',
      moduleId: 'calendar',
      name: 'Tasks Only',
      description: 'Focused task management: priorities, today, upcoming, and completed',
      widgetTypes: [
        { type: 'tasks_today', size: 'full' },
        { type: 'tasks_priority', size: 'medium' },
        { type: 'tasks_upcoming', size: 'full' },
        { type: 'tasks_deadlines', size: 'medium' },
        { type: 'tasks_completed', size: 'full' },
      ],
    },
    events_only: {
      id: 'events_only',
      moduleId: 'calendar',
      name: 'Events & Calendar Only',
      description: 'Interactive monthly calendar and event timelines',
      widgetTypes: [
        { type: 'calendar_view', size: 'full' },
        { type: 'calendar_events', size: 'full' },
        { type: 'calendar_weekly_schedule', size: 'full' },
        { type: 'calendar_reminders', size: 'medium' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // AI CHAT SUPPORTING PANELS PRESETS
  // -------------------------------------------------------------------------
  assistant: {
    complete_assistant: {
      id: 'complete_assistant',
      moduleId: 'assistant',
      name: 'Complete AI Desk',
      description: 'Conversation switcher, model status, suggestions, and prompt library',
      widgetTypes: [
        { type: 'ai_assistant_info', size: 'small' },
        { type: 'ai_quick_prompts', size: 'full' },
        { type: 'ai_suggested_actions', size: 'medium' },
        { type: 'ai_conversation_history', size: 'medium' },
      ],
    },
    compact_desk: {
      id: 'compact_desk',
      moduleId: 'assistant',
      name: 'Compact Desk',
      description: 'Minimal header with model health badge and quick prompts',
      widgetTypes: [
        { type: 'ai_assistant_info', size: 'small' },
        { type: 'ai_quick_prompts', size: 'full' },
      ],
    },
    prompts_focus: {
      id: 'prompts_focus',
      moduleId: 'assistant',
      name: 'Prompts & Insights Focus',
      description: 'Proactive conflict warnings and structured prompt chips',
      widgetTypes: [
        { type: 'ai_quick_prompts', size: 'full' },
        { type: 'ai_suggested_actions', size: 'full' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // PERSONAL MAINTENANCE PRESETS
  // -------------------------------------------------------------------------
  maintenance: {
    complete_upkeep: {
      id: 'complete_upkeep',
      moduleId: 'maintenance',
      name: 'Complete Upkeep',
      description: 'Haircut countdown, car maintenance, shopping list, and service history',
      widgetTypes: [
        { type: 'maint_haircut', size: 'medium' },
        { type: 'maint_car', size: 'medium' },
        { type: 'maint_next_dates', size: 'full' },
        { type: 'maint_upcoming_purchases', size: 'full' },
        { type: 'maint_recurring', size: 'medium' },
        { type: 'maint_history', size: 'full' },
      ],
    },
    essentials: {
      id: 'essentials',
      moduleId: 'maintenance',
      name: 'Personal Essentials',
      description: 'Focus on personal hygiene, grooming, and shopping list',
      widgetTypes: [
        { type: 'maint_haircut', size: 'medium' },
        { type: 'maint_next_dates', size: 'medium' },
        { type: 'maint_upcoming_purchases', size: 'full' },
      ],
    },
    car_care: {
      id: 'car_care',
      moduleId: 'maintenance',
      name: 'Vehicle & Mobility Care',
      description: 'Vehicle oil changes, brake inspections, and odometer intervals',
      widgetTypes: [
        { type: 'maint_car', size: 'full' },
        { type: 'maint_next_dates', size: 'medium' },
        { type: 'maint_history', size: 'full' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // DAILY PRAYERS / PROGRESS PRESETS
  // -------------------------------------------------------------------------
  prayers: {
    complete_spiritual: {
      id: 'complete_spiritual',
      moduleId: 'prayers',
      name: 'Complete Spiritual & Discipline',
      description: 'Daily prayer checklist, 10-point score, and consistency history',
      widgetTypes: [
        { type: 'prayers_daily_times', size: 'full' },
        { type: 'prayers_progress_indicator', size: 'full' },
        { type: 'prayers_weekly_overview', size: 'medium' },
        { type: 'prayers_history', size: 'full' },
      ],
    },
    daily_focus: {
      id: 'daily_focus',
      moduleId: 'prayers',
      name: 'Daily Focus',
      description: 'Today’s five prayers and the active daily discipline progress counter',
      widgetTypes: [
        { type: 'prayers_daily_times', size: 'full' },
        { type: 'prayers_progress_indicator', size: 'full' },
      ],
    },
    progress_focus: {
      id: 'progress_focus',
      moduleId: 'prayers',
      name: 'Discipline & Progress Focus',
      description: '10-point daily progress score and weekly prayer consistency chart',
      widgetTypes: [
        { type: 'prayers_progress_indicator', size: 'full' },
        { type: 'prayers_weekly_overview', size: 'full' },
        { type: 'prayers_daily_times', size: 'full' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // WEEKLY REVIEW PRESETS
  // -------------------------------------------------------------------------
  weeklyReview: {
    complete_review: {
      id: 'complete_review',
      moduleId: 'weeklyReview',
      name: 'Complete Review',
      description: 'Highlights, multi-domain metrics, reflections, and next week plan',
      widgetTypes: [
        { type: 'review_highlights', size: 'full' },
        { type: 'review_metrics', size: 'full' },
        { type: 'review_reflection', size: 'full' },
        { type: 'review_next_week_plan', size: 'full' },
      ],
    },
    retrospective_focus: {
      id: 'retrospective_focus',
      moduleId: 'weeklyReview',
      name: 'Retrospective Focus',
      description: 'What went well and areas for discipline refinement',
      widgetTypes: [
        { type: 'review_highlights', size: 'full' },
        { type: 'review_reflection', size: 'full' },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // DASHBOARD PRESETS
  // -------------------------------------------------------------------------
  dashboard: {
    complete_overview: {
      id: 'complete_overview',
      moduleId: 'dashboard',
      name: 'Strategic Default (Recommended)',
      description: 'Carefully organized 6-section layout: Daily Overview, Finance, Tasks, Fitness, Maintenance & Weekly Review',
      widgetTypes: [
        // SECTION 1 — DAILY OVERVIEW & QUICK ACTIONS
        { type: 'daily_progress', size: 'full' },
        { type: 'finance_quick_expenses', size: 'full' },

        // SECTION 2 — FINANCIAL OVERVIEW
        { type: 'finance_balance', size: 'small' },
        { type: 'finance_income', size: 'small' },
        { type: 'finance_expenses', size: 'small' },
        { type: 'finance_savings', size: 'small' },
        { type: 'finance_forecast', size: 'full' },

        // SECTION 3 — DAILY ORGANIZATION & REMINDERS
        { type: 'tasks_today', size: 'full' },
        { type: 'calendar_events', size: 'medium' },
        { type: 'daily_prayers', size: 'full' },
        { type: 'ai_daily_brief', size: 'full' },

        // SECTION 4 — FITNESS & PERSONAL DEVELOPMENT
        { type: 'gym_today_workout', size: 'medium' },
        { type: 'gym_workout_stats', size: 'small' },
        { type: 'gym_body_weight', size: 'small' },

        // SECTION 5 — PERSONAL MAINTENANCE & PURCHASES
        { type: 'personal_maintenance', size: 'full' },
        { type: 'shopping_reminders', size: 'full' },

        // SECTION 6 — WEEKLY OVERVIEW
        { type: 'weekly_review', size: 'full' },
      ],
    },
    minimal: {
      id: 'minimal',
      moduleId: 'dashboard',
      name: 'Minimal',
      description: 'Only essential daily cards for maximum speed and clarity',
      widgetTypes: [
        { type: 'daily_progress', size: 'full' },
        { type: 'daily_prayers', size: 'full' },
        { type: 'tasks_today', size: 'full' },
        { type: 'finance_balance', size: 'small' },
        { type: 'finance_quick_expenses', size: 'full' },
        { type: 'gym_today_workout', size: 'full' },
      ],
    },
    finance_focus: {
      id: 'finance_focus',
      moduleId: 'dashboard',
      name: 'Finance Focus',
      description: 'Cash balances, forecasts, savings, and expense tracking first',
      widgetTypes: [
        { type: 'finance_balance', size: 'small' },
        { type: 'finance_income', size: 'small' },
        { type: 'finance_expenses', size: 'small' },
        { type: 'finance_sadaqah', size: 'small' },
        { type: 'finance_quick_expenses', size: 'full' },
        { type: 'finance_forecast', size: 'full' },
        { type: 'finance_savings', size: 'full' },
        { type: 'finance_money_lent', size: 'full' },
        { type: 'daily_prayers', size: 'full' },
        { type: 'tasks_today', size: 'full' },
      ],
    },
    fitness_focus: {
      id: 'fitness_focus',
      moduleId: 'dashboard',
      name: 'Fitness Focus',
      description: 'Workouts, training splits, and bodyweight tracking first',
      widgetTypes: [
        { type: 'gym_today_workout', size: 'full' },
        { type: 'gym_training_program', size: 'full' },
        { type: 'gym_body_weight', size: 'small' },
        { type: 'gym_weight_chart', size: 'large' },
        { type: 'daily_prayers', size: 'full' },
        { type: 'tasks_today', size: 'full' },
        { type: 'finance_balance', size: 'small' },
      ],
    },
    productivity_focus: {
      id: 'productivity_focus',
      moduleId: 'dashboard',
      name: 'Productivity Focus',
      description: 'Tasks, calendar agenda, daily prayers, and weekly reviews first',
      widgetTypes: [
        { type: 'daily_prayers', size: 'full' },
        { type: 'tasks_today', size: 'full' },
        { type: 'tasks_upcoming', size: 'full' },
        { type: 'personal_maintenance', size: 'full' },
        { type: 'weekly_review', size: 'full' },
        { type: 'ai_daily_brief', size: 'full' },
        { type: 'finance_balance', size: 'small' },
      ],
    },
  },
};

/**
 * Returns all widget definitions available for a specific module
 */
export function getWidgetsForModule(moduleId: ModuleId): ModuleWidgetDefinition[] {
  return Object.values(MODULE_WIDGET_REGISTRY).filter(w => w.moduleId === moduleId);
}

/**
 * Returns all preset configurations for a specific module
 */
export function getPresetsForModule(moduleId: ModuleId): Record<string, ModulePresetConfig> {
  return MODULE_PRESETS[moduleId] || {};
}

/**
 * Generates an initial layout state from a chosen preset
 */
export function createModulePresetLayout(moduleId: ModuleId, presetId: string): ModuleLayoutState {
  const modulePresets = getPresetsForModule(moduleId);
  const presetConfig = modulePresets[presetId] || Object.values(modulePresets)[0];

  const widgets: ModuleWidgetConfig[] = (presetConfig?.widgetTypes || []).map((item, index) => ({
    id: `mod-${moduleId}-${item.type}-${index}`,
    widgetType: item.type,
    size: item.size,
    visible: true,
    order: index,
  }));

  return {
    moduleId,
    version: 1,
    preset: presetId,
    widgets,
    updated_at: Date.now(),
  };
}
