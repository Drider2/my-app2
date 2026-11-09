// ========================================================
// GreenDream FlameTenDayModal Component (v2.0)
// Full-Screen Meaningful Moment at Every 10 Days
// ========================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Star, Check } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { db, getTodayLocalDate } from '../../services/storage';
import { useTranslation } from '../../services/i18n';
import { 
  pickMilestonePhrase, 
  saveMilestonePhrase, 
  calculateFlameIntensity,
  formatFlameDays 
} from '../../services/flame/flameService';
import { FlameIcon } from './FlameIcon';
import { triggerHaptic } from '../../services/motion';

export interface FlameTenDayModalProps {
  milestone: number; // 10, 20, 30, ...
  isOpen: boolean;
  onClose: () => void;
}

export const FlameTenDayModal: React.FC<FlameTenDayModalProps> = ({
  milestone,
  isOpen,
  onClose,
}) => {
  const { t, language } = useTranslation();
  const state = db.getState();
  const flame = state.settings.flame;
  const today = getTodayLocalDate();

  const [pickedId, setPickedId] = useState<number>(1);
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize phrase selection when modal opens
  useEffect(() => {
    if (!isOpen || !flame) return;

    // Light celebratory haptic pulse, no audio sound
    triggerHaptic('success');

    // Pick phrase avoiding last 6 in history
    const { id } = pickMilestonePhrase(milestone, flame.phraseHistory || []);
    setPickedId(id);

    // Record chosen phrase ID in phraseHistory
    db.updateState(s => {
      if (s.settings.flame) {
        const hist = s.settings.flame.phraseHistory || [];
        s.settings.flame.phraseHistory = [...hist, id].slice(-12);
      }
    });

    // Check if already bookmarked
    const alreadySaved = (flame.savedPhrases || []).some(
      p => p.id === id && p.milestone === milestone
    );
    setIsSaved(alreadySaved);
  }, [isOpen, milestone]);

  // Android hardware back button handler
  useEffect(() => {
    if (!isOpen) return;

    let backListener: any;
    try {
      backListener = CapApp.addListener('backButton', () => {
        onClose();
      });
    } catch {}

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [isOpen, onClose]);

  const phraseText = useMemo(() => {
    return t(`flame.phrases.${pickedId}`, 'A quiet mind is built one ordinary hour at a time.');
  }, [pickedId, t]);

  const handleSave = () => {
    if (isSaved) return;
    triggerHaptic('light');

    db.updateState(s => {
      if (s.settings.flame) {
        s.settings.flame = saveMilestonePhrase(
          s.settings.flame,
          { id: pickedId, text: phraseText, milestone },
          today
        );
      }
    });

    setIsSaved(true);
    setToastMessage(t('flame.savedToWords', 'Saved to your words'));
    setTimeout(() => setToastMessage(null), 2500);
  };

  if (!isOpen) return null;

  const milestoneIntensity = calculateFlameIntensity(milestone);
  const daysHeading = `${formatFlameDays(milestone, language as 'en' | 'fr' | 'ar')}.`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-black/85  px-6 pt-[max(32px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))] text-center select-none animate-in fade-in duration-500"
      role="dialog"
      aria-modal="true"
    >
      {/* Toast Notification for Bookmark */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[var(--color-surface)] border border-white/20 text-white font-medium text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-[var(--accent-light)] stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Spacer */}
      <div className="w-full flex justify-end">
        {/* Subtle bookmark action in upper area */}
        <button
          type="button"
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all tap-feedback ${
            isSaved
              ? 'bg-[rgb(var(--accent-rgb)/0.20)] text-[var(--accent-light)] border-[var(--accent)]'
              : 'bg-white/[0.06] text-white/70 border-white/10 hover:text-white'
          }`}
          aria-label={t('flame.saveThis', 'Save this')}
        >
          <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-[var(--accent-light)]' : ''}`} />
          <span>{isSaved ? t('flame.savedToWords', 'Saved') : t('flame.saveThis', 'Save this')}</span>
        </button>
      </div>

      {/* Centerpiece: Hero Flame Bloom + Meaningful Words */}
      <div className="flex flex-col items-center justify-center max-w-sm w-full space-y-6 my-auto">
        {/* Large 120px Flame Bloom */}
        <div className="relative flex items-center justify-center py-4">
          <FlameIcon
            intensity={milestoneIntensity}
            days={milestone}
            size={120}
            animated={true}
          />
        </div>

        {/* Big Calm Day Heading */}
        <h2 className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
          {daysHeading}
        </h2>

        {/* Quiet, Grounded Phrase Card */}
        <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10  shadow-2xl">
          <p className="text-base font-normal text-white/90 leading-relaxed tracking-wide">
            "{phraseText}"
          </p>
        </div>
      </div>

      {/* Bottom Action: "Keep going" Primary Glass Button */}
      <div className="w-full max-w-xs pt-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 px-6 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-sm tracking-wide shadow-xl tap-feedback hover:opacity-95 transition-all"
        >
          {t('flame.keepGoing', 'Keep going')}
        </button>
      </div>
    </div>
  );
};

export default FlameTenDayModal;
