const fs = require('fs');
let content = fs.readFileSync('src/screens/GymScreen.tsx', 'utf8');

// 1. Add Calculator to lucide-react import
content = content.replace('Sparkles', 'Sparkles,\n  Calculator');

// 2. Add OneRepMaxModal to ../components/gym import
content = content.replace('LastSessionCard', 'LastSessionCard,\n  OneRepMaxModal');

// 3. Add is1RMModalOpen state
content = content.replace(
  'const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);',
  'const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);\n  const [is1RMModalOpen, setIs1RMModalOpen] = useState(false);'
);

// 4. Add 1RM button to header
const oldBtnSnippet = 'aria-label={t(\'gym.fullAnalytics\', \'Analytics & tools\')}\n        >';
const oldBtnSnippetCRLF = 'aria-label={t(\'gym.fullAnalytics\', \'Analytics & tools\')}\r\n        >';

const newBtn = `<button
          type="button"
          onClick={() => setIs1RMModalOpen(true)}
          className="px-3 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] flex items-center gap-1.5 text-[var(--text-1)] hover:text-cyan-400 tap-feedback transition-colors shrink-0 shadow-sm text-xs font-semibold"
          aria-label="1RM Calculator"
          title="1RM and Training Zones Calculator"
        >
          <Calculator className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">1RM Calc</span>
        </button>
        `;

if (content.includes('aria-label={t(\'gym.fullAnalytics\', \'Analytics & tools\')}')) {
  // Find opening of that button:
  const idx = content.indexOf('aria-label={t(\'gym.fullAnalytics\', \'Analytics & tools\')}');
  const btnStart = content.lastIndexOf('<button', idx);
  content = content.slice(0, btnStart) + '<div className="flex items-center gap-2">\n        ' + newBtn + content.slice(btnStart);
  // Add closing div after the second button
  const btnEnd = content.indexOf('</button>', btnStart + newBtn.length + 50);
  content = content.slice(0, btnEnd + 9) + '\n        </div>' + content.slice(btnEnd + 9);
}

// 5. Add OneRepMaxModal before closing
const modalCode = `
      {/* 1RM & Training Zones Calculator Modal */}
      <OneRepMaxModal
        isOpen={is1RMModalOpen}
        onClose={() => setIs1RMModalOpen(false)}
        defaultUnit={weightUnit}
      />
`;

const lastDiv = content.lastIndexOf('</div>');
content = content.slice(0, lastDiv) + modalCode + content.slice(lastDiv);

fs.writeFileSync('src/screens/GymScreen.tsx', content, 'utf8');
console.log('Successfully updated GymScreen.tsx');
