const fs = require('fs');
let code = fs.readFileSync('src/screens/MaintenanceScreen.tsx', 'utf8');

const target = 'title="Quick Update Car Odometer"';
const idx = code.indexOf(target);
if (idx !== -1) {
  // Find <button before target
  const btnStart = code.lastIndexOf('<button', idx);
  if (btnStart !== -1) {
    const fuelBtn = `<button
              type="button"
              onClick={() => setIsFuelModalOpen(true)}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-amber-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Fuel Fill-up Log & Mileage Efficiency"
              aria-label="Fuel Log"
            >
              <Fuel className="w-4 h-4 text-amber-400" />
            </button>\n            `;
    code = code.slice(0, btnStart) + fuelBtn + code.slice(btnStart);
    console.log('Inserted Fuel Log button!');
  }
}

fs.writeFileSync('src/screens/MaintenanceScreen.tsx', code, 'utf8');
