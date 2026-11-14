import { db, getTodayLocalDate } from './storage';
import { WorkoutSession, Exercise } from '../types';

export interface MuscleVolumeMetric {
  id: string;
  name: string;
  category: string;
  icon: string;
  directSets: number;
  fractionalSets: number;
  targetMin: number;
  targetMax: number;
  status: 'under' | 'maintenance' | 'optimal' | 'high';
  statusLabel: string;
  statusColor: string;
}

export class HypertrophyService {
  static getWeeklyMuscleVolumes(daysWindow: number = 7): {
    metrics: MuscleVolumeMetric[];
    totalWeeklySets: number;
    recommendedFocus: string;
    sessionsCount: number;
  } {
    const state = db.getState();
    const now = Date.now();
    const windowStartMs = now - (daysWindow * 24 * 60 * 60 * 1000);

    // Get completed sessions in last 7 days
    const recentSessions = (state.workoutSessions || []).filter(s => 
      !s.deleted_at && 
      (s.started_at ? s.started_at >= windowStartMs : s.created_at >= windowStartMs)
    );

    // Exercises map
    const exerciseMap = new Map<string, Exercise>();
    (state.exercises || []).forEach(ex => exerciseMap.set(ex.id, ex));

    // Tallies
    const tallies: Record<string, { direct: number; fractional: number }> = {
      chest: { direct: 0, fractional: 0 },
      back: { direct: 0, fractional: 0 },
      quads: { direct: 0, fractional: 0 },
      hamstrings: { direct: 0, fractional: 0 },
      shoulders: { direct: 0, fractional: 0 },
      biceps: { direct: 0, fractional: 0 },
      triceps: { direct: 0, fractional: 0 },
      core: { direct: 0, fractional: 0 },
    };

    let totalWeeklySets = 0;

    recentSessions.forEach(session => {
      (session.sets || []).forEach(set => {
        if (set.is_warmup || (set.reps || 0) <= 0) return;
        totalWeeklySets += 1;

        const exercise = exerciseMap.get(set.exercise_id);
        if (exercise && exercise.muscles && exercise.muscles.length > 0) {
          exercise.muscles.forEach(m => {
            const mId = m.muscle_id.toLowerCase();
            const groupKey = 
              mId.includes('tricep') ? 'triceps' :
              mId.includes('bicep') ? 'biceps' :
              mId.includes('chest') || mId.includes('pec') ? 'chest' :
              mId.includes('lats') || mId.includes('latiss') || mId.includes('back') || mId.includes('trap') || mId.includes('rhomboid') ? 'back' :
              mId.includes('quad') ? 'quads' :
              mId.includes('hamstring') || mId.includes('glute') ? 'hamstrings' :
              mId.includes('delt') || mId.includes('shoulder') ? 'shoulders' :
              mId.includes('abs') || mId.includes('core') || mId.includes('oblique') ? 'core' : null;

            if (groupKey && tallies[groupKey]) {
              if (m.role === 'primary') {
                tallies[groupKey].direct += 1;
                tallies[groupKey].fractional += 1;
              } else {
                tallies[groupKey].fractional += (m.weight || 0.5);
              }
            }
          });
        } else if (exercise?.category) {
          const cat = exercise.category.toLowerCase();
          if (cat === 'chest' && tallies.chest) tallies.chest.direct += 1;
          else if (cat === 'back' && tallies.back) tallies.back.direct += 1;
          else if (cat === 'legs') {
            if (tallies.quads) tallies.quads.direct += 1;
          } else if (cat === 'shoulders' && tallies.shoulders) tallies.shoulders.direct += 1;
          else if (cat === 'arms') {
            if (tallies.biceps) tallies.biceps.direct += 1;
          } else if (tallies.core) tallies.core.direct += 1;
        }
      });
    });

    const BENCHMARKS: Record<string, { name: string; category: string; icon: string; min: number; max: number }> = {
      chest: { name: 'Chest (Pectorals)', category: 'Upper Push', icon: '🛡️', min: 12, max: 18 },
      back: { name: 'Back & Lats', category: 'Upper Pull', icon: '🦅', min: 14, max: 20 },
      quads: { name: 'Quads & Squat Pattern', category: 'Lower Push', icon: '🦵', min: 12, max: 18 },
      hamstrings: { name: 'Hamstrings & Glutes', category: 'Lower Pull', icon: '🍑', min: 10, max: 16 },
      shoulders: { name: 'Deltoids & Overhead', category: 'Upper Push', icon: '🏹', min: 12, max: 18 },
      biceps: { name: 'Biceps & Pull Assistance', category: 'Arms', icon: '💪', min: 10, max: 16 },
      triceps: { name: 'Triceps & Lockout', category: 'Arms', icon: '⚡', min: 10, max: 16 },
      core: { name: 'Core & Stabilizers', category: 'Trunk', icon: '🧱', min: 8, max: 14 },
    };

    const metrics: MuscleVolumeMetric[] = Object.keys(BENCHMARKS).map(key => {
      const b = BENCHMARKS[key];
      const count = tallies[key]?.direct || 0;
      let status: 'under' | 'maintenance' | 'optimal' | 'high' = 'under';
      let statusLabel = 'Under-Stimulated (<6 sets)';
      let statusColor = 'text-zinc-400 bg-zinc-800/60 border-zinc-700/50';

      if (count >= b.min && count <= b.max) {
        status = 'optimal';
        statusLabel = 'Optimal Growth Zone 🎯';
        statusColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      } else if (count >= 6 && count < b.min) {
        status = 'maintenance';
        statusLabel = 'Maintenance Volume (MV)';
        statusColor = 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
      } else if (count > b.max) {
        status = 'high';
        statusLabel = 'High Volume / Watch Recovery ⚠️';
        statusColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      }

      return {
        id: key,
        name: b.name,
        category: b.category,
        icon: b.icon,
        directSets: count,
        fractionalSets: Number((tallies[key]?.fractional || count).toFixed(1)),
        targetMin: b.min,
        targetMax: b.max,
        status,
        statusLabel,
        statusColor,
      };
    });

    // Find least stimulated muscle for next session suggestion
    const sorted = [...metrics].sort((a, b) => a.directSets - b.directSets);
    const recommendedFocus = sorted[0]?.name || 'Full Body';

    return {
      metrics,
      totalWeeklySets,
      recommendedFocus,
      sessionsCount: recentSessions.length,
    };
  }

  static generateReportMarkdown(): string {
    const { metrics, totalWeeklySets, recommendedFocus, sessionsCount } = this.getWeeklyMuscleVolumes();
    const today = getTodayLocalDate();

    let md = `# 🏋️ GREEN DREAM HYPERTROPHY & MUSCLE VOLUME REPORT\n`;
    md += `**Date:** ${today} | **Workouts Logged (Past 7 Days):** ${sessionsCount} sessions | **Total Sets:** ${totalWeeklySets} sets\n`;
    md += `**Recommended Priority for Next Session:** 🎯 ${recommendedFocus}\n\n`;
    md += `| Muscle Group | Direct Sets | Target Range (MAV) | Volume Status |\n`;
    md += `|:---|:---:|:---:|:---|\n`;

    metrics.forEach(m => {
      md += `| ${m.icon} ${m.name} | **${m.directSets} sets** | ${m.targetMin}–${m.targetMax} sets | ${m.statusLabel} |\n`;
    });

    md += `\n*Scientific hypertrophy guidelines: 10–20 direct working sets per muscle group per week promotes maximal muscle protein synthesis while keeping systemic fatigue manageable.*\n`;
    return md;
  }
}
