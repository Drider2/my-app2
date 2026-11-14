const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Imports
code = code.replace(
  "import { BottomNavigation, ScreenId } from './components/Navigation';\r\nimport { WebHeader } from './components/WebHeader';",
  "import { BottomNavigation, NavigationRail, ScreenId } from './components/Navigation';\r\nimport { useLayout } from './hooks/useLayout';"
);

// Fallback LF
code = code.replace(
  "import { BottomNavigation, ScreenId } from './components/Navigation';\nimport { WebHeader } from './components/WebHeader';",
  "import { BottomNavigation, NavigationRail, ScreenId } from './components/Navigation';\nimport { useLayout } from './hooks/useLayout';"
);

// 2. Component hook
const targetHook = "export function App() {";
const replacementHook = "export function App() {\r\n  useLayout();";
if (code.includes(targetHook) && !code.includes("useLayout();")) {
  code = code.replace(targetHook, replacementHook);
}

// 3. JSX replacement (removing WebHeader and setting ms-[var(--nav-w)])
const targetMainCRLF = `      {/* Web Header Navigation Bar (Tablet & Desktop) */}
      <WebHeader
        currentScreen={currentScreen}
        onSelectScreen={navigateScreen}
        onOpenAddSheet={() => setIsAddSheetOpen(true)}
        onOpenAiChat={() => setIsHermesOpen(true)}
      />

      {/* Main Responsive Screen Canvas */}
      <main className="relative z-[1] flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto no-scrollbar pb-28 md:pb-8">
        <div key={currentScreen} className="w-full h-full animate-enter">
          <Suspense fallback={<ScreenSkeleton />}>
            {renderActiveScreen()}
          </Suspense>
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNavigation
        currentScreen={currentScreen}
        onSelectScreen={navigateScreen}
        onOpenAddSheet={() => setIsAddSheetOpen(true)}
        hideFab={isHermesOpen || isHermesVoiceOpen || isAddSheetOpen || isOnboardingOpen}
      />`;

const replacementMain = `      {/* Tablet Left Navigation Rail (96px, with '+' button at top) */}
      <NavigationRail
        currentScreen={currentScreen}
        onSelectScreen={navigateScreen}
        onOpenAddSheet={() => setIsAddSheetOpen(true)}
        onOpenAiChat={() => setIsHermesOpen(true)}
      />

      {/* Main Responsive Screen Canvas */}
      <main className="relative z-[1] flex-1 w-full ms-[var(--nav-w)] transition-all duration-150 overflow-y-auto no-scrollbar pb-[var(--nav-total-clearance)] tablet:pb-8">
        <div key={currentScreen} className="w-full h-full animate-enter">
          <Suspense fallback={<ScreenSkeleton />}>
            {renderActiveScreen()}
          </Suspense>
        </div>
      </main>

      {/* Phone & Wide Floating Bottom Navigation */}
      <BottomNavigation
        currentScreen={currentScreen}
        onSelectScreen={navigateScreen}
        onOpenAddSheet={() => setIsAddSheetOpen(true)}
        hideFab={isHermesOpen || isHermesVoiceOpen || isAddSheetOpen || isOnboardingOpen}
      />`;

const targetMainNorm = targetMainCRLF.replace(/\r\n/g, '\n');
const codeNorm = code.replace(/\r\n/g, '\n');

if (codeNorm.includes(targetMainNorm)) {
  const updatedNorm = codeNorm.replace(targetMainNorm, replacementMain);
  fs.writeFileSync('src/App.tsx', updatedNorm, 'utf8');
  console.log('Successfully updated src/App.tsx');
} else {
  console.error('Target main section not found in src/App.tsx');
}
