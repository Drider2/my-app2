const fs = require('fs');
const filePath = 'src/screens/DashboardScreen.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');

// 1. Import HydrationCard
code = code.replace(
  "import { PresetSelectorModal } from '../components/dashboard/PresetSelectorModal';",
  "import { PresetSelectorModal } from '../components/dashboard/PresetSelectorModal';\nimport { HydrationCard } from '../components/dashboard/HydrationCard';"
);

// 2. Add HydrationCard before the grid
const oldGridMarker = normalize(`      {/* ======================================================== */}
      {/* RESPONSIVE MULTI-COLUMN DASHBOARD GRID                   */}
      {/* ======================================================== */}`);

const newGridMarker = normalize(`      {/* Daily Hydration Tracker */}
      {!isEditMode && (
        <HydrationCard
          onRefresh={onRefresh}
          onToast={(msg) => triggerToast(msg)}
        />
      )}

      {/* ======================================================== */}
      {/* RESPONSIVE MULTI-COLUMN DASHBOARD GRID                   */}
      {/* ======================================================== */}`);

if (normalize(code).includes(oldGridMarker)) {
  code = normalize(code).replace(oldGridMarker, newGridMarker);
  console.log('HydrationCard added before dashboard grid!');
} else {
  console.error('Could not find oldGridMarker in DashboardScreen!');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('DashboardScreen.tsx updated successfully');
