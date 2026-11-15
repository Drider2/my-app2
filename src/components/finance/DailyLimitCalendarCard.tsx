import React, { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, AccentChip } from '../ui';
import { HatchedBar } from './HatchedBar';
import {
  DayStatusResult,
  CycleRange,
  formatMoneyParts,
  parseLocalDate,
} from '../../services/moneyDerivedStats';
import { useTranslation } from '../../services/i18n';
import { triggerHaptic } from '../../services/motion';

interface DailyLimitCalendarCardProps {
  days: DayStatusResult[];
  range: CycleRange;
  dailyLimitMinor: number;
  weekStartDay?: 0 | 1;
  currencyLabel?: string;
  className?: string;
}

export const DailyLimitCalendarCard: React.FC<DailyLimitCalendarCardProps> = ({
  days,
  range,
  dailyLimitMinor,
  weekStartDay = 1,
  currencyLabel = 'DA',
  className = '',
}) => {
  const { t, language } = useTranslation();

  // Default selected day is today if in range, else first day
  const todayEntry = days.find(d => d.isToday);
  const [selectedDate, setSelectedDate] = useState<string>(todayEntry ? todayEntry.date : (days[0]?.date || ''));

  const activeDay = days.find(d => d.date === selectedDate) || todayEntry || days[0];

  // Weekday letters based on weekStartDay
  const WEEKDAYS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const WEEKDAYS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weekdayLetters = weekStartDay === 0 ? WEEKDAYS_SUN : WEEKDAYS_MON;

  // Leading empty cell count
  const firstDayDate = days[0]?.date;
  let leadingBlanks = 0;
  if (firstDayDate) {
    const d = new Date(firstDayDate + 'T12:00:00').getDay();
    leadingBlanks = (d - weekStartDay + 7) % 7;
  }

  // Formatted daily limit for selected day
  const formattedLimit = formatMoneyParts(dailyLimitMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');
  const formattedActiveOverBy = activeDay ? formatMoneyParts(activeDay.overByMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US') : null;
  const formattedActiveTotal = activeDay ? formatMoneyParts(activeDay.totalSpentMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US') : null;

  return (
    <Card className={`p-4 sm:p-5 relative overflow-hidden ${className}`}>
      {/* Header: Title + Cycle Label on End */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-[16px] font-medium text-[var(--text-1)]">
          {t('finance.dailyLimitCalendar', 'Daily limit calendar')}
        </h3>
        <span className="text-[12px] font-medium text-[var(--text-2)] uppercase tracking-wider">
          {range.shortLabel || range.label}
        </span>
      </div>

      {/* Weekday Letters Row */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
        {weekdayLetters.map((letter, idx) => (
          <div key={idx} className="text-[12px] font-medium text-[var(--text-3)] py-1">
            {letter}
          </div>
        ))}
      </div>

      {/* 7-Column Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {/* Leading empty placeholder slots */}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square" />
        ))}

        {/* Day Cells */}
        {days.map((d, idx) => {
          const isSelected = d.date === selectedDate;

          let cellClass = '';
          let cellStyle: React.CSSProperties = {
            animationDelay: `${(idx % 14) * 16}ms`,
          };

          if (d.status === 'within') {
            cellStyle = {
              ...cellStyle,
              background: 'var(--accent)',
              color: 'var(--on-accent, #0B0F17)',
              boxShadow: '0 0 10px rgb(var(--accent-rgb)/.7)',
            };
          } else if (d.status === 'over') {
            // Over limit is 1.5px DASHED white ring, white number, transparent fill (NO RED)
            cellStyle = {
              ...cellStyle,
              background: 'transparent',
              border: '1.5px dashed #FFFFFF',
              color: '#FFFFFF',
            };
          } else if (d.status === 'no_data') {
            // Hatched circle
            cellStyle = {
              ...cellStyle,
              background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.16) 0 2px, rgba(255,255,255,0.03) 2px 5px)',
              color: 'var(--text-3)',
            };
          } else {
            // Future
            cellStyle = {
              ...cellStyle,
              background: 'transparent',
              color: 'var(--text-3)',
            };
          }

          if (d.isToday) {
            cellStyle.outline = '1.5px solid rgba(255, 255, 255, 0.8)';
            cellStyle.outlineOffset = '1px';
          }

          if (isSelected) {
            cellStyle.boxShadow = '0 0 0 2px var(--bg, #0B0F17), 0 0 0 3.5px #FFFFFF, 0 0 14px rgba(255,255,255,0.7)';
          }

          return (
            <button
              key={d.date}
              onClick={() => {
                triggerHaptic('light');
                setSelectedDate(d.date);
              }}
              className={`aspect-square w-full rounded-full flex items-center justify-center text-[12px] font-medium transition-all active:scale-90 animate-money-day tap-target min-h-[36px] min-w-[36px] ${cellClass}`}
              style={cellStyle}
              aria-label={`Date ${d.date}, status ${d.status}`}
              aria-selected={isSelected}
            >
              <span className="tabular-nums">{d.dayNumber}</span>
            </button>
          );
        })}
      </div>

      {/* Legend Row */}
      <div className="flex items-center gap-4 py-2 border-b border-white/[0.08] text-[12px] text-[var(--text-3)]">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 0 6px rgb(var(--accent-rgb)/.7)',
            }}
          />
          <span>{t('finance.withinLimit', 'Within limit')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-dashed border-white" />
          <span>{t('finance.overLimit', 'Over limit')}</span>
        </div>
      </div>

      {/* Selected Day Panel */}
      {activeDay && (
        <div className="mt-3.5 space-y-3" aria-live="polite">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[20px] sm:text-[22px] font-medium leading-tight text-[var(--text-1)]">
                {activeDay.isToday
                  ? `${t('finance.todayLabel', 'Today')} · ${activeDay.dayNumber}`
                  : `${activeDay.date}`}
              </h4>
              <p className="text-[12px] text-[var(--text-3)] tabular-nums mt-0.5">
                {formattedActiveTotal?.fullStr} {t('common.total', 'total')}
              </p>
            </div>

            {/* Status Chip */}
            <div>
              {activeDay.status === 'over' ? (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white text-black border border-white shadow-[0_0_12px_rgba(255,255,255,0.7)]">
                  <AlertCircle className="w-3.5 h-3.5 text-black" />
                  <span>
                    {t('finance.overBy', 'Over by {amount}').replace('{amount}', formattedActiveOverBy?.fullStr || '')}
                  </span>
                </div>
              ) : activeDay.status === 'within' && activeDay.totalSpentMinor > 0 ? (
                <AccentChip className="px-3 py-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('finance.withinLimit', 'Within limit')}</span>
                </AccentChip>
              ) : (
                <span className="text-[12px] text-[var(--text-3)] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {t('finance.noSpendingRecorded', 'No spending recorded')}
                </span>
              )}
            </div>
          </div>

          {/* Per-Category Hatched Bars */}
          {activeDay.categorySpends.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {activeDay.categorySpends.map(cat => {
                const isOver = cat.spentMinor > dailyLimitMinor;
                const formattedCatSpend = formatMoneyParts(cat.spentMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');

                return (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--text-2)] font-medium truncate max-w-[200px]">
                        {cat.name}
                      </span>
                      <span className="text-[var(--text-3)] tabular-nums">
                        {formattedCatSpend.fullStr} {t('common.of', 'of')} {formattedLimit.fullStr}
                      </span>
                    </div>
                    <HatchedBar
                      percentage={cat.percentageOfLimit}
                      height={12}
                      isOverLimit={isOver}
                      glow={!isOver}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-[var(--text-3)] py-1">
              {t('finance.noSpendingRecorded', 'No spending recorded')}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
