import { db, generateUUID, getTodayLocalDate } from './storage';
import { QuranKhatmahState, QuranReadingRecord } from '../types';

export interface JuzMetadata {
  juzNumber: number;
  juzName: string;
  startPage: number;
}

export const JUZ_LIST: JuzMetadata[] = [
  { juzNumber: 1, juzName: "Al-Fatihah (الفاتحة)", startPage: 1 },
  { juzNumber: 2, juzName: "Sayaqool (سَيَقُولُ)", startPage: 22 },
  { juzNumber: 3, juzName: "Tilka ar-Rusul (تِلْكَ الرُّسُلُ)", startPage: 42 },
  { juzNumber: 4, juzName: "Lan Tanaaloo (لَنْ تَنَالُوا)", startPage: 62 },
  { juzNumber: 5, juzName: "Wal Muhsanat (وَالْمُحْصَنَاتُ)", startPage: 82 },
  { juzNumber: 6, juzName: "La Yuhibbullah (لَا يُحِبُّ اللَّهُ)", startPage: 102 },
  { juzNumber: 7, juzName: "Wa Iza Sami'oo (وَإِذَا سَمِعُوا)", startPage: 121 },
  { juzNumber: 8, juzName: "Wa Law Annana (وَلَوْ أَنَّنَا)", startPage: 142 },
  { juzNumber: 9, juzName: "Qal al-Mala'u (قَالَ الْمَلَأُ)", startPage: 162 },
  { juzNumber: 10, juzName: "Wa A'lamoo (وَاعْلَمُوا)", startPage: 182 },
  { juzNumber: 11, juzName: "Ya'taziroona (يَعْتَذِرُونَ)", startPage: 201 },
  { juzNumber: 12, juzName: "Wa Ma Min Daabbah (وَمَا مِنْ دَابَّةٍ)", startPage: 222 },
  { juzNumber: 13, juzName: "Wa Ma Ubri'oo (وَمَا أُبَرِّئُ)", startPage: 242 },
  { juzNumber: 14, juzName: "Rubama (رُبَمَا)", startPage: 262 },
  { juzNumber: 15, juzName: "Subhana allazi (سُبْحَانَ الَّذِي)", startPage: 282 },
  { juzNumber: 16, juzName: "Qala Alam (قَالَ أَلَمْ)", startPage: 302 },
  { juzNumber: 17, juzName: "Iqtaraba (اقْتَرَبَ)", startPage: 322 },
  { juzNumber: 18, juzName: "Qad Aflaha (قَدْ أَفْلَحَ)", startPage: 342 },
  { juzNumber: 19, juzName: "Wa Qala allazeena (وَقَالَ الَّذِينَ)", startPage: 362 },
  { juzNumber: 20, juzName: "Amman Khalaqa (أَمَّنْ خَلَقَ)", startPage: 382 },
  { juzNumber: 21, juzName: "Utlu Ma Oohiya (اتْلُ مَا أُوحِيَ)", startPage: 402 },
  { juzNumber: 22, juzName: "Wa Man Yaqnut (وَمَنْ يَقْنُتْ)", startPage: 422 },
  { juzNumber: 23, juzName: "Wa Maliya (وَمَا لِيَ)", startPage: 442 },
  { juzNumber: 24, juzName: "Fa Man Azlamu (فَمَنْ أَظْلَمُ)", startPage: 462 },
  { juzNumber: 25, juzName: "Ilayhi Yuraddu (إِلَيْهِ يُرَدُّ)", startPage: 482 },
  { juzNumber: 26, juzName: "Ha-Meem (حم)", startPage: 502 },
  { juzNumber: 27, juzName: "Qala Fama Khatbukum (قَالَ فَمَا خَطْبُكُمْ)", startPage: 522 },
  { juzNumber: 28, juzName: "Qad Sami'a Allahu (قَدْ سَمِعَ اللَّهُ)", startPage: 542 },
  { juzNumber: 29, juzName: "Tabaraka allazi (تَبَارَكَ الَّذِي)", startPage: 562 },
  { juzNumber: 30, juzName: "'Amma Yatasa'aloon (عَمَّ يَتَسَاءَلُونَ)", startPage: 582 }
];

export class QuranService {
  static TOTAL_PAGES = 604;
  static TOTAL_JUZ = 30;

  static getJuzForPage(page: number): JuzMetadata {
    const clampedPage = Math.max(1, Math.min(this.TOTAL_PAGES, page));
    for (let i = JUZ_LIST.length - 1; i >= 0; i--) {
      if (clampedPage >= JUZ_LIST[i].startPage) {
        return JUZ_LIST[i];
      }
    }
    return JUZ_LIST[0];
  }

