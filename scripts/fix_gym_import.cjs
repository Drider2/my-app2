const fs = require('fs');
const filePath = 'src/screens/GymScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(
  /OneRepMaxModal\s*\r?\n\s*\}\s*from\s*'\.\.\/components\/gym';/,
  "OneRepMaxModal,\n  RestTimerModal\n} from '../components/gym';"
);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed GymScreen import');
