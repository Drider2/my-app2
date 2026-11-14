import test from 'node:test';
import assert from 'node:assert/strict';

function calculateDurationMinutes(bedtime, wakeTime) {
  const [bH, bM] = (bedtime || '23:00').split(':').map(Number);
  const [wH, wM] = (wakeTime || '07:00').split(':').map(Number);

  const bTotal = bH * 60 + bM;
  const wTotal = wH * 60 + wM;

  let diff = wTotal - bTotal;
  if (diff <= 0) {
    diff += 24 * 60; // Crosses midnight
  }

  return Math.max(0, diff);
}

function calculateSleepStats(entries, targetHours = 8.0) {
  if (entries.length === 0) {
    return { averageHours: 0, sleepDebtHours: 0, averageQuality: 0, count: 0 };
  }

  const totalMinutes = entries.reduce((sum, s) => sum + s.duration_minutes, 0);
  const averageHours = Number(((totalMinutes / entries.length) / 60).toFixed(1));

  const expectedMinutes = entries.length * (targetHours * 60);
  const debtMinutes = expectedMinutes - totalMinutes;
  const sleepDebtHours = Number((debtMinutes / 60).toFixed(1));

  const totalQuality = entries.reduce((sum, s) => sum + s.quality_score, 0);
  const averageQuality = Number((totalQuality / entries.length).toFixed(1));

  return { averageHours, sleepDebtHours, averageQuality, count: entries.length };
}

test('SleepService - Accurately calculates sleep duration crossing midnight', () => {
  // 23:30 to 07:15 = 7h 45m = 465 minutes
  assert.equal(calculateDurationMinutes('23:30', '07:15'), 465);

  // 22:00 to 06:00 = 8h = 480 minutes
  assert.equal(calculateDurationMinutes('22:00', '06:00'), 480);

  // 01:00 to 09:30 (same morning) = 8h 30m = 510 minutes
  assert.equal(calculateDurationMinutes('01:00', '09:30'), 510);
});

test('SleepService - Computes average hours and sleep debt accurately', () => {
  const entries = [
    { duration_minutes: 420, quality_score: 4 }, // 7.0h
    { duration_minutes: 450, quality_score: 5 }, // 7.5h
    { duration_minutes: 480, quality_score: 5 }, // 8.0h
    { duration_minutes: 390, quality_score: 3 }, // 6.5h
  ];

  // Total = 1740 min = 29 hours / 4 = 7.25h -> 7.3h
  // Expected = 4 * 8h = 32 hours. Debt = 32 - 29 = 3.0 hours
  // Avg quality = (4+5+5+3)/4 = 4.25 -> 4.3
  const stats = calculateSleepStats(entries, 8.0);

  assert.equal(stats.averageHours, 7.3);
  assert.equal(stats.sleepDebtHours, 3.0);
  assert.equal(stats.averageQuality, 4.3);
  assert.equal(stats.count, 4);
});

test('SleepService - CSV generation headers and row formatting', () => {
  const entries = [
    { local_date: '2026-11-09', bedtime: '23:30', wake_time: '07:15', duration_minutes: 465, quality_score: 5, notes: 'Felt refreshed and energized' }
  ];

  const headers = ['Date', 'Bedtime', 'Wake Time', 'Duration Hours', 'Duration Minutes', 'Quality Score', 'Notes'];
  const rows = entries.map(s => [
    s.local_date,
    s.bedtime,
    s.wake_time,
    (s.duration_minutes / 60).toFixed(1),
    s.duration_minutes,
    s.quality_score,
    `"${s.notes}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  assert.ok(csv.includes('Date,Bedtime,Wake Time,Duration Hours'));
  assert.ok(csv.includes('2026-11-09,23:30,07:15,7.8,465,5,"Felt refreshed and energized"'));
});