  static getKhatmahState(): QuranKhatmahState {
    const state = db.getState();
    if (!state.quranKhatmah) {
      return {
        current_page: 1,
        daily_page_goal: 20,
        target_days: 30,
        khatmah_count: 0,
        started_at: Date.now(),
        history: [],
      };
    }
    return state.quranKhatmah;
  }

  static updateCurrentPage(newPage: number, note?: string): QuranKhatmahState {
    const today = getTodayLocalDate();
    const clamped = Math.max(1, Math.min(this.TOTAL_PAGES, newPage));
    const current = this.getKhatmahState();
    const pagesRead = Math.max(0, clamped - current.current_page);

    const record: QuranReadingRecord = {
      id: generateUUID(),
      local_date: today,
      pages_read: pagesRead,
      ending_page: clamped,
      timestamp: Date.now(),
      note: note || undefined,
    };

    const updatedState: QuranKhatmahState = {
      ...current,
      current_page: clamped,
      last_read_date: today,
      history: [record, ...(current.history || [])],
    };

    db.updateState(s => {
      s.quranKhatmah = updatedState;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('greendream_state_updated'));
    }

    return updatedState;
  }

  static addPages(delta: number, note?: string): QuranKhatmahState {
    const current = this.getKhatmahState();
    return this.updateCurrentPage(current.current_page + delta, note);
  }

  static updateDailyGoal(goalPages: number): void {
    const clamped = Math.max(1, Math.min(100, goalPages));
    db.updateState(s => {
      if (!s.quranKhatmah) s.quranKhatmah = this.getKhatmahState();
      s.quranKhatmah.daily_page_goal = clamped;
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('greendream_state_updated'));
    }
  }

  static completeKhatmah(note?: string): QuranKhatmahState {
    const today = getTodayLocalDate();
    const current = this.getKhatmahState();

    const record: QuranReadingRecord = {
      id: generateUUID(),
      local_date: today,
      pages_read: Math.max(0, this.TOTAL_PAGES - current.current_page),
      ending_page: this.TOTAL_PAGES,
      timestamp: Date.now(),
      note: note || 'Completed Khatmah! Al-Hamdulillah 🌟',
    };

    const updatedState: QuranKhatmahState = {
      ...current,
      current_page: 1, // Reset for next journey
      khatmah_count: (current.khatmah_count || 0) + 1,
      started_at: Date.now(),
      last_read_date: today,
      history: [record, ...(current.history || [])],
    };

    db.updateState(s => {
      s.quranKhatmah = updatedState;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('greendream_state_updated'));
    }

    return updatedState;
  }

  static getKhatmahMetrics(): {
    currentPage: number;
    percentCompleted: number;
    pagesRemaining: number;
    currentJuz: JuzMetadata;
    pagesReadToday: number;
    dailyGoal: number;
    estimatedDaysRemaining: number;
    khatmahCount: number;
  } {
    const state = this.getKhatmahState();
    const today = getTodayLocalDate();
    const percentCompleted = Math.min(100, Math.round((state.current_page / this.TOTAL_PAGES) * 100));
    const pagesRemaining = Math.max(0, this.TOTAL_PAGES - state.current_page);
    const currentJuz = this.getJuzForPage(state.current_page);

    const pagesReadToday = (state.history || [])
      .filter(r => r.local_date === today)
      .reduce((sum, r) => sum + (r.pages_read || 0), 0);

    const dailyGoal = state.daily_page_goal || 20;
    const estimatedDaysRemaining = Math.ceil(pagesRemaining / Math.max(1, dailyGoal));

    return {
      currentPage: state.current_page,
      percentCompleted,
      pagesRemaining,
      currentJuz,
      pagesReadToday,
      dailyGoal,
      estimatedDaysRemaining,
      khatmahCount: state.khatmah_count || 0,
    };
  }

  static generateCSV(): string {
    const state = this.getKhatmahState();
    const headers = ['Date', 'Pages Read', 'Ending Page', 'Juz', 'Timestamp', 'Note'];
    const rows = (state.history || []).map(r => {
      const juz = this.getJuzForPage(r.ending_page);
      return [
        r.local_date,
        r.pages_read,
        r.ending_page,
        `"Juz ${juz.juzNumber} - ${juz.juzName}"`,
        new Date(r.timestamp).toISOString(),
        `"${(r.note || '').replace(/"/g, '""')}"`
      ];
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
