import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testsDir = path.join(__dirname, '..', 'tests');

const testFiles = fs.readdirSync(testsDir)
  .filter(f => f.endsWith('.test.mjs'))
  .map(f => path.join(testsDir, f));

console.log(`Running ${testFiles.length} test files with node --test...`);

const child = spawn(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit'
});

child.on('close', code => {
  process.exit(code || 0);
});
