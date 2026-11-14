const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Import
code = code.replace(
  "import { Page } from './components/layout/Page';",
  "import { Page } from './components/layout/Page';\r\nimport { SaveFeedbackBadge } from './components/layout/SaveFeedbackBadge';"
);

// Fallback LF
code = code.replace(
  "import { Page } from './components/layout/Page';\n",
  "import { Page } from './components/layout/Page';\nimport { SaveFeedbackBadge } from './components/layout/SaveFeedbackBadge';\n"
);

// 2. Render
const targetSpacer = '{/* Android Status Bar Safe Area Top Spacer */}\r\n      <div className="w-full pt-[env(safe-area-inset-top)]" />';
const targetSpacerLF = '{/* Android Status Bar Safe Area Top Spacer */}\n      <div className="w-full pt-[env(safe-area-inset-top)]" />';

const newSpacer = `{/* Android Status Bar Safe Area Top Spacer */}
      <div className="w-full pt-[env(safe-area-inset-top)]" />

      {/* Visible Save / Cloud Sync Feedback Badge */}
      <SaveFeedbackBadge />`;

if (code.includes(targetSpacer)) {
  code = code.replace(targetSpacer, newSpacer.replace(/\n/g, '\r\n'));
} else if (code.includes(targetSpacerLF)) {
  code = code.replace(targetSpacerLF, newSpacer);
} else {
  console.error('Target spacer not found in App.tsx');
}

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log('Successfully added SaveFeedbackBadge to App.tsx');
