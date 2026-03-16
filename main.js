require("dotenv").config({ quiet: true });

require("./bot/index");
require("./dashboard/backend/server");
console.log("Running on:", process.platform, process.cwd());

const { spawn } = require('child_process');
const path = require('path');

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