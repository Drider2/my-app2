import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  BookOpen, 
  Bookmark, 
  Sparkles, 
  Check, 
  X, 
  Copy, 
  Download, 
  Plus, 
  ArrowRight, 
  Trophy, 
  RotateCcw,
  Clock
} from 'lucide-react';
import { QuranService, JUZ_LIST } from '../../services/quranService';
import { getTodayLocalDate } from '../../services/storage';

interface QuranKhatmahModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onRefresh?: () => void;
}

export const QuranKhatmahModal: React.FC<QuranKhatmahModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onRefresh,
}) => {
  const [version, setVersion] = useState(0);
  const [customPage, setCustomPage] = useState<string>('');
  const [readingNote, setReadingNote] = useState<string>('');

  const metrics = useMemo(() => {
    return QuranService.getKhatmahMetrics();
  }, [isOpen, version]);

  const state = useMemo(() => {
    return QuranService.getKhatmahState();
  }, [isOpen, version]);

  if (!isOpen) return null;

  const handleAddPages = (delta: number, label: string) => {
    const updated = QuranService.addPages(delta, readingNote || label);
    setVersion(prev => prev + 1);
    setReadingNote('');
    if (onShowToast) onShowToast(`✓ Added ${delta} pages! Now on Page ${updated.current_page} (Juz ${QuranService.getJuzForPage(updated.current_page).juzNumber})`);
    if (onRefresh) onRefresh();
  };

  const handleSetCustomPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(customPage, 10);
    if (isNaN(p) || p < 1 || p > 604) {
      if (onShowToast) onShowToast('⚠️ Please enter a valid page number between 1 and 604.');
      return;
    }

    const updated = QuranService.updateCurrentPage(p, readingNote || 'Direct page update');
    setVersion(prev => prev + 1);
    setCustomPage('');
    setReadingNote('');
    if (onShowToast) onShowToast(`✓ Bookmark updated to Page ${updated.current_page}!`);
    if (onRefresh) onRefresh();
  };

  const handleCompleteKhatmah = () => {
    if (confirm('Complete this Khatmah? Your completed count will increment and your reading will reset to Page 1 for your next cycle.')) {
      const updated = QuranService.completeKhatmah('Al-Hamdulillah! Completed full Quran recitation.');
      setVersion(prev => prev + 1);
      if (onShowToast) onShowToast(`🌟 Mabrook! Khatmah #${updated.khatmah_count} completed! May Allah accept it.`);
      if (onRefresh) onRefresh();
    }
  };

  const handleDownloadCSV = () => {
    const csv = QuranService.generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greendream_quran_khatmah_${getTodayLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Exported Quran Reading Log (.CSV)');
  };

  const handleCopySummary = () => {
    const text = `📖 Quran Khatmah Progress (${getTodayLocalDate()}):\n` +
      `Current: Page ${metrics.currentPage} / 604 (${metrics.percentCompleted}%)\n` +
      `Juz: ${metrics.currentJuz.juzNumber} - ${metrics.currentJuz.juzName}\n` +
      `Pages Remaining: ${metrics.pagesRemaining} pages\n` +
      `Daily Goal: ${metrics.dailyGoal} pages/day (${metrics.estimatedDaysRemaining} days to finish)\n` +
      `Completed Khatmahs: ${metrics.khatmahCount} 🌟`;

    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast('📋 Quran progress copied to clipboard!');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80  animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--hairline)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--hairline)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-1)] flex items-center gap-2">
                <span>Quran Recitation & Khatmah</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold border border-emerald-500/30">
                  {metrics.percentCompleted}% Done
                </span>
              </h2>
              <p className="text-xs text-[var(--text-3)]">
                Daily recitation log, Juz milestones, and completion pace
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
          {/* Executive Khatmah Progress Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[var(--surface-muted)] to-[var(--surface-muted)] border border-emerald-500/30 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-0.5">
                  Current Position
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[var(--text-1)] font-mono">
                  Page {metrics.currentPage} <span className="text-xs font-semibold text-[var(--text-3)]">/ 604</span>
                </div>
                <div className="text-xs font-semibold text-emerald-300 mt-1 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                  <span>Juz {metrics.currentJuz.juzNumber} • {metrics.currentJuz.juzName}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-3)] block mb-0.5">
                  Estimated Pace
                </span>
                <span className="text-sm font-bold text-amber-400 font-mono block">
                  {metrics.estimatedDaysRemaining} days remaining
                </span>
                <span className="text-[11px] text-[var(--text-3)] font-mono">
                  Goal: {metrics.dailyGoal} pgs/day
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-400 font-mono">{metrics.percentCompleted}% Completed</span>
                <span className="text-[var(--text-3)] font-mono">{metrics.pagesRemaining} pages to go</span>
              </div>
              <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-emerald-500/20">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(2, metrics.percentCompleted)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stepper Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider block px-1">
              1-Tap Quick Recitation Add
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleAddPages(1, '+1 Page')}
                className="p-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--hairline)] hover:border-emerald-500/40 text-center transition-all tap-feedback"
              >
                <span className="text-base font-extrabold text-[var(--text-1)] block font-mono">+1</span>
                <span className="text-[10px] text-[var(--text-3)]">Page</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddPages(4, 'Post-Prayer Recitation (+4 pgs)')}
                className="p-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-emerald-500/30 hover:border-emerald-500/50 text-center transition-all tap-feedback shadow-sm"
              >
                <span className="text-base font-extrabold text-emerald-400 block font-mono">+4</span>
                <span className="text-[10px] text-[var(--text-3)]">Post-Prayer</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddPages(10, '+10 Pages (1/2 Juz)')}
                className="p-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--hairline)] hover:border-emerald-500/40 text-center transition-all tap-feedback"
              >
                <span className="text-base font-extrabold text-[var(--text-1)] block font-mono">+10</span>
                <span className="text-[10px] text-[var(--text-3)]">Half Juz</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddPages(20, '+20 Pages (Full Juz)')}
                className="p-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--hairline)] hover:border-emerald-500/40 text-center transition-all tap-feedback"
              >
                <span className="text-base font-extrabold text-amber-400 block font-mono">+20</span>
                <span className="text-[10px] text-[var(--text-3)]">Full Juz</span>
              </button>
            </div>
          </div>

          {/* Jump to Specific Page Form */}
          <form onSubmit={handleSetCustomPage} className="p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] space-y-3">
            <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block">
              Set Exact Bookmark Page
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                max="604"
                placeholder={`Current: ${metrics.currentPage} (1-604)`}
                value={customPage}
                onChange={e => setCustomPage(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
              <input
                type="text"
                placeholder="Reading notes (optional)..."
                value={readingNote}
                onChange={e => setReadingNote(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-emerald-500 placeholder:text-[var(--text-3)]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all tap-feedback"
            >
              Update Bookmark
            </button>
          </form>

          {/* Milestones & History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider">
                Recitation Journey & History
              </span>

              {metrics.currentPage >= 580 && (
                <button
                  type="button"
                  onClick={handleCompleteKhatmah}
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-[11px] flex items-center gap-1 transition-all shadow-md"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Complete Khatmah 🌟</span>
                </button>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-[var(--text-1)]">
                  {metrics.khatmahCount} {metrics.khatmahCount === 1 ? 'Khatmah' : 'Khatmahs'} Completed
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                Pages read today: {metrics.pagesReadToday} pgs
              </span>
            </div>

            {/* Recent History Table */}
            {state.history && state.history.length > 0 && (
              <div className="space-y-1.5">
                {state.history.slice(0, 5).map(r => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl bg-[var(--surface-muted)]/70 border border-[var(--hairline)] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--text-2)]">{r.local_date}</span>
                      {r.note && <span className="text-[var(--text-3)] text-[11px] truncate max-w-xs">{r.note}</span>}
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-emerald-400 font-bold">+{r.pages_read} pgs</span>
                      <span className="text-[var(--text-3)] text-[11px]">(Page {r.ending_page})</span>
                    </div>
                  </div>
                ))}
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
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export Reading Log</span>
            <span>.CSV</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-all tap-feedback shadow-md shadow-emerald-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
