import React from 'react';
import { Check, Clock } from 'lucide-react';
import { useTranslation } from '../../services/i18n';
import { Haptics } from '../../services/haptics';

export interface PrayerItem {
  prayer: string;
  name: string;
  arabic?: string;
  time: string;
  completed: boolean;
  isPast?: boolean;
}

export interface PrayerTrackerProps {
  prayers: PrayerItem[];
  onToggle: (prayerName: any) => void;
  nextPrayerName?: string;
  nextPrayerCountdown?: string;
  className?: string;
}

const PrayerTrackerComponent: React.FC<PrayerTrackerProps> = ({
  prayers,
  onToggle,
  nextPrayerName,
  nextPrayerCountdown,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <div className={`space-y-3 select-none ${className}`}>
      {/* 5 columns across the card */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 items-center">
        {prayers.map((item) => {
          const isDone = item.completed;
          const isNext = !isDone && item.name === nextPrayerName;
          const isMissed = !isDone && !isNext && item.isPast;

          return (
            <button
              key={item.prayer}
              type="button"
              onClick={() => {
                Haptics.tick();
                onToggle(item.prayer);
              }}
              aria-label={`${item.name} at ${item.time}, ${isDone ? 'completed' : 'pending'}`}
              className="flex flex-col items-center justify-center p-1 rounded-2xl transition-all tap-feedback min-h-[82px] focus:outline-none group"
            >
              {/* Prayer Node */}
              <div className="relative mb-2 flex items-center justify-center h-[40px]">
                {isDone ? (
                  /* Past & completed: solid filled circle (24px) in var(--accent) with white checkmark + 0 0 12px glow */
                  <div
                    className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-white transition-all animate-pop"
                    style={{
                      backgroundColor: 'var(--accent)',
                      boxShadow: '0 0 12px rgb(var(--accent-rgb) / 0.50)',
                    }}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : isNext ? (
                  /* Next upcoming: 38px circle with animated thin arc around it (countdown to prayer time) */
                  <div className="relative w-[38px] h-[38px] flex items-center justify-center">
                    <svg className="w-[38px] h-[38px] -rotate-90 animate-spin" style={{ animationDuration: '6s' }} viewBox="0 0 38 38">
                      <circle
                        cx="19"
                        cy="19"
                        r="16"
                        fill="none"
                        stroke="var(--track)"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="19"
                        cy="19"
                        r="16"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeDasharray="25 50"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 6px rgb(var(--accent-rgb) / 0.6))' }}
                      />
                    </svg>
                    <div 
                      className="absolute w-[22px] h-[22px] rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: 'rgb(var(--accent-rgb) / 0.20)',
                        border: '1px solid rgb(var(--accent-rgb) / 0.50)',
                      }}
                    >
                      <Clock className="w-3 h-3 text-[var(--accent-light)]" />
                    </div>
                  </div>
                ) : isMissed ? (
                  /* Past & missed: empty circle with thin dashed border rgba(255,255,255,.30) */
                  <div
                    className="w-[24px] h-[24px] rounded-full"
                    style={{
                      border: '1.5px dashed rgba(255, 255, 255, 0.30)',
                      backgroundColor: 'transparent',
                    }}
                  />
                ) : (
                  /* Future: 24px circle with subtle border */
                  <div
                    className="w-[24px] h-[24px] rounded-full"
                    style={{
                      border: '1.5px solid var(--hairline)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                  />
                )}
              </div>

              {/* Name highlighted in var(--accent-light) if next */}
              <span
                className="text-[12px] leading-tight truncate w-full text-center transition-colors"
                style={{
                  color: isNext ? 'var(--accent-light)' : isDone ? 'var(--text-1)' : 'var(--text-2)',
                  fontWeight: isNext || isDone ? 500 : 400,
                }}
              >
                {item.name}
              </span>

              {/* Prayer time below */}
              <span className="text-[11px] text-[var(--text-3)] mt-0.5 tabular-nums leading-none">
                {item.time}
              </span>
            </button>
          );
        })}
      </div>

      {/* Next Prayer Countdown Callout if active */}
      {nextPrayerName && nextPrayerCountdown && (
        <div 
          className="flex items-center justify-between px-3.5 py-2 rounded-[14px]"
          style={{
            backgroundColor: 'rgb(var(--accent-rgb) / 0.08)',
            border: '1px solid rgb(var(--accent-rgb) / 0.22)',
          }}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--accent-light)] shrink-0" />
            <span className="text-[12px] text-[var(--text-2)]">
              {t('prayer.nextPrayer', 'Next')}: <span className="font-medium text-[var(--text-1)]">{nextPrayerName}</span>
            </span>
          </div>
          <span className="text-[12px] font-medium text-[var(--accent-light)] tabular-nums">
            {nextPrayerCountdown}
          </span>
        </div>
      )}
    </div>
  );
};

export const PrayerTracker = React.memo(PrayerTrackerComponent);
export default PrayerTracker;
