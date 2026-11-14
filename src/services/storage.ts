// Local-First Storage & Persistence Layer (Simulating SQLite with UUIDs, Local Dates, Soft Deletes)
import {
  Habit, HabitSchedule, HabitEntry,
  WorkoutPlan, WorkoutSession, Exercise, BodyweightEntry,
  CalendarEvent, Task,
  Transaction, Category, SavingsGoal, RecurringRule,
  BalanceSheetAsset, BalanceSheetLiability,
  JournalEntry,
  AssistantProposal, AssistantNotice, AssistantMessage,
  MaintenanceItem,
  FuelLogEntry,
  ShoppingItem,
  FastingDayEntry,
  ActiveFastingSession,
  SleepEntry,
  QuranKhatmahState,
  QuranReadingRecord,
  QuickExpenseShortcut, Loan, LoanRepayment,
  PrayerName, PrayerEntry, PrayerSettings,
  SalarySetting, SalaryHistoryEntry, SavingsAccount, SavingsTransaction, SalaryAllocation,
  IncomeAllocationPlan, AllocationCategoryItem, SadaqahSettings,
  TrainingProgram, TrainingDay, TrainingExercise, ProgramTemplateType,
  WeeklyReflection, WeeklyPlan,
  DashboardLayoutState, ModuleLayoutState,
  DisciplineEntry, DailyProgressSettings,
  AppSettings, AIAssistantSettings, UUID, DEFAULT_APP_MODULES,
  VoiceSettings, DEFAULT_VOICE_SETTINGS,
  HermesChatSession, HermesMemoryNote
} from '../types';

