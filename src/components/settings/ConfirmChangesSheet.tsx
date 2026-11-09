// ========================================================
// ConfirmChangesSheet: Safe Settings Confirmation Bottom Sheet
// Displays detailed human-readable Before -> After diffs,
// danger badges, and typed confirmation for destructive actions.
// ========================================================

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  X, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Layers,
  Lock,
  RotateCcw
} from 'lucide-react';
import { SettingDiffItem } from '../../services/settingsDiffService';
import { useTranslation } from '../../services/i18n';
import { Haptics } from '../../services/haptics';

interface ConfirmChangesSheetProps {
  isOpen: boolean;
  diffs: SettingDiffItem[];
  isDestructiveAction?: boolean;
  destructiveActionLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmChangesSheet: React.FC<ConfirmChangesSheetProps> = ({
  isOpen,
  diffs,
  isDestructiveAction = false,
  destructiveActionLabel,
  onConfirm,
  onClose,
}) => {
  const { t, isRtl } = useTranslation();
  const [typedInput, setTypedInput] = useState('');

  if (!isOpen) return null;

  const requiresTypedConfirmation = isDestructiveAction;
  const isConfirmDisabled = requiresTypedConfirmation && typedInput.trim().toUpperCase() !== 'RESET';

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    Haptics.success();
    onConfirm();
  };

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70  animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-changes-title"
    >
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Modal Container */}
      <div 
        className="relative z-10 w-full max-w-xl max-h-[88vh] rounded-t-3xl bg-[var(--color-bg)]/95 border-t border-x border-[var(--color-border)] shadow-2xl  flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber bar */}
        <div className="w-12 h-1.5 rounded-full bg-[var(--color-border)] mx-auto mt-3 mb-1" />

        {/* Sheet Header */}
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="confirm-changes-title" className="text-base font-bold text-[var(--color-text-primary)]">
                {t('settings.confirmChangesTitle', 'Confirm changes')}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {diffs.length === 1 
                  ? t('settings.confirmSingleSubtitle', '1 setting will be updated')
                  : t('settings.confirmPluralSubtitle', `${diffs.length} settings will be updated`)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] tap-feedback"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diffs Scrollable List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
          {diffs.map((diff) => (
            <div 
              key={diff.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                diff.isDangerous 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-[var(--color-surface)] border-[var(--color-border)]'
              }`}
            >
              {/* Module Pill & Field Name */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                  {diff.fieldLabel}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  {diff.moduleLabel}
                </span>
              </div>

              {/* Before -> After Transition */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-xl bg-[var(--color-card)]/80 text-[var(--color-text-secondary)] line-through max-w-[45%] truncate border border-[var(--color-border)]">
                  {diff.oldValueDisplay}
                </span>
                <ArrowIcon className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                <span className="px-2.5 py-1 rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 font-bold max-w-[45%] truncate">
                  {diff.newValueDisplay}
                </span>
              </div>

              {/* Danger Warning Pill */}
              {diff.isDangerous && (
                <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="leading-tight">
                    {diff.dangerReason || t('settings.dangerWarning', 'Review this change carefully.')}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Destructive Action Typed Confirmation */}
          {requiresTypedConfirmation && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{destructiveActionLabel || t('settings.destructiveAction', 'Destructive Operation')}</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {t('settings.typeResetToConfirm', 'This action will permanently alter stored data. Type "RESET" below to confirm.')}
              </p>
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="RESET"
                className="w-full px-3 py-2.5 rounded-xl border border-rose-500/40 bg-[var(--color-surface)] text-[var(--color-text-primary)] font-mono text-center text-sm tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-rose-500"
                autoCapitalize="characters"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/60 flex items-center justify-end gap-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-semibold transition-all tap-feedback min-h-[44px]"
          >
            {t('settings.keepEditing', 'Keep editing')}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md tap-feedback min-h-[44px] flex items-center justify-center gap-2 ${
              isConfirmDisabled
                ? 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed border border-[var(--color-border)]'
                : requiresTypedConfirmation
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-[var(--color-accent)] hover:opacity-90 text-white'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{t('settings.confirmAndSave', 'Confirm & Save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
