// Personal Maintenance & Smart Recurring Expense Reminders Service
import { db, generateUUID, getTodayLocalDate } from './storage';
import { MaintenanceItem, RecurrenceType, Transaction } from '../types';

/**
 * Calculates the next due date based on completion date and recurrence rule
 */
export function calculateNextDueDate(
  fromDate: string,
  recurrenceType: RecurrenceType,
  intervalDaysOrMonths: number = 10
): string {
  const parts = fromDate.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  if (recurrenceType === 'days') {
    date.setDate(date.getDate() + (intervalDaysOrMonths || 1));
  } else if (recurrenceType === 'weeks') {
    date.setDate(date.getDate() + (intervalDaysOrMonths || 1) * 7);
  } else if (recurrenceType === 'months') {
    date.setMonth(date.getMonth() + (intervalDaysOrMonths || 1));
  } else {
    // For 'as_needed' or 'mileage', default to 30 days ahead if next cycle is required
    date.setDate(date.getDate() + 30);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates estimated monthly cost in minor units for a maintenance item
 * e.g. 600 DA every 10 days -> (600 / 10) * 30 = 1,800 DA/month
 */
export function calculateItemMonthlyEstimate(item: MaintenanceItem): number {
  if (item.category === 'shopping' && item.recurrence_type === 'as_needed') {
    return 0; // One-off shopping items don't have recurring monthly amortization
  }

  const cost = item.estimated_cost_minor;
  const interval = item.recurrence_interval || 1;

  switch (item.recurrence_type) {
    case 'days':
      return Math.round((cost / Math.max(1, interval)) * 30);
    case 'weeks':
      return Math.round((cost / Math.max(1, interval * 7)) * 30);
    case 'months':
      return Math.round(cost / Math.max(1, interval));
    case 'mileage':
      // Approximate 90 days per oil change/service interval if mileage used
      return Math.round(cost / 3);
    default:
      return 0;
  }
}

/**
 * Calculates total monthly estimates aggregated by category and overall
 */
export function calculateMaintenanceSummary(items: MaintenanceItem[]): {
  totalMonthlyMinor: number;
  personalCareMonthlyMinor: number;
  carMonthlyMinor: number;
  shoppingPendingMinor: number;
  upcomingCount: number;
  dueCount: number;
} {
  const today = getTodayLocalDate();
  let totalMonthlyMinor = 0;
  let personalCareMonthlyMinor = 0;
  let carMonthlyMinor = 0;
  let shoppingPendingMinor = 0;
  let upcomingCount = 0;
  let dueCount = 0;

  for (const item of items) {
    if (item.deleted_at) continue;

    const monthly = calculateItemMonthlyEstimate(item);
    totalMonthlyMinor += monthly;

    if (item.category === 'personal_care') {
      personalCareMonthlyMinor += monthly;
    } else if (item.category === 'car_maintenance') {
      carMonthlyMinor += monthly;
    } else if (item.category === 'shopping' && !item.is_purchased) {
      shoppingPendingMinor += item.estimated_cost_minor;
    }

    if (!item.is_purchased && item.status !== 'completed') {
      if (item.next_reminder_date <= today) {
        dueCount++;
      } else {
        upcomingCount++;
      }
    }
  }

  return {
    totalMonthlyMinor,
    personalCareMonthlyMinor,
    carMonthlyMinor,
    shoppingPendingMinor,
    upcomingCount,
    dueCount,
  };
}

/**
 * Returns human-readable relative due status and urgency
 */
export function getItemDueStatus(item: MaintenanceItem): {
  badgeText: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isSoon: boolean;
  daysDiff: number;
} {
  const today = getTodayLocalDate();
  if (item.is_purchased || item.status === 'completed') {
    return {
      badgeText: 'Completed',
      isOverdue: false,
      isDueToday: false,
      isSoon: false,
      daysDiff: 999,
    };
  }

  const todayDate = new Date(today).getTime();
  const dueDate = new Date(item.next_reminder_date).getTime();
  const diffDays = Math.round((dueDate - todayDate) / 86400000);

  if (diffDays < 0) {
    return {
      badgeText: `${Math.abs(diffDays)}d overdue`,
      isOverdue: true,
      isDueToday: false,
      isSoon: false,
      daysDiff: diffDays,
    };
  } else if (diffDays === 0) {
    return {
      badgeText: 'Due today',
      isOverdue: false,
      isDueToday: true,
      isSoon: true,
      daysDiff: 0,
    };
  } else if (diffDays <= 3) {
    return {
      badgeText: `In ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      isOverdue: false,
      isDueToday: false,
      isSoon: true,
      daysDiff: diffDays,
    };
  } else {
    return {
      badgeText: `In ${diffDays} days`,
      isOverdue: false,
      isDueToday: false,
      isSoon: false,
      daysDiff: diffDays,
    };
  }
}

/**
 * Completes a maintenance item, advances the next recurrence date,
 * and optionally records the actual expense in Finance (with duplicate prevention).
 */
export function completeMaintenanceItem(params: {
  itemId: string;
  completionDate?: string;
  actualCostMinor: number;
  recordInFinance: boolean;
  newOdometerKm?: number;
  notes?: string;
}): { success: boolean; createdTransaction?: Transaction; message: string } {
  const state = db.getState();
  const item = state.maintenanceItems.find(i => i.id === params.itemId);
  if (!item) {
    return { success: false, message: 'Item not found' };
  }

  const completionDate = params.completionDate || getTodayLocalDate();
  let createdTransaction: Transaction | undefined;

  // 1. Finance Integration (with duplicate detection)
  if (params.recordInFinance && params.actualCostMinor > 0) {
    // Check if an expense with the exact same note/date/amount already exists today
    const categoryTag = item.category === 'personal_care' ? 'Personal Care' : item.category === 'car_maintenance' ? 'Car' : 'Shopping';
    const transactionNote = `${item.name} (${categoryTag})`;

    const isDuplicate = state.transactions.some(t => 
      !t.deleted_at &&
      t.local_date === completionDate &&
      t.amount_minor === params.actualCostMinor &&
      t.note === transactionNote
    );

    if (!isDuplicate) {
      // Find matching category or fallback
      let categoryId = item.finance_category_id;
      if (!categoryId) {
        const found = state.categories.find(c => 
          c.name.toLowerCase().includes(item.category === 'car_maintenance' ? 'car' : 'health') ||
          c.name.toLowerCase().includes('dining')
        );
        categoryId = found ? found.id : state.categories[0]?.id || 'cat-personal';
      }

      createdTransaction = {
        id: generateUUID(),
        type: 'expense',
        amount_minor: params.actualCostMinor,
        category_id: categoryId,
        local_date: completionDate,
        note: transactionNote,
        maintenance_item_id: item.id,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      };
    }
  }

  // 2. Advance Next Due Date and update item
  db.updateState(draft => {
    const target = draft.maintenanceItems.find(i => i.id === params.itemId);
    if (!target) return;

    target.last_service_date = completionDate;
    target.actual_cost_minor = params.actualCostMinor;
    target.updated_at = Date.now();

    if (params.newOdometerKm && target.category === 'car_maintenance') {
      target.current_odometer_km = params.newOdometerKm;
      // Advance mileage by configured interval (e.g. +7,500 km or +10,000 km)
      const interval = (target.recurrence_interval && target.recurrence_interval > 0)
        ? target.recurrence_interval
        : 7500;
      target.next_reminder_mileage_km = params.newOdometerKm + interval;
    }

    if (params.notes) {
      target.notes = params.notes;
    }

    if (target.recurrence_type === 'as_needed') {
      target.is_purchased = true;
      target.status = 'completed';
    } else {
      // Advance next reminder date based on frequency
      target.next_reminder_date = calculateNextDueDate(
        completionDate,
        target.recurrence_type,
        target.recurrence_interval || 10
      );
      target.status = 'upcoming';
      target.is_purchased = false;
    }

    if (createdTransaction) {
      draft.transactions.unshift(createdTransaction);
    }
  });

  return {
    success: true,
    createdTransaction,
    message: createdTransaction 
      ? `Completed! Recorded expense in Finance: ${item.name}` 
      : `Completed! Next due date updated to next cycle.`,
  };
}

/**
 * Adds a new maintenance or shopping reminder
 */
export function addMaintenanceItem(itemData: Omit<MaintenanceItem, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): MaintenanceItem {
  const now = Date.now();
  const newItem: MaintenanceItem = {
    ...itemData,
    id: generateUUID(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  db.updateState(draft => {
    draft.maintenanceItems.unshift(newItem);
  });

  return newItem;
}

/**
 * Updates an existing maintenance item
 */
export function updateMaintenanceItem(itemId: string, updates: Partial<MaintenanceItem>): MaintenanceItem | null {
  let updated: MaintenanceItem | null = null;
  db.updateState(draft => {
    const item = draft.maintenanceItems.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates, { updated_at: Date.now() });
      updated = item;
    }
  });
  return updated;
}

/**
 * Soft deletes a maintenance item
 */
export function deleteMaintenanceItem(itemId: string): boolean {
  let deleted = false;
  db.updateState(draft => {
    const item = draft.maintenanceItems.find(i => i.id === itemId);
    if (item) {
      item.deleted_at = Date.now();
      deleted = true;
    }
  });
  return deleted;
}

/**
 * Updates the vehicle odometer across all car maintenance items
 */
export function updateCarOdometer(newOdometerKm: number): { updatedCount: number; message: string } {
  let count = 0;
  db.updateState(draft => {
    for (const item of (draft.maintenanceItems || [])) {
      if (item.category === 'car_maintenance' && !item.deleted_at) {
        item.current_odometer_km = newOdometerKm;
        item.updated_at = Date.now();
        count++;
      }
    }
  });
  return {
    updatedCount: count,
    message: `Vehicle odometer updated to ${newOdometerKm.toLocaleString()} km across ${count} service trackers.`,
  };
}

/**
 * Exports all active maintenance items and service records as clean CSV
 */
export function exportMaintenanceHistoryCsv(): string {
  const state = db.getState();
  const items = (state.maintenanceItems || []).filter(i => !i.deleted_at);

  const headers = [
    'Category',
    'Item Name',
    'Status',
    'Priority',
    'Last Service Date',
    'Cost (DA)',
    'Current Odometer (km)',
    'Next Reminder Date',
    'Next Service Mileage (km)',
    'Interval',
    'Notes'
  ];

  const rows = items.map(i => {
    const costMajor = Math.round((i.actual_cost_minor || i.estimated_cost_minor || 0) / 100);
    const intervalStr = i.recurrence_type === 'days' ? `${i.recurrence_interval || 10} days` :
                        i.recurrence_type === 'weeks' ? `${i.recurrence_interval || 1} weeks` :
                        i.recurrence_type === 'months' ? `${i.recurrence_interval || 1} months` :
                        i.recurrence_type === 'mileage' ? `${i.recurrence_interval || 7500} km` : 'As needed';
    const sanitize = (str: string | undefined) => `"${(str || '').replace(/"/g, '""')}"`;

    return [
      sanitize(i.category),
      sanitize(i.name),
      sanitize(i.status),
      sanitize(i.priority),
      i.last_service_date || '',
      costMajor,
      i.current_odometer_km || '',
      i.next_reminder_date || '',
      i.next_reminder_mileage_km || '',
      sanitize(intervalStr),
      sanitize(i.notes || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates an executive Markdown audit report of vehicle maintenance & care schedules
 */
export function exportMaintenanceHistoryMd(): string {
  const state = db.getState();
  const items = (state.maintenanceItems || []).filter(i => !i.deleted_at);
  const today = getTodayLocalDate();

  const carItems = items.filter(i => i.category === 'car_maintenance');
  const personalItems = items.filter(i => i.category === 'personal_care');
  const shoppingItems = items.filter(i => i.category === 'shopping');

  const currentKm = carItems.find(i => i.current_odometer_km)?.current_odometer_km || 142500;

  let md = `# Vehicle Maintenance & Care Audit Report\n\n`;
  md += `**Generated:** ${today}  \n`;
  md += `**Vehicle Current Odometer:** ${currentKm.toLocaleString()} km  \n`;
  md += `**Active Care Trackers:** ${items.length} items\n\n`;
  md += `---\n\n`;

  md += `## 1. Vehicle Care & Service Schedule\n\n`;
  if (carItems.length === 0) {
    md += `*No vehicle maintenance items configured.*\n\n`;
  } else {
    md += `| Service Item | Priority | Last Service | Cost (DA) | Target Mileage | Remaining | Next Date | Notes |\n`;
    md += `|:-------------|:---------|:-------------|:----------|:---------------|:----------|:----------|:------|\n`;
    for (const c of carItems) {
      const cost = Math.round((c.actual_cost_minor || c.estimated_cost_minor) / 100);
      const targetKm = c.next_reminder_mileage_km ? `${c.next_reminder_mileage_km.toLocaleString()} km` : '—';
      const remKm = c.next_reminder_mileage_km && c.current_odometer_km
        ? (c.next_reminder_mileage_km - c.current_odometer_km)
        : null;
      const remStr = remKm !== null ? (remKm <= 0 ? '**DUE NOW**' : `${remKm.toLocaleString()} km`) : '—';
      md += `| ${c.name} | ${c.priority || 'medium'} | ${c.last_service_date || '—'} | ${cost.toLocaleString()} DA | ${targetKm} | ${remStr} | ${c.next_reminder_date || '—'} | ${c.notes || '—'} |\n`;
    }
    md += `\n`;
  }

  md += `## 2. Personal Care & Grooming Cycles\n\n`;
  if (personalItems.length === 0) {
    md += `*No personal care items configured.*\n\n`;
  } else {
    md += `| Care Item | Frequency | Cost (DA) | Last Done | Next Due | Notes |\n`;
    md += `|:----------|:----------|:----------|:----------|:---------|:------|\n`;
    for (const p of personalItems) {
      const cost = Math.round((p.actual_cost_minor || p.estimated_cost_minor) / 100);
      const freq = `Every ${p.recurrence_interval || 10} ${p.recurrence_type}`;
      md += `| ${p.name} | ${freq} | ${cost.toLocaleString()} DA | ${p.last_service_date || '—'} | ${p.next_reminder_date || '—'} | ${p.notes || '—'} |\n`;
    }
    md += `\n`;
  }

  md += `## 3. Recurring Shopping & Upkeep Items\n\n`;
  if (shoppingItems.length === 0) {
    md += `*No shopping items configured.*\n\n`;
  } else {
    md += `| Item | Est. Cost (DA) | Status | Notes |\n`;
    md += `|:-----|:---------------|:-------|:------|\n`;
    for (const s of shoppingItems) {
      const cost = Math.round(s.estimated_cost_minor / 100);
      const status = s.is_purchased ? 'Purchased' : 'Pending';
      md += `| ${s.name} | ${cost.toLocaleString()} DA | ${status} | ${s.notes || '—'} |\n`;
    }
    md += `\n`;
  }

  return md;
}
