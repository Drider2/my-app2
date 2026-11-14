import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoonStar, 
  X, 
  Scale, 
  Coins, 
  Download, 
  Copy, 
  Check, 
  AlertCircle, 
  HeartHandshake, 
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { ZakatService, ZakatCalculationInput } from '../../services/zakatService';
import { FinanceService } from '../../services/financeService';
import { getTodayLocalDate } from '../../services/storage';

interface ZakatCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onRefresh?: () => void;
}

export const ZakatCalculatorModal: React.FC<ZakatCalculatorModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onRefresh,
}) => {
  // Pull live metrics for default cash
  const defaultCash = useMemo(() => {
    try {
      const summary = FinanceService.getCashBalanceSummary();
      return Math.max(0, Math.round((summary.availableCashMinor || 0) / 100));
    } catch (e) {
      return 0;
    }
  }, [isOpen]);

  const [cash, setCash] = useState<number>(defaultCash);
  const [goldSilver, setGoldSilver] = useState<number>(0);
  const [tradeGoods, setTradeGoods] = useState<number>(0);
  const [receivables, setReceivables] = useState<number>(0);
  const [debtsOwed, setDebtsOwed] = useState<number>(0);
  const [nisab, setNisab] = useState<number>(ZakatService.DEFAULT_NISAB_GOLD_DA);
  
  // Quick payment logger sub-form
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payType, setPayType] = useState<'zakat' | 'sadaqah'>('zakat');
  const [payNotes, setPayNotes] = useState<string>('');

  const monthlySadaqah = useMemo(() => {
    return ZakatService.getMonthlySadaqahStats();
  }, [isOpen, isLoggingPayment]);

  const input: ZakatCalculationInput = {
    cashInHandBank: Number(cash) || 0,
    goldSilverValue: Number(goldSilver) || 0,
    tradeGoodsValue: Number(tradeGoods) || 0,
    receivablesOwedToYou: Number(receivables) || 0,
    immediateDebtsOwed: Number(debtsOwed) || 0,
    nisabThresholdDA: Number(nisab) || ZakatService.DEFAULT_NISAB_GOLD_DA,
  };

  const result = useMemo(() => {
    return ZakatService.calculateZakat(input);
  }, [input.cashInHandBank, input.goldSilverValue, input.tradeGoodsValue, input.receivablesOwedToYou, input.immediateDebtsOwed, input.nisabThresholdDA]);

  if (!isOpen) return null;

  const handleDownloadReport = () => {
    const md = ZakatService.generateZakatReportMarkdown(input, result);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greendream_zakat_statement_${getTodayLocalDate()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Downloaded Zakat Statement (.MD)');
  };

  const handleCopySummary = () => {
    const text = `🌙 Islamic Zakat al-Mal Statement (${getTodayLocalDate()}):\n` +
      `Net Zakatable Wealth: ${result.netZakatableWealth.toLocaleString()} DA\n` +
      `Nisab Benchmark: ${result.nisabThreshold.toLocaleString()} DA\n` +
      `Obligation: ${result.isZakatObligatory ? 'ZAKAT DUE' : 'Below Nisab'}\n` +
      `Amount Due (2.5%): ${result.zakatDueDA.toLocaleString()} DA\n` +
      `Sadaqah this month: ${monthlySadaqah.totalContributedDA.toLocaleString()} / ${monthlySadaqah.monthlyTargetDA.toLocaleString()} DA`;

    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast('📋 Zakat summary copied to clipboard!');
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      if (onShowToast) onShowToast('⚠️ Please enter a valid payment amount.');
      return;
    }

    ZakatService.recordCharityPayment(amt, payType, payNotes);
    if (onShowToast) onShowToast(`✓ Recorded ${payType === 'zakat' ? 'Zakat' : 'Sadaqah'} payment of ${amt.toLocaleString()} DA!`);
    if (onRefresh) onRefresh();
    setIsLoggingPayment(false);
    setPayAmount('');
    setPayNotes('');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--hairline)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--hairline)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-sm">
              <MoonStar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-1)] flex items-center gap-2">
                <span>Zakat al-Mal & Charity Desk</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold border border-emerald-500/30">
                  2.5% Rate
                </span>
              </h2>
              <p className="text-xs text-[var(--text-3)]">
                Annual wealth purification, Nisab benchmark, and monthly Sadaqah tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-muted)] transition-colors"
              title="Copy summary"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-muted)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Executive Verdict Banner */}
          <div className={`p-4 rounded-2xl border transition-all ${
            result.isZakatObligatory 
              ? 'bg-gradient-to-br from-emerald-950/40 via-[var(--surface-muted)] to-[var(--surface-muted)] border-emerald-500/40' 
              : 'bg-[var(--surface-muted)] border-[var(--hairline)]'
          }`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block mb-0.5">
                  Annual Zakat Due (2.5%)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  {result.zakatDueDA.toLocaleString()} <span className="text-xs font-semibold text-emerald-500/80">DA</span>
                </div>
              </div>

              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                result.isZakatObligatory
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {result.isZakatObligatory ? 'Zakat Obligatory 🌙' : 'Below Nisab ✨'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--hairline)]">
              <div>
                <span className="text-[10px] text-[var(--text-3)] block">Net Zakatable Wealth:</span>
                <span className="font-bold text-[var(--text-1)] font-mono">{result.netZakatableWealth.toLocaleString()} DA</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--text-3)] block">Nisab Benchmark (85g Gold):</span>
                <span className="font-bold text-[var(--text-1)] font-mono">{result.nisabThreshold.toLocaleString()} DA</span>
              </div>
            </div>
          </div>

          {/* Monthly Sadaqah Progress Card */}
          <div className="p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5 uppercase tracking-wider">
                <HeartHandshake className="w-4 h-4 text-emerald-400" />
                <span>Monthly Sadaqah & Charity Goal</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLoggingPayment(prev => !prev);
                  setPayType('sadaqah');
                }}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isLoggingPayment ? 'Cancel' : 'Log Donation'}</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-[var(--text-1)]">
                  {monthlySadaqah.totalContributedDA.toLocaleString()} DA <span className="text-[10px] font-normal text-[var(--text-3)]">contributed this month</span>
                </span>
                <span className="text-[11px] font-mono text-[var(--text-3)]">
                  Target: {monthlySadaqah.monthlyTargetDA.toLocaleString()} DA ({monthlySadaqah.percentReached}%)
                </span>
              </div>
              <div className="h-2 w-full bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--hairline)]">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(3, monthlySadaqah.percentReached)}%` }}
                />
              </div>
            </div>

            {/* Quick Payment Form */}
            {isLoggingPayment && (
              <form onSubmit={handleRecordPayment} className="p-3.5 rounded-xl bg-[var(--surface)] border border-emerald-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPayType('zakat')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      payType === 'zakat' 
                        ? 'bg-emerald-500 text-black' 
                        : 'bg-[var(--surface-muted)] text-[var(--text-3)]'
                    }`}
                  >
                    Zakat al-Mal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayType('sadaqah')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      payType === 'sadaqah' 
                        ? 'bg-emerald-500 text-black' 
                        : 'bg-[var(--surface-muted)] text-[var(--text-3)]'
                    }`}
                  >
                    Voluntary Sadaqah
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="100"
                    required
                    placeholder="Amount (DA)"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Notes (e.g. Mosque, Food basket)"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all tap-feedback"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Record in Finance Ledger</span>
                </button>
              </form>
            )}
          </div>

          {/* Zakatable Assets Inputs */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider block px-1">
              1. Zakatable Assets (Surplus Wealth)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-2)] flex items-center justify-between">
                  <span>Cash in Hand & Bank Accounts</span>
                  <span className="text-[10px] text-emerald-400">Live Sync</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={cash}
                    onChange={e => setCash(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-[var(--text-3)] font-mono">DA</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-2)]">
                  Gold & Silver (Investment / Bullion)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={goldSilver}
                    onChange={e => setGoldSilver(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-[var(--text-3)] font-mono">DA</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-2)]">
                  Trade Goods & Business Inventory
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={tradeGoods}
                    onChange={e => setTradeGoods(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-[var(--text-3)] font-mono">DA</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-2)]">
                  Receivables (Good Loans Owed to You)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={receivables}
                    onChange={e => setReceivables(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-[var(--text-3)] font-mono">DA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deductible Liabilities & Nisab */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider block px-1">
              2. Deductible Liabilities & Benchmark
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] space-y-1.5">
                <label className="text-xs font-semibold text-rose-400">
                  Immediate Debts & Due Bills (Deduction)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={debtsOwed}
                    onChange={e => setDebtsOwed(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-[var(--text-3)] font-mono">DA</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-2)]">
                  Nisab Threshold (85g Gold standard)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={nisab}
                    onChange={e => setNisab(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-[var(--text-3)] font-mono">DA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--hairline)] bg-[var(--surface)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadReport}
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--surface)] text-[var(--text-1)] text-xs font-semibold flex items-center gap-2 border border-[var(--hairline)] transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export Statement</span>
            <span>.MD</span>
          </button>

          <div className="flex items-center gap-2">
            {result.isZakatObligatory && !isLoggingPayment && (
              <button
                type="button"
                onClick={() => {
                  setPayAmount(String(result.zakatDueDA));
                  setPayType('zakat');
                  setIsLoggingPayment(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-1.5 transition-all tap-feedback shadow-md shadow-emerald-500/20"
              >
                <span>Pay Zakat ({result.zakatDueDA.toLocaleString()} DA)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] text-[var(--text-2)] hover:text-[var(--text-1)] text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
