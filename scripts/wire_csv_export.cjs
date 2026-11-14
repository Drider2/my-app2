const fs = require('fs');
let content = fs.readFileSync('src/screens/FinanceScreen.tsx', 'utf8');

// 1. Add Download to imports
content = content.replace('Search\n} from \'lucide-react\';', 'Search,\n  Download\n} from \'lucide-react\';');
content = content.replace('Search\r\n} from \'lucide-react\';', 'Search,\r\n  Download\r\n} from \'lucide-react\';');

// 2. Add handleExportCSV function
const exportFuncCode = `
  const handleExportCSV = () => {
    const allTx = state.transactions.filter(t => !t.deleted_at);
    if (allTx.length === 0) {
      triggerToast('No transactions to export');
      return;
    }
    const headers = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Currency', 'Notes'];
    const rows = allTx.map(t => {
      const cat = state.categories.find(c => c.id === t.category_id)?.name || 'General';
      const amountMajor = (t.amount_minor / 100).toFixed(2);
      const cleanNote = (t.note || '').replace(/"/g, '""');
      return [
        t.id,
        t.local_date,
        t.type,
        \`"\${cat}"\`,
        amountMajor,
        state.settings.currency_label || 'DA',
        \`"\${cleanNote}"\`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`greendream_transactions_\${today}.csv\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(\`✓ Exported \${allTx.length} transactions to CSV\`);
  };
`;

content = content.replace(
  'const triggerToast = (msg: string) => {',
  exportFuncCode + '\n  const triggerToast = (msg: string) => {'
);

// 3. Find unique sub-filter block
const uniqueSubFilterPattern = `{(['all', 'expense', 'income', 'transfer', 'loans'] as const).map(f => (`;

if (content.includes(uniqueSubFilterPattern)) {
  const mapIdx = content.indexOf(uniqueSubFilterPattern);
  const containerStart = content.lastIndexOf('<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">', mapIdx);
  const containerEnd = content.indexOf('</div>', mapIdx + 300);

  const before = content.slice(0, containerStart);
  const after = content.slice(containerEnd + 6);

  const replacement = `<div className="flex items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(['all', 'expense', 'income', 'transfer', 'loans'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      triggerHaptic('light');
                      setTxFilter(f);
                    }}
                    className={\`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all tap-feedback min-h-[36px] \${
                      txFilter === f
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-bold shadow-sm'
                        : 'bg-[var(--surface)] text-[var(--text-2)] border border-[var(--hairline)] hover:text-[var(--text-1)]'
                    }\`}
                  >
                    {f === 'all' ? t('common.all', 'All') : f}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text-2)] hover:text-cyan-400 border border-[var(--hairline)] hover:border-cyan-500/30 flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                title="Export transactions to CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Export</span>
                <span>CSV</span>
              </button>
            </div>`;

  content = before + replacement + after;
  console.log('Found and replaced sub-filter block precisely');
} else {
  console.log('uniqueSubFilterPattern not found');
}

fs.writeFileSync('src/screens/FinanceScreen.tsx', content, 'utf8');
console.log('Successfully wired CSV Export into FinanceScreen.tsx');
