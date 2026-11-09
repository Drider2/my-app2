import React from 'react';
import { X, Check, LayoutGrid, Sliders } from 'lucide-react';
import { PRESET_CONFIGS } from '../../services/widgetRegistry';
import { DashboardPresetId } from '../../types';

interface PresetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: DashboardPresetId;
  onSelectPreset: (presetId: DashboardPresetId) => void;
}

export const PresetSelectorModal: React.FC<PresetSelectorModalProps> = ({
  isOpen,
  onClose,
  currentPreset,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  const presets: DashboardPresetId[] = [
    'complete_overview',
    'minimal',
    'finance_focus',
    'fitness_focus',
    'productivity_focus',
  ];

  const handleApply = (presetId: DashboardPresetId) => {
    if (window.confirm(`Switch to the "${PRESET_CONFIGS[presetId].name}" layout preset? Your current widget order will be replaced.`)) {
      onSelectPreset(presetId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80  animate-fade-in">
      <div className="w-full max-w-sm bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl  flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Dashboard Presets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] tap-feedback"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Cards */}
        <div className="p-4 space-y-2.5">
          {presets.map(id => {
            const config = PRESET_CONFIGS[id];
            const isSelected = currentPreset === id;

            return (
              <div
                key={id}
                onClick={() => handleApply(id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer tap-feedback ${
                  isSelected
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--color-text-primary)]">{config.name}</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-snug">
                      {config.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-bg)] flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {config.widgetTypes.slice(0, 4).map((w, idx) => (
                    <span key={idx} className="text-xs px-1.5 py-0.2 rounded bg-[var(--color-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                      {w.type.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {config.widgetTypes.length > 4 && (
                    <span className="text-xs px-1.5 py-0.2 rounded bg-[var(--color-elevated)] text-[var(--color-text-muted)]">
                      +{config.widgetTypes.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
