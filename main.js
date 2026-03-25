process.env.DOTENV_SILENT = 'true';
require("dotenv").config({ quiet: true });
const { addLog } = require("./utils/logger");

process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});
require("./bot/index");
require("./dashboard/backend/server");

addLog("System", `${process.platform} (VM Ready)`);

const { spawn, execSync } = require('child_process');
const path = require('path');

try {
  execSync('npx --yes kill-port 5173 5174 3000', { stdio: 'ignore' });
} catch (e) {}

const frontendDir = path.join(__dirname, 'dashboard', 'frontend');
const frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'ignore', // Silence VITE/NPM logs
  shell: true
});

addLog("Dashboard", "Running (3000 + 5173)");

frontendProcess.on('error', (err) => {
  // Only critical errors remain
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