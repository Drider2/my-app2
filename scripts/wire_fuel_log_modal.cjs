const fs = require('fs');
let code = fs.readFileSync('src/screens/MaintenanceScreen.tsx', 'utf8');

// 1. Add Fuel to lucide-react imports if not present
if (!code.includes('Fuel,')) {
  code = code.replace(
    'FileText,',
    'FileText,\n  Fuel,'
  );
}

// 2. Add FuelLogModal to imports
if (!code.includes('FuelLogModal')) {
  code = code.replace(
    'UpdateOdometerModal } from \'../components/maintenance\';',
    'UpdateOdometerModal,\n  FuelLogModal } from \'../components/maintenance\';'
  );
}

// 3. Add state
if (!code.includes('isFuelModalOpen')) {
  code = code.replace(
    'const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);',
    'const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);\n  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);'
  );
}

// 4. Add header button right before or after Odometer button
const odoBtnMarker = `<button
              type="button"
              onClick={() => setIsOdometerModalOpen(true)}
              className="w-10 h-10 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-cyan-400 hover:border-cyan-500/40 transition-all tap-feedback shrink-0 shadow-sm"
              title="Quick Update Car Odometer"
              aria-label="Update Odometer"
            >
              <Gauge className="w-4 h-4 text-cyan-400" />
            </button>`;

const fuelBtn = `            <button
              type="button"
              onClick={() => setIsFuelModalOpen(true)}
              className="w-10 h-10 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-amber-400 hover:border-amber-500/40 transition-all tap-feedback shrink-0 shadow-sm"
              title="Fuel Fill-up Log & Mileage Efficiency"
              aria-label="Fuel Log"
            >
              <Fuel className="w-4 h-4 text-amber-400" />
            </button>\n\n            ` + odoBtnMarker;

if (code.includes(odoBtnMarker)) {
  code = code.replace(odoBtnMarker, fuelBtn);
  console.log('Inserted Fuel Log button into Maintenance header!');
} else {
  console.log('odoBtnMarker not found');
}

// 5. Render FuelLogModal at bottom near UpdateOdometerModal
const odoModalMarker = '<UpdateOdometerModal';
const idx = code.indexOf(odoModalMarker);
if (idx !== -1) {
  const closeIdx = code.indexOf('/>', idx);
  if (closeIdx !== -1) {
    const insertAt = closeIdx + 2;
    const modalSnippet = `\n\n      {/* Fuel Fill-Up & Efficiency Modal */}\n      <FuelLogModal\n        isOpen={isFuelModalOpen}\n        onClose={() => setIsFuelModalOpen(false)}\n        onRefresh={onRefresh}\n        onToast={triggerToast}\n        currentCarOdometer={carOdometer}\n        currencyLabel={state.settings.currency_label || 'DA'}\n      />`;
    code = code.slice(0, insertAt) + modalSnippet + code.slice(insertAt);
    console.log('Inserted FuelLogModal at bottom!');
  }
}

fs.writeFileSync('src/screens/MaintenanceScreen.tsx', code, 'utf8');
console.log('MaintenanceScreen.tsx updated with FuelLogModal.');
