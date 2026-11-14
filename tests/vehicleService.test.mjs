import test from 'node:test';
import assert from 'node:assert/strict';

function calculateNextServiceMileage(odometerKm, intervalKm) {
  return odometerKm + Math.max(1000, intervalKm || 10000);
}

function calculateCostAndKmRemaining(odometerKm, nextMileageKm, partsCostDA, laborCostDA = 0) {
  const totalCostDA = Math.max(0, partsCostDA + laborCostDA);
  const kmRemaining = nextMileageKm - odometerKm;
  const isOverdue = kmRemaining <= 0;
  return { totalCostDA, kmRemaining, isOverdue };
}

test('VehicleService - Accurately projects next service mileage and costs', () => {
  const currentOdo = 142500;
  const interval = 10000;
  const nextMileage = calculateNextServiceMileage(currentOdo, interval);

  assert.equal(nextMileage, 152500);

  const stats = calculateCostAndKmRemaining(currentOdo, nextMileage, 6500, 1500);
  assert.equal(stats.totalCostDA, 8000);
  assert.equal(stats.kmRemaining, 10000);
  assert.equal(stats.isOverdue, false);
});

test('VehicleService - Flags overdue maintenance when current odometer exceeds threshold', () => {
  const currentOdo = 153200;
  const scheduledMileage = 152500;
  const stats = calculateCostAndKmRemaining(currentOdo, scheduledMileage, 7000);

  assert.equal(stats.kmRemaining, -700);
  assert.equal(stats.isOverdue, true);
});

test('VehicleService - CSV headers and service line formatting', () => {
  const items = [
    { name: 'Engine Oil Change', date: '2026-11-09', odo: 142500, cost: 7500, nextOdo: 152500, status: 'completed', notes: 'Castrol 10W40' }
  ];

  const headers = ['Service Item', 'Date', 'Odometer (km)', 'Total Cost (DA)', 'Next Mileage (km)', 'Status', 'Notes'];
  const rows = items.map(i => [
    `"${i.name}"`,
    i.date,
    i.odo,
    i.cost,
    i.nextOdo,
    i.status,
    `"${i.notes}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  assert.ok(csv.includes('Service Item,Date,Odometer (km),Total Cost (DA)'));
  assert.ok(csv.includes('"Engine Oil Change",2026-11-09,142500,7500,152500,completed,"Castrol 10W40"'));
});
