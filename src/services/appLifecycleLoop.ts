// Autonomous System Lifecycle, Integrity & Rollover Loop
import { db, getTodayLocalDate, generateUUID } from './storage';
import { RulesEngine } from './rulesEngine';
import { FinanceService } from './financeService';
import { PRAYER_NAMES } from './prayerService';
import { PrayerEntry } from '../types';

export interface SystemAuditReport {
  status: 'healthy' | 'issues_repaired';
  timestamp: number;
  currentDate: string;
  rulesNoticesCount: number;
  repairedIssues: string[];
  cashBalance: {
    availableCashMinor: number;
    savingsMinor: number;
    moneyLentMinor: number;
    netWorthMinor: number;
  };
}

class AppLifecycleLoopManager {
  private timer: any = null;
  private intervalMs: number = 30000; // 30 seconds
  private lastEvaluatedDate: string = '';
  private isRunning: boolean = false;
  private isCycleRunning: boolean = false;

  private onVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.runCycle(false);
    }
  };

  private onWindowFocus = () => {
    this.runCycle(false);
  };

  /**
   * Starts the continuous background lifecycle loop
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastEvaluatedDate = getTodayLocalDate();

    // Run first cycle immediately
    this.runCycle(true);

    // Setup periodic 30-second heartbeat
    this.timer = setInterval(() => {
      this.runCycle(false);
    }, this.intervalMs);

    // Setup lifecycle event listeners
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.onWindowFocus);
    }

    console.info('[AppLifecycleLoop] Autonomous system loop initialized and active (30s interval).');
  }

  /**
   * Stops the continuous background lifecycle loop
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.onWindowFocus);
    }

    console.info('[AppLifecycleLoop] Autonomous system loop stopped.');
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Executes a single evaluation cycle:
   * 1. Midnight / Date Rollover Detection
   * 2. Autonomous Database Self-Healing & Type Coercion
   * 3. Deterministic Rules & Notice Audit
   */
  public runCycle(forceCheck: boolean = false): SystemAuditReport {
    if (this.isCycleRunning && !forceCheck) {
      return this.generateReport([]);
    }

    this.isCycleRunning = true;
    const repairedIssues: string[] = [];
    const today = getTodayLocalDate();
    const isDateRollover = this.lastEvaluatedDate && this.lastEvaluatedDate !== today;

    try {
      let stateModified = false;

      // =======================================================
      // 1. DATE / MIDNIGHT ROLLOVER
      // =======================================================
      if (isDateRollover || forceCheck) {
        db.updateState(draft => {
          // Initialize daily prayer slots for today if missing
          const existingTodayPrayers = (draft.prayers || []).filter(
            p => p.local_date === today && !p.deleted_at
          );

          if (existingTodayPrayers.length < 5) {
            const now = Date.now();
            if (!draft.prayers) draft.prayers = [];

            for (const item of PRAYER_NAMES) {
              const hasPrayer = existingTodayPrayers.some(p => p.prayer === item.id);
              if (!hasPrayer) {
                const newPrayer: PrayerEntry = {
                  id: generateUUID(),
                  local_date: today,
                  prayer: item.id,
                  completed: false,
                  completed_at: null,
                  created_at: now,
                  updated_at: now,
                  deleted_at: null,
                };
                draft.prayers.push(newPrayer);
                stateModified = true;
              }
            }
            repairedIssues.push(`Initialized prayer records for date: ${today}`);
          }

          // Advance maintenance item status if due today
          for (const item of (draft.maintenanceItems || [])) {
            if (!item.deleted_at && !item.is_purchased && item.status === 'upcoming') {
              if (item.next_reminder_date <= today) {
                item.status = 'due';
                item.updated_at = Date.now();
                stateModified = true;
                repairedIssues.push(`Updated maintenance status to due for: ${item.name}`);
              }
            }
          }
        });

        this.lastEvaluatedDate = today;
      }

      // =======================================================
      // 2. DATABASE SELF-HEALING & SANITIZATION
      // =======================================================
      db.updateState(draft => {
        // A. Integer minor unit arithmetic repair
        for (const t of (draft.transactions || [])) {
          if (t.amount_minor !== Math.round(t.amount_minor || 0)) {
            t.amount_minor = Math.round(t.amount_minor || 0);
            stateModified = true;
            repairedIssues.push(`Sanitized floating transaction minor amount for ID ${t.id}`);
          }
        }

        for (const cat of (draft.categories || [])) {
          if (cat.amount_minor !== Math.round(cat.amount_minor || 0)) {
            cat.amount_minor = Math.round(cat.amount_minor || 0);
            stateModified = true;
            repairedIssues.push(`Sanitized floating category budget amount for ${cat.name}`);
          }
        }

        if (draft.savingsAccount) {
          if (draft.savingsAccount.current_balance_minor !== Math.round(draft.savingsAccount.current_balance_minor || 0)) {
            draft.savingsAccount.current_balance_minor = Math.round(draft.savingsAccount.current_balance_minor || 0);
            stateModified = true;
          }
        }

        // B. Reconcile loans repayment integrity and status
        for (const loan of (draft.loans || [])) {
          if (loan.deleted_at) continue;

          loan.amount_minor = Math.round(loan.amount_minor || 0);
          const repayments = (loan.repayments || []).filter(r => !r.deleted_at);
          let totalRepaid = 0;

          for (const rep of repayments) {
            rep.amount_minor = Math.round(rep.amount_minor || 0);
            totalRepaid += rep.amount_minor;
          }

          const remaining = Math.max(0, loan.amount_minor - totalRepaid);
          const expectedStatus = remaining === 0 
            ? 'fully_repaid' 
            : totalRepaid > 0 
              ? 'partially_repaid' 
              : 'not_repaid';

          if (loan.status !== expectedStatus) {
            loan.status = expectedStatus;
            loan.updated_at = Date.now();
            stateModified = true;
            repairedIssues.push(`Reconciled loan debt status for ${loan.borrower_name} to ${expectedStatus}`);
          }
        }

        // C. Clean orphan/empty entries
        if (!draft.disciplineEntries) {
          draft.disciplineEntries = [];
          stateModified = true;
        }
        if (!draft.assistantNotices) {
          draft.assistantNotices = [];
          stateModified = true;
        }
      });

      // =======================================================
      // 3. DETERMINISTIC RULES ENGINE AUDIT
      // =======================================================
      const syncResult = RulesEngine.synchronizeNotices();
      if (syncResult.addedCount > 0) {
        repairedIssues.push(`Generated ${syncResult.addedCount} active system notice(s).`);
      }
      if (syncResult.prunedCount > 0) {
        repairedIssues.push(`Pruned ${syncResult.prunedCount} old dismissed notice(s).`);
      }

      // If any state was modified by integrity checks or rollover, notify UI
      if (stateModified) {
        db.notifyListeners();
      }

    } catch (err) {
      console.error('[AppLifecycleLoop] Cycle encountered error:', err);
    } finally {
      this.isCycleRunning = false;
    }

    return this.generateReport(repairedIssues);
  }

  /**
   * Generates a comprehensive system integrity & cash report
   */
  private generateReport(repairedIssues: string[]): SystemAuditReport {
    const cash = FinanceService.getCashBalanceSummary();
    const state = db.getState();
    const activeNotices = (state.assistantNotices || []).filter(n => n.status !== 'dismissed');

    return {
      status: repairedIssues.length > 0 ? 'issues_repaired' : 'healthy',
      timestamp: Date.now(),
      currentDate: getTodayLocalDate(),
      rulesNoticesCount: activeNotices.length,
      repairedIssues,
      cashBalance: {
        availableCashMinor: cash.availableCashMinor,
        savingsMinor: cash.currentSavingsMinor,
        moneyLentMinor: cash.moneyOwedToMeMinor,
        netWorthMinor: cash.netWorthMinor,
      },
    };
  }

  /**
   * Explicit immediate on-demand audit trigger
   */
  public runAuditNow(): SystemAuditReport {
    return this.runCycle(true);
  }
}

export const AppLifecycleLoop = new AppLifecycleLoopManager();
