// Finance Service: Salary, Income History, Savings & Budget Allocation (Section 1 Specification)
import { db, generateUUID, getTodayLocalDate } from './storage';
import { 
  SalarySetting, 
  SalaryHistoryEntry, 
  SavingsAccount, 
  SavingsTransaction, 
  SavingsGoal, 
  SavingsGoalStatus,
  SalaryAllocation, 
  Category,
  Transaction 
} from '../types';

export const FinanceService = {
  // ==========================================================
  // 1. SALARY & INCOME MANAGEMENT
  // ==========================================================

  getSalarySetting(): SalarySetting {
    const state = db.getState();
    return state.salarySetting || {
      monthly_salary_minor: 5000000,
      payment_day: 1,
      effective_from: '2026-10-01',
      history: []
    };
  },

  /**
   * Updates monthly salary starting from a chosen effective date.
   * Preserves all historical salary snapshots without altering past ledger calculations.
   */
  updateSalary(params: {
    newSalaryMajor: number;
    paymentDay: number;
    effectiveFrom: string;
    notes?: string;
  }): void {
    const now = Date.now();
    const newSalaryMinor = Math.round(params.newSalaryMajor * 100);

    db.updateState(draft => {
      const historyEntry: SalaryHistoryEntry = {
        id: generateUUID(),
        amount_minor: newSalaryMinor,
        effective_from: params.effectiveFrom,
        payment_day: params.paymentDay,
        notes: params.notes || 'Salary revision',
        created_at: now,
      };

      if (!draft.salarySetting) {
        draft.salarySetting = {
          monthly_salary_minor: newSalaryMinor,
          payment_day: params.paymentDay,
          effective_from: params.effectiveFrom,
          history: [historyEntry],
        };
      } else {
        draft.salarySetting.monthly_salary_minor = newSalaryMinor;
        draft.salarySetting.payment_day = params.paymentDay;
        draft.salarySetting.effective_from = params.effectiveFrom;
        draft.salarySetting.history.unshift(historyEntry);
      }
    });
  },

  /**
   * Records additional income (freelance, bonus, dividend, gift, etc.)
   */
  addIncome(params: {
    amountMajor: number;
    localDate: string;
    note: string;
    sourceType?: 'salary' | 'bonus' | 'freelance' | 'other';
  }): Transaction {
    const now = Date.now();
    const amountMinor = Math.round(params.amountMajor * 100);

    const tx: Transaction = {
      id: generateUUID(),
      type: 'income',
      amount_minor: amountMinor,
      local_date: params.localDate || getTodayLocalDate(),
      note: params.note.trim() || 'Income',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(draft => {
      draft.transactions.unshift(tx);
    });

    return tx;
  },

  /**
   * Calculates monthly and yearly total actual income
   */
  getIncomeSummary(yearMonthStr?: string): {
    monthTotalMinor: number;
    yearTotalMinor: number;
    transactionsCount: number;
    incomeTransactions: Transaction[];
  } {
    const state = db.getState();
    const today = getTodayLocalDate();
    const currentYM = yearMonthStr || today.slice(0, 7); // 'YYYY-MM'
    const currentYear = currentYM.slice(0, 4); // 'YYYY'

    const incomeTxs = state.transactions.filter(t => !t.deleted_at && t.type === 'income');

    let monthTotalMinor = 0;
    let yearTotalMinor = 0;

    for (const t of incomeTxs) {
      if (t.local_date.startsWith(currentYear)) {
        yearTotalMinor += t.amount_minor;
      }
      if (t.local_date.startsWith(currentYM)) {
        monthTotalMinor += t.amount_minor;
      }
    }

    return {
      monthTotalMinor,
      yearTotalMinor,
      transactionsCount: incomeTxs.length,
      incomeTransactions: incomeTxs,
    };
  },

  // ==========================================================
  // 2. SAVINGS MANAGEMENT (Transfers, not expenses!)
  // ==========================================================

  getSavingsAccount(): SavingsAccount {
    const state = db.getState();
    return state.savingsAccount || {
      current_balance_minor: 19000000,
      starting_balance_minor: 19000000,
      starting_date: '2026-10-01',
    };
  },

  /**
   * Adjusts the starting balance of the savings account with explanation
   */
  adjustStartingSavingsBalance(newBalanceMajor: number, reason?: string): void {
    const amountMinor = Math.round(newBalanceMajor * 100);
    const now = Date.now();

    db.updateState(draft => {
      if (!draft.savingsAccount) {
        draft.savingsAccount = {
          current_balance_minor: amountMinor,
          starting_balance_minor: amountMinor,
          starting_date: getTodayLocalDate(),
          notes: reason,
        };
      } else {
        draft.savingsAccount.starting_balance_minor = amountMinor;
        draft.savingsAccount.current_balance_minor = amountMinor;
        draft.savingsAccount.notes = reason;
      }

      // Record adjustment transaction
      const adjTx: SavingsTransaction = {
        id: generateUUID(),
        type: 'adjustment',
        amount_minor: amountMinor,
        local_date: getTodayLocalDate(),
        note: reason || 'Starting balance baseline set',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      if (!draft.savingsTransactions) draft.savingsTransactions = [];
      draft.savingsTransactions.unshift(adjTx);
    });
  },

  /**
   * Contributes money into savings.
   * IMPORTANT: Recorded as a transfer, NOT an expense, so monthly spending is not inflated.
   */
  contributeToSavings(params: {
    amountMajor: number;
    goalId?: string;
    note?: string;
    date?: string;
  }): void {
    const amountMinor = Math.round(params.amountMajor * 100);
    const now = Date.now();
    const localDate = params.date || getTodayLocalDate();

    db.updateState(draft => {
      if (!draft.savingsAccount) {
        draft.savingsAccount = { current_balance_minor: amountMinor, starting_balance_minor: 0, starting_date: localDate };
      } else {
        draft.savingsAccount.current_balance_minor += amountMinor;
      }

      const stx: SavingsTransaction = {
        id: generateUUID(),
        type: 'deposit',
        amount_minor: amountMinor,
        goal_id: params.goalId || null,
        local_date: localDate,
        note: params.note || 'Savings contribution',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      if (!draft.savingsTransactions) draft.savingsTransactions = [];
      draft.savingsTransactions.unshift(stx);

      // Also create a transfer record in general ledger so cash flow is balanced
      const generalTx: Transaction = {
        id: generateUUID(),
        type: 'transfer',
        amount_minor: amountMinor,
        local_date: localDate,
        goal_id: params.goalId || null,
        note: `Transfer to Savings: ${params.note || 'Savings Deposit'}`,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      draft.transactions.unshift(generalTx);

      // If tied to a goal, increment goal saved amount
      if (params.goalId) {
        const goal = draft.savingsGoals.find(g => g.id === params.goalId);
        if (goal) {
          goal.current_saved_minor = (goal.current_saved_minor || 0) + amountMinor;
          goal.updated_at = now;
        }
      }
    });
  },

  /**
   * Withdraws money from savings back into checking.
   * IMPORTANT: Never counts as new income.
   */
  withdrawFromSavings(params: {
    amountMajor: number;
    goalId?: string;
    note?: string;
    date?: string;
  }): void {
    const amountMinor = Math.round(params.amountMajor * 100);
    const now = Date.now();
    const localDate = params.date || getTodayLocalDate();

    db.updateState(draft => {
      if (draft.savingsAccount) {
        draft.savingsAccount.current_balance_minor = Math.max(0, draft.savingsAccount.current_balance_minor - amountMinor);
      }

      const stx: SavingsTransaction = {
        id: generateUUID(),
        type: 'withdrawal',
        amount_minor: amountMinor,
        goal_id: params.goalId || null,
        local_date: localDate,
        note: params.note || 'Savings withdrawal',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      if (!draft.savingsTransactions) draft.savingsTransactions = [];
      draft.savingsTransactions.unshift(stx);

      // Transfer back to checking (transfer type, NOT income!)
      const generalTx: Transaction = {
        id: generateUUID(),
        type: 'transfer',
        amount_minor: amountMinor,
        local_date: localDate,
        note: `Withdrawal from Savings: ${params.note || 'Transfer to checking'}`,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      draft.transactions.unshift(generalTx);

      if (params.goalId) {
        const goal = draft.savingsGoals.find(g => g.id === params.goalId);
        if (goal) {
          goal.current_saved_minor = Math.max(0, (goal.current_saved_minor || 0) - amountMinor);
          goal.updated_at = now;
        }
      }
    });
  },

  /**
   * Creates or updates a savings goal with monthly progress tracking
   */
  saveGoal(goalData: {
    id?: string;
    name: string;
    targetMajor: number;
    currentSavedMajor: number;
    targetDate?: string;
    monthlyContributionMajor?: number;
    status?: SavingsGoalStatus;
    notes?: string;
  }): SavingsGoal {
    const now = Date.now();
    const targetMinor = Math.round(goalData.targetMajor * 100);
    const currentSavedMinor = Math.round(goalData.currentSavedMajor * 100);
    const monthlyContributionMinor = goalData.monthlyContributionMajor 
      ? Math.round(goalData.monthlyContributionMajor * 100) 
      : 3500000;

    let savedGoal: SavingsGoal;

    db.updateState(draft => {
      if (goalData.id) {
        const existing = draft.savingsGoals.find(g => g.id === goalData.id);
        if (existing) {
          existing.name = goalData.name;
          existing.target_minor = targetMinor;
          existing.current_saved_minor = currentSavedMinor;
          existing.target_date = goalData.targetDate;
          existing.monthly_contribution_minor = monthlyContributionMinor;
          if (goalData.status) existing.status = goalData.status;
          if (goalData.notes !== undefined) existing.notes = goalData.notes;
          existing.updated_at = now;
          savedGoal = existing;
          return;
        }
      }

      savedGoal = {
        id: generateUUID(),
        name: goalData.name,
        opening_minor: currentSavedMinor,
        target_minor: targetMinor,
        current_saved_minor: currentSavedMinor,
        target_date: goalData.targetDate || '2028-12-31',
        monthly_contribution_minor: monthlyContributionMinor,
        status: goalData.status || 'active',
        notes: goalData.notes,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      draft.savingsGoals.push(savedGoal);
    });

    return savedGoal!;
  },

  getGoals(includeArchived: boolean = false): SavingsGoal[] {
    const state = db.getState();
    return (state.savingsGoals || [])
      .filter(g => !g.deleted_at)
      .filter(g => includeArchived || g.status !== 'archived');
  },

  setGoalStatus(goalId: string, status: SavingsGoalStatus): void {
    const now = Date.now();
    db.updateState(draft => {
      const goal = draft.savingsGoals.find(g => g.id === goalId);
      if (goal) {
        goal.status = status;
        goal.updated_at = now;
      }
    });
  },

  deleteGoal(goalId: string): void {
    const now = Date.now();
    db.updateState(draft => {
      const goal = draft.savingsGoals.find(g => g.id === goalId);
      if (goal) {
        goal.deleted_at = now;
        // Strictly preserve all past savings transactions and general ledger transfers!
      }
    });
  },

  getGoalProjections(goalId: string): {
    goal: SavingsGoal;
    targetMinor: number;
    currentSavedMinor: number;
    remainingMinor: number;
    progressPct: number;
    monthlyContributionMinor: number;
    estimatedMonthsRemaining: number;
    estimatedCompletionDate: string;
    isComplete: boolean;
    status: SavingsGoalStatus;
  } {
    const state = db.getState();
    const goal = (state.savingsGoals || []).find(g => g.id === goalId) || state.savingsGoals[0];
    if (!goal) {
      return {
        goal: { id: 'none', name: 'No Goal', opening_minor: 0, target_minor: 1, created_at: Date.now(), updated_at: Date.now(), deleted_at: null },
        targetMinor: 1,
        currentSavedMinor: 0,
        remainingMinor: 1,
        progressPct: 0,
        monthlyContributionMinor: 0,
        estimatedMonthsRemaining: 0,
        estimatedCompletionDate: 'N/A',
        isComplete: false,
        status: 'active',
      };
    }

    const targetMinor = goal.target_minor;
    const currentSavedMinor = goal.current_saved_minor || 0;
    const remainingMinor = Math.max(0, targetMinor - currentSavedMinor);
    const progressPct = targetMinor > 0 
      ? Math.min(100, Math.round((currentSavedMinor / targetMinor) * 100)) 
      : 100;
    const isComplete = currentSavedMinor >= targetMinor;

    const deposits = (state.savingsTransactions || []).filter(st => !st.deleted_at && st.type === 'deposit' && st.goal_id === goalId);
    let effectiveMonthlyContributionMinor = goal.monthly_contribution_minor || 3500000;
    if (deposits.length > 0) {
      const totalDeposited = deposits.reduce((sum, d) => sum + d.amount_minor, 0);
      effectiveMonthlyContributionMinor = Math.max(100000, Math.round(totalDeposited / Math.max(1, deposits.length)));
    }

    const estimatedMonthsRemaining = effectiveMonthlyContributionMinor > 0 && remainingMinor > 0
      ? Math.ceil(remainingMinor / effectiveMonthlyContributionMinor)
      : 0;

    const now = new Date();
    const completionDateObj = new Date(now.getFullYear(), now.getMonth() + estimatedMonthsRemaining, 1);
    const estYear = completionDateObj.getFullYear();
    const estMonth = completionDateObj.toLocaleString('default', { month: 'short' });
    const estimatedCompletionDate = isComplete 
      ? 'Achieved!' 
      : `${estMonth} ${estYear} (est. ${estimatedMonthsRemaining} mo)`;

    return {
      goal,
      targetMinor,
      currentSavedMinor,
      remainingMinor,
      progressPct,
      monthlyContributionMinor: effectiveMonthlyContributionMinor,
      estimatedMonthsRemaining,
      estimatedCompletionDate,
      isComplete,
      status: goal.status || 'active',
    };
  },

  getCategories(): Category[] {
    const state = db.getState();
    return (state.categories || []).filter(c => !c.deleted_at);
  },

  updateCategoryBudget(categoryId: string, amountMajor: number, alertThreshold: number = 0.8): void {
    const amountMinor = Math.round(amountMajor * 100);
    const now = Date.now();
    db.updateState(draft => {
      const cat = draft.categories.find(c => c.id === categoryId);
      if (cat) {
        cat.amount_minor = amountMinor;
        cat.alert_threshold = alertThreshold;
        cat.updated_at = now;
      }
    });
  },

  /**
   * Calculates comprehensive cash balance and wealth overview:
   * Available cash = Income - Expenses - Savings in reserve - (Money Lent - Money Repaid)
   * Net Worth = Available Cash + Savings Balance + Money Owed to Me
   */
  getCashBalanceSummary(): {
    availableCashMinor: number;
    currentSavingsMinor: number;
    moneyOwedToMeMinor: number;
    netWorthMinor: number;
    monthIncomeMinor: number;
    monthExpenseMinor: number;
  } {
    const state = db.getState();
    const today = getTodayLocalDate();
    const currentYM = today.slice(0, 7);

    // Sum all non-deleted transactions
    let totalIncome = 0;
    let totalExpenses = 0;
    let monthIncome = 0;
    let monthExpense = 0;
    let totalLoansGiven = 0;
    let totalLoansRepaid = 0;
    let savingsDepositedFromChecking = 0;
    let savingsWithdrawnToChecking = 0;

    for (const t of state.transactions) {
      if (t.deleted_at) continue;

      if (t.type === 'income') {
        totalIncome += t.amount_minor;
        if (t.local_date.startsWith(currentYM)) monthIncome += t.amount_minor;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount_minor;
        if (t.local_date.startsWith(currentYM)) monthExpense += t.amount_minor;
      } else if (t.type === 'loan_given') {
        totalLoansGiven += t.amount_minor;
      } else if (t.type === 'loan_repayment') {
        totalLoansRepaid += t.amount_minor;
      } else if (t.type === 'transfer') {
        if (t.note?.toLowerCase().includes('to savings')) {
          savingsDepositedFromChecking += t.amount_minor;
        } else if (t.note?.toLowerCase().includes('from savings')) {
          savingsWithdrawnToChecking += t.amount_minor;
        }
      }
    }

    // Also check explicit savings transactions if available
    if (state.savingsTransactions && state.savingsTransactions.length > 0) {
      let stxDeposits = 0;
      let stxWithdrawals = 0;
      for (const st of state.savingsTransactions) {
        if (st.deleted_at) continue;
        if (st.type === 'deposit') stxDeposits += st.amount_minor;
        else if (st.type === 'withdrawal') stxWithdrawals += st.amount_minor;
      }
      if (stxDeposits > 0 || stxWithdrawals > 0) {
        savingsDepositedFromChecking = Math.max(savingsDepositedFromChecking, stxDeposits);
        savingsWithdrawnToChecking = Math.max(savingsWithdrawnToChecking, stxWithdrawals);
      }
    }

    const netSavingsTransferred = Math.max(0, savingsDepositedFromChecking - savingsWithdrawnToChecking);
    const currentSavings = Math.round(state.savingsAccount?.current_balance_minor || 0);
    const netLoansLentOut = Math.max(0, totalLoansGiven - totalLoansRepaid);

    // Baseline opening checking balance
    // Seeded demo installs retain 75,000 DA (7,500,000 minor) to keep sample data intact.
    // Clean/new installs without seed transactions start at 0 DA unless the user logs a starting balance or income.
    const isSeedInstall = state.transactions.some(t => t.id === 'tx-3' || t.id === 'tx-1');
    const baselineChecking = isSeedInstall ? 7500000 : 0;
    // Double-entry cash formula:
    // Available checking cash = baseline + income + loan repayments - expenses - loans given - transfers to savings
    const availableCash = (baselineChecking + totalIncome + totalLoansRepaid) - totalExpenses - totalLoansGiven - netSavingsTransferred;
    const netWorth = Math.max(0, availableCash) + currentSavings + netLoansLentOut;

    return {
      availableCashMinor: Math.max(0, Math.round(availableCash)),
      currentSavingsMinor: currentSavings,
      moneyOwedToMeMinor: Math.round(netLoansLentOut),
      netWorthMinor: Math.round(netWorth),
      monthIncomeMinor: Math.round(monthIncome),
      monthExpenseMinor: Math.round(monthExpense),
    };
  },

  // ==========================================================
  // 3. MONTHLY SALARY ALLOCATION (Planning Tool)
  // ==========================================================

  getSalaryAllocation(): SalaryAllocation {
    const state = db.getState();
    return state.salaryAllocation || {
      savings_amount_minor: 2000000,
      personal_amount_minor: 1200000,
      car_amount_minor: 500000,
      gym_amount_minor: 400000,
      shopping_amount_minor: 500000,
      other_amount_minor: 400000,
      updated_at: Date.now(),
    };
  },

  updateSalaryAllocation(allocation: Omit<SalaryAllocation, 'updated_at'>): void {
    db.updateState(draft => {
      draft.salaryAllocation = {
        ...allocation,
        updated_at: Date.now(),
      };
    });
  },

  deleteTransaction(transactionId: string): boolean {
    let deleted = false;
    db.updateState(draft => {
      const tx = draft.transactions.find(t => t.id === transactionId);
      if (tx) {
        tx.deleted_at = Date.now();
        deleted = true;
      }
    });
    return deleted;
  },

  updateTransaction(transactionId: string, updates: Partial<Transaction>): Transaction | null {
    let updated: Transaction | null = null;
    db.updateState(draft => {
      const tx = draft.transactions.find(t => t.id === transactionId);
      if (tx) {
        Object.assign(tx, updates, { updated_at: Date.now() });
        updated = tx;
      }
    });
    return updated;
  }
};
