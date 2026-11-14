import { db, generateUUID, getTodayLocalDate } from './storage';
import { FastingDayEntry, FastingType, IntermittentProtocol, ActiveFastingSession } from '../types';

export interface FastingCountdown {
  isFastingNow: boolean;
  targetLabel: string;
  hours: number;
  minutes: number;
  seconds: number;
  progressPercent: number;
  fajrTimeStr: string;
  maghribTimeStr: string;
}

export const FASTING_TYPE_LABELS: Record<FastingType, { label: string; icon: string; color: string }> = {
  ramadan: { label: 'Ramadan Fard', icon: '🌙', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  sunnah_monday_thursday: { label: 'Sunnah (Mon/Thu)', icon: '✨', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  white_days: { label: 'White Days (13,14,15)', icon: '🌕', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  voluntary: { label: 'Voluntary / Intermittent', icon: '⏳', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  qada: { label: 'Make-Up / Qada', icon: '🔄', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
};

export interface FastingProtocolPreset {
  id: IntermittentProtocol;
  name: string;
  fastingHours: number;
  eatingHours: number;
  description: string;
  badge: string;
}

export interface MetabolicStage {
  id: string;
  name: string;
  minHours: number;
  maxHours: number;
  headline: string;
  description: string;
  benefits: string[];
  color: string;
  badgeClass: string;
}

export interface IntermittentSessionProgress {
  isActive: boolean;
  startTimeMs: number;
  targetHours: number;
  elapsedMs: number;
  elapsedHours: number;
  elapsedMinutes: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingSeconds: number;
  progressPercent: number;
  isTargetReached: boolean;
  currentStage: MetabolicStage;
  nextStage?: MetabolicStage;
  formattedElapsed: string;
  formattedRemaining: string;
}

export class FastingService {
  static readonly PROTOCOLS: FastingProtocolPreset[] = [
    {
      id: '16_8',
      name: '16:8 LeanGains',
      fastingHours: 16,
      eatingHours: 8,
      description: 'Gold-standard daily fasting protocol for steady body recomposition and insulin sensitivity.',
      badge: 'Popular',
    },
    {
      id: '18_6',
      name: '18:6 The Fasting Window',
      fastingHours: 18,
      eatingHours: 6,
      description: 'Accelerated daily window promoting extended ketosis and deeper autophagy induction.',
      badge: 'Fat Burn',
    },
    {
      id: '20_4',
      name: '20:4 Warrior Diet',
      fastingHours: 20,
      eatingHours: 4,
      description: 'Intense 20-hour fast with a concentrated 4-hour nutrient-dense evening feeding window.',
      badge: 'Warrior',
    },
    {
      id: '23_1',
      name: '23:1 OMAD',
      fastingHours: 23,
      eatingHours: 1,
      description: 'One Meal A Day protocol for maximal cellular repair, digestive rest and metabolic focus.',
      badge: 'OMAD',
    },
    {
      id: '14_10',
      name: '14:10 Gentle Reset',
      fastingHours: 14,
      eatingHours: 10,
      description: 'Sustainable gentle fast ideal for heavy training blocks or recovery days.',
      badge: 'Gentle',
    },
    {
      id: 'circadian',
      name: '13:11 Circadian Rhythm',
      fastingHours: 13,
      eatingHours: 11,
      description: 'Natural biological alignment from dusk to dawn in harmony with melatonin release.',
      badge: 'Circadian',
    },
  ];

  static readonly METABOLIC_STAGES: MetabolicStage[] = [
    {
      id: 'fed',
      name: 'Blood Sugar Stabilization',
      minHours: 0,
      maxHours: 4,
      headline: 'Fed State & Anabolism',
      description: 'Blood sugar and insulin peak as ingested calories are processed and stored as glycogen.',
      benefits: ['Glycogen replenishment', 'Protein synthesis', 'Nutrient absorption'],
      color: 'text-blue-400',
      badgeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      id: 'early_fast',
      name: 'Glycogen Depletion',
      minHours: 4,
      maxHours: 12,
      headline: 'Early Fasting & Insulin Drop',
      description: 'Insulin levels drop rapidly; body signals liver to liberate stored glycogen into glucose.',
      benefits: ['Insulin sensitivity reset', 'Digestive tract resting', 'Blood pressure drops'],
      color: 'text-amber-400',
      badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'ketosis',
      name: 'Ketosis & Fat Oxidation',
      minHours: 12,
      maxHours: 18,
      headline: 'Metabolic Shift to Fatty Acids',
      description: 'Liver glycogen is depleted; body shifts energy production to fatty acids and ketone bodies.',
      benefits: ['Accelerated visceral fat burn', 'Elevated mental clarity', 'Anti-inflammatory ketones'],
      color: 'text-emerald-400',
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'autophagy',
      name: 'Autophagy Induction',
      minHours: 18,
      maxHours: 24,
      headline: 'Cellular Cleanup & Recycling',
      description: 'Cells degrade and recycle old, misfolded proteins, damaged mitochondria and senescent matter.',
      benefits: ['Intense cellular renewal', 'Mitochondrial biogenesis', 'Reduced oxidative stress'],
      color: 'text-purple-400',
      badgeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      id: 'deep_autophagy',
      name: 'Deep Autophagy & HGH Surge',
      minHours: 24,
      maxHours: 168,
      headline: 'Peak Growth Hormone & Stem Cells',
      description: 'Human growth hormone surges up to 5x baseline; stem cell renewal triggers immune revitalization.',
      benefits: ['500% HGH surge', 'Immune system rejuvenation', 'Deep cellular detox'],
      color: 'text-cyan-400',
      badgeClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
  ];

  static getEntries(): FastingDayEntry[] {
    const state = db.getState();
    return (state.fastingEntries || []).filter(e => !e.deleted_at);
  }

  static getEntryForDate(localDate: string): FastingDayEntry | undefined {
    return this.getEntries().find(e => e.local_date === localDate);
  }

  static toggleFastToday(type: FastingType = 'voluntary'): FastingDayEntry {
    const today = getTodayLocalDate();
    const existing = this.getEntryForDate(today);
    const now = Date.now();

    if (existing) {
      const updatedCompleted = !existing.completed;
      db.updateState(state => {
        if (!state.fastingEntries) state.fastingEntries = [];
        const target = state.fastingEntries.find(e => e.id === existing.id);
        if (target) {
          target.completed = updatedCompleted;
          target.updated_at = now;
        }
      });
      return { ...existing, completed: updatedCompleted, updated_at: now };
    } else {
      const newEntry: FastingDayEntry = {
        id: generateUUID(),
        local_date: today,
        type,
        completed: true,
        suhur_completed: true,
        iftar_completed: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      db.updateState(state => {
        if (!state.fastingEntries) state.fastingEntries = [];
        state.fastingEntries.unshift(newEntry);
      });
      return newEntry;
    }
  }

  static updateEntry(id: string, updates: Partial<FastingDayEntry>): void {
    const now = Date.now();
    db.updateState(state => {
      if (!state.fastingEntries) return;
      const target = state.fastingEntries.find(e => e.id === id);
      if (target) {
        Object.assign(target, updates);
        target.updated_at = now;
      }
    });
  }

  static toggleSuhur(date: string): void {
    const entry = this.getEntryForDate(date);
    if (!entry) return;
    this.updateEntry(entry.id, { suhur_completed: !entry.suhur_completed });
  }

  static toggleIftar(date: string): void {
    const entry = this.getEntryForDate(date);
    if (!entry) return;
    this.updateEntry(entry.id, { iftar_completed: !entry.iftar_completed });
  }

  /**
   * Calculates live fasting / eating status and countdown based on prayer times
   */
  static calculateCountdown(fajrTimeStr: string, maghribTimeStr: string, now: Date = new Date()): FastingCountdown {
    const parseTimeToMinutes = (t: string): number => {
      if (!t) return 0;
      const parts = t.split(':').map(Number);
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    };

    const fajrMinutes = parseTimeToMinutes(fajrTimeStr || '05:30');
    const maghribMinutes = parseTimeToMinutes(maghribTimeStr || '18:15');

    const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    let isFastingNow = false;
    let targetLabel = '';
    let diffMinutes = 0;
    let progressPercent = 0;

    if (nowMinutes >= fajrMinutes && nowMinutes < maghribMinutes) {
      // Currently daytime fasting window
      isFastingNow = true;
      targetLabel = 'Iftar (Maghrib)';
      diffMinutes = maghribMinutes - nowMinutes;
      const totalFastingDuration = maghribMinutes - fajrMinutes;
      const elapsed = nowMinutes - fajrMinutes;
      progressPercent = Math.min(100, Math.max(0, (elapsed / totalFastingDuration) * 100));
    } else {
      // Nighttime eating window
      isFastingNow = false;
      targetLabel = 'Suhur Cutoff (Fajr)';
      if (nowMinutes >= maghribMinutes) {
        // Between Maghrib and midnight -> countdown to tomorrow Fajr
        diffMinutes = (1440 - nowMinutes) + fajrMinutes;
        const totalNight = (1440 - maghribMinutes) + fajrMinutes;
        const elapsed = nowMinutes - maghribMinutes;
        progressPercent = Math.min(100, Math.max(0, (elapsed / totalNight) * 100));
      } else {
        // Between midnight and Fajr
        diffMinutes = fajrMinutes - nowMinutes;
        const totalNight = (1440 - maghribMinutes) + fajrMinutes;
        const elapsed = (1440 - maghribMinutes) + nowMinutes;
        progressPercent = Math.min(100, Math.max(0, (elapsed / totalNight) * 100));
      }
    }

    const totalSecondsRemaining = Math.max(0, Math.floor(diffMinutes * 60));
    const hours = Math.floor(totalSecondsRemaining / 3600);
    const minutes = Math.floor((totalSecondsRemaining % 3600) / 60);
    const seconds = totalSecondsRemaining % 60;

    return {
      isFastingNow,
      targetLabel,
      hours,
      minutes,
      seconds,
      progressPercent,
      fajrTimeStr: fajrTimeStr || '05:30',
      maghribTimeStr: maghribTimeStr || '18:15',
    };
  }

  /**
   * Retrieves metabolic stage based on elapsed fasting hours
   */
  static getMetabolicStage(elapsedHours: number): MetabolicStage {
    const stage = this.METABOLIC_STAGES.find(s => elapsedHours >= s.minHours && elapsedHours < s.maxHours);
    return stage || this.METABOLIC_STAGES[this.METABOLIC_STAGES.length - 1];
  }

  /**
   * Retrieves active intermittent fasting session
   */
  static getActiveSession(): ActiveFastingSession | null {
    const state = db.getState();
    const session = state.fastingSession;
    if (session && session.is_active) {
      return session;
    }
    return null;
  }

  /**
   * Starts a new intermittent fasting session
   */
  static startFastingSession(
    targetHours: number = 16,
    protocol: IntermittentProtocol | 'custom' = '16_8',
    startTimeMs: number = Date.now()
  ): ActiveFastingSession {
    const session: ActiveFastingSession = {
      id: generateUUID(),
      start_time_ms: startTimeMs,
      target_hours: targetHours,
      protocol,
      is_active: true,
    };

    db.updateState(state => {
      state.fastingSession = session;
    });

    return session;
  }

  /**
   * Stops the active intermittent fasting session and optionally logs to history
   */
  static stopActiveSession(logAsEntry: boolean = true): { session: ActiveFastingSession; dayEntry?: FastingDayEntry } | null {
    const session = this.getActiveSession();
    if (!session) return null;

    const stoppedSession: ActiveFastingSession = {
      ...session,
      is_active: false,
    };

    let dayEntry: FastingDayEntry | undefined;
    const now = Date.now();
    const elapsedHours = (now - session.start_time_ms) / (1000 * 3600);

    db.updateState(state => {
      state.fastingSession = stoppedSession;

      if (logAsEntry && elapsedHours >= 8) {
        const today = getTodayLocalDate();
        const existing = (state.fastingEntries || []).find(e => e.local_date === today);
        if (existing) {
          existing.completed = true;
          existing.notes = `Fasted ${elapsedHours.toFixed(1)}h (${session.protocol.replace('_', ':')})`;
          existing.updated_at = now;
          dayEntry = existing;
        } else {
          dayEntry = {
            id: generateUUID(),
            local_date: today,
            type: 'voluntary',
            completed: true,
            suhur_completed: true,
            iftar_completed: true,
            notes: `Fasted ${elapsedHours.toFixed(1)}h (${session.protocol.replace('_', ':')})`,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          if (!state.fastingEntries) state.fastingEntries = [];
          state.fastingEntries.unshift(dayEntry);
        }
      }
    });

    return { session: stoppedSession, dayEntry };
  }

  /**
   * Calculates real-time intermittent session progress and metabolic metrics
   */
  static calculateSessionProgress(session: ActiveFastingSession, nowMs: number = Date.now()): IntermittentSessionProgress {
    const elapsedMs = Math.max(0, nowMs - session.start_time_ms);
    const totalElapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedHours = totalElapsedSeconds / 3600;
    const wholeHoursElapsed = Math.floor(totalElapsedSeconds / 3600);
    const wholeMinutesElapsed = Math.floor((totalElapsedSeconds % 3600) / 60);

    const targetSeconds = session.target_hours * 3600;
    const remainingSecondsTotal = Math.max(0, targetSeconds - totalElapsedSeconds);

    const remainingHours = Math.floor(remainingSecondsTotal / 3600);
    const remainingMinutes = Math.floor((remainingSecondsTotal % 3600) / 60);
    const remainingSeconds = remainingSecondsTotal % 60;

    const progressPercent = Math.min(100, (elapsedMs / (session.target_hours * 3600 * 1000)) * 100);
    const isTargetReached = elapsedHours >= session.target_hours;

    const currentStage = this.getMetabolicStage(elapsedHours);
    const stageIndex = this.METABOLIC_STAGES.findIndex(s => s.id === currentStage.id);
    const nextStage = stageIndex < this.METABOLIC_STAGES.length - 1 ? this.METABOLIC_STAGES[stageIndex + 1] : undefined;

    const formattedElapsed = `${wholeHoursElapsed}h ${wholeMinutesElapsed}m`;
    const formattedRemaining = isTargetReached ? 'Target Reached!' : `${remainingHours}h ${remainingMinutes}m`;

    return {
      isActive: session.is_active,
      startTimeMs: session.start_time_ms,
      targetHours: session.target_hours,
      elapsedMs,
      elapsedHours,
      elapsedMinutes: wholeMinutesElapsed,
      remainingHours,
      remainingMinutes,
      remainingSeconds,
      progressPercent,
      isTargetReached,
      currentStage,
      nextStage,
      formattedElapsed,
      formattedRemaining,
    };
  }

  static getStats(): { totalFasted: number; monthFasted: number; currentStreak: number } {
    const entries = this.getEntries().filter(e => e.completed);
    const today = getTodayLocalDate();
    const currentMonthPrefix = today.slice(0, 7); // 'YYYY-MM'

    const totalFasted = entries.length;
    const monthFasted = entries.filter(e => e.local_date.startsWith(currentMonthPrefix)).length;

    // Calculate streak
    const dates = new Set(entries.map(e => e.local_date));
    let streak = 0;
    const cursor = new Date();
    // Check if fasted today or start from yesterday
    const todayStr = getTodayLocalDate();
    let checkDate = new Date(cursor);
    if (!dates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const dStr = `${year}-${month}-${day}`;

      if (dates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { totalFasted, monthFasted, currentStreak: streak };
  }

  static exportLedgerCSV(): string {
    const entries = this.getEntries();
    const headers = ['Date', 'Fasting Type', 'Completed', 'Suhur Logged', 'Iftar Logged', 'Notes'];
    const rows = entries.map(e => [
      e.local_date,
      FASTING_TYPE_LABELS[e.type]?.label || e.type,
      e.completed ? 'YES' : 'NO',
      e.suhur_completed ? 'YES' : 'NO',
      e.iftar_completed ? 'YES' : 'NO',
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
