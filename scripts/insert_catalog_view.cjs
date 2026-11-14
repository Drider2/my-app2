const fs = require('fs');
let code = fs.readFileSync('src/screens/GymScreen.tsx', 'utf8');

// Find the section that holds the secondary tabs
// It ends with </section> right before {/* Modals */}
const modalsMarker = '{/* Modals */}';
const modalsIdx = code.indexOf(modalsMarker);
if (modalsIdx !== -1) {
  // Find </section> before modalsMarker
  const sectionCloseIdx = code.lastIndexOf('</section>', modalsIdx);
  if (sectionCloseIdx !== -1) {
    const catalogSnippet = `\n        {/* 7.5. EXERCISE CATALOG & SEARCH */}\n        {activeSecondaryTab === 'exercises' && (\n          <ExerciseCatalogView\n            exercises={state.exercises}\n            workoutSessions={state.workoutSessions}\n            weightUnit={weightUnit}\n            onOpen1RM={(exerciseName) => {\n              setIs1RMModalOpen(true);\n            }}\n            onRefresh={onRefresh}\n          />\n        )}\n      `;
    code = code.slice(0, sectionCloseIdx) + catalogSnippet + code.slice(sectionCloseIdx);
    console.log('Successfully inserted ExerciseCatalogView before </section>!');
  } else {
    console.log('sectionCloseIdx not found');
  }
} else {
  console.log('modalsMarker not found');
}

fs.writeFileSync('src/screens/GymScreen.tsx', code, 'utf8');
console.log('GymScreen.tsx updated with ExerciseCatalogView.');
