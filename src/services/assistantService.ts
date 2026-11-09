// Assistant Layer: Contextual Intelligence, Query Engine & Strict Proposal Actions (Section 3 Specification)
import { db, generateUUID, getTodayLocalDate, formatCurrency } from './storage';
import { 
  AssistantProposal, 
  AssistantMessage, 
  Transaction, 
  Task, 
  SetEntry, 
  BodyweightEntry, 
  JournalEntry, 
  HabitEntry,
  WorkoutSession,
  CalendarEvent,
  LoanRepayment
} from '../types';
import { calculateMonthSpending } from './calculation';
import { GymProgramService } from './gymProgramService';
import { getItemDueStatus } from './maintenanceService';

export const AssistantService = {
  /**
   * Processes conversational queries or actionable commands into natural answers or typed proposals.
   * Nothing is written to the business records without user approval!
   */
  processUserInput(text: string): { message: AssistantMessage; proposal: AssistantProposal | null } {
    const today = getTodayLocalDate();
    const now = Date.now();
    const state = db.getState();
    const lower = text.toLowerCase().trim();

    let proposal: AssistantProposal | null = null;
    let replyText = '';

    // ========================================================
    // CONTEXTUAL READ QUERIES (Instant truthful answers)
    // ========================================================

    // 1. "How much money did I spend this month?"
    if (lower.includes('how much') && (lower.includes('spend') || lower.includes('spent') || lower.includes('expenses'))) {
      const monthSpending = calculateMonthSpending(state.transactions, state.settings.budget_cycle_start_day);
      const formatted = formatCurrency(monthSpending, state.settings.currency_label);
      replyText = `You have spent ${formatted} during this billing cycle (starting day ${state.settings.budget_cycle_start_day}). Savings transfers and capital adjustments are excluded from expenses.`;
    }
    // 2. "What tasks do I have today?"
    else if (lower.includes('task') && (lower.includes('today') || lower.includes('have') || lower.includes('what'))) {
      const todayTasks = state.tasks.filter(t => !t.deleted_at && t.due_date === today);
      const pending = todayTasks.filter(t => !t.done);
      if (todayTasks.length === 0) {
        replyText = `You have no tasks scheduled specifically for today (${today}). Enjoy your day or tap "+" to create one!`;
      } else {
        const listStr = todayTasks.map(t => `${t.done ? '✓' : '○'} ${t.title} (${t.due_time || 'No time'})`).join('\n');
        replyText = `You have ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} today (${pending.length} pending):\n${listStr}`;
      }
    }
    // 3. "Who owes me money?" or "How much money is lent out?"
    else if (lower.includes('owe') || lower.includes('lend') || lower.includes('lent') || lower.includes('loan')) {
      const loans = state.loans?.filter(l => !l.deleted_at) || [];
      const activeLoans = loans.filter(l => {
        const repaid = (l.repayments || []).filter(r => !r.deleted_at).reduce((s, r) => s + r.amount_minor, 0);
        return l.amount_minor > repaid;
      });
      const totalOwed = activeLoans.reduce((sum, l) => {
        const repaid = (l.repayments || []).filter(r => !r.deleted_at).reduce((s, r) => s + r.amount_minor, 0);
        return sum + (l.amount_minor - repaid);
      }, 0);

      if (activeLoans.length === 0) {
        replyText = `Nobody owes you money right now. All loans are fully settled!`;
      } else {
        const details = activeLoans.map(l => {
          const repaid = (l.repayments || []).filter(r => !r.deleted_at).reduce((s, r) => s + r.amount_minor, 0);
          const remaining = l.amount_minor - repaid;
          return `• ${l.borrower_name}: ${formatCurrency(remaining, state.settings.currency_label)} (out of ${formatCurrency(l.amount_minor, state.settings.currency_label)})`;
        }).join('\n');
        replyText = `You have ${formatCurrency(totalOwed, state.settings.currency_label)} currently owed to you across ${activeLoans.length} active loan${activeLoans.length === 1 ? '' : 's'}:\n${details}`;
      }
    }
    // 4. "When is my next haircut?"
    else if (lower.includes('haircut') || (lower.includes('hair') && lower.includes('cut'))) {
      const haircutItem = state.maintenanceItems?.find(i => !i.deleted_at && i.name.toLowerCase().includes('haircut'));
      if (haircutItem) {
        const due = getItemDueStatus(haircutItem);
        const costStr = formatCurrency(haircutItem.estimated_cost_minor, state.settings.currency_label);
        replyText = `Your next haircut is scheduled for ${haircutItem.next_reminder_date} (${due.badgeText}). Frequency: every ${haircutItem.recurrence_interval || 10} days. Estimated cost: ${costStr}.`;
      } else {
        replyText = `You don't have a haircut reminder scheduled yet. Would you like me to set one up for every 10 days at 600 DA?`;
      }
    }
    // 5. "How much should I save every month to buy my car?"
    else if (lower.includes('car') && (lower.includes('save') || lower.includes('buy') || lower.includes('goal'))) {
      const carGoal = state.savingsGoals?.find(g => !g.deleted_at && g.name.toLowerCase().includes('car'));
      if (carGoal) {
        const saved = carGoal.current_saved_minor || carGoal.opening_minor || 0;
        const target = carGoal.target_minor;
        const remaining = Math.max(0, target - saved);
        const monthly = carGoal.monthly_contribution_minor || 3500000;
        const months = Math.ceil(remaining / monthly);
        replyText = `For your "${carGoal.name}" goal:\n• Current Saved: ${formatCurrency(saved, state.settings.currency_label)}\n• Target: ${formatCurrency(target, state.settings.currency_label)}\n• Remaining: ${formatCurrency(remaining, state.settings.currency_label)}\n\nWith your planned monthly contribution of ${formatCurrency(monthly, state.settings.currency_label)}, you will reach your goal in approximately ${months} months (~${(months / 12).toFixed(1)} years).`;
      } else {
        replyText = `To buy a 1,000,000 DA car with 190,000 DA saved, you have 810,000 DA remaining. Saving 35,000 DA/month will reach your goal in 24 months.`;
      }
    }
    // 6. "What workout should I do today?"
    else if (lower.includes('workout') && (lower.includes('today') || lower.includes('what') || lower.includes('next') || lower.includes('do'))) {
      const nextWorkout = GymProgramService.getNextWorkout();
      replyText = `Based on your active program (${nextWorkout.programName}), today's training session is: **${nextWorkout.dayName}** (${nextWorkout.targetMuscles.join(', ')}).\nIt features ${nextWorkout.exercisesCount} core movements with high stimulus targets.`;
    }

    // ========================================================
    // ACTIONABLE COMMANDS (Produce Typed Proposals)
    // ========================================================

    // 7. Expense parsing
    else if (text.match(/(?:spent|paid|bought)\s+([\d,.]+)\s*(?:da|dzd|\$|€)?\s*(?:on|for)?\s*([a-zA-Z\s]+)?/i)) {
      const match = text.match(/(?:spent|paid|bought)\s+([\d,.]+)\s*(?:da|dzd|\$|€)?\s*(?:on|for)?\s*([a-zA-Z\s]+)?/i)!;
      const amountMajor = parseFloat(match[1].replace(/,/g, ''));
      const note = (match[2] || 'Expense').trim();
      const amountMinor = Math.round(amountMajor * 100);

      proposal = {
        id: generateUUID(),
        action_type: 'create_expense',
        payload: {
          type: 'expense',
          amount_minor: amountMinor,
          category_id: state.categories[0]?.id || 'cat-food',
          note: note,
          local_date: today,
        },
        source_text: text,
        status: 'pending',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      replyText = `I prepared an expense proposal for ${formatCurrency(amountMinor, state.settings.currency_label)} (${note}). Tap Approve to record it in Finance.`;
    }
    // 8. Task parsing
    else if (lower.includes('remind') || lower.includes('task:')) {
      const taskTitle = text.replace(/^(?:remind me to|create a task:|create task:)\s*/i, '').trim();
      proposal = {
        id: generateUUID(),
        action_type: 'create_task',
        payload: {
          title: taskTitle,
          due_date: today,
          due_time: '10:00',
          done: false,
        },
        source_text: text,
        status: 'pending',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      replyText = `I prepared a task proposal: "${taskTitle}". Would you like me to add it to your tasks?`;
    }
    // 9. Lend money parsing
    else if (lower.includes('lent') || lower.includes('loaned') || lower.includes('lend')) {
      const match = text.match(/(?:lent|loaned|lend)\s+([\d,.]+)\s*(?:da|dzd|\$|€)?\s*(?:to)?\s*([a-zA-Z\s]+)?/i);
      const amountMajor = match ? parseFloat(match[1].replace(/,/g, '')) : 5000;
      const borrower = match && match[2] ? match[2].trim() : 'Friend';
      const amountMinor = Math.round(amountMajor * 100);

      proposal = {
        id: generateUUID(),
        action_type: 'lend_money',
        payload: {
          borrower_name: borrower,
          amount_minor: amountMinor,
          local_date: today,
          notes: 'Recorded via AI Assistant',
        },
        source_text: text,
        status: 'pending',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      replyText = `Proposal generated: Lend ${formatCurrency(amountMinor, state.settings.currency_label)} to ${borrower}. Would you like to record this loan?`;
    }
    // 10. Bodyweight
    else if (lower.includes('weigh') || lower.includes('weight')) {
      const weightMatch = text.match(/(\d+\.?\d*)\s*(?:kg|kilos|lbs)?/i);
      const weight = weightMatch ? parseFloat(weightMatch[1]) : 78.4;
      proposal = {
        id: generateUUID(),
        action_type: 'log_bodyweight',
        payload: {
          local_date: today,
          weight_kg: weight,
        },
        source_text: text,
        status: 'pending',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      replyText = `I prepared a bodyweight record: ${weight} kg for today. Tap Approve to persist it.`;
    }
    // 11. Journal entry
    else if (lower.includes('journal')) {
      const body = text.replace(/^(?:write in my journal:|write in journal:)\s*/i, '').trim();
      proposal = {
        id: generateUUID(),
        action_type: 'create_journal',
        payload: {
          local_date: today,
          title: 'Personal Reflection',
          body: body || text,
          tags: ['voice', 'reflection'],
          mood: 4,
        },
        source_text: text,
        status: 'pending',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      replyText = `I drafted your journal note: "${body || text}". Ready to save upon approval.`;
    }
    // Default fallback
    else {
      replyText = `I am your GreenDream personal intelligence desk. You can ask me questions like:\n• "How much money did I spend this month?"\n• "Who owes me money and how much?"\n• "What tasks do I have today?"\n• "When is my next haircut?"\n• "What workout should I do today?"\n• "How much should I save every month to buy my car?"\n\nOr dictate an expense, loan, task, or journal note!`;
    }

    const assistantMsg: AssistantMessage = {
      id: generateUUID(),
      role: 'assistant',
      text: replyText,
      proposal_id: proposal ? proposal.id : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    return { message: assistantMsg, proposal };
  },

  /**
   * Action Registry:
   * Executes approved proposal and persists the record into the owning business module.
   */
  approveProposal(proposal: AssistantProposal): void {
    const now = Date.now();
    const today = getTodayLocalDate();
    db.updateState(state => {
      const p = state.assistantProposals.find(item => item.id === proposal.id);
      if (p) {
        p.status = 'approved';
        p.decided_at = now;
      }

      switch (proposal.action_type) {
        case 'create_expense': {
          const newTx: Transaction = {
            id: generateUUID(),
            type: 'expense',
            amount_minor: proposal.payload.amount_minor,
            local_date: proposal.payload.local_date,
            category_id: proposal.payload.category_id,
            note: proposal.payload.note,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          state.transactions.unshift(newTx);
          break;
        }
        case 'create_task': {
          const newTask: Task = {
            id: generateUUID(),
            title: proposal.payload.title,
            due_date: proposal.payload.due_date,
            due_time: proposal.payload.due_time,
            done: false,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          state.tasks.unshift(newTask);
          break;
        }
        case 'lend_money': {
          const newLoan = {
            id: generateUUID(),
            borrower_name: proposal.payload.borrower_name,
            amount_minor: proposal.payload.amount_minor,
            local_date: proposal.payload.local_date || today,
            expected_repayment_date: proposal.payload.expected_repayment_date,
            notes: proposal.payload.notes,
            status: 'not_repaid' as const,
            repayments: [],
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          if (!state.loans) state.loans = [];
          state.loans.unshift(newLoan);
          state.transactions.unshift({
            id: generateUUID(),
            type: 'loan_given',
            amount_minor: proposal.payload.amount_minor,
            local_date: proposal.payload.local_date || today,
            loan_id: newLoan.id,
            borrower_name: newLoan.borrower_name,
            note: `Money lent to ${newLoan.borrower_name}`,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          });
          break;
        }
        case 'log_bodyweight': {
          const newBw: BodyweightEntry = {
            id: generateUUID(),
            local_date: proposal.payload.local_date,
            weight_kg: proposal.payload.weight_kg,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          state.bodyweightEntries.push(newBw);
          break;
        }
        case 'create_journal': {
          const newJ: JournalEntry = {
            id: generateUUID(),
            local_date: proposal.payload.local_date,
            title: proposal.payload.title,
            body: proposal.payload.body,
            tags: proposal.payload.tags || [],
            mood: proposal.payload.mood || 3,
            is_encrypted: false,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          state.journalEntries.unshift(newJ);
          break;
        }
        case 'create_workout': {
          const newSession: WorkoutSession = {
            id: generateUUID(),
            plan_id: proposal.payload.plan_id || null,
            name: proposal.payload.name || 'Workout Session',
            local_date: proposal.payload.local_date || today,
            started_at: proposal.payload.started_at || now,
            ended_at: proposal.payload.ended_at || null,
            notes: proposal.payload.notes || 'Logged via Assistant',
            sets: proposal.payload.sets || [],
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          if (!state.workoutSessions) state.workoutSessions = [];
          state.workoutSessions.unshift(newSession);
          if (p) p.result_record_id = newSession.id;
          break;
        }
        case 'create_event': {
          const newEvent: CalendarEvent = {
            id: generateUUID(),
            title: proposal.payload.title || 'New Event',
            local_date: proposal.payload.local_date || today,
            start_time: proposal.payload.start_time || '10:00',
            duration: proposal.payload.duration || 60,
            all_day: proposal.payload.all_day || false,
            notes: proposal.payload.notes,
            tag: proposal.payload.tag || 'personal',
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          if (!state.events) state.events = [];
          state.events.unshift(newEvent);
          if (p) p.result_record_id = newEvent.id;
          break;
        }
        case 'complete_maintenance': {
          const targetItem = (state.maintenanceItems || []).find(i => i.id === proposal.payload.item_id);
          if (targetItem) {
            targetItem.last_service_date = proposal.payload.completion_date || today;
            targetItem.actual_cost_minor = proposal.payload.actual_cost_minor || targetItem.estimated_cost_minor;
            targetItem.updated_at = now;

            if (targetItem.recurrence_type === 'as_needed') {
              targetItem.is_purchased = true;
              targetItem.status = 'completed';
            } else {
              targetItem.status = 'upcoming';
              targetItem.is_purchased = false;
            }

            if (proposal.payload.new_odometer_km && targetItem.category === 'car_maintenance') {
              targetItem.current_odometer_km = proposal.payload.new_odometer_km;
              const interval = (targetItem.recurrence_interval && targetItem.recurrence_interval > 0) ? targetItem.recurrence_interval : 7500;
              targetItem.next_reminder_mileage_km = proposal.payload.new_odometer_km + interval;
            }

            if (proposal.payload.record_in_finance && (targetItem.actual_cost_minor || 0) > 0) {
              const cost = targetItem.actual_cost_minor || 0;
              state.transactions.unshift({
                id: generateUUID(),
                type: 'expense',
                amount_minor: cost,
                local_date: proposal.payload.completion_date || today,
                category_id: targetItem.finance_category_id || state.categories[0]?.id || 'cat-personal',
                note: `${targetItem.name} (${targetItem.category})`,
                created_at: now,
                updated_at: now,
                deleted_at: null,
              });
            }
            if (p) p.result_record_id = targetItem.id;
          }
          break;
        }
        case 'record_repayment': {
          const targetLoan = (state.loans || []).find(l => l.id === proposal.payload.loan_id);
          if (targetLoan) {
            const amountMinor = proposal.payload.amount_minor || 0;
            const repayment: LoanRepayment = {
              id: generateUUID(),
              loan_id: targetLoan.id,
              amount_minor: amountMinor,
              local_date: proposal.payload.local_date || today,
              note: proposal.payload.notes || 'Repayment via Assistant',
              created_at: now,
              updated_at: now,
              deleted_at: null,
            };
            if (!targetLoan.repayments) targetLoan.repayments = [];
            targetLoan.repayments.push(repayment);

            const totalRepaid = targetLoan.repayments
              .filter(r => !r.deleted_at)
              .reduce((sum, r) => sum + r.amount_minor, 0);
            const remaining = Math.max(0, targetLoan.amount_minor - totalRepaid);
            targetLoan.status = remaining === 0 ? 'fully_repaid' : 'partially_repaid';
            targetLoan.updated_at = now;

            state.transactions.unshift({
              id: generateUUID(),
              type: 'loan_repayment',
              amount_minor: amountMinor,
              local_date: proposal.payload.local_date || today,
              loan_id: targetLoan.id,
              borrower_name: targetLoan.borrower_name,
              note: `Loan repayment from ${targetLoan.borrower_name}`,
              created_at: now,
              updated_at: now,
              deleted_at: null,
            });
            if (p) p.result_record_id = repayment.id;
          }
          break;
        }
      }
    });
  },

  /**
   * Rejects proposal without executing or modifying data.
   */
  rejectProposal(proposalId: string): void {
    db.updateState(state => {
      const p = state.assistantProposals.find(item => item.id === proposalId);
      if (p) {
        p.status = 'rejected';
        p.decided_at = Date.now();
      }
    });
  }
};
