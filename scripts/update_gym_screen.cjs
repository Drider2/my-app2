const fs = require('fs');
let code = fs.readFileSync('src/screens/GymScreen.tsx', 'utf8');

// 1. Add ExerciseCatalogView to imports
code = code.replace(
  'RestTimerModal\n} from \'../components/gym\';',
  'RestTimerModal,\n  ExerciseCatalogView\n} from \'../components/gym\';'
);

// 2. Update activeSecondaryTab type
code = code.replace(
  "const [activeSecondaryTab, setActiveSecondaryTab] = useState<'recovery' | 'weight' | 'programs' | 'history' | null>(null);",
  "const [activeSecondaryTab, setActiveSecondaryTab] = useState<'recovery' | 'weight' | 'programs' | 'history' | 'exercises' | null>(null);"
);

// 3. Update secondary nav pills grid from grid-cols-4 to grid-cols-5 and add the 5th button
const navTarget = `<div className="grid grid-cols-4 p-1 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] gap-1">`;
const navReplacement = `<div className="grid grid-cols-5 p-1 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] gap-1">`;
code = code.replace(navTarget, navReplacement);

const historyBtnEnd = `            <History className="w-3.5 h-3.5 shrink-0" />\n            <span className="truncate">History</span>\n          </button>`;

const exercisesBtn = `            <History className="w-3.5 h-3.5 shrink-0" />\n            <span className="truncate">History</span>\n          </button>\n\n          <button\n            type="button"\n            onClick={() => setActiveSecondaryTab(prev => prev === 'exercises' ? null : 'exercises')}\n            className={\`py-2 px-1 text-[12px] font-medium rounded-xl flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all tap-feedback \${
              activeSecondaryTab === 'exercises'
                ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.45)]'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
            }\`}\n          >\n            <Dumbbell className="w-3.5 h-3.5 shrink-0" />\n            <span className="truncate">Catalog</span>\n          </button>`;

code = code.replace(historyBtnEnd, exercisesBtn);

// 4. Add ExerciseCatalogView rendering after History
const historyCloseMarker = `        {/* 7.4. SESSION HISTORY LOG */}`;
const historyIdx = code.indexOf(historyCloseMarker);
if (historyIdx !== -1) {
  // Find closing </div>\n        )}
  const afterHistory = code.indexOf('        )}', historyIdx);
  if (afterHistory !== -1) {
    const insertPoint = afterHistory + '        )}'.length;
    const catalogRender = `\n\n        {/* 7.5. EXERCISE CATALOG & SEARCH */}\n        {activeSecondaryTab === 'exercises' && (\n          <ExerciseCatalogView\n            exercises={state.exercises}\n            workoutSessions={state.workoutSessions}\n            weightUnit={weightUnit}\n            onOpen1RM={(exerciseName) => {\n              setIs1RMModalOpen(true);\n            }}\n            onRefresh={onRefresh}\n          />\n        )}`;
    code = code.slice(0, insertPoint) + catalogRender + code.slice(insertPoint);
    console.log('Successfully inserted ExerciseCatalogView section!');
  } else {
    console.log('afterHistory not found');
  }
} else {
  console.log('historyCloseMarker not found');
}

fs.writeFileSync('src/screens/GymScreen.tsx', code, 'utf8');
console.log('GymScreen.tsx updated successfully.');
