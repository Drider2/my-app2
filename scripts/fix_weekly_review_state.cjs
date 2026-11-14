const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'screens', 'WeeklyReviewScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add const state = db.getState();
content = content.replace(
  'export const WeeklyReviewScreen: React.FC<WeeklyReviewScreenProps> = ({ onBack, onRefresh }) => {',
  'export const WeeklyReviewScreen: React.FC<WeeklyReviewScreenProps> = ({ onBack, onRefresh }) => {\n  const state = db.getState();'
);

// 2. Fix comparison delta display
content = content.replace(
  'comparison ? `- Delta vs Prior Week: ${comparison.spendingDeltaPercent > 0 ? \'+\' : \'\'}${comparison.spendingDeltaPercent.toFixed(1)}%` : \'\',',
  'comparison ? `- Delta vs Prior Week: ${formatCurrency(comparison.totalExpenseDeltaMinor, currency)}` : \'\','
);

fs.writeFileSync(file, content, 'utf8');
console.log('WeeklyReviewScreen state and comparison delta fixed!');
