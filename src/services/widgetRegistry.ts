// Dashboard Widget Registry: Definitions, Categories, Supported Sizes & Presets
import { 
  WidgetCategory, 
  WidgetSize, 
  DashboardWidgetConfig, 
  DashboardPresetId, 
  DashboardLayoutState 
} from '../types';

export interface WidgetDefinition {
  type: string;
  name: string;
  category: WidgetCategory;
  description: string;
  defaultSize: WidgetSize;
  supportedSizes: WidgetSize[];
  icon: string; // Lucide icon identifier
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // ==========================================
  // 1. FINANCE WIDGETS
  // ==========================================
  finance_balance: {
    type: 'finance_balance',
    name: 'Available Balance',
    category: 'finance',
    description: 'Current liquid checking cash balance',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Wallet',
  },
  finance_income: {
    type: 'finance_income',
    name: 'Monthly Income',
    category: 'finance',
    description: 'Confirmed salary & additional income recorded this month',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'TrendingUp',
  },
  finance_expenses: {
    type: 'finance_expenses',
    name: 'Monthly Expenses',
    category: 'finance',
    description: 'Cycle spending to date and daily burn rate',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'TrendingDown',
  },
  finance_forecast: {
    type: 'finance_forecast',
    name: 'Monthly Financial Forecast',
    category: 'finance',
    description: 'Projected end-of-month balance and runway alerts',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'LineChart',
  },
  finance_savings: {
    type: 'finance_savings',
    name: 'Savings Progress',
    category: 'finance',
    description: 'Total savings balance and primary goal progression',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'PiggyBank',
  },
  finance_budget: {
    type: 'finance_budget',
    name: 'Budget Progress',
    category: 'finance',
    description: 'Active category budget balances and allocations',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Sliders',
  },
  finance_quick_expenses: {
    type: 'finance_quick_expenses',
    name: 'Quick Expenses',
    category: 'finance',
    description: 'One-tap daily expense shortcut buttons & today tally',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Zap',
  },
  finance_money_lent: {
    type: 'finance_money_lent',
    name: 'Money Lent',
    category: 'finance',
    description: 'Outstanding receivables and active debtors',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'HandCoins',
  },
  finance_upcoming_payments: {
    type: 'finance_upcoming_payments',
    name: 'Upcoming Payments',
    category: 'finance',
    description: 'Scheduled bills and maintenance payments due soon',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Clock',
  },
  finance_category_spending: {
    type: 'finance_category_spending',
    name: 'Spending by Category',
    category: 'finance',
    description: 'Breakdown of monthly spending across categories',
    defaultSize: 'large',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'PieChart',
  },
  finance_goal_progress: {
    type: 'finance_goal_progress',
    name: 'Monthly Financial Goal',
    category: 'finance',
    description: 'Visual progress marker toward primary savings target',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'large', 'full'],
    icon: 'Target',
  },
  finance_income_allocation: {
    type: 'finance_income_allocation',
    name: 'Income Allocation Summary',
    category: 'finance',
    description: 'Active percentage distribution of monthly income',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Sliders',
  },
  finance_spending_vs_budget: {
    type: 'finance_spending_vs_budget',
    name: 'Spending vs Budget Graph',
    category: 'finance',
    description: 'Real-time curve of actual spending against budget pace',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'large', 'full'],
    icon: 'BarChart3',
  },
  finance_sadaqah: {
    type: 'finance_sadaqah',
    name: 'Sadaqah Progress',
    category: 'finance',
    description: 'Monthly planned charity vs confirmed contributions',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'HeartHandshake',
  },

  // ==========================================
  // 2. PERSONAL ORGANIZATION WIDGETS
  // ==========================================
  daily_progress: {
    type: 'daily_progress',
    name: 'Daily Progress Counter',
    category: 'personal',
    description: '10-point daily progress score tracking prayers, budget discipline & personal focus',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Award',
  },
  tasks_today: {
    type: 'tasks_today',
    name: "Today's Tasks",
    category: 'personal',
    description: 'Checklist of tasks scheduled for today with quick toggles',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'CheckSquare',
  },
  tasks_upcoming: {
    type: 'tasks_upcoming',
    name: 'Upcoming Tasks',
    category: 'personal',
    description: 'Backlog of tasks due over the next 7 days',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Calendar',
  },
  calendar_events: {
    type: 'calendar_events',
    name: 'Calendar Events',
    category: 'personal',
    description: "Today's scheduled time-blocked appointments and events",
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Clock',
  },
  personal_maintenance: {
    type: 'personal_maintenance',
    name: 'Personal Maintenance',
    category: 'personal',
    description: 'Upcoming haircut, car service, and hygiene reminders',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Wrench',
  },
  shopping_reminders: {
    type: 'shopping_reminders',
    name: 'Shopping Reminders',
    category: 'personal',
    description: 'Pending essentials shopping list with cost estimations',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'ShoppingBag',
  },
  daily_prayers: {
    type: 'daily_prayers',
    name: 'Daily Prayers',
    category: 'personal',
    description: '5 daily prayers checklist with calculation times and streak',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Compass',
  },
  weekly_review: {
    type: 'weekly_review',
    name: 'Weekly Review',
    category: 'personal',
    description: 'Past week multi-domain retrospective and metrics',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'FileText',
  },

  // ==========================================
  // 3. FITNESS WIDGETS
  // ==========================================
  gym_today_workout: {
    type: 'gym_today_workout',
    name: "Today's Workout",
    category: 'fitness',
    description: 'Target muscle groups, program day, and quick log button',
    defaultSize: 'medium',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Dumbbell',
  },
  gym_training_program: {
    type: 'gym_training_program',
    name: 'Training Program',
    category: 'fitness',
    description: 'Current active program routine details and split',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Activity',
  },
  gym_workout_stats: {
    type: 'gym_workout_stats',
    name: 'Workout Statistics',
    category: 'fitness',
    description: 'Weekly sessions completed and total volume in kg',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'TrendingUp',
  },
  gym_body_weight: {
    type: 'gym_body_weight',
    name: 'Body Weight',
    category: 'fitness',
    description: 'Latest bodyweight weigh-in and moving average',
    defaultSize: 'small',
    supportedSizes: ['small', 'medium', 'full'],
    icon: 'Scale',
  },
  gym_weight_chart: {
    type: 'gym_weight_chart',
    name: 'Weight Progress Chart',
    category: 'fitness',
    description: '7-day moving average weight trajectory chart',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'LineChart',
  },

  // ==========================================
  // 4. AI ASSISTANT WIDGETS
  // ==========================================
  ai_daily_brief: {
    type: 'ai_daily_brief',
    name: 'AI Daily Brief',
    category: 'assistant',
    description: 'Proactive daily briefing, conflict alerts, and reminders',
    defaultSize: 'full',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Bot',
  },
  ai_financial_insights: {
    type: 'ai_financial_insights',
    name: 'Financial Insights',
    category: 'assistant',
    description: 'Observation of cash runway and spending velocity',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'Sparkles',
  },
  ai_weekly_insights: {
    type: 'ai_weekly_insights',
    name: 'Weekly Insights',
    category: 'assistant',
    description: 'Honest derived reflections across fitness, prayer, and spending',
    defaultSize: 'medium',
    supportedSizes: ['medium', 'large', 'full'],
    icon: 'FileText',
  },
  ai_chat_shortcut: {
    type: 'ai_chat_shortcut',
    name: 'Assistant Chat Shortcut',
    category: 'assistant',
    description: 'Instant question input field connecting to personal desk',
    defaultSize: 'full',
    supportedSizes: ['medium', 'full'],
    icon: 'Bot',
  },
};

