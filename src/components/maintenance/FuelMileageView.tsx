import React, { useMemo } from 'react';
import { 
  Fuel, 
  Plus, 
  Download, 
  TrendingUp, 
  Gauge, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Trash2, 
  Zap, 
  Car,
  AlertCircle,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { FuelLogEntry } from '../../types';
import { db, formatCurrency, getTodayLocalDate } from '../../services/storage';
import { Haptics } from '../../services/haptics';

interface FuelMileageViewProps {
  onOpenLogModal: () => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
  currencyLabel?: string;
}

export const FuelMileageView: React.FC<FuelMileageViewProps> = ({
  onOpenLogModal,
  onRefresh,
  onToast,
  currencyLabel = 'DA',
}) => {
  const state = db.getState();
  const fuelLogs: FuelLogEntry[] = useMemo(() => {
    return (state.fuelLogs || [])
      .filter(l => !l.deleted_at)
      .sort((a, b) => b.local_date.localeCompare(a.local_date) || b.created_at - a.created_at);
  }, [state.fuelLogs]);

  // Calculations
  const stats = useMemo(() => {
    if (fuelLogs.length === 0) {
      return {
        totalLiters: 0,
        totalCostDA: 0,
        avgEconomy: 0,
        avgCostPerKm: 0,
        avgPricePerLiter: 0,
        totalDistanceKm: 0,
        monthlyProjectedDA: 0,
      };
    }

    const totalLiters = fuelLogs.reduce((sum, l) => sum + l.liters, 0);
    const totalCostDA = fuelLogs.reduce((sum, l) => sum + (l.cost_minor / 100), 0);
    const avgPricePerLiter = totalLiters > 0 ? totalCostDA / totalLiters : 0;

    // Calculate distance between logs if multiple logs exist
    const sortedAsc = [...fuelLogs].sort((a, b) => a.odometer_km - b.odometer_km);
    let totalDistanceKm = 0;
    if (sortedAsc.length > 1) {
      totalDistanceKm = sortedAsc[sortedAsc.length - 1].odometer_km - sortedAsc[0].odometer_km;
    }

    // Average L/100km
    let avgEconomy = 0;
    let avgCostPerKm = 0;
    if (totalDistanceKm > 0 && totalLiters > 0) {
      avgEconomy = (totalLiters / totalDistanceKm) * 100;
      avgCostPerKm = totalCostDA / totalDistanceKm;
    } else {
      // Benchmark based on 8.2L/100km default
      avgEconomy = 7.8;
      avgCostPerKm = avgPricePerLiter * (avgEconomy / 100);
    }

    // Estimate monthly fuel burn (assume 1,000 km/month if not enough data)
    const monthlyDistance = totalDistanceKm > 0 ? Math.max(800, totalDistanceKm) : 1000;
    const monthlyProjectedDA = monthlyDistance * avgCostPerKm;

    return {
      totalLiters,
      totalCostDA,
      avgEconomy,
      avgCostPerKm,
      avgPricePerLiter,
      totalDistanceKm,
      monthlyProjectedDA,
    };
  }, [fuelLogs]);

  const handleDeleteLog = (id: string) => {
    Haptics.tick();
    db.updateState(draft => {
      if (!draft.fuelLogs) return;
      const target = draft.fuelLogs.find(l => l.id === id);
      if (target) {
        target.deleted_at = Date.now();
      }
    });
    onToast('Removed fuel fill-up record');
    onRefresh();
  };

  const handleExportCSV = () => {
    if (fuelLogs.length === 0) {
      onToast('No fuel logs to export');
      return;
    }

    const headers = ['Date', 'Odometer (km)', 'Liters', 'Cost (DA)', 'Fuel Type', 'Station', 'Notes'];
    const rows = fuelLogs.map(l => [
      l.local_date,
      l.odometer_km,
      l.liters,
      (l.cost_minor / 100).toFixed(0),
      l.fuel_type.toUpperCase(),
      `"${(l.station_name || 'Naftal').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greendream_fuel_ledger_${getTodayLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast(`✓ Exported ${fuelLogs.length} fuel logs to CSV`);
  };

  return (
    <div className="space-y-4">
      {/* 4-Card Performance Gauge */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-medium">
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Fuel Pumped</span>
          </div>
          <div className="text-lg font-extrabold text-[var(--color-text-primary)]">
            {stats.totalLiters.toFixed(1)} <span className="text-xs font-semibold text-[var(--color-text-muted)]">L</span>
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            {fuelLogs.length} logged fill-ups
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-medium">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total Fuel Expense</span>
          </div>
          <div className="text-lg font-extrabold text-emerald-400">
            {stats.totalCostDA.toLocaleString()} <span className="text-xs font-semibold text-emerald-500/70">{currencyLabel}</span>
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            ~{stats.avgPricePerLiter.toFixed(1)} {currencyLabel}/L avg
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-amber-500/30 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Fuel Economy</span>
          </div>
          <div className="text-lg font-extrabold text-amber-300">
            {stats.avgEconomy.toFixed(1)} <span className="text-xs font-semibold text-amber-500/80">L / 100km</span>
          </div>
          <div className="text-[11px] text-amber-500/70">
            {stats.avgEconomy <= 7.0 ? 'Optimal Efficiency' : stats.avgEconomy <= 9.0 ? 'Moderate Consumption' : 'Heavy Burn'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-medium">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Running Cost / KM</span>
          </div>
          <div className="text-lg font-extrabold text-cyan-300">
            {stats.avgCostPerKm.toFixed(1)} <span className="text-xs font-semibold text-cyan-500/80">{currencyLabel} / km</span>
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            Est. ~{Math.round(stats.monthlyProjectedDA).toLocaleString()} {currencyLabel}/mo
          </div>
        </div>
      </div>

      {/* Action Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-[var(--color-surface)] to-[var(--color-surface)] border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span>Vehicle Fuel Log & Consumption Desk</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Live Ledger
              </span>
            </h4>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Track fill-up efficiency, gas station prices & auto-sync with car maintenance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center gap-1.5 transition-all"
            title="Export Fuel Ledger CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenLogModal}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all tap-feedback"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Log Fuel Fill-Up</span>
          </button>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
            Fill-Up History ({fuelLogs.length})
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Odometer synchronized with vehicle maintenance
          </span>
        </div>

        {fuelLogs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">No Fuel Fill-Ups Recorded Yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Keep track of liters pumped, fuel economy (L/100km), and fuel spend.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenLogModal}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-600 transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Log Your First Fill-Up</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {fuelLogs.map((log, index) => {
              const prevLog = fuelLogs[index + 1];
              const kmDiff = prevLog && log.odometer_km > prevLog.odometer_km ? log.odometer_km - prevLog.odometer_km : null;
              const economy = kmDiff && kmDiff > 0 ? (log.liters / kmDiff) * 100 : null;

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-amber-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                        <span>{log.station_name || 'Naftal'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                          {log.fuel_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{log.local_date}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3" />
                          <span>{log.odometer_km.toLocaleString()} km</span>
                        </span>
                        {kmDiff && (
                          <span className="text-emerald-400 font-mono text-[10px]">
                            (+{kmDiff.toLocaleString()} km)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--color-border)]">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        {(log.cost_minor / 100).toLocaleString()} {currencyLabel}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">
                        {log.liters} L @ {((log.cost_minor / 100) / log.liters).toFixed(1)} {currencyLabel}/L
                      </div>
                    </div>

                    {economy && (
                      <div className="px-2.5 py-1 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center shrink-0">
                        <span className="text-[9px] uppercase font-bold text-[var(--color-text-muted)] block">
                          Economy
                        </span>
                        <span className="text-xs font-mono font-extrabold text-amber-400">
                          {economy.toFixed(1)} <span className="text-[9px]">L/100</span>
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-rose-400 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors opacity-60 group-hover:opacity-100"
                      title="Remove fill-up log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
