import test from 'node:test';
import assert from 'node:assert/strict';

function calculateZakat(input) {
  const totalAssets = Math.max(0, 
    (input.cashInHandBank || 0) + 
    (input.goldSilverValue || 0) + 
    (input.tradeGoodsValue || 0) + 
    (input.receivablesOwedToYou || 0)
  );

  const totalLiabilities = Math.max(0, input.immediateDebtsOwed || 0);
  const netZakatableWealth = Math.max(0, totalAssets - totalLiabilities);
  const nisabThreshold = input.nisabThresholdDA > 0 ? input.nisabThresholdDA : 952000;

  const isZakatObligatory = netZakatableWealth >= nisabThreshold;
  const zakatDueDA = isZakatObligatory ? Math.round(netZakatableWealth * 0.025) : 0;

  return {
    totalAssets,
    totalLiabilities,
    netZakatableWealth,
    nisabThreshold,
    isZakatObligatory,
    zakatDueDA,
  };
}

test('ZakatService - Accurately calculates 2.5% when net wealth exceeds Nisab', () => {
  const input = {
    cashInHandBank: 800000,
    goldSilverValue: 400000,
    tradeGoodsValue: 200000,
    receivablesOwedToYou: 100000,
    immediateDebtsOwed: 300000,
    nisabThresholdDA: 950000, // 950,000 DA
  };

  const res = calculateZakat(input);

  // Total Assets = 800k + 400k + 200k + 100k = 1,500,000 DA
  // Total Liabilities = 300,000 DA
  // Net Zakatable Wealth = 1,200,000 DA (Exceeds Nisab 950,000)
  // Zakat = 1,200,000 * 0.025 = 30,000 DA
  assert.equal(res.totalAssets, 1500000);
  assert.equal(res.totalLiabilities, 300000);
  assert.equal(res.netZakatableWealth, 1200000);
  assert.equal(res.isZakatObligatory, true);
  assert.equal(res.zakatDueDA, 300000 * 0.1); // 30,000 DA
  assert.equal(res.zakatDueDA, 30000);
});

test('ZakatService - Yields 0 Zakat when net wealth is below Nisab', () => {
  const input = {
    cashInHandBank: 500000,
    goldSilverValue: 100000,
    tradeGoodsValue: 0,
    receivablesOwedToYou: 50000,
    immediateDebtsOwed: 200000,
    nisabThresholdDA: 950000,
  };

  const res = calculateZakat(input);

  // Total Assets = 650,000 DA
  // Net = 450,000 DA (< 950,000 DA)
  assert.equal(res.netZakatableWealth, 450000);
  assert.equal(res.isZakatObligatory, false);
  assert.equal(res.zakatDueDA, 0);
});

test('ZakatService - Handles zero inputs and negative liability protections gracefully', () => {
  const input = {
    cashInHandBank: 100000,
    goldSilverValue: 0,
    tradeGoodsValue: 0,
    receivablesOwedToYou: 0,
    immediateDebtsOwed: 500000, // Liabilities exceed assets
    nisabThresholdDA: 950000,
  };

  const res = calculateZakat(input);
  assert.equal(res.totalAssets, 100000);
  assert.equal(res.netZakatableWealth, 0);
  assert.equal(res.isZakatObligatory, false);
  assert.equal(res.zakatDueDA, 0);
});
