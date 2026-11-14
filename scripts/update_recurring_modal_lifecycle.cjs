const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'components', 'finance', 'RecurringSubscriptionsModal.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const state = db.getState();',
  'const [localVersion, setLocalVersion] = useState(0);\n  const state = db.getState();'
);

content = content.replace(
  'onShowToast(`✓ Logged payment for "${rule.note || \'Subscription\'}" (${formatCurrency(rule.amount_minor, currency)}). Next due: ${nextDue}`);\n    onRefresh();',
  'onShowToast(`✓ Logged payment for "${rule.note || \'Subscription\'}" (${formatCurrency(rule.amount_minor, currency)}). Next due: ${nextDue}`);\n    setLocalVersion(v => v + 1);'
);

content = content.replace(
  'onShowToast(\'Subscription removed\');\n      onRefresh();',
  'onShowToast(\'Subscription removed\');\n      setLocalVersion(v => v + 1);'
);

content = content.replace(
  'onShowToast(`✓ Added recurring bill "${note.trim()}"`);\n    setIsAdding(false);\n    setNote(\'\');\n    setAmountMajor(\'\');\n    onRefresh();',
  'onShowToast(`✓ Added recurring bill "${note.trim()}"`);\n    setIsAdding(false);\n    setNote(\'\');\n    setAmountMajor(\'\');\n    setLocalVersion(v => v + 1);'
);

content = content.replace(
  'onClick={onClose}',
  'onClick={() => { onRefresh(); onClose(); }}'
);

fs.writeFileSync(file, content, 'utf8');
console.log('RecurringSubscriptionsModal updated with smooth localVersion lifecycle!');