// ==========================================
// PRESET CONFIGURATIONS
// ==========================================

export const PRESET_CONFIGS: Record<DashboardPresetId, { name: string; description: string; widgetTypes: { type: string; size: WidgetSize }[] }> = {
  complete_overview: {
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
    name: 'Minimal',
    description: 'Only the essential daily cards for maximum focus and speed',
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
    name: 'Finance Focus',
    description: 'Prioritizes cash balance, forecast, savings, and expense tracking',
    widgetTypes: [
      { type: 'finance_balance', size: 'small' },
      { type: 'finance_income', size: 'small' },
      { type: 'finance_expenses', size: 'small' },
      { type: 'finance_sadaqah', size: 'small' },
      { type: 'finance_goal_progress', size: 'full' },
      { type: 'finance_income_allocation', size: 'full' },
      { type: 'finance_spending_vs_budget', size: 'full' },
      { type: 'finance_quick_expenses', size: 'full' },
      { type: 'finance_forecast', size: 'full' },
      { type: 'finance_savings', size: 'full' },
      { type: 'finance_money_lent', size: 'full' },
      { type: 'daily_prayers', size: 'full' },
      { type: 'tasks_today', size: 'full' },
    ],
  },
  fitness_focus: {
    name: 'Fitness Focus',
    description: 'Workout programs, statistics, and body mass progression first',
    widgetTypes: [
      { type: 'gym_today_workout', size: 'full' },
      { type: 'gym_training_program', size: 'full' },
      { type: 'gym_body_weight', size: 'small' },
      { type: 'gym_workout_stats', size: 'small' },
      { type: 'gym_weight_chart', size: 'large' },
      { type: 'daily_prayers', size: 'full' },
      { type: 'tasks_today', size: 'full' },
      { type: 'finance_balance', size: 'small' },
    ],
  },
  productivity_focus: {
    name: 'Productivity Focus',
    description: 'Tasks, calendar agenda, daily prayers, and weekly reviews first',
    widgetTypes: [
      { type: 'daily_prayers', size: 'full' },
      { type: 'tasks_today', size: 'full' },
      { type: 'tasks_upcoming', size: 'full' },
      { type: 'calendar_events', size: 'full' },
      { type: 'personal_maintenance', size: 'full' },
      { type: 'weekly_review', size: 'full' },
      { type: 'ai_daily_brief', size: 'full' },
      { type: 'finance_balance', size: 'small' },
    ],
  },
  custom: {
    name: 'Custom Layout',
    description: 'Personalized arrangement tailored by you',
    widgetTypes: [],
  },
};

export function createPresetLayout(presetId: DashboardPresetId): DashboardLayoutState {
  const config = PRESET_CONFIGS[presetId] || PRESET_CONFIGS.complete_overview;
  const widgets: DashboardWidgetConfig[] = config.widgetTypes.map((item, index) => ({
    id: `widget-${item.type}-${index}`,
    widgetType: item.type,
    size: item.size,
    visible: true,
    order: index,
  }));

  return {
    version: 1,
    preset: presetId,
    widgets,
    updated_at: Date.now(),
  };
}
