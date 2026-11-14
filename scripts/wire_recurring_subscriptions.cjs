const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'screens', 'FinanceScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// Normalize line endings to LF for consistent matching
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Add RecurringSubscriptionsModal import
if (!content.includes('RecurringSubscriptionsModal')) {
  content = content.replace(
    'DailyLimitCalendarCard,',
    'DailyLimitCalendarCard,\n  RecurringSubscriptionsModal,'
  );
}

// 2. Add isRecurringModalOpen state
if (!content.includes('isRecurringModalOpen')) {
  content = content.replace(
    'const [toastMessage, setToastMessage] = useState<string | null>(null);',
    'const [toastMessage, setToastMessage] = useState<string | null>(null);\n  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);'
  );
}

// 3. Add top header button
const targetHeader = `<Sliders className="w-4 h-4" />
            </button>`;

const replacementHeader = `<Sliders className="w-4 h-4" />
            </button>

            {/* Subscriptions / Recurring Bills */}
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] flex items-center justify-center text-[var(--text-2)] hover:text-cyan-400 hover:border-cyan-500/40 transition-all tap-feedback"
              aria-label="Recurring Subscriptions & Bills"
              title="Recurring Subscriptions & Bills"
            >
              <RotateCcw className="w-4 h-4" />
            </button>`;

if (content.includes(targetHeader) && !content.includes('Recurring Subscriptions & Bills')) {
  content = content.replace(targetHeader, replacementHeader);
}

// 4. Add Ledger sub-filter button
const targetCsvBtn = `<button
                type="button"
                onClick={handleExportCSV}`;

const replacementCsvBtn = `<div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text-2)] hover:text-cyan-400 border border-[var(--hairline)] hover:border-cyan-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Manage Subscriptions & Recurring Bills"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Bills &</span>
                  <span>Subscriptions</span>
                </button>
                <button
                type="button"
                onClick={handleExportCSV}`;

if (content.includes(targetCsvBtn) && !content.includes('title="Manage Subscriptions & Recurring Bills"')) {
  content = content.replace(targetCsvBtn, replacementCsvBtn);
  content = content.replace(
    '<span>CSV</span>\n              </button>\n            </div>',
    '<span>CSV</span>\n                </button>\n              </div>\n            </div>'
  );
}

// 5. Render modal before last </div>
const lastClosing = '    </div>\n  );\n};';
const replacementModal = `      {/* Recurring Subscriptions & Bills Modal */}
      <RecurringSubscriptionsModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onRefresh={onRefresh}
        onShowToast={triggerToast}
      />
    </div>
  );
};`;

if (content.includes(lastClosing) && !content.includes('<RecurringSubscriptionsModal')) {
  content = content.replace(lastClosing, replacementModal);
}

// Restore line endings if needed
if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(file, content, 'utf8');
console.log('FinanceScreen successfully wired with RecurringSubscriptionsModal!');
