import { db, generateUUID, getTodayLocalDate } from './storage';
import { Transaction } from '../types';

export interface ZakatCalculationInput {
  cashInHandBank: number;
  goldSilverValue: number;
  tradeGoodsValue: number;
  receivablesOwedToYou: number;
  immediateDebtsOwed: number;
  nisabThresholdDA: number;
  goldPricePerGramDA?: number;
}

export interface ZakatCalculationResult {
  totalAssets: number;
  totalLiabilities: number;
  netZakatableWealth: number;
  nisabThreshold: number;
  isZakatObligatory: boolean;
  zakatDueDA: number;
  statusLabel: string;
}

export class ZakatService {
  // Estimated default benchmarks in Algeria (85g Gold Nisab)
  static DEFAULT_GOLD_PRICE_PER_GRAM_DA = 11200; // ~11,200 DA/g 24k
  static DEFAULT_NISAB_GOLD_DA = 85 * 11200; // 952,000 DA

  static calculateZakat(input: ZakatCalculationInput): ZakatCalculationResult {
    const totalAssets = Math.max(0, 
      (input.cashInHandBank || 0) + 
      (input.goldSilverValue || 0) + 
      (input.tradeGoodsValue || 0) + 
      (input.receivablesOwedToYou || 0)
    );

    const totalLiabilities = Math.max(0, input.immediateDebtsOwed || 0);
    const netZakatableWealth = Math.max(0, totalAssets - totalLiabilities);
    const nisabThreshold = input.nisabThresholdDA > 0 ? input.nisabThresholdDA : this.DEFAULT_NISAB_GOLD_DA;

    const isZakatObligatory = netZakatableWealth >= nisabThreshold;
    const zakatDueDA = isZakatObligatory ? Math.round(netZakatableWealth * 0.025) : 0;

    const statusLabel = isZakatObligatory
      ? 'Zakat is Obligatory (Wealth exceeds Nisab) 🌙'
      : 'Below Nisab Threshold (Voluntary Sadaqah encouraged) ✨';

    return {
      totalAssets,
      totalLiabilities,
      netZakatableWealth,
      nisabThreshold,
      isZakatObligatory,
      zakatDueDA,
      statusLabel,
    };
  }

  static getMonthlySadaqahStats(targetMonthStr?: string): {
    totalContributedDA: number;
    monthlyTargetDA: number;
    percentReached: number;
    contributionsCount: number;
  } {
    const state = db.getState();
    const today = getTodayLocalDate();
    const month = targetMonthStr || today.slice(0, 7); // YYYY-MM

    const charityTransactions = (state.transactions || []).filter(tx => {
      if (tx.deleted_at || tx.type !== 'expense') return false;
      const txMonth = tx.local_date.slice(0, 7);
      if (txMonth !== month) return false;

      return (
        tx.category_id === 'cat-sadaqah' ||
        tx.note?.toLowerCase().includes('sadaqah') ||
        tx.note?.toLowerCase().includes('zakat') ||
        tx.note?.toLowerCase().includes('charity')
      );
    });

    const totalMinor = charityTransactions.reduce((acc, tx) => acc + (tx.amount_minor || 0), 0);
    const totalContributedDA = totalMinor / 100;

    const monthlyTargetDA = (state.sadaqahSettings?.monthly_target_minor || 500000) / 100;
    const percentReached = monthlyTargetDA > 0 
      ? Math.min(100, Math.round((totalContributedDA / monthlyTargetDA) * 100))
      : 0;

    return {
      totalContributedDA,
      monthlyTargetDA,
      percentReached,
      contributionsCount: charityTransactions.length,
    };
  }

  static recordCharityPayment(amountDA: number, type: 'zakat' | 'sadaqah', notes?: string): Transaction {
    const today = getTodayLocalDate();
    const amountMinor = Math.round(amountDA * 100);

    const newTx: Transaction = {
      id: generateUUID(),
      local_date: today,
      type: 'expense',
      category_id: 'cat-sadaqah',
      amount_minor: amountMinor,
      note: notes?.trim() || (type === 'zakat' ? 'Zakat al-Mal Distribution' : 'Voluntary Sadaqah Donation'),
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(state => {
      if (!state.transactions) state.transactions = [];
      state.transactions.unshift(newTx);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('greendream_state_updated'));
    }

    return newTx;
  }

  static generateZakatReportMarkdown(input: ZakatCalculationInput, res: ZakatCalculationResult): string {
    const today = getTodayLocalDate();

    let md = `# 🌙 ISLAMIC ZAKAT AL-MAL & CHARITY STATEMENT\n`;
    md += `**Date of Valuation:** ${today} | **Jurisdiction Currency:** Algerian Dinar (DA)\n`;
    md += `**Status:** ${res.statusLabel}\n\n`;

    md += `## 1. Zakatable Assets Breakdown\n`;
    md += `| Asset Class | Value (DA) |\n`;
    md += `|:---|---:|\n`;
    md += `| 💵 Liquid Cash & Bank Balances | ${input.cashInHandBank.toLocaleString()} DA |\n`;
    md += `| 🏆 Gold & Precious Metals (Investment) | ${input.goldSilverValue.toLocaleString()} DA |\n`;
    md += `| 📦 Trade Goods & Business Inventory | ${input.tradeGoodsValue.toLocaleString()} DA |\n`;
    md += `| 🤝 Good Loans / Receivables Owed to You | ${input.receivablesOwedToYou.toLocaleString()} DA |\n`;
    md += `| **TOTAL GROSS ASSETS** | **${res.totalAssets.toLocaleString()} DA** |\n\n`;

    md += `## 2. Deductible Immediate Liabilities\n`;
    md += `| Liability Item | Amount (DA) |\n`;
    md += `|:---|---:|\n`;
    md += `| 💳 Immediate Debts & Due Obligations | ${input.immediateDebtsOwed.toLocaleString()} DA |\n`;
    md += `| **TOTAL DEDUCTIONS** | **${res.totalLiabilities.toLocaleString()} DA** |\n\n`;

    md += `## 3. Net Calculation & Nisab Benchmark\n`;
    md += `| Metric | Assessment |\n`;
    md += `|:---|:---|\n`;
    md += `| **Net Zakatable Wealth** | **${res.netZakatableWealth.toLocaleString()} DA** |\n`;
    md += `| **Gold Nisab Standard (85g)** | ${res.nisabThreshold.toLocaleString()} DA |\n`;
    md += `| **Obligation Met?** | ${res.isZakatObligatory ? 'YES (Exceeds Nisab)' : 'NO (Below Nisab)'} |\n`;
    md += `| **ANNUAL ZAKAT DUE (2.5%)** | **${res.zakatDueDA.toLocaleString()} DA** |\n\n`;

    md += `*Rule reference: Zakat is assessed at 2.5% (one fortieth) of surplus wealth held over one full lunar year (Hawl) exceeding the Nisab threshold after deducting short-term obligations.*\n`;

    return md;
  }
}
