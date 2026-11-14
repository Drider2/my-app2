const fs = require('fs');
let code = fs.readFileSync('src/screens/DashboardScreen.tsx', 'utf8');

// 1. Add import
if (!code.includes('HabitsConsistencyCard')) {
  code = code.replace(
    "import { HydrationCard } from '../components/dashboard/HydrationCard';",
    "import { HydrationCard } from '../components/dashboard/HydrationCard';\nimport { HabitsConsistencyCard } from '../components/dashboard/HabitsConsistencyCard';"
  );
}

// 2. Render HabitsConsistencyCard right after HydrationCard
const hydrationCardClose = `        <HydrationCard
          onRefresh={onRefresh}
          onToast={(msg) => triggerToast(msg)}
        />
      )}`;

const replacement = `        <HydrationCard
          onRefresh={onRefresh}
          onToast={(msg) => triggerToast(msg)}
        />
      )}

      {/* Daily Habits Consistency Matrix */}
      {!isEditMode && (
        <HabitsConsistencyCard
          habits={state.habits || []}
          habitEntries={state.habitEntries || []}
          today={today}
          onRefresh={onRefresh}
        />
      )}`;

if (code.includes(hydrationCardClose)) {
  code = code.replace(hydrationCardClose, replacement);
  console.log('Successfully inserted HabitsConsistencyCard after HydrationCard!');
} else {
  // Try normalized replacement
  const idx = code.indexOf('<HydrationCard');
  if (idx !== -1) {
    const endIdx = code.indexOf(')}', idx);
    if (endIdx !== -1) {
      const insertAt = endIdx + 2;
      const snippet = `\n\n      {/* Daily Habits Consistency Matrix */}\n      {!isEditMode && (\n        <HabitsConsistencyCard\n          habits={state.habits || []}\n          habitEntries={state.habitEntries || []}\n          today={today}\n          onRefresh={onRefresh}\n        />\n      )}`;
      code = code.slice(0, insertAt) + snippet + code.slice(insertAt);
      console.log('Successfully inserted via index!');
    }
  }
}

fs.writeFileSync('src/screens/DashboardScreen.tsx', code, 'utf8');
console.log('DashboardScreen.tsx updated.');
