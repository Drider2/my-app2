import React from 'react';
import { ArrowUpRight, ArrowDownRight, Sparkles, PlusCircle } from 'lucide-react';
import { GlassCard, AccentChip } from '../glass';
import { HatchedBar } from './HatchedBar';
import { DeltaChipValue, formatMoneyParts } from '../../services/moneyDerivedStats';
import { useTranslation } from '../../services/i18n';
import { useCountUpValue, triggerHaptic } from '../../services/motion';

interface LeftBalanceHeroCardProps {
  availableCashMinor: number;
  spentMinor: number;
  budgetMinor: number | null;
  currencyLabel?: string;
  delta?: DeltaChipValue | null;
  onSetBudgetClick?: () => void;
  className?: string;
}

export const LeftBalanceHeroCard: React.FC<LeftBalanceHeroCardProps> = ({
  availableCashMinor,
  spentMinor,
  budgetMinor,
  currencyLabel = 'DA',
  delta,
  onSetBudgetClick,
  className = '',
}) => {
  const { t, language } = useTranslation();

  const animatedBalanceMajor = useCountUpValue(Math.round(availableCashMinor / 100), { duration: 900 });
  const animatedSpentMajor = useCountUpValue(Math.round(spentMinor / 100), { duration: 800 });

  const formattedBalance = formatMoneyParts(Math.round(animatedBalanceMajor * 100), currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');
  const formattedSpent = formatMoneyParts(Math.round(animatedSpentMajor * 100), currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');
  const formattedBudget = budgetMinor !== null ? formatMoneyParts(budgetMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US') : null;

  const spentPercentage = budgetMinor && budgetMinor > 0
    ? Math.min(100, Math.round((spentMinor / budgetMinor) * 100))
    : 0;

  const isOverBudget = budgetMinor !== null && spentMinor > budgetMinor;

  return (
    <GlassCard className={`p-4 sm:p-5 relative overflow-hidden ${className}`}>
      {/* Background ambient light */}
      <div
        className="absolute -top-12 -start-12 w-36 h-36 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{ background: 'var(--accent)' }}
      />

      {/* Header Label */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-[var(--text-2)] tracking-wide uppercase">
          {t('finance.leftBalance', 'Left balance')}
        </span>
        {delta && delta.type !== 'zero' && (
          <div className="flex items-center">
            {delta.type === 'new' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[rgb(var(--accent-rgb)/.14)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/.35)] shadow-[0_0_12px_rgb(var(--accent-rgb)/.22)]">
                <Sparkles className="w-3 h-3" />
                {t('finance.newDelta', 'New')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.08] text-[var(--text-1)] border border-white/20">
                {delta.type === 'increase' ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--accent-light)]" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-white/70" />
                )}
                <span>{delta.label}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Big Balance Number */}
      <div className="flex items-baseline gap-2 mb-4">
        <span
          className="text-[40px] leading-tight font-medium tracking-tight text-[var(--text-1)] tabular-nums"
          style={{ textShadow: '0 0 18px rgb(var(--accent-rgb)/.7)' }}
        >
          {formattedBalance.numberStr}
        </span>
        <span className="text-[12px] font-normal text-[var(--text-2)] uppercase">
          {formattedBalance.currencyStr}
        </span>
      </div>

      {/* Progress Bar & Subtitle or Set Budget CTA */}
      {budgetMinor !== null && budgetMinor > 0 ? (
        <div className="space-y-2.5">
          <HatchedBar
            percentage={spentPercentage}
            height={16}
            isOverLimit={isOverBudget}
            glow={!isOverBudget}
          />
          <div className="flex items-center justify-between text-[12px]">
            <p className="text-[var(--text-2)]">
              <span className="text-white font-semibold tabular-nums">
                {formattedSpent.numberStr} {formattedSpent.currencyStr}
              </span>{' '}
              {t('common.of', 'of')}{' '}
              <span className="text-[var(--text-2)] tabular-nums">
                {formattedBudget?.fullStr}
              </span>{' '}
              {t('common.spent', 'spent')}
            </p>
            {isOverBudget ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-white text-black border border-white shadow-[0_0_12px_rgba(255,255,255,0.7)]">
                {t('finance.overBudget', 'Over budget')}
              </span>
            ) : (
              <span className="text-[12px] font-medium text-[var(--text-3)] tabular-nums">
                {100 - spentPercentage}% {t('common.left', 'left')}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-1 flex items-center justify-between">
          <p className="text-[12px] text-[var(--text-3)]">
            {t('finance.noBudgetSet', 'No spending budget set for this cycle')}
          </p>
          <button
            onClick={() => {
              triggerHaptic('light');
              if (onSetBudgetClick) onSetBudgetClick();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[var(--text-1)] border border-white/20 text-[12px] font-medium active:scale-95 transition-all tap-target min-h-[44px]"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[var(--accent-light)]" />
            <span>{t('finance.setABudget', 'Set a budget')}</span>
          </button>
        </div>
      )}
    </GlassCard>
  );
};
