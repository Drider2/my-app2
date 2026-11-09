// Deterministic Rules & Notice Engine (Section 7.1 & 7.5)
import { db, generateUUID, getTodayLocalDate } from './storage';
import { AssistantNotice, NoticeSeverity, NoticeStatus } from '../types';

export const RulesEngine = {
  /**
   * Evaluates system state deterministically (offline, no AI needed).
   * Checks overdue tasks, budget alerts, maintenance due dates, vehicle mileage, and streaks.
   */
  evaluateAllRules(): AssistantNotice[] {
    const state = db.getState();
    const today = getTodayLocalDate();
    const generatedNotices: AssistantNotice[] = [];
    const now = Date.now();
    const currentYM = today.slice(0, 7);

    // 1. Check for overdue tasks
    const overdueTasks = (state.tasks || []).filter(t => !t.done && !t.deleted_at && t.due_date && t.due_date < today);
    for (const task of overdueTasks.slice(0, 3)) {
      generatedNotices.push({
        id: generateUUID(),
        rule_id: 'overdue_task',
        title: 'Overdue Task',
        message: `"${task.title}" was due on ${task.due_date}.`,
        severity: 'medium',
        status: 'new',
        related_ids: [task.id],
        options: [
          { label: 'Mark Done', action_type: 'complete_task', payload: { task_id: task.id } },
          { label: 'Reschedule Today', action_type: 'reschedule_task', payload: { task_id: task.id, new_date: today } },
          { label: 'Dismiss', action_type: 'dismiss_notice' },
        ],
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    }

    // 2. Check for budget warnings (>= 80% or exceeded)
    for (const cat of (state.categories || [])) {
      if (cat.deleted_at || cat.amount_minor <= 0) continue;
      const spent = (state.transactions || [])
        .filter(t => !t.deleted_at && t.type === 'expense' && t.category_id === cat.id && t.local_date.startsWith(currentYM))
        .reduce((sum, t) => sum + t.amount_minor, 0);

      const ratio = spent / cat.amount_minor;
      if (ratio >= 0.8) {
        const pct = Math.round(ratio * 100);
        const isExceeded = ratio >= 1.0;
        generatedNotices.push({
          id: generateUUID(),
          rule_id: 'budget_warning',
          title: isExceeded ? `Budget Exceeded: ${cat.name}` : `Budget Alert: ${cat.name} (${pct}%)`,
          message: `${cat.name} budget has reached ${pct}% of its allocation.`,
          severity: isExceeded ? 'high' : 'medium',
          status: 'new',
          related_ids: [cat.id],
          options: [
            { label: 'Review Transactions', action_type: 'view_category_transactions', payload: { category_id: cat.id } },
            { label: 'Dismiss', action_type: 'dismiss_notice' },
          ],
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
      }
    }

    // 3. Check for maintenance & vehicle service due
    for (const item of (state.maintenanceItems || [])) {
      if (item.deleted_at || item.is_purchased || item.status === 'completed') continue;

      const isDateDue = item.next_reminder_date <= today;
      const isMileageDue = item.category === 'car_maintenance' && 
        !!item.next_reminder_mileage_km && 
        !!item.current_odometer_km && 
        item.current_odometer_km >= item.next_reminder_mileage_km;

      if (isDateDue || isMileageDue) {
        const title = isMileageDue 
          ? `Vehicle Service Mileage Reached: ${item.name}` 
          : `Maintenance Due: ${item.name}`;
        const message = isMileageDue
          ? `${item.name} is due at ${item.next_reminder_mileage_km?.toLocaleString()} km (Current: ${item.current_odometer_km?.toLocaleString()} km).`
          : `${item.name} was scheduled for ${item.next_reminder_date}.`;

        generatedNotices.push({
          id: generateUUID(),
          rule_id: 'maintenance_due',
          title,
          message,
          severity: isMileageDue || item.priority === 'high' ? 'high' : 'medium',
          status: 'new',
          related_ids: [item.id],
          options: [
            { label: 'Mark Done', action_type: 'complete_maintenance', payload: { item_id: item.id } },
            { label: 'Dismiss', action_type: 'dismiss_notice' },
          ],
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
      }
    }

    // 4. Check for evening streak at risk (after 18:00)
    const currentHour = new Date().getHours();
    if (currentHour >= 18) {
      const todayPrayers = (state.prayers || []).filter(p => !p.deleted_at && p.local_date === today);
      const completedPrayers = todayPrayers.filter(p => p.completed).length;
      if (completedPrayers < 3 && todayPrayers.length > 0) {
        generatedNotices.push({
          id: generateUUID(),
          rule_id: 'streak_at_risk',
          title: 'Daily Progress & Prayers Reminder',
          message: `You have ${5 - completedPrayers} prayers pending today. Keep your daily progress score strong!`,
          severity: 'low',
          status: 'new',
          related_ids: ['daily_prayers'],
          options: [
            { label: 'View Prayers', action_type: 'view_prayers' },
            { label: 'Dismiss', action_type: 'dismiss_notice' },
          ],
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
      }
    }

    return generatedNotices;
  },

  /**
   * Helper to check if current time falls in user's quiet hours
   */
  isQuietHours(): boolean {
    const state = db.getState();
    const quietStart = state.settings?.quiet_hours_start || '22:00';
    const quietEnd = state.settings?.quiet_hours_end || '08:00';

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = quietStart.split(':').map(Number);
    const [endH, endM] = quietEnd.split(':').map(Number);
    const startMins = startH * 60 + (startM || 0);
    const endMins = endH * 60 + (endM || 0);

    if (startMins > endMins) {
      // Overnight quiet hours (e.g. 22:00 to 08:00)
      return currentMins >= startMins || currentMins < endMins;
    } else {
      return currentMins >= startMins && currentMins < endMins;
    }
  },

  /**
   * Deduplicates and synchronizes notices with state:
   * - Ignores duplicates if active notice exists for same rule and related id
   * - Re-awakens snoozed notices when snooze expires
   * - Prunes dismissed notices older than 7 days
   * - Enforces daily notice cap
   */
  synchronizeNotices(): { addedCount: number; prunedCount: number } {
    const state = db.getState();
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const dailyCap = state.settings?.daily_notice_cap || 5;

    const newCandidates = this.evaluateAllRules();
    let addedCount = 0;
    let prunedCount = 0;

    db.updateState(draft => {
      if (!draft.assistantNotices) draft.assistantNotices = [];

      // 1. Wake up expired snoozed notices
      for (const notice of draft.assistantNotices) {
        if (notice.status === 'snoozed' && notice.snooze_until && notice.snooze_until <= now) {
          notice.status = 'new';
          notice.snooze_until = null;
          notice.updated_at = now;
        }
      }

      // 2. Prune old dismissed notices
      const initialLen = draft.assistantNotices.length;
      draft.assistantNotices = draft.assistantNotices.filter(n => {
        if (n.status === 'dismissed' && n.updated_at < sevenDaysAgo) {
          return false;
        }
        return !n.deleted_at;
      });
      prunedCount = initialLen - draft.assistantNotices.length;

      // 3. Count today's active or seen notices towards daily cap
      const today = getTodayLocalDate();
      const todayNoticesCount = draft.assistantNotices.filter(n => 
        n.status !== 'dismissed' && n.created_at >= new Date(today).getTime()
      ).length;

      if (todayNoticesCount >= dailyCap) {
        return; // Daily cap reached
      }

      // 4. Add candidates if not duplicated
      for (const candidate of newCandidates) {
        const relatedKey = (candidate.related_ids || []).sort().join(',');
        const exists = draft.assistantNotices.some(n => 
          n.rule_id === candidate.rule_id &&
          (n.related_ids || []).sort().join(',') === relatedKey &&
          (n.status === 'new' || n.status === 'seen' || n.status === 'snoozed')
        );

        if (!exists) {
          draft.assistantNotices.unshift(candidate);
          addedCount++;
        }
      }
    });

    return { addedCount, prunedCount };
  }
};
