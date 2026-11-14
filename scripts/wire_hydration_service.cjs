const fs = require('fs');

// 1. Create src/services/hydrationService.ts
const hydrationServiceCode = `// Daily Hydration & Water Intake Tracker Service
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
      ? \`🎉 Goal Met! \${(updated / 1000).toFixed(1)}L logged today\`
      : \`+\${ml}ml logged (\${(updated / 1000).toFixed(1)}L / \${(target / 1000).toFixed(1)}L)\`;

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
    return { amountMl: updated, message: \`-\${ml}ml updated (\${(updated / 1000).toFixed(1)}L)\` };
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
`;

fs.writeFileSync('src/services/hydrationService.ts', hydrationServiceCode, 'utf8');
console.log('Created src/services/hydrationService.ts');

// 2. Update src/services/storage.ts
let storageCode = fs.readFileSync('src/services/storage.ts', 'utf8');

storageCode = storageCode.replace(
  "  dailyProgressSettings: DailyProgressSettings;\n}",
  "  dailyProgressSettings: DailyProgressSettings;\n  hydrationLogs?: Record<string, number>;\n  dailyWaterTargetMl?: number;\n}"
);

storageCode = storageCode.replace(
  "        if (parsed.disciplineEntries === undefined) {\n          parsed.disciplineEntries = seed.disciplineEntries;\n        }",
  "        if (parsed.disciplineEntries === undefined) {\n          parsed.disciplineEntries = seed.disciplineEntries;\n        }\n        if (parsed.hydrationLogs === undefined) {\n          parsed.hydrationLogs = {};\n        }\n        if (parsed.dailyWaterTargetMl === undefined) {\n          parsed.dailyWaterTargetMl = 2500;\n        }"
);

fs.writeFileSync('src/services/storage.ts', storageCode, 'utf8');
console.log('Updated src/services/storage.ts with hydration fields');
