const fs = require('fs');

// 1. Fix EveningReflectionModal.tsx
let evCode = fs.readFileSync('src/components/journal/EveningReflectionModal.tsx', 'utf8');
evCode = evCode.replace(
  'mood,\n        created_at:',
  'mood,\n        tags: [\'evening_reflection\', \'gratitude\'],\n        created_at:'
);
fs.writeFileSync('src/components/journal/EveningReflectionModal.tsx', evCode, 'utf8');
console.log('1. Fixed tags in EveningReflectionModal.tsx');

// 2. Fix FuelLogModal.tsx
let fuelCode = fs.readFileSync('src/components/maintenance/FuelLogModal.tsx', 'utf8');
fuelCode = fuelCode.replace(
  'currentCarOdometer: number;',
  'currentCarOdometer?: number;'
);
fuelCode = fuelCode.replace(
  'const [odometerKm, setOdometerKm] = useState<number>(currentCarOdometer || 142500);',
  'const computedOdo = currentCarOdometer || (state.maintenanceItems || []).filter(i => i.category === \'car_maintenance\' && !i.deleted_at).find(i => i.current_odometer_km)?.current_odometer_km || 142500;\n  const [odometerKm, setOdometerKm] = useState<number>(computedOdo);'
);
fuelCode = fuelCode.replace(
  'title: `Fuel Fill-up: ${stationName || \'Gas Station\'} (${l}L ${fuelType.toUpperCase()})`,\n          notes: `Vehicle Fuel: ${l}L at ${odometerKm.toLocaleString()} km`,',
  'note: `Fuel Fill-up: ${stationName || \'Gas Station\'} (${l}L ${fuelType.toUpperCase()}) @ ${odometerKm.toLocaleString()} km`,'
);
fs.writeFileSync('src/components/maintenance/FuelLogModal.tsx', fuelCode, 'utf8');
console.log('2. Fixed FuelLogModal.tsx transaction note and odo fallback');

// 3. Fix JournalScreen.tsx
let jCode = fs.readFileSync('src/screens/JournalScreen.tsx', 'utf8');
// Fix Moon import
jCode = jCode.replace(
  'Filter\n} from \'lucide-react\';',
  'Filter,\n  Moon\n} from \'lucide-react\';'
);
// Fix EveningReflectionModal import
if (!jCode.includes('import { EveningReflectionModal }')) {
  jCode = jCode.replace(
    'import { FlameLogo }',
    'import { EveningReflectionModal } from \'../components/journal/EveningReflectionModal\';\nimport { FlameLogo }'
  );
}
fs.writeFileSync('src/screens/JournalScreen.tsx', jCode, 'utf8');
console.log('3. Fixed JournalScreen.tsx imports');

// 4. Fix MaintenanceScreen.tsx
let mCode = fs.readFileSync('src/screens/MaintenanceScreen.tsx', 'utf8');
// Fix Fuel import
if (!mCode.includes('Fuel,')) {
  mCode = mCode.replace(
    'Download,',
    'Download,\n  Fuel,'
  );
}
// Fix FuelLogModal render without carOdometer
mCode = mCode.replace(
  'currentCarOdometer={carOdometer}',
  ''
);
fs.writeFileSync('src/screens/MaintenanceScreen.tsx', mCode, 'utf8');
console.log('4. Fixed MaintenanceScreen.tsx imports and props');
