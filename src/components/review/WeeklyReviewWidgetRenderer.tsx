import React from 'react';
import { 
  Sparkles, 
  BarChart3, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Dumbbell, 
  Wallet, 
  Clock 
} from 'lucide-react';
import { db, formatCurrency } from '../../services/storage';
import { WeeklyReviewService } from '../../services/weeklyReviewService';
import { ModuleWidgetConfig } from '../../types';

interface WeeklyReviewWidgetRendererProps {
  widget: ModuleWidgetConfig;
  onRefresh: () => void;
  triggerToast?: (msg: string) => void;
}

export const WeeklyReviewWidgetRenderer: React.FC<WeeklyReviewWidgetRendererProps> = ({
  widget,
  onRefresh,
  triggerToast = () => {},
}) => {
  const state = db.getState();
  const metrics = WeeklyReviewService.getWeeklyMetrics(1);
  const reflection = (state.weeklyReflections || [])[0];
  const plan = (state.weeklyPlans || [])[0];

  switch (widget.widgetType) {
    // 1. Review Highlights
    case 'review_highlights':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                Retrospective
              </span>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Weekly Highlights
              </h3>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {reflection?.what_went_well || 'Maintained 4 consistent gym sessions, stayed disciplined on grocery budget, and completed 95% of daily prayers on time.'}
          </p>
        </div>
      );

    // 2. Multi-Domain Metrics
    case 'review_metrics':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Multi-Domain Metrics
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Workouts Done</span>
              <div className="text-base font-black text-[var(--color-text-primary)] mt-0.5">
                {metrics.fitness.workoutCount} sessions
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Total Spent</span>
              <div className="text-base font-black text-[var(--color-text-primary)] mt-0.5">
                {formatCurrency(metrics.finance.totalExpenseMinor, state.settings.currency_label)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Prayers Adherence</span>
              <div className="text-base font-black text-[var(--color-positive)] mt-0.5">
                {metrics.prayers.completionPercentage}%
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Tasks Completed</span>
              <div className="text-base font-black text-[var(--color-accent)] mt-0.5">
                {metrics.tasks.completedCount} tasks
              </div>
            </div>
          </div>
        </div>
      );

    // 3. Reflection
    case 'review_reflection':
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Discipline & Improvement
            </h3>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {reflection?.what_to_improve || 'Sleep consistency on late nights was slightly irregular. Prioritize earlier bedtime.'}
          </p>
        </div>
      );

    // 4. Next Week Plan
    case 'review_next_week_plan':
      return (
        <div className="card-premium p-4  space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Next Week's High Priorities
            </h3>
          </div>
          <div className="space-y-1.5 text-xs text-[var(--color-text-primary)]">
            {(plan?.top_priorities || ['Complete 4 training sessions', 'Track all daily expenses']).map((p, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
};
