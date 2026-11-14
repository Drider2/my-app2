import test from 'node:test';
import assert from 'node:assert/strict';

function getRunwayStatus(months) {
  if (months < 1.0) {
    return { tier: 'critical', label: 'Critical Risk 🚨' };
  }
  if (months < 3.0) {
    return { tier: 'fragile', label: 'Fragile Buffer ⚠️' };
  }
  if (months < 6.0) {
    return { tier: 'stable', label: 'Protected 🛡️' };
  }
  if (months < 12.0) {
    return { tier: 'resilient', label: 'Resilient Fortress 🏰' };
  }
  return { tier: 'fortress', label: 'Financial Fortress 👑' };
}

function calculateNetWorth(liquidCashMinor, savingsMinor, receivablesMinor, customAssetsMinor, customLiabilitiesMinor, monthlyBurnRateMinor, targetMonths = 6) {
  const totalAssetsMinor = liquidCashMinor + savingsMinor + receivablesMinor + customAssetsMinor;
  const totalLiabilitiesMinor = customLiabilitiesMinor;
  const netWorthMinor = totalAssetsMinor - totalLiabilitiesMinor;

  const liquidReserveMinor = liquidCashMinor + savingsMinor;
  const runwayMonths = monthlyBurnRateMinor > 0 ? Number((liquidReserveMinor / monthlyBurnRateMinor).toFixed(1)) : 0;
  const runwayStatus = getRunwayStatus(runwayMonths);

  const targetFundMinor = Math.round(monthlyBurnRateMinor * targetMonths);
  const emergencyFundGapMinor = liquidReserveMinor - targetFundMinor;

  return {
    totalAssetsMinor,
    totalLiabilitiesMinor,
    netWorthMinor,
    runwayMonths,
    runwayStatus,
    targetFundMinor,
    emergencyFundGapMinor
  };
}

test('NetWorthService - Accurately categorizes runway health status tiers', () => {
  assert.equal(getRunwayStatus(0.5).tier, 'critical');
  assert.equal(getRunwayStatus(1.0).tier, 'fragile');
  assert.equal(getRunwayStatus(2.9).tier, 'fragile');
  assert.equal(getRunwayStatus(3.0).tier, 'stable');
  assert.equal(getRunwayStatus(5.5).tier, 'stable');
  assert.equal(getRunwayStatus(6.0).tier, 'resilient');
  assert.equal(getRunwayStatus(11.9).tier, 'resilient');
  assert.equal(getRunwayStatus(12.0).tier, 'fortress');
  assert.equal(getRunwayStatus(24.0).tier, 'fortress');
});

test('NetWorthService - Computes Net Worth, Emergency Runway and Surplus/Deficit correctly', () => {
  // 150,000 DA cash + 50,000 DA savings + 0 receivables + 500,000 DA car asset
  const cashMinor = 15000000;
  const savingsMinor = 5000000;
  const receivablesMinor = 0;
  const customAssetsMinor = 50000000;
  const customLiabilitiesMinor = 6000000; // 60,000 DA debt
  const burnRateMinor = 4000000; // 40,000 DA / month

  const res = calculateNetWorth(
    cashMinor,
    savingsMinor,
    receivablesMinor,
    customAssetsMinor,
    customLiabilitiesMinor,
    burnRateMinor,
    6
  );

  // Total Assets: 150k + 50k + 500k = 700k DA
  assert.equal(res.totalAssetsMinor, 70000000);
  // Total Liabilities: 60k DA
  assert.equal(res.totalLiabilitiesMinor, 6000000);
  // Net Worth: 700k - 60k = 640k DA
  assert.equal(res.netWorthMinor, 64000000);

  // Liquid Reserve: 200k DA / 40k monthly = 5.0 months
  assert.equal(res.runwayMonths, 5.0);
  assert.equal(res.runwayStatus.tier, 'stable');

  // Target Fund (6 mos * 40k): 240,000 DA
  assert.equal(res.targetFundMinor, 24000000);
  // Gap: 200k - 240k = -40,000 DA (shortfall of 1 month)
  assert.equal(res.emergencyFundGapMinor, -4000000);
});

test('NetWorthService - Balance Sheet CSV generation format integrity', () => {
  const summary = {
    totalAssetsMinor: 70000000,
    totalLiabilitiesMinor: 6000000,
    netWorthMinor: 64000000,
    runwayMonths: 5.0,
    runwayStatus: { label: 'Protected 🛡️' },
    assets: [
      { name: 'Checking Cash', category: 'liquid_cash', value_minor: 15000000, is_auto_synced: true },
      { name: 'Vehicle', category: 'vehicle', value_minor: 50000000, is_auto_synced: false, notes: 'Peugeot 208' }
    ],
    liabilities: [
      { name: 'Loan to Uncle', creditor: 'Uncle Ahmed', amount_minor: 6000000, notes: 'Due Dec 2026' }
    ]
  };

  const headers = ['Type', 'Item Name', 'Category / Creditor', 'Amount DA', 'Notes'];
  const assetRows = summary.assets.map(a => [
    'ASSET',
    `"${a.name.replace(/"/g, '""')}"`,
    a.category,
    (a.value_minor / 100).toFixed(2),
    a.is_auto_synced ? '"Auto-synced from live ledger"' : `"${(a.notes || '').replace(/"/g, '""')}"`,
  ]);

  const liabilityRows = summary.liabilities.map(l => [
    'LIABILITY',
    `"${l.name.replace(/"/g, '""')}"`,
    `"${(l.creditor || '').replace(/"/g, '""')}"`,
    (l.amount_minor / 100).toFixed(2),
    `"${(l.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...assetRows.map(r => r.join(',')), ...liabilityRows.map(r => r.join(','))].join('\n');
  assert.ok(csv.includes('ASSET,"Checking Cash",liquid_cash,150000.00,"Auto-synced from live ledger"'));
  assert.ok(csv.includes('ASSET,"Vehicle",vehicle,500000.00,"Peugeot 208"'));
  assert.ok(csv.includes('LIABILITY,"Loan to Uncle","Uncle Ahmed",60000.00,"Due Dec 2026"'));
});
