const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'screens', 'GymScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `<OneRepMaxModal
        isOpen={is1RMModalOpen}
        onClose={() => setIs1RMModalOpen(false)}
        defaultUnit={weightUnit}
      />`;

const replacement = `<OneRepMaxModal
        isOpen={is1RMModalOpen}
        onClose={() => setIs1RMModalOpen(false)}
        defaultUnit={weightUnit}
      />

      {/* Interval Rest Timer Modal */}
      <RestTimerModal
        isOpen={isRestTimerOpen}
        onClose={() => setIsRestTimerOpen(false)}
      />`;

if (content.includes(target) && !content.includes('<RestTimerModal')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('RestTimerModal successfully rendered in GymScreen.tsx!');
} else {
  console.log('Target not found or RestTimerModal already rendered.');
}
