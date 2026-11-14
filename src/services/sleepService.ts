import { db, generateUUID, getTodayLocalDate } from './storage';
import { SleepEntry } from '../types';

export interface SleepStats {
  averageHours: number;
  targetHours: number;
  sleepDebtHours: number;
  averageQuality: number;
  loggedDaysCount: number;
  recentEntries: SleepEntry[];
  qualityDistribution: Record<number, number>;
}

export class SleepService {
  static DEFAULT_TARGET_HOURS = 8.0;

  static calculateDurationMinutes(bedtime: string, wakeTime: string): number {
    const [bH, bM] = (bedtime || '23:00').split(':').map(Number);
    const [wH, wM] = (wakeTime || '07:00').split(':').map(Number);

    const bTotal = bH * 60 + bM;
    const wTotal = wH * 60 + wM;

    let diff = wTotal - bTotal;
    if (diff <= 0) {
      diff += 24 * 60; // Crosses midnight
    }

    return Math.max(0, diff);
  }

  static formatMinutesToHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }

  static getQualityInfo(score: number): { label: string; icon: string; color: string } {
    switch (score) {
      case 5:
        return { label: 'Optimal / Restored', icon: '⚡', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
      case 4:
        return { label: 'Deep & Restful', icon: '😴', color: 'text-teal-400 bg-teal-500/15 border-teal-500/30' };
      case 3:
        return { label: 'Fair / Neutral', icon: '😐', color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' };
      case 2:
        return { label: 'Fragmented', icon: '🥱', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
      default:
        return { label: 'Restless / Poor', icon: '😫', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
    }
  }

  static recordSleep(params: {
    local_date?: string;
    bedtime: string;
    wake_time: string;
    quality_score: number;
    notes?: string;
  }): SleepEntry {
    const today = params.local_date || getTodayLocalDate();
    const durationMinutes = this.calculateDurationMinutes(params.bedtime, params.wake_time);

    const newEntry: SleepEntry = {
      id: generateUUID(),
      local_date: today,
      bedtime: params.bedtime,
      wake_time: params.wake_time,
      duration_minutes: durationMinutes,
      quality_score: Math.min(5, Math.max(1, params.quality_score)),
      notes: params.notes?.trim() || undefined,
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(state => {
      if (!state.sleepEntries) state.sleepEntries = [];
      // Replace existing entry for this local_date if present, or prepend
      const existingIdx = state.sleepEntries.findIndex(s => s.local_date === today && !s.deleted_at);
      if (existingIdx >= 0) {
        state.sleepEntries[existingIdx] = newEntry;
      } else {
        state.sleepEntries.unshift(newEntry);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('greendream_state_updated'));
    }

    return newEntry;
  }

  static getSleepStats(daysWindow: number = 7): SleepStats {
    const state = db.getState();
    const all = (state.sleepEntries || [])
      .filter(s => !s.deleted_at)
      .sort((a, b) => b.local_date.localeCompare(a.local_date));

    const recent = all.slice(0, daysWindow);
    const targetHours = this.DEFAULT_TARGET_HOURS;

    if (recent.length === 0) {
      return {
        averageHours: 0,
        targetHours,
        sleepDebtHours: 0,
        averageQuality: 0,
        loggedDaysCount: 0,
        recentEntries: [],
        qualityDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalMinutes = recent.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const averageMinutes = totalMinutes / recent.length;
    const averageHours = Number((averageMinutes / 60).toFixed(1));

    // Expected minutes vs actual
    const expectedMinutes = recent.length * (targetHours * 60);
    const debtMinutes = expectedMinutes - totalMinutes;
    const sleepDebtHours = Number((debtMinutes / 60).toFixed(1));

    const totalQuality = recent.reduce((sum, s) => sum + (s.quality_score || 3), 0);
    const averageQuality = Number((totalQuality / recent.length).toFixed(1));

    const qualityDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    recent.forEach(s => {
      const q = s.quality_score || 3;
      qualityDistribution[q] = (qualityDistribution[q] || 0) + 1;
    });

    return {
      averageHours,
      targetHours,
      sleepDebtHours,
      averageQuality,
      loggedDaysCount: recent.length,
      recentEntries: recent,
      qualityDistribution,
    };
  }

  static generateCSV(): string {
    const state = db.getState();
    const entries = (state.sleepEntries || [])
      .filter(s => !s.deleted_at)
      .sort((a, b) => b.local_date.localeCompare(a.local_date));

    const headers = ['Date', 'Bedtime', 'Wake Time', 'Duration Hours', 'Duration Minutes', 'Quality Score', 'Quality Label', 'Notes'];
    const rows = entries.map(s => {
      const hours = (s.duration_minutes / 60).toFixed(1);
      const q = this.getQualityInfo(s.quality_score);
      return [
        s.local_date,
        s.bedtime,
        s.wake_time,
        hours,
        s.duration_minutes,
        s.quality_score,
        q.label,
        `"${(s.notes || '').replace(/"/g, '""')}"`
      ];
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
