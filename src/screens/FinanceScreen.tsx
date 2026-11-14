import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  PiggyBank, 
  Plus, 
  Calendar, 
  Clock, 
  Check, 
  ShieldCheck, 
  DollarSign, 
  PieChart, 
  BarChart3,
  AlertCircle,
  AlertTriangle,
  Edit2,
  HandCoins,
  RotateCcw,
  User,
  X,
  CreditCard,
  Target,
  Sliders,
  ChevronRight,
  ChevronDown,
  Bell,
  LineChart,
  HelpCircle,
  Zap,
  Sparkles,
  Info,
  CheckCircle2,
  HeartHandshake,
  Trash2,
  Search,
  Download,
  Calculator,
  Coins,
  ShoppingCart,
  MoonStar,
  Landmark
} from 'lucide-react';
import { db, generateUUID, getTodayLocalDate, formatCurrency } from '../services/storage';
import { FinanceService } from '../services/financeService';
import { ForecastService } from '../services/forecastService';
import { AllocationService } from '../services/allocationService';
import { calculateMonthSpending, calculateRemainingBudget } from '../services/calculation';
import { LoanService, BorrowerProfile } from '../services/loanService';
import { Transaction, Loan, LoanStatus, AffordabilityCheckResult, Category } from '../types';
import { SpendingAnalyticsView } from '../components/finance/SpendingAnalyticsView';
import { SavingsGoalsManager } from '../components/finance/SavingsGoalsManager';
import { AllocationManagerView } from '../components/finance/AllocationManagerView';
import { ModuleCustomizationService } from '../services/moduleCustomizationService';
import { MODULE_WIDGET_REGISTRY } from '../services/moduleWidgetRegistry';
import { ModuleLayoutState, ModuleWidgetConfig, WidgetSize } from '../types';
import { ModuleEditHeader } from '../components/customization/ModuleEditHeader';
import { ModuleWidgetContainer } from '../components/customization/ModuleWidgetContainer';
import { ModuleAddWidgetModal } from '../components/customization/ModuleAddWidgetModal';
import { AreaCurve, TrendCompare, CategoryBreakdown, RingProgress } from '../components/charts';
import { ModulePresetModal } from '../components/customization/ModulePresetModal';
import { FinanceWidgetRenderer } from '../components/finance/FinanceWidgetRenderer';
import { t } from '../services/i18n';
import { triggerHaptic } from '../services/motion';
import {
  getCycleRange,
  getAvailableCycles,
  calculateCycleBudget,
  calculateLeftBalance,
  calculateSpentInCycle,
  calculateIncomeInCycle,
  calculateBurnAndRunway,
  calculateSpentByCategory,
  calculateGaugeSegments,
  calculateVsLastCycle,
  calculatePlanProgress,
  calculateCycleCalendarDays,
  getRecentExpenses,
  getTopCategoryTiles,
  parseLocalDate,
  addCalendarDays,
  MONTH_NAMES_SHORT,
  formatMoneyParts,
} from '../services/moneyDerivedStats';
import {
  CyclePickerSheet,
  HatchedBar,
  LeftBalanceHeroCard,
  SegmentedSpendingGaugeCard,
  PlanProgressCard,
  ExpensesHistoryCard,
  TopCategoryTiles,
  DailyLimitCalendarCard,
  RecurringSubscriptionsModal,
  AffordabilityCalculatorModal,
  CurrencyConverterModal,
  ShoppingListModal,
  ZakatCalculatorModal,
  NetWorthModal,
} from '../components/finance';

interface FinanceScreenProps {
  onRefresh: () => void;
}

export type FinanceTab = 'overview' | 'analytics' | 'forecast' | 'transactions' | 'salary' | 'expenses' | 'budgets' | 'savings' | 'loans' | 'goals';

