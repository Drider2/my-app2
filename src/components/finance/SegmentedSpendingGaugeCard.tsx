import React, { useState } from 'react';
import { Share2, ChevronLeft, ChevronRight, AlertCircle, Check } from 'lucide-react';
import { Card } from '../ui';
import {
  CategorySpendBreakdown,
  calculateGaugeSegments,
  formatMoneyParts,
} from '../../services/moneyDerivedStats';
import { useTranslation } from '../../services/i18n';
import { useCountUpValue, triggerHaptic } from '../../services/motion';

interface SegmentedSpendingGaugeCardProps {
  breakdown: CategorySpendBreakdown;
  cycleBudget: number | null;
  currencyLabel?: string;
  onSelectCategory?: (categoryId: string) => void;
  className?: string;
}

export const SegmentedSpendingGaugeCard: React.FC<SegmentedSpendingGaugeCardProps> = ({
  breakdown,
  cycleBudget,
  currencyLabel = 'DA',
  onSelectCategory,
  className = '',
}) => {
  const { t, language } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const gaugeData = calculateGaugeSegments(breakdown, cycleBudget);

  const displayItems = breakdown.other
    ? [...breakdown.top3, breakdown.other]
    : breakdown.items;

  const currentCategory = displayItems[selectedIndex] || displayItems[0] || {
    categoryId: 'all',
    name: t('common.all', 'All spending'),
    spentMinor: breakdown.totalSpentMinor,
    percentageOfBudget: 100,
  };

  const animatedSpentMajor = useCountUpValue(Math.round(breakdown.totalSpentMinor / 100), { duration: 900 });
  const formattedTotal = formatMoneyParts(Math.round(animatedSpentMajor * 100), currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');
  const formattedCategorySpend = formatMoneyParts(currentCategory.spentMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');
  const formattedOverBy = formatMoneyParts(gaugeData.overByMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');

  // Handle category carousel navigation
  const handlePrevCategory = () => {
    if (displayItems.length <= 1) return;
    triggerHaptic('light');
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : displayItems.length - 1));
  };

  const handleNextCategory = () => {
    if (displayItems.length <= 1) return;
    triggerHaptic('light');
    setSelectedIndex(prev => (prev < displayItems.length - 1 ? prev + 1 : 0));
  };

  // Plain-text share action (native Web Share or clipboard fallback)
  const handleShare = async () => {
    triggerHaptic('light');
    const summary = `${t('finance.spendingByCategory', 'Spending by category')}:\n` +
      `${t('finance.totalSpent', 'Total spent')}: ${formattedTotal.fullStr}\n` +
      displayItems.map(item => {
        const amt = formatMoneyParts(item.spentMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');
        return `• ${item.name}: ${amt.fullStr} (${item.percentageOfBudget}% of budget)`;
      }).join('\n');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: t('finance.spendingByCategory', 'Spending by category'),
          text: summary,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // safe fallback
    }
  };

  // Arc path: semicircle from (30, 120) to (210, 120) with radius 90
  const arcPath = 'M 30 120 A 90 90 0 0 1 210 120';

  return (
    <Card className={`p-4 sm:p-5 relative overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[16px] font-medium text-[var(--text-1)]">
          {t('finance.spendingByCategory', 'Spending by category')}
        </h3>
        <button
          onClick={handleShare}
          className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-[var(--text-2)] hover:text-[var(--text-1)] border border-white/10 transition-colors tap-target min-h-[44px] min-w-[44px]"
          aria-label={t('common.share', 'Share')}
        >
          {copied ? (
            <Check className="w-4 h-4 text-[var(--accent-light)]" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* SVG Half-Circle Gauge */}
      <div className="relative w-full flex flex-col items-center justify-center my-2">
        <svg
          viewBox="0 0 240 135"
          className="w-full max-w-[280px] overflow-visible"
        >
          <defs>
            {/* 45 degree hatched unspent remainder pattern */}
            <pattern
              id="unspentHatchPattern"
              width="6"
              height="6"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="2.2"
              />
            </pattern>
            {/* Drop shadow filter for 1st category */}
            <filter id="accentGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="3"
                floodColor="rgb(var(--accent-rgb))"
                floodOpacity="0.8"
              />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d={arcPath}
            pathLength="100"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="16"
            strokeLinecap="butt"
          />

          {/* Unspent Remainder Hatched Arc */}
          {!gaugeData.isOverBudget && gaugeData.remainderPercent > 0 && (
            <path
              d={arcPath}
              pathLength="100"
              fill="none"
              stroke="url(#unspentHatchPattern)"
              strokeWidth="16"
              strokeLinecap="butt"
              strokeDasharray={`${gaugeData.remainderPercent} ${100 - gaugeData.remainderPercent}`}
              strokeDashoffset={`${-(100 - gaugeData.remainderPercent)}`}
            />
          )}

          {/* Category Segments */}
          {gaugeData.segments.map((seg, idx) => (
            <path
              key={seg.categoryId || idx}
              d={arcPath}
              pathLength="100"
              fill="none"
              stroke={seg.hasGlow ? 'var(--accent)' : `rgb(var(--accent-rgb) / ${seg.strokeOpacity})`}
              strokeWidth="16"
              strokeLinecap="butt"
              strokeDasharray={`${seg.dashLength} ${100 - seg.dashLength}`}
              strokeDashoffset={`${seg.dashOffset}`}
              style={{
                transition: 'stroke-dasharray 750ms cubic-bezier(0.16, 1, 0.3, 1), stroke-dashoffset 750ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              filter={seg.hasGlow ? 'url(#accentGlow)' : undefined}
            />
          ))}

          {/* Over-budget white dashed ring overlay (NO RED) */}
          {gaugeData.isOverBudget && (
            <path
              d={arcPath}
              pathLength="100"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeDasharray="2 3"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Center Total Callout */}
        <div className="absolute top-[52px] sm:top-[56px] flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[12px] font-normal text-[var(--text-3)] tracking-wide uppercase">
            {t('finance.totalSpent', 'Total spent')}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className="text-[26px] font-medium leading-none text-[var(--text-1)] tabular-nums"
              style={{ textShadow: '0 0 16px rgb(var(--accent-rgb)/.6)' }}
            >
              {formattedTotal.numberStr}
            </span>
            <span className="text-[12px] font-normal text-[var(--text-2)] uppercase">
              {formattedTotal.currencyStr}
            </span>
          </div>

          {/* Over budget white chip */}
          {gaugeData.isOverBudget && (
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-black border border-white shadow-[0_0_12px_rgba(255,255,255,0.7)]">
              <AlertCircle className="w-3 h-3 text-black" />
              <span>
                {t('finance.overBy', 'Over by {amount}').replace('{amount}', formattedOverBy.fullStr)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category Cycling Glass Pill Selector */}
      {displayItems.length > 0 ? (
        <div className="mt-2 w-full flex items-center justify-between p-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] ">
          {/* Prev Button */}
          <button
            onClick={handlePrevCategory}
            disabled={displayItems.length <= 1}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all tap-target min-h-[44px] min-w-[44px]"
            aria-label="Previous category"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>

          {/* Category Name & Amount (Tapping opens Ledger filtered by category) */}
          <button
            onClick={() => onSelectCategory && onSelectCategory(currentCategory.categoryId)}
            className="flex-1 flex flex-col items-center justify-center px-2 py-0.5 tap-target min-h-[44px] hover:opacity-90 transition-opacity"
          >
            <span className="text-[14px] font-medium text-[var(--text-1)] truncate max-w-[180px]">
              {currentCategory.name}
            </span>
            <span className="text-[12px] text-[var(--text-2)] tabular-nums">
              {formattedCategorySpend.fullStr}
            </span>
          </button>

          {/* Next Button filled with accent gradient + glow */}
          <button
            onClick={handleNextCategory}
            disabled={displayItems.length <= 1}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--on-accent,#0B0F17)] disabled:opacity-30 disabled:pointer-events-none transition-all tap-target min-h-[44px] min-w-[44px]"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
              boxShadow: '0 0 14px rgb(var(--accent-rgb)/.5)',
            }}
            aria-label="Next category"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      ) : (
        <p className="mt-2 text-center text-[12px] text-[var(--text-3)] py-1">
          {t('finance.noSpendingRecorded', 'No spending recorded')}
        </p>
      )}
    </Card>
  );
};
