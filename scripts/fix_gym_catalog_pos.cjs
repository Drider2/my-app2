const fs = require('fs');
let code = fs.readFileSync('src/screens/GymScreen.tsx', 'utf8');

// Remove the wrongly placed block
const wronglyPlaced = `        {/* 7.5. EXERCISE CATALOG & SEARCH */}
        {activeSecondaryTab === 'exercises' && (
          <ExerciseCatalogView
            exercises={state.exercises}
            workoutSessions={state.workoutSessions}
            weightUnit={weightUnit}
            onOpen1RM={(exerciseName) => {
              setIs1RMModalOpen(true);
            }}
            onRefresh={onRefresh}
          />
        )}`;

code = code.replace(wronglyPlaced, '');

// Place it properly after line 794 (the closing of history block)
const targetMarker = `          </div>\n        )}\n      </section>`;
const properlyPlaced = `          </div>\n        )}\n\n        {/* 7.5. EXERCISE CATALOG & SEARCH */}\n        {activeSecondaryTab === 'exercises' && (\n          <ExerciseCatalogView\n            exercises={state.exercises}\n            workoutSessions={state.workoutSessions}\n            weightUnit={weightUnit}\n            onOpen1RM={(exerciseName) => {\n              setIs1RMModalOpen(true);\n            }}\n            onRefresh={onRefresh}\n          />\n        )}\n      </section>`;

code = code.replace(targetMarker, properlyPlaced);

fs.writeFileSync('src/screens/GymScreen.tsx', code, 'utf8');
console.log('Fixed ExerciseCatalogView position in GymScreen.tsx');
