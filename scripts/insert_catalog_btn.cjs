const fs = require('fs');
let code = fs.readFileSync('src/screens/GymScreen.tsx', 'utf8');

const target = `{/* 7.1. RECOVERY ANATOMICAL TOOL */}`;
const idx = code.indexOf(target);
if (idx !== -1) {
  // Find the preceding </div>
  const divClose = code.lastIndexOf('</div>', idx);
  if (divClose !== -1) {
    const btn = `          <button
            type="button"
            onClick={() => setActiveSecondaryTab(prev => prev === 'exercises' ? null : 'exercises')}
            className={\`py-2 px-1 text-[12px] font-medium rounded-xl flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all tap-feedback \${
              activeSecondaryTab === 'exercises'
                ? 'bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent-light)] border border-[rgb(var(--accent-rgb)/0.45)]'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
            }\`}
          >
            <Dumbbell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Catalog</span>
          </button>\n        `;
    code = code.slice(0, divClose) + btn + code.slice(divClose);
    console.log('Inserted Catalog button before closing div!');
  }
}

fs.writeFileSync('src/screens/GymScreen.tsx', code, 'utf8');
