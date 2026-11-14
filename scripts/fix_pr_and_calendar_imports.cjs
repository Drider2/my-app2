const fs = require('fs');

// 1. Fix GymScreen.tsx
let gymCode = fs.readFileSync('src/screens/GymScreen.tsx', 'utf8');
gymCode = gymCode.replace(
  'Download\n} from \'lucide-react\';',
  'Download,\n  Trophy\n} from \'lucide-react\';'
);
fs.writeFileSync('src/screens/GymScreen.tsx', gymCode, 'utf8');
console.log('Fixed Trophy import in GymScreen.tsx');

// 2. Fix CalendarScreen.tsx
let calCode = fs.readFileSync('src/screens/CalendarScreen.tsx', 'utf8');
calCode = calCode.replace(
  "import React, { useState } from 'react';",
  "import React, { useState, useMemo } from 'react';"
);

calCode = calCode.replace(
  '{liveParsed.tags.map(t => (',
  '{liveParsed.tags.map((t: string) => ('
);

calCode = calCode.replace(
  '{task.tags?.map(t => (',
  '{task.tags?.map((t: string) => ('
);

fs.writeFileSync('src/screens/CalendarScreen.tsx', calCode, 'utf8');
console.log('Fixed useMemo and parameter types in CalendarScreen.tsx');
