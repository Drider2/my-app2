const fs = require('fs');
const filePath = 'src/components/AddActionSheet.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');

// 1. Add Droplet & Calculator to Lucide imports
code = code.replace(
  /LineChart\s*\r?\n\s*\}\s*from\s*'lucide-react';/,
  "LineChart,\n  Droplet,\n  Calculator\n} from 'lucide-react';"
);

// 2. Import HydrationService
code = code.replace(
  "import { FinanceService } from '../services/financeService';",
  "import { FinanceService } from '../services/financeService';\nimport { HydrationService } from '../services/hydrationService';"
);

// 3. Add log_hydration under daily actions
const oldDailyActions = normalize(`        {
          id: 'add_task',
          label: 'Add Task',
          desc: 'Create to-do item for today',
          icon: CheckSquare,
          handler: () => setActiveModal('add_task'),
        },`);

const newDailyActions = normalize(`        {
          id: 'log_hydration',
          label: 'Log Water Intake (+250ml)',
          desc: 'Quick glass of water for daily hydration',
          icon: Droplet,
          handler: () => {
            HydrationService.addWater(250);
            Haptics.success();
            onClose();
            if (onQuickAction) onQuickAction('hydration_logged');
          },
        },
        {
          id: 'add_task',
          label: 'Add Task',
          desc: 'Create to-do item for today',
          icon: CheckSquare,
          handler: () => setActiveModal('add_task'),
        },`);

if (normalize(code).includes(oldDailyActions)) {
  code = normalize(code).replace(oldDailyActions, newDailyActions);
  console.log('Daily hydration added to AddActionSheet');
} else {
  console.error('Could not find oldDailyActions in AddActionSheet!');
}

// 4. Add check_affordability under money actions
const oldMoneyActions = normalize(`        {
          id: 'custom_expense',
          label: 'Add Custom Expense',
          desc: 'Record exact name, amount & category',
          icon: TrendingDown,
          handler: () => setActiveModal('custom_expense'),
        },`);

const newMoneyActions = normalize(`        {
          id: 'check_affordability',
          label: 'Can I Afford This?',
          desc: 'Simulate purchase impact on monthly runway',
          icon: Calculator,
          handler: () => {
            onClose();
            onNavigate('finance');
          },
        },
        {
          id: 'custom_expense',
          label: 'Add Custom Expense',
          desc: 'Record exact name, amount & category',
          icon: TrendingDown,
          handler: () => setActiveModal('custom_expense'),
        },`);

if (normalize(code).includes(oldMoneyActions)) {
  code = normalize(code).replace(oldMoneyActions, newMoneyActions);
  console.log('Affordability simulator added to AddActionSheet');
} else {
  console.error('Could not find oldMoneyActions in AddActionSheet!');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('AddActionSheet.tsx updated successfully');
