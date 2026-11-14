const fs = require('fs');
let code = fs.readFileSync('src/screens/JournalScreen.tsx', 'utf8');

// 1. Add Moon to lucide-react imports if not present
if (!code.includes('Moon,')) {
  code = code.replace(
    'Download\n} from \'lucide-react\';',
    'Download,\n  Moon\n} from \'lucide-react\';'
  );
}

// 2. Add EveningReflectionModal import
if (!code.includes('EveningReflectionModal')) {
  code = code.replace(
    "import { FlameLogo } from '../components/flame';",
    "import { FlameLogo } from '../components/flame';\nimport { EveningReflectionModal } from '../components/journal/EveningReflectionModal';"
  );
}

// 3. Add state
if (!code.includes('isEveningModalOpen')) {
  code = code.replace(
    'const [toastMessage, setToastMessage] = useState<string | null>(null);',
    'const [toastMessage, setToastMessage] = useState<string | null>(null);\n  const [isEveningModalOpen, setIsEveningModalOpen] = useState(false);'
  );
}

// 4. Add Wind-Down button before Export .MD button
const exportBtnMarker = `<button
            type="button"
            onClick={handleExportMarkdown}`;

const windDownBtn = `<button
            type="button"
            onClick={() => setIsEveningModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500/40 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-indigo-400 flex items-center gap-1.5 transition-colors tap-feedback"
            title="Evening Wind-Down & Gratitude Wizard"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Wind-Down</span>
          </button>\n          ` + exportBtnMarker;

if (code.includes(exportBtnMarker)) {
  code = code.replace(exportBtnMarker, windDownBtn);
  console.log('Inserted Wind-Down button before Export button!');
} else {
  console.log('exportBtnMarker not found');
}

// 5. Render EveningReflectionModal at bottom before closing </div>
const lastDivMarker = '    </div>\n  );\n};';
const modalSnippet = `      <EveningReflectionModal
        isOpen={isEveningModalOpen}
        onClose={() => setIsEveningModalOpen(false)}
        onRefresh={onRefresh}
        onToast={triggerToast}
      />\n    </div>\n  );\n};`;

if (code.includes(lastDivMarker)) {
  code = code.replace(lastDivMarker, modalSnippet);
  console.log('Inserted EveningReflectionModal at bottom!');
} else {
  console.log('lastDivMarker not found');
}

fs.writeFileSync('src/screens/JournalScreen.tsx', code, 'utf8');
console.log('JournalScreen.tsx updated.');
