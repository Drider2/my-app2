import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface SkipReasonModalProps {
  isOpen: boolean;
  habitName: string;
  onClose: () => void;
  onConfirmSkip: (reason: string) => void;
}

export const SkipReasonModal: React.FC<SkipReasonModalProps> = ({
  isOpen,
  habitName,
  onClose,
  onConfirmSkip
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('rest');
  const [customNote, setCustomNote] = useState<string>('');

  if (!isOpen) return null;

  const reasons = [
    { id: 'rest', label: 'Deliberate Rest / Recovery' },
    { id: 'sick', label: 'Illness / Feeling Unwell' },
    { id: 'travel', label: 'Travel / In Transit' },
    { id: 'social', label: 'Family / Social Event' },
    { id: 'other', label: 'Other Reason' },
  ];

  const handleConfirm = () => {
    const finalReason = selectedReason === 'other' && customNote.trim() ? customNote.trim() : selectedReason;
    onConfirmSkip(finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60  animate-fade-in">
      <div 
        className="w-full max-w-sm bg-[var(--color-surface)] rounded-3xl p-5  border border-[var(--color-border)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="skip-modal-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div>
            <h2 id="skip-modal-title" className="text-sm font-bold text-[var(--color-text-primary)]">
              Skip "{habitName}"
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Honest tracking: skipping preserves your streak.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[#222C24]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-3 space-y-1.5">
          {reasons.map((r) => (
            <label
              key={r.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                selectedReason === r.id
                  ? 'border-[var(--color-accent)] bg-[#222C24] text-[var(--color-text-primary)] font-semibold'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] hover:bg-[#222C24] text-[var(--color-text-secondary)]'
              }`}
            >
              <input
                type="radio"
                name="skip_reason"
                checked={selectedReason === r.id}
                onChange={() => setSelectedReason(r.id)}
                className="accent-[#A6D96A]"
              />
              <span className="text-xs">{r.label}</span>
            </label>
          ))}

          {selectedReason === 'other' && (
            <input
              type="text"
              placeholder="Specify reason..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full mt-2 text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] placeholder-[#707B71]"
            />
          )}
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] mb-4 text-xs text-[var(--color-text-secondary)]">
          <ShieldCheck className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0" />
          <span>
            Calm by design: A skip is excluded from today's denominator and will <strong>not</strong> break your fire streak.
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[#222C24] rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-xs font-bold rounded-xl hover:bg-[#b8e482] "
          >
            Confirm Skip
          </button>
        </div>
      </div>
    </div>
  );
};
