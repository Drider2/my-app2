const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'screens', 'WeeklyReviewScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetFunc = `  const handleExportWeeklyReport = () => {
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

const replacementFunc = `  const handleExportWeeklyReport = () => {
    const currency = state.settings.currency_label || 'DA';
    const lines = [
      \`# 📊 Weekly Review Report — \${metrics.label}\`,
      \`Period: \${metrics.startDate} to \${metrics.endDate} (\${metrics.weekId})\`,
      \`Generated: \${getTodayLocalDate()}\`,
      '',
      '## 💰 Financial Discipline & Runway',
      \`- Total Expense: \${formatCurrency(metrics.finance.totalExpenseMinor, currency)}\`,
      \`- Total Income: \${formatCurrency(metrics.finance.totalIncomeMinor, currency)}\`,
      \`- Savings Deposited: \${formatCurrency(metrics.finance.savingsDepositedMinor, currency)}\`,
      \`- Money Lent: \${formatCurrency(metrics.finance.moneyLentMinor, currency)}\`,
      comparison ? \`- Delta vs Prior Week: \${comparison.spendingDeltaPercent > 0 ? '+' : ''}\${comparison.spendingDeltaPercent.toFixed(1)}%\` : '',
      '',
      '## 🏋️ Physical Training & Body',
      \`- Completed Workouts: \${metrics.fitness.workoutCount} session(s)\`,
      \`- Total Volume: \${metrics.fitness.totalVolumeKg.toLocaleString()} kg\`,
      metrics.fitness.avgBodyweightKg ? \`- Average Bodyweight: \${metrics.fitness.avgBodyweightKg.toFixed(1)} kg\` : '',
      metrics.fitness.bodyweightChangeKg !== null ? \`- Weekly Weight Delta: \${metrics.fitness.bodyweightChangeKg > 0 ? '+' : ''}\${metrics.fitness.bodyweightChangeKg.toFixed(1)} kg\` : '',
      '',
      '## 🕌 Prayers & Spiritual Discipline',
      \`- Obligatory Prayers Completed: \${metrics.prayers.completedCount} of \${metrics.prayers.totalPossible} (\${metrics.prayers.completionPercentage.toFixed(0)}%)\`,
      '',
      '## 📋 Tasks & Execution',
      \`- Tasks Completed: \${metrics.tasks.completedCount} of \${metrics.tasks.totalCreated} (\${metrics.tasks.completionRate.toFixed(0)}%)\`,
      metrics.tasks.overdueCount > 0 ? \`- Overdue Tasks: \${metrics.tasks.overdueCount}\` : '',
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

content = content.replace(targetFunc, replacementFunc);
fs.writeFileSync(file, content, 'utf8');
console.log('WeeklyReviewScreen updated with exact type mappings!');
