import React, { useState, useMemo } from 'react';
import { 
  Coins, 
  ArrowRightLeft, 
  X, 
  Check, 
  TrendingUp, 
  Globe, 
  Sliders, 
  Plus, 
  Percent,
  Wallet,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { db, generateUUID, getTodayLocalDate } from '../../services/storage';
import { Haptics } from '../../services/haptics';

interface CurrencyConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
  currencyLabel?: string;
}

interface CurrencyRate {
  code: string;
  name: string;
  flag: string;
  symbol: string;
  officialRate: number; // in DA per 1 unit
  parallelRate: number; // in DA per 1 unit
}

const POPULAR_CURRENCIES: CurrencyRate[] = [
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€', officialRate: 145.5, parallelRate: 262.0 },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', symbol: '$', officialRate: 134.2, parallelRate: 242.0 },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', symbol: '£', officialRate: 172.8, parallelRate: 305.0 },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', symbol: 'C$', officialRate: 97.4, parallelRate: 175.0 },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', symbol: '﷼', officialRate: 35.8, parallelRate: 64.5 },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', symbol: 'د.إ', officialRate: 36.5, parallelRate: 65.5 },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷', symbol: '₺', officialRate: 3.9, parallelRate: 6.8 },
];

export const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  onToast,
  currencyLabel = 'DA',
}) => {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('EUR');
  const [rateMode, setRateMode] = useState<'parallel' | 'official'>('parallel');
  const [foreignAmount, setForeignAmount] = useState<string>('50');
  const [customRate, setCustomRate] = useState<string>('');
  const [isCustomRateActive, setIsCustomRateActive] = useState(false);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txTitle, setTxTitle] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const state = db.getState();
  const categories = state.categories || [];

  const selectedCurrency = useMemo(() => {
    return POPULAR_CURRENCIES.find(c => c.code === selectedCurrencyCode) || POPULAR_CURRENCIES[0];
  }, [selectedCurrencyCode]);

  // Active rate
  const activeRate = useMemo(() => {
    if (isCustomRateActive && customRate && parseFloat(customRate) > 0) {
      return parseFloat(customRate);
    }
    return rateMode === 'parallel' ? selectedCurrency.parallelRate : selectedCurrency.officialRate;
  }, [selectedCurrency, rateMode, isCustomRateActive, customRate]);

  // Converted amount in DA
  const convertedDA = useMemo(() => {
    const val = parseFloat(foreignAmount);
    if (isNaN(val) || val <= 0) return 0;
    return Math.round(val * activeRate);
  }, [foreignAmount, activeRate]);

  if (!isOpen) return null;

  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (convertedDA <= 0) return;

    Haptics.tick();
    const fAmt = parseFloat(foreignAmount) || 0;
    const catId = selectedCategoryId || (categories[0]?.id || 'cat-1');
    const autoTitle = txTitle.trim() || `${selectedCurrency.code} Exchange (${fAmt} ${selectedCurrency.symbol} @ ${activeRate} ${currencyLabel})`;

    const newTx = {
      id: generateUUID(),
      type: txType,
      amount_minor: convertedDA * 100,
      category_id: catId,
      local_date: getTodayLocalDate(),
      notes: `${fAmt} ${selectedCurrency.code} converted at ${activeRate} ${currencyLabel}/${selectedCurrency.code} (${rateMode === 'parallel' ? 'Parallel Square' : 'Official Bank'})`,
      title: autoTitle,
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(draft => {
      draft.transactions.unshift(newTx);
    });

    onToast(`✓ Recorded ${txType}: ${convertedDA.toLocaleString()} ${currencyLabel} (${fAmt} ${selectedCurrency.code})`);
    onRefresh();
    onClose();
    Haptics.success();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4 shadow-2xl animate-scale-up max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Currency & FX Converter
              </h3>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Instant conversion & 1-click transaction logging
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Market Rate Type Selector */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] gap-1">
          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              setRateMode('parallel');
              setIsCustomRateActive(false);
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all tap-feedback ${
              rateMode === 'parallel' && !isCustomRateActive
                ? 'bg-[var(--color-accent)] text-[var(--color-bg)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Parallel / Square</span>
            <span className="block text-[10px] opacity-80 font-normal">Free Market</span>
          </button>

          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              setRateMode('official');
              setIsCustomRateActive(false);
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all tap-feedback ${
              rateMode === 'official' && !isCustomRateActive
                ? 'bg-[var(--color-accent)] text-[var(--color-bg)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Official Bank</span>
            <span className="block text-[10px] opacity-80 font-normal">Official Rate</span>
          </button>
        </div>

        {/* Currency Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {POPULAR_CURRENCIES.map(curr => (
            <button
              key={curr.code}
              type="button"
              onClick={() => {
                Haptics.tick();
                setSelectedCurrencyCode(curr.code);
                setIsCustomRateActive(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tap-feedback border flex items-center gap-1.5 ${
                selectedCurrencyCode === curr.code
                  ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] border-[var(--color-text-primary)]'
                  : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <span>{curr.flag}</span>
              <span>{curr.code}</span>
            </button>
          ))}
        </div>

        {/* Conversion Display Cards */}
        <div className="space-y-3">
          {/* Foreign Input Card */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-medium">
              <span>You pay / receive ({selectedCurrency.name})</span>
              <span className="text-[11px] font-bold text-[var(--color-accent)]">
                1 {selectedCurrency.code} = {activeRate} {currencyLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[var(--color-text-muted)]">
                {selectedCurrency.symbol}
              </span>
              <input
                type="number"
                step="any"
                value={foreignAmount}
                onChange={(e) => setForeignAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-xl font-extrabold text-[var(--color-text-primary)] focus:outline-none placeholder-[var(--color-text-muted)]"
              />
            </div>
          </div>

          {/* Equal Arrow */}
          <div className="flex items-center justify-center -my-1">
            <div className="w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Converted DA Output Card */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span>Equivalent in {currencyLabel}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {rateMode === 'parallel' ? 'Square Rate' : 'Bank Rate'}
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {convertedDA.toLocaleString()} <span className="text-sm font-semibold">{currencyLabel}</span>
            </div>
          </div>
        </div>

        {/* Custom Rate Accordion Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsCustomRateActive(!isCustomRateActive)}
            className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            <span>{isCustomRateActive ? 'Using custom rate' : 'Override exchange rate manually'}</span>
          </button>
          {isCustomRateActive && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                placeholder={`Current: ${activeRate}`}
                className="w-full px-3 py-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">{currencyLabel} / 1 {selectedCurrency.code}</span>
            </div>
          )}
        </div>

        {/* Record Transaction Section */}
        <form onSubmit={handleRecordTransaction} className="pt-3 border-t border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
              Log Directly to Ledger
            </h4>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setTxType('expense')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  txType === 'expense' ? 'bg-rose-500/20 text-rose-400' : 'text-[var(--color-text-muted)]'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setTxType('income')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  txType === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[var(--color-text-muted)]'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={txTitle}
              onChange={(e) => setTxTitle(e.target.value)}
              placeholder="Title (e.g. Netflix EU)"
              className="px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={convertedDA <= 0}
            className="w-full py-2.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 tap-feedback"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record {convertedDA.toLocaleString()} {currencyLabel} {txType === 'expense' ? 'Expense' : 'Income'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
