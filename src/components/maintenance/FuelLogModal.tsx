import React, { useState, useMemo } from 'react';
import { 
  Fuel, 
  X, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Gauge, 
  Download, 
  Check, 
  Calendar, 
  DollarSign, 
  Zap,
  MapPin
} from 'lucide-react';
import { FuelLogEntry } from '../../types';
import { db, generateUUID, getTodayLocalDate, formatCurrency } from '../../services/storage';
import { Haptics } from '../../services/haptics';

interface FuelLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
  currentCarOdometer?: number;
  currencyLabel?: string;
}

export const FuelLogModal: React.FC<FuelLogModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  onToast,
  currentCarOdometer,
  currencyLabel = 'DA',
}) => {
  const today = getTodayLocalDate();
  const state = db.getState();
  const fuelLogs: FuelLogEntry[] = (state.fuelLogs || []).filter(l => !l.deleted_at);

  // Form State
  const computedOdo = currentCarOdometer || (state.maintenanceItems || []).filter(i => i.category === 'car_maintenance' && !i.deleted_at).find(i => i.current_odometer_km)?.current_odometer_km || 142500;
  const [odometerKm, setOdometerKm] = useState<number>(computedOdo);
  const [liters, setLiters] = useState<string>('35');
  const [totalCost, setTotalCost] = useState<string>('1600');
  const [fuelType, setFuelType] = useState<'essence' | 'gasoil' | 'gpl'>('essence');
  const [stationName, setStationName] = useState<string>('Naftal');
  const [fillDate, setFillDate] = useState<string>(today);
  const [recordInFinance, setRecordInFinance] = useState<boolean>(true);

  // Sort logs descending by odometer
  const sortedLogs = useMemo(() => {
    return [...fuelLogs].sort((a, b) => b.odometer_km - a.odometer_km);
  }, [fuelLogs]);

  // Last log before this one
  const previousLog = sortedLogs[0];

  // Dynamic calculations
  const distanceSinceLast = useMemo(() => {
    if (!previousLog || odometerKm <= previousLog.odometer_km) return null;
    return odometerKm - previousLog.odometer_km;
  }, [previousLog, odometerKm]);

  const pricePerLiter = useMemo(() => {
    const cost = parseFloat(totalCost);
    const l = parseFloat(liters);
    if (!cost || !l || l <= 0) return 0;
    return (cost / l).toFixed(2);
  }, [totalCost, liters]);

  const fuelEconomyLPer100Km = useMemo(() => {
    const l = parseFloat(liters);
    if (!distanceSinceLast || distanceSinceLast <= 0 || !l) return null;
    return ((l / distanceSinceLast) * 100).toFixed(1);
  }, [liters, distanceSinceLast]);

  const costPerKm = useMemo(() => {
    const cost = parseFloat(totalCost);
    if (!distanceSinceLast || distanceSinceLast <= 0 || !cost) return null;
    return (cost / distanceSinceLast).toFixed(2);
  }, [totalCost, distanceSinceLast]);

  if (!isOpen) return null;

  const handleAddFuelLog = (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseFloat(liters);
    const cost = parseFloat(totalCost);
    if (!l || l <= 0 || !cost || cost <= 0) return;

    Haptics.tick();

    const newLog: FuelLogEntry = {
      id: generateUUID(),
      odometer_km: odometerKm,
      liters: l,
      cost_minor: Math.round(cost * 100),
      fuel_type: fuelType,
      station_name: stationName.trim() || undefined,
      local_date: fillDate,
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(draft => {
      draft.fuelLogs = draft.fuelLogs || [];
      draft.fuelLogs.unshift(newLog);

      // 1. Update vehicle odometer in maintenance
      const carItems = (draft.maintenanceItems || []).filter(m => m.category === 'car_maintenance');
      for (const item of carItems) {
        if (!item.current_odometer_km || odometerKm > item.current_odometer_km) {
          item.current_odometer_km = odometerKm;
        }
      }

      // 2. Optionally record in Finance
      if (recordInFinance) {
        const transportCat = draft.categories.find(c => 
          c.name.toLowerCase().includes('transport') || c.name.toLowerCase().includes('car') || c.name.toLowerCase().includes('auto')
        );
        const catId = transportCat?.id || draft.categories[0]?.id || 'cat-1';

        draft.transactions.unshift({
          id: generateUUID(),
          type: 'expense',
          amount_minor: Math.round(cost * 100),
          category_id: catId,
          local_date: fillDate,
          note: `Fuel Fill-up: ${stationName || 'Gas Station'} (${l}L ${fuelType.toUpperCase()}) @ ${odometerKm.toLocaleString()} km`,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        });
      }
    });

    onToast(`✓ Added fuel log: ${l}L (${cost.toLocaleString()} ${currencyLabel}) @ ${odometerKm.toLocaleString()} km`);
    onRefresh();
    Haptics.success();
  };

  const handleDeleteLog = (id: string) => {
    if (!confirm('Delete this fuel record?')) return;
    Haptics.tick();
    db.updateState(draft => {
      const target = (draft.fuelLogs || []).find(l => l.id === id);
      if (target) target.deleted_at = Date.now();
    });
    onToast('Fuel record deleted');
    onRefresh();
  };

  const handleExportCsv = () => {
    Haptics.tick();
    const headers = ['ID', 'Date', 'Odometer (km)', 'Fuel Type', 'Liters', `Total Cost (${currencyLabel})`, 'Price/L', 'Station'];
    const rows = sortedLogs.map(l => {
      const priceL = (l.cost_minor / 100 / l.liters).toFixed(2);
      return [
        l.id,
        l.local_date,
        l.odometer_km,
        l.fuel_type,
        l.liters,
        (l.cost_minor / 100).toFixed(2),
        priceL,
        `"${(l.station_name || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greendream_fuel_ledger_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Haptics.success();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4 shadow-2xl animate-scale-up max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <span>Fuel Log & Consumption</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  {(currentCarOdometer || computedOdo).toLocaleString()} km
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Mileage efficiency, consumption rate & fuel expenditure
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Efficiency Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[var(--color-surface-subtle)] to-transparent border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Zap className="w-3.5 h-3.5" />
              <span>Live Fill-Up Metrics</span>
            </span>
            <span>Price: {pricePerLiter} {currencyLabel}/L</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-[10px] text-[var(--color-text-muted)] font-medium">Distance</div>
              <div className="text-xs font-bold text-[var(--color-text-primary)]">
                {distanceSinceLast ? `+${distanceSinceLast.toLocaleString()} km` : 'Baseline'}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-[10px] text-[var(--color-text-muted)] font-medium">Consumption</div>
              <div className="text-xs font-bold text-emerald-400">
                {fuelEconomyLPer100Km ? `${fuelEconomyLPer100Km} L/100km` : '—'}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-[10px] text-[var(--color-text-muted)] font-medium">Cost / KM</div>
              <div className="text-xs font-bold text-amber-400">
                {costPerKm ? `${costPerKm} ${currencyLabel}` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Add Fill-Up Form */}
        <form onSubmit={handleAddFuelLog} className="space-y-3 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Record New Fill-Up</h4>
            <div className="flex items-center gap-1">
              {(['essence', 'gasoil', 'gpl'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFuelType(type)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                    fuelType === type
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">
                Odometer (km) *
              </label>
              <input
                type="number"
                required
                value={odometerKm}
                onChange={(e) => setOdometerKm(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={fillDate}
                onChange={(e) => setFillDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">
                Liters Pumped (L) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="e.g. 40"
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">
                Total Cost ({currencyLabel}) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="e.g. 1800"
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="Station (e.g. Naftal Bab Ezzouar)"
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500"
            />

            <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recordInFinance}
                onChange={(e) => setRecordInFinance(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span>Add to Finance</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 tap-feedback"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Save Fill-Up & Update Odometer</span>
          </button>
        </form>

        {/* Fuel History Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
              Fuel History ({sortedLogs.length})
            </h4>
            {sortedLogs.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {sortedLogs.length === 0 ? (
              <div className="p-5 text-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-subtle)] rounded-2xl border border-[var(--color-border)]">
                No fuel logs recorded yet. Add your first fill-up above.
              </div>
            ) : (
              sortedLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {log.odometer_km.toLocaleString()} km
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {log.fuel_type}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      {log.local_date} • {log.liters} L • {log.station_name || 'Station'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <div className="text-xs font-bold text-amber-400">
                        {(log.cost_minor / 100).toLocaleString()} {currencyLabel}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">
                        {(log.cost_minor / 100 / log.liters).toFixed(1)} {currencyLabel}/L
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
