const fs = require('fs');
let code = fs.readFileSync('src/screens/GymScreen.tsx', 'utf8');

// 1. Add Trophy to lucide-react imports if not present
if (!code.includes('Trophy,')) {
  code = code.replace(
    'Award,',
    'Award,\n  Trophy,'
  );
}

// 2. Add PersonalRecordsModal to ../components/gym imports
if (!code.includes('PersonalRecordsModal')) {
  code = code.replace(
    'ExerciseCatalogView\n} from \'../components/gym\';',
    'ExerciseCatalogView,\n  PersonalRecordsModal\n} from \'../components/gym\';'
  );
}

// 3. Add state
if (!code.includes('isPRModalOpen')) {
  code = code.replace(
    'const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);',
    'const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);\n  const [isPRModalOpen, setIsPRModalOpen] = useState(false);'
  );
}

// 4. Add header button right after Rest Timer button
const restTimerBtn = `          aria-label="Rest Timer"
          title="Workout Rest Interval Timer"
        >
          <Timer className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Rest Timer</span>
        </button>`;

const trophyBtn = `          aria-label="Rest Timer"
          title="Workout Rest Interval Timer"
        >
          <Timer className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Rest Timer</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPRModalOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-amber-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="PR Wall of Fame"
          title="Personal Records & Wall of Fame"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">PR Trophies</span>
        </button>`;

if (code.includes(restTimerBtn)) {
  code = code.replace(restTimerBtn, trophyBtn);
  console.log('Inserted PR Trophies button into Gym header!');
} else {
  console.log('restTimerBtn not found');
}

// 5. Render PersonalRecordsModal at bottom near RestTimerModal
const restModalMarker = '<RestTimerModal';
const idx = code.indexOf(restModalMarker);
if (idx !== -1) {
  const closeIdx = code.indexOf('/>', idx);
  if (closeIdx !== -1) {
    const insertAt = closeIdx + 2;
    const modalSnippet = `\n\n      <PersonalRecordsModal\n        isOpen={isPRModalOpen}\n        onClose={() => setIsPRModalOpen(false)}\n        exercises={state.exercises}\n        workoutSessions={state.workoutSessions}\n        weightUnit={weightUnit}\n      />`;
    code = code.slice(0, insertAt) + modalSnippet + code.slice(insertAt);
    console.log('Inserted PersonalRecordsModal at bottom!');
  }
}

fs.writeFileSync('src/screens/GymScreen.tsx', code, 'utf8');
console.log('GymScreen.tsx updated with PR modal.');
