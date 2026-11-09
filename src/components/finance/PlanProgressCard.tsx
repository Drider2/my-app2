import React from 'react';
import { PlanProgressResult, formatMoneyParts } from '../../services/moneyDerivedStats';
import { HatchedBar } from './HatchedBar';
import { useTranslation } from '../../services/i18n';
import { useCountUpValue } from '../../services/motion';

interface PlanProgressCardProps {
  planResult: PlanProgressResult;
  currencyLabel?: string;
  className?: string;
}

export const PlanProgressCard: React.FC<PlanProgressCardProps> = ({
  planResult,
  currencyLabel = 'DA',
  className = '',
}) => {
  const { t, language } = useTranslation();

  const animatedPercent = useCountUpValue(planResult.percentage, { duration: 900 });
  const animatedRunway = planResult.runwayDays !== null ? useCountUpValue(planResult.runwayDays, { duration: 750 }) : null;

  const formattedLimit = formatMoneyParts(planResult.dailyLimitMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');

  return (
    <div
      className={`p-4 sm:p-5 rounded-[22px]  relative overflow-hidden transition-all ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgb(var(--accent-rgb)/.22), rgb(var(--accent-rgb)/.05))',
        border: '1px solid rgb(var(--accent-rgb)/.35)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
      }}
    >
      {/* Top Header: Percentage on Start, Label on End */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[44px] font-medium leading-none text-[var(--text-1)] tabular-nums"
          style={{ textShadow: '0 0 20px rgb(var(--accent-rgb)/.7)' }}
        >
          {Math.round(animatedPercent)}%
        </span>
        <div className="flex flex-col text-end">
          <span className="text-[12px] font-medium text-[var(--text-2)] uppercase tracking-wide">
            {t('finance.planExpenses', 'Plan expenses')}
          </span>
          <span className="text-[11px] text-[var(--text-3)] tabular-nums mt-0.5">
            {planResult.hasPlannedExpenses
              ? `${Math.round(planResult.paidMinor / 100).toLocaleString()} / ${Math.round(planResult.plannedMinor / 100).toLocaleString()} ${currencyLabel}`
              : t('finance.noPlannedExpenses', 'No planned expenses yet')}
          </span>
        </div>
      </div>

      {/* Hatched Bar height 20 */}
      <HatchedBar
        percentage={animatedPercent}
        height={20}
        className="mb-3"
        glow={planResult.hasPlannedExpenses}
      />

      {/* Footer Line: Daily limit {x} and Runway {n} days */}
      <div className="flex items-center justify-between text-[12px] text-[var(--text-3)] pt-0.5">
        <span className="tabular-nums">
          {t('finance.dailyLimitLabel', 'Daily limit {amount}').replace('{amount}', formattedLimit.fullStr)}
        </span>
        {animatedRunway !== null && (
          <span className="tabular-nums font-medium text-[var(--text-2)]">
            {t('finance.runwayDays', 'Runway {n} days').replace('{n}', String(Math.round(animatedRunway)))}
          </span>
        )}
      </div>
    </div>
  );
};
