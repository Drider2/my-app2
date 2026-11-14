const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'tunnel.log');
const out = fs.openSync(logFile, 'w');

console.log('Spawning cloudflared...');
const child = spawn('C:\\Users\\yacine\\Downloads\\cloudflared.exe', [
  'tunnel',
  '--url', 'http://localhost:5173'
], {
  detached: true,
  stdio: ['ignore', out, out]
});

child.unref();
console.log('Spawned cloudflared with PID:', child.pid);
