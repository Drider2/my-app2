// GREENDREAM Core Data Model Types (v1.3 Specification)

export type UUID = string;

export interface BaseEntity {
  id: UUID;
  created_at: number; // Unix timestamp ms
  updated_at: number;
  deleted_at: number | null; // Soft delete support
}

// ------------------------------------
// 1. Habits
// ------------------------------------
export interface Habit extends BaseEntity {
  name: string;
  icon: string; // Lucide icon name
  archived: boolean;
  link_source?: 'workout' | 'finance' | 'journal' | null;
}

export type HabitScheduleType = 'daily' | 'weekdays' | 'specific_days' | 'weekly_target';

export interface HabitSchedule extends BaseEntity {
  habit_id: UUID;
  effective_from: string; // 'YYYY-MM-DD'
  type: HabitScheduleType;
  days?: number[]; // [0 = Sun, 1 = Mon ... 6 = Sat]
  target?: number; // e.g. 3 for 3x/week
}

export type HabitDayState = 'completed' | 'skipped' | 'missed' | 'not_scheduled';

export interface HabitEntry extends BaseEntity {
  habit_id: UUID;
  local_date: string; // 'YYYY-MM-DD'
  status: 'completed' | 'skipped';
  reason?: 'sick' | 'travel' | 'rest' | 'social' | 'other' | string;
  auto: boolean; // True if triggered automatically via linked module
}

// ------------------------------------
// 2. Gym & Physical Training
// ------------------------------------
export interface MuscleGroup {
  id: string;
  name: string;
  region: 'upper' | 'lower' | 'core';
}

export interface ExerciseMuscle {
  muscle_id: string;
  role: 'primary' | 'secondary';
  weight: number; // 1.0 for primary, 0.5 for secondary
}

export interface Exercise extends BaseEntity {
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  muscles: ExerciseMuscle[];
}

export interface PlanExercise {
  id: UUID;
  plan_id: UUID;
  exercise_id: UUID;
  target_sets: number;
  target_reps: string; // e.g. '8-12'
}

export interface WorkoutPlan extends BaseEntity {
  name: string;
  split: string; // e.g. 'Push Day', 'Pull Day', 'Legs', 'Full Body'
  exercises: PlanExercise[];
}

export type ProgramTemplateType = 
  | 'full_body' 
  | 'upper_lower' 
  | 'push_pull_legs' 
  | 'bro_split' 
  | 'home_workout' 
  | 'custom';

export interface TrainingExercise {
  id: UUID;
  exercise_id: UUID;
  exercise_name: string;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
}

export interface TrainingDay {
  id: UUID;
  name: string; // e.g. "Push Day", "Pull Day", "Legs"
  target_muscle_groups: string[];
  exercises: TrainingExercise[];
}

export interface TrainingProgram extends BaseEntity {
  name: string;
  template_type: ProgramTemplateType;
  days_per_week: number;
  scheduled_weekdays: number[]; // [1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun]
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  equipment: 'full_gym' | 'dumbbells_only' | 'bodyweight' | 'home_gym';
  estimated_duration_min: number;
  days: TrainingDay[];
  is_active: boolean;
  is_paused: boolean;
}

export interface SetEntry extends BaseEntity {
  session_id: UUID;
  exercise_id: UUID;
  weight_kg: number;
  reps: number;
  is_warmup: boolean;
}

export interface WorkoutSession extends BaseEntity {
  plan_id: UUID | null; // Nullable if unplanned workout
  name: string;
  local_date: string; // 'YYYY-MM-DD'
  started_at: number;
  ended_at: number | null;
  notes: string;
  sets: SetEntry[];
}

export type MuscleRecoveryState = 'recently_trained' | 'recovering' | 'likely_recovered' | 'no_history';

export interface BodyweightEntry extends BaseEntity {
  local_date: string;
  weight_kg: number;
}

// ------------------------------------
// 3. Calendar & Tasks
// ------------------------------------
export interface CalendarEvent extends BaseEntity {
  title: string;
  local_date: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:mm' floating local time
  duration: number; // minutes
  all_day: boolean;
  notes?: string;
  reminders?: number[]; // minutes before event
  tag?: 'social' | 'work' | 'personal' | 'health';
}

