const { spawn } = require('child_process');
const fs = require('fs');

const logFile = 'C:\\Users\\yacine\\cloudflared_tunnel.log';
// Truncate or append
fs.writeFileSync(logFile, '');
const out = fs.openSync(logFile, 'a');
const err = fs.openSync(logFile, 'a');

const p = spawn('C:\\Users\\yacine\\Downloads\\cloudflared.exe', [
  'tunnel',
  '--url', 'http://localhost:5173'
], {
  detached: true,
  stdio: ['ignore', out, err]
});

p.unref();
console.log('Spawned detached cloudflared PID:', p.pid);
