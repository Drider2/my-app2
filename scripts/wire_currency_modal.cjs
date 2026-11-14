const fs = require('fs');
let code = fs.readFileSync('src/screens/FinanceScreen.tsx', 'utf8');

// 1. Add import
if (!code.includes('CurrencyConverterModal')) {
  code = code.replace(
    "import { RecurringSubscriptionsModal } from '../components/finance/RecurringSubscriptionsModal';",
    "import { RecurringSubscriptionsModal } from '../components/finance/RecurringSubscriptionsModal';\nimport { CurrencyConverterModal } from '../components/finance/CurrencyConverterModal';"
  );
}

// 2. Add state
if (!code.includes('isCurrencyModalOpen')) {
  code = code.replace(
    'const [isAffordabilityModalOpen, setIsAffordabilityModalOpen] = useState(false);',
    'const [isAffordabilityModalOpen, setIsAffordabilityModalOpen] = useState(false);\n  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);'
  );
}

// 3. Add header button right after Affordability button
const affordBtnEnd = `              title="Can I Afford It? Purchase Simulator"
            >
              <Calculator className="w-4 h-4 text-cyan-400" />
            </button>`;

const currencyBtn = `              title="Can I Afford It? Purchase Simulator"
            >
              <Calculator className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Currency & FX Converter */}
            <button
              type="button"
              onClick={() => setIsCurrencyModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-emerald-400 hover:border-emerald-500/40 transition-all tap-feedback shadow-sm"
              aria-label="Currency Converter"
              title="Currency & FX Converter"
            >
              <Coins className="w-4 h-4 text-emerald-400" />
            </button>`;

if (code.includes(affordBtnEnd)) {
  code = code.replace(affordBtnEnd, currencyBtn);
  console.log('Inserted currency button into header!');
} else {
  // Use index matching
  const idx = code.indexOf('aria-label="Affordability Simulator"');
  if (idx !== -1) {
    const btnClose = code.indexOf('</button>', idx);
    if (btnClose !== -1) {
      const insertAt = btnClose + 9;
      const btnSnippet = `\n\n            {/* Currency & FX Converter */}\n            <button\n              type="button"\n              onClick={() => setIsCurrencyModalOpen(true)}\n              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-emerald-400 hover:border-emerald-500/40 transition-all tap-feedback shadow-sm"\n              aria-label="Currency Converter"\n              title="Currency & FX Converter"\n            >\n              <Coins className="w-4 h-4 text-emerald-400" />\n            </button>`;
      code = code.slice(0, insertAt) + btnSnippet + code.slice(insertAt);
      console.log('Inserted currency button via index!');
    }
  }
}

// 4. Render CurrencyConverterModal at the bottom
const affordModalMarker = '<AffordabilityCalculatorModal';
const modalIdx = code.indexOf(affordModalMarker);
if (modalIdx !== -1) {
  const modalClose = code.indexOf('/>', modalIdx);
  if (modalClose !== -1) {
    const insertAt = modalClose + 2;
    const modalSnippet = `\n\n      {/* Currency & FX Converter Modal */}\n      <CurrencyConverterModal\n        isOpen={isCurrencyModalOpen}\n        onClose={() => setIsCurrencyModalOpen(false)}\n        onRefresh={onRefresh}\n        onToast={triggerToast}\n        currencyLabel={state.settings.currency_label || 'DA'}\n      />`;
    code = code.slice(0, insertAt) + modalSnippet + code.slice(insertAt);
    console.log('Inserted CurrencyConverterModal render!');
  }
}

fs.writeFileSync('src/screens/FinanceScreen.tsx', code, 'utf8');
console.log('FinanceScreen.tsx updated with CurrencyConverterModal.');
