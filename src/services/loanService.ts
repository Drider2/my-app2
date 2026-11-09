// Money Lent Tracking Service (Section 3 Specification)
import { db, generateUUID, getTodayLocalDate } from './storage';
import { Loan, LoanRepayment, LoanStatus, Transaction } from '../types';

export interface BorrowerProfile {
  name: string;
  totalLentMinor: number;
  totalRepaidMinor: number;
  remainingMinor: number;
  activeLoansCount: number;
  loans: Loan[];
}

export const LoanService = {
  /**
   * Retrieves all loans
   */
  getLoans(): Loan[] {
    const state = db.getState();
    return (state.loans || [])
      .filter(l => !l.deleted_at)
      .sort((a, b) => b.local_date.localeCompare(a.local_date));
  },

  /**
   * Calculates overall lending summary:
   * Total lent, total repaid, still owed to me, active loans count.
   */
  getSummary(): {
    totalLentMinor: number;
    totalRepaidMinor: number;
    stillOwedMinor: number;
    activeLoansCount: number;
    totalLoansCount: number;
  } {
    const loans = this.getLoans();
    let totalLentMinor = 0;
    let totalRepaidMinor = 0;
    let activeLoansCount = 0;

    for (const loan of loans) {
      totalLentMinor += loan.amount_minor;
      const repaidForThisLoan = (loan.repayments || [])
        .filter(r => !r.deleted_at)
        .reduce((sum, r) => sum + r.amount_minor, 0);
      totalRepaidMinor += repaidForThisLoan;

      if (loan.status !== 'fully_repaid' && (loan.amount_minor - repaidForThisLoan) > 0) {
        activeLoansCount++;
      }
    }

    const stillOwedMinor = Math.max(0, totalLentMinor - totalRepaidMinor);

    return {
      totalLentMinor,
      totalRepaidMinor,
      stillOwedMinor,
      activeLoansCount,
      totalLoansCount: loans.length,
    };
  },

  /**
   * Groups loans by borrower to view comprehensive profile, history, and debt status
   */
  getBorrowerProfiles(): BorrowerProfile[] {
    const loans = this.getLoans();
    const map = new Map<string, Loan[]>();

    for (const l of loans) {
      const key = l.borrower_name.trim();
      const existing = map.get(key) || [];
      existing.push(l);
      map.set(key, existing);
    }

    const profiles: BorrowerProfile[] = [];
    map.forEach((borrowerLoans, name) => {
      let totalLent = 0;
      let totalRepaid = 0;
      let activeCount = 0;

      for (const loan of borrowerLoans) {
        totalLent += loan.amount_minor;
        const repaid = (loan.repayments || [])
          .filter(r => !r.deleted_at)
          .reduce((sum, r) => sum + r.amount_minor, 0);
        totalRepaid += repaid;
        if (loan.status !== 'fully_repaid' && (loan.amount_minor - repaid) > 0) {
          activeCount++;
        }
      }

      profiles.push({
        name,
        totalLentMinor: totalLent,
        totalRepaidMinor: totalRepaid,
        remainingMinor: Math.max(0, totalLent - totalRepaid),
        activeLoansCount: activeCount,
        loans: borrowerLoans,
      });
    });

    return profiles.sort((a, b) => b.remainingMinor - a.remainingMinor);
  },

  /**
   * Adds a new loan:
   * CRITICAL FINANCIAL INTEGRITY:
   * - Records loan in `loans` collection.
   * - Creates a corresponding `type: 'loan_given'` ledger transaction.
   * - Decreases available cash balance, increases outstanding receivables.
   * - Never counted as consumption spending in monthly budgets!
   */
  addLoan(params: {
    borrowerName: string;
    amountMajor: number;
    localDate?: string;
    expectedRepaymentDate?: string;
    notes?: string;
  }): Loan {
    const now = Date.now();
    const amountMinor = Math.round(params.amountMajor * 100);
    const localDate = params.localDate || getTodayLocalDate();
    const loanId = generateUUID();

    const newLoan: Loan = {
      id: loanId,
      borrower_name: params.borrowerName.trim(),
      amount_minor: amountMinor,
      local_date: localDate,
      expected_repayment_date: params.expectedRepaymentDate || undefined,
      notes: params.notes?.trim() || undefined,
      status: 'not_repaid',
      repayments: [],
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    // Ledger transaction for cash flow tracking
    const ledgerTx: Transaction = {
      id: generateUUID(),
      type: 'loan_given',
      amount_minor: amountMinor,
      local_date: localDate,
      loan_id: loanId,
      borrower_name: params.borrowerName.trim(),
      note: `Money lent to ${params.borrowerName.trim()}${params.notes ? ` (${params.notes.trim()})` : ''}`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(draft => {
      if (!draft.loans) draft.loans = [];
      draft.loans.unshift(newLoan);
      draft.transactions.unshift(ledgerTx);
    });

    return newLoan;
  },

  /**
   * Records a repayment (partial or full):
   * CRITICAL FINANCIAL INTEGRITY:
   * - Adds repayment record to the specific loan.
   * - Recalculates remaining debt: marks 'fully_repaid' when balance reaches 0.
   * - Creates a corresponding `type: 'loan_repayment'` ledger transaction.
   * - Increases cash balance, decreases outstanding receivables.
   * - NEVER counted as new taxable/consumption income!
   */
  recordRepayment(params: {
    loanId: string;
    amountMajor: number;
    localDate?: string;
    note?: string;
  }): { repayment: LoanRepayment; newStatus: LoanStatus; remainingMinor: number } | null {
    const state = db.getState();
    const loan = (state.loans || []).find(l => l.id === params.loanId && !l.deleted_at);
    if (!loan) return null;

    const now = Date.now();
    const repaymentMinor = Math.round(params.amountMajor * 100);
    const localDate = params.localDate || getTodayLocalDate();
    const repId = generateUUID();

    const repayment: LoanRepayment = {
      id: repId,
      loan_id: loan.id,
      amount_minor: repaymentMinor,
      local_date: localDate,
      note: params.note?.trim() || 'Repayment received',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    // Calculate updated remaining balance
    const currentRepaid = (loan.repayments || [])
      .filter(r => !r.deleted_at)
      .reduce((sum, r) => sum + r.amount_minor, 0);
    const newTotalRepaid = currentRepaid + repaymentMinor;
    const remainingMinor = Math.max(0, loan.amount_minor - newTotalRepaid);
    const newStatus: LoanStatus = remainingMinor === 0 ? 'fully_repaid' : 'partially_repaid';

    // Ledger transaction
    const ledgerTx: Transaction = {
      id: generateUUID(),
      type: 'loan_repayment',
      amount_minor: repaymentMinor,
      local_date: localDate,
      loan_id: loan.id,
      borrower_name: loan.borrower_name,
      note: `Loan repayment from ${loan.borrower_name}${params.note ? ` (${params.note.trim()})` : ''}`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(draft => {
      const targetLoan = (draft.loans || []).find(l => l.id === params.loanId);
      if (targetLoan) {
        if (!targetLoan.repayments) targetLoan.repayments = [];
        targetLoan.repayments.push(repayment);
        targetLoan.status = newStatus;
        targetLoan.updated_at = now;
      }
      draft.transactions.unshift(ledgerTx);
    });

    return {
      repayment,
      newStatus,
      remainingMinor,
    };
  },

  /**
   * Deletes a loan and associated ledger transactions
   */
  deleteLoan(loanId: string): void {
    const now = Date.now();
    db.updateState(draft => {
      const loan = (draft.loans || []).find(l => l.id === loanId);
      if (loan) {
        loan.deleted_at = now;
      }
      // Soft-delete linked transactions
      draft.transactions.forEach(t => {
        if (t.loan_id === loanId) {
          t.deleted_at = now;
        }
      });
    });
  },

  /**
   * Deletes a single repayment entry and updates loan status
   */
  deleteRepayment(loanId: string, repaymentId: string): void {
    const now = Date.now();
    db.updateState(draft => {
      const loan = (draft.loans || []).find(l => l.id === loanId);
      if (loan && loan.repayments) {
        const rep = loan.repayments.find(r => r.id === repaymentId);
        if (rep) {
          rep.deleted_at = now;
          // Recalculate status
          const activeRepaid = loan.repayments
            .filter(r => !r.deleted_at && r.id !== repaymentId)
            .reduce((sum, r) => sum + r.amount_minor, 0);
          loan.status = activeRepaid >= loan.amount_minor 
            ? 'fully_repaid' 
            : activeRepaid > 0 
            ? 'partially_repaid' 
            : 'not_repaid';
          loan.updated_at = now;
        }
      }
      // Soft-delete corresponding transaction if any
      const tx = draft.transactions.find(t => t.loan_id === loanId && t.type === 'loan_repayment');
      if (tx) tx.deleted_at = now;
    });
  },
};
