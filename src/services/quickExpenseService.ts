// Quick Daily Expenses Service (Section 2 Specification)
import { db, generateUUID, getTodayLocalDate } from './storage';
import { QuickExpenseShortcut, Transaction } from '../types';

let lastExecutionTimestamp = 0;
const DEBOUNCE_WINDOW_MS = 600;

export const QuickExpenseService = {
  /**
   * Retrieves all active quick expense shortcuts ordered by preference
   */
  getShortcuts(): QuickExpenseShortcut[] {
    const state = db.getState();
    return (state.quickExpenseShortcuts || [])
      .filter(s => !s.deleted_at)
      .sort((a, b) => a.order - b.order);
  },

  /**
   * Adds a new personalized expense shortcut
   */
  addShortcut(params: {
    name: string;
    amountMajor: number;
    categoryId?: string;
    icon?: string;
  }): QuickExpenseShortcut {
    const state = db.getState();
    const existing = (state.quickExpenseShortcuts || []).filter(s => !s.deleted_at);
    const now = Date.now();
    const newShortcut: QuickExpenseShortcut = {
      id: generateUUID(),
      name: params.name.trim(),
      amount_minor: Math.round(params.amountMajor * 100),
      category_id: params.categoryId || state.categories[0]?.id || null,
      icon: params.icon || 'CreditCard',
      order: existing.length + 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(draft => {
      if (!draft.quickExpenseShortcuts) draft.quickExpenseShortcuts = [];
      draft.quickExpenseShortcuts.push(newShortcut);
    });

    return newShortcut;
  },

  /**
   * Updates an existing shortcut's name, amount, or category
   * Crucial: Editing a shortcut NEVER modifies historical transactions!
   */
  updateShortcut(id: string, updates: {
    name?: string;
    amountMajor?: number;
    categoryId?: string;
    icon?: string;
  }): void {
    db.updateState(draft => {
      const shortcut = (draft.quickExpenseShortcuts || []).find(s => s.id === id);
      if (shortcut) {
        if (updates.name !== undefined) shortcut.name = updates.name.trim();
        if (updates.amountMajor !== undefined) shortcut.amount_minor = Math.round(updates.amountMajor * 100);
        if (updates.categoryId !== undefined) shortcut.category_id = updates.categoryId;
        if (updates.icon !== undefined) shortcut.icon = updates.icon;
        shortcut.updated_at = Date.now();
      }
    });
  },

  /**
   * Removes a shortcut
   */
  deleteShortcut(id: string): void {
    db.updateState(draft => {
      const shortcut = (draft.quickExpenseShortcuts || []).find(s => s.id === id);
      if (shortcut) {
        shortcut.deleted_at = Date.now();
      }
    });
  },

  /**
   * Reorders shortcuts
   */
  reorderShortcuts(orderedIds: string[]): void {
    db.updateState(draft => {
      orderedIds.forEach((id, index) => {
        const sc = (draft.quickExpenseShortcuts || []).find(s => s.id === id);
        if (sc) sc.order = index + 1;
      });
    });
  },

  /**
   * One-Tap Expense Execution:
   * Immediately records an actual expense transaction, updates spending statistics,
   * provides haptic feedback, and includes a debounce guard against duplicate double-taps.
   */
  executeQuickExpense(shortcutId: string): { success: boolean; transaction?: Transaction; message: string } {
    const now = Date.now();
    if (now - lastExecutionTimestamp < DEBOUNCE_WINDOW_MS) {
      return { success: false, message: 'Tap ignored to prevent accidental duplicate expense' };
    }
    lastExecutionTimestamp = now;

    const state = db.getState();
    const shortcut = (state.quickExpenseShortcuts || []).find(s => s.id === shortcutId && !s.deleted_at);
    if (!shortcut) {
      return { success: false, message: 'Shortcut not found' };
    }

    const today = getTodayLocalDate();
    const tx: Transaction = {
      id: generateUUID(),
      type: 'expense',
      amount_minor: shortcut.amount_minor,
      category_id: shortcut.category_id || state.categories[0]?.id || null,
      local_date: today,
      note: shortcut.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(draft => {
      draft.transactions.unshift(tx);
    });

    // Provide light tactile feedback if supported by browser/device
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {
      // safe fallback
    }

    const formatted = (shortcut.amount_minor / 100).toLocaleString();
    return {
      success: true,
      transaction: tx,
      message: `Recorded ${shortcut.name}: ${formatted} ${state.settings.currency_label}`,
    };
  },

  /**
   * Records a custom expense directly into Finance
   */
  executeCustomExpense(params: {
    name: string;
    amountMajor: number;
    categoryId?: string;
    date?: string;
    note?: string;
  }): Transaction {
    const now = Date.now();
    const state = db.getState();
    const amountMinor = Math.round(params.amountMajor * 100);
    const localDate = params.date || getTodayLocalDate();

    const tx: Transaction = {
      id: generateUUID(),
      type: 'expense',
      amount_minor: amountMinor,
      category_id: params.categoryId || state.categories[0]?.id || null,
      local_date: localDate,
      note: params.name.trim() + (params.note ? ` • ${params.note.trim()}` : ''),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(draft => {
      draft.transactions.unshift(tx);
    });

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {
      // safe fallback
    }

    return tx;
  },

  /**
   * Retrieves today's total spending and transactions for the Quick Expense summary card
   */
  getTodaySpendingSummary(): { totalMinor: number; transactions: Transaction[] } {
    const state = db.getState();
    const today = getTodayLocalDate();
    const todayExpenses = state.transactions.filter(
      t => !t.deleted_at && t.local_date === today && t.type === 'expense'
    );
    const totalMinor = todayExpenses.reduce((sum, t) => sum + t.amount_minor, 0);

    return {
      totalMinor,
      transactions: todayExpenses,
    };
  },
};