export function generateUUID(): UUID {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCurrency(amountMinor: number, currencyLabel: string = 'DA'): string {
  const major = (amountMinor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${major} ${currencyLabel}`;
}

interface StorageState {
  version: number;
  settings: AppSettings;
  habits: Habit[];
  habitSchedules: HabitSchedule[];
  habitEntries: HabitEntry[];
  exercises: Exercise[];
  workoutPlans: WorkoutPlan[];
  workoutSessions: WorkoutSession[];
  trainingPrograms: TrainingProgram[];
  activeProgramId: string;
  bodyweightEntries: BodyweightEntry[];
  events: CalendarEvent[];
  tasks: Task[];
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  salarySetting: SalarySetting;
  savingsAccount: SavingsAccount;
  savingsTransactions: SavingsTransaction[];
  salaryAllocation: SalaryAllocation;
  recurringRules: RecurringRule[];
  journalEntries: JournalEntry[];
  assistantProposals: AssistantProposal[];
  assistantNotices: AssistantNotice[];
  assistantMessages: AssistantMessage[];
  prayers: PrayerEntry[];
  prayerSettings: PrayerSettings;
  maintenanceItems: MaintenanceItem[];
  quickExpenseShortcuts: QuickExpenseShortcut[];
  loans: Loan[];
  weeklyReflections: WeeklyReflection[];
  weeklyPlans: WeeklyPlan[];
  dashboardLayout?: DashboardLayoutState;
  moduleLayouts?: Record<string, ModuleLayoutState>;
  allocationPlans?: IncomeAllocationPlan[];
  sadaqahSettings?: SadaqahSettings;
  disciplineEntries: DisciplineEntry[];
  dailyProgressSettings: DailyProgressSettings;
  hydrationLogs?: Record<string, number>;
  dailyWaterTargetMl?: number;
  fuelLogs?: FuelLogEntry[];
  shoppingItems?: ShoppingItem[];
  fastingEntries?: FastingDayEntry[];
  fastingSession?: ActiveFastingSession;
  sleepEntries?: SleepEntry[];
  quranKhatmah?: QuranKhatmahState;
  customAssets?: BalanceSheetAsset[];
  customLiabilities?: BalanceSheetLiability[];
  hermesChats?: HermesChatSession[];
  hermesNotes?: HermesMemoryNote[];
  last_modified?: number;
}

const STORAGE_KEY = 'greendream_v1_3_storage';

const INITIAL_EXERCISES: Exercise[] = [
  {
    id: 'ex-1',
    name: 'Barbell Bench Press',
    category: 'chest',
    muscles: [
      { muscle_id: 'chest', role: 'primary', weight: 1.0 },
      { muscle_id: 'triceps', role: 'secondary', weight: 0.5 },
      { muscle_id: 'front_delts', role: 'secondary', weight: 0.5 },
    ],
    created_at: Date.now(),
    updated_at: Date.now(),
    deleted_at: null,
  },
  {
    id: 'ex-2',
    name: 'Overhead Barbell Press',
    category: 'shoulders',
    muscles: [
      { muscle_id: 'shoulders', role: 'primary', weight: 1.0 },
      { muscle_id: 'triceps', role: 'secondary', weight: 0.5 },
    ],
    created_at: Date.now(),
    updated_at: Date.now(),
    deleted_at: null,
  },
  {
    id: 'ex-3',
    name: 'Barbell Squat',
    category: 'legs',
    muscles: [
      { muscle_id: 'quads', role: 'primary', weight: 1.0 },
      { muscle_id: 'glutes', role: 'primary', weight: 1.0 },
      { muscle_id: 'lower_back', role: 'secondary', weight: 0.5 },
    ],
    created_at: Date.now(),
    updated_at: Date.now(),
    deleted_at: null,
  },
  {
    id: 'ex-4',
    name: 'Lat Pulldown / Pull-ups',
    category: 'back',
    muscles: [
      { muscle_id: 'lats', role: 'primary', weight: 1.0 },
      { muscle_id: 'biceps', role: 'secondary', weight: 0.5 },
    ],
    created_at: Date.now(),
    updated_at: Date.now(),
    deleted_at: null,
  },
];

export const USER_DIRECT_GEMINI_KEY = 'AQ.Ab8RN6IDDgyk3z3ds_ykETLaBuE1_yOVABwhF5V-6JUOLzMmTg';

export const DEFAULT_AI_SETTINGS: AIAssistantSettings = {
  provider: 'gemini',
  api_key_configured: true,
  api_key_masked: '••••••••••••••••' + USER_DIRECT_GEMINI_KEY.slice(-4),
  api_key: USER_DIRECT_GEMINI_KEY,
  model: 'gemini-3.6-flash',
  backend_url: '',
  direct_mode: true,
  connection_status: 'connected',
  connection_error: null,
  last_tested_at: Date.now(),
  response_length: 'balanced',
  permissions: {
    finance_read: true,
    gym_read: true,
    tasks_read: true,
    prayers_read: true,
    maintenance_read: true,
  },
  usage: {
    total_requests: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    rate_limit_errors: 0,
    today_requests: 0,
    today_date: getTodayLocalDate(),
    free_tier_status: 'active',
  },
};

const DEFAULT_SETTINGS: AppSettings = {
  user_name: 'Yacine',
  currency_label: 'DA',
  weight_unit: 'kg',
  budget_cycle_start_day: 1,
  week_start_day: 1, // Monday
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  daily_notice_cap: 3,
  journal_lock_enabled: false,
  theme: 'dark',
  language: 'en',
  accent: 'cyan',
  font_size_scale: 1.0,
  display_mode: 'auto',
  ai: DEFAULT_AI_SETTINGS,
  voice: { ...DEFAULT_VOICE_SETTINGS },
  flame: {
    enabled: true,
    startDate: getTodayLocalDate(),
    relapses: [],
    goalDays: 30,
    showNumber: true,
    celebrations: {
      streakKey: getTodayLocalDate(),
      done: [],
      lastSeenDay: getTodayLocalDate(),
    },
    phraseHistory: [],
    savedPhrases: [],
    shareWithHermes: false,
    showTenDayWords: true,
  },
};

function getSeedData(): StorageState {
  const today = getTodayLocalDate();
  const now = Date.now();

  const h1: Habit = {
    id: 'h-1',
    name: 'Morning Meditation',
    icon: 'Sparkles',
    archived: false,
    link_source: null,
    created_at: now - 86400000 * 10,
    updated_at: now,
    deleted_at: null,
  };

  const h2: Habit = {
    id: 'h-2',
    name: 'Gym Workout',
    icon: 'Dumbbell',
    archived: false,
    link_source: 'workout',
    created_at: now - 86400000 * 10,
    updated_at: now,
    deleted_at: null,
  };

  const h3: Habit = {
    id: 'h-3',
    name: 'Log Daily Expenses',
    icon: 'Receipt',
    archived: false,
    link_source: 'finance',
    created_at: now - 86400000 * 10,
    updated_at: now,
    deleted_at: null,
  };

  const h4: Habit = {
    id: 'h-4',
    name: 'Read 20 Pages',
    icon: 'BookOpen',
    archived: false,
    link_source: null,
    created_at: now - 86400000 * 10,
    updated_at: now,
    deleted_at: null,
  };

  const h5: Habit = {
    id: 'h-5',
    name: 'Evening Reflection',
    icon: 'PenTool',
    archived: false,
    link_source: 'journal',
    created_at: now - 86400000 * 10,
    updated_at: now,
    deleted_at: null,
  };

  const schedules: HabitSchedule[] = [
    { id: 'hs-1', habit_id: h1.id, effective_from: '2026-10-01', type: 'daily', created_at: now, updated_at: now, deleted_at: null },
    { id: 'hs-2', habit_id: h2.id, effective_from: '2026-10-01', type: 'specific_days', days: [1, 3, 5], created_at: now, updated_at: now, deleted_at: null }, // Mon, Wed, Fri
    { id: 'hs-3', habit_id: h3.id, effective_from: '2026-10-01', type: 'daily', created_at: now, updated_at: now, deleted_at: null },
    { id: 'hs-4', habit_id: h4.id, effective_from: '2026-10-01', type: 'weekly_target', target: 5, created_at: now, updated_at: now, deleted_at: null },
    { id: 'hs-5', habit_id: h5.id, effective_from: '2026-10-01', type: 'daily', created_at: now, updated_at: now, deleted_at: null },
  ];

  const entries: HabitEntry[] = [
    { id: 'he-1', habit_id: h1.id, local_date: today, status: 'completed', auto: false, created_at: now, updated_at: now, deleted_at: null },
    { id: 'he-2', habit_id: h4.id, local_date: today, status: 'completed', auto: false, created_at: now, updated_at: now, deleted_at: null },
  ];

  const plan1: WorkoutPlan = {
    id: 'plan-push',
    name: 'Push Day (Chest, Shoulders & Triceps)',
    split: 'Push',
    exercises: [
      { id: 'pe-1', plan_id: 'plan-push', exercise_id: 'ex-1', target_sets: 4, target_reps: '8-10' },
      { id: 'pe-2', plan_id: 'plan-push', exercise_id: 'ex-2', target_sets: 3, target_reps: '10-12' },
    ],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const sampleSession: WorkoutSession = {
    id: 'sess-prev',
    plan_id: 'plan-push',
    name: 'Push Day',
    local_date: today,
    started_at: now - 3600000 * 2,
    ended_at: now - 3600000 * 1,
    notes: 'Felt solid on the bench press today.',
    sets: [
      { id: 'set-1', session_id: 'sess-prev', exercise_id: 'ex-1', weight_kg: 80, reps: 8, is_warmup: false, created_at: now, updated_at: now, deleted_at: null },
      { id: 'set-2', session_id: 'sess-prev', exercise_id: 'ex-1', weight_kg: 80, reps: 8, is_warmup: false, created_at: now, updated_at: now, deleted_at: null },
      { id: 'set-3', session_id: 'sess-prev', exercise_id: 'ex-1', weight_kg: 80, reps: 6, is_warmup: false, created_at: now, updated_at: now, deleted_at: null },
    ],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const defaultCategories: Category[] = [
    {
      id: 'cat-food',
      name: 'Food & Dining',
      icon: 'Utensils',
      amount_minor: 2500000, // 25,000 DA
      rollover: 'reset',
      alert_threshold: 0.8,
      color: '#F59E0B',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cat-transport',
      name: 'Transport & Commute',
      icon: 'Car',
      amount_minor: 500000, // 5,000 DA
      rollover: 'reset',
      alert_threshold: 0.8,
      color: '#3B82F6',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cat-cafe',
      name: 'Café & Social',
      icon: 'Coffee',
      amount_minor: 400000, // 4,000 DA
      rollover: 'reset',
      alert_threshold: 0.8,
      color: '#EC4899',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cat-shopping',
      name: 'Shopping & Gear',
      icon: 'ShoppingBag',
      amount_minor: 800000, // 8,000 DA
      rollover: 'reset',
      alert_threshold: 0.8,
      color: '#8B5CF6',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cat-personal',
      name: 'Personal Care',
      icon: 'Scissors',
      amount_minor: 300000, // 3,000 DA
      rollover: 'reset',
      alert_threshold: 0.8,
      color: '#10B981',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cat-car',
      name: 'Car Maintenance',
      icon: 'Wrench',
      amount_minor: 600000, // 6,000 DA
      rollover: 'reset',
      alert_threshold: 0.8,
      color: '#F97316',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cat-bills',
      name: 'Bills & Utilities',
      icon: 'Zap',
      amount_minor: 1000000, // 10,000 DA
      rollover: 'reset',
      alert_threshold: 0.8,
      color: '#6366F1',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cat-entertainment',
      name: 'Entertainment',
      icon: 'Film',
      amount_minor: 500000, // 5,000 DA
      rollover: 'reset',
      alert_threshold: 0.8,
      color: '#14B8A6',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cat-gym',
      name: 'Health & Gym',
      icon: 'HeartPulse',
      amount_minor: 600000, // 6,000 DA
      rollover: 'reset',
      alert_threshold: 0.8,
      color: '#A6D96A',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'cat-sadaqah',
      name: 'Sadaqah & Charity',
      icon: 'HeartHandshake',
      amount_minor: 250000, // 2,500 DA (5% of 50k DA)
      rollover: 'reset',
      alert_threshold: 0.9,
      color: '#38BDF8',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'expense',
      amount_minor: 120000, // 1,200 DA
      local_date: today,
      category_id: 'cat-food',
      note: 'Lunch with colleagues',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'tx-2',
      type: 'expense',
      amount_minor: 450000, // 4,500 DA
      local_date: today,
      category_id: 'cat-food',
      note: 'Supermarket groceries',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'tx-sadaqah-1',
      type: 'expense',
      amount_minor: 250000, // 2,500 DA
      local_date: '2026-11-02',
      category_id: 'cat-sadaqah',
      note: 'Monthly community & family Sadaqah',
      created_at: now - 86400000 * 2,
      updated_at: now - 86400000 * 2,
      deleted_at: null,
    },
    {
      id: 'tx-3',
      type: 'income',
      amount_minor: 5000000, // 50,000 DA
      local_date: '2026-11-01',
      note: 'Monthly salary (November)',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  const carSavingsGoal: SavingsGoal = {
    id: 'goal-car',
    name: 'Buy a car',
    opening_minor: 19000000, // 190,000 DA
    target_minor: 100000000, // 1,000,000 DA
    current_saved_minor: 19000000, // 190,000 DA
    target_date: '2028-12-31',
    monthly_contribution_minor: 3500000, // 35,000 DA/mo
    status: 'active',
    category_id: 'cat-car',
    notes: 'Down payment and vehicle purchase fund',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const emergencySavingsGoal: SavingsGoal = {
    id: 'goal-emergency',
    name: 'Emergency Fund',
    opening_minor: 12000000, // 120,000 DA
    target_minor: 30000000, // 300,000 DA
    current_saved_minor: 12000000, // 120,000 DA
    target_date: '2027-06-30',
    monthly_contribution_minor: 1500000, // 15,000 DA/mo
    status: 'active',
    notes: '6 months liquid living expenses runway',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const workstationSavingsGoal: SavingsGoal = {
    id: 'goal-computer',
    name: 'New Computer & Desk',
    opening_minor: 5000000, // 50,000 DA
    target_minor: 25000000, // 250,000 DA
    current_saved_minor: 5000000, // 50,000 DA
    target_date: '2027-02-28',
    monthly_contribution_minor: 2000000, // 20,000 DA/mo
    status: 'active',
    notes: 'High-spec workstation for engineering and deep work',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const initialAllocationPlans: IncomeAllocationPlan[] = [
    {
      id: 'plan-default',
      name: 'Standard Target (75 / 20 / 5)',
      basis: 'salary_only',
      is_active: true,
      categories: [
        { id: 'alloc-sav', name: 'Savings & Investments', type: 'percentage', value: 75, color: '#A6D96A', is_savings: true },
        { id: 'alloc-pers', name: 'Personal Spending', type: 'percentage', value: 20, color: '#83A98A' },
        { id: 'alloc-char', name: 'Sadaqah / Charity', type: 'percentage', value: 5, color: '#38BDF8', is_charity: true },
      ],
      notes: 'Standard 75% savings discipline with 5% monthly Sadaqah',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    {
      id: 'plan-aggressive',
      name: 'Aggressive Capital Accumulation',
      basis: 'total_income',
      is_active: false,
      categories: [
        { id: 'alloc-sav-2', name: 'Savings & Investments', type: 'percentage', value: 80, color: '#A6D96A', is_savings: true },
        { id: 'alloc-pers-2', name: 'Personal Spending', type: 'percentage', value: 15, color: '#83A98A' },
        { id: 'alloc-char-2', name: 'Sadaqah / Charity', type: 'percentage', value: 5, color: '#38BDF8', is_charity: true },
      ],
      notes: 'Maximum savings allocation for accelerated vehicle purchase',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
  ];

  const initialSadaqahSettings: SadaqahSettings = {
    type: 'percentage',
    value: 5, // 5%
    monthly_target_minor: 250000, // 2,500 DA (5% of 50,000 DA)
    basis: 'salary_only',
    notes: 'Dedicated 5% Sadaqah allocation from monthly income'
  };

  const initialSalary: SalarySetting = {
    monthly_salary_minor: 5000000, // 50,000 DA
    payment_day: 1,
    effective_from: '2026-10-01',
    history: [
      {
        id: 'sal-1',
        amount_minor: 5000000,
        payment_day: 1,
        effective_from: '2026-10-01',
        notes: 'Monthly standard salary',
        created_at: now - 86400000 * 35,
      }
    ]
  };

  const initialSavingsAccount: SavingsAccount = {
    current_balance_minor: 19000000, // 190,000 DA
    starting_balance_minor: 19000000,
    starting_date: '2026-10-01',
    notes: 'Primary Secure Savings'
  };

  const initialSavingsTransactions: SavingsTransaction[] = [
    {
      id: 'stx-1',
      type: 'deposit',
      amount_minor: 4000000, // 40,000 DA
      goal_id: 'goal-car',
      local_date: '2026-10-15',
      note: 'Goal contribution: Buy a car',
      created_at: now - 86400000 * 20,
      updated_at: now - 86400000 * 20,
      deleted_at: null,
    }
  ];

  const initialAllocation: SalaryAllocation = {
    savings_amount_minor: 2000000, // 20,000 DA
    personal_amount_minor: 1200000, // 12,000 DA
    car_amount_minor: 500000, // 5,000 DA
    gym_amount_minor: 400000, // 4,000 DA
    shopping_amount_minor: 500000, // 5,000 DA
    other_amount_minor: 400000, // 4,000 DA
    updated_at: now,
  };

  const initialPrayers: PrayerEntry[] = [
    { id: 'p-1', local_date: today, prayer: 'fajr', completed: true, completed_at: now - 3600000 * 16, created_at: now, updated_at: now, deleted_at: null },
    { id: 'p-2', local_date: today, prayer: 'dhuhr', completed: true, completed_at: now - 3600000 * 10, created_at: now, updated_at: now, deleted_at: null },
    { id: 'p-3', local_date: today, prayer: 'asr', completed: false, completed_at: null, created_at: now, updated_at: now, deleted_at: null },
    { id: 'p-4', local_date: today, prayer: 'maghrib', completed: false, completed_at: null, created_at: now, updated_at: now, deleted_at: null },
    { id: 'p-5', local_date: today, prayer: 'isha', completed: false, completed_at: null, created_at: now, updated_at: now, deleted_at: null },
  ];

  const initialPrayerSettings: PrayerSettings = {
    location_name: 'Algiers, Algeria',
    calculation_method: 'Algerian Ministry of Religious Affairs',
    times: {
      fajr: '05:32',
      dhuhr: '12:35',
      asr: '15:42',
      maghrib: '17:55',
      isha: '19:18',
    },
    reminders: {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
    }
  };

  const programPPL: TrainingProgram = {
    id: 'prog-ppl',
    name: 'Push / Pull / Legs',
    template_type: 'push_pull_legs',
    days_per_week: 5,
    scheduled_weekdays: [1, 2, 3, 5, 6], // Mon, Tue, Wed, Fri, Sat
    experience_level: 'intermediate',
    equipment: 'full_gym',
    estimated_duration_min: 65,
    is_active: true,
    is_paused: false,
    days: [
      {
        id: 'day-ppl-push',
        name: 'Push Day (Chest, Shoulders & Triceps)',
        target_muscle_groups: ['chest', 'shoulders', 'triceps'],
        exercises: [
          { id: 'pe-1', exercise_id: 'ex-1', exercise_name: 'Barbell Bench Press', target_sets: 4, target_reps: '8-10', rest_seconds: 90 },
          { id: 'pe-2', exercise_id: 'ex-2', exercise_name: 'Overhead Barbell Press', target_sets: 3, target_reps: '10-12', rest_seconds: 90 },
        ]
      },
      {
        id: 'day-ppl-pull',
        name: 'Pull Day (Back, Biceps & Rear Delts)',
        target_muscle_groups: ['back', 'biceps', 'rear_delts'],
        exercises: [
          { id: 'pe-3', exercise_id: 'ex-4', exercise_name: 'Lat Pulldown / Pull-ups', target_sets: 4, target_reps: '8-12', rest_seconds: 90 },
        ]
      },
      {
        id: 'day-ppl-legs',
        name: 'Leg Day (Quads, Hamstrings & Calves)',
        target_muscle_groups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: [
          { id: 'pe-4', exercise_id: 'ex-3', exercise_name: 'Barbell Squat', target_sets: 4, target_reps: '8-10', rest_seconds: 120 },
        ]
      }
    ],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const programUpperLower: TrainingProgram = {
    id: 'prog-ul',
    name: 'Upper / Lower Split',
    template_type: 'upper_lower',
    days_per_week: 4,
    scheduled_weekdays: [1, 2, 4, 5],
    experience_level: 'intermediate',
    equipment: 'full_gym',
    estimated_duration_min: 60,
    is_active: false,
    is_paused: false,
    days: [
      {
        id: 'day-ul-upper-a',
        name: 'Upper Body A',
        target_muscle_groups: ['chest', 'back', 'shoulders', 'arms'],
        exercises: [
          { id: 'pe-5', exercise_id: 'ex-1', exercise_name: 'Barbell Bench Press', target_sets: 4, target_reps: '8-10', rest_seconds: 90 },
          { id: 'pe-6', exercise_id: 'ex-4', exercise_name: 'Lat Pulldown', target_sets: 4, target_reps: '10-12', rest_seconds: 90 },
        ]
      },
      {
        id: 'day-ul-lower-a',
        name: 'Lower Body A',
        target_muscle_groups: ['quads', 'hamstrings', 'calves'],
        exercises: [
          { id: 'pe-7', exercise_id: 'ex-3', exercise_name: 'Barbell Squat', target_sets: 4, target_reps: '8-10', rest_seconds: 120 },
        ]
      }
    ],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const programFullBody: TrainingProgram = {
    id: 'prog-fb',
    name: 'Full Body Foundational',
    template_type: 'full_body',
    days_per_week: 3,
    scheduled_weekdays: [1, 3, 5],
    experience_level: 'beginner',
    equipment: 'full_gym',
    estimated_duration_min: 55,
    is_active: false,
    is_paused: false,
    days: [
      {
        id: 'day-fb-a',
        name: 'Full Body Session A',
        target_muscle_groups: ['chest', 'back', 'legs', 'core'],
        exercises: [
          { id: 'pe-8', exercise_id: 'ex-3', exercise_name: 'Barbell Squat', target_sets: 3, target_reps: '8-10', rest_seconds: 90 },
          { id: 'pe-9', exercise_id: 'ex-1', exercise_name: 'Barbell Bench Press', target_sets: 3, target_reps: '8-10', rest_seconds: 90 },
        ]
      }
    ],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const programBroSplit: TrainingProgram = {
    id: 'prog-bro',
    name: 'Classic 5-Day Bro Split',
    template_type: 'bro_split',
    days_per_week: 5,
    scheduled_weekdays: [1, 2, 3, 4, 5],
    experience_level: 'advanced',
    equipment: 'full_gym',
    estimated_duration_min: 60,
    is_active: false,
    is_paused: false,
    days: [
      {
        id: 'day-bro-chest',
        name: 'Chest Day',
        target_muscle_groups: ['chest'],
        exercises: [
          { id: 'pe-10', exercise_id: 'ex-1', exercise_name: 'Barbell Bench Press', target_sets: 4, target_reps: '8-10', rest_seconds: 90 },
        ]
      },
      {
        id: 'day-bro-back',
        name: 'Back Day',
        target_muscle_groups: ['back'],
        exercises: [
          { id: 'pe-11', exercise_id: 'ex-4', exercise_name: 'Lat Pulldown', target_sets: 4, target_reps: '8-12', rest_seconds: 90 },
        ]
      }
    ],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const programHome: TrainingProgram = {
    id: 'prog-home',
    name: 'Calisthenics & Home Workout',
    template_type: 'home_workout',
    days_per_week: 3,
    scheduled_weekdays: [1, 3, 5],
    experience_level: 'beginner',
    equipment: 'bodyweight',
    estimated_duration_min: 40,
    is_active: false,
    is_paused: false,
    days: [
      {
        id: 'day-home-a',
        name: 'Bodyweight Strength A',
        target_muscle_groups: ['chest', 'core', 'legs'],
        exercises: [
          { id: 'pe-12', exercise_id: 'ex-1', exercise_name: 'Push-ups & Core', target_sets: 4, target_reps: '15-20', rest_seconds: 60 },
        ]
      }
    ],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const tasks: Task[] = [
    { id: 'task-1', title: 'Call bank regarding payment confirmation', due_date: today, due_time: '14:00', done: false, created_at: now, updated_at: now, deleted_at: null },
    { id: 'task-2', title: 'Renew gym membership', due_date: today, due_time: '18:00', done: true, created_at: now, updated_at: now, deleted_at: null },
    { id: 'task-3', title: 'Submit weekly report', due_date: '2026-11-03', due_time: '17:00', done: false, created_at: now, updated_at: now, deleted_at: null }, // Overdue
  ];

  const events: CalendarEvent[] = [
    {
      id: 'evt-1',
      title: 'Dinner with friends',
      local_date: today,
      start_time: '18:00',
      duration: 120,
      all_day: false,
      tag: 'social',
      notes: 'Meeting at downtown café',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  const notices: AssistantNotice[] = [
    {
      id: 'not-1',
      rule_id: 'schedule_conflict',
      title: 'Schedule Overlap',
      message: 'Dinner with friends (18:00) overlaps your scheduled Push Day workout (18:30).',
      severity: 'medium',
      status: 'new',
      options: [
        { label: 'Move Workout', action_type: 'reschedule_workout' },
        { label: 'Skip as Social', action_type: 'skip_habit_social', payload: { habit_id: h2.id, reason: 'social' } },
        { label: 'Keep Both', action_type: 'dismiss_notice' },
      ],
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  ];

  return {
    version: 2,
    settings: DEFAULT_SETTINGS,
    habits: [h1, h2, h3, h4, h5],
    habitSchedules: schedules,
    habitEntries: entries,
    exercises: INITIAL_EXERCISES,
    workoutPlans: [plan1],
    workoutSessions: [sampleSession],
    trainingPrograms: [programPPL, programUpperLower, programFullBody, programBroSplit, programHome],
    activeProgramId: 'prog-ppl',
    bodyweightEntries: [
      { id: 'bw-1', local_date: '2026-10-30', weight_kg: 78.8, created_at: now, updated_at: now, deleted_at: null },
      { id: 'bw-2', local_date: '2026-10-31', weight_kg: 78.6, created_at: now, updated_at: now, deleted_at: null },
      { id: 'bw-3', local_date: '2026-11-01', weight_kg: 78.7, created_at: now, updated_at: now, deleted_at: null },
      { id: 'bw-4', local_date: '2026-11-02', weight_kg: 78.5, created_at: now, updated_at: now, deleted_at: null },
      { id: 'bw-5', local_date: '2026-11-03', weight_kg: 78.3, created_at: now, updated_at: now, deleted_at: null },
      { id: 'bw-6', local_date: today, weight_kg: 78.4, created_at: now, updated_at: now, deleted_at: null },
    ],
    events,
    tasks,
    categories: defaultCategories,
    transactions,
    savingsGoals: [carSavingsGoal, emergencySavingsGoal, workstationSavingsGoal],
    allocationPlans: initialAllocationPlans,
    sadaqahSettings: initialSadaqahSettings,
    salarySetting: initialSalary,
    savingsAccount: initialSavingsAccount,
    savingsTransactions: initialSavingsTransactions,
    salaryAllocation: initialAllocation,
    recurringRules: [],
    journalEntries: [
      {
        id: 'j-1',
        local_date: today,
        title: 'Clarity and Focus',
        body: 'Started the morning with quiet reflection. Feeling steady and motivated to wrap up the project milestone today.',
        mood: 4,
        tags: ['focus', 'morning', 'gratitude'],
        is_encrypted: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ],
    assistantProposals: [],
    assistantNotices: notices,
    assistantMessages: [
      {
        id: 'msg-1',
        role: 'assistant',
        text: 'Good day Yacine. I am your GreenDream personal intelligence desk. Ask me about your spending, tasks, haircut, training schedule, or savings goals.',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ],
    prayers: initialPrayers,
    prayerSettings: initialPrayerSettings,
    maintenanceItems: [
      {
        id: 'maint-1',
        name: 'Haircut & Beard Trim',
        category: 'personal_care',
        estimated_cost_minor: 60000, // 600 DA
        actual_cost_minor: 60000,
        recurrence_type: 'days',
        recurrence_interval: 10,
        last_service_date: '2026-11-04',
        next_reminder_date: '2026-11-14',
        priority: 'high',
        status: 'upcoming',
        notes: 'Fade haircut and beard line at Barber Studio',
        finance_category_id: 'cat-personal',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'maint-2',
        name: 'Shampoo & Conditioner Refill',
        category: 'personal_care',
        estimated_cost_minor: 85000, // 850 DA
        recurrence_type: 'days',
        recurrence_interval: 45,
        last_service_date: '2026-09-24',
        next_reminder_date: '2026-11-08',
        priority: 'medium',
        status: 'upcoming',
        notes: 'Sulfate-free keratin formula',
        finance_category_id: 'cat-personal',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'maint-3',
        name: 'Toothbrush Replacement',
        category: 'personal_care',
        estimated_cost_minor: 25000, // 250 DA
        recurrence_type: 'months',
        recurrence_interval: 3,
        last_service_date: '2026-09-01',
        next_reminder_date: '2026-12-01',
        priority: 'low',
        status: 'upcoming',
        notes: 'Soft bristles, hygienic switch',
        finance_category_id: 'cat-personal',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'maint-4',
        name: 'Engine Oil & Filter Change',
        category: 'car_maintenance',
        estimated_cost_minor: 500000, // 5,000 DA
        actual_cost_minor: 500000,
        recurrence_type: 'days',
        recurrence_interval: 90,
        last_service_date: '2026-11-04',
        next_reminder_date: '2027-02-04',
        current_odometer_km: 142500,
        next_reminder_mileage_km: 150000,
        priority: 'high',
        status: 'upcoming',
        notes: '5W-40 Synthetic + OEM oil filter',
        finance_category_id: 'cat-car',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'maint-5',
        name: 'Brake Pads Check',
        category: 'car_maintenance',
        estimated_cost_minor: 350000, // 3,500 DA
        recurrence_type: 'months',
        recurrence_interval: 6,
        last_service_date: '2026-06-15',
        next_reminder_date: '2026-12-15',
        priority: 'medium',
        status: 'upcoming',
        notes: 'Front ceramic pads wear inspection',
        finance_category_id: 'cat-car',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'maint-6',
        name: 'Cotton Underwear & Socks Pack',
        category: 'shopping',
        estimated_cost_minor: 250000, // 2,500 DA
        recurrence_type: 'as_needed',
        next_reminder_date: today,
        priority: 'high',
        status: 'upcoming',
        is_purchased: false,
        notes: 'Pure breathable cotton trunks and training socks',
        finance_category_id: 'cat-personal',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'maint-7',
        name: 'Whey Protein Isolate (2kg)',
        category: 'shopping',
        estimated_cost_minor: 620000, // 6,200 DA
        recurrence_type: 'days',
        recurrence_interval: 30,
        last_service_date: '2026-10-18',
        next_reminder_date: '2026-11-18',
        priority: 'high',
        status: 'upcoming',
        notes: 'Gym nutrition recovery',
        finance_category_id: 'cat-gym',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'maint-8',
        name: 'Training Running Shoes',
        category: 'shopping',
        estimated_cost_minor: 1400000, // 14,000 DA
        recurrence_type: 'as_needed',
        next_reminder_date: '2026-11-25',
        priority: 'medium',
        status: 'upcoming',
        is_purchased: false,
        notes: 'Road running and treadmill cushioning',
        finance_category_id: 'cat-personal',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ],
    quickExpenseShortcuts: [
      {
        id: 'sc-1',
        name: 'Taxi',
        amount_minor: 25000, // 250 DA
        category_id: 'cat-2',
        icon: 'Car',
        order: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'sc-2',
        name: 'Water bottle',
        amount_minor: 5000, // 50 DA
        category_id: 'cat-1',
        icon: 'Droplet',
        order: 2,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'sc-3',
        name: 'Café',
        amount_minor: 4000, // 40 DA
        category_id: 'cat-1',
        icon: 'Coffee',
        order: 3,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ],
    loans: [
      {
        id: 'loan-1',
        borrower_name: 'Ahmed',
        amount_minor: 500000, // 5,000 DA
        local_date: '2026-11-04',
        expected_repayment_date: '2026-11-20',
        notes: 'Car repair assistance',
        status: 'partially_repaid',
        created_at: now - 86400000,
        updated_at: now,
        deleted_at: null,
        repayments: [
          {
            id: 'rep-1',
            loan_id: 'loan-1',
            amount_minor: 200000, // 2,000 DA repaid
            local_date: '2026-11-04',
            note: 'Cash partial payment',
            created_at: now,
            updated_at: now,
            deleted_at: null,
          }
        ]
      },
      {
        id: 'loan-2',
        borrower_name: 'Karim',
        amount_minor: 1000000, // 10,000 DA
        local_date: '2026-10-25',
        expected_repayment_date: '2026-11-30',
        notes: 'Studio hardware loan',
        status: 'partially_repaid',
        created_at: now - 864000000,
        updated_at: now - 172800000,
        deleted_at: null,
        repayments: [
          {
            id: 'rep-2',
            loan_id: 'loan-2',
            amount_minor: 300000, // 3,000 DA repaid
            local_date: '2026-11-02',
            note: 'Bank transfer',
            created_at: now - 172800000,
            updated_at: now - 172800000,
            deleted_at: null,
          }
        ]
      }
    ],
    weeklyReflections: [
      {
        id: 'refl-prev',
        week_id: '2026-W44',
        start_date: '2026-10-26',
        end_date: '2026-11-01',
        what_went_well: 'Maintained 4 consistent gym sessions, stayed disciplined on grocery budget, and completed 95% of daily prayers on time.',
        what_to_improve: 'Bedtime sleep consistency was slightly irregular on Thursday, and delayed logging minor coffee expenses.',
        top_priority: 'Hit 5 workouts this coming week and finalize the savings allocation for car down payment.',
        created_at: now - 86400000 * 3,
        updated_at: now - 86400000 * 3,
        deleted_at: null,
      }
    ],
    weeklyPlans: [
      {
        id: 'plan-curr',
        week_id: '2026-W45',
        selected_task_ids: ['task-1', 'task-2'],
        top_priorities: [
          'Close outstanding bank paperwork',
          'Complete 4 training sessions (Push, Pull, Legs, Shoulders)',
          'Track all variable spending and avoid unnecessary takeout'
        ],
        scheduled_workout_days: [1, 2, 4, 5],
        notes: 'Keep recovery solid and prioritize protein intake.',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }
    ],
    dailyProgressSettings: {
      daily_progress_enabled: true,
      prayers_enabled: true,
      prayers_weight: 5,
      spending_enabled: true,
      spending_weight: 2,
      daily_spending_allowance_minor: 50000, // 500 DA
      excluded_category_ids: [],
      discipline_enabled: true,
      discipline_weight: 3,
    },
    disciplineEntries: [
      {
        id: 'disc-1',
        local_date: today,
        status: 'maintained',
        notes: 'Stayed focused and disciplined.',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'disc-2',
        local_date: '2026-11-04',
        status: 'maintained',
        notes: 'Good mental control.',
        created_at: now - 86400000,
        updated_at: now - 86400000,
        deleted_at: null,
      },
      {
        id: 'disc-3',
        local_date: '2026-11-03',
        status: 'maintained',
        notes: '',
        created_at: now - 86400000 * 2,
        updated_at: now - 86400000 * 2,
        deleted_at: null,
      }
    ],
    dashboardLayout: {
      version: 1,
      preset: 'complete_overview',
      widgets: [
        { id: 'widget-daily_progress-0', widgetType: 'daily_progress', size: 'full', visible: true, order: 0 },
        { id: 'widget-finance_quick_expenses-1', widgetType: 'finance_quick_expenses', size: 'full', visible: true, order: 1 },
        { id: 'widget-finance_balance-2', widgetType: 'finance_balance', size: 'small', visible: true, order: 2 },
        { id: 'widget-finance_income-3', widgetType: 'finance_income', size: 'small', visible: true, order: 3 },
        { id: 'widget-finance_expenses-4', widgetType: 'finance_expenses', size: 'small', visible: true, order: 4 },
        { id: 'widget-finance_savings-5', widgetType: 'finance_savings', size: 'small', visible: true, order: 5 },
        { id: 'widget-finance_forecast-6', widgetType: 'finance_forecast', size: 'full', visible: true, order: 6 },
        { id: 'widget-tasks_today-7', widgetType: 'tasks_today', size: 'full', visible: true, order: 7 },
        { id: 'widget-calendar_events-8', widgetType: 'calendar_events', size: 'medium', visible: true, order: 8 },
        { id: 'widget-daily_prayers-9', widgetType: 'daily_prayers', size: 'full', visible: true, order: 9 },
        { id: 'widget-ai_daily_brief-10', widgetType: 'ai_daily_brief', size: 'full', visible: true, order: 10 },
        { id: 'widget-gym_today_workout-11', widgetType: 'gym_today_workout', size: 'medium', visible: true, order: 11 },
        { id: 'widget-gym_workout_stats-12', widgetType: 'gym_workout_stats', size: 'small', visible: true, order: 12 },
        { id: 'widget-gym_body_weight-13', widgetType: 'gym_body_weight', size: 'small', visible: true, order: 13 },
        { id: 'widget-personal_maintenance-14', widgetType: 'personal_maintenance', size: 'full', visible: true, order: 14 },
        { id: 'widget-shopping_reminders-15', widgetType: 'shopping_reminders', size: 'full', visible: true, order: 15 },
        { id: 'widget-weekly_review-16', widgetType: 'weekly_review', size: 'full', visible: true, order: 16 },
      ],
      updated_at: now,
    },
    moduleLayouts: {},
    hermesChats: [],
    hermesNotes: [],
  };
}

export function getCleanInitialState(): StorageState {
  const today = getTodayLocalDate();
  const now = Date.now();
  const seed = getSeedData();

  const cleanSettings: AppSettings = {
    user_name: '',
    currency_label: 'DA',
    weight_unit: 'kg',
    budget_cycle_start_day: 1,
    week_start_day: 1,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    daily_notice_cap: 3,
    journal_lock_enabled: false,
    theme: 'dark',
    language: 'en',
    accent: 'cyan',
    font_size_scale: 1.0,
    ai: { ...DEFAULT_AI_SETTINGS },
    voice: { ...DEFAULT_VOICE_SETTINGS },
    flame: {
      enabled: true,
      startDate: today,
      relapses: [],
      goalDays: 30,
      showNumber: true,
      celebrations: {
        streakKey: today,
        done: [],
        lastSeenDay: today,
      },
      phraseHistory: [],
      savedPhrases: [],
      shareWithHermes: false,
      showTenDayWords: true,
    },
    onboarded: true,
    modules: { ...DEFAULT_APP_MODULES },
    show_customize_banner: false,
  };

  return {
    version: 1,
    settings: cleanSettings,
    habits: [],
    habitSchedules: [],
    habitEntries: [],
    exercises: seed.exercises,
    workoutPlans: [],
    workoutSessions: [],
    trainingPrograms: [],
    activeProgramId: '',
    bodyweightEntries: [],
    events: [],
    tasks: [],
    categories: seed.categories,
    transactions: [],
    savingsGoals: [],
    salarySetting: {
      monthly_salary_minor: 0,
      payment_day: 1,
      effective_from: today,
      history: [],
    },
    savingsAccount: {
      current_balance_minor: 0,
      starting_balance_minor: 0,
      starting_date: today,
      notes: 'Clean Slate Savings',
    },
    savingsTransactions: [],
    salaryAllocation: {
      savings_amount_minor: 0,
      personal_amount_minor: 0,
      car_amount_minor: 0,
      gym_amount_minor: 0,
      shopping_amount_minor: 0,
      other_amount_minor: 0,
      updated_at: now,
    },
    recurringRules: [],
    journalEntries: [],
    assistantProposals: [],
    assistantNotices: [],
    assistantMessages: [],
    prayers: [
      { id: 'pr-1', prayer: 'fajr', completed: false, completed_at: null, local_date: today, created_at: now, updated_at: now, deleted_at: null },
      { id: 'pr-2', prayer: 'dhuhr', completed: false, completed_at: null, local_date: today, created_at: now, updated_at: now, deleted_at: null },
      { id: 'pr-3', prayer: 'asr', completed: false, completed_at: null, local_date: today, created_at: now, updated_at: now, deleted_at: null },
      { id: 'pr-4', prayer: 'maghrib', completed: false, completed_at: null, local_date: today, created_at: now, updated_at: now, deleted_at: null },
      { id: 'pr-5', prayer: 'isha', completed: false, completed_at: null, local_date: today, created_at: now, updated_at: now, deleted_at: null },
    ],
    prayerSettings: seed.prayerSettings,
    maintenanceItems: [],
    quickExpenseShortcuts: [],
    loans: [],
    weeklyReflections: [],
    weeklyPlans: [],
    dashboardLayout: seed.dashboardLayout,
    moduleLayouts: {},
    allocationPlans: [],
    sadaqahSettings: seed.sadaqahSettings,
    disciplineEntries: [],
    dailyProgressSettings: {
      daily_progress_enabled: true,
      prayers_enabled: true,
      prayers_weight: 5,
      spending_enabled: true,
      spending_weight: 2,
      daily_spending_allowance_minor: 0,
      excluded_category_ids: [],
      discipline_enabled: true,
      discipline_weight: 3,
    },
    shoppingItems: [],
    fastingEntries: [],
    hermesChats: [],
    hermesNotes: [],
  };
}

class LocalStorageDB {
  private state: StorageState;
  private saveTimeout: any = null;
  private isSavePending: boolean = false;
  private syncStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private syncError: string | null = null;
  private lastSavedAt: number | null = null;
  private savedStatusTimeout: any = null;
  private serverSyncTimeout: any = null;

  constructor() {
    this.state = this.loadState();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushPendingSave());
      window.addEventListener('pagehide', () => this.flushPendingSave());

      // Cross-tab synchronization via storage event
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const remoteState = JSON.parse(e.newValue);
            if (remoteState && typeof remoteState === 'object' && remoteState.version) {
              this.state = remoteState;
              this.notifyListeners();
            }
          } catch {}
        }
      });

      // Internal sync: re-read state if external writer dispatches update event
      window.addEventListener('greendream_state_updated', () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && parsed.version) {
              this.state = parsed;
              this.scheduleServerSync();
            }
          }
        } catch {}
      });

      // Refocus sync: pull latest changes whenever user switches back to tab
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.pullFromServer();
        }
      });

      // Initial cloud database sync
      setTimeout(() => {
        this.pullFromServer();
      }, 80);
    }
  }

  private loadState(): StorageState {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw && typeof localStorage !== 'undefined') {
        const legacyRaw = localStorage.getItem('greendream_state_v1');
        if (legacyRaw) {
          raw = legacyRaw;
          try { localStorage.setItem(STORAGE_KEY, legacyRaw); } catch {}
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        const seed = getSeedData();
        // Schema migrations for new modules
        if (!parsed.maintenanceItems || parsed.maintenanceItems.length === 0) {
          parsed.maintenanceItems = seed.maintenanceItems;
        }
        if (!parsed.settings) {
          parsed.settings = seed.settings;
        } else {
          // Upgrade migration: if existing user had data without onboarded, mark onboarded=true with all modules enabled
          if (parsed.settings.onboarded === undefined) {
            parsed.settings.onboarded = true;
            parsed.settings.modules = { ...DEFAULT_APP_MODULES };
            parsed.settings.show_customize_banner = true;
          } else if (!parsed.settings.modules) {
            parsed.settings.modules = { ...DEFAULT_APP_MODULES };
          }

          if (!parsed.settings.theme) {
            parsed.settings.theme = 'dark';
          }
          if (!parsed.settings.display_mode || !['auto', 'phone', 'wide', 'tablet'].includes(parsed.settings.display_mode)) {
            parsed.settings.display_mode = 'auto';
          }
          if (parsed.settings.modules && parsed.settings.modules.flame === undefined) {
            parsed.settings.modules.flame = true;
          }
          if (!parsed.settings.flame) {
            const today = getTodayLocalDate();
            parsed.settings.flame = {
              enabled: true,
              startDate: today,
              relapses: [],
              goalDays: 30,
              showNumber: true,
              celebrations: {
                streakKey: today,
                done: [],
                lastSeenDay: today,
              },
              phraseHistory: [],
              savedPhrases: [],
              shareWithHermes: false,
              showTenDayWords: true,
            };
          } else {
            const flame = parsed.settings.flame;
            if (flame.enabled === undefined) flame.enabled = true;
            if (!flame.startDate) flame.startDate = getTodayLocalDate();
            if (!Array.isArray(flame.relapses)) flame.relapses = [];
            if (flame.showNumber === undefined) flame.showNumber = true;
            if (!flame.celebrations) {
              flame.celebrations = {
                streakKey: flame.startDate,
                done: [],
                lastSeenDay: getTodayLocalDate(),
              };
            }
            if (!Array.isArray(flame.phraseHistory)) flame.phraseHistory = [];
            if (!Array.isArray(flame.savedPhrases)) flame.savedPhrases = [];
            if (flame.shareWithHermes === undefined) flame.shareWithHermes = false;
            if (flame.showTenDayWords === undefined) flame.showTenDayWords = true;
          }
          if (!parsed.settings.voice) {
            parsed.settings.voice = { ...DEFAULT_VOICE_SETTINGS };
          }
          if (!parsed.settings.ai) {
            parsed.settings.ai = { ...DEFAULT_AI_SETTINGS };
          } else {
            parsed.settings.ai.provider = 'gemini';
            // Migrate deprecated/broken models to active gemini-3.5-flash
            if (!parsed.settings.ai.model || 
                parsed.settings.ai.model.startsWith('gpt') || 
                parsed.settings.ai.model.includes('1.5') || 
                parsed.settings.ai.model.includes('2.0') || 
                parsed.settings.ai.model.includes('2.5')) {
              parsed.settings.ai.model = 'gemini-3.5-flash';
            }
            // Ensure direct API key is linked
            if (!parsed.settings.ai.api_key) {
              parsed.settings.ai.api_key = USER_DIRECT_GEMINI_KEY;
            }
            parsed.settings.ai.api_key_configured = true;
            parsed.settings.ai.api_key_masked = '••••••••••••••••' + (parsed.settings.ai.api_key || USER_DIRECT_GEMINI_KEY).slice(-4);
            parsed.settings.ai.direct_mode = true;
            if (parsed.settings.ai.connection_status !== 'connected') {
              parsed.settings.ai.connection_status = 'connected';
              parsed.settings.ai.connection_error = null;
            }
            if (!parsed.settings.ai.permissions) {
              parsed.settings.ai.permissions = { ...DEFAULT_AI_SETTINGS.permissions };
            }
            if (!parsed.settings.ai.usage) {
              parsed.settings.ai.usage = { ...DEFAULT_AI_SETTINGS.usage };
            } else {
              if (parsed.settings.ai.usage.free_tier_status === undefined) {
                parsed.settings.ai.usage.free_tier_status = 'active';
              }
              if (parsed.settings.ai.usage.rate_limit_errors === undefined) {
                parsed.settings.ai.usage.rate_limit_errors = 0;
              }
            }
            if (parsed.settings.ai.backend_url === 'http://localhost:3001') {
              parsed.settings.ai.backend_url = '';
            }
            try {
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem('gd_gemini_key', parsed.settings.ai.api_key || USER_DIRECT_GEMINI_KEY);
              }
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('gd_gemini_key', parsed.settings.ai.api_key || USER_DIRECT_GEMINI_KEY);
              }
            } catch {}
          }
        }
        if (parsed.trainingPrograms === undefined) {
          parsed.trainingPrograms = seed.trainingPrograms;
          parsed.activeProgramId = seed.activeProgramId;
        }
        if (parsed.salarySetting === undefined) {
          parsed.salarySetting = seed.salarySetting;
        }
        if (parsed.savingsAccount === undefined) {
          parsed.savingsAccount = seed.savingsAccount;
        }
        if (parsed.savingsTransactions === undefined) {
          parsed.savingsTransactions = seed.savingsTransactions;
        }
        if (parsed.salaryAllocation === undefined) {
          parsed.salaryAllocation = seed.salaryAllocation;
        }
        if (parsed.prayers === undefined) {
          parsed.prayers = seed.prayers;
        }
        if (parsed.prayerSettings === undefined) {
          parsed.prayerSettings = seed.prayerSettings;
        }
        if (parsed.savingsGoals === undefined) {
          parsed.savingsGoals = seed.savingsGoals;
        }
        if (parsed.quickExpenseShortcuts === undefined) {
          parsed.quickExpenseShortcuts = seed.quickExpenseShortcuts;
        }
        if (parsed.loans === undefined) {
          parsed.loans = seed.loans;
        }
        if (parsed.weeklyReflections === undefined) {
          parsed.weeklyReflections = seed.weeklyReflections;
        }
        if (parsed.weeklyPlans === undefined) {
          parsed.weeklyPlans = seed.weeklyPlans;
        }
        if (parsed.dashboardLayout === undefined) {
          parsed.dashboardLayout = seed.dashboardLayout;
        }
        if (parsed.allocationPlans === undefined) {
          parsed.allocationPlans = seed.allocationPlans;
        }
        if (parsed.sadaqahSettings === undefined) {
          parsed.sadaqahSettings = seed.sadaqahSettings;
        }
        if (parsed.dailyProgressSettings === undefined) {
          parsed.dailyProgressSettings = seed.dailyProgressSettings;
        } else {
          if (parsed.dailyProgressSettings.daily_progress_enabled === undefined) {
            parsed.dailyProgressSettings.daily_progress_enabled = true;
          }
          if (!parsed.dailyProgressSettings.excluded_category_ids) {
            parsed.dailyProgressSettings.excluded_category_ids = [];
          }
        }
        if (parsed.disciplineEntries === undefined) {
          parsed.disciplineEntries = seed.disciplineEntries;
        }
        if (parsed.hydrationLogs === undefined) {
          parsed.hydrationLogs = {};
        }
        if (parsed.dailyWaterTargetMl === undefined) {
          parsed.dailyWaterTargetMl = 2500;
        }
        if (parsed.shoppingItems === undefined) {
          parsed.shoppingItems = [];
        }
        if (parsed.fastingEntries === undefined) {
          parsed.fastingEntries = [];
        }
        if (parsed.moduleLayouts === undefined) {
          parsed.moduleLayouts = {};
        }
        if (parsed.hermesChats === undefined) {
          parsed.hermesChats = [];
        }
        if (parsed.hermesNotes === undefined) {
          parsed.hermesNotes = [];
        }
        // Ensure goals have status if present
        if (parsed.savingsGoals && Array.isArray(parsed.savingsGoals)) {
          parsed.savingsGoals.forEach((g: any) => {
            if (!g.status) g.status = 'active';
          });
        }
        // Ensure categories exist
        if (parsed.categories === undefined || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
          parsed.categories = seed.categories;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read localStorage, initializing with clean state', e);
    }
    const clean = getCleanInitialState();
    this.saveState(clean, true);
    return clean;
  }

  public isServerSyncAvailable(): boolean {
    if (typeof window === 'undefined') return true;
    if (window.location.hostname.includes('netlify.app')) return false;
    return true;
  }

  public resolveServerUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:3001';
    if (window.location.protocol === 'capacitor:' || (window.location.hostname === 'localhost' && window.location.port === '')) {
      return 'http://10.0.2.2:3001';
    }
    return window.location.origin;
  }

  public getSyncStatus(): { status: 'idle' | 'saving' | 'saved' | 'error'; error: string | null; lastSavedAt: number | null } {
    return {
      status: this.syncStatus,
      error: this.syncError,
      lastSavedAt: this.lastSavedAt,
    };
  }

  public setSyncStatus(status: 'idle' | 'saving' | 'saved' | 'error', errorMessage?: string): void {
    this.syncStatus = status;
    this.syncError = errorMessage || null;
    if (status === 'saved') {
      this.lastSavedAt = Date.now();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('greendream_sync_status', {
        detail: { status, error: this.syncError, lastSavedAt: this.lastSavedAt }
      }));
    }
  }

  public flushPendingSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.serverSyncTimeout) {
      clearTimeout(this.serverSyncTimeout);
      this.serverSyncTimeout = null;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.isSavePending = false;
      // Guaranteed background sync on page close/navigate using sendBeacon
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const serverUrl = this.resolveServerUrl();
        if (!serverUrl.includes('netlify.app')) {
          const payload = JSON.stringify({ state: this.state });
          navigator.sendBeacon(`${serverUrl}/api/state`, payload);
        }
      }
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  private scheduleSave(): void {
    this.isSavePending = true;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.flushPendingSave();
    }, 150);
  }

  private saveState(state: StorageState, immediate: boolean = false): void {
    this.state = state;
    if (immediate) {
      this.isSavePending = true;
      this.flushPendingSave();
    } else {
      this.scheduleSave();
    }
  }

  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notifyListeners(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('Error in storage subscriber:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('greendream_state_updated', { detail: { timestamp: Date.now() } }));
    }
  }

  public getState(): StorageState {
    return this.state;
  }

  public updateState(updater: (draft: StorageState) => void): StorageState {
    updater(this.state);
    this.state.last_modified = Date.now();
    // 1. Immediate synchronous persistence to localStorage
    this.saveState(this.state, true);
    // 2. Notify all UI subscribers
    this.notifyListeners();
    // 3. Debounced asynchronous sync with visible feedback and automatic retry
    this.scheduleServerSync();
    return this.state;
  }

  private scheduleServerSync(): void {
    this.setSyncStatus('saving');
    if (this.serverSyncTimeout) {
      clearTimeout(this.serverSyncTimeout);
    }
    this.serverSyncTimeout = setTimeout(() => {
      this.syncToServer();
    }, 300);
  }

  public async pullFromServer(): Promise<boolean> {
    if (typeof window === 'undefined' || !this.isServerSyncAvailable()) return false;
    try {
      const serverUrl = this.resolveServerUrl();
      const res = await fetch(`${serverUrl}/api/state`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.success || !data.state) return false;

      const serverState: StorageState = data.state;
      const localModified = this.state.last_modified || 0;
      const serverModified = serverState.last_modified || 0;

      const isLocalFresh = (!this.state.transactions || this.state.transactions.length === 0) &&
                           (!this.state.journalEntries || this.state.journalEntries.length === 0);

      const isServerHasData = (serverState.transactions && serverState.transactions.length > 0) ||
                              (serverState.journalEntries && serverState.journalEntries.length > 0) ||
                              (serverState.habits && serverState.habits.length > 0);

      if (serverModified > localModified || (isLocalFresh && isServerHasData)) {
        console.log('[SYNC] Server state is newer or local is fresh; synchronizing to local state');
        this.state = serverState;
        this.saveState(serverState, true);
        this.notifyListeners();
        this.setSyncStatus('saved');
        if (this.savedStatusTimeout) clearTimeout(this.savedStatusTimeout);
        this.savedStatusTimeout = setTimeout(() => this.setSyncStatus('idle'), 2000);
        return true;
      } else if (localModified > serverModified && !isLocalFresh) {
        console.log('[SYNC] Local state is newer; synchronizing to cloud database');
        this.syncToServer();
      }
      return true;
    } catch (err: any) {
      console.warn('[SYNC] Server pull failed:', err.message);
      return false;
    }
  }

  public async syncToServer(retryCount = 0): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.isServerSyncAvailable()) {
      this.setSyncStatus('saved');
      if (this.savedStatusTimeout) clearTimeout(this.savedStatusTimeout);
      this.savedStatusTimeout = setTimeout(() => {
        if (this.syncStatus === 'saved') this.setSyncStatus('idle');
      }, 1500);
      return;
    }
    this.setSyncStatus('saving');
    try {
      const serverUrl = this.resolveServerUrl();
      const res = await fetch(`${serverUrl}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: this.state })
      });
      if (res.status === 404) {
        // Purely static deployment (no backend) - local storage is the source of truth
        this.setSyncStatus('idle');
        return;
      }
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        this.setSyncStatus('saved');
        if (this.savedStatusTimeout) clearTimeout(this.savedStatusTimeout);
        this.savedStatusTimeout = setTimeout(() => {
          if (this.syncStatus === 'saved') {
            this.setSyncStatus('idle');
          }
        }, 2500);
      } else {
        throw new Error(data.error || 'Sync rejected');
      }
    } catch (err: any) {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => this.syncToServer(retryCount + 1), delay);
      } else {
        console.warn('[SYNC] Sync failed after retries:', err.message);
        this.setSyncStatus('error', err.message || 'Network sync failed');
      }
    }
  }

  public resetToSeed(): StorageState {
    const seed = getSeedData();
    this.state = seed;
    this.saveState(seed, true);
    this.notifyListeners();
    return seed;
  }

  public loadSampleData(): StorageState {
    const seed = getSeedData();
    seed.settings.user_name = this.state.settings.user_name || 'Yacine';
    seed.settings.language = this.state.settings.language || 'en';
    seed.settings.theme = this.state.settings.theme || 'dark';
    seed.settings.accent = this.state.settings.accent || 'cyan';
    seed.settings.onboarded = true;
    seed.settings.modules = { ...DEFAULT_APP_MODULES };
    seed.settings.show_customize_banner = false;
    this.state = seed;
    this.saveState(seed, true);
    this.notifyListeners();
    return seed;
  }

  public removeSampleData(): StorageState {
    const clean = getCleanInitialState();
    clean.settings = { ...this.state.settings, onboarded: true };
    this.state = clean;
    this.saveState(clean, true);
    this.notifyListeners();
    return clean;
  }

  public resetToCleanState(): StorageState {
    const clean = getCleanInitialState();
    this.state = clean;
    this.saveState(clean, true);
    this.notifyListeners();
    return clean;
  }

  public importState(newState: StorageState): StorageState {
    this.state = newState;
    this.saveState(newState, true);
    this.notifyListeners();
    this.syncToServer();
    return newState;
  }
}

export const db = new LocalStorageDB();

if (typeof window !== 'undefined') {
  (window as any).__gd_db = db;
  (window as any).db = db;
}
