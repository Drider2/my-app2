import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoonStar, 
  X, 
  Check, 
  Clock, 
  Calendar, 
  Download, 
  Copy, 
  Sparkles, 
  Utensils, 
  Coffee, 
  Flame, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sun,
  Zap,
  Activity,
  Heart,
  Play,
  Square,
  Award
} from 'lucide-react';
import { 
  FastingService, 
  FASTING_TYPE_LABELS, 
  FastingCountdown, 
  FastingProtocolPreset, 
  MetabolicStage,
  IntermittentSessionProgress 
} from '../../services/fastingService';
import { PrayerService } from '../../services/prayerService';
import { db, getTodayLocalDate } from '../../services/storage';
import { FastingType, FastingDayEntry, IntermittentProtocol, ActiveFastingSession } from '../../types';

interface FastingTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onShowToast?: (msg: string) => void;
}

export const FastingTrackerModal: React.FC<FastingTrackerModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  onShowToast,
}) => {
  const [dataVersion, setDataVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<'islamic' | 'intermittent'>('islamic');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedType, setSelectedType] = useState<FastingType>('sunnah_monday_thursday');
  const [selectedProtocol, setSelectedProtocol] = useState<IntermittentProtocol>('16_8');
  const [customHours, setCustomHours] = useState<number>(16);

  const todayStr = getTodayLocalDate();

  // Prayer times for today
  const prayerData = useMemo(() => {
    return PrayerService.getPrayersForDate(todayStr);
  }, [todayStr]);

  const fajrStr = prayerData.records.find(r => r.prayer === 'fajr')?.time || '05:32';
  const maghribStr = prayerData.records.find(r => r.prayer === 'maghrib')?.time || '17:55';

  // Tick timer every second
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Live Islamic countdown
  const countdown: FastingCountdown = useMemo(() => {
    return FastingService.calculateCountdown(fajrStr, maghribStr, currentTime);
  }, [fajrStr, maghribStr, currentTime]);

  // Today's fasting entry
  const todayEntry: FastingDayEntry | undefined = useMemo(() => {
    return FastingService.getEntryForDate(todayStr);
  }, [todayStr, dataVersion]);

  // Active intermittent fasting session
  const activeSession: ActiveFastingSession | null = useMemo(() => {
    return FastingService.getActiveSession();
  }, [dataVersion]);

  // Intermittent session progress
  const intermittentProgress: IntermittentSessionProgress | null = useMemo(() => {
    if (!activeSession) return null;
    return FastingService.calculateSessionProgress(activeSession, currentTime.getTime());
  }, [activeSession, currentTime]);

  // History entries
  const allEntries = useMemo(() => {
    return FastingService.getEntries();
  }, [dataVersion]);

  // Stats
  const stats = useMemo(() => {
    return FastingService.getStats();
  }, [dataVersion]);

  if (!isOpen) return null;

  const handleToggleFastToday = () => {
    const res = FastingService.toggleFastToday(selectedType);
    setDataVersion(v => v + 1);
    if (onRefresh) onRefresh();
    if (onShowToast) {
      onShowToast(res.completed ? '✓ Fasting marked as ACTIVE for today!' : 'Fasting unmarked for today');
    }
  };

  const handleToggleSuhur = () => {
    if (!todayEntry) return;
    FastingService.toggleSuhur(todayStr);
    setDataVersion(v => v + 1);
    if (onRefresh) onRefresh();
  };

  const handleToggleIftar = () => {
    if (!todayEntry) return;
    FastingService.toggleIftar(todayStr);
    setDataVersion(v => v + 1);
    if (onRefresh) onRefresh();
  };

  const handleStartIntermittentFast = (preset: FastingProtocolPreset) => {
    FastingService.startFastingSession(preset.fastingHours, preset.id);
    setDataVersion(v => v + 1);
    if (onRefresh) onRefresh();
    if (onShowToast) {
      onShowToast(`⚡ Started ${preset.name} Fast! Target: ${preset.fastingHours}h`);
    }
  };

  const handleStopIntermittentFast = () => {
    const res = FastingService.stopActiveSession(true);
    setDataVersion(v => v + 1);
    if (onRefresh) onRefresh();
    if (onShowToast) {
      onShowToast('✓ Intermittent fast ended and logged to records!');
    }
  };

  const handleExportCSV = () => {
    const csv = FastingService.exportLedgerCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greendream_fasting_ledger_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Exported Fasting Ledger to CSV');
  };

  const handleCopySummary = () => {
    let summary = `🌙 Fasting Status (${todayStr}):\n`;
    if (activeTab === 'islamic') {
      summary += `Status: ${todayEntry?.completed ? 'Fasting Active' : 'Not Fasting'}\n` +
        `Countdown: ${countdown.hours}h ${countdown.minutes}m until ${countdown.targetLabel}\n` +
        `Fajr (Imsak): ${fajrStr} | Maghrib (Iftar): ${maghribStr}\n` +
        `Total Fasted: ${stats.totalFasted} days (Current Streak: ${stats.currentStreak} days)`;
    } else {
      if (intermittentProgress) {
        summary += `Active Protocol: ${activeSession?.protocol.replace('_', ':')} (${activeSession?.target_hours}h target)\n` +
          `Elapsed: ${intermittentProgress.formattedElapsed} (${intermittentProgress.progressPercent.toFixed(0)}%)\n` +
          `Stage: ${intermittentProgress.currentStage.name} (${intermittentProgress.currentStage.headline})\n` +
          `Remaining: ${intermittentProgress.formattedRemaining}`;
      } else {
        summary += 'No active intermittent fast currently in progress.';
      }
    }
    navigator.clipboard.writeText(summary);
    if (onShowToast) onShowToast('📋 Fasting summary copied to clipboard!');
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
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-sm">
              <MoonStar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <span>Fasting Desk & Protocols</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono font-bold border border-amber-500/30">
                  {stats.totalFasted} Days Total
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Sunnah & Ramadan schedule, Intermittent fasting & metabolic stages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
              title="Copy status summary"
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

        {/* Mode Segmented Tab Switcher */}
        <div className="px-5 pt-3 pb-1 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('islamic')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'islamic'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-white bg-[var(--color-surface-subtle)]'
            }`}
          >
            <MoonStar className="w-3.5 h-3.5" />
            <span>Islamic & Sunnah Fast</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('intermittent')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'intermittent'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-white bg-[var(--color-surface-subtle)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Intermittent Fasting & Stages</span>
            {activeSession && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'islamic' ? (
            <>
              {/* Hero Live Countdown Banner (Islamic) */}
              <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
                countdown.isFastingNow 
                  ? 'bg-gradient-to-br from-emerald-950/40 via-[var(--color-surface-subtle)] to-[var(--color-surface-subtle)] border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                  : 'bg-gradient-to-br from-amber-950/30 via-[var(--color-surface-subtle)] to-[var(--color-surface-subtle)] border-amber-500/30 shadow-lg shadow-amber-500/5'
              }`}>
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                      countdown.isFastingNow ? 'bg-emerald-400' : 'bg-amber-400'
                    }`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      countdown.isFastingNow ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {countdown.isFastingNow ? 'Fast Active (Daytime Window)' : 'Eating & Rest Window (Nighttime)'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                    Countdown to {countdown.targetLabel}
                  </span>
                </div>

                {/* Giant Live Countdown Display */}
                <div className="py-2 text-center">
                  <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] flex items-center justify-center gap-1 sm:gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-[var(--color-border)]">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[var(--color-text-muted)]">:</span>
                    <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-[var(--color-border)]">
                      {String(countdown.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[var(--color-text-muted)]">:</span>
                    <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-[var(--color-border)] text-emerald-400">
                      {String(countdown.seconds).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-8 text-[10px] uppercase font-bold tracking-widest text-[var(--color-text-muted)] pt-1.5">
                    <span>Hours</span>
                    <span>Minutes</span>
                    <span>Seconds</span>
                  </div>
                </div>

                {/* Daytime Progress Bar */}
                <div className="space-y-1.5 pt-3">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-medium">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Imsak (Fajr): <strong className="text-[var(--color-text-primary)] font-mono">{fajrStr}</strong></span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MoonStar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Iftar (Maghrib): <strong className="text-[var(--color-text-primary)] font-mono">{maghribStr}</strong></span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-[var(--color-border)]">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${countdown.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Today's Action Desk */}
              <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                      Today's Fasting Check-in
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {todayStr} ({new Date().toLocaleDateString(undefined, { weekday: 'long' })})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleFastToday}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 tap-feedback shadow-sm ${
                      todayEntry?.completed
                        ? 'bg-emerald-500 text-black hover:bg-emerald-600 shadow-emerald-500/20'
                        : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-emerald-500/40 hover:text-emerald-400'
                    }`}
                  >
                    {todayEntry?.completed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Fasting Active Today</span>
                      </>
                    ) : (
                      <>
                        <MoonStar className="w-4 h-4 text-amber-400" />
                        <span>I Am Fasting Today</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Fasting Category Selector */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-muted)] block">
                    Select Fasting Type
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {(Object.keys(FASTING_TYPE_LABELS) as FastingType[]).map(key => {
                      const item = FASTING_TYPE_LABELS[key];
                      const isSelected = (todayEntry?.type || selectedType) === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedType(key);
                            if (todayEntry) {
                              FastingService.updateEntry(todayEntry.id, { type: key });
                              setDataVersion(v => v + 1);
                            }
                          }}
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all text-left border ${
                            isSelected 
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm' 
                              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                          }`}
                        >
                          <span className="text-sm">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Suhur & Iftar Check-in Buttons */}
                {todayEntry?.completed && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={handleToggleSuhur}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        todayEntry.suhur_completed
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      <span>{todayEntry.suhur_completed ? '✓ Suhur Eaten' : 'Log Suhur'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleIftar}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        todayEntry.iftar_completed
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>{todayEntry.iftar_completed ? '✓ Iftar Broken' : 'Log Iftar'}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Intermittent Fasting Mode */}
              {activeSession && intermittentProgress ? (
                /* Active Session Dashboard */
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[var(--color-surface-subtle)] to-[var(--color-surface-subtle)] border border-emerald-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Active Fast ({activeSession.protocol.replace('_', ':')})
                      </span>
                    </div>

                    <span className="text-[11px] font-mono font-bold text-amber-300">
                      Target: {activeSession.target_hours} Hours
                    </span>
                  </div>

                  {/* Big Timer */}
                  <div className="text-center py-2">
                    <div className="font-mono text-3xl sm:text-4xl font-black text-white">
                      {intermittentProgress.formattedElapsed}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {intermittentProgress.isTargetReached ? (
                        <span className="text-emerald-400 font-bold">🎉 Target achieved! You can safely break fast or extend.</span>
                      ) : (
                        <span>Remaining: <strong className="text-[var(--color-text-primary)] font-mono">{intermittentProgress.formattedRemaining}</strong></span>
                      )}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
                      <span>0h Started</span>
                      <span className="font-bold text-emerald-400 font-mono">{intermittentProgress.progressPercent.toFixed(0)}%</span>
                      <span>{activeSession.target_hours}h Target</span>
                    </div>
                    <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-[var(--color-border)]">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all rounded-full"
                        style={{ width: `${intermittentProgress.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Current Metabolic Stage Card */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>Current Metabolic Stage</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${intermittentProgress.currentStage.badgeClass}`}>
                        {intermittentProgress.currentStage.name}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {intermittentProgress.currentStage.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {intermittentProgress.currentStage.benefits.map((b, bIdx) => (
                        <span key={bIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-cyan-300 font-medium">
                          ✓ {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stop / Complete Button */}
                  <button
                    type="button"
                    onClick={handleStopIntermittentFast}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all tap-feedback shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>End Fast & Record Session</span>
                  </button>
                </div>
              ) : (
                /* Start Fast Presets Picker */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
                    <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                      Choose Your Intermittent Fasting Protocol
                    </span>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Select a proven fasting window to trigger live metabolic tracking and cellular repair timers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {FastingService.PROTOCOLS.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[var(--color-text-primary)]">
                              {preset.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {preset.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--color-text-secondary)] leading-snug">
                            {preset.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]">
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                            {preset.fastingHours}h Fast • {preset.eatingHours}h Eat
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartIntermittentFast(preset)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all tap-feedback"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Start Fast</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metabolic Stages Timeline Reference */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider block px-1">
                  Metabolic Fasting Timeline & Milestones
                </span>

                <div className="space-y-2">
                  {FastingService.METABOLIC_STAGES.map((stage) => (
                    <div
                      key={stage.id}
                      className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-center shrink-0 min-w-[54px]">
                        <span className="text-xs font-black font-mono text-[var(--color-text-primary)] block">
                          {stage.minHours}h
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[var(--color-text-muted)] block">
                          {stage.maxHours < 100 ? `${stage.maxHours}h` : 'Max'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--color-text-primary)]">
                            {stage.name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${stage.badgeClass}`}>
                            {stage.headline}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-muted)] block mb-0.5">
                Total Fasted
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[var(--color-text-primary)]">
                {stats.totalFasted} <span className="text-xs font-normal text-[var(--color-text-muted)]">days</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-amber-500/30 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-0.5">
                This Month
              </span>
              <span className="text-base sm:text-lg font-extrabold text-amber-400">
                {stats.monthFasted} <span className="text-xs font-normal text-amber-500/70">days</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-muted)] block mb-0.5">
                Fasting Streak
              </span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-400 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>{stats.currentStreak}</span>
              </span>
            </div>
          </div>

          {/* Recent Fasting History */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--color-text-primary)] block">
              Recent Fasting History ({allEntries.length})
            </span>
            {allEntries.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[var(--color-surface-subtle)] border border-dashed border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
                No fasting logs yet. Tap "I Am Fasting Today" or start an intermittent fast above to log your first day!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {allEntries.slice(0, 10).map(entry => {
                  const meta = FASTING_TYPE_LABELS[entry.type] || FASTING_TYPE_LABELS.voluntary;
                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{meta.icon}</span>
                        <div>
                          <div className="font-semibold text-[var(--color-text-primary)]">
                            {entry.local_date}
                          </div>
                          <div className="text-[11px] text-[var(--color-text-secondary)]">
                            {entry.notes || meta.label}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {entry.suhur_completed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Suhur
                          </span>
                        )}
                        {entry.iftar_completed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Iftar
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          entry.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {entry.completed ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer with CSV Export */}
        <div className="p-4 sm:p-5 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-2">
          <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
            Fajr & Maghrib calculations synchronized with local prayer engines
          </span>
          <button
            type="button"
            onClick={handleExportCSV}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] flex items-center justify-center gap-2 transition-all tap-feedback"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Fasting Ledger (.CSV)</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
