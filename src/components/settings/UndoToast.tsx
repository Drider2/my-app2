// ========================================================
// UndoToast: 10-Second Undo Notification
// Displays post-save feedback with a visible 10-second countdown
// and allows instant one-tap rollback to the previous snapshot.
// ========================================================

import React, { useEffect, useState } from 'react';
import { RotateCcw, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '../../services/i18n';
import { Haptics } from '../../services/haptics';

interface UndoToastProps {
  isVisible: boolean;
  message?: string;
  durationSeconds?: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  isVisible,
  message,
  durationSeconds = 10,
  onUndo,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [secondsRemaining, setSecondsRemaining] = useState(durationSeconds);

  useEffect(() => {
    if (!isVisible) return;
    setSecondsRemaining(durationSeconds);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, durationSeconds, onDismiss]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-slide-down"
      role="status"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)]/95 border border-[var(--color-accent)]/50 shadow-2xl ">
        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--color-text-primary)] block truncate">
                {message || t('settings.settingsSaved', 'Settings saved successfully.')}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] block">
                {secondsRemaining}s {t('settings.undoWindow', 'remaining to undo')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                Haptics.warning();
                onUndo();
              }}
              className="px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-white text-xs font-bold shadow-sm hover:opacity-90 tap-feedback flex items-center gap-1 min-h-[36px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('settings.undo', 'Undo')}</span>
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="w-8 h-8 rounded-xl bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-feedback"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 10-Second Progress Bar */}
        <div className="w-full h-1 bg-[var(--color-surface-subtle)] overflow-hidden">
          <div 
            className="h-full bg-[var(--color-accent)] transition-all duration-1000 ease-linear"
            style={{ width: `${(secondsRemaining / durationSeconds) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
