import { db, generateUUID, getTodayLocalDate, formatCurrency } from './storage';
import { FinanceService } from './financeService';
import { BalanceSheetAsset, BalanceSheetLiability } from '../types';

export interface RunwayStatus {
  tier: 'critical' | 'fragile' | 'stable' | 'resilient' | 'fortress';
  label: string;
  badgeClass: string;
  advice: string;
}

export interface NetWorthSummary {
  liquidCashMinor: number;
  savingsBalanceMinor: number;
  moneyOwedToMeMinor: number;
  customAssetsMinor: number;
  totalAssetsMinor: number;

  customLiabilitiesMinor: number;
  totalLiabilitiesMinor: number;

  netWorthMinor: number;

  monthlyBurnRateMinor: number;
  runwayMonths: number;
  runwayStatus: RunwayStatus;
  targetRunwayMonths: number;
  targetFundMinor: number;
  emergencyFundGapMinor: number;

  assets: BalanceSheetAsset[];
  liabilities: BalanceSheetLiability[];
}

export class NetWorthService {
  static getRunwayStatus(months: number): RunwayStatus {
    if (months < 1.0) {
      return {
        tier: 'critical',
        label: 'Critical Risk 🚨',
        badgeClass: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
        advice: 'Less than 1 month living expenses. Immediate focus on cash flow protection.',
      };
    }
    if (months < 3.0) {
      return {
        tier: 'fragile',
        label: 'Fragile Buffer ⚠️',
        badgeClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        advice: '1 to 3 months covered. Recommend routing savings to 3-month baseline.',
      };
    }
    if (months < 6.0) {
      return {
        tier: 'stable',
        label: 'Protected 🛡️',
        badgeClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
        advice: 'Solid 3 to 6 months emergency cushion. Protected against sudden shocks.',
      };
    }
    if (months < 12.0) {
      return {
        tier: 'resilient',
        label: 'Resilient Fortress 🏰',
        badgeClass: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
        advice: '6 to 12 months comprehensive reserve. Strong defensive stability.',
      };
    }
    return {
      tier: 'fortress',
      label: 'Financial Fortress 👑',
      badgeClass: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
      advice: 'Over 1 year complete living expense autonomy. High independence.',
    };
  }

  static getSummary(targetRunwayMonths: number = 6): NetWorthSummary {
    const state = db.getState();
    const cashSummary = FinanceService.getCashBalanceSummary();

    const liquidCashMinor = cashSummary.availableCashMinor;
    const savingsBalanceMinor = cashSummary.currentSavingsMinor;
    const moneyOwedToMeMinor = cashSummary.moneyOwedToMeMinor;

    // Custom Assets
    const customAssets = (state.customAssets || []).filter(a => !a.deleted_at);
    const customAssetsMinor = customAssets.reduce((sum, a) => sum + a.value_minor, 0);

    // Dynamic auto-synced assets representation
    const autoAssets: BalanceSheetAsset[] = [
      {
        id: 'auto-cash',
        name: 'Checking & Cash on Hand',
        category: 'liquid_cash',
        value_minor: liquidCashMinor,
        is_auto_synced: true,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      },
      {
        id: 'auto-savings',
        name: 'Bank Savings Account',
        category: 'savings',
        value_minor: savingsBalanceMinor,
        is_auto_synced: true,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      },
      ...(moneyOwedToMeMinor > 0 ? [{
        id: 'auto-receivables',
        name: 'Loans Lent to Others (Receivables)',
        category: 'receivable' as const,
        value_minor: moneyOwedToMeMinor,
        is_auto_synced: true,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      }] : []),
    ];

    const allAssets = [...autoAssets, ...customAssets];
    const totalAssetsMinor = liquidCashMinor + savingsBalanceMinor + moneyOwedToMeMinor + customAssetsMinor;

    // Custom Liabilities
    const customLiabilities = (state.customLiabilities || []).filter(l => !l.deleted_at);
    const customLiabilitiesMinor = customLiabilities.reduce((sum, l) => sum + l.amount_minor, 0);
    const totalLiabilitiesMinor = customLiabilitiesMinor;

    const netWorthMinor = totalAssetsMinor - totalLiabilitiesMinor;

    // Monthly Burn Rate calculation:
    // Check 30-day expense or monthExpenseMinor, fallback to reasonable living baseline of 35,000 DA if 0
    let monthlyBurnRateMinor = cashSummary.monthExpenseMinor;
    if (monthlyBurnRateMinor <= 0) {
      // Sum last 3 months expenses or default 35,000 DA
      monthlyBurnRateMinor = 3500000;
    }

    const liquidReserveMinor = liquidCashMinor + savingsBalanceMinor;
    const runwayMonths = monthlyBurnRateMinor > 0 ? (liquidReserveMinor / monthlyBurnRateMinor) : 0;
    const roundedRunwayMonths = Number(runwayMonths.toFixed(1));
    const runwayStatus = this.getRunwayStatus(roundedRunwayMonths);

    const targetFundMinor = Math.round(monthlyBurnRateMinor * targetRunwayMonths);
    const emergencyFundGapMinor = liquidReserveMinor - targetFundMinor;

    return {
      liquidCashMinor,
      savingsBalanceMinor,
      moneyOwedToMeMinor,
      customAssetsMinor,
      totalAssetsMinor,
      customLiabilitiesMinor,
      totalLiabilitiesMinor,
      netWorthMinor,
      monthlyBurnRateMinor,
      runwayMonths: roundedRunwayMonths,
      runwayStatus,
      targetRunwayMonths,
      targetFundMinor,
      emergencyFundGapMinor,
      assets: allAssets,
      liabilities: customLiabilities,
    };
  }

