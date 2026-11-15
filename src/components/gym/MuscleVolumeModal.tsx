import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Activity, 
  X, 
  Flame, 
  Download, 
  Copy, 
  Sparkles, 
  CheckCircle2, 
  Dumbbell, 
  Target, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Info
} from 'lucide-react';
import { HypertrophyService, MuscleVolumeMetric } from '../../services/hypertrophyService';
import { getTodayLocalDate } from '../../services/storage';

interface MuscleVolumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const MuscleVolumeModal: React.FC<MuscleVolumeModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { metrics, totalWeeklySets, recommendedFocus, sessionsCount } = useMemo(() => {
    return HypertrophyService.getWeeklyMuscleVolumes();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadReport = () => {
    const md = HypertrophyService.generateReportMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greendream_muscle_volume_${getTodayLocalDate()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Downloaded Muscle Volume Report (.MD)');
  };

  const handleCopySummary = () => {
    const optimalCount = metrics.filter(m => m.status === 'optimal').length;
    const summary = `🏋️ Weekly Muscle Volume (${getTodayLocalDate()}):\n` +
      `Total Working Sets: ${totalWeeklySets} sets (${sessionsCount} sessions)\n` +
      `Optimal Growth Muscles: ${optimalCount} / ${metrics.length}\n` +
      `Next Recommended Focus: ${recommendedFocus}\n` +
      metrics.map(m => `• ${m.name}: ${m.directSets} sets (${m.statusLabel})`).join('\n');

    navigator.clipboard.writeText(summary);
    if (onShowToast) onShowToast('📋 Muscle volume summary copied to clipboard!');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80  animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--hairline)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--hairline)] bg-[var(--surface)]/90 ">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-1)] flex items-center gap-2">
                <span>Muscle Volume & Hypertrophy</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-mono font-bold border border-orange-500/30">
                  {totalWeeklySets} Sets / 7 Days
                </span>
              </h2>
              <p className="text-xs text-[var(--text-3)]">
                Direct weekly working sets per muscle group vs. optimal growth landmarks
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
          {/* Executive Strategy Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-950/30 via-[var(--surface-muted)] to-[var(--surface-muted)] border border-orange-500/30 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--hairline)]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block mb-0.5">
                  Total Working Sets
                </span>
                <span className="text-base sm:text-lg font-extrabold text-[var(--text-1)]">
                  {totalWeeklySets} <span className="text-[10px] font-normal text-[var(--text-3)]">sets</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--hairline)]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block mb-0.5">
                  Sessions Logged
                </span>
                <span className="text-base sm:text-lg font-extrabold text-orange-400">
                  {sessionsCount} <span className="text-[10px] font-normal text-orange-500/70">past 7d</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-emerald-500/20">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-0.5">
                  Next Priority
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-400 truncate block">
                  {recommendedFocus}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--text-2)] bg-black/30 p-2.5 rounded-xl border border-[var(--hairline)]">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                <strong>Smart Periodization Tip:</strong> Aim for <strong>10–18 direct sets</strong> per muscle group weekly to maximize hypertrophy without excessive joint fatigue.
              </span>
            </div>
          </div>

          {/* Muscle Volume Cards Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider block px-1">
              Muscle Group Volume Distribution
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {metrics.map(m => {
                const percentOfMax = Math.min(100, Math.round((m.directSets / m.targetMax) * 100));
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] hover:border-orange-500/30 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{m.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-1)]">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-3)]">
                            Target: {m.targetMin}–{m.targetMax} sets/wk
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.statusColor}`}>
                        {m.status === 'optimal' ? 'Optimal 🎯' : m.status === 'maintenance' ? 'Maintain' : m.status === 'high' ? 'High ⚠️' : 'Low'}
                      </span>
                    </div>

                    {/* Progress Bar & Counter */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="font-mono text-sm font-extrabold text-[var(--text-1)]">
                          {m.directSets} <span className="text-[10px] font-normal text-[var(--text-3)]">direct sets</span>
                        </span>
                        <span className="text-[11px] text-[var(--text-3)] font-mono">
                          {percentOfMax}% target
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--hairline)]">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            m.status === 'optimal' 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                              : m.status === 'maintenance'
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-400'
                                : m.status === 'high'
                                  ? 'bg-gradient-to-r from-amber-500 to-rose-400'
                                  : 'bg-zinc-600'
                          }`}
                          style={{ width: `${Math.max(4, percentOfMax)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--hairline)] bg-[var(--surface)] flex items-center justify-between gap-2">
          <span className="text-xs text-[var(--text-3)] hidden sm:inline">
            Aggregated dynamically from completed workout logs in the past 7 days
          </span>
          <button
            type="button"
            onClick={handleDownloadReport}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all tap-feedback shadow-md shadow-orange-500/20"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>Download Volume Report (.MD)</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