export interface Task extends BaseEntity {
  title: string;
  due_date?: string; // 'YYYY-MM-DD'
  due_time?: string; // 'HH:mm'
  done: boolean;
  event_id?: UUID | null;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface VirtualOccurrence {
  id: string;
  source: 'habit' | 'workout' | 'event' | 'savings_goal' | 'maintenance';
  source_id: UUID;
  title: string;
  local_date: string;
  start_time?: string;
  duration?: number;
  is_completed: boolean;
  tag?: string;
}

// ------------------------------------
// 4. Finance
// ------------------------------------
export type TransactionType = 'income' | 'expense' | 'transfer' | 'loan_given' | 'loan_repayment';

export interface Transaction extends BaseEntity {
  type: TransactionType;
  amount_minor: number; // Integer in minor units (e.g. 120000 = 1,200.00)
  local_date: string;
  category_id?: UUID | null;
  goal_id?: UUID | null;
  loan_id?: UUID | null;
  borrower_name?: string | null;
  note?: string;
  recurring_id?: UUID | null;
  maintenance_item_id?: UUID | null; // Linked to maintenance item
}

export interface QuickExpenseShortcut extends BaseEntity {
  name: string;
  amount_minor: number;
  category_id?: UUID | null;
  icon?: string;
  order: number;
}

export type LoanStatus = 'not_repaid' | 'partially_repaid' | 'fully_repaid';

export interface LoanRepayment extends BaseEntity {
  loan_id: UUID;
  amount_minor: number;
  local_date: string;
  note?: string;
}

export interface Loan extends BaseEntity {
  borrower_name: string;
  amount_minor: number;
  local_date: string;
  expected_repayment_date?: string;
  notes?: string;
  status: LoanStatus;
  repayments: LoanRepayment[];
}

export interface Category extends BaseEntity {
  name: string;
  icon: string;
  amount_minor: number; // Allocated budget limit
  rollover: 'reset' | 'carryover';
  alert_threshold?: number; // e.g. 0.8 (80%)
  color?: string;
}

export interface BalanceSheetAsset extends BaseEntity {
  name: string;
  category: 'liquid_cash' | 'savings' | 'bullion' | 'vehicle' | 'real_estate' | 'receivable' | 'investment' | 'other';
  value_minor: number;
  notes?: string;
  is_auto_synced?: boolean;
}

export interface BalanceSheetLiability extends BaseEntity {
  name: string;
  creditor?: string;
  amount_minor: number;
  due_date?: string;
  notes?: string;
}

export type SavingsGoalStatus = 'active' | 'paused' | 'archived';

export interface SavingsGoal extends BaseEntity {
  name: string;
  opening_minor: number;
  target_minor: number;
  current_saved_minor?: number;
  target_date?: string; // 'YYYY-MM-DD'
  monthly_contribution_minor?: number;
  status?: SavingsGoalStatus;
  category_id?: UUID | null;
  notes?: string;
}

// ------------------------------------
// Financial Goals, Allocation & Sadaqah
// ------------------------------------
export interface AllocationCategoryItem {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage (e.g. 75 for 75%) or fixed minor amount (e.g. 1000000 for 10,000 DA)
  color?: string;
  is_charity?: boolean;
  is_savings?: boolean;
}

export interface IncomeAllocationPlan extends BaseEntity {
  name: string;
  basis: 'salary_only' | 'total_income';
  is_active: boolean;
  categories: AllocationCategoryItem[];
  notes?: string;
}

export interface SadaqahSettings {
  type: 'percentage' | 'fixed';
  value: number; // e.g. 5 for 5% or fixed amount in minor units
  monthly_target_minor: number;
  basis: 'salary_only' | 'total_income';
  notes?: string;
}

export type AnalyticsTimeRange = '7d' | '30d' | '3m' | '6m' | '1y' | 'custom';

export interface CategoryAnalyticsMetric {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalSpentMinor: number;
  percentageOfTotalSpend: number;
  transactionCount: number;
  averageTransactionMinor: number;
  budgetMinor: number;
  budgetConsumedPct: number;
  budgetStatus: 'normal' | 'warning' | 'exceeded'; // normal <80%, warning 80-99%, exceeded >=100%
  dailyAverageMinor: number;
  previousPeriodSpentMinor: number;
  deltaPct: number; // positive = increased spending, negative = reduced
}

export interface SpendingProgressPoint {
  date: string;
  label: string;
  dayIndex: number;
  actualCumulativeMinor: number;
  budgetPaceMinor: number;
  projectedTrendMinor?: number;
}

export interface IncomeVsSpendingSummary {
  periodLabel: string;
  totalIncomeMinor: number;
  actualExpensesMinor: number;
  savingsTransfersMinor: number;
  sadaqahContributionsMinor: number;
  netRemainingBalanceMinor: number;
}

export interface SalaryHistoryEntry {
  id: UUID;
  amount_minor: number;
  effective_from: string; // 'YYYY-MM-DD'
  payment_day: number;
  notes?: string;
  created_at: number;
}

export interface SalarySetting {
  monthly_salary_minor: number;
  payment_day: number;
  effective_from: string;
  history: SalaryHistoryEntry[];
}

export interface SavingsAccount {
  current_balance_minor: number;
  starting_balance_minor: number;
  starting_date: string;
  notes?: string;
}

export interface SavingsTransaction extends BaseEntity {
  type: 'deposit' | 'withdrawal' | 'adjustment';
  amount_minor: number;
  goal_id?: UUID | null;
  local_date: string;
  note?: string;
}

export interface SalaryAllocation {
  savings_amount_minor: number;
  personal_amount_minor: number;
  car_amount_minor: number;
  gym_amount_minor: number;
  shopping_amount_minor: number;
  other_amount_minor: number;
  updated_at: number;
}

export interface RecurringRule extends BaseEntity {
  type: TransactionType;
  amount_minor: number;
  category_id?: UUID | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_date: string;
  note?: string;
}

// ------------------------------------
// 5. Personal Maintenance & Shopping (NEW)
// ------------------------------------
export type MaintenanceCategory = 'personal_care' | 'shopping' | 'car_maintenance';
export type RecurrenceType = 'days' | 'weeks' | 'months' | 'mileage' | 'as_needed';
export type ItemPriority = 'low' | 'medium' | 'high';
export type MaintenanceStatus = 'upcoming' | 'due' | 'completed' | 'paused';

export interface MaintenanceItem extends BaseEntity {
  name: string;
  category: MaintenanceCategory;
  estimated_cost_minor: number; // In minor units (e.g. 60000 = 600 DA)
  actual_cost_minor?: number | null;
  recurrence_type: RecurrenceType;
  recurrence_interval?: number; // e.g. 10 for every 10 days
  last_service_date?: string; // 'YYYY-MM-DD'
  next_reminder_date: string; // 'YYYY-MM-DD'
  current_odometer_km?: number;
  next_reminder_mileage_km?: number;
  priority: ItemPriority;
  status: MaintenanceStatus;
  is_purchased?: boolean;
  notes?: string;
  finance_category_id?: string; // e.g. 'cat-personal' or 'cat-car'
}

export interface FuelLogEntry extends BaseEntity {
  odometer_km: number;
  liters: number;
  cost_minor: number;
  fuel_type: 'essence' | 'gasoil' | 'gpl';
  station_name?: string;
  local_date: string; // 'YYYY-MM-DD'
  notes?: string;
}

// ------------------------------------
// Shopping & Supplies Checklist
// ------------------------------------
export type ShoppingCategory = 'groceries' | 'household' | 'fitness' | 'automotive' | 'other';

export interface ShoppingItem extends BaseEntity {
  name: string;
  category: ShoppingCategory;
  estimated_price: number; // in primary currency unit (e.g. DA)
  quantity: number;
  unit?: string; // 'kg', 'pcs', 'L', 'pack', etc.
  is_completed: boolean;
  notes?: string;
  completed_at?: number | null;
}

// ------------------------------------
// Fasting Tracker (Ramadan, Sunnah & Intermittent)
// ------------------------------------
export type FastingType = 'ramadan' | 'sunnah_monday_thursday' | 'white_days' | 'voluntary' | 'qada';

export type IntermittentProtocol = '16_8' | '18_6' | '20_4' | '23_1' | '14_10' | 'circadian';

export interface ActiveFastingSession {
  id: string;
  start_time_ms: number;
  target_hours: number;
  protocol: IntermittentProtocol | 'custom';
  is_active: boolean;
  notes?: string;
}

export interface FastingDayEntry extends BaseEntity {
  local_date: string; // 'YYYY-MM-DD'
  type: FastingType;
  completed: boolean;
  notes?: string;
  suhur_completed?: boolean;
  iftar_completed?: boolean;
}

// ------------------------------------
// 6. Journal
// ------------------------------------
export interface JournalEntry extends BaseEntity {
  local_date: string;
  title?: string;
  body: string;
  mood?: number; // 1 to 5 scale
  tags: string[];
  is_encrypted?: boolean;
}

// ------------------------------------
// 7. Assistant & Proposal Engine
// ------------------------------------
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'failed';

export interface AssistantProposal extends BaseEntity {
  action_type: 'create_expense' | 'create_workout' | 'create_task' | 'create_event' | 'log_bodyweight' | 'create_journal' | 'complete_maintenance' | 'lend_money' | 'record_repayment';
  payload: any;
  source_text: string;
  status: ProposalStatus;
  decided_at?: number | null;
  result_record_id?: UUID | null;
}

export type NoticeSeverity = 'low' | 'medium' | 'high';
export type NoticeStatus = 'new' | 'seen' | 'acted' | 'dismissed' | 'snoozed';

export interface AssistantNotice extends BaseEntity {
  rule_id: 'schedule_conflict' | 'recovery_mismatch' | 'budget_warning' | 'streak_at_risk' | 'overdue_task' | 'maintenance_due';
  title: string;
  message: string;
  severity: NoticeSeverity;
  status: NoticeStatus;
  related_ids?: string[];
  options: {
    label: string;
    action_type: string;
    payload?: any;
  }[];
  snooze_until?: number | null;
}

export interface AssistantMessage extends BaseEntity {
  role: 'user' | 'assistant';
  text: string;
  proposal_id?: UUID | null;
  isStreaming?: boolean;
  isError?: boolean;
}

// ------------------------------------
// 7.1 Google Gemini & Hermes AI Assistant Settings
// ------------------------------------
export type AIConnectionStatus = 'not_configured' | 'connecting' | 'connected' | 'error';
export type ResponseLengthPreference = 'compact' | 'balanced' | 'detailed';
export type HermesMode = 'chat_only' | 'read_data' | 'read_and_act';

export interface HermesShareContext {
  prayer?: boolean;
  finance?: boolean;
  gym?: boolean;
  calendar?: boolean;
  maintenance?: boolean;
  journal?: boolean;
}

export interface HermesReasoningStep {
  tool: string;
  label: string;
  status: 'running' | 'done' | 'error';
  result?: any;
  rawParts?: any[];
}

export interface HermesActionCard {
  id: string;
  toolName: string;
  params: Record<string, any>;
  status: 'pending' | 'confirmed' | 'cancelled';
  executedAt?: number;
  undoData?: Record<string, any>;
  rawParts?: any[];
}

export interface HermesVoiceAttachment {
  base64Audio?: string;
  mimeType: string;
  durationSeconds: number;
  transcription?: string;
}

export interface HermesMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  thinking?: string;
  reasoningSteps?: HermesReasoningStep[];
  actionCard?: HermesActionCard;
  voiceAttachment?: HermesVoiceAttachment;
  rawParts?: any[];
}

