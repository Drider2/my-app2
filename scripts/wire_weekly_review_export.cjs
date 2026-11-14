const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'screens', 'WeeklyReviewScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Download icon to imports
content = content.replace(
  'ListTodo\n} from \'lucide-react\';',
  'ListTodo,\n  Download\n} from \'lucide-react\';'
);

// 2. Add handleExportWeeklyReport method
const targetMethodAnchor = '  const dayLabels = [\'Sun\', \'Mon\', \'Tue\', \'Wed\', \'Thu\', \'Fri\', \'Sat\'];';

const replacementMethod = `  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleExportWeeklyReport = () => {
    const currency = state.settings.currency_label || 'DA';
    const lines = [
      \`# 📊 Weekly Review Report — \${metrics.label}\`,
      \`Period: \${metrics.startDate} to \${metrics.endDate} (\${metrics.weekId})\`,
      \`Generated: \${getTodayLocalDate()}\`,
      '',
      '## 💰 Financial Discipline & Runway',
      \`- Total Spent: \${formatCurrency(metrics.money.totalSpentMinor, currency)}\`,
      \`- Total Income: \${formatCurrency(metrics.money.totalIncomeMinor, currency)}\`,
      \`- Net Flow: \${formatCurrency(metrics.money.netSavingsMinor, currency)}\`,
      \`- Transactions Logged: \${metrics.money.transactionCount}\`,
      comparison ? \`- Delta vs Prior Week: \${comparison.spendingDeltaPercent > 0 ? '+' : ''}\${comparison.spendingDeltaPercent.toFixed(1)}%\` : '',
      '',
      '## 🏋️ Physical Training & Body',
      \`- Completed Workouts: \${metrics.gym.completedWorkouts} session(s)\`,
      \`- Volume Lifted: \${metrics.gym.totalVolumeKg.toLocaleString()} kg\`,
      metrics.gym.averageBodyweightKg ? \`- Average Bodyweight: \${metrics.gym.averageBodyweightKg.toFixed(1)} kg\` : '',
      '',
      '## 🕌 Prayers & Spiritual Discipline',
      \`- Obligatory Prayers Completed: \${metrics.prayers.completedPrayers} of \${metrics.prayers.totalPossiblePrayers} (\${metrics.prayers.completionRate.toFixed(0)}%)\`,
      \`- Perfect 5/5 Days: \${metrics.prayers.fullDaysCount}\`,
      '',
      '## 📝 Executive Reflections',
      '### What Went Well:',
      whatWentWell.trim() || '*(No reflection entered)*',
      '',
      '### What to Improve:',
      whatToImprove.trim() || '*(No notes entered)*',
      '',
      '### Top Priority:',
      topPriority.trim() || '*(None specified)*',
      '',
      '## 🎯 Next Week Strategy & Target Days',
      \`- Scheduled Workout Days: \${selectedWorkoutDays.map(d => dayLabels[d]).join(', ') || 'None'}\`,
      \`- Priority 1: \${planPriorities[0] || '—'}\`,
      \`- Priority 2: \${planPriorities[1] || '—'}\`,
      \`- Priority 3: \${planPriorities[2] || '—'}\`,
      '',
      '---',
      '*Exported from GreenDream Personal Intelligence Desk*'
    ].filter(Boolean);

    const blob = new Blob([lines.join('\\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`weekly_review_\${metrics.weekId}.md\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(\`✓ Exported \${metrics.weekId} report to Markdown\`);
  };`;

content = content.replace(targetMethodAnchor, replacementMethod);

// 3. Update actionsRight in ModuleEditHeader
const targetActionsRight = `          actionsRight={
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-semibold flex items-center gap-1 min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>Back</span>
            </button>
          }`;

const replacementActionsRight = `          actionsRight={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportWeeklyReport}
                className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-cyan-500/40 text-[var(--color-text-secondary)] hover:text-cyan-400 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] transition-colors tap-feedback"
                title="Export weekly summary report to Markdown"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Export</span>
                <span>.MD</span>
              </button>
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-semibold flex items-center gap-1 min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>Back</span>
              </button>
            </div>
          }`;

content = content.replace(targetActionsRight, replacementActionsRight);

fs.writeFileSync(file, content, 'utf8');
console.log('WeeklyReviewScreen updated with handleExportWeeklyReport and Export .MD button!');
