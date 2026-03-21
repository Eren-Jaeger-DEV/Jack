require("dotenv").config({ quiet: true });

require("./bot/index");
require("./dashboard/backend/server");
console.log("Running on:", process.platform, process.cwd());

const { spawn, execSync } = require('child_process');
const path = require('path');

console.log("Cleaning up lingering background ports...");
try {
  execSync('npx --yes kill-port 5173 5174 3000', { stdio: 'ignore' });
} catch (e) {}

console.log("Starting Dashboard Frontend...");
const frontendDir = path.join(__dirname, 'dashboard', 'frontend');
const frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: true
});

frontendProcess.on('error', (err) => {
  console.error('Failed to start Dashboard Frontend:', err);
});

// Cleanup child process on exit
const cleanup = () => {
  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill('SIGTERM');
  }
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => frontendProcess.kill());