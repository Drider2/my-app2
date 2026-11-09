import { db, getTodayLocalDate, generateUUID } from './storage';
import { 
  DailyProgressBreakdown, 
  DailyProgressHistoryItem, 
  DailyProgressLevel, 
  DailyProgressSettings, 
  DisciplineEntry, 
  DisciplineStatus 
} from '../types';

export class DailyProgressService {
  public static getDefaultSettings(): DailyProgressSettings {
    return {
      daily_progress_enabled: true,
      prayers_enabled: true,
      prayers_weight: 5,
      spending_enabled: true,
      spending_weight: 2,
      daily_spending_allowance_minor: 50000, // 500 DA
      excluded_category_ids: [],
      discipline_enabled: true,
      discipline_weight: 3,
    };
  }

  public static getSettings(): DailyProgressSettings {
    const state = db.getState();
    const defaults = this.getDefaultSettings();
    if (!state.dailyProgressSettings) {
      return defaults;
    }
    return {
      ...defaults,
      ...state.dailyProgressSettings,
    };
  }

  public static updateSettings(updates: Partial<DailyProgressSettings>): DailyProgressSettings {
    let updated: DailyProgressSettings;
    db.updateState(state => {
      const current = state.dailyProgressSettings || this.getDefaultSettings();
      state.dailyProgressSettings = { ...current, ...updates };
      updated = state.dailyProgressSettings;
    });
    return updated!;
  }

  public static resetSettings(): DailyProgressSettings {
    const defaults = this.getDefaultSettings();
    db.updateState(state => {
      state.dailyProgressSettings = defaults;
    });
    return defaults;
  }

  public static getDailyProgress(dateStr: string = getTodayLocalDate()): DailyProgressBreakdown {
    const state = db.getState();
    const settings = this.getSettings();

    // 1. Daily Prayers Score
    const dayPrayers = (state.prayers || []).filter(p => p.local_date === dateStr && !p.deleted_at);
    const prayersTotal = 5;
    const prayersCompleted = dayPrayers.filter(p => p.completed).length;

    let prayersScore = 0;
    const prayersMax = settings.prayers_enabled ? settings.prayers_weight : 0;
    if (settings.prayers_enabled && prayersMax > 0) {
      const pointPerPrayer = prayersMax / 5;
      prayersScore = Math.round(prayersCompleted * pointPerPrayer * 10) / 10;
    }

    // 2. Financial Discipline Score
    // Exclude savings transfers, loans, and any user-configured excluded categories
    const excludedCats = new Set([
      'cat-savings',
      'cat-loans',
      ...(settings.excluded_category_ids || [])
    ]);

    const todayExpenses = (state.transactions || []).filter(t => 
      t.type === 'expense' &&
      t.local_date === dateStr &&
      !t.deleted_at &&
      !excludedCats.has(t.category_id || '') &&
      !t.note?.toLowerCase().includes('saving') &&
      !t.note?.toLowerCase().includes('loan')
    );

    const todaySpendingMinor = todayExpenses.reduce((sum, tx) => sum + (tx.amount_minor || 0), 0);
    const allowanceMinor = settings.daily_spending_allowance_minor;
    const isSpendingDisciplined = todaySpendingMinor <= allowanceMinor;

    const spendingMax = settings.spending_enabled ? settings.spending_weight : 0;
    const spendingScore = (settings.spending_enabled && isSpendingDisciplined) ? spendingMax : 0;

    // 3. Personal Discipline / NoFap Score
    const disciplineEntry = (state.disciplineEntries || []).find(e => e.local_date === dateStr && !e.deleted_at);
    const disciplineStatus: DisciplineStatus = disciplineEntry ? disciplineEntry.status : 'unrecorded';

    const disciplineMax = settings.discipline_enabled ? settings.discipline_weight : 0;
    const disciplineScore = (settings.discipline_enabled && disciplineStatus === 'maintained') ? disciplineMax : 0;

    // Total Score Calculation (capped at 10)
    const rawTotal = prayersScore + spendingScore + disciplineScore;
    const totalScore = Math.min(10, Math.max(0, Math.round(rawTotal * 10) / 10));

    // Level Determination
    let level: DailyProgressLevel = 'starting';
    let levelLabel = 'Starting';
    if (totalScore >= 10) {
      level = 'achieved';
      levelLabel = 'Daily Goal Achieved';
    } else if (totalScore >= 7) {
      level = 'strong';
      levelLabel = 'Strong Day';
    } else if (totalScore >= 4) {
      level = 'building';
      levelLabel = 'Building Momentum';
    } else {
      level = 'starting';
      levelLabel = 'Starting';
    }

    return {
      date: dateStr,
      total_score: totalScore,
      max_score: 10,
      level,
      level_label: levelLabel,
      prayers_score: prayersScore,
      prayers_max: prayersMax,
      prayers_completed: prayersCompleted,
      prayers_total: prayersTotal,
      spending_score: spendingScore,
      spending_max: spendingMax,
      today_spending_minor: todaySpendingMinor,
      spending_allowance_minor: allowanceMinor,
      is_spending_disciplined: isSpendingDisciplined,
      discipline_score: disciplineScore,
      discipline_max: disciplineMax,
      discipline_status: disciplineStatus,
    };
  }