export const FinanceScreen: React.FC<FinanceScreenProps> = ({ onRefresh }) => {
  const state = db.getState();
  const today = getTodayLocalDate();

  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  // Cycle picker & notices state
  const [cycleOffset, setCycleOffset] = useState<number>(0);
  const [isCyclePickerOpen, setIsCyclePickerOpen] = useState(false);
  const [isNoticesOpen, setIsNoticesOpen] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Derived selector calculations (memoized)
  const availableCycles = useMemo(
    () => getAvailableCycles(state.settings.budget_cycle_start_day),
    [state.settings.budget_cycle_start_day]
  );
  const currentCycle = availableCycles.find(c => c.offset === cycleOffset) || availableCycles[0];
  const range = useMemo(
    () => getCycleRange(cycleOffset, state.settings.budget_cycle_start_day),
    [cycleOffset, state.settings.budget_cycle_start_day]
  );
  const prevRange = useMemo(
    () => getCycleRange(cycleOffset - 1, state.settings.budget_cycle_start_day),
    [cycleOffset, state.settings.budget_cycle_start_day]
  );
  const cycleBudget = useMemo(
    () => calculateCycleBudget(state.categories, state.salarySetting, state.salaryAllocation),
    [state.categories, state.salarySetting, state.salaryAllocation]
  );
  const leftBalance = useMemo(
    () => FinanceService.getCashBalanceSummary().availableCashMinor,
    [state.transactions, state.salarySetting, state.savingsAccount, state.loans]
  );
  const spentInCycle = useMemo(
    () => calculateSpentInCycle(state.transactions, range),
    [state.transactions, range]
  );
  const incomeInCycle = useMemo(
    () => calculateIncomeInCycle(state.transactions, range),
    [state.transactions, range]
  );
  const burnAndRunway = useMemo(
    () => calculateBurnAndRunway(spentInCycle, leftBalance, range.elapsedDays),
    [spentInCycle, leftBalance, range.elapsedDays]
  );
  const spentByCategory = useMemo(
    () => calculateSpentByCategory(state.transactions, state.categories, range, cycleBudget),
    [state.transactions, state.categories, range, cycleBudget]
  );
  const vsLast = useMemo(
    () => calculateVsLastCycle(state.transactions, range, prevRange, range.elapsedDays),
    [state.transactions, range, prevRange]
  );
  const dailyLimitMinor = state.dailyProgressSettings?.daily_spending_allowance_minor ?? 50000;
  const planProgress = useMemo(
    () => calculatePlanProgress(
      state.recurringRules || [],
      state.maintenanceItems || [],
      state.salaryAllocation,
      state.transactions,
      range,
      leftBalance,
      burnAndRunway.burnPerDayMinor,
      dailyLimitMinor
    ),
    [state.recurringRules, state.maintenanceItems, state.salaryAllocation, state.transactions, range, leftBalance, burnAndRunway.burnPerDayMinor, dailyLimitMinor]
  );
  const calendarDays = useMemo(
    () => calculateCycleCalendarDays(
      range,
      state.transactions,
      state.categories,
      dailyLimitMinor,
      today
    ),
    [range, state.transactions, state.categories, dailyLimitMinor, today]
  );
  const recentExpenses = useMemo(
    () => getRecentExpenses(state.transactions, state.categories, 5, today),
    [state.transactions, state.categories, today]
  );
  const topTiles = useMemo(
    () => getTopCategoryTiles(spentByCategory, state.categories, 3),
    [spentByCategory, state.categories]
  );
  const notices = useMemo(() => {
    const list: { id: string; title: string; desc: string }[] = [];
    if (cycleBudget !== null && spentInCycle > cycleBudget) {
      list.push({
        id: 'over_budget',
        title: t('finance_notice_over_budget_title', 'Cycle budget limit exceeded'),
        desc: t('finance_notice_over_budget_desc', 'Current spending exceeds cycle allocation'),
      });
    }
    const overdue = (state.loans || []).filter(
      l => l.status !== 'fully_repaid' && !l.deleted_at && l.expected_repayment_date && l.expected_repayment_date < today
    );
    if (overdue.length > 0) {
      list.push({
        id: 'overdue_loans',
        title: t('finance_notice_overdue_title', 'Overdue loan repayments'),
        desc: `${overdue.length} ${t('finance_notice_overdue_desc', 'active loan(s) past expected repayment')}`,
      });
    }
    return list;
  }, [cycleBudget, spentInCycle, state.loans, today]);

  // Transaction Ledger Filter
  const [txFilter, setTxFilter] = useState<'all' | 'expense' | 'income' | 'transfer' | 'loans'>('all');

  // Quick expense form in Expenses tab
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>(state.categories[0]?.id || 'cat-1');
  const [expenseNote, setExpenseNote] = useState<string>('');

  // Salary & Income Form state
  const [isEditSalaryOpen, setIsEditSalaryOpen] = useState(false);
  const salarySetting = FinanceService.getSalarySetting();
  const [salaryInput, setSalaryInput] = useState<number>(Math.round(salarySetting.monthly_salary_minor / 100));
  const [paymentDayInput, setPaymentDayInput] = useState<number>(salarySetting.payment_day || 1);
  const [salaryEffectiveDate, setSalaryEffectiveDate] = useState<string>(today);
  const [salaryNotes, setSalaryNotes] = useState<string>('Standard salary revision');

  // Additional Income Form state
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState<string>('');
  const [incomeNote, setIncomeNote] = useState<string>('');
  const [incomeDate, setIncomeDate] = useState<string>(today);

  // Savings Form state
  const savingsAccount = FinanceService.getSavingsAccount();
  const savingsGoals = FinanceService.getGoals();
  const primaryGoal = savingsGoals[0] || null;
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [savingsModalMode, setSavingsModalMode] = useState<'deposit' | 'withdraw' | 'adjust'>('deposit');
  const [savingsActionAmount, setSavingsActionAmount] = useState<string>('');
  const [savingsActionNote, setSavingsActionNote] = useState<string>('');
  const [savingsGoalSelect, setSavingsGoalSelect] = useState<string>(savingsGoals[0]?.id || '');

  // Salary Allocation state
  const allocation = FinanceService.getSalaryAllocation();
  const [isEditAllocationOpen, setIsEditAllocationOpen] = useState(false);
  const [allocSavings, setAllocSavings] = useState<number>(Math.round(allocation.savings_amount_minor / 100));
  const [allocPersonal, setAllocPersonal] = useState<number>(Math.round(allocation.personal_amount_minor / 100));
  const [allocCar, setAllocCar] = useState<number>(Math.round(allocation.car_amount_minor / 100));
  const [allocGym, setAllocGym] = useState<number>(Math.round(allocation.gym_amount_minor / 100));
  const [allocShopping, setAllocShopping] = useState<number>(Math.round(allocation.shopping_amount_minor / 100));
  const [allocOther, setAllocOther] = useState<number>(Math.round(allocation.other_amount_minor / 100));

  // Money Lent Form states
  const [isAddLoanModalOpen, setIsAddLoanModalOpen] = useState(false);
  const [loanBorrower, setLoanBorrower] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanExpectedDate, setLoanExpectedDate] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  // Repayment Modal states
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [selectedLoanForRepayment, setSelectedLoanForRepayment] = useState<Loan | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentNote, setRepaymentNote] = useState('');

  // Category Budget Edit State
  const [isEditCategoryBudgetOpen, setIsEditCategoryBudgetOpen] = useState(false);
  const [selectedCategoryForBudget, setSelectedCategoryForBudget] = useState<Category | null>(null);

  // Transaction Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editTxNote, setEditTxNote] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxCategory, setEditTxCategory] = useState('');
  const [editTxDate, setEditTxDate] = useState('');

  const handleOpenEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditTxNote(tx.note || '');
    setEditTxAmount(String(Math.round(tx.amount_minor / 100)));
    setEditTxCategory(tx.category_id || state.categories[0]?.id || 'cat-1');
    setEditTxDate(tx.local_date);
  };

  const handleSaveEditTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const major = parseFloat(editTxAmount);
    if (isNaN(major) || major <= 0) return;

    FinanceService.updateTransaction(editingTransaction.id, {
      note: editTxNote.trim(),
      amount_minor: Math.round(major * 100),
      category_id: editTxCategory,
      local_date: editTxDate,
    });

    setEditingTransaction(null);
    onRefresh();
  };
  const [categoryBudgetInput, setCategoryBudgetInput] = useState<string>('');

  // Allocation Manager Modal State
  const [isAllocationManagerOpen, setIsAllocationManagerOpen] = useState(false);

  // ========================================================
  // Module Customization State & Handlers
  // ========================================================
  const [layout, setLayout] = useState<ModuleLayoutState>(ModuleCustomizationService.getLayout('finance'));
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftWidgets, setDraftWidgets] = useState<ModuleWidgetConfig[]>([]);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isAffordabilityModalOpen, setIsAffordabilityModalOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isZakatModalOpen, setIsZakatModalOpen] = useState(false);
  const [isNetWorthModalOpen, setIsNetWorthModalOpen] = useState(false);

  
  const handleExportCSV = () => {
    const allTx = state.transactions.filter(t => !t.deleted_at);
    if (allTx.length === 0) {
      triggerToast('No transactions to export');
      return;
    }
    const headers = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Currency', 'Notes'];
    const rows = allTx.map(t => {
      const cat = state.categories.find(c => c.id === t.category_id)?.name || 'General';
      const amountMajor = (t.amount_minor / 100).toFixed(2);
      const cleanNote = (t.note || '').replace(/"/g, '""');
      return [
        t.id,
        t.local_date,
        t.type,
        `"${cat}"`,
        amountMajor,
        state.settings.currency_label || 'DA',
        `"${cleanNote}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greendream_transactions_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(`✓ Exported ${allTx.length} transactions to CSV`);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  const handleStartEdit = () => {
    setDraftWidgets([...layout.widgets]);
    setIsEditMode(true);
    setActiveTab('overview');
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setDraftWidgets([]);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveLayout = () => {
    const newLayout: ModuleLayoutState = {
      ...layout,
      preset: 'custom',
      widgets: draftWidgets,
      updated_at: Date.now(),
    };
    ModuleCustomizationService.saveLayout('finance', newLayout);
    setLayout(newLayout);
    setIsEditMode(false);
    triggerToast('✓ Finance layout saved successfully');
    onRefresh();
  };

  const handleResetDefault = () => {
    const res = ModuleCustomizationService.resetToDefault('finance');
    setLayout(res);
    setDraftWidgets([...res.widgets]);
    triggerToast('✓ Reset to default layout');
    onRefresh();
  };

  const handleApplyPreset = (presetId: string) => {
    const res = ModuleCustomizationService.applyPreset('finance', presetId);
    setLayout(res);
    setDraftWidgets([...res.widgets]);
    triggerToast(`✓ Applied ${presetId.replace('_', ' ')}`);
    onRefresh();
  };

  const handleAddWidget = (widgetType: string) => {
    if (isEditMode) {
      const def = MODULE_WIDGET_REGISTRY[widgetType];
      const newW: ModuleWidgetConfig = {
        id: `mod-finance-${widgetType}-${generateUUID().slice(0, 8)}`,
        widgetType,
        size: def?.defaultSize || 'full',
        visible: true,
        order: draftWidgets.length,
      };
      setDraftWidgets(prev => [...prev, newW]);
    } else {
      const res = ModuleCustomizationService.addWidget('finance', widgetType);
      setLayout(res);
    }
    setIsAddWidgetModalOpen(false);
    triggerToast('✓ Added widget to layout');
    onRefresh();
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.filter(w => w.id !== widgetId).map((w, idx) => ({ ...w, order: idx })));
    } else {
      const res = ModuleCustomizationService.removeWidget('finance', widgetId);
      setLayout(res);
    }
    triggerToast('✓ Removed card from page');
  };

  const handleToggleVisibility = (widgetId: string) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w));
    } else {
      const res = ModuleCustomizationService.toggleWidgetVisibility('finance', widgetId);
      setLayout(res);
    }
  };

  const handleChangeSize = (widgetId: string, size: WidgetSize) => {
    if (isEditMode) {
      setDraftWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, size } : w));
    } else {
      const res = ModuleCustomizationService.changeWidgetSize('finance', widgetId, size);
      setLayout(res);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const cloned = [...draftWidgets];
    const [item] = cloned.splice(index, 1);
    cloned.splice(index - 1, 0, item);
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index >= draftWidgets.length - 1) return;
    const cloned = [...draftWidgets];
    const [item] = cloned.splice(index, 1);
    cloned.splice(index + 1, 0, item);
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditMode || draggedIndex === null) return;
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const cloned = [...draftWidgets];
    const [moved] = cloned.splice(draggedIndex, 1);
    cloned.splice(targetIndex, 0, moved);
    setDraftWidgets(cloned.map((w, i) => ({ ...w, order: i })));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Forecast state
  const [forecastPeriod, setForecastPeriod] = useState<'current' | 'next'>('current');
  const forecast = ForecastService.getMonthlyForecast(forecastPeriod);
  const [affordItemName, setAffordItemName] = useState('');
  const [affordItemAmount, setAffordItemAmount] = useState('');
  const [affordResult, setAffordResult] = useState<AffordabilityCheckResult | null>(null);

  const handleCheckAffordability = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(affordItemAmount);
    if (isNaN(amount) || amount <= 0) return;
    const result = ForecastService.checkPurchaseAffordability({
      name: affordItemName.trim() || 'Planned Purchase',
      amountMajor: amount,
    });
    setAffordResult(result);
  };

  // Calculations
  const monthSpending = calculateMonthSpending(state.transactions, state.settings.budget_cycle_start_day);
  const incomeSummary = FinanceService.getIncomeSummary();
  const cashSummary = FinanceService.getCashBalanceSummary();
  const loansSummary = LoanService.getSummary();
  const borrowerProfiles = LoanService.getBorrowerProfiles();
  const allLoans = LoanService.getLoans();

  const currentSalaryMajor = Math.round(salarySetting.monthly_salary_minor / 100);
  const allocatedTotal = allocSavings + allocPersonal + allocCar + allocGym + allocShopping + allocOther;
  const unallocatedAmount = currentSalaryMajor - allocatedTotal;

  // Handle Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const major = parseFloat(expenseAmount);
    if (isNaN(major) || major <= 0) return;

    const amountMinor = Math.round(major * 100);
    const tx: Transaction = {
      id: generateUUID(),
      type: 'expense',
      amount_minor: amountMinor,
      local_date: today,
      category_id: expenseCategory,
      note: expenseNote.trim() || 'General Expense',
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(s => {
      s.transactions.unshift(tx);
    });

    setExpenseAmount('');
    setExpenseNote('');
    onRefresh();
  };

  // Handle Salary Update
  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (salaryInput <= 0) return;

    FinanceService.updateSalary({
      newSalaryMajor: salaryInput,
      paymentDay: paymentDayInput,
      effectiveFrom: salaryEffectiveDate,
      notes: salaryNotes,
    });

    setIsEditSalaryOpen(false);
    onRefresh();
  };

  // Handle Add Income
  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const major = parseFloat(incomeAmount);
    if (isNaN(major) || major <= 0) return;

    FinanceService.addIncome({
      amountMajor: major,
      localDate: incomeDate,
      note: incomeNote || 'Bonus / Additional Income',
    });

    setIncomeAmount('');
    setIncomeNote('');
    setIsAddIncomeOpen(false);
    onRefresh();
  };

  // Handle Savings Deposit / Withdrawal / Adjustment
  const handleSavingsAction = (e: React.FormEvent) => {
    e.preventDefault();
    const major = parseFloat(savingsActionAmount);
    if (isNaN(major) || major <= 0) return;

    if (savingsModalMode === 'deposit') {
      FinanceService.contributeToSavings({
        amountMajor: major,
        goalId: savingsGoalSelect,
        note: savingsActionNote || 'Savings Contribution',
      });
    } else if (savingsModalMode === 'withdraw') {
      FinanceService.withdrawFromSavings({
        amountMajor: major,
        goalId: savingsGoalSelect,
        note: savingsActionNote || 'Savings Withdrawal',
      });
    } else if (savingsModalMode === 'adjust') {
      FinanceService.adjustStartingSavingsBalance(major, savingsActionNote || 'Baseline set');
    }

    setSavingsActionAmount('');
    setSavingsActionNote('');
    setIsSavingsModalOpen(false);
    onRefresh();
  };

  // Handle Allocation Save
  const handleSaveAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    FinanceService.updateSalaryAllocation({
      savings_amount_minor: Math.round(allocSavings * 100),
      personal_amount_minor: Math.round(allocPersonal * 100),
      car_amount_minor: Math.round(allocCar * 100),
      gym_amount_minor: Math.round(allocGym * 100),
      shopping_amount_minor: Math.round(allocShopping * 100),
      other_amount_minor: Math.round(allocOther * 100),
    });
    setIsEditAllocationOpen(false);
    onRefresh();
  };

  // Handle Add Loan
  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const major = parseFloat(loanAmount);
    if (!loanBorrower.trim() || isNaN(major) || major <= 0) return;

    LoanService.addLoan({
      borrowerName: loanBorrower,
      amountMajor: major,
      expectedRepaymentDate: loanExpectedDate || undefined,
      notes: loanNotes,
    });

    setLoanBorrower('');
    setLoanAmount('');
    setLoanExpectedDate('');
    setLoanNotes('');
    setIsAddLoanModalOpen(false);
    onRefresh();
  };

  // Handle Record Repayment
  const handleSaveRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForRepayment) return;
    const major = parseFloat(repaymentAmount);
    if (isNaN(major) || major <= 0) return;

    LoanService.recordRepayment({
      loanId: selectedLoanForRepayment.id,
      amountMajor: major,
      note: repaymentNote,
    });

    setRepaymentAmount('');
    setRepaymentNote('');
    setSelectedLoanForRepayment(null);
    setIsRepaymentModalOpen(false);
    onRefresh();
  };

  // Filter transactions for the Ledger tab with search and descending date sort
  const filteredTransactions = useMemo(() => {
    return state.transactions
      .filter(t => !t.deleted_at)
      .filter(t => {
        if (txFilter === 'all') return true;
        if (txFilter === 'expense') return t.type === 'expense';
        if (txFilter === 'income') return t.type === 'income';
        if (txFilter === 'transfer') return t.type === 'transfer';
        if (txFilter === 'loans') return t.type === 'loan_given' || t.type === 'loan_repayment';
        return true;
      })
      .filter(t => {
        if (!ledgerSearch.trim()) return true;
        const q = ledgerSearch.toLowerCase().trim();
        const note = (t.note || '').toLowerCase();
        const borrower = (t.borrower_name || '').toLowerCase();
        const cat = (state.categories.find(c => c.id === t.category_id)?.name || '').toLowerCase();
        return note.includes(q) || borrower.includes(q) || cat.includes(q);
      })
      .sort((a, b) => {
        const d = b.local_date.localeCompare(a.local_date);
        if (d !== 0) return d;
        return (b.created_at || 0) - (a.created_at || 0);
      });
  }, [state.transactions, state.categories, txFilter, ledgerSearch]);

  const groupedTransactions = useMemo(() => {
    const groups: { date: string; label: string; items: Transaction[] }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    for (const t of filteredTransactions) {
      let list = dateMap.get(t.local_date);
      if (!list) {
        list = [];
        dateMap.set(t.local_date, list);
      }
      list.push(t);
    }

    const yesterday = addCalendarDays(today, -1);
    dateMap.forEach((items, dateStr) => {
      let label: string;
      if (dateStr === today) {
        label = t('finance.todayLabel', 'Today');
      } else if (dateStr === yesterday) {
        label = t('finance.yesterdayLabel', 'Yesterday');
      } else {
        const p = parseLocalDate(dateStr);
        label = `${MONTH_NAMES_SHORT[p.month - 1]} ${p.day}, ${p.year}`;
      }
      groups.push({ date: dateStr, label, items });
    });

    return groups.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTransactions, today, t]);

  const primaryTabs: { id: FinanceTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'transactions', label: 'Ledger', icon: DollarSign },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'loans', label: 'Loans', icon: HandCoins },
  ];

  const activeWidgets = isEditMode ? draftWidgets : layout.widgets.filter(w => w.visible);

  return (
    <div 
      className="space-y-4"
      style={{ paddingBottom: 'calc(var(--nav-total-clearance, 80px) + 70px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--text-1)] text-[var(--bg)] font-bold text-xs border border-[var(--hairline)] flex items-center gap-2 animate-slide-down">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header: In edit mode show ModuleEditHeader; in standard mode show Month Pill + Notices Bell + Customize */}
      {isEditMode ? (
        <ModuleEditHeader
          title="Finance & Wealth"
          subtitle="Integer precision, money lent & honest savings"
          isEditMode={isEditMode}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveLayout={handleSaveLayout}
          onOpenAddWidget={() => setIsAddWidgetModalOpen(true)}
          onOpenPresets={() => setIsPresetModalOpen(true)}
          onResetDefault={handleResetDefault}
        />
      ) : (
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Cycle Pill with dropdown */}
          <button
            type="button"
            onClick={() => setIsCyclePickerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] hover:border-[var(--accent)] text-start transition-all tap-feedback min-h-[44px]"
            aria-label="Select budget cycle"
          >
            <Calendar className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-1)]">{currentCycle?.label || 'Current cycle'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
          </button>

          <div className="flex items-center gap-2">
            {/* Notices Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNoticesOpen(prev => !prev)}
                className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--accent)] transition-all tap-feedback"
                aria-label="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {notices.length > 0 && (
                  <span className="absolute top-2.5 end-2.5 w-2 h-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg)]" />
                )}
              </button>

              {/* Notices Popover */}
              {isNoticesOpen && (
                <div className="absolute end-0 top-12 z-40 w-72 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] shadow-xl animate-fade-in space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[var(--hairline)]">
                    <span className="text-xs font-semibold text-[var(--text-1)]">{t('finance_notices_heading', 'Notices & Alerts')}</span>
                    <button onClick={() => setIsNoticesOpen(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)] text-xs p-1">✕</button>
                  </div>
                  {notices.length === 0 ? (
                    <p className="text-xs text-[var(--text-3)] py-2 text-center">{t('finance_notices_empty', 'All clear. No spending alerts.')}</p>
                  ) : (
                    notices.map(n => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--hairline)] text-xs">
                        <div className="font-semibold text-[var(--text-1)]">{n.title}</div>
                        <div className="text-[12px] text-[var(--text-2)] mt-0.5">{n.desc}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Customize Layout button */}
            <button
              type="button"
              onClick={handleStartEdit}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--accent)] transition-all tap-feedback"
              aria-label="Customize dashboard"
              title="Customize layout"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Subscriptions / Recurring Bills */}
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-cyan-400 hover:border-cyan-500/40 transition-all tap-feedback"
              aria-label="Recurring Subscriptions & Bills"
              title="Recurring Subscriptions & Bills"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Can I Afford It? Quick Purchase Simulator */}
            <button
              type="button"
              onClick={() => setIsAffordabilityModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-cyan-400 hover:border-cyan-500/40 transition-all tap-feedback shadow-sm"
              aria-label="Affordability Simulator"
              title="Can I Afford It? Purchase Simulator"
            >
              <Calculator className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Currency & FX Converter */}
            <button
              type="button"
              onClick={() => setIsCurrencyModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-emerald-400 hover:border-emerald-500/40 transition-all tap-feedback shadow-sm"
              aria-label="Currency Converter"
              title="Currency & FX Converter"
            >
              <Coins className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Smart Shopping & Grocery List */}
            <button
              type="button"
              onClick={() => setIsShoppingListOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-amber-400 hover:border-amber-500/40 transition-all tap-feedback shadow-sm"
              aria-label="Shopping & Grocery List"
              title="Smart Shopping & Grocery Checklist"
            >
              <ShoppingCart className="w-4 h-4 text-amber-400" />
            </button>

            {/* Islamic Zakat & Charity Desk */}
            <button
              type="button"
              onClick={() => setIsZakatModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-emerald-400 hover:border-emerald-500/40 transition-all tap-feedback shadow-sm"
              aria-label="Zakat & Charity Desk"
              title="Islamic Zakat al-Mal & Sadaqah Desk"
            >
              <MoonStar className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Net Worth & Emergency Runway Desk */}
            <button
              type="button"
              onClick={() => setIsNetWorthModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-cyan-400 hover:border-cyan-500/40 transition-all tap-feedback shadow-sm"
              aria-label="Net Worth & Runway Desk"
              title="Net Worth & Emergency Fund Runway Desk"
            >
              <Landmark className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      )}

      {/* 4 Clean Segmented Navigation Tabs */}
      <div className="grid grid-cols-4 p-1 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] gap-1">
        {primaryTabs.map(t => {
          const Icon = t.icon;
          const isSelected = 
            t.id === 'overview' 
              ? (activeTab === 'overview' || activeTab === 'analytics' || activeTab === 'forecast')
              : t.id === 'transactions' 
                ? (activeTab === 'transactions' || activeTab === 'expenses')
                : t.id === 'goals' 
                  ? (activeTab === 'goals' || activeTab === 'savings' || activeTab === 'salary' || activeTab === 'budgets')
                  : activeTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => {
                if (isEditMode) setIsEditMode(false);
                setActiveTab(t.id);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-xs font-semibold rounded-xl transition-all tap-feedback min-h-[44px] ${
                isSelected
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm font-bold'
                  : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate text-center text-xs">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 1. TAB: OVERVIEW (6 MOCKUP CARDS OR CUSTOM EDIT GRID)   */}
      {/* ======================================================== */}
      {activeTab === 'overview' && !isEditMode && (
        <div className="space-y-4 animate-fade-in">
          {/* Card 1: Left-balance hero card */}
          <div className="animate-money-card money-stagger-1">
            <LeftBalanceHeroCard
              availableCashMinor={leftBalance}
              spentMinor={spentInCycle}
              budgetMinor={cycleBudget}
              currencyLabel={state.settings.currency_label}
              delta={vsLast}
              onSetBudgetClick={() => setIsAllocationManagerOpen(true)}
            />
          </div>

          {/* Card 2: Segmented spending gauge */}
          <div className="animate-money-card money-stagger-2">
            <SegmentedSpendingGaugeCard
              breakdown={spentByCategory}
              cycleBudget={cycleBudget}
              currencyLabel={state.settings.currency_label}
              onSelectCategory={(catId: string) => {
                const cat = state.categories.find(c => c.id === catId);
                if (cat) {
                  setSelectedCategoryForBudget(cat);
                  setIsEditCategoryBudgetOpen(true);
                }
              }}
            />
          </div>

          {/* Card 3: Plan progress card */}
          <div className="animate-money-card money-stagger-3">
            <PlanProgressCard
              planResult={planProgress}
              currencyLabel={state.settings.currency_label}
            />
          </div>

          {/* Card 4: Expenses history */}
          <div className="animate-money-card money-stagger-4">
            <ExpensesHistoryCard
              recentExpenses={recentExpenses}
              currencyLabel={state.settings.currency_label}
              onSeeAll={() => setActiveTab('transactions')}
              onOpenTransaction={(tx: Transaction) => handleOpenEditTx(tx)}
              onAddFirstExpense={() => setActiveTab('expenses')}
            />
          </div>

          {/* Card 5: Top category tiles + glowing Income tile */}
          <div className="animate-money-card money-stagger-5">
            <TopCategoryTiles
              tiles={topTiles}
              onSelectCategory={(catId: string) => {
                const cat = state.categories.find(c => c.id === catId);
                if (cat) {
                  setSelectedCategoryForBudget(cat);
                  setIsEditCategoryBudgetOpen(true);
                }
              }}
              onSelectIncome={() => setIsAddIncomeOpen(true)}
            />
          </div>

          {/* Card 6: Month calendar with daily status and per-category bars */}
          <div className="animate-money-card money-stagger-6">
            <DailyLimitCalendarCard
              days={calendarDays}
              range={range}
              dailyLimitMinor={dailyLimitMinor}
              weekStartDay={state.settings.week_start_day}
              currencyLabel={state.settings.currency_label}
            />
          </div>
        </div>
      )}

      {/* Edit Mode Customization Grid */}
      {isEditMode && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {activeWidgets.map((widgetConfig, idx) => (
              <div
                key={widgetConfig.id}
                draggable={isEditMode}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-150 ${
                  isEditMode && dragOverIndex === idx ? 'border-t-2 border-[var(--accent)] pt-1' : ''
                }`}
              >
                <ModuleWidgetContainer
                  widget={widgetConfig}
                  isEditMode={isEditMode}
                  isFirst={idx === 0}
                  isLast={idx === activeWidgets.length - 1}
                  onMoveUp={() => handleMoveUp(idx)}
                  onMoveDown={() => handleMoveDown(idx)}
                  onRemove={() => handleRemoveWidget(widgetConfig.id)}
                  onToggleVisibility={() => handleToggleVisibility(widgetConfig.id)}
                  onChangeSize={(sz) => handleChangeSize(widgetConfig.id, sz)}
                >
                  <FinanceWidgetRenderer
                    widget={widgetConfig}
                    onRefresh={onRefresh}
                    onOpenSalaryModal={() => setIsEditSalaryOpen(true)}
                    onOpenIncomeModal={() => setIsAddIncomeOpen(true)}
                    onOpenSavingsModal={(m) => {
                      setSavingsModalMode(m);
                      setIsSavingsModalOpen(true);
                    }}
                    onOpenLoanModal={() => setIsAddLoanModalOpen(true)}
                    onOpenRepaymentModal={(l) => {
                      setSelectedLoanForRepayment(l);
                      setIsRepaymentModalOpen(true);
                    }}
                    onOpenCustomExpenseModal={() => {
                      setActiveTab('expenses');
                    }}
                    triggerToast={triggerToast}
                  />
                </ModuleWidgetContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TAB: ANALYTICS (Spending Trends, Categories & Goals)  */}
      {/* ======================================================== */}
      {activeTab === 'analytics' && (
        <SpendingAnalyticsView 
          onRefresh={onRefresh} 
          onOpenSavingsModal={(goalId) => {
            if (goalId) setSavingsGoalSelect(goalId);
            setSavingsModalMode('deposit');
            setIsSavingsModalOpen(true);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 2. TAB: FORECAST (Monthly Forward Runway & Projections)   */}
      {/* ======================================================== */}
      {activeTab === 'forecast' && (
        <div className="space-y-4 animate-fade-in">
          {/* Period Selector */}
          <div className="flex bg-[var(--color-surface)] p-1 rounded-2xl border border-[var(--color-border)]">
            <button
              onClick={() => setForecastPeriod('current')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                forecastPeriod === 'current'
                  ? 'bg-[var(--color-surface-subtle)] text-[var(--color-accent)] border border-[var(--color-border)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Current Month ({forecast.periodLabel})
            </button>
            <button
              onClick={() => setForecastPeriod('next')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                forecastPeriod === 'next'
                  ? 'bg-[var(--color-surface-subtle)] text-[var(--color-accent)] border border-[var(--color-border)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Next Month ({ForecastService.getMonthlyForecast('next').periodLabel})
            </button>
          </div>

          {/* Top 4 Metrics Summary */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                Available Cash
              </span>
              <div className="text-lg font-black text-[var(--color-text-primary)] truncate mt-0.5">
                {formatCurrency(forecast.startingBalanceMinor, state.settings.currency_label)}
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">Liquid funds</span>
            </div>

            <div className="p-3.5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                Expected Inflows
              </span>
              <div className="text-lg font-black text-[var(--color-accent)] truncate mt-0.5">
                +{formatCurrency(forecast.expectedIncomeMinor, state.settings.currency_label)}
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">Salary & extras</span>
            </div>

            <div className="p-3.5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                Projected Outflow
              </span>
              <div className="text-lg font-black text-rose-400 truncate mt-0.5">
                -{formatCurrency(forecast.confirmedExpensesMinor + forecast.upcomingRecurringMinor + forecast.estimatedVariableMinor, state.settings.currency_label)}
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">Bills + run rate</span>
            </div>

            <div className="p-3.5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                Planned Savings
              </span>
              <div className="text-lg font-black text-[var(--color-text-primary)] truncate mt-0.5">
                {formatCurrency(forecast.plannedSavingsMinor, state.settings.currency_label)}
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">Protected transfers</span>
            </div>
          </div>

          {/* Hero Predicted Ending Balance Banner */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-muted)]">
                Predicted End-Of-Month Balance
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                forecast.predictedEndingBalanceMinor >= 1500000 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : forecast.predictedEndingBalanceMinor >= 0
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {forecast.predictedEndingBalanceMinor >= 1500000 ? 'Comfortable Cushion' : forecast.predictedEndingBalanceMinor >= 0 ? 'Tight Runway' : 'Projected Deficit'}
              </span>
            </div>
            <div className="text-2xl font-black text-[var(--color-text-primary)]">
              {formatCurrency(forecast.predictedEndingBalanceMinor, state.settings.currency_label)}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Based on current liquid cash, confirmed spending to date, upcoming recurring care/bills ({formatCurrency(forecast.upcomingRecurringMinor, state.settings.currency_label)}), and an estimated daily variable burn rate of {formatCurrency(forecast.dailyBurnRateMinor, state.settings.currency_label)} over the remaining {forecast.daysRemainingInCycle} days.
            </div>
          </div>

          {/* Projection Chart */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Cash Runway Projection</h3>
                <p className="text-xs text-[var(--color-text-muted)]">Solid = Actuals to date • Dashed = Forward forecast</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[var(--color-accent)] inline-block"></span> Actual</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-t border-dashed border-[var(--color-accent)] inline-block"></span> Projected</span>
              </div>
            </div>

            {/* Smooth Kinetic AreaCurve Runway Projection */}
            <div className="w-full pt-2">
              {forecast.dailyProjectedPoints && forecast.dailyProjectedPoints.length > 0 ? (
                <AreaCurve
                  data={forecast.dailyProjectedPoints.map(p => ({
                    label: `Day ${p.day}`,
                    date: `Day ${p.day}`,
                    value: Math.round((p.actualBalanceMinor || p.projectedBalanceMinor) / 100),
                    secondaryValue: Math.round(p.projectedBalanceMinor / 100),
                  }))}
                  height={135}
                  valueSuffix={` ${state.settings.currency_label}`}
                  showMovingAverage={true}
                />
              ) : (
                <div className="h-28 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                  No projection data available
                </div>
              )}
            </div>
          </div>

          {/* Spending Breakdown by Nature */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
            <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
              Spending Breakdown
            </h3>
            
            <div className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-primary)]">Confirmed Actuals</span>
                  <span className="font-mono text-[var(--color-text-secondary)]">
                    {formatCurrency(forecast.confirmedExpensesMinor, state.settings.currency_label)}
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--color-surface-subtle)] rounded-full overflow-hidden border border-[var(--color-border)]">
                  <div 
                    className="h-full bg-[var(--color-accent)] rounded-full" 
                    style={{ width: `${Math.min(100, (forecast.confirmedExpensesMinor / Math.max(1, forecast.confirmedExpensesMinor + forecast.upcomingRecurringMinor + forecast.estimatedVariableMinor)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-primary)]">Upcoming Scheduled Bills & Maintenance</span>
                  <span className="font-mono text-[var(--color-text-secondary)]">
                    {formatCurrency(forecast.upcomingRecurringMinor, state.settings.currency_label)}
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--color-surface-subtle)] rounded-full overflow-hidden border border-[var(--color-border)]">
                  <div 
                    className="h-full bg-amber-400 rounded-full" 
                    style={{ width: `${Math.min(100, (forecast.upcomingRecurringMinor / Math.max(1, forecast.confirmedExpensesMinor + forecast.upcomingRecurringMinor + forecast.estimatedVariableMinor)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-primary)]">Estimated Variable Burn ({forecast.daysRemainingInCycle} days)</span>
                  <span className="font-mono text-[var(--color-text-secondary)]">
                    {formatCurrency(forecast.estimatedVariableMinor, state.settings.currency_label)}
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--color-surface-subtle)] rounded-full overflow-hidden border border-[var(--color-border)]">
                  <div 
                    className="h-full bg-blue-400 rounded-full" 
                    style={{ width: `${Math.min(100, (forecast.estimatedVariableMinor / Math.max(1, forecast.confirmedExpensesMinor + forecast.upcomingRecurringMinor + forecast.estimatedVariableMinor)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Intelligent Financial Warnings */}
          {forecast.warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[var(--color-text-muted)] px-1">
                Runway Insights & Notices
              </h3>
              {forecast.warnings.map(w => (
                <div 
                  key={w.id} 
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                    w.severity === 'high'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                      : w.severity === 'medium'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className={`w-4 h-4 ${
                      w.severity === 'high' ? 'text-rose-400' : w.severity === 'medium' ? 'text-amber-400' : 'text-[var(--color-accent)]'
                    }`} />
                    <span>{w.message}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed ps-6">
                    {w.detail}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* "Can I Afford It?" Purchase Checker */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                  "Can I Afford It?" Checker
                </h3>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">Decision Tool</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Test an upcoming purchase against your remaining commitments and savings goal without modifying your records.
            </p>

            <form onSubmit={handleCheckAffordability} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium">Item / Purchase</label>
                  <input
                    type="text"
                    value={affordItemName}
                    onChange={e => setAffordItemName(e.target.value)}
                    placeholder="e.g. Flight ticket, Shoes"
                    className="w-full mt-0.5 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] font-medium">Price ({state.settings.currency_label})</label>
                  <input
                    type="number"
                    value={affordItemAmount}
                    onChange={e => setAffordItemAmount(e.target.value)}
                    placeholder="e.g. 12000"
                    className="w-full mt-0.5 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-xs font-bold hover:opacity-95 transition-all shadow-sm"
              >
                Analyze Affordability
              </button>
            </form>

            {/* Verdict Card */}
            {affordResult && (
              <div className={`p-3.5 rounded-2xl border text-xs space-y-2.5 mt-3 animate-fade-in ${
                affordResult.verdict === 'comfortable'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : affordResult.verdict === 'possible_caution'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold   flex items-center gap-1.5 ${
                    affordResult.verdict === 'comfortable' ? 'text-emerald-400' : affordResult.verdict === 'possible_caution' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {affordResult.verdict === 'comfortable' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {affordResult.title}
                  </span>
                </div>

                <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">
                  {affordResult.explanation}
                </p>

                {/* Math Breakdown Table */}
                <div className="p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Available Liquid Cash</span>
                    <span className="font-mono text-[var(--color-text-primary)]">{formatCurrency(affordResult.currentAvailableMinor, state.settings.currency_label)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Committed Bills & Variable Burn</span>
                    <span className="font-mono text-rose-400">-{formatCurrency(affordResult.upcomingCommitmentsMinor, state.settings.currency_label)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Item Price</span>
                    <span className="font-mono text-rose-400">-{formatCurrency(affordResult.purchasePriceMinor, state.settings.currency_label)}</span>
                  </div>
                  <div className="border-t border-[var(--color-border)] pt-1 flex justify-between font-bold">
                    <span className="text-[var(--color-text-primary)]">Projected Month-End Balance</span>
                    <span className={`font-mono ${affordResult.projectedBalanceAfterMinor >= 0 ? 'text-[var(--color-accent)]' : 'text-rose-400'}`}>
                      {formatCurrency(affordResult.projectedBalanceAfterMinor, state.settings.currency_label)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[var(--color-text-secondary)] flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-accent)]" />
                  <span>{affordResult.impactOnSavingsGoal}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TAB: TRANSACTIONS (Comprehensive Ledger)              */}
      {/* ======================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Sticky Top Controls: Search Bar & Category Filter Chips */}
          <div className="sticky top-0 z-30 pt-1 pb-2 bg-[var(--bg)]/95  space-y-2">
            {/* Search Bar with Clear Button */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[var(--text-3)] absolute start-3 pointer-events-none" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                placeholder={t('common.search', 'Search note, merchant, category...')}
                className="w-full ps-9 pe-9 py-2 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] focus:border-[var(--accent)] text-xs text-[var(--text-1)] placeholder-[var(--text-3)] transition-all outline-none"
              />
              {ledgerSearch && (
                <button
                  type="button"
                  onClick={() => setLedgerSearch('')}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] absolute end-1.5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sub-filter chips */}
            <div className="flex items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(['all', 'expense', 'income', 'transfer', 'loans'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      triggerHaptic('light');
                      setTxFilter(f);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all tap-feedback min-h-[36px] ${
                      txFilter === f
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-bold shadow-sm'
                        : 'bg-[var(--surface)] text-[var(--text-2)] border border-[var(--hairline)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    {f === 'all' ? t('common.all', 'All') : f}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text-2)] hover:text-cyan-400 border border-[var(--hairline)] hover:border-cyan-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Manage Subscriptions & Recurring Bills"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Bills &</span>
                  <span>Subscriptions</span>
                </button>
                <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text-2)] hover:text-cyan-400 border border-[var(--hairline)] hover:border-cyan-500/30 flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                title="Export transactions to CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Export</span>
                <span>CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grouped Transactions List */}
          <div className="space-y-4">
            {groupedTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-3)] bg-[var(--surface)] rounded-3xl border border-[var(--hairline)]">
                {t('finance.noTransactionsFound', 'No transactions found under this filter.')}
              </div>
            ) : (
              groupedTransactions.map(group => (
                <div key={group.date} className="space-y-1.5">
                  {/* Date Header */}
                  <div className="px-1 py-1 flex items-center justify-between text-xs font-semibold text-[var(--text-3)]">
                    <span>{group.label}</span>
                    <span className="text-[11px] font-normal">{group.items.length} {t('common.entries', 'entries')}</span>
                  </div>

                  {/* Transaction items */}
                  <div className="rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] divide-y divide-[var(--hairline)] overflow-hidden">
                    {group.items.map(tx => {
                      const isIncome = tx.type === 'income';
                      const cat = state.categories.find(c => c.id === tx.category_id);
                      const formatted = formatMoneyParts(tx.amount_minor, state.settings.currency_label, 'en-US');

                      return (
                        <div
                          key={tx.id}
                          onClick={() => handleOpenEditTx(tx)}
                          className="p-3 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors cursor-pointer tap-feedback"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Category Dot */}
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                background: isIncome
                                  ? 'var(--accent)'
                                  : cat?.color
                                  ? cat.color
                                  : 'rgba(255, 255, 255, 0.4)',
                                boxShadow: isIncome ? '0 0 6px rgb(var(--accent-rgb)/.6)' : undefined,
                              }}
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-[var(--text-1)] truncate block">
                                {tx.note || (cat ? cat.name : 'Transaction')}
                              </span>
                              <span className="text-[11px] text-[var(--text-3)] block truncate">
                                {cat ? cat.name : tx.type.replace('_', ' ')}
                                {tx.borrower_name ? ` • ${tx.borrower_name}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Quiet Currency Suffix */}
                            <div className="text-end">
                              <span className={`text-xs font-semibold tabular-nums ${
                                isIncome ? 'text-[var(--accent-light)]' : 'text-[var(--text-1)]'
                              }`}>
                                {isIncome ? '+' : '-'}{formatted.numberStr}
                              </span>
                              <span className="text-[11px] text-[var(--text-3)] ms-1 uppercase">
                                {formatted.currencyStr}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${tx.note || tx.type}" (${formatted.fullStr})?`)) {
                                  FinanceService.deleteTransaction(tx.id);
                                  onRefresh();
                                }
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-white hover:bg-white/10 transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TAB: INCOME & SALARY                                  */}
      {/* ======================================================== */}
      {activeTab === 'salary' && (
        <div className="space-y-4 animate-fade-in">
          {/* Base Salary Card */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <div>
                <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                  Monthly Base Salary
                </span>
                <div className="text-2xl font-black text-[var(--color-accent)] mt-0.5">
                  {formatCurrency(salarySetting.monthly_salary_minor, state.settings.currency_label)}
                </div>
              </div>
              <button
                onClick={() => setIsEditSalaryOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-xs font-semibold text-[var(--color-accent)] flex items-center gap-1.5 tap-feedback"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Salary</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] block">Payment Date</span>
                <span className="font-bold text-[var(--color-text-primary)]">Day {salarySetting.payment_day} of month</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] block">Effective From</span>
                <span className="font-bold text-[var(--color-text-primary)]">{salarySetting.effective_from}</span>
              </div>
            </div>
          </div>

          {/* Income Summary Stats */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
              <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                Total Month Income
              </span>
              <div className="text-lg font-bold text-[var(--color-accent)]">
                {formatCurrency(incomeSummary.monthTotalMinor, state.settings.currency_label)}
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">Salary + bonuses</span>
            </div>

            <div className="p-3.5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
              <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                Year-To-Date Income
              </span>
              <div className="text-lg font-bold text-[var(--color-accent)]">
                {formatCurrency(incomeSummary.yearTotalMinor, state.settings.currency_label)}
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{new Date().getFullYear()} Total</span>
            </div>
          </div>

          {/* Additional Income Button & History */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Additional Income Sources</h3>
              <button
                onClick={() => setIsAddIncomeOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold text-xs flex items-center gap-1 tap-feedback"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Income</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {incomeSummary.incomeTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface-subtle)] text-xs">
                  <div>
                    <span className="font-bold text-[var(--color-text-primary)] block">{t.note}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{t.local_date}</span>
                  </div>
                  <span className="font-bold text-[var(--color-accent)]">
                    +{formatCurrency(t.amount_minor, state.settings.currency_label)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TAB: EXPENSES                                         */}
      {/* ======================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-4 animate-fade-in">
          {/* Quick Expense Entry Form */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
            <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Record General Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)]">Amount ({state.settings.currency_label})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1200"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)]">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={e => setExpenseCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  >
                    {state.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Note / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly grocery stock"
                  value={expenseNote}
                  onChange={e => setExpenseNote(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold rounded-xl text-xs tap-feedback"
              >
                Log Expense
              </button>
            </form>
          </div>

          {/* Expenses by Category Breakdown */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Category Spending</h3>
              <span className="text-xs text-[var(--color-text-muted)]">Total: {formatCurrency(monthSpending, state.settings.currency_label)}</span>
            </div>

            <div className="space-y-2.5">
              {state.categories.map(cat => {
                const b = calculateRemainingBudget(cat, state.transactions);
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--color-text-primary)]">{cat.name}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {formatCurrency(b.spent, state.settings.currency_label)} / {formatCurrency(b.allocated, state.settings.currency_label)}
                      </span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-subtle)] h-1.5 rounded-full overflow-hidden border border-[var(--color-border)]">
                      <div 
                        className={`h-full rounded-full ${b.isOverspent ? 'bg-white' : 'bg-[var(--color-accent)]'}`}
                        style={{ width: `${Math.min(100, b.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TAB: BUDGETS & SPENDING LIMITS                       */}
      {/* ======================================================== */}
      {activeTab === 'budgets' && (
        <div className="space-y-4 animate-fade-in">
          {/* Income Allocation & Goals Toggle Card */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Income Allocation & Goals Planner</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Configure percentages for Savings, Spending & Sadaqah</p>
              </div>
              <button
                onClick={() => setIsAllocationManagerOpen(!isAllocationManagerOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all tap-feedback ${
                  isAllocationManagerOpen 
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-[var(--color-accent)]' 
                    : 'bg-[var(--color-surface-subtle)] text-[var(--color-accent)] border-[var(--color-border)]'
                }`}
              >
                {isAllocationManagerOpen ? 'Close Planner' : 'Manage Allocation Plans'}
              </button>
            </div>

            {isAllocationManagerOpen && (
              <div className="pt-2 border-t border-[var(--color-border)]">
                <AllocationManagerView 
                  onRefresh={onRefresh} 
                  onClose={() => setIsAllocationManagerOpen(false)} 
                />
              </div>
            )}
          </div>

          {/* Category Spending Limits Management */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3.5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Category Spending Limits</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Monthly ceilings, velocity tracking & early warnings</p>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {state.categories.length} active limits
              </span>
            </div>

            <div className="space-y-2.5">
              {state.categories.map(cat => {
                const spent = monthSpending; // Or category specific month spending
                const catTxs = state.transactions.filter(t => !t.deleted_at && t.type === 'expense' && t.category_id === cat.id && t.local_date.startsWith(today.slice(0, 7)));
                const catSpentMinor = catTxs.reduce((sum, t) => sum + t.amount_minor, 0);
                const limitMinor = cat.amount_minor || 0;
                const remainingMinor = Math.max(0, limitMinor - catSpentMinor);
                const consumedPct = limitMinor > 0 ? Math.round((catSpentMinor / limitMinor) * 100) : 0;
                const daysPassed = Math.max(1, parseInt(today.slice(8, 10), 10));
                const dailyAvgMinor = Math.round(catSpentMinor / daysPassed);

                let statusBadge = { label: 'Normal', color: 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)]/30' };
                if (consumedPct >= 100) {
                  statusBadge = { label: 'Exceeded', color: 'bg-white/10 text-white border-white/20' };
                } else if (consumedPct >= 80) {
                  statusBadge = { label: 'Warning (80%+)', color: 'bg-white/5 text-white/90 border-white/15' };
                }

                return (
                  <div key={cat.id} className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: cat.color || 'var(--color-accent)' }} 
                        />
                        <span className="text-xs font-bold text-[var(--color-text-primary)]">{cat.name}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.2 rounded border  ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCategoryForBudget(cat);
                          setCategoryBudgetInput(String(Math.round(limitMinor / 100)));
                          setIsEditCategoryBudgetOpen(true);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-[var(--color-accent)] hover:underline"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        Edit Limit
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs pt-0.5">
                      <div>
                        <span className="text-[var(--color-text-muted)] block">Limit</span>
                        <span className="font-bold text-[var(--color-text-primary)]">{formatCurrency(limitMinor, state.settings.currency_label)}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-muted)] block">Spent</span>
                        <span className="font-bold text-[var(--color-accent)]">{formatCurrency(catSpentMinor, state.settings.currency_label)}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-muted)] block">Remaining</span>
                        <span className="font-bold text-[var(--color-text-primary)]">{formatCurrency(remainingMinor, state.settings.currency_label)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[var(--color-text-muted)] block">Daily Avg</span>
                        <span className="font-bold text-[var(--color-text-secondary)]">~{formatCurrency(dailyAvgMinor, state.settings.currency_label)}/d</span>
                      </div>
                    </div>

                    <div className="w-full bg-[var(--color-surface-subtle)] h-1.5 rounded-full overflow-hidden border border-[var(--color-border)]">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          consumedPct >= 100 
                            ? 'bg-white' 
                            : 'bg-[var(--color-accent)]'
                        }`}
                        style={{ width: `${Math.min(100, consumedPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. TAB: GOALS & SAVINGS (Multi-Goal Portfolio)           */}
      {/* ======================================================== */}
      {(activeTab === 'goals' || activeTab === 'savings') && (
        <div className="space-y-4 animate-fade-in">
          {/* Savings Balance Header */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                  Current Savings Balance
                </span>
                <div className="text-2xl font-black text-[var(--color-accent)] mt-0.5">
                  {formatCurrency(savingsAccount.current_balance_minor, state.settings.currency_label)}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setSavingsModalMode('deposit');
                    setIsSavingsModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold text-xs tap-feedback"
                >
                  Deposit
                </button>
                <button
                  onClick={() => {
                    setSavingsModalMode('withdraw');
                    setIsSavingsModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-semibold text-xs tap-feedback"
                >
                  Withdraw
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              ✓ Savings contributions are transfers (not expenses). Withdrawals never count as new income.
            </p>
          </div>

          {/* Multiple Customizable Savings Goals Manager */}
          <SavingsGoalsManager 
            onRefresh={onRefresh}
            onContribute={(goalId) => {
              setSavingsGoalSelect(goalId);
              setSavingsModalMode('deposit');
              setIsSavingsModalOpen(true);
            }}
          />

          {/* Salary & Recurring Income Settings Card */}
          <div className="card-clean p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Salary & Recurring Income</h3>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Current: {formatCurrency(salarySetting.monthly_salary_minor, state.settings.currency_label)} • Day {salarySetting.payment_day || 1}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsEditSalaryOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] tap-feedback"
                >
                  Edit Salary
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddIncomeOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-xs font-semibold tap-feedback"
                >
                  + Add Income
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. TAB: MONEY LENT (High-Priority Receivables Tracker)   */}
      {/* ======================================================== */}
      {activeTab === 'loans' && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary Cards */}
          <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-[var(--color-accent)]" />
                <div>
                  <h2 className="text-xs font-bold text-[var(--color-text-primary)]">
                    Money Lent Tracker
                  </h2>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Outstanding receivables owed to you
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAddLoanModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold text-xs flex items-center gap-1 tap-feedback"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Lend Money</span>
              </button>
            </div>

            {/* 3 Summary Stats */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-text-muted)] block">Total Lent</span>
                <div className="text-xs font-bold text-[var(--color-text-primary)] mt-1">
                  {formatCurrency(loansSummary.totalLentMinor, state.settings.currency_label)}
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-text-muted)] block">Total Repaid</span>
                <div className="text-xs font-bold text-[var(--color-accent)] mt-1">
                  {formatCurrency(loansSummary.totalRepaidMinor, state.settings.currency_label)}
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                <span className="text-xs font-bold text-[var(--color-text-muted)] block">Still Owed</span>
                <div className="text-xs font-black text-[var(--color-text-primary)] mt-1">
                  {formatCurrency(loansSummary.stillOwedMinor, state.settings.currency_label)}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] leading-relaxed">
              ✓ Money lent decreases cash balance without inflating monthly consumption expenses. Repayments increase cash without counting as new income.
            </div>
          </div>

          {/* List of Active & Historical Loans by Person */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] px-1">Individual Loan Records</h3>

            {allLoans.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)]">
                No loans recorded yet. Tap "+ Lend Money" to track money lent to friends or family.
              </div>
            ) : (
              allLoans.map(loan => {
                const totalRepaidForLoan = (loan.repayments || [])
                  .filter(r => !r.deleted_at)
                  .reduce((sum, r) => sum + r.amount_minor, 0);
                const remainingDebt = Math.max(0, loan.amount_minor - totalRepaidForLoan);
                const progressPct = Math.min(100, Math.round((totalRepaidForLoan / loan.amount_minor) * 100));

                return (
                  <div 
                    key={loan.id}
                    className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-accent)] border border-[var(--color-border)] mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[var(--color-text-primary)]">{loan.borrower_name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              loan.status === 'fully_repaid' 
                                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30' 
                                : loan.status === 'partially_repaid' 
                                ? 'bg-white/10 text-white border border-white/20' 
                                : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                            }`}>
                              {loan.status.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--color-text-secondary)] mt-0.5 block">
                            Lent on {loan.local_date} {loan.expected_repayment_date ? `• Due by ${loan.expected_repayment_date}` : ''}
                          </span>
                          {loan.notes && (
                            <span className="text-xs text-[var(--color-text-muted)] mt-0.5 block italic">
                              "{loan.notes}"
                            </span>
                          )}
                        </div>
                      </div>

                      {loan.status !== 'fully_repaid' && (
                        <button
                          onClick={() => {
                            setSelectedLoanForRepayment(loan);
                            setIsRepaymentModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold text-xs tap-feedback flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Repay</span>
                        </button>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          Repaid: {formatCurrency(totalRepaidForLoan, state.settings.currency_label)} ({progressPct}%)
                        </span>
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          Remaining: {formatCurrency(remainingDebt, state.settings.currency_label)}
                        </span>
                      </div>
                      <HatchedBar percentage={progressPct} height={8} className="rounded-full" />
                    </div>

                    {/* Repayment History for this loan */}
                    {loan.repayments && loan.repayments.length > 0 && (
                      <div className="pt-2 border-t border-[var(--color-border)] space-y-1">
                        <span className="text-xs font-bold text-[var(--color-text-muted)] block">
                          Repayment Logs
                        </span>
                        {loan.repayments.map(rep => (
                          <div key={rep.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[var(--color-surface-subtle)]">
                            <span className="text-[var(--color-text-secondary)]">{rep.local_date} • {rep.note || 'Repayment'}</span>
                            <span className="font-bold text-[var(--color-accent)]">
                              +{formatCurrency(rep.amount_minor, state.settings.currency_label)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: LEND MONEY                                        */}
      {/* ======================================================== */}
      {isAddLoanModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80  animate-fade-in">
          <div className="w-full max-w-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-4  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Lend Money</h3>
              <button onClick={() => setIsAddLoanModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-2.5 text-xs">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Person / Borrower Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmed"
                  value={loanBorrower}
                  onChange={e => setLoanBorrower(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Amount Lent ({state.settings.currency_label})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 5000"
                  value={loanAmount}
                  onChange={e => setLoanAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Expected Repayment Date (Optional)</label>
                <input
                  type="date"
                  value={loanExpectedDate}
                  onChange={e => setLoanExpectedDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Note / Purpose (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Car repair assistance"
                  value={loanNotes}
                  onChange={e => setLoanNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div className="p-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                ✓ Recorded as money lent (not an expense). Cash balance decreases and receivable increases.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold rounded-xl text-xs tap-feedback"
              >
                Record Loan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RECORD REPAYMENT                                  */}
      {/* ======================================================== */}
      {isRepaymentModalOpen && selectedLoanForRepayment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80  animate-fade-in">
          <div className="w-full max-w-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Record Repayment</h3>
              <button onClick={() => setIsRepaymentModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRepayment} className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)] block">Borrower</span>
                <span className="font-bold text-[var(--color-text-primary)] text-sm">{selectedLoanForRepayment.borrower_name}</span>
                <span className="text-xs text-[var(--color-accent)] block mt-0.5">
                  Originally lent: {(selectedLoanForRepayment.amount_minor / 100).toLocaleString()} {state.settings.currency_label}
                </span>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Repayment Amount ({state.settings.currency_label})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 2000"
                  value={repaymentAmount}
                  onChange={e => setRepaymentAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Note / Method</label>
                <input
                  type="text"
                  placeholder="e.g. Cash returned in person"
                  value={repaymentNote}
                  onChange={e => setRepaymentNote(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div className="p-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                ✓ Increases cash balance without counting as new income.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold rounded-xl text-xs tap-feedback"
              >
                Confirm Repayment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT SALARY                                       */}
      {/* ======================================================== */}
      {isEditSalaryOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80  animate-fade-in">
          <div className="w-full max-w-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-4  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Edit Monthly Salary</h3>
              <button onClick={() => setIsEditSalaryOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="space-y-2.5 text-xs">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Monthly Salary ({state.settings.currency_label})</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={salaryInput}
                  onChange={e => setSalaryInput(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Payment Day of Month (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={paymentDayInput}
                  onChange={e => setPaymentDayInput(parseInt(e.target.value) || 1)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Effective From Date</label>
                <input
                  type="date"
                  required
                  value={salaryEffectiveDate}
                  onChange={e => setSalaryEffectiveDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Revision Note</label>
                <input
                  type="text"
                  value={salaryNotes}
                  onChange={e => setSalaryNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold rounded-xl text-xs tap-feedback"
              >
                Save New Salary
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SAVINGS DEPOSIT / WITHDRAWAL                      */}
      {/* ======================================================== */}
      {isSavingsModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80  animate-fade-in">
          <div className="w-full max-w-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-4  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                {savingsModalMode === 'deposit' ? 'Contribute to Savings' : 'Withdraw from Savings'}
              </h3>
              <button onClick={() => setIsSavingsModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavingsAction} className="space-y-2.5 text-xs">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Amount ({state.settings.currency_label})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 10000"
                  value={savingsActionAmount}
                  onChange={e => setSavingsActionAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold"
                />
              </div>

              {savingsGoals.length > 0 && (
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)]">Link to Goal (Optional)</label>
                  <select
                    value={savingsGoalSelect}
                    onChange={e => setSavingsGoalSelect(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  >
                    <option value="">General Savings Reserve</option>
                    {savingsGoals.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Note</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly transfer"
                  value={savingsActionNote}
                  onChange={e => setSavingsActionNote(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold rounded-xl text-xs tap-feedback"
              >
                Confirm Transfer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD INCOME                                        */}
      {/* ======================================================== */}
      {isAddIncomeOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80  animate-fade-in">
          <div className="w-full max-w-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-4  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Add Additional Income</h3>
              <button onClick={() => setIsAddIncomeOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIncome} className="space-y-2.5 text-xs">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Amount ({state.settings.currency_label})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 20000"
                  value={incomeAmount}
                  onChange={e => setIncomeAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Source / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Freelance project bonus"
                  value={incomeNote}
                  onChange={e => setIncomeNote(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Received Date</label>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={e => setIncomeDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold rounded-xl text-xs tap-feedback"
              >
                Record Income
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT ALLOCATION                                   */}
      {/* ======================================================== */}
      {isEditAllocationOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80  animate-fade-in">
          <div className="w-full max-w-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-4  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Edit Monthly Plan</h3>
              <button onClick={() => setIsEditAllocationOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAllocation} className="space-y-2 text-xs">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Savings</label>
                <input
                  type="number"
                  value={allocSavings}
                  onChange={e => setAllocSavings(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Personal Care</label>
                <input
                  type="number"
                  value={allocPersonal}
                  onChange={e => setAllocPersonal(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Car Care</label>
                <input
                  type="number"
                  value={allocCar}
                  onChange={e => setAllocCar(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Gym & Nutrition</label>
                <input
                  type="number"
                  value={allocGym}
                  onChange={e => setAllocGym(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold rounded-xl text-xs tap-feedback"
              >
                Save Plan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT CATEGORY BUDGET                              */}
      {/* ======================================================== */}
      {isEditCategoryBudgetOpen && selectedCategoryForBudget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80  animate-fade-in">
          <div className="w-full max-w-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-4  space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Edit Spending Limit</h3>
                <span className="text-xs text-[var(--color-accent)] font-semibold">{selectedCategoryForBudget.name}</span>
              </div>
              <button 
                onClick={() => {
                  setIsEditCategoryBudgetOpen(false);
                  setSelectedCategoryForBudget(null);
                }} 
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const major = parseFloat(categoryBudgetInput);
                if (isNaN(major) || major < 0) return;
                FinanceService.updateCategoryBudget(selectedCategoryForBudget.id, major);
                setIsEditCategoryBudgetOpen(false);
                setSelectedCategoryForBudget(null);
                onRefresh();
              }} 
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Monthly Budget Limit ({state.settings.currency_label})</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={categoryBudgetInput}
                  onChange={e => setCategoryBudgetInput(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold text-sm"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditCategoryBudgetOpen(false);
                    setSelectedCategoryForBudget(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold rounded-xl text-xs tap-feedback"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. EDIT TRANSACTION MODAL                                */}
      {/* ======================================================== */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60  animate-fade-in">
          <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-3xl p-5  border border-[var(--color-border)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Edit Transaction</h3>
                <span className="text-xs text-[var(--color-text-secondary)] capitalize">{editingTransaction.type.replace('_', ' ')}</span>
              </div>
              <button 
                onClick={() => setEditingTransaction(null)} 
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTx} className="space-y-3 text-xs">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)]">Note / Title</label>
                <input
                  type="text"
                  required
                  value={editTxNote}
                  onChange={e => setEditTxNote(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)]">Amount ({state.settings.currency_label})</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={editTxAmount}
                    onChange={e => setEditTxAmount(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)]">Date</label>
                  <input
                    type="date"
                    required
                    value={editTxDate}
                    onChange={e => setEditTxDate(e.target.value)}
                    className="w-full mt-1 px-2.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>

              {editingTransaction.type === 'expense' && (
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)]">Category</label>
                  <select
                    value={editTxCategory}
                    onChange={e => setEditTxCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  >
                    {state.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold rounded-xl text-xs tap-feedback"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Customization Add Widget & Preset Modals */}
      <ModuleAddWidgetModal
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        moduleId="finance"
        moduleTitle="Finance"
        currentWidgets={isEditMode ? draftWidgets : layout.widgets}
        onAddWidget={handleAddWidget}
      />

      <ModulePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        moduleId="finance"
        moduleTitle="Finance"
        activePreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />

      {/* Cycle Picker Bottom Sheet */}
      <CyclePickerSheet
        isOpen={isCyclePickerOpen}
        onClose={() => setIsCyclePickerOpen(false)}
        cycles={availableCycles}
        selectedOffset={cycleOffset}
        onSelectCycle={(offset) => setCycleOffset(offset)}
      />
      {/* Recurring Subscriptions & Bills Modal */}
      <RecurringSubscriptionsModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />

      {/* Quick Purchase Affordability Simulator Modal */}
      <AffordabilityCalculatorModal
        isOpen={isAffordabilityModalOpen}
        onClose={() => setIsAffordabilityModalOpen(false)}
        onRecordExpense={(name, amount) => {
          const tx: Transaction = {
            id: generateUUID(),
            type: 'expense',
            amount_minor: Math.round(amount * 100),
            local_date: today,
            category_id: state.categories[0]?.id || 'cat-1',
            note: name || 'Simulated Purchase',
            created_at: Date.now(),
            updated_at: Date.now(),
            deleted_at: null,
          };
          db.updateState(s => {
            s.transactions.unshift(tx);
          });
          triggerToast(`✓ Recorded expense "${name}": ${amount.toLocaleString()} ${state.settings.currency_label || 'DA'}`);
          onRefresh();
        }}
      />

      {/* Currency & FX Converter Modal */}
      <CurrencyConverterModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        onRefresh={onRefresh}
        onToast={triggerToast}
        currencyLabel={state.settings.currency_label || 'DA'}
      />

      {/* Smart Shopping & Grocery Checklist Modal */}
      <ShoppingListModal
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />

      {/* Islamic Zakat & Charity Desk Modal */}
      <ZakatCalculatorModal
        isOpen={isZakatModalOpen}
        onClose={() => setIsZakatModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />

      {/* Net Worth & Emergency Runway Desk Modal */}
      <NetWorthModal
        isOpen={isNetWorthModalOpen}
        onClose={() => setIsNetWorthModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />
    </div>
  );
};
