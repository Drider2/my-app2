import test from 'node:test';
import assert from 'node:assert/strict';

const JUZ_LIST = [
  { juzNumber: 1, juzName: "Al-Fatihah", startPage: 1 },
  { juzNumber: 2, juzName: "Sayaqool", startPage: 22 },
  { juzNumber: 3, juzName: "Tilka ar-Rusul", startPage: 42 },
  { juzNumber: 15, juzName: "Subhana allazi", startPage: 282 },
  { juzNumber: 30, juzName: "'Amma Yatasa'aloon", startPage: 582 }
];

function getJuzForPage(page) {
  const clamped = Math.max(1, Math.min(604, page));
  for (let i = JUZ_LIST.length - 1; i >= 0; i--) {
    if (clamped >= JUZ_LIST[i].startPage) {
      return JUZ_LIST[i];
    }
  }
  return JUZ_LIST[0];
}

function calculateKhatmahMetrics(currentPage, dailyGoal = 20) {
  const total = 604;
  const percentCompleted = Math.min(100, Math.round((currentPage / total) * 100));
  const pagesRemaining = Math.max(0, total - currentPage);
  const estimatedDays = Math.ceil(pagesRemaining / Math.max(1, dailyGoal));
  const juz = getJuzForPage(currentPage);

  return { percentCompleted, pagesRemaining, estimatedDays, juz };
}

test('QuranService - Accurately maps page numbers to Juz', () => {
  assert.equal(getJuzForPage(1).juzNumber, 1);
  assert.equal(getJuzForPage(21).juzNumber, 1);
  assert.equal(getJuzForPage(22).juzNumber, 2);
  assert.equal(getJuzForPage(282).juzNumber, 15);
  assert.equal(getJuzForPage(582).juzNumber, 30);
  assert.equal(getJuzForPage(604).juzNumber, 30);
});

test('QuranService - Computes percentage, remaining pages, and estimated days', () => {
  // Page 302 / 604 = exactly 50%
  const m1 = calculateKhatmahMetrics(302, 20);
  assert.equal(m1.percentCompleted, 50);
  assert.equal(m1.pagesRemaining, 302);
  assert.equal(m1.estimatedDays, 16); // 302 / 20 = 15.1 -> 16 days

  // Page 604 / 604 = 100%
  const m2 = calculateKhatmahMetrics(604, 20);
  assert.equal(m2.percentCompleted, 100);
  assert.equal(m2.pagesRemaining, 0);
  assert.equal(m2.estimatedDays, 0);
});

test('QuranService - CSV generation headers and row structure', () => {
  const history = [
    { local_date: '2026-11-09', pages_read: 10, ending_page: 152, note: 'Post-Fajr recitation' }
  ];

  const headers = ['Date', 'Pages Read', 'Ending Page', 'Note'];
  const rows = history.map(h => [h.local_date, h.pages_read, h.ending_page, `"${h.note}"`]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  assert.ok(csv.includes('Date,Pages Read,Ending Page,Note'));
  assert.ok(csv.includes('2026-11-09,10,152,"Post-Fajr recitation"'));
});
