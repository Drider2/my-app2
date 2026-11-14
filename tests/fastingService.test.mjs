import test from 'node:test';
import assert from 'node:assert/strict';

function parseTimeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function calculateCountdown(fajrTimeStr, maghribTimeStr, now) {
  const fajrMinutes = parseTimeToMinutes(fajrTimeStr);
  const maghribMinutes = parseTimeToMinutes(maghribTimeStr);
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  let isFastingNow = false;
  let targetLabel = '';
  let diffMinutes = 0;
  let progressPercent = 0;

  if (nowMinutes >= fajrMinutes && nowMinutes < maghribMinutes) {
    isFastingNow = true;
    targetLabel = 'Iftar (Maghrib)';
    diffMinutes = maghribMinutes - nowMinutes;
    const totalDuration = maghribMinutes - fajrMinutes;
    const elapsed = nowMinutes - fajrMinutes;
    progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  } else {
    isFastingNow = false;
    targetLabel = 'Suhur Cutoff (Fajr)';
    if (nowMinutes >= maghribMinutes) {
      diffMinutes = (1440 - nowMinutes) + fajrMinutes;
      const totalNight = (1440 - maghribMinutes) + fajrMinutes;
      const elapsed = nowMinutes - maghribMinutes;
      progressPercent = Math.min(100, Math.max(0, (elapsed / totalNight) * 100));
    } else {
      diffMinutes = fajrMinutes - nowMinutes;
      const totalNight = (1440 - maghribMinutes) + fajrMinutes;
      const elapsed = (1440 - maghribMinutes) + nowMinutes;
      progressPercent = Math.min(100, Math.max(0, (elapsed / totalNight) * 100));
    }
  }

  const totalSeconds = Math.max(0, Math.floor(diffMinutes * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return { isFastingNow, targetLabel, hours, minutes, progressPercent };
}

const METABOLIC_STAGES = [
  { id: 'fed', minHours: 0, maxHours: 4 },
  { id: 'early_fast', minHours: 4, maxHours: 12 },
  { id: 'ketosis', minHours: 12, maxHours: 18 },
  { id: 'autophagy', minHours: 18, maxHours: 24 },
  { id: 'deep_autophagy', minHours: 24, maxHours: 168 },
];

function getMetabolicStage(elapsedHours) {
  const stage = METABOLIC_STAGES.find(s => elapsedHours >= s.minHours && elapsedHours < s.maxHours);
  return stage || METABOLIC_STAGES[METABOLIC_STAGES.length - 1];
}

function calculateSessionProgress(session, nowMs) {
  const elapsedMs = Math.max(0, nowMs - session.start_time_ms);
  const totalElapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsedHours = totalElapsedSeconds / 3600;
  const wholeHoursElapsed = Math.floor(totalElapsedSeconds / 3600);
  const wholeMinutesElapsed = Math.floor((totalElapsedSeconds % 3600) / 60);

  const targetSeconds = session.target_hours * 3600;
  const remainingSecondsTotal = Math.max(0, targetSeconds - totalElapsedSeconds);

  const remainingHours = Math.floor(remainingSecondsTotal / 3600);
  const remainingMinutes = Math.floor((remainingSecondsTotal % 3600) / 60);

  const progressPercent = Math.min(100, (elapsedMs / (session.target_hours * 3600 * 1000)) * 100);
  const isTargetReached = elapsedHours >= session.target_hours;
  const currentStage = getMetabolicStage(elapsedHours);

  return {
    elapsedHours,
    wholeHoursElapsed,
    wholeMinutesElapsed,
    remainingHours,
    remainingMinutes,
    progressPercent,
    isTargetReached,
    stageId: currentStage.id,
  };
}

test('Fasting Countdown - Daytime window indicates active fast and counts down to Iftar', () => {
  // 12:00 PM (Noon), Fajr 05:00, Maghrib 19:00
  const noon = new Date(2026, 10, 9, 12, 0, 0);
  const res = calculateCountdown('05:00', '19:00', noon);

  assert.equal(res.isFastingNow, true);
  assert.equal(res.targetLabel, 'Iftar (Maghrib)');
  assert.equal(res.hours, 7);
  assert.equal(res.minutes, 0);
  assert.equal(Math.round(res.progressPercent), 50); // 7 hours elapsed out of 14 hours
});

test('Fasting Countdown - Nighttime window indicates eating window and counts down to Suhur/Fajr', () => {
  // 21:00 (9 PM), Fajr 05:00, Maghrib 19:00
  const night = new Date(2026, 10, 9, 21, 0, 0);
  const res = calculateCountdown('05:00', '19:00', night);

  assert.equal(res.isFastingNow, false);
  assert.equal(res.targetLabel, 'Suhur Cutoff (Fajr)');
  assert.equal(res.hours, 8); // 3 hours until midnight + 5 hours until Fajr = 8 hours
  assert.equal(res.minutes, 0);
});

test('Fasting Ledger - CSV export headers and data integrity', () => {
  const entries = [
    { local_date: '2026-11-09', type: 'sunnah_monday_thursday', completed: true, suhur_completed: true, iftar_completed: true, notes: 'Completed with ease' },
    { local_date: '2026-11-06', type: 'voluntary', completed: true, suhur_completed: true, iftar_completed: false, notes: '' },
  ];

  const headers = ['Date', 'Fasting Type', 'Completed', 'Suhur Logged', 'Iftar Logged', 'Notes'];
  const rows = entries.map(e => [
    e.local_date,
    e.type,
    e.completed ? 'YES' : 'NO',
    e.suhur_completed ? 'YES' : 'NO',
    e.iftar_completed ? 'YES' : 'NO',
    `"${(e.notes || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  assert.ok(csv.includes('Date,Fasting Type,Completed'));
  assert.ok(csv.includes('2026-11-09,sunnah_monday_thursday,YES,YES,YES,"Completed with ease"'));
});

test('Intermittent Fasting - Metabolic stages accurately mapped to elapsed hours', () => {
  assert.equal(getMetabolicStage(2).id, 'fed');
  assert.equal(getMetabolicStage(4).id, 'early_fast');
  assert.equal(getMetabolicStage(11.9).id, 'early_fast');
  assert.equal(getMetabolicStage(12).id, 'ketosis');
  assert.equal(getMetabolicStage(16).id, 'ketosis');
  assert.equal(getMetabolicStage(18).id, 'autophagy');
  assert.equal(getMetabolicStage(23.5).id, 'autophagy');
  assert.equal(getMetabolicStage(24).id, 'deep_autophagy');
  assert.equal(getMetabolicStage(48).id, 'deep_autophagy');
});

test('Intermittent Fasting - Session progress calculates remaining time and target completion', () => {
  const start = 1000000;
  const session = {
    start_time_ms: start,
    target_hours: 16,
    protocol: '16_8',
    is_active: true
  };

  // Check 12 hours later
  const now12h = start + 12 * 3600 * 1000;
  const p1 = calculateSessionProgress(session, now12h);
  assert.equal(p1.wholeHoursElapsed, 12);
  assert.equal(p1.remainingHours, 4);
  assert.equal(p1.remainingMinutes, 0);
  assert.equal(p1.progressPercent, 75);
  assert.equal(p1.isTargetReached, false);
  assert.equal(p1.stageId, 'ketosis');

  // Check 17.5 hours later
  const now17h30 = start + 17.5 * 3600 * 1000;
  const p2 = calculateSessionProgress(session, now17h30);
  assert.equal(p2.wholeHoursElapsed, 17);
  assert.equal(p2.wholeMinutesElapsed, 30);
  assert.equal(p2.remainingHours, 0);
  assert.equal(p2.remainingMinutes, 0);
  assert.equal(p2.progressPercent, 100);
  assert.equal(p2.isTargetReached, true);
  assert.equal(p2.stageId, 'ketosis');
});
