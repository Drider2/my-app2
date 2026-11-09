import React from 'react';
import { 
  Sun, 
  Check, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  RotateCcw, 
  Award,
  Sparkles
} from 'lucide-react';
import { db, getTodayLocalDate } from '../../services/storage';
import { PrayerService, PRAYER_NAMES } from '../../services/prayerService';
import { DailyProgressCard } from '../dashboard/DailyProgressCard';
import { ModuleWidgetConfig, PrayerName } from '../../types';

interface PrayersWidgetRendererProps {
  widget: ModuleWidgetConfig;
  onRefresh: () => void;
  triggerToast?: (msg: string) => void;
}

export const PrayersWidgetRenderer: React.FC<PrayersWidgetRendererProps> = ({
  widget,
  onRefresh,
  triggerToast = () => {},
}) => {
  const state = db.getState();
  const today = getTodayLocalDate();
  const dailyStatus = PrayerService.getPrayersForDate(today);
  const history = PrayerService.getHistory(7);

  const handleTogglePrayer = (p: PrayerName) => {
    PrayerService.togglePrayer(p, today);
    onRefresh();
  };

  switch (widget.widgetType) {
    // 1. Five Daily Prayers
    case 'prayers_daily_times': {
      const completedCount = dailyStatus.records.filter(p => p.completed).length;
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Obligatory Prayers
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Five Daily Prayers
                </h3>
              </div>
            </div>
            <span className="text-xs font-bold text-[var(--color-positive)]">
              {completedCount} / 5 Done
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {dailyStatus.records.map(p => (
              <button
                key={p.prayer}
                onClick={() => handleTogglePrayer(p.prayer)}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all tap-feedback ${
                  p.completed
                    ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] border-[var(--color-text-primary)] shadow-sm'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]'
                }`}
              >
                <span className="text-xs font-bold capitalize">{p.name}</span>
                <span className="text-xs opacity-75">{p.time}</span>
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center mt-0.5 ${
                  p.completed ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)]' : 'border border-[var(--color-border)]'
                }`}>
                  {p.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 2. Daily Progress Counter (10-Point Score)
    case 'prayers_progress_indicator':
      return <DailyProgressCard onRefresh={onRefresh} />;

    // 3. Weekly Prayer Overview
    case 'prayers_weekly_overview': {
      const avgRate = Math.round(
        (history.reduce((sum, h) => sum + h.completedCount, 0) / (history.length * 5 || 1)) * 100
      );
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Weekly Prayer Consistency
              </h3>
            </div>
            <span className="text-xs font-bold text-[var(--color-accent)]">{avgRate}% rate</span>
          </div>

          <div className="grid grid-cols-7 gap-1 pt-1">
            {history.map(day => (
              <div key={day.date} className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center flex flex-col items-center">
                <span className="text-xs text-[var(--color-text-secondary)]">{day.date.slice(8)}</span>
                <span className="text-xs font-bold text-[var(--color-text-primary)] mt-1">{day.completedCount}/5</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 4. Spiritual Progress History
    case 'prayers_history':
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-positive)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Spiritual Record Log
            </h3>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Daily prayers and Quranic contemplation records are safely recorded offline on device.
          </p>
        </div>
      );

    default:
      return null;
  }
};
