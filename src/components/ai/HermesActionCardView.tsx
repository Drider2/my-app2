import React from 'react';
import { 
  Check, 
  X, 
  Wallet, 
  TrendingUp, 
  MoonStar, 
  Dumbbell, 
  CheckSquare, 
  Car, 
  Target, 
  Brain,
  Sparkles,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { HermesActionCard } from '../../types';
import { Haptics } from '../../services/haptics';

interface HermesActionCardViewProps {
  card: HermesActionCard;
  onConfirm: (card: HermesActionCard) => void;
  onCancel: (card: HermesActionCard) => void;
}

export const HermesActionCardView: React.FC<HermesActionCardViewProps> = ({
  card,
  onConfirm,
  onCancel,
}) => {
  const { toolName, params, status } = card;

  // Icon & Title resolver
  const getActionDetails = () => {
    switch (toolName) {
      case 'add_expense':
        return {
          icon: Wallet,
          title: 'Add Expense',
          subtitle: `${params.amount || 0} DA${params.note ? ` • ${params.note}` : ''}`,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        };
      case 'add_income':
        return {
          icon: TrendingUp,
          title: 'Record Income',
          subtitle: `${params.amount || 0} DA${params.note ? ` • ${params.note}` : ''}`,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        };
      case 'mark_prayer':
        return {
          icon: MoonStar,
          title: 'Mark Prayer',
          subtitle: `${params.prayer} • ${params.completed ? 'Completed' : 'Pending'}`,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
        };
      case 'log_weight':
        return {
          icon: Dumbbell,
          title: 'Log Bodyweight',
          subtitle: `${params.weight || 0} kg`,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        };
      case 'add_task':
        return {
          icon: CheckSquare,
          title: 'Add Task',
          subtitle: params.title || 'New Task',
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        };
      case 'add_reminder':
        return {
          icon: Car,
          title: 'Add Reminder',
          subtitle: `${params.name || 'Maintenance'}${params.estimated_cost ? ` • ${params.estimated_cost} DA` : ''}`,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        };
      case 'create_goal':
        return {
          icon: Target,
          title: 'Create Savings Goal',
          subtitle: `${params.title || 'Goal'} • Target: ${params.target_amount || 0} DA`,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        };
      case 'save_memory_note':
        return {
          icon: Brain,
          title: 'Save to Hermes Memory',
          subtitle: params.content || 'Memory note',
          color: 'text-[var(--color-accent)] bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30',
        };
      case 'update_setting':
        return {
          icon: Sliders,
          title: 'Update App Setting',
          subtitle: `${params.setting_key}: ${params.new_value}${params.reason ? ` • ${params.reason}` : ''}`,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        };
      default:
        return {
          icon: Sparkles,
          title: 'Proposed Action',
          subtitle: toolName,
          color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
        };
    }
  };

  const details = getActionDetails();
  const Icon = details.icon;

  return (
    <div className="my-2.5 p-3.5 rounded-2xl bg-white/[0.04] border border-[var(--color-border)]  shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${details.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)] truncate">
              {details.title}
            </h4>
            <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
              {details.subtitle}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        {status === 'confirmed' && (
          <span className="px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Applied</span>
          </span>
        )}
        {status === 'cancelled' && (
          <span className="px-2 py-0.5 rounded-full border border-zinc-500/40 bg-zinc-500/15 text-zinc-400 text-[10px] font-bold shrink-0">
            Cancelled
          </span>
        )}
      </div>

      {/* Parameter Details Table (if pending) */}
      {status === 'pending' && (
        <div className="space-y-1 py-1.5 px-2.5 rounded-xl bg-black/20 border border-white/[0.04] text-[11px]">
          {Object.entries(params).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 text-zinc-300">
              <span className="capitalize text-[var(--color-text-secondary)]">{k.replace('_', ' ')}:</span>
              <span className="font-semibold truncate text-[var(--color-text-primary)]">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Actions */}
      {status === 'pending' && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              Haptics.success();
              onConfirm(card);
            }}
            className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-[var(--color-accent)] text-white text-xs font-bold flex items-center justify-center gap-1.5 tap-feedback shadow-sm hover:opacity-95 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm Action</span>
          </button>

          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              onCancel(card);
            }}
            className="min-h-[44px] py-2 px-3.5 rounded-xl border border-[var(--color-border)] bg-white/[0.04] text-[var(--color-text-secondary)] text-xs font-semibold hover:text-white tap-feedback transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
