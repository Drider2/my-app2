import React, { useState, useEffect } from 'react';
import { Gauge, X, Check, Plus, AlertTriangle, Car, ArrowRight } from 'lucide-react';
import { db } from '../../services/storage';
import { updateCarOdometer } from '../../services/maintenanceService';
import { MaintenanceItem } from '../../types';

interface UpdateOdometerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const UpdateOdometerModal: React.FC<UpdateOdometerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const state = db.getState();
  const carItems = (state.maintenanceItems || []).filter(
    (i) => i.category === 'car_maintenance' && !i.deleted_at
  );

  const initialOdometer =
    carItems.find((i) => i.current_odometer_km)?.current_odometer_km || 142500;

  const [odometer, setOdometer] = useState<number>(initialOdometer);

  useEffect(() => {
    if (isOpen) {
      const freshKm =
        carItems.find((i) => i.current_odometer_km)?.current_odometer_km || 142500;
      setOdometer(freshKm);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const delta = odometer - initialOdometer;

  const handleNudge = (km: number) => {
    setOdometer((prev) => Math.max(0, prev + km));
  };

  const handleSave = () => {
    if (odometer <= 0) return;
    const res = updateCarOdometer(odometer);
    if (onSuccess) onSuccess(res.message);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Update Car Odometer
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Synchronize mileage across all service schedules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current & New Odometer Input */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-secondary)]">Current Registered:</span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {initialOdometer.toLocaleString()} km
            </span>
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              New Reading (km)
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                step="50"
                value={odometer}
                onChange={(e) => setOdometer(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-lg font-mono font-bold text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <span className="absolute right-4 text-xs font-semibold text-[var(--color-text-secondary)]">
                km
              </span>
            </div>
          </div>

          {/* Delta indicator */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[var(--color-text-secondary)]">Distance logged:</span>
            <span
              className={`font-mono font-semibold ${
                delta > 0
                  ? 'text-cyan-400'
                  : delta < 0
                  ? 'text-amber-400'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {delta > 0 ? `+${delta.toLocaleString()} km` : `${delta.toLocaleString()} km`}
            </span>
          </div>

          {/* Quick Nudges */}
          <div className="pt-2">
            <div className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
              Quick Increment
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[100, 250, 500, 1000, 2500].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleNudge(n)}
                  className="py-1.5 px-1 rounded-lg bg-[var(--color-surface)] hover:bg-cyan-500/10 border border-[var(--color-border)] hover:border-cyan-500/30 text-[11px] font-mono font-medium text-[var(--color-text-primary)] hover:text-cyan-400 transition-all text-center"
                >
                  +{n >= 1000 ? `${n / 1000}k` : n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Impact on Upcoming Services */}
        {carItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
              <Car className="w-3.5 h-3.5 text-cyan-400" />
              <span>Service Intervals Affected</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {carItems.map((item) => {
                const target = item.next_reminder_mileage_km;
                if (!target) return null;
                const remaining = target - odometer;
                const isOverdue = remaining <= 0;

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)]">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">
                        Target: {target.toLocaleString()} km
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold ${
                          isOverdue ? 'text-amber-400' : 'text-cyan-400'
                        }`}
                      >
                        {isOverdue ? 'Service Due!' : `${remaining.toLocaleString()} km left`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Update Odometer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
