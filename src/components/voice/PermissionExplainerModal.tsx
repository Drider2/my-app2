// ========================================================
// PermissionExplainerModal: Glass pre-permission dialog
// Explains why Hermes needs microphone access and provides
// direct recovery instructions if permanently denied.
// ========================================================

import React from 'react';
import { Mic, Shield, ExternalLink, X } from 'lucide-react';
import { useTranslation } from '../../services/i18n';

interface PermissionExplainerModalProps {
  isOpen: boolean;
  isPermanentlyDenied: boolean;
  onClose: () => void;
  onRequestPermission: () => void;
}

export const PermissionExplainerModal: React.FC<PermissionExplainerModalProps> = ({
  isOpen,
  isPermanentlyDenied,
  onClose,
  onRequestPermission,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleOpenSettings = () => {
    try {
      window.location.href = 'app-settings:';
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70  animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[rgba(15,20,30,0.95)] border border-[var(--color-border)] p-6 shadow-2xl space-y-5 text-center relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perm-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 end-4 min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white tap-feedback transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-3xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto shadow-[0_0_25px_rgba(168,85,247,0.2)]">
          <Mic className="w-8 h-8 animate-pulse" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h3 id="perm-title" className="text-base font-bold text-[var(--color-text-primary)]">
            {isPermanentlyDenied
              ? t('voice.permDeniedTitle', 'Microphone Access Required')
              : t('voice.permExplainerTitle', 'Enable Microphone for Hermes')}
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {isPermanentlyDenied
              ? t(
                  'voice.permDeniedDesc',
                  'Microphone permission is blocked by system settings. To talk with Hermes or send voice messages, enable Microphone in Android Settings > Apps > GreenDream > Permissions.'
                )
              : t(
                  'voice.permExplainerDesc',
                  'Hermes needs your microphone to hear your voice and transcribe your notes. No audio leaves your phone without your explicit action.'
                )}
          </p>
        </div>

        {/* Privacy Note */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-[var(--color-text-secondary)] flex items-center gap-2 text-start">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t('voice.privacyGuarantee', '100% private. Only records when you tap the mic.')}</span>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          {isPermanentlyDenied ? (
            <button
              type="button"
              onClick={handleOpenSettings}
              className="w-full min-h-[48px] rounded-2xl bg-[var(--color-accent)] text-white font-semibold text-xs tap-feedback flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t('voice.openSettings', 'Open App Settings')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestPermission();
              }}
              className="w-full min-h-[48px] rounded-2xl bg-[var(--color-accent)] text-white font-semibold text-xs tap-feedback flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all"
            >
              <Mic className="w-4 h-4" />
              <span>{t('voice.allowMicrophone', 'Continue to Microphone')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] rounded-2xl border border-[var(--color-border)] bg-transparent text-xs text-[var(--color-text-secondary)] hover:text-white tap-feedback transition-colors"
          >
            {t('voice.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
