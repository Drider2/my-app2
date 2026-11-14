// Daily Hydration & Water Intake Tracker Service
import { db, getTodayLocalDate } from './storage';

export const HydrationService = {
  getDailyTarget(): number {
    const state = db.getState();
    return state.dailyWaterTargetMl || 2500;
  },

  setDailyTarget(targetMl: number): void {
    db.updateState(draft => {
      draft.dailyWaterTargetMl = Math.max(500, Math.min(10000, targetMl));
    });
  },

  getTodayIntake(dateStr?: string): {
    amountMl: number;
    targetMl: number;
    percentage: number;
    remainingMl: number;
    isMet: boolean;
  } {
    const targetDate = dateStr || getTodayLocalDate();
    const state = db.getState();
    const logs = state.hydrationLogs || {};
    const amountMl = logs[targetDate] || 0;
    const targetMl = state.dailyWaterTargetMl || 2500;
    const percentage = Math.min(100, Math.round((amountMl / Math.max(1, targetMl)) * 100));
    const remainingMl = Math.max(0, targetMl - amountMl);
    const isMet = amountMl >= targetMl;

    return { amountMl, targetMl, percentage, remainingMl, isMet };
  },

  addWater(ml: number, dateStr?: string): { amountMl: number; message: string } {
    const targetDate = dateStr || getTodayLocalDate();
    let updated = 0;
    db.updateState(draft => {
      if (!draft.hydrationLogs) draft.hydrationLogs = {};
      const current = draft.hydrationLogs[targetDate] || 0;
      updated = Math.max(0, current + ml);
      draft.hydrationLogs[targetDate] = updated;
    });

    const target = this.getDailyTarget();
    const isTargetMet = updated >= target;
    const msg = isTargetMet
      ? `🎉 Goal Met! ${(updated / 1000).toFixed(1)}L logged today`
      : `+${ml}ml logged (${(updated / 1000).toFixed(1)}L / ${(target / 1000).toFixed(1)}L)`;

    return { amountMl: updated, message: msg };
  },

  removeWater(ml: number, dateStr?: string): { amountMl: number; message: string } {
    const targetDate = dateStr || getTodayLocalDate();
    let updated = 0;
    db.updateState(draft => {
      if (!draft.hydrationLogs) draft.hydrationLogs = {};
      const current = draft.hydrationLogs[targetDate] || 0;
      updated = Math.max(0, current - ml);
      draft.hydrationLogs[targetDate] = updated;
    });
    return { amountMl: updated, message: `-${ml}ml updated (${(updated / 1000).toFixed(1)}L)` };
  },

  resetToday(dateStr?: string): void {
    const targetDate = dateStr || getTodayLocalDate();
    db.updateState(draft => {
      if (draft.hydrationLogs) {
        delete draft.hydrationLogs[targetDate];
      }
    });
  },

  getPast7DaysSummary(): { date: string; amountMl: number; targetMl: number; isMet: boolean }[] {
    const state = db.getState();
    const logs = state.hydrationLogs || {};
    const target = state.dailyWaterTargetMl || 2500;
    const result: { date: string; amountMl: number; targetMl: number; isMet: boolean }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const amountMl = logs[dateStr] || 0;
      result.push({
        date: dateStr,
        amountMl,
        targetMl: target,
        isMet: amountMl >= target,
      });
    }

    return result;
  }
};
