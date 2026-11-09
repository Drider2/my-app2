// ========================================================
// DiscardChangesDialog: Navigation Guard Intercept Dialog
// Warns the user when attempting to exit Settings with
// unsaved changes, preventing accidental loss of edits.
// ========================================================

import React from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { useTranslation } from '../../services/i18n';
import { Haptics } from '../../services/haptics';

interface DiscardChangesDialogProps {
  isOpen: boolean;
  changeCount: number;
  onKeepEditing: () => void;
  onDiscardAndLeave: () => void;
}

export const DiscardChangesDialog: React.FC<DiscardChangesDialogProps> = ({
  isOpen,
  changeCount,
  onKeepEditing,
  onDiscardAndLeave,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75  animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-dialog-title"
    >
      <div 
        className="w-full max-w-sm rounded-3xl bg-[var(--color-bg)]/95 border border-[var(--color-border)] shadow-2xl  p-5 space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="discard-dialog-title" className="text-sm font-bold text-[var(--color-text-primary)]">
              {t('settings.discardPromptTitle', 'Discard unsaved changes?')}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {changeCount === 1 
                ? t('settings.discardPromptSingle', 'You have 1 unsaved change that will be lost.')
                : t('settings.discardPromptPlural', `You have ${changeCount} unsaved changes that will be lost.`)}
            </p>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {t('settings.discardPromptDesc', 'Are you sure you want to exit without saving? All adjustments in your current draft will be reset.')}
        </p>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              onKeepEditing();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] text-xs font-semibold tap-feedback min-h-[44px]"
          >
            {t('settings.keepEditing', 'Keep editing')}
          </button>

          <button
            type="button"
            onClick={() => {
              Haptics.warning();
              onDiscardAndLeave();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold tap-feedback flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('settings.discardAndLeave', 'Discard & Leave')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
