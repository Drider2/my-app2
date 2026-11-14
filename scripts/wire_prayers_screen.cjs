const fs = require('fs');
const filePath = 'src/screens/PrayersScreen.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');

// 1. Lucide icons
code = code.replace(
  /ListCheck\s*\r?\n\s*\}\s*from\s*'lucide-react';/,
  "ListCheck,\n  Download,\n  Compass\n} from 'lucide-react';"
);

// 2. QiblaModal import
code = code.replace(
  "import { PrayersWidgetRenderer } from '../components/prayers/PrayersWidgetRenderer';",
  "import { PrayersWidgetRenderer, QiblaModal } from '../components/prayers';"
);

// 3. State & Export handler
const stateAndHandler = `  const [isQiblaModalOpen, setIsQiblaModalOpen] = useState(false);

  const handleExportPrayerCsv = () => {
    const csv = PrayerService.exportPrayerHistoryCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', \`greendream_prayers_\${getTodayLocalDate()}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('✓ Prayer attendance records exported as CSV');
  };
`;

code = code.replace(
  "  const [toastMessage, setToastMessage] = useState<string | null>(null);",
  `  const [toastMessage, setToastMessage] = useState<string | null>(null);\n${stateAndHandler}`
);

// 4. Replace actionsRight
const oldActionsRight = normalize(`        actionsRight={
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={\`p-2 rounded-xl border border-[var(--color-border)] transition-all tap-feedback \${
              isSettingsOpen ? 'bg-[var(--color-accent)] text-[#101410]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }\`}
            title="Prayer Settings & Method"
          >
            <Sliders className="w-4 h-4" />
          </button>
        }`);

const newActionsRight = normalize(`        actionsRight={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsQiblaModalOpen(true)}
              className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-amber-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Qibla Compass & Direction"
              aria-label="Qibla Compass"
            >
              <Compass className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={handleExportPrayerCsv}
              className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Export Prayer Ledger (.CSV)"
              aria-label="Export Prayer CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={\`p-2 rounded-xl border border-[var(--color-border)] transition-all tap-feedback \${
                isSettingsOpen ? 'bg-[var(--color-accent)] text-[#101410]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }\`}
              title="Prayer Settings & Method"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        }`);

if (normalize(code).includes(oldActionsRight)) {
  code = normalize(code).replace(oldActionsRight, newActionsRight);
  console.log('actionsRight replaced successfully');
} else {
  console.error('Could not find oldActionsRight in PrayersScreen!');
}

// 5. Add QiblaModal before </div>
const oldEnd = normalize(`      {/* Module Presets Modal */}
      <ModulePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        moduleId="prayers"
        moduleTitle="Daily Prayers"
        activePreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />
    </div>`);

const newEnd = normalize(`      {/* Module Presets Modal */}
      <ModulePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        moduleId="prayers"
        moduleTitle="Daily Prayers"
        activePreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />

      {/* Qibla Direction Compass Modal */}
      <QiblaModal
        isOpen={isQiblaModalOpen}
        onClose={() => setIsQiblaModalOpen(false)}
      />
    </div>`);

if (normalize(code).includes(oldEnd)) {
  code = normalize(code).replace(oldEnd, newEnd);
  console.log('QiblaModal added to JSX end');
} else {
  console.error('Could not find oldEnd in PrayersScreen!');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('PrayersScreen.tsx updated successfully');
