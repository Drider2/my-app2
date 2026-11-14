import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  Plus, 
  Calendar, 
  DollarSign, 
  Check, 
  Trash2, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  CreditCard,
  Zap,
  Film,
  Dumbbell,
  Wifi,
  Smartphone
} from 'lucide-react';
import { db, generateUUID, getTodayLocalDate, formatCurrency } from '../../services/storage';
import { RecurringRule, Category, Transaction } from '../../types';
import { parseLocalDate, addCalendarDays } from '../../services/moneyDerivedStats';

interface RecurringSubscriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onShowToast: (msg: string) => void;
}

export const RecurringSubscriptionsModal: React.FC<RecurringSubscriptionsModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const [localVersion, setLocalVersion] = useState(0);
  const state = db.getState();
  const today = getTodayLocalDate();
  const currency = state.settings.currency_label || 'DA';

  const [isAdding, setIsAdding] = useState(false);
  const [note, setNote] = useState('');
  const [amountMajor, setAmountMajor] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>(state.categories[0]?.id || 'cat-bills');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly' | 'daily'>('monthly');
  const [nextDate, setNextDate] = useState<string>(today);

  // Active recurring rules
  const rules = (state.recurringRules || []).filter(r => !r.deleted_at);

  // Calculate monthly total commitment
  const monthlyTotalMinor = rules.reduce((acc, rule) => {
    if (rule.type !== 'expense') return acc;
    if (rule.frequency === 'monthly') return acc + rule.amount_minor;
    if (rule.frequency === 'weekly') return acc + Math.round(rule.amount_minor * 4.33);
    if (rule.frequency === 'yearly') return acc + Math.round(rule.amount_minor / 12);
    if (rule.frequency === 'daily') return acc + rule.amount_minor * 30;
    return acc + rule.amount_minor;
  }, 0);

  // Compute days until due for a date string YYYY-MM-DD
  const getDaysDiff = (dateStr: string) => {
    const p1 = parseLocalDate(today);
    const p2 = parseLocalDate(dateStr);
    const d1 = new Date(p1.year, p1.month - 1, p1.day);
    const d2 = new Date(p2.year, p2.month - 1, p2.day);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper to advance date by frequency
  const calculateNextDueDate = (currentDateStr: string, freq: 'monthly' | 'weekly' | 'yearly' | 'daily'): string => {
    const p = parseLocalDate(currentDateStr);
    if (freq === 'daily') {
      return addCalendarDays(currentDateStr, 1);
    }
    if (freq === 'weekly') {
      return addCalendarDays(currentDateStr, 7);
    }
    if (freq === 'yearly') {
      return `${p.year + 1}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
    }
    // Monthly
    let newYear = p.year;
    let newMonth = p.month + 1;
    if (newMonth > 12) {
      newYear += 1;
      newMonth = 1;
    }
    const daysInNewMonth = new Date(newYear, newMonth, 0).getDate();
    const clampedDay = Math.min(p.day, daysInNewMonth);
    return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
  };

  // Mark as Paid
  const handleMarkAsPaid = (rule: RecurringRule) => {
    const nextDue = calculateNextDueDate(rule.next_date, rule.frequency);
    const tx: Transaction = {
      id: generateUUID(),
      type: 'expense',
      amount_minor: rule.amount_minor,
      local_date: today,
      category_id: rule.category_id || 'cat-bills',
      note: rule.note ? `[Subscription] ${rule.note}` : 'Recurring Subscription Payment',
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(s => {
      // 1. Post transaction
      s.transactions.unshift(tx);
      // 2. Advance recurring rule due date
      const targetRule = s.recurringRules.find(r => r.id === rule.id);
      if (targetRule) {
        targetRule.next_date = nextDue;
        targetRule.updated_at = Date.now();
      }
    });

    onShowToast(`✓ Logged payment for "${rule.note || 'Subscription'}" (${formatCurrency(rule.amount_minor, currency)}). Next due: ${nextDue}`);
    setLocalVersion(v => v + 1);
  };

  // Delete rule
  const handleDeleteRule = (ruleId: string, ruleName?: string) => {
    if (confirm(`Remove subscription "${ruleName || 'Recurring bill'}"?`)) {
      db.updateState(s => {
        const target = s.recurringRules.find(r => r.id === ruleId);
        if (target) {
          target.deleted_at = Date.now();
          target.updated_at = Date.now();
        }
      });
      onShowToast('Subscription removed');
      setLocalVersion(v => v + 1);
    }
  };

  // Quick preset helper
  const applyPreset = (presetName: string, presetAmount: number, presetCat: string, presetFreq: 'monthly' | 'weekly') => {
    setNote(presetName);
    setAmountMajor(presetAmount.toString());
    setCategoryId(presetCat);
    setFrequency(presetFreq);
  };

  // Submit new rule
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountMajor);
    if (!note.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newRule: RecurringRule = {
      id: generateUUID(),
      type: 'expense',
      amount_minor: Math.round(parsedAmount * 100),
      category_id: categoryId,
      frequency,
      next_date: nextDate || today,
      note: note.trim(),
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(s => {
      if (!s.recurringRules) s.recurringRules = [];
      s.recurringRules.push(newRule);
    });

    onShowToast(`✓ Added recurring bill "${note.trim()}"`);
    setIsAdding(false);
    setNote('');
    setAmountMajor('');
    setLocalVersion(v => v + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-[var(--surface)] border border-[var(--hairline)] shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hairline)] bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <RotateCcw className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-1)]">Recurring Subscriptions & Bills</h2>
              <p className="text-[11px] text-[var(--text-3)]">Automated commitments, renewal countdowns & instant settlement</p>
            </div>
          </div>
          <button
            onClick={() => { onRefresh(); onClose(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-subtle)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
          {/* Summary Hero Card */}
          <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--hairline)] flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider block">Estimated Monthly Burn</span>
              <span className="text-xl font-extrabold text-cyan-400 tabular-nums">
                {formatCurrency(monthlyTotalMinor, currency)}
              </span>
              <span className="text-[11px] text-[var(--text-3)] ms-1.5 font-normal">/ month</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {rules.length} {rules.length === 1 ? 'Subscription' : 'Subscriptions'}
              </span>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add New</span>
                </button>
              )}
            </div>
          </div>

          {/* New Subscription Form (Accordion/Collapsible) */}
          {isAdding && (
            <form onSubmit={handleAddSubmit} className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-cyan-500/30 space-y-3 animate-slide-down">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--hairline)]">
                <span className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  New Recurring Subscription or Bill
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-[11px] text-[var(--text-3)] hover:text-[var(--text-1)]"
                >
                  Cancel
                </button>
              </div>

              {/* 1-Click Preset Shortcuts */}
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--text-3)] uppercase font-semibold">Quick Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset('Netflix Streaming', 1500, 'cat-entertainment', 'monthly')}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-[var(--bg)] border border-[var(--hairline)] text-[var(--text-2)] hover:border-cyan-500/40 hover:text-cyan-400 flex items-center gap-1"
                  >
                    <Film className="w-3 h-3 text-red-400" />
                    <span>Netflix (1,500 DA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('Fibre / 4G Internet', 3000, 'cat-bills', 'monthly')}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-[var(--bg)] border border-[var(--hairline)] text-[var(--text-2)] hover:border-cyan-500/40 hover:text-cyan-400 flex items-center gap-1"
                  >
                    <Wifi className="w-3 h-3 text-blue-400" />
                    <span>Internet (3,000 DA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('Gym Membership', 3500, 'cat-gym', 'monthly')}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-[var(--bg)] border border-[var(--hairline)] text-[var(--text-2)] hover:border-cyan-500/40 hover:text-cyan-400 flex items-center gap-1"
                  >
                    <Dumbbell className="w-3 h-3 text-green-400" />
                    <span>Gym (3,500 DA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('Electricity & Gas (Sonelgaz)', 4000, 'cat-bills', 'monthly')}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-[var(--bg)] border border-[var(--hairline)] text-[var(--text-2)] hover:border-cyan-500/40 hover:text-cyan-400 flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Utilities (4,000 DA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('Mobile Plan & 4G', 1200, 'cat-bills', 'monthly')}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-[var(--bg)] border border-[var(--hairline)] text-[var(--text-2)] hover:border-cyan-500/40 hover:text-cyan-400 flex items-center gap-1"
                  >
                    <Smartphone className="w-3 h-3 text-purple-400" />
                    <span>Mobile (1,200 DA)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-3)] block mb-1">Service / Bill Name *</label>
                  <input
                    type="text"
                    required
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Netflix, Gym, Internet"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-3)] block mb-1">Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    value={amountMajor}
                    onChange={e => setAmountMajor(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-cyan-400 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-3)] block mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-cyan-400"
                  >
                    {state.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-3)] block mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-cyan-400 capitalize"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-3)] block mb-1">Next Due Date</label>
                  <input
                    type="date"
                    required
                    value={nextDate}
                    onChange={e => setNextDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--hairline)] text-xs text-[var(--text-2)] hover:text-[var(--text-1)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-colors shadow-sm"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          )}

          {/* Subscriptions List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--text-2)] block px-1">Active Commitments</span>
            {rules.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[var(--bg)] border border-[var(--hairline)] space-y-2">
                <CreditCard className="w-8 h-8 text-[var(--text-3)] mx-auto opacity-50" />
                <p className="text-xs font-semibold text-[var(--text-2)]">No recurring bills or subscriptions configured</p>
                <p className="text-[11px] text-[var(--text-3)] max-w-sm mx-auto">
                  Keep your regular commitments organized (Internet, Netflix, Gym, Electricity) to keep your forecasted runway 100% accurate.
                </p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--hairline)] text-xs font-semibold text-cyan-400 hover:border-cyan-500/40 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Subscription</span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-[var(--bg)] border border-[var(--hairline)] divide-y divide-[var(--hairline)] overflow-hidden">
                {rules.map(rule => {
                  const daysDiff = getDaysDiff(rule.next_date);
                  const isOverdue = daysDiff < 0;
                  const isToday = daysDiff === 0;
                  const cat = state.categories.find(c => c.id === rule.category_id);

                  return (
                    <div key={rule.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: cat?.color || 'var(--accent)' }}
                          title={cat?.name || 'General'}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[var(--text-1)] truncate">
                              {rule.note || 'Subscription'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--surface-subtle)] border border-[var(--hairline)] text-[var(--text-3)] capitalize">
                              {rule.frequency}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)] mt-0.5">
                            <span>{cat?.name || 'Bills & Utilities'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[var(--text-3)]" />
                              {rule.next_date}
                            </span>
                            <span>•</span>
                            <span className={`font-semibold ${
                              isOverdue ? 'text-red-400' : isToday ? 'text-amber-400 font-bold' : 'text-cyan-400'
                            }`}>
                              {isOverdue 
                                ? `Overdue by ${Math.abs(daysDiff)}d` 
                                : isToday 
                                  ? 'Due today!' 
                                  : `Due in ${daysDiff}d`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2.5 ms-auto">
                        <span className="text-xs font-bold text-[var(--text-1)] tabular-nums">
                          {formatCurrency(rule.amount_minor, currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMarkAsPaid(rule)}
                          className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition-colors tap-feedback"
                          title="Record transaction & advance to next period"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Pay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id, rule.note)}
                          className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete subscription"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--hairline)] bg-[var(--surface-subtle)] flex items-center justify-between text-[11px] text-[var(--text-3)]">
          <span>Settlements immediately update Ledger & Cash Runway</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] hover:border-[var(--text-2)] text-[var(--text-1)] font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
