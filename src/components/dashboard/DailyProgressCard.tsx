import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  TrendingUp, 
  ShieldCheck, 
  Coins, 
  Calendar,
  X,
  Compass
} from 'lucide-react';
import { DailyProgressService } from '../../services/dailyProgressService';
import { formatCurrency, getTodayLocalDate } from '../../services/storage';
import { DailyProgressBreakdown } from '../../types';
import { CircularProgressRing } from '../charts/CircularProgressRing';
import { SegmentedProgressBar } from '../charts/SegmentedProgressBar';
import { useTranslation } from '../../services/i18n';

interface DailyProgressCardProps {
  onRefresh?: () => void;
  onOpenSettings?: () => void;
}

export const DailyProgressCard: React.FC<DailyProgressCardProps> = ({ onRefresh, onOpenSettings }) => {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [historyRange, setHistoryRange] = useState<7 | 30 | 90>(7);

  const settings = DailyProgressService.getSettings();
  if (settings.daily_progress_enabled === false) {
    return null;
  }

  const todayStr = getTodayLocalDate();
  const progress: DailyProgressBreakdown = DailyProgressService.getDailyProgress(todayStr);
  const history = DailyProgressService.getHistory(historyRange);

  const handleDisciplineCheckIn = (status: 'maintained' | 'relapsed') => {
    DailyProgressService.recordDisciplineCheckIn(status);
    if (onRefresh) onRefresh();
  };

  const isPerfect = progress.total_score >= 10;
  const levelTranslated = t(('dailyProgress.' + progress.level) as any) || progress.level_label;

  return (
    <>
      {/* Featured Dashboard Card with Geometric Texture */}
      <div 
        onClick={() => setModalOpen(true)}
        className={`card-premium p-5 transition-all duration-300 cursor-pointer  tap-feedback group relative ${
          isPerfect ? 'border-[var(--color-accent)]' : 'hover:border-[var(--color-accent)]'
        }`}
      >
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 pattern-radial opacity-40 pointer-events-none" />

        <div className="relative z-10">
          {/* Card Top Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
                {isPerfect ? (
                  <Sparkles className="w-4 h-4 text-[var(--color-positive)] animate-pulse" />
                ) : (
                  <Award className="w-4 h-4 text-[var(--color-accent)]" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  {t('dailyProgress.scoreLabel')}
                </span>
                <h3 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                  {t('dailyProgress.cardTitle')}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                {levelTranslated}
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors" />
            </div>
          </div>

          {/* Hero Middle Section: Circular Ring + Bold Metric */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight font-sans">
                  {progress.total_score}
                </span>
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  / {progress.max_score} pts
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {isPerfect 
                  ? t('dailyProgress.maxScoreReached')
                  : `${Math.round((10 - progress.total_score) * 10) / 10} ${t('dailyProgress.ptsRemaining')}`}
              </p>
            </div>

            {/* Circular Ring Component */}
            <CircularProgressRing
              value={progress.total_score}
              max={progress.max_score}
              size={84}
              strokeWidth={8}
              color={isPerfect ? 'var(--color-positive)' : 'var(--color-accent)'}
              trackColor="var(--color-surface)"
            />
          </div>

          {/* 10-Point Segmented Progress Bar */}
          <div className="mt-3.5 mb-3.5">
            <SegmentedProgressBar
              totalSegments={10}
              filledSegments={progress.total_score}
              color={isPerfect ? 'var(--color-positive)' : 'var(--color-accent)'}
              inactiveColor="var(--color-surface)"
              height={6}
              gap={4}
            />
          </div>

          {/* 3 Metric Pills */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--color-border)]">
            {/* Prayers */}
            <div className="p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
              <span className="text-xs text-[var(--color-text-secondary)] font-bold">{t('dashboard.dailyPrayers')}</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  {progress.prayers_completed}/5
                </span>
                <span className="text-xs font-bold text-[var(--color-positive)]">
                  +{progress.prayers_score}
                </span>
              </div>
            </div>

            {/* Spending */}
            <div className="p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
              <span className="text-xs text-[var(--color-text-secondary)] font-bold">{t('common.budget')}</span>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs font-bold ${progress.is_spending_disciplined ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-negative)]'}`}>
                  {progress.is_spending_disciplined ? t('common.onTrack') : t('common.overBudget')}
                </span>
                <span className={`text-xs font-bold ${progress.spending_score > 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-muted)]'}`}>
                  +{progress.spending_score}
                </span>
              </div>
            </div>

            {/* Personal Discipline / Focus */}
            <div className="p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
              <span className="text-xs text-[var(--color-text-secondary)] font-bold">{t('dailyProgress.focusTitle')}</span>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs font-bold ${
                  progress.discipline_status === 'maintained'
                    ? 'text-[var(--color-positive)]'
                    : progress.discipline_status === 'relapsed'
                    ? 'text-[var(--color-negative)]'
                    : 'text-[var(--color-warning)]'
                }`}>
                  {progress.discipline_status === 'maintained' ? t('dailyProgress.kept') : progress.discipline_status === 'relapsed' ? t('dailyProgress.reset') : t('dailyProgress.checkIn')}
                </span>
                <span className={`text-xs font-bold ${progress.discipline_score > 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-muted)]'}`}>
                  +{progress.discipline_score}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Modal: Scoring, Personal Discipline Check-in, & History */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75  p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[var(--color-card)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto no-scrollbar  p-5 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{t('dailyProgress.cardTitle')}</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                    {levelTranslated}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">10-Point Daily Discipline & Habit Mastery</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Ring Summary */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">{t('dailyProgress.scoreLabel')}</span>
                <div className="text-2xl font-black text-[var(--color-text-primary)]">
                  {progress.total_score} <span className="text-sm font-semibold text-[var(--color-text-secondary)]">/ 10 Points</span>
                </div>
                <span className="text-xs text-[var(--color-positive)] font-medium">
                  {isPerfect ? t('dailyProgress.maxScoreReached') : `${Math.round((10 - progress.total_score) * 10) / 10} ${t('dailyProgress.ptsRemaining')}`}
                </span>
              </div>
              <CircularProgressRing
                value={progress.total_score}
                max={progress.max_score}
                size={70}
                strokeWidth={7}
                color={isPerfect ? 'var(--color-positive)' : 'var(--color-accent)'}
              />
            </div>

            {/* Detailed Component Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--color-text-secondary)]">{t('dailyProgress.componentBreakdown')}</h3>

              {/* 1. Daily Prayers */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[var(--color-card)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--color-text-primary)]">{t('dailyProgress.prayersTitle')}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">{t('dailyProgress.prayersSubtitle')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[var(--color-positive)]">+{progress.prayers_score} pts</span>
                    <span className="text-xs text-[var(--color-text-secondary)] block">max {progress.prayers_max} pts</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs bg-[var(--color-card)] p-2 rounded-xl text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                  <span>{t('dashboard.prayersDone')}:</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{progress.prayers_completed} / 5</span>
                </div>
              </div>

              {/* 2. Financial Discipline */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[var(--color-card)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--color-text-primary)]">{t('dailyProgress.budgetTitle')}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">{t('dailyProgress.budgetSubtitle')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${progress.spending_score > 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-secondary)]'}`}>
                      +{progress.spending_score} pts
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)] block">max {progress.spending_max} pts</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs bg-[var(--color-card)] p-2 rounded-xl text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                  <span>{t('common.spent')}: <strong className="text-[var(--color-text-primary)]">{formatCurrency(progress.today_spending_minor)}</strong></span>
                  <span>{t('common.limit')}: <strong className="text-[var(--color-positive)]">{formatCurrency(progress.spending_allowance_minor)}</strong></span>
                </div>
              </div>

              {/* 3. Personal Discipline */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[var(--color-card)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--color-text-primary)]">{t('dailyProgress.focusTitle')}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">{t('dailyProgress.focusSubtitle')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${progress.discipline_score > 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-secondary)]'}`}>
                      +{progress.discipline_score} pts
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)] block">max {progress.discipline_max} pts</span>
                  </div>
                </div>

                {/* Quick Check-in Actions */}
                <div className="pt-1">
                  <div className="text-xs text-[var(--color-text-secondary)] mb-2 flex items-center justify-between">
                    <span>{t('common.status')}:</span>
                    <span className="font-bold text-[var(--color-text-primary)] capitalize">
                      {progress.discipline_status === 'maintained' ? t('dailyProgress.kept') : progress.discipline_status === 'relapsed' ? t('dailyProgress.reset') : t('dailyProgress.checkIn')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDisciplineCheckIn('maintained')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all tap-feedback ${
                        progress.discipline_status === 'maintained'
                          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] border-[var(--color-text-primary)]'
                          : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('dailyProgress.kept')}</span>
                    </button>
                    <button
                      onClick={() => handleDisciplineCheckIn('relapsed')}
                      className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all tap-feedback ${
                        progress.discipline_status === 'relapsed'
                          ? 'bg-[var(--color-negative)] text-white border-[var(--color-negative)]'
                          : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-negative)]'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{t('dailyProgress.reset')}</span>
                    </button>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 italic text-center">
                    {t('dailyProgress.confidentialNotice')}
                  </p>
                </div>
              </div>
            </div>

            {/* Historical Performance */}
            <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--color-text-secondary)]">{t('dailyProgress.historyStats')}</h3>
                <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)]">
                  {[7, 30, 90].map((r) => (
                    <button
                      key={r}
                      onClick={() => setHistoryRange(r as 7 | 30 | 90)}
                      className={`text-xs font-bold px-2 py-0.5 rounded-lg transition-colors ${
                        historyRange === r
                          ? 'bg-[var(--color-card)] text-[var(--color-text-primary)] shadow-sm'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      {r}d
                    </button>
                  ))}
                </div>
              </div>

              {/* History Stats Overview */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] block">{t('dailyProgress.weeklyAvg')}</span>
                  <div className="text-base font-black text-[var(--color-text-primary)] mt-0.5">
                    {history.weeklyAverage} <span className="text-xs font-normal text-[var(--color-text-secondary)]">/ 10</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] block">{t('dailyProgress.monthlyAvg')}</span>
                  <div className="text-base font-black text-[var(--color-text-primary)] mt-0.5">
                    {history.monthlyAverage} <span className="text-xs font-normal text-[var(--color-text-secondary)]">/ 10</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] block">{t('dailyProgress.perfectDays')}</span>
                  <div className="text-base font-black text-[var(--color-positive)] mt-0.5">
                    {history.perfectDaysCount} <span className="text-xs font-normal text-[var(--color-text-secondary)]">days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              {onOpenSettings && (
                <button
                  onClick={() => {
                    setModalOpen(false);
                    onOpenSettings();
                  }}
                  className="text-xs text-[var(--color-accent)] underline font-semibold"
                >
                  {t('dailyProgress.configureScoring')}
                </button>
              )}
              <button
                onClick={() => setModalOpen(false)}
                className="py-2.5 px-6 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold ml-auto  tap-feedback"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
