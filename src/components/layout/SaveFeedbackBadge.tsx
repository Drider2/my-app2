import React, { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { db } from '../../services/storage';
import { Haptics } from '../../services/haptics';

export const SaveFeedbackBadge: React.FC = () => {
  const [syncState, setSyncState] = useState(() => db.getSyncStatus());
  const [isManualRetrying, setIsManualRetrying] = useState(false);

  useEffect(() => {
    const handleSyncStatus = (e: Event) => {
      const custom = e as CustomEvent<{ status: 'idle' | 'saving' | 'saved' | 'error'; error: string | null }>;
      if (custom.detail) {
        setSyncState(db.getSyncStatus());
      }
    };

    window.addEventListener('greendream_sync_status', handleSyncStatus);
    return () => {
      window.removeEventListener('greendream_sync_status', handleSyncStatus);
    };
  }, []);

  const handleRetry = async () => {
    Haptics.tick();
    setIsManualRetrying(true);
    await db.syncToServer();
    setIsManualRetrying(false);
  };

  const { status, error } = syncState;

  if (status === 'idle') {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="save-feedback-badge"
      className="fixed top-3 end-3 sm:end-6 z-[60] select-none pointer-events-auto transition-all animate-fade-in"
    >
      {status === 'saving' && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-accent)] text-[var(--color-accent)] text-[12px] font-semibold shadow-lg ">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Saving...</span>
        </div>
      )}

      {status === 'saved' && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surface)] border border-emerald-500/40 text-emerald-400 text-[12px] font-semibold shadow-lg  animate-enter">
          <Check className="w-3.5 h-3.5 stroke-[2.8]" />
          <span>Saved</span>
        </div>
      )}

      {status === 'error' && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={isManualRetrying}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 active:scale-95 text-[12px] font-bold shadow-lg transition-all cursor-pointer tap-feedback"
          title={error || 'Sync failed. Tap to retry saving to cloud database.'}
        >
          {isManualRetrying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>Sync failed</span>
          <span className="underline ml-0.5 text-amber-200">Retry</span>
        </button>
      )}
    </div>
  );
};
