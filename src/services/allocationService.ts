// Allocation Service: Income Allocation Plans, Percentage Distribution & Dedicated Sadaqah Tracker
import { db, generateUUID, getTodayLocalDate } from './storage';
import { FinanceService } from './financeService';
import { 
  IncomeAllocationPlan, 
  AllocationCategoryItem, 
  SadaqahSettings, 
  Transaction 
} from '../types';

export const AllocationService = {
  // ==========================================================
  // 1. ALLOCATION PLANS MANAGEMENT
  // ==========================================================

  getAllocationPlans(): IncomeAllocationPlan[] {
    const state = db.getState();
    const plans = state.allocationPlans || [];
    return plans.filter(p => !p.deleted_at);
  },

  getActivePlan(): IncomeAllocationPlan {
    const plans = this.getAllocationPlans();
    const active = plans.find(p => p.is_active);
    if (active) return active;
    if (plans.length > 0) return plans[0];

    // Fallback default plan
    return {
      id: 'plan-default',
      name: 'Standard Target (75 / 20 / 5)',
      basis: 'salary_only',
      is_active: true,
      categories: [
        { id: 'alloc-sav', name: 'Savings & Investments', type: 'percentage', value: 75, color: '#A6D96A', is_savings: true },
        { id: 'alloc-pers', name: 'Personal Spending', type: 'percentage', value: 20, color: '#83A98A' },
        { id: 'alloc-char', name: 'Sadaqah / Charity', type: 'percentage', value: 5, color: '#38BDF8', is_charity: true },
      ],
      notes: '75% savings target, 20% living expenses, 5% dedicated charity',
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };
  },

  createPlan(params: {
    name: string;
    basis: 'salary_only' | 'total_income';
    categories: AllocationCategoryItem[];
    notes?: string;
    setActive?: boolean;
  }): IncomeAllocationPlan {
    const now = Date.now();
    const newPlan: IncomeAllocationPlan = {
      id: generateUUID(),
      name: params.name.trim() || 'New Allocation Plan',
      basis: params.basis,
      is_active: !!params.setActive,
      categories: params.categories,
      notes: params.notes,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(draft => {
      if (!draft.allocationPlans) draft.allocationPlans = [];
      if (params.setActive) {
        draft.allocationPlans.forEach(p => { p.is_active = false; });
      }
      draft.allocationPlans.push(newPlan);
    });

    return newPlan;
  },

  updatePlan(planId: string, updates: Partial<IncomeAllocationPlan>): void {
    const now = Date.now();
    db.updateState(draft => {
      if (!draft.allocationPlans) return;
      const plan = draft.allocationPlans.find(p => p.id === planId);
      if (plan) {
        if (updates.name !== undefined) plan.name = updates.name;
        if (updates.basis !== undefined) plan.basis = updates.basis;
        if (updates.categories !== undefined) plan.categories = updates.categories;
        if (updates.notes !== undefined) plan.notes = updates.notes;
        if (updates.is_active !== undefined) {
          if (updates.is_active) {
            draft.allocationPlans.forEach(p => { p.is_active = false; });
          }
          plan.is_active = updates.is_active;
        }
        plan.updated_at = now;
      }
    });
  },

  setActivePlan(planId: string): void {
    db.updateState(draft => {
      if (!draft.allocationPlans) return;
      draft.allocationPlans.forEach(p => {
        p.is_active = p.id === planId;
      });
    });
  },

  deletePlan(planId: string): void {
    db.updateState(draft => {
      if (!draft.allocationPlans) return;
      const target = draft.allocationPlans.find(p => p.id === planId);
      if (target) {
        target.deleted_at = Date.now();
      }
      // If we deleted the active plan, activate the first remaining
      const remaining = draft.allocationPlans.filter(p => !p.deleted_at);
      if (remaining.length > 0 && !remaining.some(p => p.is_active)) {
        remaining[0].is_active = true;
      }
    });
  },

  // ==========================================================
  // 2. VALIDATION & DISTRIBUTION ENGINE
  // ==========================================================

  validatePlanCategories(categories: AllocationCategoryItem[]): {
    isValid: boolean;
    totalPercent: number;
    remainingPercent: number;
    errorMessage?: string;
  } {
    let totalPercent = 0;
    for (const cat of categories) {
      if (cat.type === 'percentage') {
        totalPercent += cat.value;
      }
    }

    const remainingPercent = Math.max(0, 100 - totalPercent);
    const isValid = totalPercent <= 100;

    return {
      isValid,
      totalPercent,
      remainingPercent,
      errorMessage: isValid ? undefined : `Total percentage allocation (${totalPercent}%) exceeds 100%. Please adjust.`,
    };
  },

  calculatePlanDistribution(plan?: IncomeAllocationPlan): {
    totalBaseIncomeMinor: number;
    basis: 'salary_only' | 'total_income';
    allocatedMinor: number;
    unallocatedMinor: number;
    totalPercent: number;
    unallocatedPercent: number;
    breakdown: {
      category: AllocationCategoryItem;
      plannedAmountMinor: number;
      percentageOfTotal: number;
      isSavings: boolean;
      isCharity: boolean;
    }[];
  } {
    const activePlan = plan || this.getActivePlan();
    const salarySetting = FinanceService.getSalarySetting();
    const incomeSummary = FinanceService.getIncomeSummary();

    let totalBaseIncomeMinor = salarySetting.monthly_salary_minor;
    if (activePlan.basis === 'total_income') {
      // Use received total income if greater than zero, otherwise base salary
      totalBaseIncomeMinor = incomeSummary.monthTotalMinor > 0 
        ? incomeSummary.monthTotalMinor 
        : salarySetting.monthly_salary_minor;
    }

    let allocatedMinor = 0;
    let totalPercentageValue = 0;

    const breakdown = activePlan.categories.map(cat => {
      let plannedAmountMinor = 0;
      let effectivePercent = 0;

      if (cat.type === 'percentage') {
        effectivePercent = cat.value;
        plannedAmountMinor = Math.round((totalBaseIncomeMinor * cat.value) / 100);
        totalPercentageValue += cat.value;
      } else {
        // Fixed amount
        plannedAmountMinor = cat.value;
        effectivePercent = totalBaseIncomeMinor > 0 
          ? Math.round((cat.value / totalBaseIncomeMinor) * 1000) / 10 
          : 0;
      }

      allocatedMinor += plannedAmountMinor;

      return {
        category: cat,
        plannedAmountMinor,
        percentageOfTotal: effectivePercent,
        isSavings: !!cat.is_savings,
        isCharity: !!cat.is_charity,
      };
    });

    const unallocatedMinor = Math.max(0, totalBaseIncomeMinor - allocatedMinor);
    const unallocatedPercent = Math.max(0, 100 - totalPercentageValue);

    return {
      totalBaseIncomeMinor,
      basis: activePlan.basis,
      allocatedMinor,
      unallocatedMinor,
      totalPercent: totalPercentageValue,
      unallocatedPercent,
      breakdown,
    };
  },

  // ==========================================================
  // 3. DEDICATED SADAQAH / CHARITY TRACKER
  // ==========================================================

  getSadaqahSettings(): SadaqahSettings {
    const state = db.getState();
    if (state.sadaqahSettings) return state.sadaqahSettings;

    return {
      type: 'percentage',
      value: 5,
      monthly_target_minor: 250000, // 2,500 DA
      basis: 'salary_only',
      notes: 'Dedicated 5% Sadaqah allocation from monthly income'
    };
  },

  updateSadaqahSettings(settings: Partial<SadaqahSettings>): void {
    const current = this.getSadaqahSettings();
    const salarySetting = FinanceService.getSalarySetting();
    const updated = { ...current, ...settings };

    // Recompute monthly_target_minor if based on percentage
    if (updated.type === 'percentage') {
      const baseSalaryMinor = salarySetting.monthly_salary_minor;
      updated.monthly_target_minor = Math.round((baseSalaryMinor * updated.value) / 100);
    }

    db.updateState(draft => {
      draft.sadaqahSettings = updated;
    });
  },

  getSadaqahSummary(yearMonthStr?: string): {
    monthlyTargetMinor: number;
    monthlyContributedMinor: number;
    monthlyProgressPct: number;
    remainingToTargetMinor: number;
    yearlyTargetMinor: number;
    yearlyContributedMinor: number;
    contributionHistory: Transaction[];
    isGoalMet: boolean;
  } {
    const state = db.getState();
    const settings = this.getSadaqahSettings();
    const salarySetting = FinanceService.getSalarySetting();
    const incomeSummary = FinanceService.getIncomeSummary(yearMonthStr);
    const today = getTodayLocalDate();
    const currentYM = yearMonthStr || today.slice(0, 7); // 'YYYY-MM'
    const currentYear = currentYM.slice(0, 4); // 'YYYY'

    // Compute monthly target based on basis
    let baseIncomeMinor = salarySetting.monthly_salary_minor;
    if (settings.basis === 'total_income' && incomeSummary.monthTotalMinor > 0) {
      baseIncomeMinor = incomeSummary.monthTotalMinor;
    }

    const monthlyTargetMinor = settings.type === 'percentage'
      ? Math.round((baseIncomeMinor * settings.value) / 100)
      : settings.monthly_target_minor;

    const yearlyTargetMinor = monthlyTargetMinor * 12;

    // Find actual charity/sadaqah transactions
    // Matches category_id === 'cat-sadaqah' OR note containing 'sadaqah', 'charity', 'donation', 'zakat'
    const charityTxs = state.transactions.filter(t => {
      if (t.deleted_at || t.type !== 'expense') return false;
      if (t.category_id === 'cat-sadaqah') return true;
      const noteLower = (t.note || '').toLowerCase();
      return noteLower.includes('sadaqah') || noteLower.includes('charity') || noteLower.includes('donation') || noteLower.includes('zakat');
    });

    let monthlyContributedMinor = 0;
    let yearlyContributedMinor = 0;

    for (const t of charityTxs) {
      if (t.local_date.startsWith(currentYear)) {
        yearlyContributedMinor += t.amount_minor;
      }
      if (t.local_date.startsWith(currentYM)) {
        monthlyContributedMinor += t.amount_minor;
      }
    }

    const monthlyProgressPct = monthlyTargetMinor > 0
      ? Math.min(100, Math.round((monthlyContributedMinor / monthlyTargetMinor) * 100))
      : (monthlyContributedMinor > 0 ? 100 : 0);

    const remainingToTargetMinor = Math.max(0, monthlyTargetMinor - monthlyContributedMinor);

    return {
      monthlyTargetMinor,
      monthlyContributedMinor,
      monthlyProgressPct,
      remainingToTargetMinor,
      yearlyTargetMinor,
      yearlyContributedMinor,
      contributionHistory: charityTxs.sort((a, b) => b.created_at - a.created_at),
      isGoalMet: monthlyTargetMinor > 0 ? monthlyContributedMinor >= monthlyTargetMinor : false,
    };
  }
};
