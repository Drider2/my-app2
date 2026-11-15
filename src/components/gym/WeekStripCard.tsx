import React from 'react';
import { Check } from 'lucide-react';
import { Card } from '../ui';
import { WeekDayStripItem } from '../../services/gymDerivedStats';

interface WeekStripCardProps {
  days: WeekDayStripItem[];
  onSelectDay: (day: WeekDayStripItem) => void;
  className?: string;
}

export const WeekStripCard: React.FC<WeekStripCardProps> = ({
  days,
  onSelectDay,
  className = '',
}) => {
  return (
    <Card className={`p-[14px_12px] ${className}`}>
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center" role="group" aria-label="Current week workout strip">
        {days.map((day) => {
          const isDone = day.isDone;
          const isToday = day.isToday;
          const isPlannedNotDone = day.isPlanned && !isDone;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex flex-col items-center justify-center gap-1.5 min-h-[56px] min-w-[40px] tap-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl py-1 transition-transform"
              aria-label={`${day.dateStr}, ${isDone ? 'completed workout' : isToday ? 'today' : isPlannedNotDone ? 'planned' : 'rest'}`}
            >
              {/* Day Letter */}
              <span
                className={`text-[12px] font-medium leading-none select-none transition-colors ${
                  isToday
                    ? 'text-white font-bold'
                    : isDone
                    ? 'text-[var(--accent-light)]'
                    : 'text-[var(--text-3)]'
                }`}
              >
                {day.dayLetter}
              </span>

              {/* 34px Date / Status Circle */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all duration-200 select-none ${
                    isDone
                      ? 'bg-[rgb(var(--accent-rgb)/0.18)] border border-[rgb(var(--accent-rgb)/0.55)] shadow-[0_0_14px_rgb(var(--accent-rgb)/0.45)] animate-done-circle'
                      : 'bg-white/[0.04] border border-white/10'
                  } ${
                    isToday ? 'ring-[1.5px] ring-white ring-offset-1 ring-offset-[rgba(4,7,10,0.8)]' : ''
                  }`}
                >
                  {isDone ? (
                    <Check className="w-4 h-4 text-[var(--accent-light)] stroke-[3]" />
                  ) : (
                    <span
                      className={`text-[12px] leading-none transition-colors ${
                        isToday
                          ? 'font-bold text-white'
                          : isPlannedNotDone
                          ? 'font-medium text-[var(--text-1)]'
                          : 'font-normal text-[var(--text-3)]'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  )}
                </div>

                {/* Tiny accent dot for planned days not yet completed */}
                {isPlannedNotDone && !isDone && (
                  <span
                    className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_6px_rgb(var(--accent-rgb)/0.7)]"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default WeekStripCard;
