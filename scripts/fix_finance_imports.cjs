const fs = require('fs');
let code = fs.readFileSync('src/screens/FinanceScreen.tsx', 'utf8');

// 1. Add Coins to lucide-react
code = code.replace(
  'Calculator\n} from \'lucide-react\';',
  'Calculator,\n  Coins\n} from \'lucide-react\';'
);

// 2. Add CurrencyConverterModal to ../components/finance
code = code.replace(
  'AffordabilityCalculatorModal,\n} from \'../components/finance\';',
  'AffordabilityCalculatorModal,\n  CurrencyConverterModal,\n} from \'../components/finance\';'
);

fs.writeFileSync('src/screens/FinanceScreen.tsx', code, 'utf8');
console.log('Fixed imports in FinanceScreen.tsx');
