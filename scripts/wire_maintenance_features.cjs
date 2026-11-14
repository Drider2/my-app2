const fs = require('fs');
const filePath = 'src/services/maintenanceService.ts';
let code = fs.readFileSync(filePath, 'utf8');

const newFunctions = `
/**
 * Updates the vehicle odometer across all car maintenance items
 */
export function updateCarOdometer(newOdometerKm: number): { updatedCount: number; message: string } {
  let count = 0;
  db.updateState(draft => {
    for (const item of (draft.maintenanceItems || [])) {
      if (item.category === 'car_maintenance' && !item.deleted_at) {
        item.current_odometer_km = newOdometerKm;
        item.updated_at = Date.now();
        count++;
      }
    }
  });
  return {
    updatedCount: count,
    message: \`Vehicle odometer updated to \${newOdometerKm.toLocaleString()} km across \${count} service trackers.\`,
  };
}

/**
 * Exports all active maintenance items and service records as clean CSV
 */
export function exportMaintenanceHistoryCsv(): string {
  const state = db.getState();
  const items = (state.maintenanceItems || []).filter(i => !i.deleted_at);

  const headers = [
    'Category',
    'Item Name',
    'Status',
    'Priority',
    'Last Service Date',
    'Cost (DA)',
    'Current Odometer (km)',
    'Next Reminder Date',
    'Next Service Mileage (km)',
    'Interval',
    'Notes'
  ];

  const rows = items.map(i => {
    const costMajor = Math.round((i.actual_cost_minor || i.estimated_cost_minor || 0) / 100);
    const intervalStr = i.recurrence_type === 'days' ? \`\${i.recurrence_interval || 10} days\` :
                        i.recurrence_type === 'weeks' ? \`\${i.recurrence_interval || 1} weeks\` :
                        i.recurrence_type === 'months' ? \`\${i.recurrence_interval || 1} months\` :
                        i.recurrence_type === 'mileage' ? \`\${i.recurrence_interval || 7500} km\` : 'As needed';
    const sanitize = (str: string | undefined) => \`"\${(str || '').replace(/"/g, '""')}"\`;

    return [
      sanitize(i.category),
      sanitize(i.name),
      sanitize(i.status),
      sanitize(i.priority),
      i.last_service_date || '',
      costMajor,
      i.current_odometer_km || '',
      i.next_reminder_date || '',
      i.next_reminder_mileage_km || '',
      sanitize(intervalStr),
      sanitize(i.notes || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\\n');
}

/**
 * Generates an executive Markdown audit report of vehicle maintenance & care schedules
 */
export function exportMaintenanceHistoryMd(): string {
  const state = db.getState();
  const items = (state.maintenanceItems || []).filter(i => !i.deleted_at);
  const today = getTodayLocalDate();

  const carItems = items.filter(i => i.category === 'car_maintenance');
  const personalItems = items.filter(i => i.category === 'personal_care');
  const shoppingItems = items.filter(i => i.category === 'shopping');

  const currentKm = carItems.find(i => i.current_odometer_km)?.current_odometer_km || 142500;

  let md = \`# Vehicle Maintenance & Care Audit Report\\n\\n\`;
  md += \`**Generated:** \${today}  \\n\`;
  md += \`**Vehicle Current Odometer:** \${currentKm.toLocaleString()} km  \\n\`;
  md += \`**Active Care Trackers:** \${items.length} items\\n\\n\`;
  md += \`---\\n\\n\`;

  md += \`## 1. Vehicle Care & Service Schedule\\n\\n\`;
  if (carItems.length === 0) {
    md += \`*No vehicle maintenance items configured.*\\n\\n\`;
  } else {
    md += \`| Service Item | Priority | Last Service | Cost (DA) | Target Mileage | Remaining | Next Date | Notes |\\n\`;
    md += \`|:-------------|:---------|:-------------|:----------|:---------------|:----------|:----------|:------|\\n\`;
    for (const c of carItems) {
      const cost = Math.round((c.actual_cost_minor || c.estimated_cost_minor) / 100);
      const targetKm = c.next_reminder_mileage_km ? \`\${c.next_reminder_mileage_km.toLocaleString()} km\` : '—';
      const remKm = c.next_reminder_mileage_km && c.current_odometer_km
        ? (c.next_reminder_mileage_km - c.current_odometer_km)
        : null;
      const remStr = remKm !== null ? (remKm <= 0 ? '**DUE NOW**' : \`\${remKm.toLocaleString()} km\`) : '—';
      md += \`| \${c.name} | \${c.priority || 'medium'} | \${c.last_service_date || '—'} | \${cost.toLocaleString()} DA | \${targetKm} | \${remStr} | \${c.next_reminder_date || '—'} | \${c.notes || '—'} |\\n\`;
    }
    md += \`\\n\`;
  }

  md += \`## 2. Personal Care & Grooming Cycles\\n\\n\`;
  if (personalItems.length === 0) {
    md += \`*No personal care items configured.*\\n\\n\`;
  } else {
    md += \`| Care Item | Frequency | Cost (DA) | Last Done | Next Due | Notes |\\n\`;
    md += \`|:----------|:----------|:----------|:----------|:---------|:------|\\n\`;
    for (const p of personalItems) {
      const cost = Math.round((p.actual_cost_minor || p.estimated_cost_minor) / 100);
      const freq = \`Every \${p.recurrence_interval || 10} \${p.recurrence_type}\`;
      md += \`| \${p.name} | \${freq} | \${cost.toLocaleString()} DA | \${p.last_service_date || '—'} | \${p.next_reminder_date || '—'} | \${p.notes || '—'} |\\n\`;
    }
    md += \`\\n\`;
  }

  md += \`## 3. Recurring Shopping & Upkeep Items\\n\\n\`;
  if (shoppingItems.length === 0) {
    md += \`*No shopping items configured.*\\n\\n\`;
  } else {
    md += \`| Item | Est. Cost (DA) | Status | Notes |\\n\`;
    md += \`|:-----|:---------------|:-------|:------|\\n\`;
    for (const s of shoppingItems) {
      const cost = Math.round(s.estimated_cost_minor / 100);
      const status = s.is_purchased ? 'Purchased' : 'Pending';
      md += \`| \${s.name} | \${cost.toLocaleString()} DA | \${status} | \${s.notes || '—'} |\\n\`;
    }
    md += \`\\n\`;
  }

  return md;
}
`;

code = code.trim() + '\n' + newFunctions;
fs.writeFileSync(filePath, code, 'utf8');
console.log('Appended maintenance functions to maintenanceService.ts');
