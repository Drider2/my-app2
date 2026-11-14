import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Landmark, 
  X, 
  Check, 
  Copy, 
  Download, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  PieChart, 
  Car, 
  Coins, 
  Home, 
  Briefcase, 
  DollarSign,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { NetWorthService, NetWorthSummary } from '../../services/netWorthService';
import { db, formatCurrency, getTodayLocalDate } from '../../services/storage';
import { BalanceSheetAsset } from '../../types';

interface NetWorthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onShowToast?: (msg: string) => void;
}

export const NetWorthModal: React.FC<NetWorthModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  onShowToast,
}) => {
  const [dataVersion, setDataVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<'runway' | 'balance_sheet'>('runway');
  const [targetRunwayMonths, setTargetRunwayMonths] = useState<number>(6);

  // Asset Form
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<BalanceSheetAsset['category']>('bullion');
  const [assetValueDA, setAssetValueDA] = useState<number | ''>('');
  const [assetNotes, setAssetNotes] = useState('');

  // Liability Form
  const [liabilityName, setLiabilityName] = useState('');
  const [liabilityCreditor, setLiabilityCreditor] = useState('');
  const [liabilityAmountDA, setLiabilityAmountDA] = useState<number | ''>('');
  const [liabilityDueDate, setLiabilityDueDate] = useState('');
  const [liabilityNotes, setLiabilityNotes] = useState('');

  const summary: NetWorthSummary = useMemo(() => {
    return NetWorthService.getSummary(targetRunwayMonths);
  }, [targetRunwayMonths, dataVersion]);

  if (!isOpen) return null;

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim() || !assetValueDA || Number(assetValueDA) <= 0) return;

    NetWorthService.addCustomAsset(assetName, assetCategory, Number(assetValueDA), assetNotes);
    setAssetName('');
    setAssetValueDA('');
    setAssetNotes('');
    setDataVersion(v => v + 1);
    if (onRefresh) onRefresh();
    if (onShowToast) onShowToast('✓ Asset added to Balance Sheet');
  };

  const handleDeleteAsset = (id: string) => {
    NetWorthService.deleteCustomAsset(id);
    setDataVersion(v => v + 1);
    if (onRefresh) onRefresh();
    if (onShowToast) onShowToast('Asset removed from Balance Sheet');
  };

  const handleAddLiability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liabilityName.trim() || !liabilityAmountDA || Number(liabilityAmountDA) <= 0) return;

    NetWorthService.addCustomLiability(
      liabilityName,
      Number(liabilityAmountDA),
      liabilityCreditor,
      liabilityDueDate,
      liabilityNotes
    );
    setLiabilityName('');
    setLiabilityCreditor('');
    setLiabilityAmountDA('');
    setLiabilityDueDate('');
    setLiabilityNotes('');
    setDataVersion(v => v + 1);
    if (onRefresh) onRefresh();
    if (onShowToast) onShowToast('✓ Liability recorded on Balance Sheet');
  };

  const handleDeleteLiability = (id: string) => {
    NetWorthService.deleteCustomLiability(id);
    setDataVersion(v => v + 1);
    if (onRefresh) onRefresh();
    if (onShowToast) onShowToast('Liability removed from Balance Sheet');
  };

  const handleExportMd = () => {
    const md = NetWorthService.exportBalanceSheetMd(summary);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `networth_statement_${getTodayLocalDate()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Balance Sheet exported as Markdown');
  };

  const handleExportCsv = () => {
    const csv = NetWorthService.exportBalanceSheetCsv(summary);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `balance_sheet_${getTodayLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Balance Sheet exported as CSV');
  };

  const handleCopySummary = () => {
    const text = `🏛️ Net Worth & Runway Snapshot (${getTodayLocalDate()}):\n` +
      `• Net Worth: ${formatCurrency(summary.netWorthMinor)}\n` +
      `• Total Assets: ${formatCurrency(summary.totalAssetsMinor)} | Total Liabilities: ${formatCurrency(summary.totalLiabilitiesMinor)}\n` +
      `• Emergency Runway: ${summary.runwayMonths} Months (${summary.runwayStatus.label})\n` +
      `• Monthly Burn: ${formatCurrency(summary.monthlyBurnRateMinor)} / mo\n` +
      `• ${summary.targetRunwayMonths}-Month Goal: ${formatCurrency(summary.targetFundMinor)} (${summary.emergencyFundGapMinor >= 0 ? '+' : ''}${formatCurrency(summary.emergencyFundGapMinor)})`;

    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast('📋 Wealth summary copied to clipboard!');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <span>Net Worth & Emergency Runway</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                  {formatCurrency(summary.netWorthMinor)}
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Balance sheet assets, debt obligations & living expense survival runway
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
              title="Copy summary"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Gauge Executive Suite */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-0.5">
                Total Net Worth
              </span>
              <span className="text-base sm:text-lg font-black text-cyan-400 font-mono">
                {formatCurrency(summary.netWorthMinor)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-0.5">
                Emergency Runway
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                {summary.runwayMonths} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">mos</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-0.5">
                Monthly Burn Rate
              </span>
              <span className="text-base sm:text-lg font-black text-[var(--color-text-primary)] font-mono">
                {formatCurrency(summary.monthlyBurnRateMinor)}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Segmented Tab Switcher */}
        <div className="px-5 pt-3 pb-1 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('runway')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'runway'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-white bg-[var(--color-surface-subtle)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Emergency Runway Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('balance_sheet')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'balance_sheet'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-white bg-[var(--color-surface-subtle)]'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Balance Sheet (Assets & Debts)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'runway' ? (
            <>
              {/* Runway Status Hero Card */}
              <div className="p-5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Runway Protection Tier</span>
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${summary.runwayStatus.badgeClass}`}>
                    {summary.runwayStatus.label}
                  </span>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {summary.runwayStatus.advice}
                </p>

                {/* Runway Health Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] font-mono">
                    <span>0 mos</span>
                    <span>Target: {summary.targetRunwayMonths} mos</span>
                    <span>12+ mos</span>
                  </div>
                  <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-[var(--color-border)]">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-cyan-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (summary.runwayMonths / 12) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Target Runway Simulator Controls */}
              <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    Adjust Emergency Fund Target (Months)
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {targetRunwayMonths} Months
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 9, 12].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetRunwayMonths(m)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        targetRunwayMonths === m
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-white'
                      }`}
                    >
                      {m} Months
                    </button>
                  ))}
                </div>

                {/* Calculation Summary Table */}
                <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Current Liquid Reserve:</span>
                    <span className="font-bold text-[var(--color-text-primary)] font-mono">
                      {formatCurrency(summary.liquidCashMinor + summary.savingsBalanceMinor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">{targetRunwayMonths}-Month Required Buffer:</span>
                    <span className="font-bold text-cyan-400 font-mono">
                      {formatCurrency(summary.targetFundMinor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)] font-bold">
                    <span className="text-[var(--color-text-primary)]">Buffer Gap / Surplus:</span>
                    <span className={`font-mono ${summary.emergencyFundGapMinor >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {summary.emergencyFundGapMinor >= 0 ? '+' : ''}{formatCurrency(summary.emergencyFundGapMinor)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Balance Sheet: Assets & Liabilities */}
              
              {/* Assets Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Assets ({summary.assets.length})</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {formatCurrency(summary.totalAssetsMinor)}
                  </span>
                </div>

                {/* Add Custom Asset Form */}
                <form onSubmit={handleAddAsset} className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2.5">
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)] block">
                    + Add Non-Cash Asset (Gold, Vehicle, Real Estate, Receivables)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Asset name (e.g. Car)"
                      required
                      value={assetName}
                      onChange={e => setAssetName(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500"
                    />

                    <select
                      value={assetCategory}
                      onChange={e => setAssetCategory(e.target.value as any)}
                      className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500"
                    >
                      <option value="bullion">Gold / Bullion 🪙</option>
                      <option value="vehicle">Vehicle 🚗</option>
                      <option value="real_estate">Real Estate 🏠</option>
                      <option value="investment">Investment / Stocks 📈</option>
                      <option value="other">Other Asset 💼</option>
                    </select>

                    <input
                      type="number"
                      placeholder="Value in DA"
                      required
                      value={assetValueDA}
                      onChange={e => setAssetValueDA(e.target.value === '' ? '' : Number(e.target.value))}
                      className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-mono font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Optional notes or details"
                      value={assetNotes}
                      onChange={e => setAssetNotes(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-all tap-feedback"
                    >
                      Add Asset
                    </button>
                  </div>
                </form>

                {/* Assets List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {summary.assets.map(a => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[var(--color-text-primary)] block">{a.name}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                          {a.category.replace('_', ' ')} {a.is_auto_synced && '• Auto-synced'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-400 font-mono">
                          {formatCurrency(a.value_minor)}
                        </span>
                        {!a.is_auto_synced && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(a.id)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-rose-400 transition-colors"
                            title="Delete asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liabilities Section */}
              <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Liabilities & Debts ({summary.liabilities.length})</span>
                  </span>
                  <span className="text-xs font-bold text-rose-400 font-mono">
                    {formatCurrency(summary.totalLiabilitiesMinor)}
                  </span>
                </div>

                {/* Add Custom Liability Form */}
                <form onSubmit={handleAddLiability} className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2.5">
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)] block">
                    + Add Debt or Liability (Loans borrowed, unpaid invoices)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Debt description"
                      required
                      value={liabilityName}
                      onChange={e => setLiabilityName(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500"
                    />

                    <input
                      type="text"
                      placeholder="Lender / Creditor"
                      value={liabilityCreditor}
                      onChange={e => setLiabilityCreditor(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500"
                    />

                    <input
                      type="number"
                      placeholder="Amount in DA"
                      required
                      value={liabilityAmountDA}
                      onChange={e => setLiabilityAmountDA(e.target.value === '' ? '' : Number(e.target.value))}
                      className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-mono font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={liabilityDueDate}
                      onChange={e => setLiabilityDueDate(e.target.value)}
                      className="w-44 px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={liabilityNotes}
                      onChange={e => setLiabilityNotes(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all tap-feedback"
                    >
                      Add Debt
                    </button>
                  </div>
                </form>

                {/* Liabilities List */}
                {summary.liabilities.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)]">
                    🎉 No active liabilities or debts recorded. 100% debt-free!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {summary.liabilities.map(l => (
                      <div
                        key={l.id}
                        className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[var(--color-text-primary)] block">{l.name}</span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            Creditor: {l.creditor || 'Private'} {l.due_date && `• Due: ${l.due_date}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-rose-400 font-mono">
                            {formatCurrency(l.amount_minor)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteLiability(l.id)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-rose-400 transition-colors"
                            title="Delete liability"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer with Exports */}
        <div className="p-4 sm:p-5 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
            Cash, savings & receivables automatically synchronized from live double-entry ledger
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportMd}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] flex items-center justify-center gap-1.5 transition-all tap-feedback"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Statement (.MD)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] flex items-center justify-center gap-1.5 transition-all tap-feedback"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
