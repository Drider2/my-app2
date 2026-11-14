const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
code = code.replace(
  "import { useLayout } from './hooks/useLayout';",
  "import { useLayout } from './hooks/useLayout';\r\nimport { Page } from './components/layout/Page';"
);

// Fallback LF
code = code.replace(
  "import { useLayout } from './hooks/useLayout';\n",
  "import { useLayout } from './hooks/useLayout';\nimport { Page } from './components/layout/Page';\n"
);

// Replace main with Page
const oldMain = `      {/* Main Responsive Screen Canvas */}
      <main className="relative z-[1] flex-1 w-full ms-[var(--nav-w)] transition-all duration-150 overflow-y-auto no-scrollbar pb-[var(--nav-total-clearance)] tablet:pb-8">
        <div key={currentScreen} className="w-full h-full animate-enter">
          <Suspense fallback={<ScreenSkeleton />}>
            {renderActiveScreen()}
          </Suspense>
        </div>
      </main>`;

const newMain = `      {/* Main Responsive Screen Canvas */}
      <main className="relative z-[1] flex-1 w-full ms-[var(--nav-w)] transition-all duration-150 overflow-y-auto no-scrollbar">
        <Page key={currentScreen} className="animate-enter min-h-full">
          <Suspense fallback={<ScreenSkeleton />}>
            {renderActiveScreen()}
          </Suspense>
        </Page>
      </main>`;

const normOld = oldMain.replace(/\r\n/g, '\n');
const normNew = newMain.replace(/\r\n/g, '\n');
const normCode = code.replace(/\r\n/g, '\n');

if (normCode.includes(normOld)) {
  const updated = normCode.replace(normOld, normNew);
  fs.writeFileSync('src/App.tsx', updated, 'utf8');
  console.log('Successfully updated App.tsx with <Page>');
} else {
  console.error('Target main not found in App.tsx');
}
