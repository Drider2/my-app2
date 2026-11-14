import React, { useState } from 'react';
import { 
  CheckSquare, 
  Calendar, 
  Bell, 
  Sparkles, 
  Zap, 
  TrendingDown, 
  TrendingUp, 
  ArrowLeftRight, 
  PiggyBank, 
  HandCoins, 
  RotateCcw, 
  Dumbbell, 
  PlusCircle, 
  FolderPlus, 
  Scale, 
  ShoppingBag, 
  Wrench, 
  Car, 
  BookOpen, 
  BadgeDollarSign, 
  Wallet, 
  Target, 
  Clock, 
  X, 
  FileText,
  LineChart,
  Droplet,
  Calculator,
  ShoppingCart,
  MoonStar,
  Mic,
  BedDouble,
  Landmark,
  Flame
} from 'lucide-react';
import { ScreenId } from './Navigation';
import { QuickExpenseService } from '../services/quickExpenseService';
import { LoanService } from '../services/loanService';
import { FinanceService } from '../services/financeService';
import { HydrationService } from '../services/hydrationService';
import { db, generateUUID, getTodayLocalDate } from '../services/storage';
import { useTranslation } from '../services/i18n';
import { Haptics } from '../services/haptics';
import { AudioNoteModal } from './journal/AudioNoteModal';
import { SleepTrackerModal } from './health/SleepTrackerModal';

interface AddActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  onQuickAction?: (actionType: string) => void;
}

