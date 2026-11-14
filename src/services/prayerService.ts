// Daily Prayers Service (Section 2 Specification)
import { db, generateUUID, getTodayLocalDate } from './storage';
import { PrayerName, PrayerEntry, PrayerSettings } from '../types';

export const PRAYER_NAMES: { id: PrayerName; name: string; arabic: string }[] = [
  { id: 'fajr', name: 'Fajr', arabic: 'الفجر' },
  { id: 'dhuhr', name: 'Dhuhr', arabic: 'الظهر' },
  { id: 'asr', name: 'Asr', arabic: 'العصر' },
  { id: 'maghrib', name: 'Maghrib', arabic: 'المغرب' },
  { id: 'isha', name: 'Isha', arabic: 'العشاء' },
];

export const CALCULATION_METHODS = [
  'Algerian Ministry of Religious Affairs',
  'Muslim World League (MWL)',
  'Egyptian General Authority of Survey',
  'Umm al-Qura University (Makkah)',
  'Islamic Society of North America (ISNA)',
];

export const PrayerService = {
  /**
   * Retrieves today's prayer status or creates fresh empty records for the day if not yet initialized.
   * Does NOT mark prayers automatically or delete past days.
   */
  getPrayersForDate(dateStr?: string): {
    records: { prayer: PrayerName; name: string; arabic: string; time: string; completed: boolean; completed_at?: number | null }[];
    completedCount: number;
    totalCount: number;
    completionPercentage: number;
  } {
    const targetDate = dateStr || getTodayLocalDate();
    const state = db.getState();
    const times = state.prayerSettings?.times || {
      fajr: '05:32',
      dhuhr: '12:35',
      asr: '15:42',
      maghrib: '17:55',
      isha: '19:18',
    };

    const existingForDate = state.prayers.filter(p => p.local_date === targetDate && !p.deleted_at);

    const records = PRAYER_NAMES.map(p => {
      const found = existingForDate.find(e => e.prayer === p.id);
      return {
        prayer: p.id,
        name: p.name,
        arabic: p.arabic,
        time: times[p.id] || '12:00',
        completed: !!found?.completed,
        completed_at: found?.completed_at || null,
      };
    });

    const completedCount = records.filter(r => r.completed).length;
    const totalCount = records.length;
    const completionPercentage = Math.round((completedCount / totalCount) * 100);

    return {
      records,
      completedCount,
      totalCount,
      completionPercentage,
    };
  },

  /**
   * Toggles prayer completion state. Allows correction of accidental clicks.
   * Records exact completion timestamp when checked.
   */
  togglePrayer(prayer: PrayerName, dateStr?: string): void {
    const targetDate = dateStr || getTodayLocalDate();
    const now = Date.now();

    db.updateState(draft => {
      const existing = draft.prayers.find(p => p.local_date === targetDate && p.prayer === prayer && !p.deleted_at);
      if (existing) {
        existing.completed = !existing.completed;
        existing.completed_at = existing.completed ? now : null;
        existing.updated_at = now;
      } else {
        const newEntry: PrayerEntry = {
          id: generateUUID(),
          local_date: targetDate,
          prayer,
          completed: true,
          completed_at: now,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };
        draft.prayers.push(newEntry);
      }
    });
  },

  /**
   * Returns weekly or monthly completion summary for historical trend analysis.
   */
  getHistory(daysCount: number = 7): { date: string; completedCount: number; percentage: number }[] {
    const state = db.getState();
    const result: { date: string; completedCount: number; percentage: number }[] = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      const completed = state.prayers.filter(p => p.local_date === dateStr && p.completed && !p.deleted_at).length;
      result.push({
        date: dateStr,
        completedCount: completed,
        percentage: Math.round((completed / 5) * 100),
      });
    }

    return result;
  },

  /**
   * Updates prayer times and calculation settings
   */
  updateSettings(newSettings: Partial<PrayerSettings>): void {
    db.updateState(draft => {
      draft.prayerSettings = {
        ...draft.prayerSettings,
        ...newSettings,
      };
    });
  },

  /**
   * Toggles notification reminder for a specific prayer
   */
  toggleReminder(prayer: PrayerName): void {
    db.updateState(draft => {
      if (!draft.prayerSettings.reminders) {
        draft.prayerSettings.reminders = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
      }
      draft.prayerSettings.reminders[prayer] = !draft.prayerSettings.reminders[prayer];
    });
  },

  /**
   * Computes the precise Qibla bearing and distance to the Kaaba from coordinates (defaulting to Algiers)
   */
  getQiblaDirection(latitude: number = 36.7538, longitude: number = 3.0588): {
    bearingDegrees: number;
    cardinal: string;
    distanceKm: number;
  } {
    // Kaaba coordinates
    const kaabaLat = 21.422487;
    const kaabaLng = 39.826206;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const phi1 = toRad(latitude);
    const phi2 = toRad(kaabaLat);
    const deltaLambda = toRad(kaabaLng - longitude);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    const bearing = Math.round(((toDeg(Math.atan2(y, x)) + 360) % 360) * 10) / 10;

    // Haversine distance
    const R = 6371;
    const dPhi = toRad(kaabaLat - latitude);
    const dLambda = toRad(kaabaLng - longitude);
    const a =
      Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.round(R * c);

    const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(bearing / 22.5) % 16;
    const cardinal = cardinals[idx];

    return { bearingDegrees: bearing, cardinal, distanceKm };
  },

  /**
   * Exports prayer attendance ledger as CSV
   */
  exportPrayerHistoryCsv(): string {
    const state = db.getState();
    const prayers = state.prayers || [];
    
    // Group prayers by date
    const dateMap = new Map<string, { fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }>();
    for (const p of prayers) {
      if (p.deleted_at) continue;
      if (!dateMap.has(p.local_date)) {
        dateMap.set(p.local_date, { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false });
      }
      const day = dateMap.get(p.local_date)!;
      if (p.prayer in day) {
        day[p.prayer] = p.completed;
      }
    }

    const headers = ['Date', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Completed Count', 'Completion Rate'];
    const sortedDates = Array.from(dateMap.keys()).sort().reverse();
    const rows = sortedDates.map(date => {
      const d = dateMap.get(date)!;
      const count = [d.fajr, d.dhuhr, d.asr, d.maghrib, d.isha].filter(Boolean).length;
      const pct = `${Math.round((count / 5) * 100)}%`;
      return [
        date,
        d.fajr ? 'Yes' : 'No',
        d.dhuhr ? 'Yes' : 'No',
        d.asr ? 'Yes' : 'No',
        d.maghrib ? 'Yes' : 'No',
        d.isha ? 'Yes' : 'No',
        count,
        pct
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
};
