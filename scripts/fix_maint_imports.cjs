const fs = require('fs');
const filePath = 'src/screens/MaintenanceScreen.tsx';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  /Trash2\s*\r?\n\s*\}\s*from\s*'lucide-react';/,
  "Trash2,\n  Download,\n  FileText\n} from 'lucide-react';"
);

code = code.replace(
  /deleteMaintenanceItem\s*\r?\n\s*\}\s*from\s*'\.\.\/services\/maintenanceService';/,
  "deleteMaintenanceItem,\n  updateCarOdometer,\n  exportMaintenanceHistoryCsv,\n  exportMaintenanceHistoryMd\n} from '../services/maintenanceService';"
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Fixed imports in MaintenanceScreen.tsx');
