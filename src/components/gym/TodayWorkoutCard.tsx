import React from 'react';
import { Dumbbell, Play, CheckCircle2, Plus, Sparkles, Moon } from 'lucide-react';
import { GlassCard, AccentChip } from '../glass';
import { TodayPlanState } from '../../services/gymDerivedStats';
import { useTranslation } from '../../services/i18n';

interface TodayWorkoutCardProps {
  planState: TodayPlanState;
  onStartWorkout: () => void;
  onResumeWorkout?: () => void;
  onCreatePlan: () => void;
  className?: string;
}

export const TodayWorkoutCard: React.FC<TodayWorkoutCardProps> = ({
  planState,
  onStartWorkout,
  onResumeWorkout,
  onCreatePlan,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <GlassCard className={`space-y-4 p-4 sm:p-5 ${className}`}>
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium text-[var(--text-1)] tracking-tight">
          {t('gym.todaysWorkout', "Today's workout")}
        </h2>
        {planState.state === 'scheduled' && (
          <AccentChip className="text-[11px] py-0.5 px-2.5">
            {t('gym.planBadge', 'Plan')}
          </AccentChip>
        )}
      </div>

      {/* State-specific Body & Actions */}
      {planState.state === 'scheduled' && (
        <>
          <div className="flex items-center gap-3.5">
            {/* 60px Glass Tile Icon */}
            <div className="w-[60px] h-[60px] rounded-[18px] bg-[rgb(var(--accent-rgb)/0.12)] border border-[rgb(var(--accent-rgb)/0.35)] shadow-[0_0_16px_rgb(var(--accent-rgb)/0.25)] flex items-center justify-center shrink-0">
              <Dumbbell className="w-7 h-7 text-[var(--accent-light)]" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="text-[16px] font-medium text-[var(--text-1)] truncate">
                {planState.planName}
              </h3>
              <p className="text-[12px] text-[var(--text-2)] truncate">
                {planState.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartWorkout}
            className="w-full h-[48px] rounded-[16px] bg-[linear-gradient(135deg,var(--accent),var(--accent-light))] text-[var(--on-accent)] font-medium text-[15px] shadow-[0_0_24px_rgb(var(--accent-rgb)/0.5)] flex items-center justify-center gap-2 tap-feedback transition-all duration-150 hover:brightness-105 active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current stroke-[2.5]" />
            <span>{t('gym.startWorkout', 'Start workout')}</span>
          </button>
        </>
      )}

      {planState.state === 'in_progress' && (
        <>
          <div className="flex items-center gap-3.5">
            <div className="w-[60px] h-[60px] rounded-[18px] bg-[rgb(var(--accent-rgb)/0.18)] border border-[rgb(var(--accent-rgb)/0.5)] shadow-[0_0_20px_rgb(var(--accent-rgb)/0.35)] flex items-center justify-center shrink-0 animate-pulse">
              <Dumbbell className="w-7 h-7 text-[var(--accent)]" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-medium text-[var(--text-1)] truncate">
                  {planState.session.name}
                </h3>
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
              </div>
              <p className="text-[12px] text-[var(--accent-light)] font-medium">
                {planState.elapsedMinutes} min {t('common.active', 'Active')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onResumeWorkout || onStartWorkout}
            className="w-full h-[48px] rounded-[16px] bg-[linear-gradient(135deg,var(--accent),var(--accent-light))] text-[var(--on-accent)] font-medium text-[15px] shadow-[0_0_24px_rgb(var(--accent-rgb)/0.5)] flex items-center justify-center gap-2 tap-feedback transition-all duration-150 hover:brightness-105 active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current stroke-[2.5]" />
            <span>{t('gym.resumeWorkout', 'Resume workout')}</span>
          </button>
        </>
      )}

      {planState.state === 'done' && (
        <>
          <div className="flex items-center gap-3.5">
            <div className="w-[60px] h-[60px] rounded-[18px] bg-[rgb(var(--accent-rgb)/0.15)] border border-[rgb(var(--accent-rgb)/0.45)] shadow-[0_0_16px_rgb(var(--accent-rgb)/0.3)] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-[var(--accent-light)] stroke-[2.5]" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="text-[16px] font-medium text-[var(--text-1)] truncate">
                {t('gym.workoutCompletedToday', 'Workout completed today')}
              </h3>
              <p className="text-[12px] text-[var(--text-2)] truncate">
                {planState.sessionName} · {planState.setsCount} {t('gym.setCol', 'sets')} · {planState.volumeFormatted}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartWorkout}
            className="w-full h-[44px] rounded-[16px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-[var(--text-1)] font-medium text-[14px] flex items-center justify-center gap-2 tap-feedback transition-all duration-150 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-[var(--accent-light)]" />
            <span>{t('gym.startAnotherWorkout', 'Start another workout')}</span>
          </button>
        </>
      )}

      {planState.state === 'rest' && (
        <>
          <div className="flex items-center gap-3.5">
            <div className="w-[60px] h-[60px] rounded-[18px] bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
              <Moon className="w-7 h-7 text-[var(--text-2)]" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="text-[16px] font-medium text-[var(--text-1)]">
                {t('gym.restDay', 'Rest day')}
              </h3>
              <p className="text-[12px] text-[var(--text-2)] truncate">
                {t('gym.nextScheduled', 'Next: {name} on {day}')
                  .replace('{name}', planState.nextWorkoutName)
                  .replace('{day}', planState.nextWeekday)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartWorkout}
            className="w-full h-[44px] rounded-[16px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-[var(--text-1)] font-medium text-[14px] flex items-center justify-center gap-2 tap-feedback transition-all duration-150 active:scale-[0.98]"
          >
            <Dumbbell className="w-4 h-4 text-[var(--accent-light)]" />
            <span>{t('gym.startWorkoutAnyway', 'Start a workout anyway')}</span>
          </button>
        </>
      )}

      {planState.state === 'none' && (
        <>
          <div className="flex items-center gap-3.5">
            <div className="w-[60px] h-[60px] rounded-[18px] bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-[var(--accent-light)]" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="text-[16px] font-medium text-[var(--text-1)]">
                {t('gym.noActivePlan', 'No active plan')}
              </h3>
              <p className="text-[12px] text-[var(--text-2)]">
                {t('gym.subtitle', 'Workouts, routine splits, volume and bodyweight')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onCreatePlan}
              className="w-full h-[48px] rounded-[16px] bg-[linear-gradient(135deg,var(--accent),var(--accent-light))] text-[var(--on-accent)] font-medium text-[15px] shadow-[0_0_24px_rgb(var(--accent-rgb)/0.5)] flex items-center justify-center gap-2 tap-feedback transition-all duration-150 hover:brightness-105 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('gym.createPlan', 'Create a plan')}</span>
            </button>

            <button
              type="button"
              onClick={onStartWorkout}
              className="w-full h-[40px] rounded-[14px] bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-[var(--text-2)] font-medium text-[13px] flex items-center justify-center gap-1.5 tap-feedback transition-all active:scale-[0.98]"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>{t('gym.startEmptyWorkout', 'Start empty workout')}</span>
            </button>
          </div>
        </>
      )}
    </GlassCard>
  );
};

export default TodayWorkoutCard;
