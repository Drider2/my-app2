import React, { useState } from 'react';
import { Share2, ExternalLink, PlusCircle, Check } from 'lucide-react';
import { GlassCard } from '../glass';
import { RecentExpenseItem, formatMoneyParts } from '../../services/moneyDerivedStats';
import { Transaction } from '../../types';
import { useTranslation } from '../../services/i18n';

interface ExpensesHistoryCardProps {
  recentExpenses: RecentExpenseItem[];
  currencyLabel?: string;
  onSeeAll?: () => void;
  onOpenTransaction?: (tx: Transaction) => void;
  onAddFirstExpense?: () => void;
  className?: string;
}

export const ExpensesHistoryCard: React.FC<ExpensesHistoryCardProps> = ({
  recentExpenses,
  currencyLabel = 'DA',
  onSeeAll,
  onOpenTransaction,
  onAddFirstExpense,
  className = '',
}) => {
  const { t, language } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShareTx = async (item: RecentExpenseItem) => {
    const formatted = formatMoneyParts(item.amountMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');
    const text = `GreenDream Expense: ${item.name} (${item.categoryName}) - ${formatted.fullStr} on ${item.dateLabel}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Expense Details',
          text,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // safe fallback
    }
  };

  return (
    <GlassCard className={`p-4 sm:p-5 relative overflow-hidden ${className}`}>
      {/* Header: Title + See all > link */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-medium text-[var(--text-1)]">
          {t('finance.expensesHistory', 'Expenses history')}
        </h3>
        <button
          onClick={onSeeAll}
          className="text-[12px] font-medium text-[var(--accent-light)] hover:underline tap-target flex items-center min-h-[44px]"
        >
          {t('finance.seeAll', 'See all >')}
        </button>
      </div>

      {/* Expense Rows or Empty State */}
      {recentExpenses.length === 0 ? (
        <div className="py-6 flex flex-col items-center justify-center text-center">
          <p className="text-[13px] text-[var(--text-3)] mb-3">
            {t('finance.noSpendingRecorded', 'No spending recorded')}
          </p>
          <button
            onClick={onAddFirstExpense}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[var(--text-1)] border border-white/20 text-[13px] font-medium transition-all tap-target min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4 text-[var(--accent-light)]" />
            <span>{t('finance.addFirstExpense', 'Add your first expense')}</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.08]">
          {recentExpenses.slice(0, 2).map((item, idx) => {
            const formatted = formatMoneyParts(item.amountMinor, currencyLabel, language === 'ar' ? 'ar-SA' : 'en-US');
            const isFirst = idx === 0;

            return (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
              >
                {/* Left: Amount + Category Dot & Name */}
                <div className="flex flex-col text-start">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[22px] font-medium leading-tight text-[var(--text-1)] tabular-nums">
                      {formatted.numberStr}
                    </span>
                    <span className="text-[12px] font-normal text-[var(--text-2)] uppercase">
                      {formatted.currencyStr}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: isFirst ? 'var(--accent)' : 'rgb(var(--accent-rgb)/.55)',
                        boxShadow: isFirst ? '0 0 8px rgb(var(--accent-rgb)/.8)' : undefined,
                      }}
                    />
                    <span className="text-[12px] text-[var(--text-2)] truncate max-w-[150px]">
                      {item.name}
                    </span>
                  </div>
                </div>

                {/* Right: Date Label + 2 Glass Icon Buttons (Share, Open) */}
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text-3)] me-1 shrink-0">
                    {item.dateLabel}
                  </span>

                  {/* Share Button (36px, 44px hit area) */}
                  <button
                    onClick={() => handleShareTx(item)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.10] text-[var(--text-2)] hover:text-[var(--text-1)] border border-white/10 transition-colors tap-target min-h-[44px] min-w-[44px]"
                    aria-label="Share expense"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-[var(--accent-light)]" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Open / Edit Button (36px, 44px hit area) */}
                  <button
                    onClick={() => onOpenTransaction && onOpenTransaction(item.rawTransaction)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.10] text-[var(--text-2)] hover:text-[var(--text-1)] border border-white/10 transition-colors tap-target min-h-[44px] min-w-[44px]"
                    aria-label="Open transaction"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};
