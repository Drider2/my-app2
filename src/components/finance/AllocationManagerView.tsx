import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertTriangle, 
  HeartHandshake, 
  PiggyBank, 
  Sparkles, 
  DollarSign, 
  Save, 
  X,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import { db, generateUUID, formatCurrency } from '../../services/storage';
import { AllocationService } from '../../services/allocationService';
import { FinanceService } from '../../services/financeService';
import { 
  IncomeAllocationPlan, 
  AllocationCategoryItem, 
  SadaqahSettings 
} from '../../types';

interface AllocationManagerViewProps {
  onRefresh: () => void;
  onClose?: () => void;
}

export const AllocationManagerView: React.FC<AllocationManagerViewProps> = ({ 
  onRefresh, 
  onClose 
}) => {
  const state = db.getState();
  const currencyLabel = state.settings.currency_label || 'DA';

  const plans = AllocationService.getAllocationPlans();
  const activePlan = AllocationService.getActivePlan();

  // Selected Plan state for editing
  const [selectedPlanId, setSelectedPlanId] = useState<string>(activePlan.id);
  const currentPlan = plans.find(p => p.id === selectedPlanId) || activePlan;

  // Plan Edit Form state
  const [planName, setPlanName] = useState(currentPlan.name);
  const [planBasis, setPlanBasis] = useState<'salary_only' | 'total_income'>(currentPlan.basis);
  const [categories, setCategories] = useState<AllocationCategoryItem[]>(JSON.parse(JSON.stringify(currentPlan.categories)));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // New Category Item Form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCatValue, setNewCatValue] = useState<string>('10');
  const [newCatColor, setNewCatColor] = useState('#A6D96A');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Sadaqah Form state
  const sadaqahSettings = AllocationService.getSadaqahSettings();
  const [sadaqahType, setSadaqahType] = useState<'percentage' | 'fixed'>(sadaqahSettings.type);
  const [sadaqahValue, setSadaqahValue] = useState<number>(sadaqahSettings.value);
  const [sadaqahFixedMajor, setSadaqahFixedMajor] = useState<number>(Math.round(sadaqahSettings.monthly_target_minor / 100));
  const [sadaqahBasis, setSadaqahBasis] = useState<'salary_only' | 'total_income'>(sadaqahSettings.basis);

  // New Plan Creation Modal state
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  // Validation calculations
  const validation = AllocationService.validatePlanCategories(categories);
  const distribution = AllocationService.calculatePlanDistribution({
    ...currentPlan,
    basis: planBasis,
    categories,
  });

  // Handle plan switch
  const handleSelectPlan = (id: string) => {
    setSelectedPlanId(id);
    const target = plans.find(p => p.id === id);
    if (target) {
      setPlanName(target.name);
      setPlanBasis(target.basis);
      setCategories(JSON.parse(JSON.stringify(target.categories)));
      setSaveMessage(null);
    }
  };

  // Add category item
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const val = parseFloat(newCatValue);
    if (isNaN(val) || val <= 0) return;

    const valToStore = newCatType === 'percentage' ? val : Math.round(val * 100);

    const newItem: AllocationCategoryItem = {
      id: generateUUID(),
      name: newCatName.trim(),
      type: newCatType,
      value: valToStore,
      color: newCatColor,
    };

    setCategories([...categories, newItem]);
    setNewCatName('');
    setNewCatValue('10');
    setIsAddingCategory(false);
  };

  // Remove category item
  const handleRemoveCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  // Update category item value
  const handleUpdateCategoryValue = (id: string, newVal: number) => {
    setCategories(categories.map(c => {
      if (c.id === id) {
        return { ...c, value: newVal };
      }
      return c;
    }));
  };

  // Save current plan
  const handleSavePlan = () => {
    if (!validation.isValid) {
      alert(validation.errorMessage || 'Total percentage cannot exceed 100%.');
      return;
    }

    AllocationService.updatePlan(selectedPlanId, {
      name: planName.trim() || 'Custom Plan',
      basis: planBasis,
      categories,
    });

    setSaveMessage('✓ Allocation plan updated successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
    onRefresh();
  };

  // Activate current plan
  const handleActivatePlan = () => {
    AllocationService.setActivePlan(selectedPlanId);
    onRefresh();
  };

  // Create new plan
  const handleCreateNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;

    const created = AllocationService.createPlan({
      name: newPlanName.trim(),
      basis: 'salary_only',
      categories: [
        { id: generateUUID(), name: 'Savings & Investments', type: 'percentage', value: 70, color: '#A6D96A', is_savings: true },
        { id: generateUUID(), name: 'Personal Spending', type: 'percentage', value: 25, color: '#83A98A' },
        { id: generateUUID(), name: 'Sadaqah / Charity', type: 'percentage', value: 5, color: '#38BDF8', is_charity: true },
      ],
      setActive: true,
    });

    setIsCreatePlanOpen(false);
    setNewPlanName('');
    setSelectedPlanId(created.id);
    setPlanName(created.name);
    setPlanBasis(created.basis);
    setCategories(JSON.parse(JSON.stringify(created.categories)));
    onRefresh();
  };

  // Save Sadaqah settings
  const handleSaveSadaqah = () => {
    AllocationService.updateSadaqahSettings({
      type: sadaqahType,
      value: sadaqahType === 'percentage' ? sadaqahValue : Math.round(sadaqahFixedMajor * 100),
      monthly_target_minor: sadaqahType === 'fixed' ? Math.round(sadaqahFixedMajor * 100) : undefined,
      basis: sadaqahBasis,
    });
    alert('Sadaqah settings saved.');
    onRefresh();
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--color-accent)]" />
            Financial Goals & Income Allocation
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Designate target income distribution (financial targets, not automatic deductions)
          </p>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl bg-[#222C24] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Plan Selector & Actions */}
      <div className="bg-[var(--color-surface)] rounded-3xl p-4 border border-[var(--color-border)]  space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--color-text-primary)]">Active Plan Selection</span>
          <button
            onClick={() => setIsCreatePlanOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#222C24] hover:bg-[#2A342C] text-xs font-semibold text-[var(--color-accent)] border border-[var(--color-border)] tap-feedback"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Plan</span>
          </button>
        </div>

        {/* Plan Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {plans.map(p => {
            const isSelected = p.id === selectedPlanId;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPlan(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold border transition-all whitespace-nowrap tap-feedback ${
                  isSelected
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-[var(--color-accent)]  font-bold'
                    : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[#34383E]'
                }`}
              >
                <span>{p.name}</span>
                {p.is_active && (
                  <span className={`text-xs px-1 py-0.2 rounded font-bold  ${
                    isSelected ? 'bg-[var(--color-bg)] text-[var(--color-accent)]' : 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                  }`}>
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Plan Basis Switcher */}
        <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[var(--color-text-primary)]">Calculation Basis</span>
              <p className="text-xs text-[var(--color-text-secondary)]">Source income pool for percentage calculation</p>
            </div>
            <div className="flex bg-[#111214] p-0.5 rounded-xl border border-[#22252A]">
              <button
                onClick={() => setPlanBasis('salary_only')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  planBasis === 'salary_only'
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Salary Only
              </button>
              <button
                onClick={() => setPlanBasis('total_income')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  planBasis === 'total_income'
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Total Income
              </button>
            </div>
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            Current Basis Pool: <strong className="text-[var(--color-text-primary)]">{formatCurrency(distribution.totalBaseIncomeMinor, currencyLabel)}</strong>
          </div>
        </div>

        {/* 100% Visual Allocation Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-secondary)]">Allocation Total:</span>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${validation.isValid ? 'text-[var(--color-accent)]' : 'text-rose-400'}`}>
                {validation.totalPercent}%
              </span>
              <span className="text-[var(--color-text-muted)]">
                ({validation.remainingPercent}% unallocated)
              </span>
            </div>
          </div>

          {/* Visual Stacked Bar */}
          <div className="h-3 rounded-xl bg-[#111214] border border-[#22252A] p-0.5 flex overflow-hidden">
            {categories.map((c, idx) => {
              const widthPct = c.type === 'percentage' 
                ? c.value 
                : (distribution.totalBaseIncomeMinor > 0 ? (c.value / distribution.totalBaseIncomeMinor) * 100 : 0);
              return (
                <div
                  key={c.id || idx}
                  style={{ width: `${widthPct}%`, backgroundColor: c.color || '#A6D96A' }}
                  className="h-full transition-all"
                  title={`${c.name}: ${c.value}%`}
                />
              );
            })}
          </div>

          {!validation.isValid && (
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{validation.errorMessage}</span>
            </div>
          )}
        </div>

        {/* Categories Table / List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-text-primary)]">Category Allocations</span>
            <button
              onClick={() => setIsAddingCategory(true)}
              className="text-xs font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Category
            </button>
          </div>

          {/* Add Category Drawer */}
          {isAddingCategory && (
            <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-accent)]/40 space-y-2.5">
              <span className="text-xs font-bold text-[var(--color-text-primary)]">New Allocation Target</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Category Name"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="bg-[#111214] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none"
                />
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Value (%)"
                    value={newCatValue}
                    onChange={e => setNewCatValue(e.target.value)}
                    className="w-full bg-[#111214] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none"
                  />
                  <select
                    value={newCatType}
                    onChange={e => setNewCatType(e.target.value as any)}
                    className="bg-[#111214] border border-[var(--color-border)] rounded-xl px-2 text-xs text-[var(--color-accent)] font-bold"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">{currencyLabel}</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsAddingCategory(false)}
                  className="px-2.5 py-1 rounded-xl bg-[#222C24] text-xs font-semibold text-[var(--color-text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  className="px-3 py-1 rounded-xl bg-[var(--color-accent)] text-xs font-bold text-[var(--color-accent-contrast)]"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Existing Categories Editor */}
          <div className="space-y-2">
            {categories.map(cat => {
              const breakdownItem = distribution.breakdown.find(b => b.category.id === cat.id);
              return (
                <div 
                  key={cat.id}
                  className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: cat.color || '#A6D96A' }} 
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[var(--color-text-primary)] block truncate">
                        {cat.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        Planned: {formatCurrency(breakdownItem?.plannedAmountMinor || 0, currencyLabel)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#111214] border border-[var(--color-border)] rounded-xl px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={cat.value}
                        onChange={e => handleUpdateCategoryValue(cat.id, parseFloat(e.target.value) || 0)}
                        className="w-12 text-xs font-bold text-[var(--color-accent)] bg-transparent text-right focus:outline-none"
                      />
                      <span className="text-xs text-[var(--color-text-muted)] font-bold">
                        {cat.type === 'percentage' ? '%' : currencyLabel}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveCategory(cat.id)}
                      className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Remove category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {saveMessage && (
          <div className="p-2 rounded-xl bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-bold text-center border border-[var(--color-accent)]/30">
            {saveMessage}
          </div>
        )}

        {/* Save & Activate Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSavePlan}
            disabled={!validation.isValid}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all tap-feedback flex items-center justify-center gap-1.5 ${
              validation.isValid
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]  hover:brightness-105'
                : 'bg-[#222C24] text-[var(--color-text-muted)] cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Allocation Plan</span>
          </button>

          {!currentPlan.is_active && (
            <button
              onClick={handleActivatePlan}
              className="py-2.5 px-4 rounded-2xl bg-[#222C24] hover:bg-[#2A342C] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] transition-all tap-feedback"
            >
              Set as Active
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DEDICATED SADAQAH / CHARITY SETTINGS                  */}
      {/* ======================================================== */}
      <div className="bg-[var(--color-surface)] rounded-3xl p-4 border border-[var(--color-border)]  space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#222C24] text-[#38BDF8] border border-[var(--color-border)]">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">Sadaqah / Charity Allocation</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Dedicated spiritual allocation commitment</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Target Type */}
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-1">
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Target Model</label>
            <select
              value={sadaqahType}
              onChange={e => setSadaqahType(e.target.value as any)}
              className="w-full bg-[#111214] border border-[var(--color-border)] rounded-xl px-2.5 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Monthly ({currencyLabel})</option>
            </select>
          </div>

          {/* Value */}
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-1">
            <label className="text-xs font-bold text-[var(--color-text-muted)]">
              {sadaqahType === 'percentage' ? 'Percentage Allocation' : 'Fixed Monthly Target'}
            </label>
            {sadaqahType === 'percentage' ? (
              <div className="flex items-center bg-[#111214] border border-[var(--color-border)] rounded-xl px-2.5 py-1">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={sadaqahValue}
                  onChange={e => setSadaqahValue(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold text-[#38BDF8] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[var(--color-text-muted)]">%</span>
              </div>
            ) : (
              <div className="flex items-center bg-[#111214] border border-[var(--color-border)] rounded-xl px-2.5 py-1">
                <input
                  type="number"
                  value={sadaqahFixedMajor}
                  onChange={e => setSadaqahFixedMajor(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold text-[#38BDF8] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[var(--color-text-muted)]">{currencyLabel}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-[#111214] border border-[#22252A] flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)]">Estimated Monthly Target:</span>
          <span className="font-bold text-[#38BDF8]">
            {sadaqahType === 'percentage'
              ? formatCurrency(Math.round((distribution.totalBaseIncomeMinor * sadaqahValue) / 100), currencyLabel)
              : formatCurrency(Math.round(sadaqahFixedMajor * 100), currencyLabel)}
          </span>
        </div>

        <button
          onClick={handleSaveSadaqah}
          className="w-full py-2 rounded-2xl bg-[#222C24] hover:bg-[#2A342C] border border-[var(--color-border)] text-xs font-bold text-[#38BDF8] transition-all tap-feedback"
        >
          Save Sadaqah Configuration
        </button>
      </div>

      {/* Create New Plan Modal */}
      {isCreatePlanOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateNewPlan}
            className="w-full max-w-sm bg-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-border)] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Create Allocation Plan</h3>
              <button 
                type="button" 
                onClick={() => setIsCreatePlanOpen(false)}
                className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1">Plan Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Aggressive Savings or Low Spend Month"
                value={newPlanName}
                onChange={e => setNewPlanName(e.target.value)}
                className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatePlanOpen(false)}
                className="flex-1 py-2 rounded-2xl bg-[#222C24] text-xs font-semibold text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-2xl bg-[var(--color-accent)] text-xs font-bold text-[var(--color-accent-contrast)]"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