  static addCustomAsset(
    name: string,
    category: BalanceSheetAsset['category'],
    valueMajor: number,
    notes?: string
  ): BalanceSheetAsset {
    const now = Date.now();
    const newAsset: BalanceSheetAsset = {
      id: generateUUID(),
      name: name.trim(),
      category,
      value_minor: Math.round(valueMajor * 100),
      notes: notes?.trim() || undefined,
      is_auto_synced: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(state => {
      if (!state.customAssets) state.customAssets = [];
      state.customAssets.unshift(newAsset);
    });

    return newAsset;
  }

  static deleteCustomAsset(id: string): void {
    const now = Date.now();
    db.updateState(state => {
      if (!state.customAssets) return;
      const target = state.customAssets.find(a => a.id === id);
      if (target) {
        target.deleted_at = now;
        target.updated_at = now;
      }
    });
  }

  static addCustomLiability(
    name: string,
    amountMajor: number,
    creditor?: string,
    dueDate?: string,
    notes?: string
  ): BalanceSheetLiability {
    const now = Date.now();
    const newLiability: BalanceSheetLiability = {
      id: generateUUID(),
      name: name.trim(),
      creditor: creditor?.trim() || undefined,
      amount_minor: Math.round(amountMajor * 100),
      due_date: dueDate || undefined,
      notes: notes?.trim() || undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(state => {
      if (!state.customLiabilities) state.customLiabilities = [];
      state.customLiabilities.unshift(newLiability);
    });

    return newLiability;
  }

  static deleteCustomLiability(id: string): void {
    const now = Date.now();
    db.updateState(state => {
      if (!state.customLiabilities) return;
      const target = state.customLiabilities.find(l => l.id === id);
      if (target) {
        target.deleted_at = now;
        target.updated_at = now;
      }
    });
  }

  static exportBalanceSheetMd(summary: NetWorthSummary): string {
    const today = getTodayLocalDate();
    return `# Net Worth & Balance Sheet Statement
**As of Date:** ${today}
**Application:** GreenDream Personal Wealth Management

---

## 🏛️ Executive Summary
| Metric | Value |
| :--- | :--- |
| **Total Net Worth** | **${formatCurrency(summary.netWorthMinor)}** |
| **Total Assets** | **${formatCurrency(summary.totalAssetsMinor)}** |
| **Total Liabilities** | **${formatCurrency(summary.totalLiabilitiesMinor)}** |
| **Emergency Fund Runway** | **${summary.runwayMonths} Months** (${summary.runwayStatus.label}) |
| **Monthly Burn Rate** | **${formatCurrency(summary.monthlyBurnRateMinor)} / month** |
| **${summary.targetRunwayMonths}-Month Emergency Target** | **${formatCurrency(summary.targetFundMinor)}** |
| **Runway Gap / Surplus** | **${summary.emergencyFundGapMinor >= 0 ? '+' : ''}${formatCurrency(summary.emergencyFundGapMinor)}** |

---

## 📈 Assets Breakdown
| Asset Name | Category | Value (DA) | Status |
| :--- | :--- | :--- | :--- |
${summary.assets.map(a => `| ${a.name} | ${a.category.replace('_', ' ').toUpperCase()} | ${formatCurrency(a.value_minor)} | ${a.is_auto_synced ? 'Auto-synced' : 'Manual'} |`).join('\n')}

---

## 📉 Liabilities Breakdown
| Liability Name | Creditor / Source | Due Date | Amount (DA) |
| :--- | :--- | :--- | :--- |
${summary.liabilities.length === 0 ? '| *No active liabilities recorded* | - | - | 0 DA |' : summary.liabilities.map(l => `| ${l.name} | ${l.creditor || '-'} | ${l.due_date || '-'} | ${formatCurrency(l.amount_minor)} |`).join('\n')}

---

*Generated autonomously via GreenDream Executive Wealth Desk.*
`;
  }

  static exportBalanceSheetCsv(summary: NetWorthSummary): string {
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

    const summaryRows = [
      ['SUMMARY', 'TOTAL ASSETS', '', (summary.totalAssetsMinor / 100).toFixed(2), ''],
      ['SUMMARY', 'TOTAL LIABILITIES', '', (summary.totalLiabilitiesMinor / 100).toFixed(2), ''],
      ['SUMMARY', 'NET WORTH', '', (summary.netWorthMinor / 100).toFixed(2), ''],
      ['SUMMARY', 'RUNWAY MONTHS', '', summary.runwayMonths.toString(), summary.runwayStatus.label],
    ];

    return [
      headers.join(','),
      ...assetRows.map(r => r.join(',')),
      ...liabilityRows.map(r => r.join(',')),
      ...summaryRows.map(r => r.join(',')),
    ].join('\n');
  }
}
