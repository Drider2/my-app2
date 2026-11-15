import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Wrench, 
  Car, 
  Gauge, 
  Coins, 
  Check, 
  X, 
  Copy, 
  Download, 
  AlertTriangle, 
  Plus, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { VehicleService, VehicleHealthSummary } from '../../services/vehicleService';
import { getTodayLocalDate } from '../../services/storage';

interface VehicleServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onRefresh?: () => void;
}

export const VehicleServiceModal: React.FC<VehicleServiceModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onRefresh,
}) => {
  const currentOdo = useMemo(() => VehicleService.getCurrentOdometer(), [isOpen]);
  
  const [serviceName, setServiceName] = useState('Engine Oil & Filter (10W40 / 5W40)');
  const [odometerKm, setOdometerKm] = useState<number>(currentOdo);
  const [partsCost, setPartsCost] = useState<number>(6500);
  const [laborCost, setLaborCost] = useState<number>(1000);
  const [intervalKm, setIntervalKm] = useState<number>(10000);
  const [notes, setNotes] = useState('');
  const [recordToFinance, setRecordToFinance] = useState(true);
  const [version, setVersion] = useState(0);

  const summary: VehicleHealthSummary = useMemo(() => {
    return VehicleService.getHealthSummary();
  }, [isOpen, version]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof VehicleService.SERVICE_PRESETS[0]) => {
    setServiceName(preset.name);
    setPartsCost(preset.defaultCostDA);
    setIntervalKm(preset.defaultIntervalKm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      if (onShowToast) onShowToast('⚠️ Please enter a service description.');
      return;
    }

    VehicleService.recordVehicleService({
      name: serviceName.trim(),
      odometerKm: Number(odometerKm) || currentOdo,
      partsCostDA: Number(partsCost) || 0,
      laborCostDA: Number(laborCost) || 0,
      intervalKm: Number(intervalKm) || 10000,
      notes: notes.trim() || undefined,
      recordToFinance,
    });

    setVersion(prev => prev + 1);
    const totalDA = (Number(partsCost) || 0) + (Number(laborCost) || 0);
    if (onShowToast) onShowToast(`✓ Logged ${serviceName} (${totalDA.toLocaleString()} DA)! Odometer set to ${odometerKm.toLocaleString()} km.`);
    if (onRefresh) onRefresh();
  };

  const handleDownloadCSV = () => {
    const csv = VehicleService.generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `greendream_vehicle_services_${getTodayLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('✓ Exported Vehicle Service Ledger (.CSV)');
  };

  const handleCopySummary = () => {
    const text = `🚗 Vehicle Health Summary (${getTodayLocalDate()}):\n` +
      `Current Odometer: ${summary.currentOdometerKm.toLocaleString()} km\n` +
      `Total Service Expense: ${summary.totalServiceExpenseDA.toLocaleString()} DA\n` +
      `Next Services:\n` +
      summary.upcomingServices.map(s => `• ${s.name}: ${s.kmRemaining > 0 ? `due in ${s.kmRemaining.toLocaleString()} km` : `OVERDUE by ${Math.abs(s.kmRemaining).toLocaleString()} km ⚠️`}`).join('\n');

    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast('📋 Vehicle summary copied to clipboard!');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80  animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--hairline)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--hairline)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-1)] flex items-center gap-2">
                <span>Vehicle Service & Parts Desk</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-mono font-bold border border-cyan-500/30">
                  {summary.currentOdometerKm.toLocaleString()} km
                </span>
              </h2>
              <p className="text-xs text-[var(--text-3)]">
                Preventative maintenance intervals, parts replacement costs & odometer synchronization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-muted)] transition-colors"
              title="Copy summary"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-muted)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Executive 3-Gauge Banner */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-center">
              <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-0.5">
                Current Odometer
              </span>
              <span className="text-base sm:text-lg font-black text-cyan-400 font-mono">
                {summary.currentOdometerKm.toLocaleString()} <span className="text-[10px] font-normal text-[var(--text-3)]">km</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-center">
              <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-0.5">
                Service Spend
              </span>
              <span className="text-base sm:text-lg font-black text-[var(--text-1)] font-mono">
                {summary.totalServiceExpenseDA.toLocaleString()} <span className="text-[10px] font-normal text-[var(--text-3)]">DA</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-center">
              <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider block mb-0.5">
                Active Items
              </span>
              <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                {summary.upcomingServices.length} <span className="text-[10px] font-normal text-[var(--text-3)]">tracked</span>
              </span>
            </div>
          </div>

          {/* 1-Tap Fast Presets Carousel */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider block px-1">
              Popular Service Presets
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {VehicleService.SERVICE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2.5 rounded-xl border text-left shrink-0 transition-all ${
                    serviceName === p.name
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-[var(--surface-muted)] text-[var(--text-2)] border-[var(--hairline)] hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block truncate max-w-[180px]">{p.name}</span>
                  <span className="text-[10px] text-[var(--text-3)] font-mono block">
                    ~{p.defaultIntervalKm.toLocaleString()} km • {p.defaultCostDA.toLocaleString()} DA
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Service Entry Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-[var(--surface-muted)] border border-cyan-500/30 space-y-4">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <span>Record Completed Vehicle Service</span>
            </span>

            {/* Service Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-2)]">Service Description</label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={e => setServiceName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-cyan-500 font-semibold"
              />
            </div>

            {/* Odometer & Interval */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-2)] flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Odometer (km)</span>
                </label>
                <input
                  type="number"
                  required
                  value={odometerKm}
                  onChange={e => setOdometerKm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-2)]">Next Interval (+km)</label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={intervalKm}
                  onChange={e => setIntervalKm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Costs Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-2)]">Parts Cost (DA)</label>
                <input
                  type="number"
                  step="100"
                  required
                  value={partsCost}
                  onChange={e => setPartsCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-2)]">Labor / Garage (DA)</label>
                <input
                  type="number"
                  step="100"
                  value={laborCost}
                  onChange={e => setLaborCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-xs text-[var(--text-1)] font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Workshop & Parts Notes */}
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Workshop name, oil viscosity (e.g. Total 10W40), OEM part number..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-cyan-500 placeholder:text-[var(--text-3)]"
              />
            </div>

            {/* Record to Finance Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="recordFinanceCar"
                checked={recordToFinance}
                onChange={e => setRecordToFinance(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-transparent border-[var(--hairline)]"
              />
              <label htmlFor="recordFinanceCar" className="text-xs text-[var(--text-2)] cursor-pointer">
                Auto-record total service expense ({(Number(partsCost) + Number(laborCost)).toLocaleString()} DA) to Finance Ledger under Car & Transport
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all tap-feedback shadow-md shadow-cyan-500/20"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Log Service & Sync Odometer</span>
            </button>
          </form>

          {/* Upcoming Service Countdowns */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider block px-1">
              Upcoming Service Deadlines
            </span>

            {summary.upcomingServices.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[var(--surface-muted)] text-center text-xs text-[var(--text-3)]">
                No scheduled vehicle services recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {summary.upcomingServices.map(s => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[var(--text-1)] block">{s.name}</span>
                      <span className="text-[11px] text-[var(--text-3)] font-mono">
                        Target: {s.nextMileageKm.toLocaleString()} km
                      </span>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border font-mono ${
                      s.isOverdue
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                        : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    }`}>
                      {s.isOverdue 
                        ? `Overdue by ${Math.abs(s.kmRemaining).toLocaleString()} km ⚠️` 
                        : `${s.kmRemaining.toLocaleString()} km remaining`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--hairline)] bg-[var(--surface)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--surface)] text-[var(--text-1)] text-xs font-semibold flex items-center gap-2 border border-[var(--hairline)] transition-all"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Export Service Log</span>
            <span>.CSV</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-bold transition-all tap-feedback shadow-md shadow-cyan-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