export interface HermesChatSession {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  messages: HermesMessage[];
}

export interface HermesMemoryNote {
  id: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface AIAssistantPermissions {
  finance_read: boolean;
  gym_read: boolean;
  tasks_read: boolean;
  prayers_read: boolean;
  maintenance_read: boolean;
}

export interface AIAssistantUsage {
  total_requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  rate_limit_errors: number;
  today_requests: number;
  today_date: string;
  free_tier_status: 'active' | 'quota_exceeded' | 'unknown';
}

export interface AIAssistantSettings {
  provider: 'gemini';
  api_key_configured: boolean;
  api_key_masked: string;
  api_key?: string;
  apiKey?: string; // Hermes alias
  model: string;
  hermesMode?: HermesMode;
  hermesServerUrl?: string;
  shareContext?: HermesShareContext;
  available_models?: string[];
  backend_url: string;
  direct_mode: boolean;
  connection_status: AIConnectionStatus;
  connection_error: string | null;
  last_tested_at: number | null;
  response_length: ResponseLengthPreference;
  permissions: AIAssistantPermissions;
  usage: AIAssistantUsage;
}

// ------------------------------------
// 8. Daily Prayers
// ------------------------------------
export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerEntry extends BaseEntity {
  local_date: string; // 'YYYY-MM-DD'
  prayer: PrayerName;
  completed: boolean;
  completed_at?: number | null; // timestamp ms
}

export interface PrayerSettings {
  location_name: string;
  calculation_method: string;
  times: Record<PrayerName, string>;
  reminders: Record<PrayerName, boolean>;
}

// ------------------------------------
// 9. Settings
// ------------------------------------
export type AppThemeMode = 'light' | 'dark' | 'matte' | 'carbon' | 'system';
export type AppLanguage = 'en' | 'fr' | 'ar';
export type FontSizeScalePreset = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AccentPreset = 'cyan' | 'lime' | 'violet' | 'rose';

export interface AppModulesConfig {
  prayer?: boolean;
  finance?: boolean;
  gym?: boolean;
  calendar?: boolean;
  journal?: boolean;
  maintenance?: boolean;
  weekly_review?: boolean;
  assistant?: boolean;
  flame?: boolean;
}

export const DEFAULT_APP_MODULES: Required<AppModulesConfig> = {
  prayer: true,
  finance: true,
  gym: true,
  calendar: true,
  journal: true,
  maintenance: true,
  weekly_review: true,
  assistant: true,
  flame: true,
};

export interface VoiceSettings {
  enabled?: boolean;
  language?: string; // 'auto' | 'en-US' | 'fr-FR' | 'ar-SA' | 'ar-DZ'
  voiceURI?: string;
  voiceName?: string;
  speechRate?: number; // 0.7 to 1.5, default 1.0
  speechPitch?: number; // 0.8 to 1.2, default 1.0
  readRepliesAloud?: boolean; // default false
  handsFreeMode?: boolean; // default false
  handsFreeSilenceSeconds?: number; // default 1.2
  highQualityVoice?: boolean; // Tier 2 Gemini TTS (default false)
  alwaysVoiceReplyToVoice?: boolean; // default true
  voiceMessagesVolume?: number; // default 1.0
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  language: 'auto',
  voiceURI: '',
  voiceName: '',
  speechRate: 1.0,
  speechPitch: 1.0,
  readRepliesAloud: false,
  handsFreeMode: false,
  handsFreeSilenceSeconds: 1.2,
  highQualityVoice: false,
  alwaysVoiceReplyToVoice: true,
  voiceMessagesVolume: 1.0,
};

// ------------------------------------
// 9. Sober Flame (Daily Streak)
// ------------------------------------
export type FlameDayStatus = 'before_start' | 'sober' | 'relapse' | 'pending' | 'future';

export type FlameTriggerTag = 'stress' | 'tired' | 'social' | 'bored' | 'no_reason' | string;

export interface FlameRelapseEntry {
  date: string;          // 'YYYY-MM-DD' (local calendar day)
  at: number;            // Unix timestamp ms of when the slip was recorded
  trigger?: FlameTriggerTag; // Optional trigger tag selected by user
}

export interface FlameSavedPhrase {
  id: number;            // 1 to 12
  text: string;          // Localized phrase text
  dateEarned: string;    // 'YYYY-MM-DD'
  milestone: number;     // 10, 20, 30, etc.
}

export interface FlameCelebrationsState {
  streakKey: string;     // 'YYYY-MM-DD': date current streak began
  done: number[];        // Milestones already celebrated: [10, 20, 30, ...]
  lastSeenDay: string;   // 'YYYY-MM-DD': last calendar day app was opened/evaluated
}

export interface FlameSettings {
  enabled: boolean;      // Master toggle for the flame module (default: true)
  startDate: string;     // 'YYYY-MM-DD': Day the journey began
  relapses: FlameRelapseEntry[]; // List of recorded slip events
  goalDays?: number;     // Optional streak target: e.g. 30, 90, 365 days
  showNumber: boolean;   // Whether to show the number beside flame in header (default: true)
  celebrations: FlameCelebrationsState;
  phraseHistory: number[]; // IDs of the last 6 phrases shown (to prevent repetition)
  savedPhrases?: FlameSavedPhrase[]; // User's bookmarked "Words you earned"
  shareWithHermes?: boolean; // Default false: whether Hermes AI can see Flame data
  showTenDayWords?: boolean; // Default true: full-screen milestone moment toggle
}

export const DEFAULT_FLAME_SETTINGS: FlameSettings = {
  enabled: true,
  startDate: '2026-01-01',
  relapses: [],
  goalDays: 30,
  showNumber: true,
  celebrations: {
    streakKey: '2026-01-01',
    done: [],
    lastSeenDay: '2026-01-01',
  },
  phraseHistory: [],
  savedPhrases: [],
  shareWithHermes: false,
  showTenDayWords: true,
};

export type DisplayMode = 'auto' | 'phone' | 'wide' | 'tablet';
export type LayoutSize = 'phone' | 'wide' | 'tablet';

export interface AppSettings {
  user_name: string;
  currency_label: string; // e.g. 'DA' or 'EUR' or '$'
  weight_unit: 'kg' | 'lb';
  budget_cycle_start_day: number; // 1 to 31
  week_start_day: 0 | 1; // 0 = Sun, 1 = Mon
  quiet_hours_start: string; // '22:00'
  quiet_hours_end: string; // '08:00'
  daily_notice_cap: number;
  journal_lock_enabled: boolean;
  theme: AppThemeMode;
  language?: AppLanguage;
  accent?: AccentPreset; // 'cyan' | 'lime' | 'violet' | 'rose'
  font_size_scale?: number; // 0.85 to 1.20 (default 1.0)
  display_mode?: DisplayMode; // 'auto' | 'phone' | 'wide' | 'tablet'
  ai?: AIAssistantSettings;
  voice?: VoiceSettings;
  flame?: FlameSettings;
  onboarded?: boolean;
  modules?: AppModulesConfig;
  show_customize_banner?: boolean;
}

// ------------------------------------
// 10. Financial Forecast & Affordability
// ------------------------------------
export type AffordabilityVerdict = 'comfortable' | 'possible_caution' | 'not_recommended';

export interface AffordabilityCheckResult {
  verdict: AffordabilityVerdict;
  title: string;
  explanation: string;
  purchasePriceMinor: number;
  currentAvailableMinor: number;
  projectedBalanceAfterMinor: number;
  upcomingCommitmentsMinor: number;
  safeDiscretionaryLimitMinor: number;
  impactOnSavingsGoal: string;
}

export interface FinancialWarning {
  id: string;
  type: 'budget_risk' | 'low_cash_runway' | 'savings_risk' | 'upcoming_bill' | 'info';
  severity: 'low' | 'medium' | 'high';
  message: string;
  detail: string;
}

export interface ForecastProjectionPoint {
  day: number;
  date: string;
  actualBalanceMinor: number | null;
  projectedBalanceMinor: number;
  isProjected: boolean;
}

export interface MonthlyForecastData {
  period: 'current' | 'next';
  periodLabel: string;
  startingBalanceMinor: number;
  expectedIncomeMinor: number;
  confirmedExpensesMinor: number;
  upcomingRecurringMinor: number;
  estimatedVariableMinor: number;
  plannedSavingsMinor: number;
  predictedEndingBalanceMinor: number;
  daysRemainingInCycle: number;
  dailyBurnRateMinor: number;
  dailyProjectedPoints: ForecastProjectionPoint[];
  topExpenseCategories: { name: string; amountMinor: number; percentage: number }[];
  warnings: FinancialWarning[];
}

// ------------------------------------
// 11. Weekly Review & Reflections
// ------------------------------------
export interface WeeklyReflection extends BaseEntity {
  week_id: string; // e.g. '2026-W45'
  start_date: string; // 'YYYY-MM-DD'
  end_date: string; // 'YYYY-MM-DD'
  what_went_well: string;
  what_to_improve: string;
  top_priority: string;
}

export interface WeeklyPlan extends BaseEntity {
  week_id: string;
  selected_task_ids: string[];
  top_priorities: string[];
  scheduled_workout_days: number[]; // [1, 3, 5]
  notes?: string;
}

// ------------------------------------
// 12. Global Customizable Modules System (Dashboard, Finance, Gym, Calendar, Assistant, etc.)
// ------------------------------------
export type ModuleId = 
  | 'dashboard' 
  | 'finance' 
  | 'gym' 
  | 'calendar' 
  | 'assistant' 
  | 'maintenance' 
  | 'prayers' 
  | 'weeklyReview';

export type WidgetCategory = 'finance' | 'personal' | 'fitness' | 'assistant' | 'maintenance' | 'prayers' | 'calendar';
export type WidgetSize = 'small' | 'medium' | 'large' | 'full' | 'portrait';

export type ResolutionMode = 'full' | 'small' | 'portrait';

export interface SizeResolutionOption {
  id: ResolutionMode;
  label: string;
  width: number;
  height: number;
  pixelLabel: string;
  description: string;
}

export const SIZE_RESOLUTION_OPTIONS: Record<ResolutionMode, SizeResolutionOption> = {
  full: {
    id: 'full',
    label: 'Full',
    width: 1920,
    height: 1080,
    pixelLabel: '1920 × 1080 px',
    description: 'Full-width panoramic layout (16:9 widescreen)'
  },
  small: {
    id: 'small',
    label: 'Small',
    width: 400,
    height: 300,
    pixelLabel: '400 × 300 px',
    description: 'Compact modular card (4:3 ratio)'
  },
  portrait: {
    id: 'portrait',
    label: 'Portrait',
    width: 1080,
    height: 1920,
    pixelLabel: '1080 × 1920 px',
    description: 'Vertical tall aspect ratio (9:16 portrait)'
  }
};

export interface ModuleWidgetConfig {
  id: string;
  widgetType: string;
  size: WidgetSize;
  resolution?: ResolutionMode;
  dimensions?: { width: number; height: number; pixelLabel: string };
  visible: boolean;
  order: number;
  customTitle?: string;
}

export type DashboardWidgetConfig = ModuleWidgetConfig;

export type DashboardPresetId = 'minimal' | 'finance_focus' | 'fitness_focus' | 'productivity_focus' | 'complete_overview' | 'custom';

export interface ModuleLayoutState {
  moduleId: ModuleId;
  version: number;
  preset: string;
  widgets: ModuleWidgetConfig[];
  updated_at: number;
}

export interface DashboardLayoutState {
  version: number;
  preset: DashboardPresetId;
  widgets: DashboardWidgetConfig[];
  updated_at: number;
}

// ------------------------------------
// 13. Daily Progress Counter & Personal Discipline (10-Point System)
// ------------------------------------
export type DisciplineStatus = 'maintained' | 'relapsed' | 'unrecorded';

export interface DisciplineEntry extends BaseEntity {
  local_date: string; // 'YYYY-MM-DD'
  status: 'maintained' | 'relapsed';
  notes?: string;
}

export interface DailyProgressSettings {
  daily_progress_enabled: boolean;
  prayers_enabled: boolean;
  prayers_weight: number; // default 5 (1 pt per prayer)
  spending_enabled: boolean;
  spending_weight: number; // default 2
  daily_spending_allowance_minor: number; // default 50000 (500 DA)
  excluded_category_ids: string[]; // Categories excluded from daily spending check
  discipline_enabled: boolean;
  discipline_weight: number; // default 3
}

export type DailyProgressLevel = 'starting' | 'building' | 'strong' | 'achieved';

export interface DailyProgressBreakdown {
  date: string;
  total_score: number; // 0 to 10
  max_score: number; // 10
  level: DailyProgressLevel;
  level_label: string;
  prayers_score: number;
  prayers_max: number;
  prayers_completed: number;
  prayers_total: number;
  spending_score: number;
  spending_max: number;
  today_spending_minor: number;
  spending_allowance_minor: number;
  is_spending_disciplined: boolean;
  discipline_score: number;
  discipline_max: number;
  discipline_status: DisciplineStatus;
}

export interface DailyProgressHistoryItem {
  date: string;
  total_score: number;
  level: DailyProgressLevel;
  prayers_score: number;
  prayers_completed: number;
  spending_score: number;
  spending_amount_minor: number;
  spending_disciplined: boolean;
  discipline_score: number;
  discipline_status: DisciplineStatus;
}

// ------------------------------------
// Sleep & Recovery Optimization
// ------------------------------------
export interface SleepEntry extends BaseEntity {
  local_date: string; // YYYY-MM-DD
  bedtime: string; // HH:mm e.g. "23:15"
  wake_time: string; // HH:mm e.g. "07:00"
  duration_minutes: number;
  quality_score: number; // 1 to 5 (1: Restless, 2: Fragmented, 3: Fair, 4: Deep, 5: Optimal)
  notes?: string;
}

// ------------------------------------
// Quran Recitation & Khatmah Tracker
// ------------------------------------
export interface QuranReadingRecord {
  id: string;
  local_date: string;
  pages_read: number;
  ending_page: number;
  timestamp: number;
  note?: string;
}

export interface QuranKhatmahState {
  current_page: number; // 1 to 604
  daily_page_goal: number; // default: 20 pages (1 Juz)
  target_days: number; // e.g. 30 days
  khatmah_count: number; // number of completed full readings
  started_at: number;
  last_read_date?: string;
  history: QuranReadingRecord[];
}




