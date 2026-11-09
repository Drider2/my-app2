// ========================================================
// UnsavedChangesBar: Sticky Bottom Glass Bar
// Appears when draft settings differ from stored state.
// Prompts explicit Save Changes or Discard.
// ========================================================

import React from 'react';
import { Sparkles, Check, RotateCcw } from 'lucide-react';
import { useTranslation } from '../../services/i18n';
import { Haptics } from '../../services/haptics';

interface UnsavedChangesBarProps {
  changeCount: number;
  onSave: () => void;
  onDiscard: () => void;
}

export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({
  changeCount,
  onSave,
  onDiscard,
}) => {
  const { t, isRtl } = useTranslation();

  if (changeCount <= 0) return null;

  return (
    <div 
      className="fixed bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+14px)] left-3 right-3 sm:left-6 sm:right-6 max-w-2xl mx-auto z-40 animate-slide-up"
      role="region"
      aria-label="Unsaved settings changes"
    >
      <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-[var(--color-surface)]/95 border border-[var(--color-accent)]/40 shadow-2xl  flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Count & Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shrink-0 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] truncate">
                {changeCount === 1 
                  ? t('settings.unsavedChangesSingle', '1 unsaved change')
                  : t('settings.unsavedChangesPlural', `${changeCount} unsaved changes`)}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30">
                {changeCount}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] truncate hidden xs:block">
              {t('settings.unsavedChangesHint', 'Review and confirm changes before saving')}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              onDiscard();
            }}
            className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-semibold transition-all tap-feedback min-h-[44px] flex items-center gap-1.5"
            aria-label={t('settings.discardChanges', 'Discard')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('settings.discardChanges', 'Discard')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              Haptics.success();
              onSave();
            }}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-[var(--color-accent)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-md tap-feedback min-h-[44px] flex items-center gap-1.5"
            aria-label={t('settings.saveChanges', 'Save changes')}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{t('settings.saveChanges', 'Save changes')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
