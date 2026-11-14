const fs = require('fs');
let code = fs.readFileSync('src/services/storage.ts', 'utf8');

// 1. Add FuelLogEntry to imports
if (!code.includes('FuelLogEntry')) {
  code = code.replace(
    'MaintenanceItem,',
    'MaintenanceItem,\n  FuelLogEntry,'
  );
}

// 2. Add to StorageState
if (!code.includes('fuelLogs?:')) {
  code = code.replace(
    'dailyWaterTargetMl?: number;',
    'dailyWaterTargetMl?: number;\n  fuelLogs?: FuelLogEntry[];'
  );
}

// 3. Add to loadState() fallback
if (!code.includes('parsed.fuelLogs')) {
  code = code.replace(
    'if (parsed.hydrationLogs === undefined) {\n      parsed.hydrationLogs = {};\n    }',
    'if (parsed.hydrationLogs === undefined) {\n      parsed.hydrationLogs = {};\n    }\n    if (parsed.fuelLogs === undefined) {\n      parsed.fuelLogs = [];\n    }'
  );
}

// 4. Add to clean state
if (!code.includes('fuelLogs: [],')) {
  code = code.replace(
    'hydrationLogs: {},',
    'hydrationLogs: {},\n      fuelLogs: [],'
  );
}

fs.writeFileSync('src/services/storage.ts', code, 'utf8');
console.log('storage.ts updated with fuelLogs support.');
