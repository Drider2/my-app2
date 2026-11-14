const fs = require('fs');
const filePath = 'src/screens/FinanceScreen.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');

// 1. Add Calculator to Lucide imports
code = code.replace(
  /Download\s*\r?\n\s*\}\s*from\s*'lucide-react';/,
  "Download,\n  Calculator\n} from 'lucide-react';"
);

// 2. Add AffordabilityCalculatorModal to components/finance
code = code.replace(
  /RecurringSubscriptionsModal,\s*\r?\n\s*\}\s*from\s*'\.\.\/components\/finance';/,
  "RecurringSubscriptionsModal,\n  AffordabilityCalculatorModal,\n} from '../components/finance';"
);

// 3. Add state isAffordabilityModalOpen
code = code.replace(
  "  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);",
  "  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);\n  const [isAffordabilityModalOpen, setIsAffordabilityModalOpen] = useState(false);"
);

// 4. Add header button
const oldRecurringBtn = normalize(`            {/* Subscriptions / Recurring Bills */}
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-cyan-400 hover:border-cyan-500/40 transition-all tap-feedback"
              aria-label="Recurring Subscriptions & Bills"
              title="Recurring Subscriptions & Bills"
            >
              <RotateCcw className="w-4 h-4" />
            </button>`);

const newRecurringBtn = normalize(`            {/* Subscriptions / Recurring Bills */}
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-cyan-400 hover:border-cyan-500/40 transition-all tap-feedback"
              aria-label="Recurring Subscriptions & Bills"
              title="Recurring Subscriptions & Bills"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Can I Afford It? Quick Purchase Simulator */}
            <button
              type="button"
              onClick={() => setIsAffordabilityModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-cyan-400 hover:border-cyan-500/40 transition-all tap-feedback shadow-sm"
              aria-label="Affordability Simulator"
              title="Can I Afford It? Purchase Simulator"
            >
              <Calculator className="w-4 h-4 text-cyan-400" />
            </button>`);

if (normalize(code).includes(oldRecurringBtn)) {
  code = normalize(code).replace(oldRecurringBtn, newRecurringBtn);
  console.log('Header button added successfully');
} else {
  console.error('Could not find oldRecurringBtn in FinanceScreen!');
}

// 5. Add modal to JSX bottom
const oldModalEnd = normalize(`      {/* Recurring Subscriptions & Bills Modal */}
      <RecurringSubscriptionsModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />
    </div>`);

const newModalEnd = normalize(`      {/* Recurring Subscriptions & Bills Modal */}
      <RecurringSubscriptionsModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />

      {/* Quick Purchase Affordability Simulator Modal */}
      <AffordabilityCalculatorModal
        isOpen={isAffordabilityModalOpen}
        onClose={() => setIsAffordabilityModalOpen(false)}
        onRecordExpense={(name, amount) => {
          setExpenseNote(name);
          setExpenseAmount(String(amount));
          setIsAddExpenseOpen(true);
        }}
      />
    </div>`);

if (normalize(code).includes(oldModalEnd)) {
  code = normalize(code).replace(oldModalEnd, newModalEnd);
  console.log('Affordability modal added to JSX bottom');
} else {
  console.error('Could not find oldModalEnd in FinanceScreen!');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('FinanceScreen.tsx updated successfully');