  public static recordDisciplineCheckIn(
    status: 'maintained' | 'relapsed', 
    notes: string = '', 
    dateStr: string = getTodayLocalDate()
  ): DisciplineEntry {
    const now = Date.now();
    let entry: DisciplineEntry;

    db.updateState(state => {
      if (!state.disciplineEntries) {
        state.disciplineEntries = [];
      }
      const existingIdx = state.disciplineEntries.findIndex(e => e.local_date === dateStr && !e.deleted_at);
      if (existingIdx >= 0) {
        state.disciplineEntries[existingIdx].status = status;
        state.disciplineEntries[existingIdx].notes = notes;
        state.disciplineEntries[existingIdx].updated_at = now;
        entry = state.disciplineEntries[existingIdx];
      } else {
        entry = {
          id: `disc-${generateUUID()}`,
          local_date: dateStr,
          status,
          notes,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };
        state.disciplineEntries.push(entry);
      }
    });

    return entry!;
  }

  public static getHistory(daysCount: 7 | 30 | 90 = 7): {
    items: DailyProgressHistoryItem[];
    averageScore: number;
    weeklyAverage: number;
    monthlyAverage: number;
    perfectDaysCount: number;
    totalDays: number;
  } {
    const items: DailyProgressHistoryItem[] = [];
    let sumScore = 0;
    let perfectCount = 0;

    const todayDate = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const progress = this.getDailyProgress(dateStr);
      sumScore += progress.total_score;
      if (progress.total_score >= 10) {
        perfectCount++;
      }

      items.push({
        date: dateStr,
        total_score: progress.total_score,
        level: progress.level,
        prayers_score: progress.prayers_score,
        prayers_completed: progress.prayers_completed,
        spending_score: progress.spending_score,
        spending_amount_minor: progress.today_spending_minor,
        spending_disciplined: progress.is_spending_disciplined,
        discipline_score: progress.discipline_score,
        discipline_status: progress.discipline_status,
      });
    }

    const averageScore = daysCount > 0 ? Math.round((sumScore / daysCount) * 10) / 10 : 0;

    // Calculate weekly average (last 7 items)
    const last7 = items.slice(-7);
    const weeklyAverage = last7.length > 0 
      ? Math.round((last7.reduce((acc, curr) => acc + curr.total_score, 0) / last7.length) * 10) / 10 
      : 0;

    // Calculate monthly average (last 30 items)
    const last30 = items.slice(-30);
    const monthlyAverage = last30.length > 0 
      ? Math.round((last30.reduce((acc, curr) => acc + curr.total_score, 0) / last30.length) * 10) / 10 
      : 0;

    return {
      items,
      averageScore,
      weeklyAverage,
      monthlyAverage,
      perfectDaysCount: perfectCount,
      totalDays: daysCount,
    };
  }
}
