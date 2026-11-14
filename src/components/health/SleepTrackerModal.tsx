import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  BedDouble, 
  Moon, 
  Sun, 
  Clock, 
  Sparkles, 
  Check, 
  X, 
  Copy, 
  Download, 
  Zap, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { SleepService, SleepStats } from '../../services/sleepService';
import { getTodayLocalDate } from '../../services/storage';

interface SleepTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onRefresh?: () => void;
}

export const SleepTrackerModal: React.FC<SleepTrackerModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onRefresh,
}) => {
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [qualityScore, setQualityScore] = useState(4);
  const [notes, setNotes] = useState('');
  const [logsVersion, setLogsVersion] = useState(0);

  const stats: SleepStats = useMemo(() => {
    return SleepService.getSleepStats(7);
  }, [isOpen, logsVersion]);

  const currentDurationMinutes = useMemo(() => {
    return SleepService.calculateDurationMinutes(bedtime, wakeTime);
  }, [bedtime, wakeTime]);

  if (!isOpen) return null;

  const handleSaveSleep = (e: React.FormEvent) => {
    e.preventDefault();
    SleepService.recordSleep({
      bedtime,
      wake_time: wakeTime,
      quality_score: qualityScore,
      notes,
    });

    setLogsVersion(prev => prev + 1);
    if (onShowToast) onShowToast(`✓ Logged sleep: ${SleepService.formatMinutesToHours(currentDurationMinutes)}`);
    if (onRefresh) onRefresh();
  };

  const handleDownloadCSV = () => {
    const csv = SleepService.generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greendream_sleep_history_${getTodayLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Exported Sleep History (.CSV)');
  };

  const handleCopySummary = () => {
    const summary = `🌙 Sleep & Recovery Summary (${getTodayLocalDate()}):\n` +
      `7-Day Average: ${stats.averageHours}h / night (Target: ${stats.targetHours}h)\n` +
      `Sleep Debt: ${stats.sleepDebtHours > 0 ? `-${stats.sleepDebtHours}h debt` : `+${Math.abs(stats.sleepDebtHours)}h surplus`}\n` +
      `Average Quality: ${stats.averageQuality} / 5.0 ⭐\n` +
      `Days Logged: ${stats.loggedDaysCount} days`;

    navigator.clipboard.writeText(summary);
    if (onShowToast) onShowToast('📋 Sleep summary copied to clipboard!');
  };

  const QUALITY_CHOICES = [
    { score: 1, label: 'Restless', icon: '😫' },
    { score: 2, label: 'Fragmented', icon: '🥱' },
    { score: 3, label: 'Fair', icon: '😐' },
    { score: 4, label: 'Deep', icon: '😴' },
    { score: 5, label: 'Optimal', icon: '⚡' },
  ];

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
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-sm">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-1)] flex items-center gap-2">
                <span>Sleep & Recovery Optimizer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-mono font-bold border border-indigo-500/30">
                  Target: 8.0h
                </span>
              </h2>
              <p className="text-xs text-[var(--text-3)]">
                Track restorative rest, sleep debt vs 8h target, and nervous system recovery
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
          {/* Executive 3-Gauge Summary */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-center">
              <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-0.5">
                7-Day Average
              </span>
              <span className="text-lg sm:text-xl font-black text-indigo-400 font-mono">
                {stats.averageHours} <span className="text-xs font-normal text-[var(--text-3)]">hrs</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-center">
              <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-0.5">
                Sleep Debt
              </span>
              <span className={`text-lg sm:text-xl font-black font-mono ${
                stats.sleepDebtHours <= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {stats.sleepDebtHours <= 0 ? `+${Math.abs(stats.sleepDebtHours)}h` : `-${stats.sleepDebtHours}h`}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-center">
              <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-0.5">
                Avg Quality
              </span>
              <span className="text-lg sm:text-xl font-black text-[var(--text-1)] font-mono">
                {stats.averageQuality} <span className="text-xs font-normal text-amber-400">★</span>
              </span>
            </div>
          </div>

          {/* Daily Sleep Logger Card */}
          <form onSubmit={handleSaveSleep} className="p-4 rounded-2xl bg-[var(--surface-muted)] border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Log Today's Rest Session</span>
              </span>

              <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {SleepService.formatMinutesToHours(currentDurationMinutes)}
              </span>
            </div>

            {/* Bedtime & Wake Time Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-2)] flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Bedtime</span>
                </label>
                <input
                  type="time"
                  required
                  value={bedtime}
                  onChange={e => setBedtime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-2)] flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wake Up</span>
                </label>
                <input
                  type="time"
                  required
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quality Score Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-2)] block">
                Sleep Restfulness & Nervous System Recovery
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {QUALITY_CHOICES.map(c => {
                  const active = qualityScore === c.score;
                  return (
                    <button
                      key={c.score}
                      type="button"
                      onClick={() => setQualityScore(c.score)}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                        active
                          ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/50 scale-105 shadow-md'
                          : 'bg-[var(--surface)] text-[var(--text-3)] border border-[var(--hairline)] hover:text-white'
                      }`}
                    >
                      <span className="text-base">{c.icon}</span>
                      <span className="text-[10px] font-semibold">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Notes (e.g. Dark room, no screen after 22:00, woke refreshed)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-indigo-500 placeholder:text-[var(--text-3)]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all tap-feedback shadow-md shadow-indigo-500/20"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Sleep Measurement</span>
            </button>
          </form>

          {/* Recent History */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider block px-1">
              Sleep History (Past 7 Days)
            </span>

            {stats.recentEntries.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[var(--surface-muted)] text-center text-xs text-[var(--text-3)] border border-[var(--hairline)]">
                No sleep sessions logged yet. Log today's rest above to activate analytics!
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentEntries.map(s => {
                  const q = SleepService.getQualityInfo(s.quality_score);
                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-[var(--text-1)] flex items-center gap-2">
                          <span>{s.local_date}</span>
                          <span className="text-[11px] font-mono font-normal text-[var(--text-3)]">
                            {s.bedtime} → {s.wake_time}
                          </span>
                        </div>
                        {s.notes && (
                          <div className="text-[11px] text-[var(--text-3)] truncate max-w-xs">
                            {s.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${q.color}`}>
                          {q.icon} {q.label}
                        </span>
                        <span className="font-mono font-bold text-[var(--text-1)] text-xs">
                          {SleepService.formatMinutesToHours(s.duration_minutes)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--hairline)] bg-[var(--surface)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--surface)] text-[var(--text-1)] text-xs font-semibold flex items-center gap-2 border border-[var(--hairline)] transition-all"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Export Sleep History</span>
            <span>.CSV</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] text-[var(--text-2)] hover:text-[var(--text-1)] text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
