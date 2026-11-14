import { db, generateUUID, getTodayLocalDate } from './storage';
import { MaintenanceItem, Transaction } from '../types';
import { updateCarOdometer } from './maintenanceService';

export interface ServiceRecordParams {
  name: string;
  odometerKm: number;
  partsCostDA: number;
  laborCostDA?: number;
  intervalKm: number;
  serviceDate?: string;
  notes?: string;
  recordToFinance?: boolean;
}

export interface VehicleHealthSummary {
  currentOdometerKm: number;
  totalServiceExpenseDA: number;
  upcomingServices: {
    id: string;
    name: string;
    nextMileageKm: number;
    kmRemaining: number;
    isOverdue: boolean;
  }[];
}

export class VehicleService {
  static SERVICE_PRESETS = [
    { name: 'Engine Oil & Filter (10W40 / 5W40)', defaultIntervalKm: 10000, defaultCostDA: 6500 },
    { name: 'Air & Cabin Filters Replacement', defaultIntervalKm: 20000, defaultCostDA: 3000 },
    { name: 'Front Brake Pads & Fluid Inspection', defaultIntervalKm: 30000, defaultCostDA: 7500 },
    { name: 'Spark Plugs (Bougies) & Ignition', defaultIntervalKm: 40000, defaultCostDA: 4500 },
    { name: 'Timing Belt Kit & Water Pump (Courroie)', defaultIntervalKm: 60000, defaultCostDA: 35000 },
    { name: 'Tires Rotation, Balance & Alignment', defaultIntervalKm: 20000, defaultCostDA: 2500 },
    { name: 'Coolant Flush & Radiator Inspection', defaultIntervalKm: 40000, defaultCostDA: 5000 },
  ];

  static getCurrentOdometer(): number {
    const state = db.getState();
    const carItems = (state.maintenanceItems || []).filter(i => i.category === 'car_maintenance' && !i.deleted_at);
    let highest = 0;
    carItems.forEach(i => {
      if ((i.current_odometer_km || 0) > highest) highest = i.current_odometer_km || 0;
    });

    const fuelLogs = (state.fuelLogs || []).filter(f => !f.deleted_at);
    fuelLogs.forEach(f => {
      if ((f.odometer_km || 0) > highest) highest = f.odometer_km || 0;
    });

    return highest > 0 ? highest : 142500;
  }

  static recordVehicleService(params: ServiceRecordParams): {
    maintenanceItem: MaintenanceItem;
    transaction?: Transaction;
  } {
    const today = params.serviceDate || getTodayLocalDate();
    const totalCostDA = Math.max(0, (params.partsCostDA || 0) + (params.laborCostDA || 0));
    const totalCostMinor = Math.round(totalCostDA * 100);
    const nextMileageKm = params.odometerKm + Math.max(1000, params.intervalKm || 10000);

    // Update global odometer across car items
    updateCarOdometer(params.odometerKm);

    // Create or update maintenance item
    const newItem: MaintenanceItem = {
      id: generateUUID(),
      name: params.name,
      category: 'car_maintenance',
      estimated_cost_minor: totalCostMinor,
      actual_cost_minor: totalCostMinor,
      recurrence_type: 'mileage',
      recurrence_interval: params.intervalKm,
      last_service_date: today,
      next_reminder_date: today,
      current_odometer_km: params.odometerKm,
      next_reminder_mileage_km: nextMileageKm,
      priority: 'high',
      status: 'completed',
      is_purchased: true,
      notes: params.notes || `Parts: ${params.partsCostDA.toLocaleString()} DA | Labor: ${(params.laborCostDA || 0).toLocaleString()} DA`,
      finance_category_id: 'cat-car',
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    let newTx: Transaction | undefined;

    db.updateState(state => {
      if (!state.maintenanceItems) state.maintenanceItems = [];
      state.maintenanceItems.unshift(newItem);

      // Auto-record to Finance ledger if requested
      if (params.recordToFinance && totalCostMinor > 0) {
        if (!state.transactions) state.transactions = [];
        newTx = {
          id: generateUUID(),
          local_date: today,
          type: 'expense',
          category_id: 'cat-car',
          amount_minor: totalCostMinor,
          note: `Vehicle Service: ${params.name} @ ${params.odometerKm.toLocaleString()} km`,
          created_at: Date.now(),
          updated_at: Date.now(),
          deleted_at: null,
        };
        state.transactions.unshift(newTx);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('greendream_state_updated'));
    }

    return { maintenanceItem: newItem, transaction: newTx };
  }

  static getHealthSummary(): VehicleHealthSummary {
    const state = db.getState();
    const currentOdo = this.getCurrentOdometer();

    const carItems = (state.maintenanceItems || [])
      .filter(i => i.category === 'car_maintenance' && !i.deleted_at);

    let totalServiceExpenseMinor = 0;
    const upcoming: VehicleHealthSummary['upcomingServices'] = [];

    carItems.forEach(i => {
      totalServiceExpenseMinor += (i.actual_cost_minor || i.estimated_cost_minor || 0);

      if (i.next_reminder_mileage_km) {
        const kmRemaining = i.next_reminder_mileage_km - currentOdo;
        upcoming.push({
          id: i.id,
          name: i.name,
          nextMileageKm: i.next_reminder_mileage_km,
          kmRemaining,
          isOverdue: kmRemaining <= 0,
        });
      }
    });

    upcoming.sort((a, b) => a.kmRemaining - b.kmRemaining);

    return {
      currentOdometerKm: currentOdo,
      totalServiceExpenseDA: Math.round(totalServiceExpenseMinor / 100),
      upcomingServices: upcoming,
    };
  }

  static generateCSV(): string {
    const state = db.getState();
    const carItems = (state.maintenanceItems || [])
      .filter(i => i.category === 'car_maintenance' && !i.deleted_at)
      .sort((a, b) => (b.current_odometer_km || 0) - (a.current_odometer_km || 0));

    const headers = ['Service Item', 'Date', 'Odometer (km)', 'Total Cost (DA)', 'Next Mileage (km)', 'Status', 'Notes'];
    const rows = carItems.map(i => [
      `"${i.name}"`,
      i.last_service_date || i.next_reminder_date,
      i.current_odometer_km || 0,
      ((i.actual_cost_minor || i.estimated_cost_minor || 0) / 100).toFixed(0),
      i.next_reminder_mileage_km || 'N/A',
      i.status,
      `"${(i.notes || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
