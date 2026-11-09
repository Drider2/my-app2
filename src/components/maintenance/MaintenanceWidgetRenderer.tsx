import React from 'react';
import { 
  Wrench, 
  Sparkles, 
  ShoppingBag, 
  Car, 
  Calendar, 
  Clock, 
  Check, 
  CheckCircle2, 
  Plus, 
  Gauge 
} from 'lucide-react';
import { db, formatCurrency, getTodayLocalDate } from '../../services/storage';
import { getItemDueStatus, calculateMaintenanceSummary } from '../../services/maintenanceService';
import { ModuleWidgetConfig, MaintenanceItem } from '../../types';

interface MaintenanceWidgetRendererProps {
  widget: ModuleWidgetConfig;
  onRefresh: () => void;
  onOpenAddItemModal?: () => void;
  onCompleteItem?: (item: MaintenanceItem) => void;
  triggerToast?: (msg: string) => void;
}

export const MaintenanceWidgetRenderer: React.FC<MaintenanceWidgetRendererProps> = ({
  widget,
  onRefresh,
  onOpenAddItemModal,
  onCompleteItem,
  triggerToast = () => {},
}) => {
  const state = db.getState();
  const today = getTodayLocalDate();
  const items = state.maintenanceItems || [];

  const haircutItem = items.find(i => !i.deleted_at && i.category === 'personal_care' && i.name.toLowerCase().includes('haircut'));
  const carItem = items.find(i => !i.deleted_at && i.category === 'car_maintenance');
  const shoppingItems = items.filter(i => !i.deleted_at && !i.is_purchased && i.status !== 'completed' && i.category === 'shopping');
  const historyItems = items.filter(i => !i.deleted_at && (i.status === 'completed' || i.is_purchased)).slice(0, 4);
  const upcomingItems = items.filter(i => !i.deleted_at && !i.is_purchased && i.status !== 'completed')
    .sort((a, b) => a.next_reminder_date.localeCompare(b.next_reminder_date));

  switch (widget.widgetType) {
    // 1. Haircut Countdown
    case 'maint_haircut': {
      const dueStatus = haircutItem ? getItemDueStatus(haircutItem) : null;
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Personal Care
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Haircut & Grooming Countdown
                </h3>
              </div>
            </div>
            {haircutItem && onCompleteItem && (
              <button
                onClick={() => onCompleteItem(haircutItem)}
                className="px-2.5 py-1 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold tap-feedback shadow-sm"
              >
                Done
              </button>
            )}
          </div>

          {haircutItem ? (
            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs">
              <div>
                <span className="text-xs text-[var(--color-text-secondary)]">Next Due Date</span>
                <div className="font-bold text-[var(--color-text-primary)]">{haircutItem.next_reminder_date}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--color-text-secondary)]">Status</span>
                <div className="font-bold text-[var(--color-accent)]">
                  {dueStatus?.badgeText || 'Upcoming'}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-secondary)] py-2">
              No haircut schedule configured yet.
            </p>
          )}
        </div>
      );
    }

    // 2. Car Maintenance
    case 'maint_car':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[#D6AD68]">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
                  Vehicle Maintenance
                </span>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {carItem ? carItem.name : 'Car Upkeep'}
                </h3>
              </div>
            </div>
            {carItem && onCompleteItem && (
              <button
                onClick={() => onCompleteItem(carItem)}
                className="px-2.5 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-semibold tap-feedback"
              >
                Log Service
              </button>
            )}
          </div>

          {carItem && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-secondary)]">Current Odometer</span>
                <div className="font-black text-[var(--color-text-primary)] text-sm">
                  {carItem.current_odometer_km ? `${carItem.current_odometer_km.toLocaleString()} km` : '142,500 km'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-secondary)]">Next Oil Change</span>
                <div className="font-black text-[var(--color-accent)] text-sm">
                  {carItem.next_reminder_mileage_km ? `${carItem.next_reminder_mileage_km.toLocaleString()} km` : '150,000 km'}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    // 3. Upcoming Purchases
    case 'maint_upcoming_purchases':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Essentials Shopping List
              </h3>
            </div>
            {onOpenAddItemModal && (
              <button
                onClick={onOpenAddItemModal}
                className="text-xs text-[var(--color-accent)] font-semibold hover:underline"
              >
                + Add Item
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {shoppingItems.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] py-2 text-center">
                All essentials are stocked!
              </p>
            ) : (
              shoppingItems.slice(0, 4).map(item => (
                <div key={item.id} className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[var(--color-text-primary)]">{item.name}</span>
                    <div className="text-xs text-[var(--color-text-secondary)]">Est: {formatCurrency(item.estimated_cost_minor, state.settings.currency_label)}</div>
                  </div>
                  {onCompleteItem && (
                    <button
                      onClick={() => onCompleteItem(item)}
                      className="px-2 py-0.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-positive)] tap-feedback"
                    >
                      Buy
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      );

    // 4. Maintenance History
    case 'maint_history':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Service & Maintenance History
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">{historyItems.length} records</span>
          </div>

          <div className="space-y-2">
            {historyItems.map(item => (
              <div key={item.id} className="p-2.5 rounded-xl bg-[var(--color-surface)]/70 border border-[var(--color-border)] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[var(--color-text-primary)]">{item.name}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{item.last_service_date || item.next_reminder_date}</div>
                </div>
                <span className="font-bold text-[var(--color-positive)]">Completed</span>
              </div>
            ))}
          </div>
        </div>
      );

    // 5. Recurring Reminders
    case 'maint_recurring':
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Recurring Routine Reminders
            </h3>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Personal upkeep and hygiene cadences are calculated automatically.
          </p>
        </div>
      );

    // 6. Next Maintenance Dates
    case 'maint_next_dates':
      return (
        <div className="card-premium p-4  space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                Next Upcoming Service Dates
              </h3>
            </div>
          </div>

          <div className="space-y-1.5">
            {upcomingItems.slice(0, 3).map(item => (
              <div key={item.id} className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[180px]">{item.name}</span>
                <span className="text-xs font-bold text-[var(--color-accent)]">{item.next_reminder_date}</span>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
};
