// ========================================================
// GreenDream Flame Detail Screen (v2.0)
// Sober Journey Hero, 30-Day Strip, 7-Day Adjustment, Slips & Words
// ========================================================

import React, { useMemo, useState } from 'react';
import { 
  ArrowLeft, 
  AlertCircle, 
  RotateCcw, 
  Bookmark, 
  Calendar as CalendarIcon, 
  Check, 
  Sparkles, 
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { db, getTodayLocalDate } from '../services/storage';
import { useTranslation } from '../services/i18n';
import { 
  calculateStreakStats, 
  recordRelapse, 
  unmarkRelapse, 
  formatFlameDays,
  addCalendarDays,
  calendarDaysBetween,
  dayStatus
} from '../services/flame/flameService';
import { FlameIcon } from '../components/flame/FlameIcon';
import { triggerHaptic } from '../services/motion';

export interface FlameScreenProps {
  onBack: () => void;
  onRefresh?: () => void;
}

export const FlameScreen: React.FC<FlameScreenProps> = ({
  onBack,
  onRefresh,
}) => {
  const { t, language, isRtl } = useTranslation();
  const state = db.getState();
  const flame = state.settings.flame;
  const today = getTodayLocalDate();

  const [isRelapseModalOpen, setIsRelapseModalOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<string>('no_reason');
  const [justSlipped, setJustSlipped] = useState(false);

  // Past 7-day adjust dialog
  const [adjustDate, setAdjustDate] = useState<string | null>(null);
  const [adjustCurrentStatus, setAdjustCurrentStatus] = useState<'sober' | 'relapse' | null>(null);

  // Words earned section collapse
  const [isWordsOpen, setIsWordsOpen] = useState(true);

  const stats = useMemo(() => {
    if (!flame) return {
      currentStreak: 0,
      longestStreak: 0,
      totalFlames: 0,
      relapseCount: 0,
      streakKey: today,
      intensity: 0.15,
      isRelapseToday: false,
      todayStatus: 'pending' as const,
    };
    return calculateStreakStats(flame, today);
  }, [flame, today, state]);

  // Generate 30-day calendar history strip (today - 29 to today)
  const historyDays = useMemo(() => {
    const days: Array<{
      date: string;
      status: 'before_start' | 'sober' | 'relapse' | 'pending' | 'future';
      isToday: boolean;
      isEditable: boolean;
      dayNum: string;
      weekday: string;
    }> = [];

    for (let offset = 29; offset >= 0; offset--) {
      const dStr = addCalendarDays(today, -offset);
      const stat = flame ? dayStatus(dStr, today, flame) : 'before_start';
      const daysDiff = calendarDaysBetween(dStr, today);
      const isToday = offset === 0;
      // Editable if within past 7 days (1 to 7 days ago)
      const isEditable = daysDiff >= 1 && daysDiff <= 7;

      const dateObj = new Date(dStr + 'T12:00:00Z');
      const dayNum = String(dateObj.getUTCDate());
      const weekday = dateObj.toLocaleDateString(language, { weekday: 'narrow' });

      days.push({
        date: dStr,
        status: stat,
        isToday,
        isEditable,
        dayNum,
        weekday,
      });
    }
    return days;
  }, [today, flame, language]);

  const handleSlipped = () => {
    triggerHaptic('medium');
    db.updateState(s => {
      if (s.settings.flame) {
        s.settings.flame = recordRelapse(s.settings.flame, today, today, selectedTrigger);
      }
    });
    setJustSlipped(true);
    setIsRelapseModalOpen(false);
    onRefresh?.();
  };

  const handleUndoRelapse = () => {
    triggerHaptic('success');
    db.updateState(s => {
      if (s.settings.flame) {
        s.settings.flame = unmarkRelapse(s.settings.flame, today, today);
      }
    });
    setJustSlipped(false);
    onRefresh?.();
  };

  const handleTapDayPip = (dayItem: typeof historyDays[0]) => {
    if (!dayItem.isEditable) return;
    triggerHaptic('light');
    setAdjustDate(dayItem.date);
    setAdjustCurrentStatus(dayItem.status === 'relapse' ? 'relapse' : 'sober');
  };

  const handleConfirmAdjust = () => {
    if (!adjustDate || !adjustCurrentStatus) return;
    triggerHaptic('medium');
    db.updateState(s => {
      if (s.settings.flame) {
        if (adjustCurrentStatus === 'sober') {
          // Mark as slipped on that day
          s.settings.flame = recordRelapse(s.settings.flame, today, adjustDate, 'adjusted');
        } else {
          // Unmark slip
          s.settings.flame = unmarkRelapse(s.settings.flame, adjustDate, today);
        }
      }
    });
    setAdjustDate(null);
    setAdjustCurrentStatus(null);
    onRefresh?.();
  };

  const savedPhrases = flame?.savedPhrases || [];

  return (
    <div className="w-full pb-24 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between pt-2 pb-1">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/[0.06] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] tap-feedback shrink-0"
            aria-label={t('common.back', 'Back')}
          >
            <ArrowLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
              {t('flame.title', 'Sober Flame')}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('flame.subtitle', 'Consecutive sober days')}
            </p>
          </div>
        </div>
      </header>

      {/* Persistent 24h Undo Banner for Today's Slip */}
      {stats.isRelapseToday && (
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/15 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-[var(--accent-light)] shrink-0" />
            <span className="text-xs text-[var(--color-text-primary)] font-medium truncate">
              {t('flame.markedSlipToday', 'Marked as slipped today.')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleUndoRelapse}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.4)] text-xs font-semibold tap-feedback shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('flame.undo', 'Undo')}</span>
          </button>
        </div>
      )}

      {/* Hero Flame (160px) */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2">
        <div className="relative flex items-center justify-center">
          <FlameIcon
            intensity={stats.intensity}
            days={stats.currentStreak}
            size={160}
            animated={true}
            isRelapseDrop={justSlipped}
          />
        </div>

        {/* Big Day Counter */}
        <div className="text-center mt-4">
          <h2 className="text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight tabular-nums">
            {formatFlameDays(stats.currentStreak, language as 'en' | 'fr' | 'ar')}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {t('flame.todayPendingHint', 'Today counts at midnight.')}
          </p>
        </div>
      </div>

      {/* Lifetime Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm p-3 rounded-2xl text-center">
          <span className="text-[11px] text-[var(--color-text-secondary)] block">
            {t('flame.longest', 'Longest')}
          </span>
          <span className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums mt-0.5 block">
            {stats.longestStreak}
          </span>
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm p-3 rounded-2xl text-center">
          <span className="text-[11px] text-[var(--color-text-secondary)] block">
            {t('flame.totalFlames', 'Total flames')}
          </span>
          <span className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums mt-0.5 block">
            {stats.totalFlames}
          </span>
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm p-3 rounded-2xl text-center">
          <span className="text-[11px] text-[var(--color-text-secondary)] block">
            {t('flame.slips', 'Slips')}
          </span>
          <span className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums mt-0.5 block">
            {stats.relapseCount}
          </span>
        </div>
      </div>

      {/* "I Slipped" Calm Action Button (Never Red) */}
      {!stats.isRelapseToday && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsRelapseModalOpen(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] hover:border-[var(--color-border)] text-[var(--accent-light)] text-sm font-semibold flex items-center justify-center gap-2 tap-feedback shadow-sm"
          >
            <span>{t('flame.iSlipped', 'I slipped')}</span>
          </button>
        </div>
      )}

      {/* 30-Day Calendar Strip */}
      <div className="card-premium p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
              {t('flame.historyTitle', '30-Day Activity Strip')}
            </h3>
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {t('flame.tapToAdjust', 'Tap past 7 days to adjust')}
          </span>
        </div>

        {/* Horizontal Scrollable Pips Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 no-scrollbar">
          {historyDays.map((dayItem) => {
            const isSober = dayItem.status === 'sober';
            const isRelapse = dayItem.status === 'relapse';
            const isPending = dayItem.isToday;

            return (
              <button
                key={dayItem.date}
                type="button"
                onClick={() => handleTapDayPip(dayItem)}
                disabled={!dayItem.isEditable}
                className={`flex flex-col items-center gap-1 shrink-0 p-1 rounded-xl transition-all ${
                  dayItem.isEditable ? 'cursor-pointer hover:bg-white/[0.06] tap-feedback' : 'cursor-default opacity-80'
                }`}
                title={`${dayItem.date}: ${dayItem.status}`}
              >
                <span className="text-[9px] text-[var(--color-text-muted)] uppercase">
                  {dayItem.weekday}
                </span>

                {/* Pip Representation */}
                <div className="w-6 h-6 rounded-lg flex items-center justify-center relative">
                  {isPending ? (
                    // Today: Hollow pending accent ring with pulse
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-accent)] animate-pulse" />
                  ) : isRelapse ? (
                    // Slipped: Dim ash grey pip
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-3)]" />
                  ) : isSober ? (
                    // Sober: Glowing accent pip
                    <div 
                      className="w-3 h-3 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]" 
                    />
                  ) : (
                    // Before start: Empty subtle dot
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-surface)]" />
                  )}
                </div>

                <span className={`text-[10px] tabular-nums ${dayItem.isToday ? 'font-bold text-[var(--accent-light)]' : 'text-[var(--color-text-secondary)]'}`}>
                  {dayItem.dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* "Words You Earned" Gallery */}
      <div className="card-premium p-4 space-y-3">
        <div 
          onClick={() => setIsWordsOpen(prev => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
              {t('flame.wordsYouEarned', 'Words you earned')}
            </h3>
            {savedPhrases.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent-light)]">
                {savedPhrases.length}
              </span>
            )}
          </div>
          <button type="button" className="text-[var(--color-text-secondary)]">
            {isWordsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isWordsOpen && (
          <div className="space-y-2 pt-1 animate-in fade-in">
            {savedPhrases.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-[var(--color-text-muted)] leading-relaxed">
                {t('flame.noWordsYet', 'Reach your first 10 days to earn your first words.')}
              </div>
            ) : (
              savedPhrases.map((phrase, idx) => (
                <div
                  key={`${phrase.id}-${phrase.milestone}-${idx}`}
                  className="p-3.5 rounded-xl bg-white/[0.03] border border-white/8 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                    <span className="font-semibold text-[var(--accent-light)]">
                      {phrase.milestone} {t('common.days', 'days')}
                    </span>
                    <span>{phrase.dateEarned}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-primary)] italic leading-relaxed">
                    "{phrase.text}"
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Confirmation Bottom Sheet for "I Slipped" */}
      {isRelapseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70  animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-t-3xl bg-[var(--color-surface)] border-t border-white/15 space-y-4 animate-in slide-in-from-bottom">
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {t('flame.resetConfirmTitle', 'It happens')}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {t(
                'flame.resetConfirmDesc',
                'Today becomes Day 0. Your flame restarts as an ember, but every day you lived sober is still yours. Reset flame?'
              )}
            </p>

            {/* Optional Trigger Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block">
                {t('flame.triggerTagLabel', 'Optional trigger:')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'stress', label: t('flame.triggers.stress', 'Stress') },
                  { id: 'tired', label: t('flame.triggers.tired', 'Tired') },
                  { id: 'social', label: t('flame.triggers.social', 'Social') },
                  { id: 'bored', label: t('flame.triggers.bored', 'Bored') },
                  { id: 'no_reason', label: t('flame.triggers.noReason', 'No reason') },
                ].map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSelectedTrigger(chip.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedTrigger === chip.id
                        ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border-[var(--accent)]'
                        : 'bg-white/[0.04] text-[var(--color-text-secondary)] border-[var(--color-border)]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRelapseModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white/[0.06] text-[var(--color-text-secondary)] font-semibold text-xs tap-feedback"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSlipped}
                className="flex-1 py-3 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-xs tap-feedback"
              >
                {t('flame.confirmReset', 'Reset flame')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Past Day Confirmation Dialog */}
      {adjustDate && adjustCurrentStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70  p-4 animate-in fade-in">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-[var(--color-surface)] border border-white/15 space-y-3 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              {adjustCurrentStatus === 'sober'
                ? t('flame.markSlipOnDate', `Mark slip on ${adjustDate}?`)
                : t('flame.removeSlipOnDate', `Remove slip on ${adjustDate}?`)}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {adjustCurrentStatus === 'sober'
                ? t('flame.markSlipDesc', 'This will adjust your historical streak and recalculate your flames.')
                : t('flame.removeSlipDesc', 'This will restore your historical streak across that day.')}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustDate(null);
                  setAdjustCurrentStatus(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-[var(--color-text-secondary)] font-medium text-xs tap-feedback"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-xs tap-feedback"
              >
                {t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlameScreen;
