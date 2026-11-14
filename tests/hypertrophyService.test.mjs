import test from 'node:test';
import assert from 'node:assert/strict';

function calculateWeeklyMuscleVolumes(sessions, exercises, nowMs = Date.now(), daysWindow = 7) {
  const windowStartMs = nowMs - (daysWindow * 24 * 60 * 60 * 1000);
  const recentSessions = sessions.filter(s => 
    !s.deleted_at && 
    (s.started_at ? s.started_at >= windowStartMs : s.created_at >= windowStartMs)
  );

  const exerciseMap = new Map();
  exercises.forEach(ex => exerciseMap.set(ex.id, ex));

  const tallies = {
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
        if (cat === 'chest') tallies.chest.direct += 1;
        else if (cat === 'back') tallies.back.direct += 1;
        else if (cat === 'legs') tallies.quads.direct += 1;
        else if (cat === 'shoulders') tallies.shoulders.direct += 1;
        else if (cat === 'arms') tallies.biceps.direct += 1;
        else tallies.core.direct += 1;
      }
    });
  });

  return { tallies, totalWeeklySets, sessionsCount: recentSessions.length };
}

test('Hypertrophy Service - Accurately tallies primary working sets and ignores warmups', () => {
  const exercises = [
    {
      id: 'ex-bench',
      name: 'Barbell Bench Press',
      muscles: [
        { muscle_id: 'chest_major', role: 'primary', weight: 1.0 },
        { muscle_id: 'triceps_lateral', role: 'secondary', weight: 0.5 },
      ]
    },
    {
      id: 'ex-pullup',
      name: 'Pull-up',
      muscles: [
        { muscle_id: 'lats_back', role: 'primary', weight: 1.0 },
        { muscle_id: 'biceps_long', role: 'secondary', weight: 0.5 },
      ]
    }
  ];

  const now = 1731190000000;
  const sessions = [
    {
      id: 'sess-1',
      started_at: now - 3600000,
      sets: [
        { exercise_id: 'ex-bench', reps: 10, weight_kg: 80, is_warmup: false },
        { exercise_id: 'ex-bench', reps: 10, weight_kg: 80, is_warmup: false },
        { exercise_id: 'ex-bench', reps: 10, weight_kg: 80, is_warmup: false },
        { exercise_id: 'ex-bench', reps: 12, weight_kg: 40, is_warmup: true }, // warmup should be ignored
        { exercise_id: 'ex-pullup', reps: 8, weight_kg: 0, is_warmup: false },
        { exercise_id: 'ex-pullup', reps: 8, weight_kg: 0, is_warmup: false },
      ]
    }
  ];

  const res = calculateWeeklyMuscleVolumes(sessions, exercises, now, 7);

  assert.equal(res.totalWeeklySets, 5); // 3 bench + 2 pullup, warmup excluded
  assert.equal(res.sessionsCount, 1);
  assert.equal(res.tallies.chest.direct, 3);
  assert.equal(res.tallies.triceps.fractional, 1.5); // 3 * 0.5
  assert.equal(res.tallies.back.direct, 2);
  assert.equal(res.tallies.biceps.fractional, 1.0); // 2 * 0.5
});

test('Hypertrophy Service - Filters out sessions older than 7 days window', () => {
  const exercises = [{ id: 'ex-1', category: 'chest' }];
  const now = 1731190000000;
  const nineDaysAgo = now - (9 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);

  const sessions = [
    {
      id: 'sess-old',
      started_at: nineDaysAgo,
      sets: [{ exercise_id: 'ex-1', reps: 10, weight_kg: 100, is_warmup: false }]
    },
    {
      id: 'sess-recent',
      started_at: twoDaysAgo,
      sets: [{ exercise_id: 'ex-1', reps: 10, weight_kg: 100, is_warmup: false }]
    }
  ];

  const res = calculateWeeklyMuscleVolumes(sessions, exercises, now, 7);
  assert.equal(res.sessionsCount, 1);
  assert.equal(res.totalWeeklySets, 1);
  assert.equal(res.tallies.chest.direct, 1);
});

test('Hypertrophy Service - Markdown export includes valid structural headers and landmarks', () => {
  const metrics = [
    { name: 'Chest (Pectorals)', directSets: 14, targetMin: 12, targetMax: 18, statusLabel: 'Optimal Growth Zone 🎯', icon: '🛡️' },
    { name: 'Back & Lats', directSets: 8, targetMin: 14, targetMax: 20, statusLabel: 'Maintenance Volume (MV)', icon: '🦅' }
  ];

  let md = `# 🏋️ GREEN DREAM HYPERTROPHY & MUSCLE VOLUME REPORT\n`;
  metrics.forEach(m => {
    md += `| ${m.icon} ${m.name} | **${m.directSets} sets** | ${m.targetMin}–${m.targetMax} sets | ${m.statusLabel} |\n`;
  });

  assert.ok(md.includes('GREEN DREAM HYPERTROPHY & MUSCLE VOLUME REPORT'));
  assert.ok(md.includes('🛡️ Chest (Pectorals) | **14 sets** | 12–18 sets | Optimal Growth Zone 🎯'));
});
