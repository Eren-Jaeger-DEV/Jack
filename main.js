process.env.DOTENV_SILENT = 'true';
require("dotenv").config({ quiet: true });
const { addLog } = require("./utils/logger");

process.on('uncaughtException', (err) => {
    console.error('\x1b[41m\x1b[37m[FATAL ERROR]\x1b[0m Uncaught Exception detected!');
    console.error('\x1b[31mMessage:\x1b[0m', err.message);
    console.error('\x1b[31mStack:\x1b[0m\n', err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\x1b[41m\x1b[37m[FATAL ERROR]\x1b[0m Unhandled Rejection at promise:', promise);
    console.error('\x1b[31mReason:\x1b[0m', reason instanceof Error ? reason.stack : reason);
    process.exit(1);
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

// 🛡️ Security Shield: Filter sensitive envs before passing to Vite/Frontend process
const filteredEnv = { ...process.env };
const SENSITIVE_KEYS = ['BOT_TOKEN', 'MONGODB_URI', 'GOOGLE_API_KEYS', 'DISCORD_CLIENT_SECRET'];
SENSITIVE_KEYS.forEach(key => delete filteredEnv[key]);

const frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'ignore', // Silence VITE/NPM logs
  shell: true,
  env: filteredEnv
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