export const AddActionSheet: React.FC<AddActionSheetProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onQuickAction,
}) => {
  const { t, isRtl } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<'all' | 'daily' | 'money' | 'fitness' | 'personal' | 'management'>('all');
  const [isAudioNoteOpen, setIsAudioNoteOpen] = useState(false);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);

  // Sub-modal states for direct in-place actions
  const [activeModal, setActiveModal] = useState<
    'custom_expense' | 'lend_money' | 'record_repayment' | 'add_income' | 'add_task' | 'add_event' | 'add_weight' | null
  >(null);

  // Form states
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('cat-1');
  const [expenseNote, setExpenseNote] = useState('');

  const [loanBorrower, setLoanBorrower] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanExpectedDate, setLoanExpectedDate] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  const [repaymentLoanId, setRepaymentLoanId] = useState('');
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentNote, setRepaymentNote] = useState('');

  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeNote, setIncomeNote] = useState('');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');

  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('10:00');

  const [weightKg, setWeightKg] = useState('78.4');

  if (!isOpen) return null;

  const state = db.getState();
  const modules = state.settings.modules || {};
  const today = getTodayLocalDate();
  const activeLoans = LoanService.getLoans().filter(l => l.status !== 'fully_repaid');

  const categoryTabs = [
    { id: 'all', label: t('common.all', 'All') },
    ...(modules.calendar !== false ? [{ id: 'daily', label: t('more.daily', 'Daily') }] : []),
    ...(modules.finance !== false ? [{ id: 'money', label: t('nav.money', 'Money') }] : []),
    ...(modules.gym !== false ? [{ id: 'fitness', label: t('nav.body', 'Fitness') }] : []),
    ...(modules.journal !== false || modules.maintenance !== false ? [{ id: 'personal', label: t('more.personal', 'Personal') }] : []),
    ...(modules.weekly_review !== false || modules.finance !== false ? [{ id: 'management', label: t('more.management', 'Management') }] : []),
  ];

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleSaveCustomExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (!expenseName.trim() || isNaN(amount) || amount <= 0) return;

    QuickExpenseService.executeCustomExpense({
      name: expenseName,
      amountMajor: amount,
      categoryId: expenseCategory,
      note: expenseNote,
    });

    setExpenseName('');
    setExpenseAmount('');
    setExpenseNote('');
    setActiveModal(null);
    onClose();
    Haptics.success();
    if (onQuickAction) onQuickAction('expense_added');
  };

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(loanAmount);
    if (!loanBorrower.trim() || isNaN(amount) || amount <= 0) return;

    LoanService.addLoan({
      borrowerName: loanBorrower,
      amountMajor: amount,
      expectedRepaymentDate: loanExpectedDate || undefined,
      notes: loanNotes,
    });

    setLoanBorrower('');
    setLoanAmount('');
    setLoanExpectedDate('');
    setLoanNotes('');
    setActiveModal(null);
    onClose();
    Haptics.success();
    if (onQuickAction) onQuickAction('loan_added');
  };

  const handleSaveRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(repaymentAmount);
    if (!repaymentLoanId || isNaN(amount) || amount <= 0) return;

    LoanService.recordRepayment({
      loanId: repaymentLoanId,
      amountMajor: amount,
      note: repaymentNote,
    });

    setRepaymentLoanId('');
    setRepaymentAmount('');
    setRepaymentNote('');
    setActiveModal(null);
    onClose();
    Haptics.success();
    if (onQuickAction) onQuickAction('repayment_added');
  };

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) return;

    FinanceService.addIncome({
      amountMajor: amount,
      localDate: today,
      note: incomeNote.trim() || 'Additional Income',
    });

    setIncomeAmount('');
    setIncomeNote('');
    setActiveModal(null);
    onClose();
    Haptics.success();
    if (onQuickAction) onQuickAction('income_added');
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    db.updateState(draft => {
      draft.tasks.unshift({
        id: generateUUID(),
        title: taskTitle.trim(),
        due_date: today,
        due_time: taskTime || undefined,
        done: false,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      });
    });

    setTaskTitle('');
    setTaskTime('');
    setActiveModal(null);
    onClose();
    Haptics.success();
    if (onQuickAction) onQuickAction('task_added');
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    db.updateState(draft => {
      draft.events.unshift({
        id: generateUUID(),
        title: eventTitle.trim(),
        local_date: today,
        start_time: eventTime || '10:00',
        duration: 60,
        all_day: false,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      });
    });

    setEventTitle('');
    setActiveModal(null);
    onClose();
    Haptics.success();
    if (onQuickAction) onQuickAction('event_added');
  };

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightKg);
    if (isNaN(w) || w <= 0) return;

    db.updateState(draft => {
      draft.bodyweightEntries.unshift({
        id: generateUUID(),
        local_date: today,
        weight_kg: w,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      });
    });

    setActiveModal(null);
    onClose();
    Haptics.success();
    if (onQuickAction) onQuickAction('weight_added');
  };

  // Structured Actions
  const actionSections = [
    {
      categoryId: 'daily',
      title: 'Daily Actions',
      actions: [
        {
          id: 'log_hydration',
          label: 'Log Water Intake (+250ml)',
          desc: 'Quick glass of water for daily hydration',
          icon: Droplet,
          handler: () => {
            HydrationService.addWater(250);
            Haptics.success();
            onClose();
            if (onQuickAction) onQuickAction('hydration_logged');
          },
        },
        {
          id: 'add_task',
          label: 'Add Task',
          desc: 'Create to-do item for today',
          icon: CheckSquare,
          handler: () => setActiveModal('add_task'),
        },
        {
          id: 'add_event',
          label: 'Add Event',
          desc: 'Schedule appointment on timeline',
          icon: Calendar,
          handler: () => setActiveModal('add_event'),
        },
        {
          id: 'record_prayer',
          label: 'Record Prayer Completion',
          desc: 'Check Fajr, Dhuhr, Asr, Maghrib, Isha',
          icon: Sparkles,
          handler: () => {
            onClose();
            onNavigate('prayers');
          },
        },
        {
          id: 'quran_reading',
          label: 'Quran Recitation & Khatmah',
          desc: 'Track daily pages, Juz progress & bookmark',
          icon: BookOpen,
          handler: () => {
            onClose();
            onNavigate('prayers');
          },
        },
        {
          id: 'fasting_desk',
          label: 'Fasting Desk & Iftar Timer',
          desc: 'Sunnah & Ramadan fasts, Suhur & Iftar countdown',
          icon: MoonStar,
          handler: () => {
            onClose();
            onNavigate('prayers');
          },
        },
        {
          id: 'add_reminder',
          label: 'Add Maintenance Reminder',
          desc: 'Care, service, or shopping alert',
          icon: Bell,
          handler: () => {
            onClose();
            onNavigate('maintenance');
          },
        },
      ],
    },
    {
      categoryId: 'money',
      title: 'Money & Finances',
      actions: [
        {
          id: 'zakat_charity',
          label: 'Zakat & Charity Desk',
          desc: 'Annual 2.5% wealth purification & Sadaqah tracking',
          icon: MoonStar,
          handler: () => {
            onClose();
            onNavigate('finance');
          },
        },
        {
          id: 'net_worth_runway',
          label: 'Net Worth & Emergency Runway',
          desc: 'Balance sheet assets, debt obligations & living expense runway',
          icon: Landmark,
          handler: () => {
            onClose();
            onNavigate('finance');
          },
        },
        {
          id: 'shopping_list',
          label: 'Shopping & Grocery List',
          desc: 'Track items to buy, cart cost & auto-log trip',
          icon: ShoppingCart,
          handler: () => {
            onClose();
            onNavigate('finance');
          },
        },
        {
          id: 'check_affordability',
          label: 'Can I Afford This?',
          desc: 'Simulate purchase impact on monthly runway',
          icon: Calculator,
          handler: () => {
            onClose();
            onNavigate('finance');
          },
        },
        {
          id: 'custom_expense',
          label: 'Add Custom Expense',
          desc: 'Record exact name, amount & category',
          icon: TrendingDown,
          handler: () => setActiveModal('custom_expense'),
        },
        {
          id: 'add_income',
          label: 'Add Income',
          desc: 'Salary, bonus, freelance or dividend payment',
          icon: TrendingUp,
          handler: () => setActiveModal('add_income'),
        },
        {
          id: 'lend_money',
          label: 'Lend Money',
          desc: 'Record person, amount & expected repayment',
          icon: HandCoins,
          handler: () => setActiveModal('lend_money'),
        },
        {
          id: 'record_repayment',
          label: 'Record Repayment',
          desc: 'Log received debt repayment from a borrower',
          icon: RotateCcw,
          handler: () => setActiveModal('record_repayment'),
        },
        {
          id: 'transfer_money',
          label: 'Transfer Money',
          desc: 'Move funds between accounts or goals',
          icon: ArrowLeftRight,
          handler: () => {
            onClose();
            onNavigate('finance');
          },
        },
        {
          id: 'savings_contribution',
          label: 'Add Savings Contribution',
          desc: 'Transfer money into reserve or goal',
          icon: PiggyBank,
          handler: () => {
            onClose();
            onNavigate('finance');
          },
        },
      ],
    },
    {
      categoryId: 'fitness',
      title: 'Fitness & Body',
      actions: [
        {
          id: 'log_workout',
          label: 'Log Workout Session',
          desc: 'Record exercises, weights & sets',
          icon: Dumbbell,
          handler: () => {
            onClose();
            onNavigate('gym');
          },
        },
        {
          id: 'macro_tdee_desk',
          label: 'Macro Targets & TDEE Desk',
          desc: 'Calorie expenditure, BMR & tailored protein/carb/fat split',
          icon: Flame,
          handler: () => {
            onClose();
            onNavigate('gym');
          },
        },
        {
          id: 'add_weight',
          label: 'Log Body Weight',
          desc: 'Daily weigh-in with trend tracking',
          icon: Scale,
          handler: () => setActiveModal('add_weight'),
        },
        {
          id: 'add_exercise',
          label: 'Add New Exercise',
          desc: 'Add custom movement to gym library',
          icon: PlusCircle,
          handler: () => {
            onClose();
            onNavigate('gym');
          },
        },
        {
          id: 'create_program',
          label: 'Create Training Routine',
          desc: 'Design or duplicate workout program',
          icon: FolderPlus,
          handler: () => {
            onClose();
            onNavigate('gym');
          },
        },
      ],
    },
    {
      categoryId: 'personal',
      title: 'Personal & Care',
      actions: [
        {
          id: 'add_journal',
          label: 'New Journal Entry',
          desc: 'Dated reflection with mood & thoughts',
          icon: BookOpen,
          handler: () => {
            onClose();
            onNavigate('journal');
          },
        },
        {
          id: 'voice_note',
          label: 'Quick Voice Note',
          desc: 'Hands-free dictation & audio thought memo',
          icon: Mic,
          handler: () => {
            setIsAudioNoteOpen(true);
          },
        },
        {
          id: 'log_sleep',
          label: 'Log Sleep & Rest',
          desc: 'Bedtime, wake up, quality & recovery debt',
          icon: BedDouble,
          handler: () => {
            setIsSleepModalOpen(true);
          },
        },
        {
          id: 'add_shopping',
          label: 'Add Shopping Item',
          desc: 'Add item to buying list with auto-cost',
          icon: ShoppingBag,
          handler: () => {
            onClose();
            onNavigate('maintenance');
          },
        },
        {
          id: 'add_personal_maint',
          label: 'Add Personal Care',
          desc: 'Haircut, grooming & hygiene cycles',
          icon: Wrench,
          handler: () => {
            onClose();
            onNavigate('maintenance');
          },
        },
        {
          id: 'add_car_maint',
          label: 'Add Vehicle Service',
          desc: 'Oil change, tires, service by mileage',
          icon: Car,
          handler: () => {
            onClose();
            onNavigate('maintenance');
          },
        },
      ],
    },
    {
      categoryId: 'management',
      title: 'Planning & Reviews',
      actions: [
        {
          id: 'weekly_review',
          label: 'Weekly Review',
          desc: 'Retrospective, accomplishments & reset',
          icon: FileText,
          handler: () => {
            onClose();
            onNavigate('weekly-review');
          },
        },
        {
          id: 'create_savings_goal',
          label: 'Create Savings Goal',
          desc: 'Target amount, date & forecast',
          icon: Target,
          handler: () => {
            onClose();
            onNavigate('finance');
          },
        },
        {
          id: 'edit_salary',
          label: 'Edit Salary Settings',
          desc: 'Update monthly pay and recurring income',
          icon: BadgeDollarSign,
          handler: () => {
            onClose();
            onNavigate('finance');
          },
        },
      ],
    },
  ];

  const filteredSections = (activeCategory === 'all' 
    ? actionSections 
    : actionSections.filter(s => s.categoryId === activeCategory)
  ).map(sec => {
    let actions = sec.actions;
    if (sec.categoryId === 'daily') {
      actions = actions.filter(a => {
        if (a.id === 'record_prayer' && modules.prayer === false) return false;
        if (a.id === 'add_reminder' && modules.maintenance === false) return false;
        if ((a.id === 'add_task' || a.id === 'add_event') && modules.calendar === false) return false;
        return true;
      });
    } else if (sec.categoryId === 'money') {
      if (modules.finance === false) return null;
    } else if (sec.categoryId === 'fitness') {
      if (modules.gym === false) return null;
    } else if (sec.categoryId === 'personal') {
      actions = actions.filter(a => {
        if (a.id === 'add_journal' && modules.journal === false) return false;
        if ((a.id === 'add_shopping' || a.id === 'add_personal_maint' || a.id === 'add_car_maint') && modules.maintenance === false) return false;
        return true;
      });
    } else if (sec.categoryId === 'management') {
      actions = actions.filter(a => {
        if (a.id === 'weekly_review' && modules.weekly_review === false) return false;
        if ((a.id === 'create_savings_goal' || a.id === 'edit_salary') && modules.finance === false) return false;
        return true;
      });
    }
    return actions.length > 0 ? { ...sec, actions } : null;
  }).filter(Boolean) as typeof actionSections;

  return (
    <div className="fixed inset-0 z-50 flex phone:items-end wide:items-center tablet:items-center justify-center p-0 wide:p-4 tablet:p-6 bg-black/60 animate-fade-in" onClick={onClose}>
      <div 
        className="w-full phone:max-w-lg wide:max-w-xl tablet:max-w-2xl max-h-[85vh] bg-[var(--color-card)] border border-[var(--color-border)] phone:rounded-t-3xl wide:rounded-2xl tablet:rounded-2xl shadow-2xl text-[var(--text-1)] flex flex-col overflow-hidden animate-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Drag Handle (Mobile Phone only) */}
        <div className="phone:block wide:hidden tablet:hidden w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto my-2 shrink-0" />

        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--hairline)]">
          <div>
            <h2 className="text-base font-medium text-[var(--text-1)]">
              {t('nav.quickAction', 'Quick Add')}
            </h2>
            <p className="text-xs text-[var(--text-2)] mt-0.5">
              {t('common.actions', 'Choose an action or log an entry')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors tap-feedback"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--hairline)] overflow-x-auto no-scrollbar">
          {categoryTabs.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  Haptics.tick();
                  setActiveCategory(cat.id as any);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all tap-feedback ${
                  isActive
                    ? 'accent-chip'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] text-[var(--text-2)] hover:text-[var(--text-1)]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Action Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh] no-scrollbar">
          {filteredSections.map(sec => (
            <div key={sec.categoryId} className="space-y-2">
              <h3 className="text-xs font-medium text-[var(--text-3)] px-1">
                {sec.title}
              </h3>

              <div className="grid grid-cols-1 wide:grid-cols-2 tablet:grid-cols-2 gap-2">
                {sec.actions.map(act => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        Haptics.tick();
                        act.handler();
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-[18px] bg-white/[0.04] border border-white/[0.08] hover:border-[rgb(var(--accent-rgb)/0.4)] hover:bg-white/[0.07] transition-all tap-feedback min-h-[52px] group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[rgb(var(--accent-rgb)/0.15)] border border-[rgb(var(--accent-rgb)/0.3)] text-[var(--accent-light)] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgb(var(--accent-rgb)/0.25)]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 text-start">
                          <div className="text-sm font-medium text-[var(--text-1)] truncate">
                            {act.label}
                          </div>
                          <div className="text-xs text-[var(--text-2)] truncate mt-0.5">
                            {act.desc}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-MODAL 1: ADD CUSTOM EXPENSE                          */}
      {/* ======================================================== */}
      {activeModal === 'custom_expense' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add Custom Expense</h3>
              <button 
                type="button" 
                onClick={() => setActiveModal(null)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomExpense} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Expense Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunch with team"
                  value={expenseName}
                  onChange={e => setExpenseName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Amount ({state.settings.currency_label})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 500"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Category</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                >
                  {state.categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Optional Note</label>
                <input
                  type="text"
                  placeholder="e.g. Downtown restaurant"
                  value={expenseNote}
                  onChange={e => setExpenseNote(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-semibold rounded-xl text-sm tap-feedback"
              >
                Record Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL 2: LEND MONEY                                  */}
      {/* ======================================================== */}
      {activeModal === 'lend_money' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Lend Money</h3>
              <button 
                type="button" 
                onClick={() => setActiveModal(null)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Borrower's Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmed"
                  value={loanBorrower}
                  onChange={e => setLoanBorrower(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Amount Lent ({state.settings.currency_label})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 5000"
                  value={loanAmount}
                  onChange={e => setLoanAmount(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Expected Repayment Date (Optional)</label>
                <input
                  type="date"
                  value={loanExpectedDate}
                  onChange={e => setLoanExpectedDate(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Note / Purpose (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Assistance"
                  value={loanNotes}
                  onChange={e => setLoanNotes(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                Recorded as money lent. Cash balance decreases and receivable increases.
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-semibold rounded-xl text-sm tap-feedback"
              >
                Record Loan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL 3: RECORD REPAYMENT                            */}
      {/* ======================================================== */}
      {activeModal === 'record_repayment' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Record Loan Repayment</h3>
              <button 
                type="button" 
                onClick={() => setActiveModal(null)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeLoans.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                No active loans found. All loans are fully settled!
              </div>
            ) : (
              <form onSubmit={handleSaveRepayment} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Select Borrower</label>
                  <select
                    required
                    value={repaymentLoanId}
                    onChange={e => setRepaymentLoanId(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                  >
                    <option value="">-- Choose Borrower --</option>
                    {activeLoans.map(l => {
                      const repaid = (l.repayments || []).filter(r => !r.deleted_at).reduce((s, r) => s + r.amount_minor, 0);
                      const remaining = (l.amount_minor - repaid) / 100;
                      return (
                        <option key={l.id} value={l.id}>
                          {l.borrower_name} (Owes {remaining} {state.settings.currency_label})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Repayment Amount ({state.settings.currency_label})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 2000"
                    value={repaymentAmount}
                    onChange={e => setRepaymentAmount(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Note / Method</label>
                  <input
                    type="text"
                    placeholder="e.g. Cash returned in person"
                    value={repaymentNote}
                    onChange={e => setRepaymentNote(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                  Increases cash balance without counting as new income.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-semibold rounded-xl text-sm tap-feedback"
                >
                  Confirm Repayment
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL 4: ADD INCOME                                  */}
      {/* ======================================================== */}
      {activeModal === 'add_income' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add Income</h3>
              <button 
                type="button" 
                onClick={() => setActiveModal(null)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIncome} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Amount ({state.settings.currency_label})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 15000"
                  value={incomeAmount}
                  onChange={e => setIncomeAmount(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Source / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Freelance project bonus"
                  value={incomeNote}
                  onChange={e => setIncomeNote(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-semibold rounded-xl text-sm tap-feedback"
              >
                Record Income
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL 5: ADD TASK                                    */}
      {/* ======================================================== */}
      {activeModal === 'add_task' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add Daily Task</h3>
              <button 
                type="button" 
                onClick={() => setActiveModal(null)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Review contract documents"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Due Time (Optional)</label>
                <input
                  type="time"
                  value={taskTime}
                  onChange={e => setTaskTime(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-semibold rounded-xl text-sm tap-feedback"
              >
                Save Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL 6: ADD EVENT                                   */}
      {/* ======================================================== */}
      {activeModal === 'add_event' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Schedule Calendar Event</h3>
              <button 
                type="button" 
                onClick={() => setActiveModal(null)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Team Planning Sync"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Start Time</label>
                <input
                  type="time"
                  required
                  value={eventTime}
                  onChange={e => setEventTime(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-semibold rounded-xl text-sm tap-feedback"
              >
                Schedule Event
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL 7: ADD BODYWEIGHT MEASUREMENT                  */}
      {/* ======================================================== */}
      {activeModal === 'add_weight' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Record Body Weight</h3>
              <button 
                type="button" 
                onClick={() => setActiveModal(null)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWeight} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Current Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 78.4"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  className="w-full mt-1 px-3.5 py-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold text-center text-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-semibold rounded-xl text-sm tap-feedback"
              >
                Save Measurement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Audio Voice Note Modal */}
      <AudioNoteModal
        isOpen={isAudioNoteOpen}
        onClose={() => {
          setIsAudioNoteOpen(false);
          onClose();
        }}
        onSaved={() => {
          onClose();
          onNavigate('journal');
        }}
      />

      {/* Sleep Tracker Modal */}
      <SleepTrackerModal
        isOpen={isSleepModalOpen}
        onClose={() => {
          setIsSleepModalOpen(false);
          onClose();
        }}
        onRefresh={() => {
          onClose();
        }}
      />
    </div>
  );
};
