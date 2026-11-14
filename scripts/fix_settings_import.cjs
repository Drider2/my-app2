const fs = require('fs');
let code = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');

code = code.replace(
  "localStorage.setItem('greendream_v1_3_storage', JSON.stringify(pendingBackupData));\n      db.saveState(pendingBackupData);",
  "db.importState(pendingBackupData);"
);

fs.writeFileSync('src/screens/SettingsScreen.tsx', code, 'utf8');
console.log('Fixed db.importState in SettingsScreen.tsx');
