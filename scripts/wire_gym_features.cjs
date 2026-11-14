const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'screens', 'GymScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Timer & Download to lucide-react imports
content = content.replace(
  'Calculator \n} from \'lucide-react\';',
  'Calculator,\n  Timer,\n  Download\n} from \'lucide-react\';'
);

// 2. Add RestTimerModal to gym imports
content = content.replace(
  'OneRepMaxModal \n} from \'../components/gym\';',
  'OneRepMaxModal,\n  RestTimerModal\n} from \'../components/gym\';'
);

// 3. Add isRestTimerOpen state
content = content.replace(
  'const [is1RMModalOpen, setIs1RMModalOpen] = useState(false);',
  'const [is1RMModalOpen, setIs1RMModalOpen] = useState(false);\n  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);'
);

// 4. Add CSV Export Handlers
const targetHandlersAnchor = '  const handleRefreshAndClose = () => {';
const replacementHandlers = `  const handleExportWorkoutCSV = () => {
    const sessions = state.workoutSessions.filter(s => !s.deleted_at);
    if (sessions.length === 0) {
      triggerToast('No workout sessions recorded');
      return;
    }
    const headers = ['Session ID', 'Date', 'Day Name', 'Duration (min)', 'Exercises Count', 'Total Volume (kg)', 'Notes'];
    const rows = sessions.map(s => {
      const cleanNotes = (s.notes || '').replace(/"/g, '""');
      return [
        s.id,
        s.local_date,
        \`"\${s.day_name || 'Workout'}"\`,
        s.duration_seconds ? Math.round(s.duration_seconds / 60) : '',
        s.exercises ? s.exercises.length : 0,
        s.total_volume_kg || 0,
        \`"\${cleanNotes}"\`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`greendream_workouts_\${today}.csv\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(\`✓ Exported \${sessions.length} sessions to CSV\`);
  };

  const handleExportWeightCSV = () => {
    const entries = state.bodyweightEntries.filter(e => !e.deleted_at);
    if (entries.length === 0) {
      triggerToast('No weight logs to export');
      return;
    }
    const headers = ['Log ID', 'Date', 'Weight (kg)', 'Weight (lb)'];
    const rows = entries.map(e => {
      const lb = (e.weight_kg * 2.20462).toFixed(1);
      return [e.id, e.local_date, e.weight_kg, lb].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`greendream_bodyweight_\${today}.csv\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(\`✓ Exported \${entries.length} weight entries to CSV\`);
  };

  const handleRefreshAndClose = () => {`;

content = content.replace(targetHandlersAnchor, replacementHandlers);

// 5. Add Rest Timer button in header next to 1RM Calc
const target1RMBtn = `<button
          type="button"
          onClick={() => setIs1RMModalOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-cyan-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="1RM Calculator"
          title="1RM and Training Zones Calculator"
        >
          <Calculator className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">1RM Calc</span>
        </button>`;

const replacementRestTimerBtn = `<button
          type="button"
          onClick={() => setIs1RMModalOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-cyan-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="1RM Calculator"
          title="1RM and Training Zones Calculator"
        >
          <Calculator className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">1RM Calc</span>
        </button>
        <button
          type="button"
          onClick={() => setIsRestTimerOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-cyan-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="Rest Timer"
          title="Workout Rest Interval Timer"
        >
          <Timer className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Rest Timer</span>
        </button>`;

content = content.replace(target1RMBtn, replacementRestTimerBtn);

// 6. Add Export CSV to Recent Logs header in weight tab
const targetWeightLogsHeader = `<div className="flex items-center justify-between text-[12px] border-b border-[var(--color-border)] pb-2">
                <span className="font-medium text-[var(--text-1)]">Recent Logs</span>
                <span className="text-[var(--text-3)]">{sortedWeights.length} entries</span>
              </div>`;

const replacementWeightLogsHeader = `<div className="flex items-center justify-between text-[12px] border-b border-[var(--color-border)] pb-2">
                <span className="font-medium text-[var(--text-1)]">Recent Logs</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportWeightCSV}
                    className="px-2 py-0.5 rounded-lg bg-white/[0.05] border border-[var(--color-border)] text-[11px] font-medium text-[var(--text-2)] hover:text-cyan-400 flex items-center gap-1 tap-feedback"
                    title="Export bodyweight history to CSV"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>CSV</span>
                  </button>
                  <span className="text-[var(--text-3)]">{sortedWeights.length} entries</span>
                </div>
              </div>`;

content = content.replace(targetWeightLogsHeader, replacementWeightLogsHeader);

// 7. Add Export CSV to Sessions History header
const targetHistoryHeader = `<div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-3)]">
                Recorded Sessions ({state.workoutSessions.filter(s => !s.deleted_at).length})
              </span>
              <button
                type="button"
                onClick={() => setIsWorkoutModalOpen(true)}
                className="text-[12px] text-[var(--accent-light)] font-medium flex items-center gap-1 tap-feedback"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New</span>
              </button>
            </div>`;

const replacementHistoryHeader = `<div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-3)]">
                Recorded Sessions ({state.workoutSessions.filter(s => !s.deleted_at).length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportWorkoutCSV}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-[var(--color-border)] text-xs font-medium text-[var(--text-2)] hover:text-cyan-400 flex items-center gap-1 tap-feedback"
                  title="Export workout sessions to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWorkoutModalOpen(true)}
                  className="text-[12px] text-[var(--accent-light)] font-medium flex items-center gap-1 tap-feedback"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log New</span>
                </button>
              </div>
            </div>`;

content = content.replace(targetHistoryHeader, replacementHistoryHeader);

// 8. Render RestTimerModal
const targetRenderModal = `<OneRepMaxModal
        isOpen={is1RMModalOpen}
        onClose={() => setIs1RMModalOpen(false)}
      />`;

const replacementRenderModal = `<OneRepMaxModal
        isOpen={is1RMModalOpen}
        onClose={() => setIs1RMModalOpen(false)}
      />

      <RestTimerModal
        isOpen={isRestTimerOpen}
        onClose={() => setIsRestTimerOpen(false)}
      />`;

content = content.replace(targetRenderModal, replacementRenderModal);

fs.writeFileSync(file, content, 'utf8');
console.log('GymScreen successfully wired with Rest Timer, Workout CSV Export, and Weight CSV Export!');
