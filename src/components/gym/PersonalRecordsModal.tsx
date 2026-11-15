import React, { useMemo } from 'react';
import { 
  Award, 
  Trophy, 
  X, 
  Flame, 
  Sparkles, 
  Dumbbell, 
  TrendingUp, 
  Download, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  Target,
  BarChart2
} from 'lucide-react';
import { Exercise, WorkoutSession } from '../../types';
import { getTodayLocalDate } from '../../services/storage';
import { Haptics } from '../../services/haptics';

interface PersonalRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  workoutSessions: WorkoutSession[];
  weightUnit: 'kg' | 'lb';
}

export const PersonalRecordsModal: React.FC<PersonalRecordsModalProps> = ({
  isOpen,
  onClose,
  exercises,
  workoutSessions,
  weightUnit,
}) => {
  const today = getTodayLocalDate();

  // Compute lifetime achievements and top lifts
  const analytics = useMemo(() => {
    const validSessions = workoutSessions.filter(s => !s.deleted_at);
    let totalVolumeKg = 0;
    let totalSets = 0;
    let totalReps = 0;
    let maxSessionVolumeKg = 0;
    let maxSessionName = '';
    let maxSessionDate = '';

    // Map of exercise ID -> best set
    const prMap = new Map<string, {
      exerciseName: string;
      category: string;
      maxWeightKg: number;
      repsAtMax: number;
      est1RMKg: number;
      achievedDate: string;
    }>();

    for (const s of validSessions) {
      let sessionVolume = 0;
      if (s.sets && s.sets.length > 0) {
        for (const set of s.sets) {
          if (!set.deleted_at && !set.is_warmup) {
            const vol = (set.weight_kg || 0) * (set.reps || 0);
            sessionVolume += vol;
            totalVolumeKg += vol;
            totalSets++;
            totalReps += set.reps || 0;

            const ex = exercises.find(e => e.id === set.exercise_id);
            const exName = ex?.name || 'Exercise';
            const cat = ex?.category || 'general';

            const current = prMap.get(set.exercise_id);
            const est1RM = set.reps <= 1 ? set.weight_kg : Math.round(set.weight_kg * (1 + Math.min(set.reps, 12) / 30));

            if (!current || set.weight_kg > current.maxWeightKg || (set.weight_kg === current.maxWeightKg && set.reps > current.repsAtMax)) {
              prMap.set(set.exercise_id, {
                exerciseName: exName,
                category: cat,
                maxWeightKg: set.weight_kg,
                repsAtMax: set.reps,
                est1RMKg: est1RM,
                achievedDate: s.local_date || today,
              });
            }
          }
        }
      }

      if (sessionVolume > maxSessionVolumeKg) {
        maxSessionVolumeKg = sessionVolume;
        maxSessionName = s.name || 'Workout';
        maxSessionDate = s.local_date || today;
      }
    }

    const topLifts = Array.from(prMap.values())
      .filter(p => p.maxWeightKg > 0)
      .sort((a, b) => b.maxWeightKg - a.maxWeightKg);

    // Fun real-world comparisons
    const carsEquivalent = (totalVolumeKg / 1500).toFixed(1); // average car = 1500kg
    const elephantsEquivalent = (totalVolumeKg / 6000).toFixed(1); // average elephant = 6000kg

    // Badges computation
    const badges = [
      {
        id: 'first_session',
        title: 'First Step',
        desc: 'Logged your very first workout',
        icon: '🌱',
        earned: validSessions.length >= 1,
      },
      {
        id: 'century_lift',
        title: 'Century Club (100 kg)',
        desc: 'Lifted 100 kg+ on any movement',
        icon: '🛡️',
        earned: topLifts.some(l => l.maxWeightKg >= 100),
      },
      {
        id: 'high_volume_beast',
        title: 'High Volume Beast',
        desc: 'Moved 5,000 kg+ in a single workout session',
        icon: '⚡',
        earned: maxSessionVolumeKg >= 5000,
      },
      {
        id: 'sessions_10',
        title: 'Iron Dedication',
        desc: 'Completed 10 or more workout sessions',
        icon: '🏆',
        earned: validSessions.length >= 10,
      },
      {
        id: 'volume_10k',
        title: '10-Ton Titan',
        desc: 'Lifted over 10,000 kg lifetime volume',
        icon: '🌋',
        earned: totalVolumeKg >= 10000,
      },
    ];

    return {
      validSessionsCount: validSessions.length,
      totalVolumeKg,
      totalSets,
      totalReps,
      maxSessionVolumeKg,
      maxSessionName,
      maxSessionDate,
      topLifts,
      carsEquivalent,
      elephantsEquivalent,
      badges,
    };
  }, [workoutSessions, exercises, today]);

  if (!isOpen) return null;

  const formatWeight = (kg: number) => {
    if (weightUnit === 'lb') {
      return `${Math.round(kg * 2.20462)} lb`;
    }
    return `${kg} kg`;
  };

  const handleExportPRSheet = () => {
    Haptics.tick();
    const mdLines = [
      `# 🏆 GreenDream Personal Records & Wall of Fame`,
      `*Generated on ${today}*`,
      ``,
      `## 📊 Lifetime Achievements`,
      `- **Total Workouts Logged:** ${analytics.validSessionsCount} sessions`,
      `- **Lifetime Volume Lifted:** ${analytics.totalVolumeKg.toLocaleString()} kg (~${Math.round(analytics.totalVolumeKg * 2.20462).toLocaleString()} lb)`,
      `- **Real-World Equivalent:** Moving ~${analytics.carsEquivalent} cars or ~${analytics.elephantsEquivalent} African elephants`,
      `- **Total Sets & Reps:** ${analytics.totalSets} sets / ${analytics.totalReps} total reps`,
      `- **Heaviest Session Volume:** ${analytics.maxSessionVolumeKg.toLocaleString()} kg (${analytics.maxSessionName} on ${analytics.maxSessionDate})`,
      ``,
      `## 🥇 Top Personal Records (PRs)`,
      ...analytics.topLifts.map((l, i) => 
        `${i + 1}. **${l.exerciseName}**: ${formatWeight(l.maxWeightKg)} × ${l.repsAtMax} reps (~${formatWeight(l.est1RMKg)} 1RM) — *Achieved ${l.achievedDate}*`
      ),
      ``,
      `## 🎖️ Milestones Earned`,
      ...analytics.badges.filter(b => b.earned).map(b => `- ${b.icon} **${b.title}**: ${b.desc}`),
      ``,
      `---`,
      `*Keep pushing forward. Every rep counts towards mastery.*`
    ];

    const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greendream_pr_wall_of_fame_${today}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Haptics.success();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4 shadow-2xl animate-scale-up max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <span>Wall of Fame & PR Trophies</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  {analytics.topLifts.length} Records
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Lifetime workout statistics, max lifts & milestone achievements
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lifetime Hero Volume Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Lifetime Iron Moved</span>
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
              {analytics.validSessionsCount} sessions
            </span>
          </div>

          <div className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
            {formatWeight(analytics.totalVolumeKg)}{' '}
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              ({analytics.totalSets} sets • {analytics.totalReps} reps)
            </span>
          </div>

          <div className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1.5 pt-1 border-t border-amber-500/20">
            <span>🚗 Equivalent to moving approximately <strong>{analytics.carsEquivalent} cars</strong> or <strong>{analytics.elephantsEquivalent} elephants</strong>!</span>
          </div>
        </div>

        {/* Milestone Badges Strip */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Milestone Badges ({analytics.badges.filter(b => b.earned).length}/{analytics.badges.length})</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {analytics.badges.map(badge => (
              <div
                key={badge.id}
                className={`p-2.5 rounded-xl border transition-all space-y-1 ${
                  badge.earned
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-white/[0.02] border-[var(--color-border)] opacity-40'
                }`}
              >
                <div className="text-lg">{badge.icon}</div>
                <div className="text-[11px] font-bold text-[var(--color-text-primary)] leading-tight truncate">
                  {badge.title}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] line-clamp-2">
                  {badge.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All-Time Top Personal Records (PRs) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>All-Time Personal Records (PRs)</span>
            </h4>
            <span className="text-[10px] text-[var(--color-text-muted)]">Sorted by weight</span>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {analytics.topLifts.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-1">
                <Dumbbell className="w-6 h-6 text-[var(--color-text-muted)] mx-auto opacity-50" />
                <p className="text-xs text-[var(--color-text-secondary)]">No PRs recorded yet. Complete a workout to set your baseline!</p>
              </div>
            ) : (
              analytics.topLifts.map((pr, index) => (
                <div
                  key={pr.exerciseName}
                  className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                      #{index + 1}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                        {pr.exerciseName}
                      </h5>
                      <span className="text-[10px] text-[var(--color-text-muted)] capitalize">
                        {pr.category} • {pr.achievedDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    <div className="text-xs font-black text-amber-400">
                      {formatWeight(pr.maxWeightKg)} × {pr.repsAtMax}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      ~{formatWeight(pr.est1RMKg)} 1RM
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleExportPRSheet}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold hover:brightness-110 transition-all tap-feedback"
          >
            <Download className="w-3.5 h-3.5 stroke-[3]" />
            <span>Export Trophy Sheet (.MD)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
